const legacyBase = "assets/Legacy Collection/Legacy Collection/Assets";

const assets = {
  mistBack: `${legacyBase}/Gothicvania/Environments/mist-forest-background/layers/mist-forest-background-back.png`,
  mistBackTrees: `${legacyBase}/Gothicvania/Environments/mist-forest-background/layers/mist-forest-background-back-trees.png`,
  mistTree: `${legacyBase}/Gothicvania/Environments/mist-forest-background/layers/mist-forest-background-tree.png`,
  mistRocks: `${legacyBase}/Gothicvania/Environments/mist-forest-background/layers/mist-forest-background-rocks.png`,
  heroIdle: [1, 2, 3, 4].map(
    (frame) => `${legacyBase}/Gothicvania/Characters/Bridge Heroine/Heroine base/Sprites/idle/player-idle-${frame}.png`,
  ),
  heroRun: [1, 2, 3, 4, 5, 6, 7].map(
    (frame) => `${legacyBase}/Gothicvania/Characters/Bridge Heroine/Heroine base/Sprites/run/player-run-${frame}.png`,
  ),
  heroJump: [1, 2, 3, 4].map(
    (frame) => `${legacyBase}/Gothicvania/Characters/Bridge Heroine/Heroine base/Sprites/jump/player-jump-${frame}.png`,
  ),
  houndRun: [1, 2, 3, 4, 5].map(
    (frame) => `${legacyBase}/Gothicvania/Characters/Hell-Hound-Files/Sprites/Run/frame${frame}.png`,
  ),
  toadIdle: [1, 2, 3, 4].map(
    (frame) => `${legacyBase}/Gothicvania/Characters/mutant-toad/Sprites/idle/mutant-toad-idle${frame}.png`,
  ),
  gems: `${legacyBase}/Misc/gems/spritesheets/gems-spritesheet.png`,
};

const ui = {
  areaName: document.querySelector("#areaName"),
  score: document.querySelector("#score"),
  bestScore: document.querySelector("#bestScore"),
  healthFill: document.querySelector("#healthFill"),
  restartBtn: document.querySelector("#restartBtn"),
  toast: document.querySelector("#toast"),
};

const storageKey = "mistfall-platformer";
const saved = JSON.parse(localStorage.getItem(storageKey) || "{}");

let mistBackImage;
let mistBackTreesImage;
let mistTreeImage;
let mistRocksImage;
let heroIdleFrames = [];
let heroRunFrames = [];
let heroJumpFrames = [];
let houndRunFrames = [];
let toadIdleFrames = [];
let gemsImage;

let player;
let platforms;
let gems;
let enemies;
let hazards;
let checkpoints;
let gates;

let score = 0;
let bestScore = Number(saved.bestScore || 0);
let health = 6;
let maxHealth = 6;
let invincible = 0;
let attackTimer = 0;
let dashCooldown = 0;
let checkpointX = 170;
let checkpointY = 560;
let gameWon = false;

const worldWidth = 4400;
const worldHeight = 820;
const groundColor = "#122e24";
const platformTop = "#79b875";

function preload() {
  mistBackImage = loadImage(assets.mistBack);
  mistBackTreesImage = loadImage(assets.mistBackTrees);
  mistTreeImage = loadImage(assets.mistTree);
  mistRocksImage = loadImage(assets.mistRocks);
  heroIdleFrames = assets.heroIdle.map((path) => loadImage(path));
  heroRunFrames = assets.heroRun.map((path) => loadImage(path));
  heroJumpFrames = assets.heroJump.map((path) => loadImage(path));
  houndRunFrames = assets.houndRun.map((path) => loadImage(path));
  toadIdleFrames = assets.toadIdle.map((path) => loadImage(path));
  gemsImage = loadImage(assets.gems);
}

