const ui = {
  score: document.querySelector("#score"),
  status: document.querySelector("#status"),
};

function setup() {
  new Canvas(windowWidth, windowHeight);

  const mount = document.querySelector("#gameMount");
  const canvas = document.querySelector("canvas");
  if (canvas && mount && canvas.parentElement !== mount) {
    mount.appendChild(canvas);
  }

  world.gravity.y = 30;
  ui.status.textContent = "canvas";
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function draw() {
  drawMistBackground();
  drawStartGround();
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
  text("Basis klaar voor de volgende commit", width / 2, height / 2 + 18);
}
