const ui = {
  score: document.querySelector("#score"),
  status: document.querySelector("#status"),
};

const player = {
  x: 170,
  y: 0,
  vx: 0,
  width: 34,
  height: 64,
  speed: 0.85,
  maxSpeed: 6,
  friction: 0.78,
  facingLeft: false,
  moving: false,
};

function setup() {
  new Canvas(windowWidth, windowHeight);

  const mount = document.querySelector("#gameMount");
  const canvas = document.querySelector("canvas");
  if (canvas && mount && canvas.parentElement !== mount) {
    mount.appendChild(canvas);
  }

  world.gravity.y = 30;
  placePlayerOnGround();
  ui.status.textContent = "Moss";
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function draw() {
  updatePlayer();
  drawMistBackground();
  drawStartGround();
  drawPlayer();
}

function updatePlayer() {
  const left = kb.pressing("a") || kb.pressing("left");
  const right = kb.pressing("d") || kb.pressing("right");

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
  const groundY = height - 130;
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

function placePlayerOnGround() {
  player.y = height - 130 - player.height / 2;
}

function drawPlayer() {
  const walkCycle = player.moving ? sin(frameCount * 0.24) : 0;
  const bob = player.moving ? abs(walkCycle) * 3 : sin(frameCount * 0.08) * 2;
  const feetY = player.y + player.height / 2;

  noStroke();
  fill(0, 0, 0, 80);
  ellipse(player.x, feetY + 5, 48, 12);

  push();
  translate(player.x, player.y + bob);
  scale(player.facingLeft ? -1 : 1, 1);

  fill("#222936");
  rectMode(CENTER);
  rect(0, 6, player.width, player.height - 12, 6);

  fill("#ffd86b");
  rect(0, -18, 22, 20, 4);

  fill("#f3fff6");
  rect(-8, 18 + walkCycle * 4, 7, 26, 3);
  rect(8, 18 - walkCycle * 4, 7, 26, 3);

  fill("#9be69d");
  rect(-18, 4 - walkCycle * 2, 8, 32, 3);
  rect(18, 4 + walkCycle * 2, 8, 32, 3);

  rectMode(CORNER);
  pop();
}