function setup() {
  new Canvas(windowWidth, windowHeight);
  const mount = document.querySelector("#gameMount");
  const gameCanvas = document.querySelector("canvas");
  if (gameCanvas && gameCanvas.parentElement !== mount) mount.appendChild(gameCanvas);

  world.gravity.y = 38;
  setupGroups();
  buildLevel();
  buildPlayer();
  updateHud();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function setupGroups() {
  platforms = new Group();
  platforms.collider = "static";
  platforms.visible = false;

  gems = new Group();
  gems.collider = "static";
  gems.visible = false;

  enemies = new Group();
  enemies.collider = "kinematic";
  enemies.visible = false;

  hazards = new Group();
  hazards.collider = "static";
  hazards.visible = false;

  checkpoints = new Group();
  checkpoints.collider = "static";
  checkpoints.visible = false;

  gates = new Group();
  gates.collider = "static";
  gates.visible = false;
}

function buildPlayer() {
  player = new Sprite(170, 550, 38, 72);
  player.rotationLock = true;
  player.friction = 0;
  player.bounciness = 0;
  player.visible = false;
}

function buildLevel() {
  platforms.removeAll();
  gems.removeAll();
  enemies.removeAll();
  hazards.removeAll();
  checkpoints.removeAll();
  gates.removeAll();

  [
    [230, 662, 620, 84, "ground"],
    [880, 638, 440, 84, "ground"],
    [1325, 570, 300, 42, "ledge"],
    [1690, 500, 290, 42, "ledge"],
    [2090, 638, 500, 84, "ground"],
    [2540, 560, 360, 42, "ledge"],
    [2940, 485, 300, 42, "ledge"],
    [3410, 646, 580, 80, "ground"],
    [3940, 590, 520, 78, "ground"],
  ].forEach(([x, y, w, h, kind]) => addPlatform(x, y, w, h, kind));

  [
    [520, 560],
    [850, 565],
    [1160, 500],
    [1345, 500],
    [1700, 430],
    [2060, 560],
    [2310, 560],
    [2550, 490],
    [2935, 415],
    [3220, 575],
    [3600, 570],
    [4050, 505],
  ].forEach(([x, y]) => addGem(x, y));

  [
    [775, 585, "hound", 720, 1040],
    [1210, 520, "toad", 1130, 1460],
    [2130, 585, "hound", 1880, 2320],
    [2740, 515, "toad", 2370, 2690],
    [3510, 594, "hound", 3180, 3635],
  ].forEach(([x, y, kind, leftBound, rightBound]) => addEnemy(x, y, kind, leftBound, rightBound));

  [
    [1110, 694, 150],
    [1900, 694, 160],
    [3150, 704, 170],
  ].forEach(([x, y, w]) => addSpikePit(x, y, w));

  addCheckpoint(2060, 552, "Moonlit Ruins");
  addCheckpoint(3390, 562, "Old Gate");
  addGate(4180, 500);
}

function addPlatform(x, y, w, h, kind) {
  const platform = new platforms.Sprite(x, y, w, h);
  platform.kind = kind;
  platform.w = w;
  platform.h = h;
}

function addGem(x, y) {
  const gem = new gems.Sprite(x, y, 32, 34);
  gem.phase = random(1000);
}

function addEnemy(x, y, kind, leftBound, rightBound) {
  const enemy = new enemies.Sprite(x, y, kind === "toad" ? 62 : 70, kind === "toad" ? 42 : 38);
  enemy.kind = kind;
  enemy.leftBound = leftBound;
  enemy.rightBound = rightBound;
  enemy.dir = random() > 0.5 ? 1 : -1;
  enemy.speedValue = kind === "toad" ? 1.15 : 2.1;
}

function addSpikePit(x, y, w) {
  const pit = new hazards.Sprite(x, y, w, 38);
  pit.w = w;
  pit.h = 38;
}

function addCheckpoint(x, y, name) {
  const point = new checkpoints.Sprite(x, y, 40, 98);
  point.name = name;
}

function addGate(x, y) {
  const gate = new gates.Sprite(x, y, 82, 150);
  gate.name = "Mist Gate";
}

function draw() {
  drawingContext.imageSmoothingEnabled = false;

  handleInput();
  updateEnemies();
  handleCollisions();
  handleCamera();

  drawScene();
  updateHud();
}

function handleInput() {
  if (gameWon) return;

  const left = kb.pressing("left") || kb.pressing("a");
  const right = kb.pressing("right") || kb.pressing("d");
  const jump = kb.presses("up") || kb.presses("w") || kb.presses("space");
  const attack = kb.presses("j") || kb.presses("k");
  const dash = kb.presses("shift");

  if (left) {
    player.vel.x = -6.2;
    player.mirror.x = true;
  } else if (right) {
    player.vel.x = 6.2;
    player.mirror.x = false;
  } else {
    player.vel.x *= 0.76;
  }

  if (jump && isGrounded()) {
    player.vel.y = -16.8;
  }

  if (attack) attackTimer = 18;

  if (dash && dashCooldown <= 0) {
    const direction = player.mirror.x ? -1 : 1;
    player.vel.x = direction * 15;
    dashCooldown = 50;
  }

  if (attackTimer > 0) attackTimer -= 1;
  if (dashCooldown > 0) dashCooldown -= 1;

  player.x = constrain(player.x, 55, worldWidth - 80);
}

function isGrounded() {
  return player.colliding(platforms);
}

function updateEnemies() {
  enemies.forEach((enemy) => {
    enemy.vel.x = enemy.dir * enemy.speedValue;
    if (enemy.x < enemy.leftBound || enemy.x > enemy.rightBound) {
      enemy.dir *= -1;
      enemy.x = constrain(enemy.x, enemy.leftBound, enemy.rightBound);
    }
  });
}

function handleCollisions() {
  if (player.y > worldHeight + 120) damagePlayer(1, true);

  player.overlaps(gems, (_player, gem) => {
    score += 20;
    bestScore = max(bestScore, score);
    gem.remove();
    saveBestScore();
  });

  player.overlaps(checkpoints, (_player, point) => {
    checkpointX = point.x;
    checkpointY = point.y - 90;
    ui.areaName.textContent = point.name || "Checkpoint";
  });

  player.overlaps(gates, () => {
    gameWon = true;
    score += 150;
    bestScore = max(bestScore, score);
    saveBestScore();
  });

  player.overlaps(hazards, () => damagePlayer(1, true));

  player.overlaps(enemies, (_player, enemy) => {
    if (invincible > 0) return;

    const stomp = player.vel.y > 1 && player.y < enemy.y - 22;
    if (stomp || canHit(enemy)) {
      defeatEnemy(enemy);
      return;
    }

    damagePlayer(1, false, enemy.x);
  });

  if (attackTimer > 0) {
    enemies.forEach((enemy) => {
      if (canHit(enemy)) defeatEnemy(enemy);
    });
  }

  if (invincible > 0) invincible -= 1;
}

function canHit(enemy) {
  if (attackTimer <= 0) return false;
  const facing = player.mirror.x ? -1 : 1;
  const inFront = facing > 0 ? enemy.x > player.x - 12 : enemy.x < player.x + 12;
  return inFront && abs(enemy.x - player.x) < 84 && abs(enemy.y - player.y) < 68;
}

function defeatEnemy(enemy) {
  player.vel.y = min(player.vel.y, -8.5);
  score += enemy.kind === "toad" ? 45 : 35;
  bestScore = max(bestScore, score);
  enemy.remove();
  saveBestScore();
}

function damagePlayer(amount, respawn, sourceX = player.x) {
  if (invincible > 0 && !respawn) return;

  health -= amount;
  invincible = 90;
  player.vel.y = -9;
  player.vel.x = player.x < sourceX ? -9 : 9;

  if (health <= 0) {
    health = maxHealth;
    score = max(0, score - 70);
    respawnAtCheckpoint();
    return;
  }

  if (respawn) respawnAtCheckpoint();
}

function respawnAtCheckpoint() {
  player.x = checkpointX;
  player.y = checkpointY;
  player.vel.x = 0;
  player.vel.y = 0;
  invincible = 110;
}

function handleCamera() {
  const targetZoom = constrain(height / 790, 1, 1.32);
  camera.zoom = lerp(camera.zoom || targetZoom, targetZoom, 0.08);

  const viewW = width / camera.zoom;
  const targetX = constrain(player.x + 260, viewW / 2, worldWidth - viewW / 2);
  camera.x = lerp(camera.x || targetX, targetX, 0.12);

  const targetY = constrain(player.y - 104, 420, 492);
  camera.y = lerp(camera.y || targetY, targetY, 0.12);
}

function drawScene() {
  camera.off();
  drawBackdrop();
  drawParallaxLayer(mistBackImage, 0, height, 0.08, 255);
  drawParallaxLayer(mistBackTreesImage, 0, height, 0.13, 95);
  drawParallaxLayer(mistTreeImage, 0, height, 0.21, 145);
  drawAtmosphere();

  camera.on();
  drawWorldDecor();
  drawPlatforms();
  drawHazards();
  drawCheckpoints();
  drawGate();
  drawGems();
  drawEnemies();
  drawPlayer();
  camera.off();

  drawScreenEffects();
}

function drawBackdrop() {
  const sky = drawingContext.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, "#b7d0cf");
  sky.addColorStop(0.48, "#5d8780");
  sky.addColorStop(1, "#10251e");
  drawingContext.fillStyle = sky;
  drawingContext.fillRect(0, 0, width, height);
}

