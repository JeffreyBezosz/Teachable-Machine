const legacyBase = "assets/Legacy Collection/Legacy Collection/Assets";
const assetPaths = {
  mistBack: `${legacyBase}/Gothicvania/Environments/mist-forest-background/layers/mist-forest-background-back.png`,
  mistBackTrees: `${legacyBase}/Gothicvania/Environments/mist-forest-background/layers/mist-forest-background-back-trees.png`,
  mistTree: `${legacyBase}/Gothicvania/Environments/mist-forest-background/layers/mist-forest-background-tree.png`,
  heroIdle: [1, 2, 3, 4].map((n) => `${legacyBase}/Gothicvania/Characters/Bridge Heroine/Heroine base/Sprites/idle/player-idle-${n}.png`),
  heroRun: [1, 2, 3, 4, 5, 6, 7].map((n) => `${legacyBase}/Gothicvania/Characters/Bridge Heroine/Heroine base/Sprites/run/player-run-${n}.png`),
  heroJump: [1, 2, 3, 4].map((n) => `${legacyBase}/Gothicvania/Characters/Bridge Heroine/Heroine base/Sprites/jump/player-jump-${n}.png`),
  gems: `${legacyBase}/Misc/gems/spritesheets/gems-spritesheet.png`,
  slimes: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((n) => `assets/Slimes/SlimeGreen/SlimeBasic_${String(n).padStart(5, "0")}.png`),
};

const heroBounds = {
  idle: [
    { x: 56, y: 23, w: 16, h: 41 },
    { x: 55, y: 24, w: 18, h: 40 },
    { x: 54, y: 25, w: 20, h: 39 },
    { x: 55, y: 24, w: 18, h: 40 },
  ],
  run: [
    { x: 54, y: 30, w: 26, h: 34 },
    { x: 60, y: 29, w: 19, h: 35 },
    { x: 53, y: 26, w: 26, h: 38 },
    { x: 51, y: 29, w: 30, h: 35 },
    { x: 57, y: 30, w: 22, h: 34 },
    { x: 53, y: 26, w: 28, h: 38 },
    { x: 51, y: 28, w: 31, h: 36 },
  ],
  jump: [
    { x: 53, y: 21, w: 25, h: 43 },
    { x: 52, y: 25, w: 20, h: 34 },
    { x: 52, y: 17, w: 20, h: 47 },
    { x: 52, y: 16, w: 20, h: 48 },
  ],
};

const ui = {
  areaName: document.querySelector("#areaName"),
  score: document.querySelector("#score"),
  bestScore: document.querySelector("#bestScore"),
  level: document.querySelector("#level"),
  healthFill: document.querySelector("#healthFill"),
  restartBtn: document.querySelector("#restartBtn"),
  toast: document.querySelector("#toast"),
  tmUrl: document.querySelector("#tmUrl"),
  tmStartBtn: document.querySelector("#tmStartBtn"),
  tmStatus: document.querySelector("#tmStatus"),
  tmPrediction: document.querySelector("#tmPrediction"),
};

const physics = {
  gravity: 0.82,
  jumpStrength: 17,
  maxFallSpeed: 22,
};

const WORLD_WIDTH = 2600;
const MAX_HEALTH = 4;
const storageKey = "mistfall-score-v1";
const saved = JSON.parse(localStorage.getItem(storageKey) || "{}");
const DEFAULT_TM_AUDIO_URL = "https://teachablemachine.withgoogle.com/models/bAWcVjBBs/";

const player = {
  x: 170,
  y: 0,
  vx: 0,
  vy: 0,
  width: 34,
  height: 64,
  speed: 0.85,
  maxSpeed: 6,
  friction: 0.78,
  facingLeft: false,
  moving: false,
  grounded: true,
};

