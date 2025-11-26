const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const ui = {
  level: document.getElementById("level"),
  score: document.getElementById("score"),
  lives: document.getElementById("lives"),
  status: document.getElementById("status"),
};

const hero = {
  x: canvas.width / 2,
  y: canvas.height - 60,
  size: 22,
  speed: 4.2,
  color: "#52ffa8",
  dx: 0,
  dy: 0,
};

const bullets = [];
const enemies = [];
const enemyBullets = [];

let level = 1;
let score = 0;
let lives = 3;
let lastShot = 0;
let playing = true;
let bossMode = false;
const restartHint = "Pulsa R o Enter para reiniciar";

const keys = new Set();

function playAudio(freq, duration, type = "square") {
  if (!window.AudioContext) return;
  const ctx = new AudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.frequency.value = freq;
  osc.type = type;
  gain.gain.value = 0.1;
  osc.connect(gain).connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + duration);
}

function resetLevel() {
  enemies.length = 0;
  enemyBullets.length = 0;
  bossMode = level >= 5;
  if (bossMode) {
    createBoss();
  } else {
    spawnEnemies(6 + level * 2);
  }
  updateStatus(bossMode ? "¡El boss final aparece!" : "Derrota a todas las cacas");
}

function endGame(message) {
  playing = false;
  updateStatus(`${message} — ${restartHint}`);
}

function spawnEnemies(count) {
  for (let i = 0; i < count; i++) {
    enemies.push({
      x: 40 + Math.random() * (canvas.width - 80),
      y: -Math.random() * 200 - 30,
      size: 18 + Math.random() * 10,
      speed: 1 + Math.random() * 1.4,
      color: "#ff5c8a",
      hp: 1,
    });
  }
}

function createBoss() {
  enemies.push({
    x: canvas.width / 2,
    y: 120,
    size: 55,
    speed: 1.2,
    color: "#ff3179",
    hp: 35,
    isBoss: true,
    dir: 1,
  });
}

function updateStatus(message) {
  ui.status.textContent = message;
}

function drawHero() {
  ctx.fillStyle = hero.color;
  ctx.beginPath();
  ctx.arc(hero.x, hero.y, hero.size, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.1)";
  ctx.lineWidth = 3;
  ctx.stroke();
}

