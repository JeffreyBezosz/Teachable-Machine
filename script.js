const canvas = document.querySelector("#gameCanvas");
const ctx = canvas.getContext("2d");
const modelURL = "https://teachablemachine.withgoogle.com/models/En0htbVKx/";

const els = {
  score: document.querySelector("#score"),
  level: document.querySelector("#level"),
  timer: document.querySelector("#timer"),
  statusText: document.querySelector("#statusText"),
  gestureText: document.querySelector("#gestureText"),
  controlMode: document.querySelector("#controlMode"),
  speedRange: document.querySelector("#speedRange"),
  speedValue: document.querySelector("#speedValue"),
  modelState: document.querySelector("#modelState"),
  poseCanvas: document.querySelector("#poseCanvas"),
  predictionList: document.querySelector("#predictionList"),
};

let score = 0;
let level = 1;
let timeLeft = 60;
let lastFrame = performance.now();
let pulse = 0;
let lastGesture = "geen";
let model = null;
let webcam = null;
let poseCtx = els.poseCanvas.getContext("2d");
let maxPredictions = 0;
let lastModelActionAt = 0;
let modelLoopRunning = false;
let isPredicting = false;

const orb = {
  x: canvas.width / 2,
  y: canvas.height - 70,
  radius: 26,
  vx: 0,
  vy: 0,
};

const crystal = {
  x: 240,
  y: 180,
  radius: 24,
};

function performAction(action, source = "Keyboard") {
  const speed = Number(els.speedRange.value);
  lastGesture = action;
  els.controlMode.textContent = source;
  els.gestureText.textContent = `Actie: ${action}`;

  if (action === "hand links") orb.vx -= speed * 1.25;
  if (action === "hand rechts") orb.vx += speed * 1.25;
  if (action === "hand omhoog") orb.vy -= speed * 3.2;
  if (action === "vuist") {
    orb.vx *= 0.12;
    orb.vy *= 0.12;
    pulse = 28;
  }
}

async function startPoseModel() {
  if (!window.tmPose) {
    els.statusText.textContent = "Teachable Machine Pose is niet geladen. Refresh met Ctrl + F5.";
    return;
  }

  try {
    els.modelState.textContent = "Laden...";
    els.statusText.textContent = "Pose model wordt gestart...";
    els.predictionList.innerHTML = `<p class="empty">Model wordt geladen...</p>`;

    model = await tmPose.load(`${modelURL}model.json`, `${modelURL}metadata.json`);
    maxPredictions = model.getTotalClasses();

    webcam = new tmPose.Webcam(120, 90, true);
    await webcam.setup();
    await webcam.play();

    els.modelState.textContent = "Actief";
    els.statusText.textContent = "Eco pose model actief. Rust doet niets.";
    if (!modelLoopRunning) {
      modelLoopRunning = true;
      poseLoop();
    }
  } catch (error) {
    console.error(error);
    els.modelState.textContent = "Mislukt";
    els.statusText.textContent = "Model of webcam starten mislukt.";
    els.predictionList.innerHTML = `<p class="empty">Kon model niet starten.</p>`;
  }
}

async function poseLoop() {
  if (!model || !webcam) {
    modelLoopRunning = false;
    return;
  }

  if (!isPredicting) {
    isPredicting = true;
    webcam.update();
    await predictPose();
    isPredicting = false;
  }

  window.setTimeout(poseLoop, 260);
}

async function predictPose() {
  const { pose, posenetOutput } = await model.estimatePose(webcam.canvas);
  const predictions = await model.predict(posenetOutput);
  renderPredictions(predictions);
  drawCameraPreview();
  handlePredictions(predictions);
}

function handlePredictions(predictions) {
  const winner = predictions.slice().sort((a, b) => b.probability - a.probability)[0];
  if (!winner) return;

  const label = winner.className.trim().toLowerCase();
  const now = performance.now();

  if (label === "rust") {
    if (lastGesture !== "rust") {
      els.gestureText.textContent = "Actie: rust";
      lastGesture = "rust";
    }
    return;
  }

  if (winner.probability < 0.75 || now - lastModelActionAt < 420) return;

  if (label === "hand links") performAction("hand links", "Teachable Machine");
  if (label === "hand rechts") performAction("hand rechts", "Teachable Machine");
  if (label === "hand omhoog") performAction("hand omhoog", "Teachable Machine");
  if (label === "vuist") performAction("vuist", "Teachable Machine");

  lastModelActionAt = now;
}

function renderPredictions(predictions) {
  els.predictionList.innerHTML = "";
  predictions
    .slice()
    .sort((a, b) => b.probability - a.probability)
    .forEach((prediction) => {
      const percent = Math.round(prediction.probability * 100);
      const row = document.createElement("div");
      row.className = "prediction";
      row.innerHTML = `
        <span>${prediction.className}</span>
        <div class="bar"><span style="width: ${percent}%"></span></div>
        <strong>${percent}%</strong>
      `;
      els.predictionList.appendChild(row);
    });
}