let platforms = [];
let gems = [];
let enemies = [];
let hazards = [];
let checkpoints = [];
let gate = { x: 2520, y: 0 };
let cameraX = 0;
let score = 0;
let bestScore = Number(saved.bestScore || 0);
let hitCooldown = 0;
let health = MAX_HEALTH;
let attackTimer = 0;
let invincible = 0;
let activeCheckpoint = { x: 170, y: 0, name: "Moss" };
let gameWon = false;
let tmAudioUrl = String(saved.tmAudioUrl || DEFAULT_TM_AUDIO_URL);
let tmRecognizer = null;
let tmListening = false;
let tmLastActionAt = 0;
let voiceRunTimer = 0;
let voiceJumpQueued = false;
let voiceAttackQueued = false;
let mistBackImg;
let mistBackTreesImg;
let mistTreeImg;
let heroIdleFrames = [];
let heroRunFrames = [];
let heroJumpFrames = [];
let slimeFrames = [];
let gemsImage;

function preload() {
  mistBackImg = loadImage(assetPaths.mistBack);
  mistBackTreesImg = loadImage(assetPaths.mistBackTrees);
  mistTreeImg = loadImage(assetPaths.mistTree);
  heroIdleFrames = assetPaths.heroIdle.map((path, index) => ({ img: loadImage(path), ...heroBounds.idle[index] }));
  heroRunFrames = assetPaths.heroRun.map((path, index) => ({ img: loadImage(path), ...heroBounds.run[index] }));
  heroJumpFrames = assetPaths.heroJump.map((path, index) => ({ img: loadImage(path), ...heroBounds.jump[index] }));
  slimeFrames = assetPaths.slimes.map((path) => loadImage(path));
  gemsImage = loadImage(assetPaths.gems);
}

function setup() {
  new Canvas(windowWidth, windowHeight);

  const mount = document.querySelector("#gameMount");
  const canvas = document.querySelector("canvas");
  if (canvas && mount && canvas.parentElement !== mount) {
    mount.appendChild(canvas);
  }

  world.gravity.y = 30;
  buildPlatforms();
  buildGems();
  buildEnemies();
  buildHazards();
  buildCheckpoints();
  setStartCheckpoint();
  placePlayerOnGround();
  ui.areaName.textContent = "Moss Gate";
  ui.level.textContent = "1";
  updateScore();
  updateHealth();
  ui.restartBtn.addEventListener("click", restartGame);
  initTeachableMachineUI();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  buildPlatforms();
  buildGems();
  buildEnemies();
  buildHazards();
  buildCheckpoints();
  if (activeCheckpoint.name === "Moss") setStartCheckpoint();
  if (player.grounded) placePlayerOnGround();
}

function draw() {
  if (!gameWon) {
    updatePlayer();
    updateEnemies();
    handleAttackHits();
    collectGems();
    handleEnemyCollisions();
    handleHazardCollisions();
    handleCheckpointCollisions();
    handleGateCollision();
  }
  updateCamera();
  drawMistBackground();
  push();
  translate(-cameraX, 0);
  drawStartGround();
  drawPlatforms();
  drawHazards();
  drawCheckpoints();
  drawGate();
  drawGems();
  drawEnemies();
  drawPlayer();
  pop();
  drawWinOverlay();

  if (hitCooldown > 0) hitCooldown--;
  if (attackTimer > 0) attackTimer--;
  if (invincible > 0) invincible--;
}

function updatePlayer() {
  const voiceMove = voiceRunTimer > 0;
  const voiceJump = voiceJumpQueued;
  const voiceAttack = voiceAttackQueued;
  voiceJumpQueued = false;
  voiceAttackQueued = false;

  const left = kb.pressing("a") || kb.pressing("left") || (voiceMove && player.facingLeft);
  const right = kb.pressing("d") || kb.pressing("right") || (voiceMove && !player.facingLeft);
  const jump = kb.presses("w") || kb.presses("space") || kb.presses("up") || voiceJump;
  const attack = kb.presses("j") || kb.presses("k") || voiceAttack;
  const previousBottom = player.y + player.height / 2;

  player.moving = left || right;

  if (left) {
    player.vx -= player.speed;
    player.facingLeft = true;
  }

  if (right) {
    player.vx += player.speed;
    player.facingLeft = false;
  }

  if (!player.moving) {
    player.vx *= player.friction;
  }

  player.vx = constrain(player.vx, -player.maxSpeed, player.maxSpeed);
  if (abs(player.vx) < 0.05) player.vx = 0;

  player.x += player.vx;
  player.x = constrain(player.x, player.width / 2 + 20, WORLD_WIDTH - player.width / 2 - 20);

  if (jump && player.grounded) {
    player.vy = -physics.jumpStrength;
    player.grounded = false;
  }

  if (attack) {
    attackTimer = 16;
  }

  player.vy += physics.gravity;
  player.vy = min(player.vy, physics.maxFallSpeed);
  player.y += player.vy;
  player.grounded = false;

  resolvePlatformLandings(previousBottom);
  resolveGroundLanding();

  if (voiceRunTimer > 0) voiceRunTimer--;
}

