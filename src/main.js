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

let monsters = [];
let score = 0;
let lives = 3;
let level = 1;
let gameOver = false;
let gameWon = false;
let paused = false;
let stunUntil = 0; // timestamp when stun ends (miss penalty)

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

  return { container, propeller, word, letterTexts, hitIndex: 0, beanieY: bodyTop, propScale: scale };
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
    vx: (dx / dist) * 14,
    vy: (dy / dist) * 14,
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
  text: "GAME OVER\nPress Space to restart",
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
  text: "YOU WIN!\nPress Space to restart",
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
  text: "PAUSED\nPress Space to resume",
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

function spawnMonster() {
  if (gameOver || gameWon) return;

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
  if (gameOver || gameWon) {
    if (e.code === "Space") restartGame();
    return;
  }

  if (e.code === "Backquote") {
    soundEnabled = !soundEnabled;
    soundText.text = soundEnabled ? "Sound: ON" : "Sound: OFF";
    return;
  }

  if (e.code === "Escape") {
    const wasPaused = paused;
    paused = true;
    pauseText.visible = true;
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
    return;
  }

  if (e.code === "Space") {
    paused = !paused;
    pauseText.visible = paused;
    return;
  }

  if (paused) return;

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
  monsters = [];
  bullets = [];
  score = 0;
  lives = 3;
  level = 1;
  gameOver = false;
  gameWon = false;
  paused = false;
  stunUntil = 0;
  scoreText.text = "Score: 0";
  pauseText.visible = false;
  livesText.text = "Lives: 3";
  levelText.text = "Level: 1";
  lpsText.text = `LPS: ${getLPS()}`;
  gameOverText.visible = false;
  winText.visible = false;
  spawnTimer = 0;
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

    drawPropeller(m.propeller, tick, m.beanieY, m.propScale);

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
        lives--;
        livesText.text = `Lives: ${lives}`;
        app.stage.removeChild(m.container);
        monsters.splice(i, 1);

        if (lives <= 0) {
          gameOver = true;
          gameOverText.visible = true;
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
    const speed = 14;
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

      if (t.hitIndex >= t.word.length) {
        // All letters hit — kill it
        playKill();
        score++;
        scoreText.text = `Score: ${score}`;
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
        }
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
});
