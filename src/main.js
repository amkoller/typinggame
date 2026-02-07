import { Application, Graphics, Text, TextStyle, Container } from "pixi.js";

const app = new Application();

await app.init({
  resizeTo: window,
  backgroundColor: 0x1a1a2e,
  antialias: true,
});

document.body.appendChild(app.canvas);

// ── Constants ──────────────────────────────────────────────
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const MONSTER_SPEED = 1.2;
const SPAWN_INTERVAL = 2000; // ms
const PLAYER_X = 100;

let monsters = [];
let score = 0;
let lives = 3;
let level = 1;
let gameOver = false;
let paused = false;
let stunUntil = 0; // timestamp when stun ends (miss penalty)

function getSpawnInterval() {
  // 2000ms at level 1, decreasing by 150ms per level, min 600ms
  return Math.max(600, SPAWN_INTERVAL - (level - 1) * 150);
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

function createMonster(letter) {
  const container = new Container();

  const body = new Graphics();
  // Body – orange rounded rectangle
  body.roundRect(-18, -16, 36, 38, 8);
  body.fill(0xe67e22);
  // Feet
  body.circle(-10, 24, 5);
  body.circle(10, 24, 5);
  body.fill(0xd35400);
  // Arms
  body.roundRect(-28, -2, 12, 6, 3);
  body.roundRect(16, -2, 12, 6, 3);
  body.fill(0xe67e22);
  // Eyes
  body.circle(-7, -6, 5);
  body.circle(7, -6, 5);
  body.fill(0xffffff);
  body.circle(-7, -6, 2.5);
  body.circle(7, -6, 2.5);
  body.fill(0x111111);
  // Mouth – little open circle
  body.circle(0, 6, 4);
  body.fill(0x111111);

  container.addChild(body);

  // Propeller beanie
  const beanie = new Graphics();
  // Cap
  beanie.arc(0, -16, 14, Math.PI, 0);
  beanie.fill(0x3498db);
  // Nub on top
  beanie.circle(0, -20, 3);
  beanie.fill(0xe74c3c);
  container.addChild(beanie);

  // Propeller blades (will animate)
  const propeller = new Graphics();
  container.addChild(propeller);

  // Letter bubble on shirt
  const bubble = new Graphics();
  bubble.circle(0, 12, 11);
  bubble.fill(0xffffff);
  bubble.circle(0, 12, 11);
  bubble.stroke({ width: 1.5, color: 0xbdc3c7 });
  container.addChild(bubble);

  const letterText = new Text({
    text: letter,
    style: new TextStyle({
      fontFamily: "Arial",
      fontSize: 14,
      fontWeight: "bold",
      fill: 0x2c3e50,
    }),
  });
  letterText.anchor.set(0.5);
  letterText.x = 0;
  letterText.y = 12;
  container.addChild(letterText);

  return { container, propeller, letter };
}

function drawPropeller(propeller, tick) {
  propeller.clear();
  const angle = tick * 0.4;
  const len = 16;
  // Two blades
  for (let i = 0; i < 2; i++) {
    const a = angle + i * Math.PI;
    const dx = Math.cos(a) * len;
    const dy = Math.sin(a) * 3; // flatten to simulate rotation
    propeller.moveTo(-dx, -20 - dy);
    propeller.lineTo(dx, -20 + dy);
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
function spawnMonster() {
  if (gameOver) return;

  // Pick a letter not already active
  const activeLetters = new Set(monsters.map((m) => m.letter));
  const available = LETTERS.split("").filter((l) => !activeLetters.has(l));
  if (available.length === 0) return;

  const letter = available[Math.floor(Math.random() * available.length)];
  const m = createMonster(letter);

  m.container.x = app.screen.width + 40;
  m.container.y = 60 + Math.random() * (app.screen.height - 140);
  m.dying = false;
  m.dyingVy = 0;

  // Speed: both bounds grow with level
  const minSpeed = MONSTER_SPEED + (level - 1) * 0.15;
  const maxSpeed = MONSTER_SPEED + (level - 1) * 0.5;
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
  if (gameOver) {
    if (e.code === "Space") restartGame();
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

  // Find the closest monster with this letter
  const target = monsters
    .filter((m) => m.letter === key && !m.dying)
    .sort((a, b) => a.container.x - b.container.x)[0];

  if (!target) {
    // Typed a wrong letter — stunned for 3 seconds
    stunUntil = Date.now() + 3000;
    return;
  }

  // Shoot!
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
  paused = false;
  stunUntil = 0;
  scoreText.text = "Score: 0";
  pauseText.visible = false;
  livesText.text = "Lives: 3";
  levelText.text = "Level: 1";
  gameOverText.visible = false;
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

  if (gameOver || paused) return;

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

    drawPropeller(m.propeller, tick);

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
      // Hit!
      score++;
      scoreText.text = `Score: ${score}`;
      const newLevel = Math.floor(score / 10) + 1;
      if (newLevel !== level) {
        level = newLevel;
        levelText.text = `Level: ${level}`;
      }
      b.target.dying = true;
      b.target.dyingVy = -2;
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
