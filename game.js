console.log("✅ Game script loading...");

const API_BASE_URL = window.API_BASE_URL || (
  window.Capacitor?.getPlatform?.() === 'android'
    ? 'http://175.20.0.198:5000'
    : window.location.protocol === 'file:' ||
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1' ||
  window.location.hostname === '0.0.0.0'
    ? 'http://localhost:5000'
    : 'http://175.20.0.198:5000'
);

// --- Canvas + Context ---
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

let gameLoopId = null;
let leaderboardRequestStarted = false;


// HUD elements
const scoreEl = document.getElementById("score");
const livesEl = document.getElementById("lives");
const nameEl = document.getElementById("name");
const bloodEl = document.getElementById("blood");
const highScoreEl = document.getElementById("highscore");
const requestAlertEl = document.getElementById("requestAlert");
const requestAlertImageEl = document.getElementById("requestAlertImage");
const requestAlertTitleEl = document.getElementById("requestAlertTitle");
const requestAlertMessageEl = document.getElementById("requestAlertMessage");

// Assets
const soundUrls = {
  ding: "assets/ding.mp3",
  sparkle: "assets/sparkle.mp3"
};
const AudioContextClass = window.AudioContext || window.webkitAudioContext;
const gameAudioContext = AudioContextClass ? new AudioContextClass() : null;
const soundBuffers = {};
const activeSoundSources = new Set();
let audioSuspendTimer = null;

if (gameAudioContext) {
  Object.entries(soundUrls).forEach(([name, url]) => {
    soundBuffers[name] = fetch(new URL(url, document.baseURI))
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status} loading ${url}`);
        }
        return response.arrayBuffer();
      })
      .then(data => gameAudioContext.decodeAudioData(data))
      .catch(error => {
        console.error(`Unable to load game sound "${name}":`, error);
        return null;
      });
  });
}

function playSound(name) {
  if (!AudioContextClass || (name !== "sparkle" && name !== "ding")) return;

  clearTimeout(audioSuspendTimer);
  const resumePromise = gameAudioContext.state === "running"
    ? Promise.resolve()
    : gameAudioContext.resume();

  Promise.all([resumePromise, soundBuffers[name]])
    .then(([, buffer]) => {
      if (!buffer || gameAudioContext.state !== "running") return;

      const source = gameAudioContext.createBufferSource();
      source.buffer = buffer;
      source.loop = false;
      source.connect(gameAudioContext.destination);
      source.onended = () => {
        activeSoundSources.delete(source);
        if (activeSoundSources.size === 0) {
          audioSuspendTimer = setTimeout(() => {
            if (gameAudioContext.state === "running" && activeSoundSources.size === 0) {
              gameAudioContext.suspend()
                .catch(error => console.error("Unable to suspend game audio:", error));
            }
          }, 250);
        }
      };
      activeSoundSources.add(source);
      source.start();
    })
    .catch(error => console.error(`Unable to play game sound "${name}":`, error));
}

const lifeImg = new Image();
lifeImg.src = "assets/heart.png";
const patientImg = new Image();
patientImg.src = "assets/player.jpg";

// Blood types + colors
const bloodTypes = ["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"];
const bloodColors = {
  "O+": "#ff0000", "O-": "#ff6600",
  "A+": "#ff3333", "A-": "#ff9999",
  "B+": "#cc0000", "B-": "#ffcc00",
  "AB+": "#990000", "AB-": "#ffff00"
};

// Blood drop images
const bloodImages = {
  "O+": "assets/bloodO+.jpg",
  "O-": "assets/bloodO-.jpg",
  "A+": "assets/bloodA+.jpg",
  "A-": "assets/bloodA-.jpg",
  "B+": "assets/bloodB+.jpg",
  "B-": "assets/bloodB-.jpg",
  "AB+": "assets/bloodAB+.jpg",
  "AB-": "assets/bloodAB-.jpg"
};

// --- Game State ---
const game = {
  running: false,
  gameOver: false,
  score: 0,
  highScore: parseInt(localStorage.getItem("highScore")) || 0,
  lives: 3,
  patients: [],
  bloodDrops: [],
  draggedDrop: null,
  feedback: "",
  feedbackTimer: 0,
  spawnTimer: 0
};

// --- Splash + Auto Login ---
window.onload = () => {
  console.log("✅ Window loaded");
  const donor = JSON.parse(localStorage.getItem("donor"));
  const splash = document.getElementById("splashScreen");
  const loginBox = document.getElementById("loginRegisterBox");
  const gameContainer = document.getElementById("gameContainer");

  if (donor) {
    splash.style.display = "none";
    showGameScreen(donor);
    resetGame();
  } else {
    setTimeout(() => {
      splash.style.opacity = "0";
      setTimeout(() => {
        splash.style.display = "none";
        loginBox.classList.remove("hidden");
        gameContainer.style.display = "none";
        showTab("loginForm");
      }, 1000);
    }, 3000);
  }
};

// --- Auth Tabs ---
function showTab(tabId) {
  document.querySelectorAll(".tab-content").forEach(div => div.classList.remove("active"));
  document.getElementById(tabId).classList.add("active");

  document.querySelectorAll(".tab-buttons button").forEach(btn => btn.classList.remove("active"));
  if (tabId === "registerForm") {
    document.getElementById("registerTab").classList.add("active");
  } else {
    document.getElementById("loginTab").classList.add("active");
  }
}

// --- Register ---
async function register() {
  const name = document.getElementById("regName").value;
  const bloodGroup = document.getElementById("regBlood").value;
  const location = document.getElementById("regLocation").value;
  const password = document.getElementById("regPassword").value;

  if (!name || !bloodGroup || !location || !password) {
    alert("Please fill all fields!");
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/donors/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, bloodGroup, location, password })
    });
    const data = await response.json();
    if (response.ok) {
      alert("Registration successful! Please login.");
      showTab("loginForm");
    } else {
      alert(data.message || "Registration failed");
    }
  } catch (err) {
    console.error(err);
    alert("Error connecting to server");
  }
}

// --- Login ---
async function loginUser() {
  const name = document.getElementById("loginName").value;
  const password = document.getElementById("loginPassword").value;

  try {
    const response = await fetch(`${API_BASE_URL}/donors/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, password })
    });
    const data = await response.json();