function drawMistBackground() {
  background("#5f8880");
  noStroke();

  for (let y = 0; y < height; y += 4) {
    const amount = y / height;
    const sky = lerpColor(color("#9bbab4"), color("#10251d"), amount);
    fill(sky);
    rect(0, y, width, 4);
  }

  drawParallaxLayer(mistBackImg, height, 0.08, 255);
  drawParallaxLayer(mistBackTreesImg, height, 0.14, 105);
  drawParallaxLayer(mistTreeImg, height, 0.22, 145);

  fill(240, 255, 247, 32);
  for (let i = 0; i < 34; i++) {
    const x = (i * 173 + frameCount * 0.18 - cameraX * 0.18) % (width + 120) - 60;
    const y = 120 + (i * 67) % max(220, height - 240);
    circle(x, y, 2 + (i % 3));
  }
}

function drawParallaxLayer(img, drawHeight, speed, alpha) {
  if (!img) return;

  const drawWidth = img.width * (drawHeight / img.height);
  const offset = -((cameraX * speed) % drawWidth);

  tint(255, 255, 255, alpha);
  for (let x = offset - drawWidth; x < width + drawWidth; x += drawWidth) {
    image(img, x, 0, drawWidth, drawHeight);
  }
  noTint();
}

function drawStartGround() {
  const groundY = getGroundY();
  noStroke();
  fill("#19372f");
  rect(0, groundY, WORLD_WIDTH, height - groundY);
  fill("#7fc579");
  rect(0, groundY - 8, WORLD_WIDTH, 8);

  fill("#f3fff6");
  textAlign(CENTER, CENTER);
  textSize(28);
  text("Mistfall Gate", 420, height / 2 - 20);
  fill("#b8cdbc");
  textSize(16);
  text("Een stille ingang tussen mist en mos", 420, height / 2 + 18);
}

function buildPlatforms() {
  const groundY = getGroundY();
  platforms = [
    { x: 520, y: groundY - 105, w: 170, h: 22 },
    { x: 830, y: groundY - 195, w: 190, h: 22 },
    { x: 1130, y: groundY - 130, w: 180, h: 22 },
    { x: 1460, y: groundY - 230, w: 190, h: 22 },
    { x: 1810, y: groundY - 145, w: 220, h: 22 },
    { x: 2220, y: groundY - 205, w: 190, h: 22 },
  ];
}

function buildGems() {
  const groundY = getGroundY();
  gems = [
    { x: 520, y: groundY - 155, collected: false },
    { x: 830, y: groundY - 245, collected: false },
    { x: 1130, y: groundY - 180, collected: false },
    { x: 1460, y: groundY - 280, collected: false },
    { x: 1810, y: groundY - 195, collected: false },
    { x: 2220, y: groundY - 255, collected: false },
    { x: 2460, y: groundY - 70, collected: false },
  ];
}

function buildEnemies() {
  const groundY = getGroundY();
  enemies = [
    { x: 700, y: groundY - 24, left: 610, right: 790, speed: 1.4, dir: 1 },
    { x: 1280, y: groundY - 24, left: 1190, right: 1390, speed: 1.7, dir: -1 },
    { x: 2040, y: groundY - 24, left: 1900, right: 2160, speed: 1.5, dir: 1 },
  ];
}

function buildHazards() {
  const groundY = getGroundY();
  hazards = [
    { x: 980, y: groundY, w: 112 },
    { x: 1670, y: groundY, w: 140 },
    { x: 2350, y: groundY, w: 112 },
  ];
}

function buildCheckpoints() {
  const groundY = getGroundY();
  checkpoints = [
    { x: 1060, y: groundY - 50, name: "Moss Rise", active: activeCheckpoint.name === "Moss Rise" },
    { x: 1900, y: groundY - 50, name: "Old Roots", active: activeCheckpoint.name === "Old Roots" },
  ];
  gate = { x: WORLD_WIDTH - 110, y: groundY - 76 };
}