function drawParallaxLayer(img, y, drawHeight, speed, alphaValue) {
  if (!img) return;

  const drawWidth = img.width * (drawHeight / img.height);
  const offset = -((camera.x * speed) % drawWidth);

  tint(255, alphaValue);
  for (let x = offset - drawWidth; x < width + drawWidth; x += drawWidth) {
    image(img, x, y, drawWidth, drawHeight);
  }
  noTint();
}

function drawAtmosphere() {
  noStroke();
  const fog = drawingContext.createLinearGradient(0, height * 0.26, 0, height * 0.72);
  fog.addColorStop(0, "rgba(229,244,238,0)");
  fog.addColorStop(0.45, "rgba(229,244,238,0.18)");
  fog.addColorStop(1, "rgba(229,244,238,0)");
  drawingContext.fillStyle = fog;
  drawingContext.fillRect(0, height * 0.26, width, height * 0.46);

  for (let i = 0; i < 46; i += 1) {
    const x = (i * 173 - frameCount * 0.18) % (width + 90);
    const y = 120 + ((i * 71) % max(250, height - 260));
    fill(236, 255, 246, 24);
    circle(x, y, 2 + (i % 3));
  }
}

function drawWorldDecor() {
  noStroke();
  if (mistRocksImage) {
    tint(255, 95);
    for (let x = -80; x < worldWidth + 280; x += 680) {
      image(mistRocksImage, x, 628, 360, 360);
    }
    noTint();
  }
}