if (response.ok) {
  localStorage.setItem("donor", JSON.stringify(data.donor));
  joinDonorBloodGroup();

  // ✅ Load the donor's saved high score
  const savedHighScore = localStorage.getItem(`${data.donor.name}_highScore`) || 0;
  localStorage.setItem("highScore", savedHighScore);

  showGameScreen(data.donor);
  resetGame();
}
else {
      alert(data.message || "Login failed");
    }
  } catch (err) {
    console.error(err);
    alert("Error connecting to server");
  }
}

// --- Show Game ---
function showGameScreen(donor) {
  document.getElementById("loginRegisterBox").classList.add("hidden");
  document.getElementById("gameContainer").style.display = "block";

  resizeCanvas();

  nameEl.textContent = `Name: ${donor.name}`;
  bloodEl.textContent = `Blood: ${donor.bloodGroup}`;
  document.getElementById("locationHud").textContent = `Location: ${donor.location}`;
  highScoreEl.textContent = `High Score: ${game.highScore}`;
}

function logout() {
  localStorage.removeItem("donor");   // remove only donor session
  // ❌ Do not remove highScore here
  requestAlertEl.classList.remove("visible");

  document.getElementById("gameContainer").style.display = "none";
  document.getElementById("loginRegisterBox").classList.remove("hidden");

  nameEl.textContent = "Name: Guest";
  bloodEl.textContent = "Blood: O+";
  document.getElementById("locationHud").textContent = "Location: Unknown";
  scoreEl.textContent = "Score: 0";
  livesEl.textContent = "Lives: 3";
  highScoreEl.textContent = `High Score: ${localStorage.getItem("highScore") || 0}`;

  showTab("loginForm");
}


function resizeCanvas() {
  const gameContainer = document.getElementById("gameContainer");
  if (!gameContainer) return;

  const rect = gameContainer.getBoundingClientRect();
  const width = Math.round(rect.width || window.innerWidth);
  const height = Math.round(rect.height || window.visualViewport?.height || window.innerHeight);
  if (!width || !height) return;

  if (canvas.width !== width) canvas.width = width;
  if (canvas.height !== height) canvas.height = height;
}



