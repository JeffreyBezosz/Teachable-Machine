const ui = {
  score: document.querySelector("#score"),
  status: document.querySelector("#status"),
};

const physics = {
  gravity: 0.82,
  jumpStrength: 17,
  maxFallSpeed: 22,
};

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

function setup() {
  new Canvas(windowWidth, windowHeight);

  const mount = document.querySelector("#gameMount");
  const canvas = document.querySelector("canvas");
  if (canvas && mount && canvas.parentElement !== mount) {
    mount.appendChild(canvas);
  }

  world.gravity.y = 30;
  buildPlatforms();
  placePlayerOnGround();
  ui.status.textContent = "Moss";
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  buildPlatforms();
  if (player.grounded) placePlayerOnGround();
}

function draw() {
  updatePlayer();
  drawMistBackground();
  drawStartGround();
  drawPlatforms();
  drawPlayer();
}

function updatePlayer() {
  const left = kb.pressing("a") || kb.pressing("left");
  const right = kb.pressing("d") || kb.pressing("right");
  const jump = kb.presses("w") || kb.presses("space") || kb.presses("up");
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
  player.x = constrain(player.x, player.width / 2 + 20, width - player.width / 2 - 20);

  if (jump && player.grounded) {
    player.vy = -physics.jumpStrength;
    player.grounded = false;
  }

  player.vy += physics.gravity;
  player.vy = min(player.vy, physics.maxFallSpeed);
  player.y += player.vy;
  player.grounded = false;

  resolvePlatformLandings(previousBottom);
  resolveGroundLanding();
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

  fill(240, 255, 247, 32);
  for (let i = 0; i < 34; i++) {
    const x = (i * 173 + frameCount * 0.18) % (width + 120) - 60;
    const y = 120 + (i * 67) % max(220, height - 240);
    circle(x, y, 2 + (i % 3));
  }
}

function drawStartGround() {
  const groundY = getGroundY();
  noStroke();
  fill("#19372f");
  rect(0, groundY, width, height - groundY);
  fill("#7fc579");
  rect(0, groundY - 8, width, 8);

  fill("#f3fff6");
  textAlign(CENTER, CENTER);
  textSize(28);
  text("Mistfall Gate", width / 2, height / 2 - 20);
  fill("#b8cdbc");
  textSize(16);
  text("Een stille ingang tussen mist en mos", width / 2, height / 2 + 18);
}

function buildPlatforms() {
  const groundY = getGroundY();
  platforms = [
    { x: width * 0.36, y: groundY - 105, w: 170, h: 22 },
    { x: width * 0.58, y: groundY - 195, w: 190, h: 22 },
    { x: width * 0.78, y: groundY - 135, w: 155, h: 22 },
  ].map((platform) => ({
    ...platform,
    x: constrain(platform.x, platform.w / 2 + 30, width - platform.w / 2 - 30),
  }));
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

function drawPlayer() {
  const walkCycle = player.moving && player.grounded ? sin(frameCount * 0.24) : 0;
  const bob = player.grounded ? player.moving ? abs(walkCycle) * 3 : sin(frameCount * 0.08) * 2 : 0;
  const feetY = player.y + player.height / 2;

  noStroke();
  fill(0, 0, 0, 80);
  ellipse(player.x, feetY + 5, 48, 12);

  push();
  translate(player.x, player.y + bob);
  scale(player.facingLeft ? -1 : 1, 1);

  fill("#222936");
  rectMode(CENTER);
  const bodyTilt = player.grounded ? 0 : player.vy < 0 ? -0.08 : 0.08;
  rotate(bodyTilt);
  rect(0, 6, player.width, player.height - 12, 6);

  fill("#ffd86b");
  rect(0, -18, 22, 20, 4);

  fill("#f3fff6");
  const legLift = player.grounded ? walkCycle * 4 : -4;
  rect(-8, 18 + legLift, 7, 26, 3);
  rect(8, 18 - legLift, 7, 26, 3);

  fill("#9be69d");
  const armSwing = player.grounded ? walkCycle * 2 : 5;
  rect(-18, 4 - armSwing, 8, 32, 3);
  rect(18, 4 + armSwing, 8, 32, 3);

  rectMode(CORNER);
  pop();
}
