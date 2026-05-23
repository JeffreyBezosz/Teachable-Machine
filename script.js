// ─── asset paths ──────────────────────────────────────────────────────────────
const legacyBase = "assets/Legacy Collection/Legacy Collection/Assets";
const assets = {
  mistBack:      `${legacyBase}/Gothicvania/Environments/mist-forest-background/layers/mist-forest-background-back.png`,
  mistBackTrees: `${legacyBase}/Gothicvania/Environments/mist-forest-background/layers/mist-forest-background-back-trees.png`,
  mistTree:      `${legacyBase}/Gothicvania/Environments/mist-forest-background/layers/mist-forest-background-tree.png`,
  mistRocks:     `${legacyBase}/Gothicvania/Environments/mist-forest-background/layers/mist-forest-background-rocks.png`,
  heroIdle: [1,2,3,4].map(n=>`${legacyBase}/Gothicvania/Characters/Bridge Heroine/Heroine base/Sprites/idle/player-idle-${n}.png`),
  heroRun:  [1,2,3,4,5,6,7].map(n=>`${legacyBase}/Gothicvania/Characters/Bridge Heroine/Heroine base/Sprites/run/player-run-${n}.png`),
  heroJump: [1,2,3,4].map(n=>`${legacyBase}/Gothicvania/Characters/Bridge Heroine/Heroine base/Sprites/jump/player-jump-${n}.png`),
  houndRun: [1,2,3,4,5].map(n=>`${legacyBase}/Gothicvania/Characters/Hell-Hound-Files/Sprites/Run/frame${n}.png`),
  toadIdle: [1,2,3,4].map(n=>`${legacyBase}/Gothicvania/Characters/mutant-toad/Sprites/idle/mutant-toad-idle${n}.png`),
  gems:      `${legacyBase}/Misc/gems/spritesheets/gems-spritesheet.png`,
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

// ─── UI refs ──────────────────────────────────────────────────────────────────
const ui = {
  areaName:   document.querySelector("#areaName"),
  score:      document.querySelector("#score"),
  bestScore:  document.querySelector("#bestScore"),
  healthFill: document.querySelector("#healthFill"),
  restartBtn: document.querySelector("#restartBtn"),
  toast:      document.querySelector("#toast"),
  tmUrl:      document.querySelector("#tmUrl"),
  tmStartBtn: document.querySelector("#tmStartBtn"),
  tmStatus:   document.querySelector("#tmStatus"),
  tmPrediction: document.querySelector("#tmPrediction"),
};

// ─── persistence ──────────────────────────────────────────────────────────────
const storageKey = "mistfall-v3";
const saved = JSON.parse(localStorage.getItem(storageKey) || "{}");
let tmAudioUrl = String(saved.tmAudioUrl || "");

// ─── loaded images ────────────────────────────────────────────────────────────
let mistBackImg, mistBackTreesImg, mistTreeImg, mistRocksImg;
let heroIdleFrames=[], heroRunFrames=[], heroJumpFrames=[];
let houndRunFrames=[], toadIdleFrames=[];
let gemsImage;

// ─── sprite groups ────────────────────────────────────────────────────────────
let player;
let platforms, gems, enemies, hazards, checkpoints, gates;

// ─── game state ───────────────────────────────────────────────────────────────
let score     = 0;
let bestScore = Number(saved.bestScore || 0);
let health    = 6;
const MAX_HP  = 6;
const PLAYER_W = 34;
const PLAYER_H = 66;
const SPIKE_H = 32;

// player state — all tracked explicitly, never derived from velocity
let facingLeft      = false;
let isMoving        = false;   // set to true only when key held, false on release — no threshold flicker
let attackTimer     = 0;
let dashCooldown    = 0;
let invincible      = 0;
let checkpointCooldown = 0;
let coyoteTimer     = 0;
let jumpBuffer      = 0;
let doubleJumpAvail = false;

// quick polish effects
let particles = [];
let popups = [];
let dashGhosts = [];
let shakeTimer = 0;
let shakePower = 0;
let hurtFlash = 0;

// Teachable Machine audio state
let tmRecognizer = null;
let tmListening = false;
let tmLastActionAt = 0;
let tmLastClass = "stil";
let tmLastProb = 0;
let voiceRunTimer = 0;
let voiceJumpQueued = false;
let voiceAttackQueued = false;
const TM_CONFIDENCE = 0.82;
const TM_ACTION_COOLDOWN = 650;

// respawn
let checkpointX = 170, checkpointY = 540;

// level
let currentLevel    = 1;
let gameWon         = false;
let transitionTimer = 0;  // counts down after beating lvl1

// ─── preload ──────────────────────────────────────────────────────────────────
function preload() {
  mistBackImg      = loadImage(assets.mistBack);
  mistBackTreesImg = loadImage(assets.mistBackTrees);
  mistTreeImg      = loadImage(assets.mistTree);
  mistRocksImg     = loadImage(assets.mistRocks);
  heroIdleFrames   = assets.heroIdle.map((p,i)=>({ img: loadImage(p), ...heroBounds.idle[i] }));
  heroRunFrames    = assets.heroRun.map((p,i)=>({ img: loadImage(p), ...heroBounds.run[i] }));
  heroJumpFrames   = assets.heroJump.map((p,i)=>({ img: loadImage(p), ...heroBounds.jump[i] }));
  houndRunFrames   = assets.houndRun.map(p=>loadImage(p));
  toadIdleFrames   = assets.toadIdle.map(p=>loadImage(p));
  gemsImage        = loadImage(assets.gems);
}

// ─── setup ────────────────────────────────────────────────────────────────────
function setup() {
  new Canvas(windowWidth, windowHeight);
  const mount = document.querySelector("#gameMount");
  const cv = document.querySelector("canvas");
  if (cv && cv.parentElement !== mount) mount.appendChild(cv);

  world.gravity.y = 38;
  initGroups();
  loadLevel(1);
  spawnPlayer();
  updateHud();
  initTeachableMachineUI();
}
function windowResized() { resizeCanvas(windowWidth, windowHeight); }

// ─── groups ───────────────────────────────────────────────────────────────────
function initGroups() {
  platforms   = new Group(); platforms.collider   = "static";    platforms.visible   = false;
  gems        = new Group(); gems.collider        = "static";    gems.visible        = false;
  enemies     = new Group(); enemies.collider     = "kinematic"; enemies.visible     = false;
  hazards     = new Group(); hazards.collider     = "static";    hazards.visible     = false;
  checkpoints = new Group(); checkpoints.collider = "static";    checkpoints.visible = false;
  gates       = new Group(); gates.collider       = "static";    gates.visible       = false;
}

// ─── player ───────────────────────────────────────────────────────────────────
function spawnPlayer() {
  if (player) player.remove();
  player = new Sprite(checkpointX, checkpointY, PLAYER_W, PLAYER_H);
  player.rotationLock = true;
  player.friction     = 0;
  player.bounciness   = 0;
  player.visible      = false;
  facingLeft   = false;
  isMoving     = false;
  invincible   = 60;
}

// ─── level loader ─────────────────────────────────────────────────────────────
function loadLevel(n) {
  platforms.removeAll();
  gems.removeAll();
  enemies.removeAll();
  hazards.removeAll();
  checkpoints.removeAll();
  gates.removeAll();

  currentLevel = n;
  gameWon      = false;
  transitionTimer = 0;

  if (n === 1) buildLevel1Fixed();
  else         buildLevel2Fixed();
}

function buildLevel1Fixed() {
  checkpointX = 170;
  checkpointY = 540;
  ui.areaName.textContent = "Moss Gate";

  const PLATS = [
    [230, 662, 620, 84, "ground"],
    [880, 638, 440, 84, "ground"],
    [1325, 570, 300, 42, "ledge"],
    [1690, 500, 290, 42, "ledge"],
    [2090, 638, 500, 84, "ground"],
    [2540, 560, 360, 42, "ledge"],
    [2940, 485, 300, 42, "ledge"],
    [3410, 646, 580, 80, "ground"],
    [3940, 590, 520, 78, "ground"],
  ];
  checkpointY = playerCenterOnPlatform(PLATS[0]);
  PLATS.forEach(([x, y, w, h, kind]) => addPlatform(x, y, w, h, kind));

  addSpikeBetween(PLATS[0], PLATS[1], 600, 100);
  addSpikeBetween(PLATS[3], PLATS[4], 1780, 120);
  addSpikeOnPlatform(PLATS[1], 970, 82);
  addSpikeOnPlatform(PLATS[4], 2220, 86);
  addSpikeOnPlatform(PLATS[7], 3540, 86);
  addSpikeOnPlatform(PLATS[8], 4080, 76);

  [
    [350, 590], [520, 590], [750, 565], [1050, 490],
    [1320, 500], [1540, 490], [1690, 430], [1900, 560],
    [2090, 560], [2310, 560], [2550, 490], [2935, 415],
    [3220, 575], [3600, 575], [3800, 575], [4050, 510],
  ].forEach(([x, y]) => addGem(x, y));

  addEnemyOnPlatform(PLATS[1], 775, "hound", 1);
  addEnemyOnPlatform(PLATS[2], 1210, "toad", 1, 44);
  addEnemyOnPlatform(PLATS[4], 2130, "hound", 1);
  addEnemyOnPlatform(PLATS[5], 2540, "toad", 1, 44);
  addEnemyOnPlatform(PLATS[7], 3510, "hound", 1);
  addEnemyOnPlatform(PLATS[8], 4050, "toad", 1, 48);

  addCheckpointOnPlatform(PLATS[4], 2090, "Moonlit Ruins");
  addCheckpointOnPlatform(PLATS[7], 3410, "Old Gate");
  addGate(4280, 500, 1);
}

function buildLevel2Fixed() {
  checkpointX = 170;
  checkpointY = 540;
  ui.areaName.textContent = "Ashfen Depths";

  const PLATS = [
    [240, 660, 540, 80, "ground"],
    [900, 620, 320, 42, "ledge"],
    [1260, 550, 260, 42, "ledge"],
    [1580, 480, 240, 42, "ledge"],
    [2000, 650, 460, 80, "ground"],
    [2560, 540, 180, 42, "ledge"],
    [2840, 470, 180, 42, "ledge"],
    [3100, 540, 180, 42, "ledge"],
    [3360, 470, 180, 42, "ledge"],
    [3800, 650, 540, 80, "ground"],
    [4300, 580, 320, 42, "ledge"],
    [4800, 640, 460, 80, "ground"],
  ];
  checkpointY = playerCenterOnPlatform(PLATS[0]);
  PLATS.forEach(([x, y, w, h, kind]) => addPlatform(x, y, w, h, kind));

  addSpikeBetween(PLATS[0], PLATS[1], 665, 130);
  addSpikeBetween(PLATS[3], PLATS[4], 1750, 180);
  addSpikeBetween(PLATS[8], PLATS[9], 3600, 180);
  addSpikeBetween(PLATS[9], PLATS[11], 4560, 110);
  addSpikeOnPlatform(PLATS[1], 950, 70);
  addSpikeOnPlatform(PLATS[4], 2060, 76);
  addSpikeOnPlatform(PLATS[9], 3860, 76);

  [
    [400, 590], [700, 548], [1000, 545], [1240, 475],
    [1560, 405], [1850, 578], [2060, 575], [2200, 575],
    [2560, 465], [2840, 395], [3100, 465], [3360, 395],
    [3700, 578], [3900, 578], [4100, 578],
    [4310, 505], [4600, 565], [4900, 565],
  ].forEach(([x, y]) => addGem(x, y));

  addEnemyOnPlatform(PLATS[0], 600, "hound", 2);
  addEnemyOnPlatform(PLATS[1], 980, "toad", 2, 44);
  addEnemyOnPlatform(PLATS[2], 1260, "hound", 2, 44);
  addEnemyOnPlatform(PLATS[4], 2080, "toad", 2);
  addEnemyOnPlatform(PLATS[5], 2560, "hound", 2, 36);
  addEnemyOnPlatform(PLATS[6], 2840, "toad", 2, 36);
  addEnemyOnPlatform(PLATS[7], 3100, "hound", 2, 36);
  addEnemyOnPlatform(PLATS[8], 3360, "toad", 2, 36);
  addEnemyOnPlatform(PLATS[9], 3900, "hound", 2);
  addEnemyOnPlatform(PLATS[10], 4300, "toad", 2, 42);

  addCheckpointOnPlatform(PLATS[4], 2000, "Ember Crossing");
  addCheckpointOnPlatform(PLATS[9], 3800, "Ashfen Gate");
  addGate(5000, 550, 2);
}

// ══════════════════════════════════════════════════════════════════════════════
//  LEVEL 1
//  Spike pits live BETWEEN platforms — in the gap at ground level.
//  Formula: pit center Y  = platformCenterY - platformH/2 + pitH/2
//  i.e. the pit top is flush with the platform surface.
//  We use the adjacent ground platforms (all at y=662, h=84) so surface = 662-42 = 620.
//  Pit height = 32  →  pit center Y = 620 + 16 = 636
// ══════════════════════════════════════════════════════════════════════════════
function buildLevel1() {
  checkpointX = 170; checkpointY = 540;
  ui.areaName.textContent = "Moss Gate";

  // ── platforms ─────────────────────────────────────────────────────────────
  // [cx, cy, w, h, kind]
  const PLATS = [
    [230,  662, 620, 84, "ground"],  // 0  x: 230±310  = -80..540
    [880,  638, 440, 84, "ground"],  // 1  x: 880±220  = 660..1100
    [1325, 570, 300, 42, "ledge"],   // 2
    [1690, 500, 290, 42, "ledge"],   // 3
    [2090, 638, 500, 84, "ground"],  // 4  x: 2090±250 = 1840..2340
    [2540, 560, 360, 42, "ledge"],   // 5
    [2940, 485, 300, 42, "ledge"],   // 6
    [3410, 646, 580, 80, "ground"],  // 7  x: 3410±290 = 3120..3700
    [3940, 590, 520, 78, "ground"],  // 8  x: 3940±260 = 3680..4200
  ];
  PLATS.forEach(([x,y,w,h,k]) => addPlatform(x,y,w,h,k));

  // ── spike pits — ON-PLATFORM spikes + GAP spikes ──────────────────────────
  // Gap between plat0 (ends at 540) and plat1 (starts at 660): center x=600, width=120
  // Ground surface y for plat0/plat1 = 662-42=620  →  pit cy = 620+16=636
  const GND_CY = 636; // pit center y for ground-level gaps (surface 620, pit h 32)

  // Gap spikes (in the air between platforms — at ground surface level)
  addSpikePit(600,  GND_CY, 120);  // gap plat0→plat1
  addSpikePit(1780, GND_CY, 120);  // gap plat4-left side (1840-60)

  // ON-PLATFORM spikes: sit ON TOP of a platform
  // pit cy = platformCY - platformH/2 - pitH/2   (sits on the platform surface)
  // plat1 surface y = 638-42=596  →  on-top pit cy = 596 - 16 = 580
  addSpikePit(970,  platformTopPitCY(638,84), 96);   // on plat1, near right edge
  // plat4 surface y = 638-42=596
  addSpikePit(2220, platformTopPitCY(638,84), 96);   // on plat4
  // plat7 surface y = 646-40=606
  addSpikePit(3540, platformTopPitCY(646,80), 96);   // on plat7
  // plat8 surface y = 590-39=551
  addSpikePit(4080, platformTopPitCY(590,78), 80);   // on plat8

  // ── gems ──────────────────────────────────────────────────────────────────
  [
    [350,590],[520,590],[750,565],[1050,490],
    [1320,500],[1540,490],[1690,430],[1900,560],
    [2090,560],[2310,560],[2550,490],[2935,415],
    [3220,575],[3600,575],[3800,575],[4050,510],
  ].forEach(([x,y])=>addGem(x,y));

  // ── enemies ───────────────────────────────────────────────────────────────
  [
    [775,  585, "hound", 662, 1098],
    [1210, 520, "toad",  1102,1460],
    [2130, 585, "hound", 1842,2338],
    [2740, 515, "toad",  2362,2718],
    [3510, 594, "hound", 3122,3698],
    [4050, 538, "toad",  3682,4198],
  ].forEach(([x,y,k,l,r])=>addEnemy(x,y,k,l,r,1));

  addCheckpoint(2090, 552, "Moonlit Ruins");
  addCheckpoint(3410, 560, "Old Gate");
  addGate(4280, 500, 1);
}

function platformSurfaceY(platform) {
  return platform[1] - platform[3] / 2;
}

function platformLeft(platform) {
  return platform[0] - platform[2] / 2;
}

function platformRight(platform) {
  return platform[0] + platform[2] / 2;
}

function playerCenterOnPlatform(platform) {
  return platformSurfaceY(platform) - PLAYER_H / 2 - 1;
}

function addSpikeOnPlatform(platform, x, w) {
  addSpikePit(x, platformSurfaceY(platform), w, "platform");
}

function addSpikeBetween(platformA, platformB, x, w) {
  addSpikePit(x, max(platformSurfaceY(platformA), platformSurfaceY(platformB)), w, "gap");
}

function addEnemyOnPlatform(platform, x, kind, lvl, margin = 56) {
  const isToad = kind === "toad";
  const enemyH = isToad ? 40 : 36;
  const safeMargin = max(margin, isToad ? 52 : 60);
  const surface = platformSurfaceY(platform);
  const y = surface - enemyH / 2;
  addEnemy(x, y, kind, platformLeft(platform) + safeMargin, platformRight(platform) - safeMargin, lvl, surface);
}

function addCheckpointOnPlatform(platform, x, name) {
  const surface = platformSurfaceY(platform);
  addCheckpoint(x, surface - 44, name, surface);
}

// ══════════════════════════════════════════════════════════════════════════════
//  LEVEL 2  — Ashfen Depths
// ══════════════════════════════════════════════════════════════════════════════
function buildLevel2() {
  checkpointX = 170; checkpointY = 540;
  ui.areaName.textContent = "Ashfen Depths";

  const PLATS = [
    [240,  660, 540, 80, "ground"],   // 0  ends at 510
    [900,  620, 320, 42, "ledge"],    // 1
    [1260, 550, 260, 42, "ledge"],    // 2
    [1580, 480, 240, 42, "ledge"],    // 3
    [2000, 650, 460, 80, "ground"],   // 4
    [2560, 540, 180, 42, "ledge"],    // 5
    [2840, 470, 180, 42, "ledge"],    // 6
    [3100, 540, 180, 42, "ledge"],    // 7
    [3360, 470, 180, 42, "ledge"],    // 8
    [3800, 650, 540, 80, "ground"],   // 9
    [4300, 580, 320, 42, "ledge"],    // 10
    [4800, 640, 460, 80, "ground"],   // 11
  ];
  PLATS.forEach(([x,y,w,h,k])=>addPlatform(x,y,w,h,k));

  // gap spikes
  const G1 = 660-40+16; // ground plat0/4 gap cy
  const G2 = 650-40+16;
  addSpikePit(665,  G1, 150);  // gap plat0→plat1
  addSpikePit(1750, G2, 220);  // gap plat3→plat4  (staircase to ground)
  addSpikePit(3600, G2, 200);  // gap plat8→plat9
  addSpikePit(4560, G2, 130);  // gap plat9→plat11 area

  // on-platform spikes
  addSpikePit(950,  platformTopPitCY(620,42), 80);
  addSpikePit(2060, platformTopPitCY(650,80), 80);
  addSpikePit(3860, platformTopPitCY(650,80), 80);

  [
    [400,590],[700,548],[1000,545],[1240,475],
    [1560,405],[1850,578],[2060,575],[2200,575],
    [2560,465],[2840,395],[3100,465],[3360,395],
    [3700,578],[3900,578],[4100,578],
    [4310,505],[4600,565],[4900,565],
  ].forEach(([x,y])=>addGem(x,y));

  [
    [600,  605, "hound", 420,  808, 2],
    [980,  568, "toad",  742, 1078, 2],
    [1380, 428, "hound", 1122,1538, 2],
    [2080, 598, "toad",  1842,2278, 2],
    [2560, 488, "hound", 2472,2718, 2],
    [2840, 418, "toad",  2752,2998, 2],
    [3100, 488, "hound", 3012,3258, 2],
    [3360, 418, "toad",  3272,3518, 2],
    [3900, 598, "hound", 3722,4078, 2],
    [4400, 528, "toad",  4182,4618, 2],
  ].forEach(([x,y,k,l,r,lv])=>addEnemy(x,y,k,l,r,lv));

  addCheckpoint(2000, 562, "Ember Crossing");
  addCheckpoint(3800, 562, "Ashfen Gate");
  addGate(5000, 550, 2);
}

// ─── spawn helpers ────────────────────────────────────────────────────────────
function addPlatform(x,y,w,h,kind) {
  const p    = new platforms.Sprite(x,y,w,h);
  p.kind=kind; p.w=w; p.h=h;
}
function addGem(x,y) {
  const g = new gems.Sprite(x,y,26,28);
  g.phase = random(1000);
}
function addEnemy(x,y,kind,leftBound,rightBound,lvl,surfaceYValue) {
  const isToad = kind==="toad";
  const e = new enemies.Sprite(x, y, isToad?60:68, isToad?40:36);
  e.kind=kind;
  e.leftBound=leftBound;
  e.rightBound=rightBound;
  e.dir      = random()>0.5?1:-1;
  e.facingDir= e.dir;
  e.homeY = y;
  e.surfaceY = surfaceYValue ?? (y + (isToad ? 20 : 18));
  const boost = lvl===2?1.3:1.0;
  e.speedValue = (isToad?1.15:2.1)*boost;
}
function addSpikePit(x,baseY,w,kind="gap") {
  const p=new hazards.Sprite(x,baseY-SPIKE_H/2,w,SPIKE_H);
  p.w=w; p.h=SPIKE_H;
  p.kind=kind;
  p.surfaceY=baseY;
}
function addCheckpoint(x,y,name,surfaceYValue) {
  const c=new checkpoints.Sprite(x,y,40,98);
  c.name=name;
  c.surfaceY=surfaceYValue ?? (y + 45);
  c.respawnX=x;
  c.respawnY=c.surfaceY - PLAYER_H/2 - 1;
  c.activated=false;
}
function addGate(x,y,lvl) {
  const g=new gates.Sprite(x,y,82,150);
  g.forLevel=lvl;
}

// ─── main loop ────────────────────────────────────────────────────────────────
function draw() {
  drawingContext.imageSmoothingEnabled = false;
  handleInput();
  updateEnemies();
  handleCollisions();
  updateEffects();
  handleCamera();
  drawScene();
  updateHud();
}

// ─── input ────────────────────────────────────────────────────────────────────
function handleInput() {
  if (gameWon || transitionTimer>0) return;

  const voiceMove = voiceRunTimer > 0;
  const voiceJump = voiceJumpQueued;
  const voiceAttack = voiceAttackQueued;
  voiceJumpQueued = false;
  voiceAttackQueued = false;

  const left   = kb.pressing("left")  || kb.pressing("a") || (voiceMove && facingLeft);
  const right  = kb.pressing("right") || kb.pressing("d") || (voiceMove && !facingLeft);
  const jumpP  = kb.presses("up")     || kb.presses("w") || kb.presses("space") || voiceJump;
  const attack = kb.presses("j")      || kb.presses("k") || voiceAttack;
  const dash   = kb.presses("shift");

  // ── horizontal movement ───────────────────────────────────────────────────
  if (left) {
    player.vel.x = -6.4;
    facingLeft   = true;
    isMoving     = true;
  } else if (right) {
    player.vel.x = 6.4;
    facingLeft   = false;
    isMoving     = true;
  } else {
    // decelerate
    player.vel.x *= 0.72;
    // FIX: mark as NOT moving once velocity is negligible — stops idle/run flicker
    if (abs(player.vel.x) < 0.4) {
      player.vel.x = 0;
      isMoving = false;
    }
  }

  // ── coyote time ───────────────────────────────────────────────────────────
  const grounded = isGrounded();
  if (grounded) {
    coyoteTimer     = 8;
    doubleJumpAvail = true;
  } else if (coyoteTimer>0) {
    coyoteTimer--;
  }

  // ── jump buffer ───────────────────────────────────────────────────────────
  if (jumpP)        jumpBuffer = 10;
  if (jumpBuffer>0) jumpBuffer--;

  if (jumpBuffer>0 && coyoteTimer>0) {
    player.vel.y = -17.2;
    coyoteTimer  = 0;
    jumpBuffer   = 0;
  } else if (jumpP && !grounded && doubleJumpAvail) {
    player.vel.y    = -14.5;
    doubleJumpAvail = false;
  }

  // ── attack & dash ─────────────────────────────────────────────────────────
  if (attack) attackTimer = 18;
  if (dash && dashCooldown<=0) {
    player.vel.x = (facingLeft?-1:1)*16;
    dashCooldown = 44;
    addBurst(player.x, player.y+26, "#8eeaff", 16);
  }
  if (attackTimer>0)  attackTimer--;
  if (dashCooldown>0) dashCooldown--;

  if (dashCooldown>24 && frameCount%2===0) {
    dashGhosts.push({ x: player.x, y: player.y, left: facingLeft, life: 14, maxLife: 14 });
  }
  if (voiceRunTimer>0) voiceRunTimer--;

  const WW = currentLevel===1 ? 4400 : 5300;
  player.x = constrain(player.x, 55, WW-80);
}

function isGrounded() {
  if (player.colliding(platforms)) return true;

  const footY = player.y + PLAYER_H / 2;
  let onPlatform = false;
  platforms.forEach((p) => {
    const top = p.y - p.h / 2;
    const left = p.x - p.w / 2 + 6;
    const right = p.x + p.w / 2 - 6;
    const overPlatform = player.x >= left && player.x <= right;
    const closeToSurface = footY >= top - 5 && footY <= top + 12;
    if (overPlatform && closeToSurface && player.vel.y >= -0.5) onPlatform = true;
  });
  return onPlatform;
}

// ─── enemy patrol ─────────────────────────────────────────────────────────────
function updateEnemies() {
  enemies.forEach(e=>{
    e.y = e.homeY;
    e.vel.y = 0;
    if (e.x<=e.leftBound  && e.dir<0) { e.dir= 1; e.x=e.leftBound +1; }
    if (e.x>=e.rightBound && e.dir>0) { e.dir=-1; e.x=e.rightBound-1; }
    e.facingDir = e.dir;
    e.vel.x = e.dir*e.speedValue;
  });
}

// ─── collisions ───────────────────────────────────────────────────────────────
function handleCollisions() {
  const WH = currentLevel===1 ? 820 : 820;
  if (player.y > WH+120) damagePlayer(1,true);

  player.overlaps(gems, (_p,gem)=>{
    score+=20; bestScore=max(bestScore,score);
    addBurst(gem.x, gem.y, currentLevel===2 ? "#caa8ff" : "#ffd86b", 18);
    addPopup("+20", gem.x, gem.y-22, "#ffe57a");
    gem.remove(); saveBest();
  });

  player.overlaps(checkpoints, (_p,pt)=>activateCheckpoint(pt));

  player.overlaps(gates, (_p,gate)=>{
    if (gameWon) return;
    gameWon=true; score+=150; bestScore=max(bestScore,score); saveBest();
    if (gate.forLevel===1) transitionTimer=100;
  });

  player.overlaps(hazards, ()=>damagePlayer(1,true));

  player.overlaps(enemies, (_p,enemy)=>{
    if (invincible>0) return;
    const stomp = player.vel.y>1 && player.y < enemy.y-20;
    if (stomp||canHit(enemy)) { defeatEnemy(enemy); return; }
    damagePlayer(1,false,enemy.x);
  });

  if (attackTimer>0) enemies.forEach(e=>{ if(canHit(e)) defeatEnemy(e); });

  if (invincible>0) invincible--;
  if (checkpointCooldown>0) checkpointCooldown--;

  if (transitionTimer>0) {
    transitionTimer--;
    if (transitionTimer===0) {
      loadLevel(2);
      spawnPlayer();
    }
  }
}

function activateCheckpoint(pt) {
  const isNewCheckpoint = checkpointX !== pt.respawnX || checkpointY !== pt.respawnY;
  checkpointX = pt.respawnX;
  checkpointY = pt.respawnY;
  health = MAX_HP;
  pt.activated = true;
  ui.areaName.textContent = pt.name || "Checkpoint";

  if (isNewCheckpoint || checkpointCooldown === 0) {
    ui.toast.textContent = `${ui.areaName.textContent}: checkpoint actief, HP hersteld`;
    checkpointCooldown = 50;
  }
}

function canHit(enemy) {
  if (attackTimer<=0) return false;
  const f = facingLeft?-1:1;
  const ahead = f>0 ? enemy.x>player.x-12 : enemy.x<player.x+12;
  return ahead && abs(enemy.x-player.x)<90 && abs(enemy.y-player.y)<74;
}
function defeatEnemy(enemy) {
  player.vel.y=min(player.vel.y,-8.5);
  const points = enemy.kind==="toad"?45:35;
  score+=points;
  bestScore=max(bestScore,score);
  addBurst(enemy.x, enemy.y, enemy.kind==="toad" ? "#9cff78" : "#ff6b73", 22);
  addPopup(`+${points}`, enemy.x, enemy.y-48, "#e9fff3");
  enemy.remove(); saveBest();
}
function damagePlayer(amount,respawn,srcX=player.x) {
  if (invincible>0 && !respawn) return;
  health-=amount; invincible=90;
  hurtFlash = 18;
  shakeTimer = 10;
  shakePower = 8;
  addBurst(player.x, player.y, "#ff6b6b", 18);
  player.vel.y=-9;
  player.vel.x=player.x<srcX?-9:9;
  if (health<=0) { health=MAX_HP; score=max(0,score-70); respawn=true; }
  if (respawn) respawnPlayer();
}
function respawnPlayer() {
  player.x=checkpointX; player.y=checkpointY;
  player.vel.x=0; player.vel.y=0;
  invincible=110;
}

// ─── camera ───────────────────────────────────────────────────────────────────
function handleCamera() {
  const WW = currentLevel===1?4400:5300;
  const zoom   = constrain(height/790, 1, 1.32);
  camera.zoom  = lerp(camera.zoom||zoom, zoom, 0.08);
  const viewW  = width/camera.zoom;
  const tx     = constrain(player.x+260, viewW/2, WW-viewW/2);
  camera.x     = lerp(camera.x||tx, tx, 0.12) + (shakeTimer>0 ? random(-shakePower, shakePower) : 0);
  const ty     = constrain(player.y-104, 420, 492);
  camera.y     = lerp(camera.y||ty, ty, 0.12) + (shakeTimer>0 ? random(-shakePower, shakePower) : 0);
}

function updateEffects() {
  particles = particles
    .map(p => ({ ...p, x: p.x+p.vx, y: p.y+p.vy, vy: p.vy+0.18, life: p.life-1 }))
    .filter(p => p.life>0);
  popups = popups
    .map(p => ({ ...p, y: p.y-0.55, life: p.life-1 }))
    .filter(p => p.life>0);
  dashGhosts = dashGhosts
    .map(g => ({ ...g, life: g.life-1 }))
    .filter(g => g.life>0);
  if (shakeTimer>0) shakeTimer--;
  if (hurtFlash>0) hurtFlash--;
}

function addBurst(x, y, color, count) {
  for (let i=0;i<count;i++) {
    const a = random(TWO_PI);
    const s = random(1.8, 6.2);
    particles.push({
      x, y,
      vx: cos(a)*s,
      vy: sin(a)*s-random(0.5,2.5),
      size: random(3,8),
      color,
      life: random(18,34),
      maxLife: 34,
    });
  }
}

function addPopup(text, x, y, color) {
  popups.push({ text, x, y, color, life: 42, maxLife: 42 });
}

// ─── draw ─────────────────────────────────────────────────────────────────────
function drawScene() {
  camera.off();
  drawBackdrop();
  // FIX: tint() only accepts (r,g,b,a) or (gray,a) — never arrays
  if (currentLevel===2) {
    tint(160,120,200,255); drawParallaxImg(mistBackImg,      0, height, 0.08, 200);
    tint(140,100,180,255); drawParallaxImg(mistBackTreesImg, 0, height, 0.13, 70);
    tint(120,80, 160,255); drawParallaxImg(mistTreeImg,      0, height, 0.21, 90);
  } else {
    noTint(); drawParallaxImg(mistBackImg,      0, height, 0.08, 255);
    tint(255,255,255,95);  drawParallaxImg(mistBackTreesImg, 0, height, 0.13, 95);
    tint(255,255,255,145); drawParallaxImg(mistTreeImg,      0, height, 0.21, 145);
  }
  noTint();
  drawAtmosphere();
  camera.on();
  drawWorldDecor();
  drawPlatforms();
  drawHazards();
  drawCheckpoints();
  drawGate();
  drawGems();
  drawEnemies();
  drawDashGhosts();
  drawPlayer();
  drawWorldEffects();
  camera.off();
  drawScreenEffects();
}

// FIX: tint is applied BEFORE calling this function, noTint() after
function drawParallaxImg(img, y, drawH, speed, alpha) {
  if (!img) return;
  const drawW = img.width*(drawH/img.height);
  const off   = -((camera.x*speed) % drawW);
  tint(255,255,255,alpha);
  for (let x=off-drawW; x<width+drawW; x+=drawW)
    image(img, x, y, drawW, drawH);
  noTint();
}

function drawBackdrop() {
  const sky = drawingContext.createLinearGradient(0,0,0,height);
  if (currentLevel===2) {
    sky.addColorStop(0,    "#1a0e2e");
    sky.addColorStop(0.45, "#2d1a42");
    sky.addColorStop(1,    "#060810");
  } else {
    sky.addColorStop(0,    "#b7d0cf");
    sky.addColorStop(0.48, "#5d8780");
    sky.addColorStop(1,    "#10251e");
  }
  drawingContext.fillStyle=sky;
  drawingContext.fillRect(0,0,width,height);
}

function drawAtmosphere() {
  noStroke();
  const isL2=currentLevel===2;
  const fog=drawingContext.createLinearGradient(0,height*0.26,0,height*0.72);
  fog.addColorStop(0,   isL2?"rgba(80,40,120,0)"   :"rgba(229,244,238,0)");
  fog.addColorStop(0.45,isL2?"rgba(80,40,120,0.18)":"rgba(229,244,238,0.18)");
  fog.addColorStop(1,   isL2?"rgba(80,40,120,0)"   :"rgba(229,244,238,0)");
  drawingContext.fillStyle=fog;
  drawingContext.fillRect(0,height*0.26,width,height*0.46);
  for (let i=0;i<46;i++){
    const x=(i*173-frameCount*0.18)%(width+90);
    const y=120+((i*71)%max(250,height-260));
    if(isL2) fill(180,140,255,20); else fill(236,255,246,24);
    circle(x,y,2+(i%3));
  }
}

function drawWorldDecor() {
  noStroke();
  if (!mistRocksImg) return;
  const WW=currentLevel===1?4400:5300;
  if(currentLevel===2) tint(120,80,160,95); else tint(255,255,255,95);
  for (let x=-80;x<WW+280;x+=680) image(mistRocksImg,x,628,360,360);
  noTint();
}

function drawPlatforms() {
  const L2=currentLevel===2;
  platforms.forEach(p=>{
    const l=p.x-p.w/2, t=p.y-p.h/2, r=l+p.w, b=t+p.h;
    noStroke();
    fill(p.kind==="ground"?(L2?"#1e1030":"#1c3a32"):(L2?"#2a1545":"#234b3f"));
    rect(l,t+8,p.w,p.h-8);
    fill(L2?"#110820":"#0f231d"); rect(l,t+30,p.w,p.h-30);
    fill(L2?"#090610":"#0a1713"); rect(l,b-10,p.w,10);
    fill(L2?"#3a2060":"#314e45"); rect(l,t+2,p.w,18);
    fill(L2?"#7040c0":"#7cbf7a"); rect(l,t-6,p.w,8);
    fill(L2?"#9060e0":"#a8d990"); rect(l+5,t-10,p.w-10,4);
    drawStoneTexture(l,t,p.w,p.h,L2);
    drawGrassPixels(l,r,t,L2);
  });
}
function drawStoneTexture(l,t,w,h,dark) {
  for(let x=l+18;x<l+w-12;x+=46){
    const y=t+24+((x/46)%3)*13;
    fill(dark?[60,30,90,80]:[67,96,87,82]); rect(x,y,28,5);
  }
  for(let x=l+8;x<l+w;x+=62){
    fill(dark?[10,5,18,70]:[8,19,16,75]); rect(x,t+h-24,38,5);
  }
}
function drawGrassPixels(l,r,t,dark) {
  for(let x=l+10;x<r-10;x+=22){
    const b=sin((x+frameCount)*0.04)*1.5;
    fill(dark?"#8050d8":"#a1d78a"); rect(x,t-11+b,15,4);
    fill(dark?"#5028a0":"#5f9f5e"); rect(x+6,t-16+b,6,6);
  }
}

function drawHazards() {
  const L2=currentLevel===2;
  hazards.forEach(pit=>{
    const l=pit.x-pit.w/2;
    const bot=pit.surfaceY ?? pit.y+pit.h/2;
    fill(L2?"#0c0518":"#071611");
    if (pit.kind === "platform") {
      rect(l-8,bot-2,pit.w+16,7);
    } else {
      rect(l-18,bot,pit.w+36,32);
    }
    for(let x=l;x<l+pit.w;x+=28){
      fill(L2?"#d0b0ff":"#eadfb7");
      triangle(x,bot,x+14,bot-38,x+28,bot);
      fill(L2?"#eedcff":"#fff7ce");
      triangle(x+9,bot-18,x+14,bot-38,x+19,bot-18);
    }
  });
}

function drawCheckpoints() {
  checkpoints.forEach(pt=>{
    stroke("#10140f"); strokeWeight(7);
    line(pt.x,pt.y+45,pt.x,pt.y-36);
    strokeWeight(5); line(pt.x,pt.y-28,pt.x+34,pt.y-18);
    noStroke();
    fill("#ffd86b"); rect(pt.x+21,pt.y-35,28,30,5);
    fill("#fff3b0"); rect(pt.x+27,pt.y-28,13,18,2);
  });
  strokeWeight(1);
}

function drawGate() {
  gates.forEach(gate=>{
    const {x,y}=gate, L2=gate.forLevel===2;
    noStroke();
    fill(L2?[140,70,200,50]:[111,170,142,45]); ellipse(x,y+8,140,184);
    fill(L2?"#2a103d":"#203b33");
    rect(x-48,y-66,14,132); rect(x+34,y-66,14,132); rect(x-48,y-76,96,18);
    fill(L2?"#c090ff":"#9dd5b5"); rect(x-32,y-52,64,104,8);
    fill(L2?"#eedcff":"#d8fff0"); rect(x-20,y-34,40,70,6);
    const sh=sin(frameCount*0.04);
    fill(L2?[200,150,255,20+sh*15]:[160,255,200,20+sh*15]);
    ellipse(x,y,80+sh*8,120+sh*12);
  });
}

function drawGems() {
  gems.forEach(gem=>{
    const bob=sin((frameCount+gem.phase)*0.06)*5;
    const fr=floor(frameCount/8)%6;
    push(); translate(gem.x,gem.y+bob);
    if(gemsImage){
      imageMode(CENTER);
      image(gemsImage,0,0,34,34,610+fr*28,24,22,22);
      imageMode(CORNER);
    } else {
      fill(currentLevel===2?"#b080ff":"#ffd86b");
      rectMode(CENTER); rect(0,0,24,24,3); rectMode(CORNER);
    }
    pop();
  });
}

function drawEnemies() {
  imageMode(CENTER);
  enemies.forEach(e=>{
    const footY = (e.surfaceY ?? e.y + 20) - e.y;
    noStroke(); fill(0,0,0,80);
    ellipse(e.x,e.y+footY+3,e.kind==="toad"?72:88,13);
    push(); translate(e.x,e.y);
    scale(e.facingDir>0?-1:1,1);
    if(e.kind==="toad"){
      const fr=toadIdleFrames[floor(frameCount/12)%toadIdleFrames.length];
      if(fr) image(fr,0,footY-33,92,66,8,18,64,46);
    } else {
      const fr=houndRunFrames[floor(frameCount/6)%houndRunFrames.length];
      if(fr) image(fr,0,footY-29,108,58,5,10,58,38);
    }
    pop();
  });
  imageMode(CORNER);
}

function drawPlayer() {
  // FIX: use explicit isMoving flag, NOT velocity threshold — prevents idle/run flicker
  const grounded = isGrounded();
  const frames   = !grounded ? heroJumpFrames : isMoving ? heroRunFrames : heroIdleFrames;
  const speed    = !grounded ? 7 : isMoving ? 5 : 10;
  const frame    = frames[floor(frameCount/speed)%frames.length];

  imageMode(CENTER);
  push();
  translate(player.x, player.y-3);
  scale(facingLeft?-1:1, 1);

  noStroke(); fill(0,0,0,90); ellipse(0,36,48,13);

  if (invincible>0 && frameCount%8<4) tint(255,255,255,140);
  drawHeroFrame(frame);
  noTint();

  // double-jump ring
  if (!grounded && !doubleJumpAvail) {
    noFill(); stroke(180,220,255,70); strokeWeight(2);
    ellipse(0,10,52+sin(frameCount*0.3)*6,18);
    noStroke();
  }

  if (attackTimer>0) {
    fill(205,248,255,90); arc(36,-8,82,56,-0.75,0.75);
    fill("#e8fff7"); rect(26,-12,54,7,3);
  }
  pop();
  imageMode(CORNER);
  strokeWeight(1);
}

function drawDashGhosts() {
  const grounded = isGrounded();
  const frames = !grounded ? heroJumpFrames : isMoving ? heroRunFrames : heroIdleFrames;
  const frame = frames[floor(frameCount/5)%frames.length];
  imageMode(CENTER);
  dashGhosts.forEach(g=>{
    const a = map(g.life, 0, g.maxLife, 0, 95);
    push();
    translate(g.x, g.y-3);
    scale(g.left?-1:1, 1);
    tint(120,235,255,a);
    drawHeroFrame(frame);
    noTint();
    pop();
  });
  imageMode(CORNER);
}

function drawWorldEffects() {
  noStroke();
  particles.forEach(p=>{
    const a = map(p.life, 0, p.maxLife, 0, 230);
    fill(red(color(p.color)), green(color(p.color)), blue(color(p.color)), a);
    circle(p.x, p.y, p.size);
  });
  textAlign(CENTER,CENTER);
  textStyle(BOLD);
  popups.forEach(p=>{
    const a = map(p.life, 0, p.maxLife, 0, 255);
    fill(0,0,0,a*0.45);
    textSize(20);
    text(p.text, p.x+2, p.y+2);
    fill(red(color(p.color)), green(color(p.color)), blue(color(p.color)), a);
    text(p.text, p.x, p.y);
  });
  textStyle(NORMAL);
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

  image(frame.img, 0, footY - targetH / 2, targetW, targetH, sx, sy, sw, sh);
}

function drawScreenEffects() {
  noStroke();
  const vig=drawingContext.createRadialGradient(width/2,height/2,width*0.18,width/2,height/2,width*0.72);
  vig.addColorStop(0,"rgba(0,0,0,0)");
  vig.addColorStop(1,currentLevel===2?"rgba(8,2,18,0.50)":"rgba(1,10,7,0.38)");
  drawingContext.fillStyle=vig;
  drawingContext.fillRect(0,0,width,height);

  // hurt feedback
  if (hurtFlash>0) {
    const a = map(hurtFlash, 0, 18, 0, 90);
    fill(255,70,70,a);
    rect(0,0,width,height);
  }

  // level transition
  if (transitionTimer>0) {
    const a = transitionTimer>50 ? map(transitionTimer,100,50,0,230) : map(transitionTimer,50,0,230,0);
    fill(currentLevel===2?[20,5,40,a]:[10,20,15,a]);
    rect(0,0,width,height);
    if (transitionTimer<70 && transitionTimer>20) {
      fill(currentLevel===2?[200,180,255,220]:[180,255,200,220]);
      textAlign(CENTER,CENTER); textSize(46);
      text("Ashfen Depths", width/2,height/2-14);
      textSize(20); text("Level 2", width/2,height/2+30);
    }
  }

  // win screen
  if (gameWon && transitionTimer===0) {
    fill(currentLevel===2?[8,2,20,185]:[4,16,12,180]);
    rect(0,0,width,height);
    fill(currentLevel===2?"#e8d0ff":"#f4fff5");
    textAlign(CENTER,CENTER); textSize(52);
    text(currentLevel===2?"Ashfen Depths Verslagen!":"Moss Gate Verslagen!", width/2,height/2-18);
    textSize(20);
    fill(currentLevel===2?"#c0a0ff":"#a0ffc8");
    text("Klik Restart om opnieuw te spelen", width/2,height/2+44);
  }
}

// ─── HUD ──────────────────────────────────────────────────────────────────────
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
    setTmStatus("Audio library niet geladen", "Herlaad de pagina en probeer opnieuw.");
    return;
  }

  try {
    ui.tmStartBtn.disabled = true;
    setTmStatus("Model laden...", "Geef microfoon-toegang wanneer de browser dat vraagt.");
    tmRecognizer = await createAudioRecognizer(url);
    const labels = tmRecognizer.wordLabels();
    tmRecognizer.listen(result => handleAudioPrediction(labels, result.scores), {
      includeSpectrogram: true,
      probabilityThreshold: 0.65,
      invokeCallbackOnNoiseAndUnknown: true,
      overlapFactor: 0.5,
    });

    tmListening = true;
    tmAudioUrl = url;
    saveState({ tmAudioUrl });
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
  const checkpointURL = url + "model.json";
  const metadataURL = url + "metadata.json";
  const recognizer = speechCommands.create("BROWSER_FFT", undefined, checkpointURL, metadataURL);
  await recognizer.ensureModelLoaded();
  return recognizer;
}