// --- Reset Game ---
function resetGame() {
    if (gameLoopId) {
    cancelAnimationFrame(gameLoopId);
  }
  leaderboardRequestStarted = false;
  game.running = true;
  game.gameOver = false;
  game.score = 0;
  game.lives = 3;
  game.patients = [];
  game.bloodDrops = [];
  game.draggedDrop = null;
  game.feedback = "";
  game.feedbackTimer = 0;
  game.spawnTimer = 0;

  // ✅ Load high score from localStorage
  game.highScore = parseInt(localStorage.getItem("highScore") || 0, 10);

  scoreEl.textContent = `Score: ${game.score}`;
  livesEl.textContent = `Lives: ${game.lives}`;
  highScoreEl.textContent = `High Score: ${game.highScore}`;

  const patientWidth = Math.min(100, canvas.width / 4.2);
  const patientHeight = patientWidth * 0.8;
  const patientY = Math.max(120, Math.min(canvas.height * 0.24, 180));
  for (let i = 0; i < 3; i++) {
    game.patients.push({
      type: bloodTypes[Math.floor(Math.random() * bloodTypes.length)],
      x: canvas.width * (i + 1) / 4,
      y: patientY,
      width: patientWidth,
      height: patientHeight,
      collectedCount: 0
    });
  }

  gameLoopId = requestAnimationFrame(gameLoop);
}


function spawnBloodDrop() {
  game.bloodDrops.push({
    type: bloodTypes[Math.floor(Math.random() * bloodTypes.length)],
    x: Math.random() * (canvas.width - 40) + 20,
    y: 0,
    radius: 20,   // bigger radius
    vy: 1         // slower speed
  });
}

function drawLives() {
  for (let i = 0; i < game.lives; i++) {
    ctx.drawImage(lifeImg, 20 + i * 40, canvas.height - 40, 30, 30);
  }
}


function drawPatient(patient) {
  ctx.drawImage(patientImg, patient.x - patient.width/2, patient.y - patient.height/2, patient.width, patient.height);
  ctx.fillStyle = "#000";
  ctx.font = "bold 16px Arial";
  ctx.textAlign = "center";
  ctx.fillText(`Needs: ${patient.type}`, patient.x, patient.y - patient.height/2 - 10);
  ctx.fillText(`Collected: ${patient.collectedCount}`, patient.x, patient.y + patient.height/2 + 20);
}

function drawBloodDrop(drop) {
  const img = new Image();
  img.src = bloodImages[drop.type];
  ctx.drawImage(img, drop.x - 40, drop.y - 40, 80, 80); // bigger size

  // Overlay blood type text
  ctx.fillStyle = "#000";
  ctx.font = "bold 16px Arial";
  ctx.textAlign = "center";
  ctx.fillText(drop.type, drop.x, drop.y + 50);
}




function updateBloodDrops() {
  game.bloodDrops.forEach(drop => {
    drop.y += drop.vy;
  });
  game.bloodDrops = game.bloodDrops.filter(drop => drop.y < canvas.height + 50);
}



function drawHUD() {
  ctx.fillStyle = "#000";
  ctx.font = "bold 18px Arial";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText(`Score: ${game.score}`, 20, canvas.height - 60);
  drawLives();

  // Feedback messages
  if (game.feedback && game.feedbackTimer > 0) {
    ctx.font = "bold 28px Arial";
    ctx.textAlign = "center";
    if (game.feedback === "correct") {
      ctx.fillStyle = "#00cc00";
      ctx.fillText("✓ Correct!", canvas.width / 2, 200);
    } else if (game.feedback === "wrong") {
      ctx.fillStyle = "#ff0000";
      ctx.fillText("✗ Wrong!", canvas.width / 2, 200);
    }
    game.feedbackTimer--;
  }
}

// --- Collision check when drop released ---
function checkDropOnPatient() {
  if (game.draggedDrop === null) return;
  const drop = game.bloodDrops[game.draggedDrop];
  if (!drop) return;

  for (let patient of game.patients) {
    if (
      drop.x > patient.x - patient.width / 2 &&
      drop.x < patient.x + patient.width / 2 &&
      drop.y > patient.y - patient.height / 2 &&
      drop.y < patient.y + patient.height / 2
    ) {
      game.bloodDrops.splice(game.draggedDrop, 1);
      game.draggedDrop = null;

      if (drop.type === patient.type) {
        game.feedback = "correct";
        game.score += 10;
        patient.collectedCount++;
        playSound("sparkle");
        if (game.score > game.highScore) {
          game.highScore = game.score;
          localStorage.setItem("highScore", game.highScore);
          highScoreEl.textContent = `High Score: ${game.highScore}`;
        }
      } else {
        game.feedback = "wrong";
        game.lives--;
        playSound("ding");
      }

      scoreEl.textContent = `Score: ${game.score}`;
      livesEl.textContent = `Lives: ${game.lives}`;
      game.feedbackTimer = 30;
      return;
    }
  }

  // If not dropped on any patient
  game.bloodDrops.splice(game.draggedDrop, 1);
  game.draggedDrop = null;
}