function setStartCheckpoint() {
  activeCheckpoint = {
    x: 170,
    y: getGroundY() - player.height / 2,
    name: "Moss",
  };
}

function placePlayerOnGround() {
  player.y = getGroundY() - player.height / 2;
  player.vy = 0;
  player.grounded = true;
}

function getGroundY() {
  return height - 130;
}

function resolvePlatformLandings(previousBottom) {
  const currentBottom = player.y + player.height / 2;

  for (const platform of platforms) {
    const platformTop = platform.y - platform.h / 2;
    const leftEdge = platform.x - platform.w / 2;
    const rightEdge = platform.x + platform.w / 2;
    const playerLeft = player.x - player.width / 2;
    const playerRight = player.x + player.width / 2;

    const overlapsX = playerRight > leftEdge + 6 && playerLeft < rightEdge - 6;
    const crossedTop = previousBottom <= platformTop && currentBottom >= platformTop;

    if (player.vy >= 0 && overlapsX && crossedTop) {
      player.y = platformTop - player.height / 2;
      player.vy = 0;
      player.grounded = true;
      return;
    }
  }
}

function resolveGroundLanding() {
  const floorY = getGroundY() - player.height / 2;
  if (player.y >= floorY) {
    player.y = floorY;
    player.vy = 0;
    player.grounded = true;
  }
}

function drawPlatforms() {
  for (const platform of platforms) {
    const left = platform.x - platform.w / 2;
    const top = platform.y - platform.h / 2;

    noStroke();
    fill("#1d3c33");
    rect(left, top + 4, platform.w, platform.h, 4);
    fill("#0d211a");
    rect(left, top + 15, platform.w, platform.h - 10, 4);
    fill("#7fc579");
    rect(left, top - 5, platform.w, 8, 4);
    fill("#b7e6a5");
    rect(left + 8, top - 9, platform.w - 16, 4, 3);
  }
}

function collectGems() {
  for (const gem of gems) {
    if (gem.collected) continue;

    const closeX = abs(player.x - gem.x) < 34;
    const closeY = abs(player.y - gem.y) < 46;
    if (closeX && closeY) {
      gem.collected = true;
      score += 10;
      updateScore();
    }
  }
}

function updateEnemies() {
  for (const enemy of enemies) {
    if (enemy.defeated) continue;

    enemy.x += enemy.speed * enemy.dir;

    if (enemy.x < enemy.left) {
      enemy.x = enemy.left;
      enemy.dir = 1;
    }

    if (enemy.x > enemy.right) {
      enemy.x = enemy.right;
      enemy.dir = -1;
    }
  }
}

function handleEnemyCollisions() {
  if (hitCooldown > 0 || invincible > 0) return;

  for (const enemy of enemies) {
    if (enemy.defeated) continue;

    const closeX = abs(player.x - enemy.x) < 34;
    const closeY = abs(player.y - enemy.y) < 50;
    if (closeX && closeY) {
      damagePlayer(enemy.x);
      return;
    }
  }
}

function handleHazardCollisions() {
  if (hitCooldown > 0 || invincible > 0) return;

  const playerBottom = player.y + player.height / 2;
  for (const hazard of hazards) {
    const closeX = abs(player.x - hazard.x) < hazard.w / 2 + player.width / 2;
    const closeY = playerBottom > hazard.y - 38 && playerBottom < hazard.y + 12;
    if (closeX && closeY) {
      damagePlayer(player.x, true);
      return;
    }
  }
}

function handleCheckpointCollisions() {
  for (const checkpoint of checkpoints) {
    const closeX = abs(player.x - checkpoint.x) < 36;
    const closeY = abs(player.y - checkpoint.y) < 70;
    if (!checkpoint.active && closeX && closeY) {
      activateCheckpoint(checkpoint);
      return;
    }
  }
}

function handleGateCollision() {
  const closeX = abs(player.x - gate.x) < 55;
  const closeY = abs(player.y - gate.y) < 90;
  if (!closeX || !closeY) return;

  gameWon = true;
  score += 100;
  ui.areaName.textContent = "Gate";
  updateScore();
  saveBestScore();
}

