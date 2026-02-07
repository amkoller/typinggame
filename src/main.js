import { Application, Graphics, Text, TextStyle, Container } from "pixi.js";
import substrings from "./words.json";

const app = new Application();

await app.init({
  resizeTo: window,
  backgroundColor: 0x1a1a2e,
  antialias: true,
  roundPixels: true,
  resolution: window.devicePixelRatio || 1,
  autoDensity: true,
});

document.body.appendChild(app.canvas);

// ── Constants ──────────────────────────────────────────────
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const MONSTER_SPEED = 1.2;
const SPAWN_INTERVAL = 2000; // ms
const PLAYER_X = 100;
const MAX_LEVEL = 60;
const BOSS_LEVELS = {
  10: { type: "skeleton", name: "SKELETON", wordCount: 7, wordLen: 3, speed: 0.9 },
  20: { type: "ghost", name: "GHOST", wordCount: 8, wordLen: 4, speed: 0.75 },
  30: { type: "shark", name: "LASER SHARK", wordCount: 12, wordLen: 4, speed: 0.6 },
  40: { type: "demon", name: "FIRE DEMON", wordCount: 15, wordLen: 5, speed: 0.45 },
  50: { type: "skull", name: "ZOMBIE SKULL", wordCount: 20, wordLen: 5, speed: 0.3 },
};

let monsters = [];
let score = 0;
let lives = 3;
let level = 1;
let gameOver = false;
let gameWon = false;
let paused = false;
let stunUntil = 0; // timestamp when stun ends (miss penalty)
let bossActive = false;

function getSpawnInterval() {
  // 2000ms at level 1, decreasing by 25ms per level, min 550ms
  return Math.max(550, SPAWN_INTERVAL - (level - 1) * 25);
}

function getAvgLettersPerMonster() {
  // Tier 0 (levels 1-10): always 1 letter
  // Tier T≥1: base length T, chance of T+1 scales 10%→100% within the tier
  // Capped at 5 to match max word length from word list
  const tier = Math.floor((level - 1) / 10);
  if (tier === 0) return 1;
  const tierProgress = ((level - 1) % 10) / 9;
  const upgradeChance = 0.1 + tierProgress * 0.9;
  const avg = tier + upgradeChance;
  return Math.min(avg, 5);
}

function getAvgSpeed() {
  const speedLevel = Math.min(level, 10);
  const minSpeed = MONSTER_SPEED + (speedLevel - 1) * 0.06;
  const maxSpeed = MONSTER_SPEED + (speedLevel - 1) * 0.5;
  return (minSpeed + maxSpeed) / 2;
}

function getLPS() {
  const monstersPerSec = 1000 / getSpawnInterval();
  const speedFactor = getAvgSpeed() / MONSTER_SPEED;
  return (getAvgLettersPerMonster() * monstersPerSec * speedFactor).toFixed(1);
}

// ── Sound effects (Web Audio API) ──────────────────────────
let soundEnabled = true;
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playShoot() {
  if (!soundEnabled) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.type = "square";
  osc.frequency.setValueAtTime(880, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(1760, audioCtx.currentTime + 0.05);
  gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.08);
  osc.start(audioCtx.currentTime);
  osc.stop(audioCtx.currentTime + 0.08);
}

function playHit() {
  if (!soundEnabled) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.type = "sine";
  osc.frequency.setValueAtTime(600, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(300, audioCtx.currentTime + 0.06);
  gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.06);
  osc.start(audioCtx.currentTime);
  osc.stop(audioCtx.currentTime + 0.06);
}

function playKill() {
  if (!soundEnabled) return;
  const t = audioCtx.currentTime;
  // Two-tone descending burst
  for (let i = 0; i < 2; i++) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.type = i === 0 ? "square" : "sawtooth";
    osc.frequency.setValueAtTime(500 - i * 100, t);
    osc.frequency.exponentialRampToValueAtTime(80, t + 0.2);
    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    osc.start(t);
    osc.stop(t + 0.2);
  }
}

// ── Music (8-bit chiptune) ────────────────────────────────
let musicPlaying = false;
let musicStep = 0;
let nextNoteTime = 0;
let musicTimerId = null;

// ── Section A (C minor) ──
// C5=523, D5=587, Eb5=622, F5=698, G5=784, Bb4=466, Ab4=415
const melodyA = [
  523, 0, 622, 0, 784, 0, 622, 698,
  784, 0, 622, 0, 523, 0, 466, 0,
  415, 0, 523, 0, 622, 0, 698, 622,
  587, 0, 523, 0, 466, 0, 523, 0,
];
const bassA = [
  131, 0, 131, 0, 98, 0, 98, 0,
  104, 0, 104, 0, 156, 0, 156, 0,
  175, 0, 175, 0, 131, 0, 131, 0,
  98, 0, 98, 0, 131, 0, 131, 0,
];
const drumsA = [
  1, 0, 2, 0, 1, 0, 2, 0,
  1, 0, 2, 0, 1, 0, 2, 2,
  1, 0, 2, 0, 1, 0, 2, 0,
  1, 0, 2, 2, 1, 2, 1, 2,
];

// ── Section B (Eb major — brighter contrast) ──
// Eb5=622, F5=698, G5=784, Ab5=831, Bb5=932, C6=1047
const melodyB = [
  784, 0, 932, 0, 1047, 0, 932, 831,
  784, 0, 698, 0, 622, 0, 698, 0,
  831, 0, 932, 0, 1047, 932, 831, 0,
  784, 0, 698, 622, 587, 0, 523, 0,
];
const bassB = [
  156, 0, 156, 0, 117, 0, 117, 0,
  104, 0, 104, 0, 175, 0, 175, 0,
  156, 0, 156, 0, 117, 0, 117, 0,
  104, 0, 175, 0, 98, 0, 131, 0,
];
const drumsB = [
  1, 0, 2, 2, 1, 0, 2, 0,
  1, 2, 1, 0, 2, 0, 1, 2,
  1, 0, 2, 2, 1, 0, 2, 0,
  1, 2, 2, 0, 1, 0, 1, 2,
];