function drawCameraPreview() {
  if (!webcam?.canvas) return;

  poseCtx.drawImage(webcam.canvas, 0, 0, els.poseCanvas.width, els.poseCanvas.height);
}

function updateGame(delta) {
  orb.vy += 0.34;
  orb.vx *= 0.985;
  orb.vy *= 0.985;
  orb.x += orb.vx;
  orb.y += orb.vy;

  if (orb.x < orb.radius || orb.x > canvas.width - orb.radius) {
    orb.vx *= -0.7;
    orb.x = Math.max(orb.radius, Math.min(canvas.width - orb.radius, orb.x));
  }

  if (orb.y < orb.radius || orb.y > canvas.height - orb.radius) {
    orb.vy *= -0.72;
    orb.y = Math.max(orb.radius, Math.min(canvas.height - orb.radius, orb.y));
  }

  const distance = Math.hypot(orb.x - crystal.x, orb.y - crystal.y);
  if (distance < orb.radius + crystal.radius) {
    score += lastGesture === "vuist" ? 3 : 1;
    els.score.textContent = score;
    randomCrystal();
    pulse = 34;
  }

  level = Math.floor(score / 8) + 1;
  els.level.textContent = level;
  timeLeft -= delta / 1000;

  if (timeLeft <= 0) {
    resetGame();
    els.statusText.textContent = "Nieuwe ronde gestart.";
  }

  els.timer.textContent = `${Math.ceil(timeLeft)}s`;
  if (pulse > 0) pulse -= 0.9;
}

function drawGame() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawStars();
  drawCrystal();
  drawOrb();
}

function drawStars() {
  ctx.fillStyle = "rgba(255,255,255,0.42)";
  for (let i = 0; i < 34; i += 1) {
    ctx.fillRect((i * 113 + score * 4) % canvas.width, (i * 61 + level * 17) % canvas.height, 1.5, 1.5);
  }
}

function drawCrystal() {
  ctx.save();
  ctx.translate(crystal.x, crystal.y);
  ctx.rotate(performance.now() / 850);
  ctx.shadowColor = "#ffd54a";
  ctx.shadowBlur = 26;
  ctx.fillStyle = "#ffd54a";
  ctx.beginPath();
  ctx.moveTo(0, -crystal.radius * 1.5);
  ctx.lineTo(crystal.radius * 1.35, crystal.radius * 1.1);
  ctx.lineTo(-crystal.radius * 1.35, crystal.radius * 1.1);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawOrb() {
  const glow = ctx.createRadialGradient(orb.x, orb.y, 6, orb.x, orb.y, orb.radius + 48 + pulse);
  glow.addColorStop(0, "rgba(100, 228, 255, 0.95)");
  glow.addColorStop(0.42, "rgba(133, 242, 166, 0.34)");
  glow.addColorStop(1, "rgba(100, 228, 255, 0)");

  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(orb.x, orb.y, orb.radius + 48 + pulse, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#e4fbff";
  ctx.beginPath();
  ctx.arc(orb.x, orb.y, orb.radius, 0, Math.PI * 2);
  ctx.fill();
}

function randomCrystal() {
  crystal.x = 70 + Math.random() * (canvas.width - 140);
  crystal.y = 70 + Math.random() * (canvas.height - 220);
}

function resetGame() {
  score = 0;
  level = 1;
  timeLeft = 60;
  lastGesture = "geen";
  orb.x = canvas.width / 2;
  orb.y = canvas.height - 70;
  orb.vx = 0;
  orb.vy = 0;
  els.score.textContent = "0";
  els.level.textContent = "1";
  els.gestureText.textContent = "Actie: geen";
  randomCrystal();
}

function gameLoop(now) {
  const delta = Math.min(40, now - lastFrame);
  lastFrame = now;
  updateGame(delta);
  drawGame();
  requestAnimationFrame(gameLoop);
}

document.addEventListener("keydown", (event) => {
  if (event.key === "ArrowLeft") performAction("hand links");
  if (event.key === "ArrowRight") performAction("hand rechts");
  if (event.key === "ArrowUp") performAction("hand omhoog");
  if (event.code === "Space") performAction("vuist");
});

document.querySelector("#leftBtn").addEventListener("click", () => performAction("hand links", "Knoppen"));
document.querySelector("#rightBtn").addEventListener("click", () => performAction("hand rechts", "Knoppen"));
document.querySelector("#upBtn").addEventListener("click", () => performAction("hand omhoog", "Knoppen"));
document.querySelector("#fistBtn").addEventListener("click", () => performAction("vuist", "Knoppen"));
document.querySelector("#startModelBtn").addEventListener("click", startPoseModel);
document.querySelector("#newMissionBtn").addEventListener("click", () => {
  randomCrystal();
  els.statusText.textContent = "Nieuwe crystal geplaatst.";
});
document.querySelector("#resetBtn").addEventListener("click", () => {
  resetGame();
  els.statusText.textContent = "Game gereset.";
});

els.speedRange.addEventListener("input", () => {
  els.speedValue.textContent = els.speedRange.value;
});

randomCrystal();
requestAnimationFrame(gameLoop);