function drawEnemies() {
  enemies.forEach((e) => {
    const gradient = ctx.createRadialGradient(e.x, e.y, 4, e.x, e.y, e.size + 6);
    gradient.addColorStop(0, "#4d1b00");
    gradient.addColorStop(1, e.color);
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(e.x - e.size, e.y + e.size * 0.2);
    ctx.quadraticCurveTo(e.x, e.y - e.size * 1.1, e.x + e.size, e.y + e.size * 0.2);
    ctx.quadraticCurveTo(e.x, e.y + e.size * 0.9, e.x - e.size, e.y + e.size * 0.2);
    ctx.fill();

    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(e.x - e.size * 0.3, e.y, 3, 0, Math.PI * 2);
    ctx.arc(e.x + e.size * 0.3, e.y, 3, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawBullets() {
  ctx.fillStyle = hero.color;
  bullets.forEach((b) => {
    ctx.beginPath();
    ctx.arc(b.x, b.y, 5, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.fillStyle = "#ffcf33";
  enemyBullets.forEach((b) => {
    ctx.beginPath();
    ctx.arc(b.x, b.y, 6, 0, Math.PI * 2);
    ctx.fill();
  });
}

function handleInput() {
  hero.dx = (keys.has("ArrowRight") || keys.has("d")) ? hero.speed : 0;
  if (keys.has("ArrowLeft") || keys.has("a")) hero.dx -= hero.speed;

  hero.dy = (keys.has("ArrowDown") || keys.has("s")) ? hero.speed : 0;
  if (keys.has("ArrowUp") || keys.has("w")) hero.dy -= hero.speed;

  hero.x = Math.max(hero.size, Math.min(canvas.width - hero.size, hero.x + hero.dx));
  hero.y = Math.max(hero.size, Math.min(canvas.height - hero.size, hero.y + hero.dy));
}

function shoot() {
  const now = performance.now();
  if (now - lastShot < 220) return;
  bullets.push({ x: hero.x, y: hero.y - hero.size, speed: 7 });
  lastShot = now;
  playAudio(420, 0.08, "sawtooth");
}

function moveBullets() {
  bullets.forEach((b) => (b.y -= b.speed));
  enemyBullets.forEach((b) => (b.y += b.speed));
  removeOffscreen();
}

function removeOffscreen() {
  for (let i = bullets.length - 1; i >= 0; i--) if (bullets[i].y < -10) bullets.splice(i, 1);
  for (let i = enemyBullets.length - 1; i >= 0; i--) if (enemyBullets[i].y > canvas.height + 10) enemyBullets.splice(i, 1);
}

function moveEnemies() {
  enemies.forEach((e) => {
    if (e.isBoss) {
      e.x += e.dir * e.speed;
      if (e.x > canvas.width - e.size || e.x < e.size) e.dir *= -1;
      if (Math.random() < 0.02) {
        enemyBullets.push({ x: e.x, y: e.y + e.size, speed: 4 + Math.random() * 1.5 });
      }
    } else {
      e.y += e.speed;
      if (Math.random() < 0.005 && e.y > 0) {
        enemyBullets.push({ x: e.x, y: e.y + e.size, speed: 4 });
      }
      if (e.y > canvas.height + e.size) {
        e.y = -20;
        e.x = 20 + Math.random() * (canvas.width - 40);
      }
    }
  });
}

function collide(a, b, radius) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy < radius * radius;
}

function checkCollisions() {
  for (let i = enemies.length - 1; i >= 0; i--) {
    const enemy = enemies[i];
    for (let j = bullets.length - 1; j >= 0; j--) {
      if (collide(enemy, bullets[j], enemy.size + 6)) {
        bullets.splice(j, 1);
        enemy.hp -= 1;
        if (enemy.hp <= 0) {
          enemies.splice(i, 1);
          score += enemy.isBoss ? 150 : 20;
          updateUI();
          playAudio(enemy.isBoss ? 120 : 240, 0.12, "triangle");
        }
        break;
      }
    }
  }

  for (let i = enemyBullets.length - 1; i >= 0; i--) {
    if (collide(enemyBullets[i], hero, hero.size)) {
      enemyBullets.splice(i, 1);
      loseLife();
    }
  }

  enemies.forEach((e) => {
    if (collide(e, hero, e.size + hero.size - 6)) {
      e.y = -30;
      loseLife();
    }
  });
}

function loseLife() {
  lives -= 1;
  playAudio(90, 0.18, "sine");
  if (lives <= 0) {
    endGame("Fin del juego: te quedaste sin vidas");
  } else {
    updateUI();
    updateStatus("¡Ay! Te golpearon");
  }
}

function checkLevelCompletion() {
  if (!playing) return;
  if (enemies.length === 0) {
    if (bossMode) {
      endGame("¡Victoria! La caca boss fue derrotada");
      return;
    }
    level += 1;
    score += 50;
    updateUI();
    if (level > 5) {
      endGame("Eres el rey de las cacas derrotadas");
      return;
    }
    resetLevel();
  }
}

function updateUI() {
  ui.level.textContent = level;
  ui.score.textContent = score;
  ui.lives.textContent = lives;
}

function update() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  handleInput();
  moveBullets();
  moveEnemies();
  checkCollisions();
  checkLevelCompletion();

  drawHero();
  drawEnemies();
  drawBullets();

  if (playing) requestAnimationFrame(update);
}

window.addEventListener("keydown", (e) => {
  keys.add(e.key);
  if (e.code === "Space" && playing) shoot();
  if (!playing && (e.code === "KeyR" || e.code === "Enter")) {
    startGame();
  }
});

window.addEventListener("keyup", (e) => {
  keys.delete(e.key);
});

function startGame() {
  level = 1;
  score = 0;
  lives = 3;
  playing = true;
  bossMode = false;
  updateUI();
  resetLevel();
  requestAnimationFrame(update);
}

startGame();