// AABA form: 4 sections × 32 steps = 128 steps per cycle
const formSections = [
  { melody: melodyA, bass: bassA, drums: drumsA },
  { melody: melodyA, bass: bassA, drums: drumsA },
  { melody: melodyB, bass: bassB, drums: drumsB },
  { melody: melodyA, bass: bassA, drums: drumsA },
];

function getMusicTempo() {
  // Eighth-note duration: BPM 140 at level 1 → BPM 220 at level 60
  const bpm = 140 + (Math.min(level, 60) - 1) * (80 / 59);
  return 60 / bpm / 2;
}

function playMusicNote(freq, time, duration, type, vol) {
  if (!freq) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.type = type;
  osc.frequency.setValueAtTime(freq, time);
  gain.gain.setValueAtTime(vol, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + duration * 0.9);
  osc.start(time);
  osc.stop(time + duration);
}

function playDrumHit(type, time) {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  if (type === 1) {
    // Kick
    osc.type = "sine";
    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(40, time + 0.08);
    gain.gain.setValueAtTime(0.07, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.08);
    osc.start(time);
    osc.stop(time + 0.08);
  } else {
    // Hi-hat
    osc.type = "square";
    osc.frequency.setValueAtTime(800 + Math.random() * 600, time);
    gain.gain.setValueAtTime(0.02, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.03);
    osc.start(time);
    osc.stop(time + 0.03);
  }
}

function scheduleMusicNotes() {
  if (nextNoteTime < audioCtx.currentTime) {
    nextNoteTime = audioCtx.currentTime;
  }
  while (nextNoteTime < audioCtx.currentTime + 0.1) {
    const dur = getMusicTempo();
    const section = formSections[Math.floor((musicStep % 128) / 32)];
    const idx = musicStep % 32;
    playMusicNote(section.melody[idx], nextNoteTime, dur * 0.8, "square", 0.05);
    playMusicNote(section.bass[idx], nextNoteTime, dur * 0.9, "triangle", 0.045);
    if (section.drums[idx]) playDrumHit(section.drums[idx], nextNoteTime);
    nextNoteTime += dur;
    musicStep++;
  }
}

function startMusic() {
  if (musicPlaying || !soundEnabled) return;
  musicPlaying = true;
  nextNoteTime = audioCtx.currentTime;
  musicTimerId = setInterval(scheduleMusicNotes, 50);
}

function stopMusic() {
  if (!musicPlaying) return;
  musicPlaying = false;
  clearInterval(musicTimerId);
  musicTimerId = null;
}

// ── Draw helpers ───────────────────────────────────────────

function drawOctopus(container) {
  const body = new Graphics();
  // Head / body – green oval
  body.ellipse(0, 0, 28, 22);
  body.fill(0x2ecc71);
  // Eyes
  body.circle(-10, -6, 5);
  body.circle(10, -6, 5);
  body.fill(0xffffff);
  body.circle(-10, -6, 2.5);
  body.circle(10, -6, 2.5);
  body.fill(0x111111);
  // Smile
  body.arc(0, 4, 8, 0.1, Math.PI - 0.1);
  body.stroke({ width: 2, color: 0x111111 });

  container.addChild(body);

  // Tentacles (4 pairs dangling below)
  const tentacles = new Graphics();
  for (let i = -3; i <= 3; i += 2) {
    const tx = i * 7;
    tentacles.moveTo(tx, 18);
    tentacles.bezierCurveTo(tx - 4, 34, tx + 4, 40, tx, 50);
    tentacles.stroke({ width: 3, color: 0x27ae60 });
  }
  container.addChild(tentacles);

  // Jetpack – a little rectangle on the back
  const jetpack = new Graphics();
  jetpack.roundRect(-38, -14, 14, 28, 3);
  jetpack.fill(0x7f8c8d);
  jetpack.roundRect(-36, -10, 10, 24, 2);
  jetpack.fill(0x95a5a6);
  container.addChild(jetpack);

  // Jetpack flame (will be animated)
  const flame = new Graphics();
  container.addChild(flame);
  return flame;
}

function drawFlame(flame, tick) {
  flame.clear();
  const flicker = Math.sin(tick * 0.3) * 4;
  // Outer flame
  flame.moveTo(-35, 16);
  flame.lineTo(-28, 16);
  flame.lineTo(-31.5, 30 + flicker);
  flame.closePath();
  flame.fill(0xe74c3c);
  // Inner flame
  flame.moveTo(-34, 16);
  flame.lineTo(-29, 16);
  flame.lineTo(-31.5, 24 + flicker * 0.5);
  flame.closePath();
  flame.fill(0xf39c12);
}