function drawPlatforms() {
  platforms.forEach((platform) => {
    const left = platform.x - platform.w / 2;
    const top = platform.y - platform.h / 2;
    const right = left + platform.w;
    const bottom = top + platform.h;

    noStroke();
    fill(platform.kind === "ground" ? "#1c3a32" : "#234b3f");
    rect(left, top + 8, platform.w, platform.h - 8);
    fill(platform.kind === "ground" ? "#0f231d" : "#173329");
    rect(left, top + 30, platform.w, platform.h - 30);
    fill("#0a1713");
    rect(left, bottom - 10, platform.w, 10);
    fill("#314e45");
    rect(left, top + 2, platform.w, 18);
    fill("#7cbf7a");
    rect(left, top - 6, platform.w, 8);
    fill("#a8d990");
    rect(left + 5, top - 10, platform.w - 10, 4);

    drawStoneTexture(left, top, platform.w, platform.h);
    drawGrassPixels(left, right, top);
  });
}

function drawStoneTexture(left, top, w, h) {
  for (let x = left + 18; x < left + w - 12; x += 46) {
    const y = top + 24 + ((x / 46) % 3) * 13;
    fill(67, 96, 87, 82);
    rect(x, y, 28, 5);
  }

  for (let x = left + 8; x < left + w; x += 62) {
    fill(8, 19, 16, 75);
    rect(x, top + h - 24, 38, 5);
  }
}

function drawGrassPixels(left, right, top) {
  for (let x = left + 10; x < right - 10; x += 22) {
    const bump = sin((x + frameCount) * 0.04) * 1.5;
    fill("#a1d78a");
    rect(x, top - 11 + bump, 15, 4);
    fill("#5f9f5e");
    rect(x + 6, top - 16 + bump, 6, 6);
  }
}

function drawHazards() {
  hazards.forEach((pit) => {
    const left = pit.x - pit.w / 2;
    const bottom = pit.y + pit.h / 2;
    fill("#071611");
    rect(left - 18, pit.y - 6, pit.w + 36, 42);

    for (let x = left; x < left + pit.w; x += 28) {
      fill("#eadfb7");
      triangle(x, bottom, x + 14, pit.y - 24, x + 28, bottom);
      fill("#fff7ce");
      triangle(x + 9, pit.y - 5, x + 14, pit.y - 24, x + 19, pit.y - 5);
    }
  });
}

function drawCheckpoints() {
  checkpoints.forEach((point) => {
    stroke("#10140f");
    strokeWeight(7);
    line(point.x, point.y + 45, point.x, point.y - 36);
    strokeWeight(5);
    line(point.x, point.y - 28, point.x + 34, point.y - 18);
    noStroke();
    fill("#ffd86b");
    rect(point.x + 21, point.y - 35, 28, 30, 5);
    fill("#fff3b0");
    rect(point.x + 27, point.y - 28, 13, 18, 2);
    fill(255, 216, 107, 48);
    circle(point.x + 35, point.y - 20, 70);
  });
  strokeWeight(1);
}