function activateCheckpoint(checkpoint) {
  for (const other of checkpoints) {
    other.active = false;
  }

  checkpoint.active = true;
  activeCheckpoint = {
    x: checkpoint.x,
    y: getGroundY() - player.height / 2,
    name: checkpoint.name,
  };
  health = MAX_HEALTH;
  ui.areaName.textContent = checkpoint.name;
  updateHealth();
}

function handleAttackHits() {
  if (attackTimer <= 0) return;

  const direction = player.facingLeft ? -1 : 1;
  let defeatedAny = false;

  for (const enemy of enemies) {
    if (enemy.defeated) continue;

    const inFront = direction > 0 ? enemy.x > player.x - 8 : enemy.x < player.x + 8;
    const closeX = abs(enemy.x - player.x) < 86;
    const closeY = abs(enemy.y - player.y) < 72;

    if (inFront && closeX && closeY) {
      enemy.defeated = true;
      score += 25;
      defeatedAny = true;
    }
  }

  if (defeatedAny) {
    updateScore();
  }
}

function damagePlayer(sourceX, forceRespawn = false) {
  hitCooldown = 60;
  invincible = 90;
  health -= 1;
  score = max(0, score - 5);
  updateScore();
  updateHealth();

  player.vx = player.x < sourceX ? -8 : 8;
  player.vy = -8;
  player.grounded = false;

  if (forceRespawn) {
    respawnPlayer();
  }

  if (health <= 0) {
    health = MAX_HEALTH;
    updateHealth();
    respawnPlayer();
  }
}

function respawnPlayer() {
  player.x = activeCheckpoint.x;
  player.y = activeCheckpoint.y;
  player.vx = 0;
  player.vy = 0;
  player.grounded = true;
}

function updateScore() {
  bestScore = max(bestScore, score);
  ui.score.textContent = score;
  ui.bestScore.textContent = bestScore;
  saveBestScore();
}

function updateHealth() {
  ui.healthFill.style.width = `${(health / MAX_HEALTH) * 100}%`;
}

function saveBestScore() {
  localStorage.setItem(storageKey, JSON.stringify({ bestScore, tmAudioUrl }));
}

function initTeachableMachineUI() {
  if (!ui.tmUrl || !ui.tmStartBtn) return;
  ui.tmUrl.value = tmAudioUrl;
  ui.tmStartBtn.addEventListener("click", toggleTeachableMachineAudio);
}

async function toggleTeachableMachineAudio() {
  if (tmListening) {
    stopTeachableMachineAudio();
    return;
  }

  await startTeachableMachineAudio();
}

async function startTeachableMachineAudio() {
  const url = normalizeModelUrl(ui.tmUrl?.value || tmAudioUrl);
  if (!url) {
    setTmStatus("Plak eerst je Audio Model URL", "roep = loop + spring | klap = attack | stil = rust");
    return;
  }

  if (typeof speechCommands === "undefined") {
    setTmStatus("Audio library mist", "Herlaad de pagina en probeer opnieuw.");
    return;
  }

  try {
    ui.tmStartBtn.disabled = true;
    setTmStatus("Model laden...", "Geef microfoon-toegang wanneer de browser dat vraagt.");
    tmRecognizer = await createAudioRecognizer(url);
    const labels = tmRecognizer.wordLabels();
    tmRecognizer.listen((result) => handleAudioPrediction(labels, result.scores), {
      includeSpectrogram: true,
      probabilityThreshold: 0.65,
      invokeCallbackOnNoiseAndUnknown: true,
      overlapFactor: 0.5,
    });

    tmListening = true;
    tmAudioUrl = url;
    saveBestScore();
    ui.tmStartBtn.textContent = "Stop audio";
    setTmStatus("Audio actief", "Luister naar: roep, klap, stil");
  } catch (error) {
    setTmStatus("Audio start mislukt", "Check of je Teachable Machine Audio URL klopt.");
  } finally {
    ui.tmStartBtn.disabled = false;
  }
}

function stopTeachableMachineAudio() {
  try {
    if (tmRecognizer?.isListening?.()) tmRecognizer.stopListening();
  } catch {}

  tmListening = false;
  ui.tmStartBtn.textContent = "Start audio";
  setTmStatus("Audio pauze", "Keyboard blijft werken.");
}