function createMonster(word) {
  const container = new Container();
  const letterCount = word.length;
  // Scale the body wider for multi-letter monsters
  const bodyHalfW = 18 + (letterCount - 1) * 10;
  const bodyH = 38 + (letterCount - 1) * 6;
  const bodyTop = -16 - (letterCount - 1) * 3;
  const scale = 1 + (letterCount - 1) * 0.25;

  const body = new Graphics();
  // Body – orange rounded rectangle
  body.roundRect(-bodyHalfW, bodyTop, bodyHalfW * 2, bodyH, 8);
  body.fill(0xe67e22);
  // Feet
  body.circle(-10 * scale, bodyTop + bodyH + 2, 5 * scale);
  body.circle(10 * scale, bodyTop + bodyH + 2, 5 * scale);
  body.fill(0xd35400);
  // Arms
  body.roundRect(-bodyHalfW - 12, -2, 12, 6 * scale, 3);
  body.roundRect(bodyHalfW, -2, 12, 6 * scale, 3);
  body.fill(0xe67e22);
  // Eyes
  body.circle(-7 * scale, -6 - (letterCount - 1) * 2, 5);
  body.circle(7 * scale, -6 - (letterCount - 1) * 2, 5);
  body.fill(0xffffff);
  body.circle(-7 * scale, -6 - (letterCount - 1) * 2, 2.5);
  body.circle(7 * scale, -6 - (letterCount - 1) * 2, 2.5);
  body.fill(0x111111);
  // Mouth
  body.circle(0, 6 - (letterCount - 1), 4);
  body.fill(0x111111);

  container.addChild(body);

  // Propeller beanie
  const beanie = new Graphics();
  beanie.arc(0, bodyTop, 14 * scale, Math.PI, 0);
  beanie.fill(0x3498db);
  beanie.circle(0, bodyTop - 4, 3);
  beanie.fill(0xe74c3c);
  container.addChild(beanie);

  // Propeller blades (will animate)
  const propeller = new Graphics();
  container.addChild(propeller);

  // Blood layer – sits above body but below bubbles so blood never covers letters
  const bloodContainer = new Container();
  container.addChild(bloodContainer);

  // Letter bubbles on shirt – spaced horizontally
  const bubbleY = 14;
  const spacing = 22;
  const totalW = (letterCount - 1) * spacing;
  const letterTexts = [];

  for (let i = 0; i < letterCount; i++) {
    const bx = -totalW / 2 + i * spacing;
    const bubble = new Graphics();
    bubble.circle(bx, bubbleY, 11);
    bubble.fill(0xffffff);
    bubble.circle(bx, bubbleY, 11);
    bubble.stroke({ width: 1.5, color: 0xbdc3c7 });
    container.addChild(bubble);

    const lt = new Text({
      text: word[i],
      style: new TextStyle({
        fontFamily: "Arial",
        fontSize: 14,
        fontWeight: "bold",
        fill: 0x2c3e50,
      }),
      resolution: 4,
    });
    lt.anchor.set(0.5);
    lt.x = bx;
    lt.y = bubbleY;
    container.addChild(lt);
    letterTexts.push(lt);
  }

  return { container, propeller, bloodContainer, word, letterTexts, hitIndex: 0, beanieY: bodyTop, propScale: scale };
}

function drawPropeller(propeller, tick, beanieY, scale) {
  propeller.clear();
  const angle = tick * 0.4;
  const by = beanieY ?? -20;
  const s = scale ?? 1;
  const len = 16 * s;
  // Two blades
  for (let i = 0; i < 2; i++) {
    const a = angle + i * Math.PI;
    const dx = Math.cos(a) * len;
    const dy = Math.sin(a) * 3;
    propeller.moveTo(-dx, by - 4 - dy);
    propeller.lineTo(dx, by - 4 + dy);
    propeller.stroke({ width: 3, color: 0x95a5a6 });
  }
}

function addMonsterBlood(m) {
  const letterCount = m.word.length;
  const bodyHalfW = 18 + (letterCount - 1) * 10;
  const bodyH = 38 + (letterCount - 1) * 6;
  const bodyTop = -16 - (letterCount - 1) * 3;
  const bubbleY = 14;
  const bubbleR = 13; // bubble radius + margin
  const spacing = 22;
  const totalW = (letterCount - 1) * spacing;

  for (let i = 0; i < 8; i++) {
    let sx, sy, valid;
    for (let attempt = 0; attempt < 20; attempt++) {
      sx = (Math.random() - 0.5) * bodyHalfW * 1.6;
      sy = bodyTop + 4 + Math.random() * (bodyH - 8);
      valid = true;
      for (let j = 0; j < letterCount; j++) {
        const bx = -totalW / 2 + j * spacing;
        const dx = sx - bx;
        const dy = sy - bubbleY;
        if (dx * dx + dy * dy < bubbleR * bubbleR) {
          valid = false;
          break;
        }
      }
      if (valid) break;
    }
    if (!valid) continue;

    const g = new Graphics();
    const r = 2 + Math.random() * 3;
    g.circle(0, 0, r);
    g.fill(Math.random() < 0.4 ? 0x8b0000 : 0xcc0000);
    // Add small drip streaks
    if (Math.random() < 0.3) {
      const dripLen = 3 + Math.random() * 6;
      g.moveTo(0, r);
      g.lineTo(0, r + dripLen);
      g.stroke({ width: 1.5, color: 0x8b0000 });
    }
    g.x = sx;
    g.y = sy;
    m.bloodContainer.addChild(g);
  }
}

// ── Boss drawing ──────────────────────────────────────────