function handleAudioPrediction(labels, scores) {
  let top = { label: "", score: 0 };
  labels.forEach((label, i) => {
    const score = scores[i] || 0;
    if (score > top.score) top = { label, score };
  });

  tmLastClass = normalizeClassName(top.label);
  tmLastProb = top.score;
  setTmStatus("Audio actief", `${top.label}: ${Math.round(top.score * 100)}%`);

  if (top.score < TM_CONFIDENCE) return;
  if (tmLastClass === "stil" || tmLastClass === "rust" || tmLastClass === "background_noise") return;

  const now = Date.now();
  if (now - tmLastActionAt < TM_ACTION_COOLDOWN) return;
  tmLastActionAt = now;

  if (tmLastClass === "roep") {
    voiceRunTimer = 34;
    voiceJumpQueued = true;
    if (player) {
      addBurst(player.x, player.y + 20, "#8eeaff", 12);
      addPopup("roep", player.x, player.y - 54, "#8eeaff");
    }
  }

  if (tmLastClass === "klap") {
    voiceAttackQueued = true;
    if (player) {
      addBurst(player.x + (facingLeft ? -34 : 34), player.y - 4, "#ffe57a", 14);
      addPopup("klap", player.x, player.y - 54, "#ffe57a");
    }
  }
}