// --- Pointer helpers ---
function getPointerPos(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((e.clientX - rect.left) / rect.width) * canvas.width,
    y: ((e.clientY - rect.top) / rect.height) * canvas.height
  };
}

// --- Game Loop ---
function gameLoop() {
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  // Check game over
if (game.lives <= 0) {
  game.running = false;
  game.gameOver = true;

  // ✅ Save donor's high score
  const donor = JSON.parse(localStorage.getItem("donor"));
  if (donor) {
    const key = `${donor.name}_highScore`;
    const currentHigh = parseInt(localStorage.getItem(key) || 0, 10);

    if (game.score > currentHigh) {
      localStorage.setItem(key, game.score);
      localStorage.setItem("highScore", game.score); // keep HUD in sync
    }
  }
}

  if (game.running) {
    // Draw patients
    game.patients.forEach(drawPatient);

    // Update + draw drops
    updateBloodDrops();
    game.bloodDrops.forEach(drawBloodDrop);

    // HUD
    drawHUD();

    // Spawn drops
    game.spawnTimer++;
    if (game.spawnTimer % 180 === 0) spawnBloodDrop();

    // Check game over
    if (game.lives <= 0) {
      game.running = false;
      game.gameOver = true;
    }
  }

  if (game.gameOver) {
    ctx.fillStyle = "rgba(0,0,0,0.7)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 48px Arial";
    ctx.textAlign = "center";
    ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2 - 30);
    ctx.font = "28px Arial";
    ctx.fillText(`Final Score: ${game.score}`, canvas.width / 2, canvas.height / 2 + 40);

    let totalCollected = game.patients.reduce((sum, p) => sum + p.collectedCount, 0);
    ctx.fillText(`Total Delivered: ${totalCollected}`, canvas.width / 2, canvas.height / 2 + 75);

    ctx.font = "20px Arial";
    ctx.fillStyle = "#ffff00";
    ctx.fillText("Tap anywhere to replay", canvas.width / 2, canvas.height / 2 + 130);
    highScoreEl.textContent = `High Score: ${localStorage.getItem("highScore") || 0}`;

    if (!leaderboardRequestStarted) {
      leaderboardRequestStarted = true;
      fetchLeaderboardAndDraw();
    }
    return;
  }

  requestAnimationFrame(gameLoop);
}

// --- Leaderboard ---
let leaderboardData = [];
async function fetchLeaderboardAndDraw() {
  const donor = JSON.parse(localStorage.getItem("donor") || "null");

  if (donor) {
    try {
      const saveResponse = await fetch(`${API_BASE_URL}/leaderboard`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          donorId: donor._id,
          donorName: donor.name,
          bloodGroup: donor.bloodGroup,
          score: game.score,
          lives: game.lives
        })
      });
      if (!saveResponse.ok) {
        throw new Error(`Score save failed with HTTP ${saveResponse.status}`);
      }
    } catch (err) {
      console.error("Unable to save leaderboard score:", err);
    }
  }

  try {
    const response = await fetch(`${API_BASE_URL}/leaderboard`);
    if (!response.ok) {
      throw new Error(`Leaderboard request failed with HTTP ${response.status}`);
    }
    const data = await response.json();
    if (!Array.isArray(data)) {
      throw new Error("Leaderboard response was not a list.");
    }
    const bestScoreByDonor = new Map();
    data.forEach(entry => {
      const donorKey = entry.donorId
        ? `id:${entry.donorId}`
        : `legacy:${(entry.donorName || "").trim().toLowerCase()}|${(entry.bloodGroup || "").trim().toUpperCase()}`;
      const existing = bestScoreByDonor.get(donorKey);
      if (!existing || Number(entry.score) > Number(existing.score)) {
        bestScoreByDonor.set(donorKey, entry);
      }
    });
    leaderboardData = [...bestScoreByDonor.values()]
      .sort((a, b) => Number(b.score) - Number(a.score))
      .slice(0, 5);

    ctx.fillStyle = "#fff";
    ctx.font = "bold 24px Arial";
    ctx.textAlign = "center";
    const leaderboardY = Math.min(canvas.height / 2 + 180, canvas.height - 170);
    ctx.fillText("🏆 Leaderboard", canvas.width / 2, leaderboardY);

    ctx.font = "18px Arial";
    ctx.textAlign = "left";
    if (leaderboardData.length === 0) {
      ctx.textAlign = "center";
      ctx.fillText("No scores yet", canvas.width / 2, leaderboardY + 40);
    } else {
      leaderboardData.forEach((entry, i) => {
        ctx.fillText(
          `${i + 1}. ${entry.donorName} - ${entry.score}`,
          canvas.width / 2 - 150,
          leaderboardY + 40 + i * 30
        );
      });
    }
  } catch (err) {
    console.error("❌ Error fetching leaderboard:", err);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 24px Arial";
    ctx.textAlign = "center";
    ctx.fillText("Leaderboard unavailable", canvas.width / 2, canvas.height - 100);
  }
}