function drawSkeleton(container) {
  const g = new Graphics();
  const px = 3; // pixel size for retro look

  // Skull (12x10 pixel grid, centered at 0, top at -90)
  const skullTop = -90;
  const skullData = [
    "  XXXXXXXX  ",
    " XXXXXXXXXX ",
    "XXXXXXXXXXXX",
    "XXX..XX..XXX",
    "XXX..XX..XXX",
    "XXXXXXXXXXXX",
    " XXXX..XXXX ",
    " X.X.XX.X.X ",
    "  X..XX..X  ",
    "   XXXXXX   ",
  ];
  for (let r = 0; r < skullData.length; r++) {
    for (let c = 0; c < skullData[r].length; c++) {
      const ch = skullData[r][c];
      if (ch === " ") continue;
      const color = ch === "X" ? 0xdddddd : 0x222222;
      g.rect(c * px - 18, skullTop + r * px, px, px);
      g.fill(color);
    }
  }

  // Spine (centered, below skull)
  const spineTop = skullTop + 30;
  for (let i = 0; i < 8; i++) {
    g.rect(-px, spineTop + i * px * 2, px * 2, px);
    g.fill(0xcccccc);
  }

  // Ribcage (3 pairs of ribs)
  const ribTop = spineTop + 4;
  for (let i = 0; i < 3; i++) {
    const ry = ribTop + i * px * 4;
    // Left ribs
    g.rect(-px * 5, ry, px * 4, px);
    g.fill(0xbbbbbb);
    g.rect(-px * 6, ry + px, px, px * 2);
    g.fill(0xbbbbbb);
    // Right ribs
    g.rect(px, ry, px * 4, px);
    g.fill(0xbbbbbb);
    g.rect(px * 5, ry + px, px, px * 2);
    g.fill(0xbbbbbb);
  }

  // Pelvis
  const pelvisY = spineTop + px * 16;
  g.rect(-px * 3, pelvisY, px * 6, px * 2);
  g.fill(0xcccccc);
  g.rect(-px * 4, pelvisY + px * 2, px * 2, px);
  g.fill(0xcccccc);
  g.rect(px * 2, pelvisY + px * 2, px * 2, px);
  g.fill(0xcccccc);

  // Arms (stick out from ribs, angled down)
  // Left arm
  for (let i = 0; i < 6; i++) {
    g.rect(-px * 6 - i * px, ribTop + i * px * 2, px, px * 2);
    g.fill(0xaaaaaa);
  }
  // Left hand (3 finger bones)
  const lhx = -px * 12, lhy = ribTop + px * 12;
  g.rect(lhx - px, lhy, px, px * 3);
  g.fill(0xbbbbbb);
  g.rect(lhx, lhy - px, px, px * 3);
  g.fill(0xbbbbbb);
  g.rect(lhx + px, lhy, px, px * 3);
  g.fill(0xbbbbbb);

  // Right arm
  for (let i = 0; i < 6; i++) {
    g.rect(px * 5 + i * px, ribTop + i * px * 2, px, px * 2);
    g.fill(0xaaaaaa);
  }
  // Right hand
  const rhx = px * 11, rhy = ribTop + px * 12;
  g.rect(rhx - px, rhy, px, px * 3);
  g.fill(0xbbbbbb);
  g.rect(rhx, rhy - px, px, px * 3);
  g.fill(0xbbbbbb);
  g.rect(rhx + px, rhy, px, px * 3);
  g.fill(0xbbbbbb);

  // Legs
  const legTop = pelvisY + px * 3;
  for (let i = 0; i < 7; i++) {
    // Left leg
    g.rect(-px * 3, legTop + i * px * 2, px * 2, px * 2);
    g.fill(0xaaaaaa);
    // Right leg
    g.rect(px, legTop + i * px * 2, px * 2, px * 2);
    g.fill(0xaaaaaa);
  }
  // Feet
  const footY = legTop + px * 14;
  g.rect(-px * 5, footY, px * 4, px);
  g.fill(0xbbbbbb);
  g.rect(-px, footY, px * 4, px);
  g.fill(0xbbbbbb);

  // Red glowing eyes
  g.circle(-6, skullTop + 12, 3);
  g.circle(6, skullTop + 12, 3);
  g.fill(0xff2222);

  container.addChild(g);
  return g;
}

function drawGhost(container) {
  const g = new Graphics();
  const px = 4;
  const top = -70;

  // 16-wide × 23-tall pixel grid
  const data = [
    "    GGGGGGGG    ",
    "  GGGGGGGGGGGG  ",
    " GGGGGGGGGGGGGG ",
    "GGGGGGGGGGGGGGGG",
    "GGGGGGGGGGGGGGGG",
    "GGGEEGGGGGGEEGGG",
    "GGGEPGGGGGGEPGGG",
    "GGGEEGGGGGGEEGGG",
    "GGGGGGGGGGGGGGGG",
    "GGGGGGGGGGGGGGGG",
    "GGGGGMMMMMMGGGGG",
    "GGGGMMMMMMMMGGGG",
    "GGGGGMMMMMMGGGGG",
    "GGGGGGGGGGGGGGGG",
    "GGGGGGGGGGGGGGGG",
    "GGGGGGGGGGGGGGGG",
    "GGGGGGGGGGGGGGGG",
    "GGGGGGGGGGGGGGGG",
    "GGGGGGGGGGGGGGGG",
    "GG GGGG  GGGG GG",
    "G   GG    GG   G",
    "    GG    GG    ",
    "     G     G    ",
  ];

  const colors = { G: 0xddeeff, E: 0x222244, P: 0x8888ff, M: 0x333355 };
  const halfW = (data[0].length * px) / 2;

  for (let r = 0; r < data.length; r++) {
    for (let c = 0; c < data[r].length; c++) {
      const ch = data[r][c];
      if (ch === " ") continue;
      g.rect(c * px - halfW, top + r * px, px, px);
      g.fill(colors[ch]);
    }
  }

  g.alpha = 0.85;
  container.addChild(g);
  return g;
}

function drawShark(container) {
  const g = new Graphics();
  const px = 4;
  const top = -30;

  // 24-wide × 14-tall pixel grid — shark facing left
  const data = [
    "          FF            ",
    "         FFFF           ",
    "    BBBBBBBBBBBBB       ",
    "   BBBBBBBBBBBBBBBBB    ",
    "  RRBBEBBBBBBBBBBBBBBF  ",
    "  RRBBBBBBBBBBBBBBBBBFF ",
    "   BBBBBBBBBBBBBBBBBFFFF",
    "   LLLLLLLLLLLLLLLLBFFFF",
    "   LLLLLLLLLLLLLLLLBBFF ",
    "  TTLLLLLLLLLLLLLLLLBB  ",
    "  MTTLLLLLLLLLLLLLLLB   ",
    "   TTLLLLLLLLLLLLLLB    ",
    "     LLLLLLLLLLLLL      ",
    "       FFFFFFFF         ",
  ];

  const colors = {
    B: 0x556677, L: 0x8899aa, F: 0x3a4a5a,
    T: 0xffffff, E: 0xff2222, R: 0xcc0000, M: 0x111111,
  };
  const halfW = (data[0].length * px) / 2;

  for (let r = 0; r < data.length; r++) {
    for (let c = 0; c < data[r].length; c++) {
      const ch = data[r][c];
      if (ch === " ") continue;
      g.rect(c * px - halfW, top + r * px, px, px);
      g.fill(colors[ch]);
    }
  }

  // Laser beam from snout — red line extending left
  g.moveTo(-halfW + 2 * px, top + 4 * px + px / 2);
  g.lineTo(-halfW - 40, top + 4 * px + px / 2);
  g.stroke({ width: 2, color: 0xff0000 });
  g.moveTo(-halfW + 2 * px, top + 5 * px + px / 2);
  g.lineTo(-halfW - 40, top + 5 * px + px / 2);
  g.stroke({ width: 2, color: 0xff0000 });

  container.addChild(g);
  return g;
}