async function createAudioRecognizer(url) {
  const recognizer = speechCommands.create("BROWSER_FFT", undefined, url + "model.json", url + "metadata.json");
  await recognizer.ensureModelLoaded();
  return recognizer;
}

function handleAudioPrediction(labels, scores) {
  let top = { label: "", score: 0 };
  labels.forEach((label, index) => {
    const score = scores[index] || 0;
    if (score > top.score) top = { label, score };
  });

  const className = normalizeClassName(top.label);
  setTmStatus("Audio actief", `${top.label}: ${Math.round(top.score * 100)}%`);
  if (top.score < 0.82 || isRestClass(className)) return;

  const now = Date.now();
  if (now - tmLastActionAt < 650) return;
  tmLastActionAt = now;

  if (className === "roep") {
    voiceRunTimer = 34;
    voiceJumpQueued = true;
    ui.toast.textContent = "roep: spring vooruit";
    return;
  }

  if (className === "klap") {
    voiceAttackQueued = true;
    ui.toast.textContent = "klap: attack";
  }
}

function normalizeClassName(label) {
  return String(label || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function isRestClass(label) {
  return label === "stil" || label === "rust" || label.includes("background") || label.includes("noise");
}

function normalizeModelUrl(raw) {
  const value = String(raw || "").trim();
  if (!value) return "";
  return value.endsWith("/") ? value : `${value}/`;
}

function setTmStatus(status, prediction) {
  if (ui.tmStatus) ui.tmStatus.textContent = status;
  if (ui.tmPrediction) ui.tmPrediction.textContent = prediction;
}

function restartGame() {
  score = 0;
  health = MAX_HEALTH;
  hitCooldown = 0;
  attackTimer = 0;
  invincible = 0;
  voiceRunTimer = 0;
  voiceJumpQueued = false;
  voiceAttackQueued = false;
  gameWon = false;
  cameraX = 0;
  setStartCheckpoint();
  buildGems();
  buildEnemies();
  buildCheckpoints();
  respawnPlayer();
  ui.areaName.textContent = "Moss Gate";
  ui.level.textContent = "1";
  ui.toast.textContent = "Keyboard of audio: roep = spring vooruit, klap = attack, stil = rust";
  updateScore();
  updateHealth();
}

function updateCamera() {
  const targetX = constrain(player.x - width * 0.36, 0, max(0, WORLD_WIDTH - width));
  cameraX = lerp(cameraX, targetX, 0.12);
}

function drawGems() {
  for (const gem of gems) {
    if (gem.collected) continue;

    const bob = sin(frameCount * 0.08 + gem.x * 0.01) * 5;
    const frame = floor(frameCount / 8) % 6;

    push();
    translate(gem.x, gem.y + bob);
    if (gemsImage) {
      imageMode(CENTER);
      image(gemsImage, 0, 0, 34, 34, 610 + frame * 28, 24, 22, 22);
      imageMode(CORNER);
    } else {
      rotate(QUARTER_PI);
      noStroke();
      fill("#b49cff");
      rectMode(CENTER);
      rect(0, 0, 24, 24, 4);
      fill("#fff3b0");
      rect(-3, -3, 9, 9, 2);
      rectMode(CORNER);
    }
    pop();
  }
}

function drawEnemies() {
  for (const enemy of enemies) {
    if (enemy.defeated) continue;

    const squash = sin(frameCount * 0.12 + enemy.x * 0.02) * 3;

    noStroke();
    fill(0, 0, 0, 80);
    ellipse(enemy.x, enemy.y + 24, 58, 12);

    push();
    translate(enemy.x, enemy.y + squash);
    scale(enemy.dir < 0 ? -1 : 1, 1);
    const frame = slimeFrames[floor(frameCount / 4) % slimeFrames.length];
    if (frame) {
      imageMode(CENTER);
      image(frame, 0, 0, 72, 54);
      imageMode(CORNER);
    } else {
      fill("#77d96b");
      ellipse(0, 8, 54, 38);
      fill("#9cff8f");
      ellipse(-8, 0, 32, 24);
      fill("#15311f");
      ellipse(11, 3, 5, 7);
    }
    pop();
  }
}

function drawHazards() {
  for (const hazard of hazards) {
    const left = hazard.x - hazard.w / 2;

    noStroke();
    fill("#09130f");
    rect(left - 10, hazard.y, hazard.w + 20, 24);

    for (let x = left; x < left + hazard.w; x += 28) {
      fill("#eadfb7");
      triangle(x, hazard.y, x + 14, hazard.y - 38, x + 28, hazard.y);
      fill("#fff7ce");
      triangle(x + 9, hazard.y - 17, x + 14, hazard.y - 38, x + 19, hazard.y - 17);
    }
  }
}

function drawCheckpoints() {
  for (const checkpoint of checkpoints) {
    stroke("#0d211a");
    strokeWeight(5);
    line(checkpoint.x, checkpoint.y + 36, checkpoint.x, checkpoint.y - 36);
    noStroke();

    fill(checkpoint.active ? "#9be69d" : "#ffd866");
    rect(checkpoint.x, checkpoint.y - 36, 42, 28, 5);
    fill("#f3fff6");
    rect(checkpoint.x + 7, checkpoint.y - 29, 18, 14, 3);
  }
  strokeWeight(1);
}

function drawGate() {
  noStroke();
  fill(110, 180, 145, 54);
  ellipse(gate.x, gate.y, 118, 170);
  fill("#203b33");
  rect(gate.x - 48, gate.y - 72, 14, 144, 4);
  rect(gate.x + 34, gate.y - 72, 14, 144, 4);
  rect(gate.x - 48, gate.y - 82, 96, 18, 4);
  fill("#9dd5b5");
  rect(gate.x - 30, gate.y - 54, 60, 108, 8);
  fill("#d8fff0");
  rect(gate.x - 18, gate.y - 36, 36, 72, 6);
  fill(180, 255, 210, 28 + sin(frameCount * 0.06) * 14);
  ellipse(gate.x, gate.y, 78, 124);
}

function drawWinOverlay() {
  if (!gameWon) return;

  noStroke();
  fill(4, 16, 12, 178);
  rect(0, 0, width, height);
  textAlign(CENTER, CENTER);
  fill("#f3fff6");
  textSize(46);
  text("Moss Gate geopend", width / 2, height / 2 - 24);
  fill("#b8cdbc");
  textSize(18);
  text("Score " + score + "  |  Beste " + bestScore, width / 2, height / 2 + 22);
  fill("#9be69d");
  text("Klik Restart om opnieuw te spelen", width / 2, height / 2 + 58);
}

function drawPlayer() {
  const frames = !player.grounded ? heroJumpFrames : player.moving ? heroRunFrames : heroIdleFrames;
  const frameSpeed = !player.grounded ? 7 : player.moving ? 5 : 10;
  const frame = frames[floor(frameCount / frameSpeed) % frames.length];
  const bob = player.grounded && !player.moving ? sin(frameCount * 0.08) * 2 : 0;
  const feetY = player.y + player.height / 2;

  noStroke();
  fill(0, 0, 0, 80);
  ellipse(player.x, feetY + 5, 48, 12);

  push();
  translate(player.x, player.y + bob);
  scale(player.facingLeft ? -1 : 1, 1);

  if (invincible > 0 && frameCount % 8 < 4) tint(255, 255, 255, 145);
  drawHeroFrame(frame);
  noTint();

  if (attackTimer > 0) {
    fill(255, 232, 130, 105);
    arc(34, -2, 78, 48, -0.75, 0.75);
    fill("#fff3b0");
    rect(24, -6, 48, 6, 3);
  }

  rectMode(CORNER);
  pop();
}

function drawHeroFrame(frame) {
  if (!frame?.img) return;

  const padX = 8;
  const padTop = 7;
  const padBottom = 2;
  const sx = max(0, frame.x - padX);
  const sy = max(0, frame.y - padTop);
  const sw = min(frame.img.width - sx, frame.w + padX * 2);
  const sh = min(frame.img.height - sy, frame.h + padTop + padBottom);
  const targetH = 92;
  const targetW = sw * (targetH / sh);
  const footY = 34;

  imageMode(CENTER);
  image(frame.img, 0, footY - targetH / 2, targetW, targetH, sx, sy, sw, sh);
  imageMode(CORNER);
}