// --- Pointer Events for mouse + touch ---
canvas.addEventListener("pointerdown", e => {
  if (game.gameOver) {
    e.preventDefault();
    resetGame();
    return;
  }
  if (!game.running) return;
  const pos = getPointerPos(e);
  for (let i = game.bloodDrops.length - 1; i >= 0; i--) {
    const drop = game.bloodDrops[i];
    const dist = Math.hypot(pos.x - drop.x, pos.y - drop.y);
    if (dist < drop.radius + 30) {
      game.draggedDrop = i;
      canvas.setPointerCapture?.(e.pointerId);
      e.preventDefault();
      return;
    }
  }
});

canvas.addEventListener("pointermove", e => {
  if (game.draggedDrop !== null) {
    e.preventDefault();
  }
  const pos = getPointerPos(e);
  if (game.draggedDrop !== null && game.draggedDrop < game.bloodDrops.length) {
    game.bloodDrops[game.draggedDrop].x = pos.x;
    game.bloodDrops[game.draggedDrop].y = pos.y;
    canvas.style.cursor = "grabbing";
  } else {
    canvas.style.cursor = "default";
  }
});

function endPointerDrag(e) {
  if (e) e.preventDefault();
  if (game.draggedDrop !== null) {
    checkDropOnPatient();
    game.draggedDrop = null;
  }
  canvas.style.cursor = "default";
}

canvas.addEventListener("pointerup", endPointerDrag);
canvas.addEventListener("pointercancel", endPointerDrag);
canvas.addEventListener("pointerleave", () => {
  if (game.draggedDrop === null) {
    canvas.style.cursor = "default";
  }
});
window.addEventListener("resize", resizeCanvas);
window.visualViewport?.addEventListener("resize", resizeCanvas);
window.addEventListener("orientationchange", resizeCanvas);

// --- Keyboard ---
document.addEventListener("keydown", e => {
  if (e.code === "Space" && game.gameOver) {
    e.preventDefault();
    resetGame();
  }
});
// Connect to the backend and join the current donor's blood group room.
const socket = typeof io !== 'undefined' ? io(API_BASE_URL) : { on: () => {}, emit: () => {} };

function joinDonorBloodGroup() {
  const donor = JSON.parse(localStorage.getItem("donor"));
  if (donor?.bloodGroup) {
    socket.emit("joinBloodGroup", donor.bloodGroup);
  }
}

socket.on("connect", joinDonorBloodGroup);

function showBloodRequestAlert(data) {
  const donor = JSON.parse(localStorage.getItem("donor"));
  if (!donor || donor.bloodGroup !== data.bloodGroup) {
    return;
  }

  requestAlertImageEl.src = bloodImages[data.bloodGroup];
  requestAlertImageEl.alt = `${data.bloodGroup} blood group`;
  requestAlertTitleEl.textContent = "Urgent blood request";
  requestAlertMessageEl.textContent = `${data.hospital || "A hospital"} needs ${data.bloodGroup} blood.`;
  requestAlertEl.classList.add("visible");
}

document.getElementById("dismissRequestAlert").addEventListener("click", () => {
  requestAlertEl.classList.remove("visible");
});

socket.on("requestApproved", showBloodRequestAlert);

canvas.addEventListener('touchmove', function(e) {
  e.preventDefault();
}, { passive: false });