function drawDemon(container) {
  const g = new Graphics();
  const px = 4;
  const top = -90;

  // 18-wide × 26-tall pixel grid
  const data = [
    "H             H   ",
    "HH    RRR   HH    ",
    " HH RRRRRRRHH     ",
    "  HHRRRRRRRRHH    ",
    "   RRRRRRRRRR     ",
    "   RRRRRRRRRR     ",
    "   RRERRRRRERR    ",
    "   RRPRRRRRRPRR   ",
    "   RRERRRRRERR    ",
    "   RRRRRRRRRR     ",
    "   RRRRMMMRRRR    ",
    "   RRRMMMMMRRR    ",
    "   RRRRMMMRRRR    ",
    "  WRRRRRRRRRRRW   ",
    " WWRRRRRRRRRRRWW  ",
    " W RRRRRRRRRRRR W ",
    "W  RRRRRRRRRRRR  W",
    "   DDDDDDDDDDDD   ",
    "   DDDDDDDDDDDD   ",
    "   DDDDDDDDDDDD   ",
    "    DDDDDDDDDDD   ",
    "    DDDD   DDDD   ",
    "    DDD     DDD   ",
    "   FDD       DDF  ",
    "   FF         FF  ",
    "  FF           FF ",
  ];

  const colors = {
    R: 0xcc2222, D: 0x881111, H: 0x550000,
    E: 0x111111, P: 0xffaa00, M: 0x111111,
    W: 0x771111, F: 0x993300,
  };
  const halfW = (data[0].length * px) / 2;

  for (let r = 0; r < data.length; r++) {
    for (let c = 0; c < data[r].length; c++) {
      const ch = data[r][c];
      if (ch === " ") continue;
      g.rect(c * px - halfW, top + r * px, px, px);
      g.fill(colors[ch]);
    }
  }

  // Fire aura — flickering flame particles around the body
  const flames = [
    { x: -30, y: -60, h: 18 }, { x: 30, y: -60, h: 18 },
    { x: -38, y: -30, h: 14 }, { x: 38, y: -30, h: 14 },
    { x: -34, y: 0, h: 12 }, { x: 34, y: 0, h: 12 },
    { x: -20, y: -80, h: 10 }, { x: 20, y: -80, h: 10 },
  ];
  for (const f of flames) {
    g.moveTo(f.x - 4, f.y);
    g.lineTo(f.x + 4, f.y);
    g.lineTo(f.x, f.y - f.h);
    g.closePath();
    g.fill(0xff6600);
    g.moveTo(f.x - 2, f.y);
    g.lineTo(f.x + 2, f.y);
    g.lineTo(f.x, f.y - f.h * 0.6);
    g.closePath();
    g.fill(0xffcc00);
  }

  container.addChild(g);
  return g;
}

function createBoss(bossConfig) {
  const container = new Container();
  const { type, name, wordCount, wordLen, speed } = bossConfig;

  // Draw the boss body
  if (type === "skeleton") drawSkeleton(container);
  else if (type === "ghost") drawGhost(container);
  else if (type === "shark") drawShark(container);
  else if (type === "demon") drawDemon(container);

  // Blood layer
  const bloodContainer = new Container();
  container.addChild(bloodContainer);

  // Generate words for the boss
  const words = [];
  for (let i = 0; i < wordCount; i++) {
    const pool = substrings[String(wordLen)];
    if (pool && pool.length > 0) {
      words.push(pool[Math.floor(Math.random() * pool.length)]);
    }
  }

  // Build the full string: "CAT DOG BAT FLY ..." (spaces between words)
  const fullWord = words.join(" ");

  // Layout letter bubbles in rows below the boss body
  const bubbleSpacing = 20;
  const maxPerRow = 14;
  const bubbleStartY = 55;
  const letterTexts = [];
  const bubblePositions = []; // for blood avoidance

  for (let i = 0; i < fullWord.length; i++) {
    // Determine row and column
    const row = Math.floor(i / maxPerRow);
    const rowStart = row * maxPerRow;
    const rowEnd = Math.min(rowStart + maxPerRow, fullWord.length);
    const rowLen = rowEnd - rowStart;
    const col = i - rowStart;

    const totalRowW = (rowLen - 1) * bubbleSpacing;
    const bx = -totalRowW / 2 + col * bubbleSpacing;
    const by = bubbleStartY + row * 24;

    if (fullWord[i] === " ") {
      // Space separator — yellow dot indicator
      const dot = new Graphics();
      dot.circle(bx, by, 3);
      dot.fill(0xf1c40f);
      container.addChild(dot);

      const spaceLbl = new Text({
        text: "·",
        style: new TextStyle({
          fontFamily: "monospace",
          fontSize: 14,
          fontWeight: "bold",
          fill: 0xf1c40f,
        }),
        resolution: 4,
      });
      spaceLbl.anchor.set(0.5);
      spaceLbl.x = bx;
      spaceLbl.y = by;
      container.addChild(spaceLbl);
      letterTexts.push(spaceLbl);
      bubblePositions.push({ x: bx, y: by });
    } else {
      const bubble = new Graphics();
      bubble.circle(bx, by, 10);
      bubble.fill(0xffffff);
      bubble.circle(bx, by, 10);
      bubble.stroke({ width: 1.5, color: 0xbdc3c7 });
      container.addChild(bubble);

      const lt = new Text({
        text: fullWord[i],
        style: new TextStyle({
          fontFamily: "Arial",
          fontSize: 13,
          fontWeight: "bold",
          fill: 0x2c3e50,
        }),
        resolution: 4,
      });
      lt.anchor.set(0.5);
      lt.x = bx;
      lt.y = by;
      container.addChild(lt);
      letterTexts.push(lt);
      bubblePositions.push({ x: bx, y: by });
    }
  }

  // Boss name label above
  const nameLabel = new Text({
    text: name,
    style: new TextStyle({
      fontFamily: "monospace",
      fontSize: 16,
      fontWeight: "bold",
      fill: 0xff4444,
    }),
    resolution: 4,
  });
  nameLabel.anchor.set(0.5);
  nameLabel.y = -110;
  container.addChild(nameLabel);

  // Health bar background (just below name, above skeleton)
  const hpBarY = -100;
  const hpBarBg = new Graphics();
  hpBarBg.roundRect(-60, hpBarY, 120, 8, 3);
  hpBarBg.fill(0x333333);
  container.addChild(hpBarBg);

  // Health bar fill
  const hpBar = new Graphics();
  hpBarBg.addChild(hpBar);

  function updateHpBar(hitIndex, total) {
    hpBar.clear();
    const pct = 1 - hitIndex / total;
    if (pct > 0) {
      hpBar.roundRect(-60, hpBarY, 120 * pct, 8, 3);
      hpBar.fill(pct > 0.5 ? 0x2ecc71 : pct > 0.25 ? 0xf39c12 : 0xe74c3c);
    }
  }
  updateHpBar(0, fullWord.length);

  return {
    container,
    propeller: null, // bosses don't have propellers
    bloodContainer,
    word: fullWord,
    letterTexts,
    hitIndex: 0,
    isBoss: true,
    bossConfig,
    bubblePositions,
    updateHpBar,
    speed,
  };
}