function drawGate() {
  gates.forEach((gate) => {
    const x = gate.x;
    const y = gate.y;
    noStroke();
    fill(111, 170, 142, 45);
    ellipse(x, y + 8, 140, 184);
    fill("#203b33");
    rect(x - 48, y - 66, 14, 132);
    rect(x + 34, y - 66, 14, 132);
    rect(x - 48, y - 76, 96, 18);
    fill("#9dd5b5");
    rect(x - 32, y - 52, 64, 104, 8);
    fill("#d8fff0");
    rect(x - 20, y - 34, 40, 70, 6);
  });
}

function drawGems() {
  gems.forEach((gem) => {
    const bob = sin((frameCount + gem.phase) * 0.06) * 5;
    const frame = floor(frameCount / 8) % 6;
    const sx = 610 + frame * 28;

    push();
    translate(gem.x, gem.y + bob);
    rotate(sin((frameCount + gem.phase) * 0.04) * 0.12);
    fill(255, 218, 102, 50);
    circle(0, 0, 58);
    if (gemsImage) {
      imageMode(CENTER);
      image(gemsImage, 0, 0, 40, 40, sx, 24, 22, 22);
      imageMode(CORNER);
    } else {
      fill("#ffd86b");
      rectMode(CENTER);
      rect(0, 0, 28, 28, 4);
      rectMode(CORNER);
    }
    pop();
  });
}

function drawEnemies() {
  imageMode(CENTER);
  enemies.forEach((enemy) => {
    const shadowW = enemy.kind === "toad" ? 82 : 100;
    noStroke();
    fill(0, 0, 0, 80);
    ellipse(enemy.x, enemy.y + 24, shadowW, 18);

    push();
    translate(enemy.x, enemy.y);
    scale(enemy.dir > 0 ? -1 : 1, 1);

    if (enemy.kind === "toad") {
      const frame = toadIdleFrames[floor(frameCount / 12) % toadIdleFrames.length];
      if (frame) image(frame, 0, -4, 110, 88, 8, 18, 64, 46);
    } else {
      const frame = houndRunFrames[floor(frameCount / 6) % houndRunFrames.length];
      if (frame) image(frame, 0, -2, 124, 82, 5, 10, 58, 38);
    }

    pop();
  });
  imageMode(CORNER);
}

function drawPlayer() {
  const grounded = isGrounded();
  const moving = abs(player.vel.x) > 0.9;
  const frames = !grounded ? heroJumpFrames : moving ? heroRunFrames : heroIdleFrames;
  const speed = !grounded ? 7 : moving ? 5 : 10;
  const frame = frames[floor(frameCount / speed) % frames.length];

  imageMode(CENTER);
  push();
  translate(player.x, player.y - 3);
  scale(player.mirror.x ? -1 : 1, 1);

  noStroke();
  fill(0, 0, 0, 90);
  ellipse(0, 37, 52, 15);

  if (invincible > 0 && frameCount % 8 < 4) tint(255, 140);
  if (frame) image(frame, 0, -2, 112, 112, 44, 12, 52, 52);
  noTint();

  if (attackTimer > 0) {
    fill(205, 248, 255, 90);
    arc(36, -8, 82, 56, -0.75, 0.75);
    fill("#e8fff7");
    rect(26, -12, 54, 7, 3);
  }

  pop();
  imageMode(CORNER);
}

function drawScreenEffects() {
  noStroke();
  const vignette = drawingContext.createRadialGradient(width / 2, height / 2, width * 0.18, width / 2, height / 2, width * 0.72);
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, "rgba(1,10,7,0.38)");
  drawingContext.fillStyle = vignette;
  drawingContext.fillRect(0, 0, width, height);

  if (gameWon) {
    fill(4, 16, 12, 180);
    rect(0, 0, width, height);
    fill("#f4fff5");
    textAlign(CENTER, CENTER);
    textSize(54);
    text("Mist Gate Cleared", width / 2, height / 2 - 18);
    textSize(22);
    text("Klik Restart om opnieuw te spelen", width / 2, height / 2 + 42);
  }
}

function updateHud() {
  bestScore = max(bestScore, score);
  ui.score.textContent = score;
  ui.bestScore.textContent = bestScore;
  ui.healthFill.style.width = `${(health / maxHealth) * 100}%`;
}

function saveBestScore() {
  localStorage.setItem(storageKey, JSON.stringify({ bestScore }));
}

function restartGame() {
  score = 0;
  health = maxHealth;
  checkpointX = 170;
  checkpointY = 560;
  gameWon = false;
  ui.areaName.textContent = "Moss Gate";
  buildLevel();
  respawnAtCheckpoint();
  updateHud();
}

ui.restartBtn.addEventListener("click", restartGame);