function normalizeClassName(label) {
  return String(label || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
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

function updateHud() {
  bestScore=max(bestScore,score);
  ui.score.textContent    =score;
  ui.bestScore.textContent=bestScore;
  ui.healthFill.style.width=`${(health/MAX_HP)*100}%`;
}
function saveState(extra={}) {
  const current = JSON.parse(localStorage.getItem(storageKey) || "{}");
  localStorage.setItem(storageKey, JSON.stringify({ ...current, bestScore, tmAudioUrl, ...extra }));
}
function saveBest() { saveState(); }

// ─── restart ──────────────────────────────────────────────────────────────────
function restartGame() {
  score=0; health=MAX_HP;
  attackTimer=0; dashCooldown=0; invincible=0;
  checkpointCooldown=0;
  particles=[]; popups=[]; dashGhosts=[];
  shakeTimer=0; shakePower=0; hurtFlash=0;
  voiceRunTimer=0; voiceJumpQueued=false; voiceAttackQueued=false;
  coyoteTimer=0; jumpBuffer=0; doubleJumpAvail=false;
  checkpointX=170; checkpointY=540;
  ui.toast.textContent = "Keyboard of audio: roep = spring vooruit, klap = attack, stil = rust";
  loadLevel(1);
  spawnPlayer();
  updateHud();
}
ui.restartBtn.addEventListener("click", restartGame);