// ── Projectile (laser bolt) ───────────────────────────────
function createBullet(x, y, targetX, targetY) {
  const bullet = new Graphics();
  bullet.circle(0, 0, 4);
  bullet.fill(0x2ecc71);
  bullet.circle(0, 0, 2);
  bullet.fill(0xffffff);
  bullet.x = x;
  bullet.y = y;
  app.stage.addChild(bullet);

  const dx = targetX - x;
  const dy = targetY - y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  return {
    gfx: bullet,
    vx: (dx / dist) * 28,
    vy: (dy / dist) * 28,
    targetX,
    targetY,
    alive: true,
  };
}

// ── Player setup ───────────────────────────────────────────
const player = new Container();
const flame = drawOctopus(player);
player.x = PLAYER_X;
player.y = app.screen.height / 2;
app.stage.addChild(player);

// ── Score / Lives UI ───────────────────────────────────────
const uiStyle = new TextStyle({
  fontFamily: "monospace",
  fontSize: 20,
  fill: 0xecf0f1,
});
const scoreText = new Text({ text: "Score: 0", style: uiStyle });
scoreText.x = 14;
scoreText.y = 14;
app.stage.addChild(scoreText);

const livesText = new Text({ text: "Lives: 3", style: uiStyle });
livesText.x = 14;
livesText.y = 42;
app.stage.addChild(livesText);

const levelText = new Text({ text: "Level: 1", style: uiStyle });
levelText.x = 14;
levelText.y = 70;
app.stage.addChild(levelText);

const lpsText = new Text({ text: `LPS: ${getLPS()}`, style: uiStyle });
lpsText.x = 14;
lpsText.y = 98;
app.stage.addChild(lpsText);

const soundText = new Text({ text: "Sound: ON", style: uiStyle });
soundText.anchor.set(1, 0);
soundText.x = app.screen.width - 14;
soundText.y = 14;
app.stage.addChild(soundText);

const gameOverText = new Text({
  text: "GAME OVER\nPress Enter to restart",
  style: new TextStyle({
    fontFamily: "monospace",
    fontSize: 42,
    fill: 0xe74c3c,
    align: "center",
  }),
});
gameOverText.anchor.set(0.5);
gameOverText.x = app.screen.width / 2;
gameOverText.y = app.screen.height / 2;
gameOverText.visible = false;
app.stage.addChild(gameOverText);

const winText = new Text({
  text: "YOU WIN!\nPress Enter to restart",
  style: new TextStyle({
    fontFamily: "monospace",
    fontSize: 42,
    fill: 0x2ecc71,
    align: "center",
  }),
});
winText.anchor.set(0.5);
winText.x = app.screen.width / 2;
winText.y = app.screen.height / 2;
winText.visible = false;
app.stage.addChild(winText);

const pauseText = new Text({
  text: "PAUSED\nPress Enter to resume",
  style: new TextStyle({
    fontFamily: "monospace",
    fontSize: 42,
    fill: 0xecf0f1,
    align: "center",
  }),
});
pauseText.anchor.set(0.5);
pauseText.x = app.screen.width / 2;
pauseText.y = app.screen.height / 2;
pauseText.visible = false;
app.stage.addChild(pauseText);

// ── Spawning ───────────────────────────────────────────────
function getWordLength() {
  // Tier 0 (levels 1-10): always 1 letter
  // Tier T≥1: base length T, chance of T+1 scales 10%→100%
  // Capped at 5 (max substring length from 5-letter word list)
  const tier = Math.floor((level - 1) / 10);
  if (tier === 0) return 1;
  const tierProgress = ((level - 1) % 10) / 9;
  const upgradeChance = 0.1 + tierProgress * 0.9;
  const len = Math.random() < upgradeChance ? tier + 1 : tier;
  return Math.min(len, 5);
}

function pickWord(wordLen) {
  // Collect first letters already in use by active monsters
  const activeFirstLetters = new Set(
    monsters.filter((m) => !m.dying).map((m) => m.word[m.hitIndex])
  );

  if (wordLen === 1) {
    const available = LETTERS.split("").filter(
      (l) => !activeFirstLetters.has(l)
    );
    if (available.length === 0) return null;
    return available[Math.floor(Math.random() * available.length)];
  }

  // For multi-letter, pick from real English word substrings
  const pool = substrings[String(wordLen)];
  if (!pool || pool.length === 0) return null;

  // Shuffle candidates and find one whose first letter isn't taken
  for (let attempts = 0; attempts < 60; attempts++) {
    const candidate = pool[Math.floor(Math.random() * pool.length)];
    if (!activeFirstLetters.has(candidate[0])) return candidate;
  }
  return null;
}

function spawnBoss() {
  const config = BOSS_LEVELS[level];
  if (!config || bossActive) return;

  const m = createBoss(config);
  m.container.x = app.screen.width + 80;
  m.container.y = app.screen.height / 2;
  m.dying = false;
  m.dyingVy = 0;

  bossActive = true;
  app.stage.addChild(m.container);
  monsters.push(m);
}

function spawnMonster() {
  if (gameOver || gameWon) return;

  // Boss level: spawn boss instead of regular monsters
  if (BOSS_LEVELS[level]) {
    if (!bossActive) spawnBoss();
    return;
  }

  const wordLen = getWordLength();
  const word = pickWord(wordLen);
  if (!word) return;

  const m = createMonster(word);

  m.container.x = app.screen.width + 40;
  m.container.y = 60 + Math.random() * (app.screen.height - 140);
  m.dying = false;
  m.dyingVy = 0;

  // Speed: both bounds grow with level, capped at level 10 values
  const speedLevel = Math.min(level, 10);
  const minSpeed = MONSTER_SPEED + (speedLevel - 1) * 0.06;
  const maxSpeed = MONSTER_SPEED + (speedLevel - 1) * 0.5;
  m.speed = minSpeed + Math.random() * (maxSpeed - minSpeed);

  app.stage.addChild(m.container);
  monsters.push(m);
}

let spawnTimer = 0;

// ── Bullets ────────────────────────────────────────────────
let bullets = [];

// ── Blood particles ───────────────────────────────────────
let bloodParticles = [];

function spawnBlood(x, y, count) {
  for (let i = 0; i < count; i++) {
    const g = new Graphics();
    const r = 1.5 + Math.random() * 2.5;
    g.circle(0, 0, r);
    g.fill(Math.random() < 0.4 ? 0x8b0000 : 0xcc0000);
    g.x = x;
    g.y = y;
    app.stage.addChild(g);
    const angle = Math.random() * Math.PI * 2;
    const speed = 1 + Math.random() * 5;
    bloodParticles.push({
      gfx: g,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 2,
      life: 1,
      decay: 0.015 + Math.random() * 0.02,
    });
  }
}

// ── Stun UI ───────────────────────────────────────────────
const stunText = new Text({
  text: "STUNNED!",
  style: new TextStyle({
    fontFamily: "monospace",
    fontSize: 24,
    fill: 0xe74c3c,
    fontWeight: "bold",
  }),
});
stunText.anchor.set(0.5);
stunText.x = PLAYER_X;
stunText.y = app.screen.height / 2 - 60;
stunText.visible = false;
app.stage.addChild(stunText);

// ── Input ──────────────────────────────────────────────────
window.addEventListener("keydown", (e) => {
  // Resume audio context on first user interaction
  if (audioCtx.state === "suspended") audioCtx.resume();

  // Auto-start music if conditions are right
  if (soundEnabled && !musicPlaying && !gameOver && !gameWon && !paused) {
    startMusic();
  }

  if (gameOver || gameWon) {
    if (e.code === "Enter") restartGame();
    return;
  }

  if (e.code === "Backquote") {
    soundEnabled = !soundEnabled;
    soundText.text = soundEnabled ? "Sound: ON" : "Sound: OFF";
    if (soundEnabled && !paused && !gameOver && !gameWon) startMusic();
    else stopMusic();
    return;
  }

  if (e.code === "Escape") {
    const wasPaused = paused;
    paused = true;
    pauseText.visible = true;
    stopMusic();
    const input = prompt("Enter a starting level (1-60):");
    if (input !== null) {
      const n = parseInt(input, 10);
      if (n >= 1 && n <= MAX_LEVEL) {
        restartGame();
        level = n;
        score = (n - 1) * 10;
        scoreText.text = `Score: ${score}`;
        levelText.text = `Level: ${level}`;
        lpsText.text = `LPS: ${getLPS()}`;
        return;
      }
    }
    // Restore previous pause state if cancelled or invalid
    paused = wasPaused;
    pauseText.visible = wasPaused;
    if (!wasPaused && soundEnabled) startMusic();
    return;
  }

  if (e.code === "Enter") {
    paused = !paused;
    pauseText.visible = paused;
    if (paused) stopMusic();
    else if (soundEnabled) startMusic();
    return;
  }

  if (paused) return;

  // Space bar handling for boss word gaps
  if (e.code === "Space") {
    e.preventDefault();
    if (Date.now() < stunUntil) return;

    // Find a boss monster whose next character is a space
    const boss = monsters.find((m) => {
      if (m.dying || !m.isBoss) return false;
      const pending = bullets.filter((b) => b.target === m).length;
      const nextIdx = m.hitIndex + pending;
      return nextIdx < m.word.length && m.word[nextIdx] === " ";
    });

    if (boss) {
      // Immediately advance past the space (no bullet needed)
      playHit();
      boss.letterTexts[boss.hitIndex].style.fill = 0x333333;
      boss.hitIndex++;
      if (boss.updateHpBar) boss.updateHpBar(boss.hitIndex, boss.word.length);
    }
    // No stun on space misses
    return;
  }

  const key = e.key.toUpperCase();
  if (key.length !== 1 || !LETTERS.includes(key)) return;

  // Can't shoot while stunned
  if (Date.now() < stunUntil) return;

  // Count in-flight bullets per monster
  const bulletsPerTarget = new Map();
  for (const b of bullets) {
    bulletsPerTarget.set(b.target, (bulletsPerTarget.get(b.target) || 0) + 1);
  }

  // Find the closest monster whose next needed letter matches,
  // accounting for bullets already in flight
  const target = monsters
    .filter((m) => {
      if (m.dying) return false;
      const pending = bulletsPerTarget.get(m) || 0;
      const nextIdx = m.hitIndex + pending;
      return nextIdx < m.word.length && m.word[nextIdx] === key;
    })
    .sort((a, b) => a.container.x - b.container.x)[0];

  if (!target) {
    // Don't stun if the letter was already cleared on some active monster
    const isGrayedLetter = monsters.some(
      (m) => !m.dying && m.hitIndex > 0 && m.word.slice(0, m.hitIndex).includes(key)
    );
    if (!isGrayedLetter) {
      stunUntil = Date.now() + 300;
    }
    return;
  }

  // Shoot!
  playShoot();
  const bullet = createBullet(
    player.x + 20,
    player.y - 5,
    target.container.x,
    target.container.y
  );
  bullet.target = target;
  bullets.push(bullet);
});

// ── Restart ────────────────────────────────────────────────
function restartGame() {
  for (const m of monsters) app.stage.removeChild(m.container);
  for (const b of bullets) app.stage.removeChild(b.gfx);
  for (const p of bloodParticles) app.stage.removeChild(p.gfx);
  monsters = [];
  bullets = [];
  bloodParticles = [];
  score = 0;
  lives = 3;
  level = 1;
  gameOver = false;
  gameWon = false;
  paused = false;
  stunUntil = 0;
  bossActive = false;
  scoreText.text = "Score: 0";
  pauseText.visible = false;
  livesText.text = "Lives: 3";
  levelText.text = "Level: 1";
  lpsText.text = `LPS: ${getLPS()}`;
  gameOverText.visible = false;
  winText.visible = false;
  spawnTimer = 0;
  stopMusic();
  if (soundEnabled) startMusic();
}

// ── Game loop ──────────────────────────────────────────────
let tick = 0;

app.ticker.add((ticker) => {
  tick++;
  const dt = ticker.deltaTime;

  // Player hover animation
  player.y = app.screen.height / 2 + Math.sin(tick * 0.04) * 12;
  drawFlame(flame, tick);

  // Stun indicator
  const stunned = !paused && Date.now() < stunUntil;
  stunText.visible = stunned;
  stunText.y = player.y - 60;
  if (stunned) {
    stunText.alpha = 0.6 + Math.sin(tick * 0.2) * 0.4;
  }

  if (gameOver || gameWon || paused) return;

  // Spawn timer
  const interval = getSpawnInterval();
  spawnTimer += ticker.deltaMS;
  if (spawnTimer >= interval) {
    spawnTimer -= interval;
    spawnMonster();
  }

  // Update monsters
  for (let i = monsters.length - 1; i >= 0; i--) {
    const m = monsters[i];

    if (m.propeller) drawPropeller(m.propeller, tick, m.beanieY, m.propScale);

    if (m.dying) {
      // Fall down
      m.dyingVy += 0.4 * dt;
      m.container.y += m.dyingVy * dt;
      m.container.rotation += 0.05 * dt;
      m.container.alpha -= 0.015 * dt;

      if (m.container.y > app.screen.height + 60 || m.container.alpha <= 0) {
        app.stage.removeChild(m.container);
        monsters.splice(i, 1);
      }
    } else {
      // Float left
      m.container.x -= m.speed * dt;
      // Gentle bob
      m.container.y += Math.sin(tick * 0.05 + i) * 0.3;

      // Reached player side?
      if (m.container.x < PLAYER_X - 30) {
        if (m.isBoss) {
          // Boss reaching player = instant game over
          lives = 0;
          bossActive = false;
        } else {
          lives--;
        }
        livesText.text = `Lives: ${lives}`;
        app.stage.removeChild(m.container);
        monsters.splice(i, 1);

        if (lives <= 0) {
          gameOver = true;
          gameOverText.visible = true;
          stopMusic();
        }
      }
    }
  }

  // Update bullets
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];

    // Re-aim toward current target position every frame
    const dx = b.target.container.x - b.gfx.x;
    const dy = b.target.container.y - b.gfx.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const speed = 28;
    b.vx = (dx / dist) * speed;
    b.vy = (dy / dist) * speed;

    b.gfx.x += b.vx * dt;
    b.gfx.y += b.vy * dt;

    // Check if bullet reached target area
    if (dist < 20) {
      const t = b.target;

      // If this monster is already dying or fully hit, discard the stale bullet
      if (t.dying || t.hitIndex >= t.word.length) {
        app.stage.removeChild(b.gfx);
        bullets.splice(i, 1);
        continue;
      }

      // Grey out the hit letter
      t.letterTexts[t.hitIndex].style.fill = 0xaaaaaa;
      t.hitIndex++;
      playHit();
      spawnBlood(t.container.x, t.container.y, 8);

      // Update boss HP bar
      if (t.updateHpBar) t.updateHpBar(t.hitIndex, t.word.length);

      // Skip spaces that immediately follow a letter hit (auto-advance)
      // (spaces are handled by Space key, but if hitIndex lands on space after bullet, don't block)

      if (t.hitIndex >= t.word.length) {
        // All letters hit — kill it
        playKill();
        spawnBlood(t.container.x, t.container.y, t.isBoss ? 60 : 25);

        const killPoints = t.isBoss ? 10 : 1;
        score += killPoints;
        scoreText.text = `Score: ${score}`;

        if (t.isBoss) bossActive = false;

        const newLevel = Math.min(Math.floor(score / 10) + 1, MAX_LEVEL + 1);
        if (newLevel !== level) {
          level = newLevel;
          levelText.text = `Level: ${Math.min(level, MAX_LEVEL)}`;
          lpsText.text = `LPS: ${getLPS()}`;
        }
        t.dying = true;
        t.dyingVy = -2;

        // Win condition: beat level 60
        if (level > MAX_LEVEL) {
          gameWon = true;
          winText.visible = true;
          stopMusic();
        }
      } else {
        // Non-kill hit — add persistent blood on monster body
        if (!t.isBoss) addMonsterBlood(t);
      }

      app.stage.removeChild(b.gfx);
      bullets.splice(i, 1);
      continue;
    }

    // Off-screen cleanup
    if (
      b.gfx.x > app.screen.width + 50 ||
      b.gfx.x < -50 ||
      b.gfx.y > app.screen.height + 50 ||
      b.gfx.y < -50
    ) {
      app.stage.removeChild(b.gfx);
      bullets.splice(i, 1);
    }
  }

  // Update blood particles
  for (let i = bloodParticles.length - 1; i >= 0; i--) {
    const p = bloodParticles[i];
    p.vy += 0.15 * dt; // gravity
    p.gfx.x += p.vx * dt;
    p.gfx.y += p.vy * dt;
    p.life -= p.decay * dt;
    p.gfx.alpha = p.life;
    if (p.life <= 0) {
      app.stage.removeChild(p.gfx);
      bloodParticles.splice(i, 1);
    }
  }
});
