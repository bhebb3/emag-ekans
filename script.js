const titlePanel = document.getElementById("titlePanel");
const gamePanel = document.getElementById("gamePanel");
const startButton = document.getElementById("startButton");
const restartButton = document.getElementById("restartButton");
const menuButton = document.getElementById("menuButton");
const audioButton = document.getElementById("audioButton");
const speedSelect = document.getElementById("speedSelect");
const gridSelect = document.getElementById("gridSelect");
const mapSelect = document.getElementById("mapSelect");
const fruitSelect = document.getElementById("fruitSelect");
const wallsToggle = document.getElementById("wallsToggle");
const scoreValue = document.getElementById("scoreValue");
const bestValue = document.getElementById("bestValue");
const snakeFact = document.getElementById("snakeFact");
const factButton = document.getElementById("factButton");
const scoreBar = document.getElementById("scoreBar");
const bestBar = document.getElementById("bestBar");
const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlayTitle");
const overlayMessage = document.getElementById("overlayMessage");
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const bestScoreKey = "emag-ekans-best-score";
let bestScore = Number(localStorage.getItem(bestScoreKey) || 0);
let currentFactIndex = -1;
let scorePulseTimeout = 0;
bestValue.textContent = bestScore;

const snakeFacts = [
  "Some snakes can go months between meals because their metabolism is extremely efficient.",
  "Snakes smell with their tongues by carrying scent particles to an organ on the roof of the mouth.",
  "Not all snakes lay eggs. Many species give birth to live young.",
  "A snake's scales are made of keratin, the same material found in human fingernails.",
  "Pythons and boas can detect heat from warm-blooded animals with specialized facial pits.",
  "Sea snakes can hold their breath for a long time while hunting underwater."
];

const state = {
  tileCount: Number(gridSelect.value),
  moveDelay: Number(speedSelect.value),
  solidWalls: wallsToggle.checked,
  mapName: mapSelect.value,
  fruitStyle: fruitSelect.value,
  snake: [],
  direction: { x: 1, y: 0 },
  pendingDirection: { x: 1, y: 0 },
  inputQueue: [],
  previousSnake: [],
  food: { x: 0, y: 0 },
  obstacles: [],
  particles: [],
  score: 0,
  running: false,
  paused: false,
  animationId: 0,
  lastTick: 0
};

const audioState = {
  enabled: true,
  context: null,
  masterGain: null,
  beatTimer: null,
  beatStep: 0,
  beatInterval: (60 / 124) / 4,
  phrase: 0
};

function ensureAudio() {
  if (!audioState.enabled) {
    return false;
  }

  if (!audioState.context) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      return false;
    }

    audioState.context = new AudioContextClass();
    audioState.masterGain = audioState.context.createGain();
    audioState.masterGain.gain.value = 0.15;
    audioState.masterGain.connect(audioState.context.destination);
  }

  if (audioState.context.state === "suspended") {
    audioState.context.resume();
  }

  return true;
}

function createEnvelope(type, frequency, startTime, duration, volume, destination = audioState.masterGain) {
  const oscillator = audioState.context.createOscillator();
  const gainNode = audioState.context.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, startTime);
  gainNode.gain.setValueAtTime(volume, startTime);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
  oscillator.connect(gainNode);
  gainNode.connect(destination);
  oscillator.start(startTime);
  oscillator.stop(startTime + duration);
}

function playKick(time) {
  const oscillator = audioState.context.createOscillator();
  const gainNode = audioState.context.createGain();
  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(140, time);
  oscillator.frequency.exponentialRampToValueAtTime(42, time + 0.16);
  gainNode.gain.setValueAtTime(0.22, time);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, time + 0.18);
  oscillator.connect(gainNode);
  gainNode.connect(audioState.masterGain);
  oscillator.start(time);
  oscillator.stop(time + 0.2);
}

function playSnare(time) {
  const bufferSize = audioState.context.sampleRate * 0.12;
  const buffer = audioState.context.createBuffer(1, bufferSize, audioState.context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let index = 0; index < bufferSize; index += 1) {
    data[index] = (Math.random() * 2 - 1) * (1 - index / bufferSize);
  }
  const noise = audioState.context.createBufferSource();
  const filter = audioState.context.createBiquadFilter();
  const gainNode = audioState.context.createGain();
  noise.buffer = buffer;
  filter.type = "highpass";
  filter.frequency.value = 1400;
  gainNode.gain.setValueAtTime(0.09, time);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, time + 0.12);
  noise.connect(filter);
  filter.connect(gainNode);
  gainNode.connect(audioState.masterGain);
  noise.start(time);
  noise.stop(time + 0.12);

  createEnvelope("triangle", 210, time, 0.09, 0.045);
}

function playHat(time, open = false) {
  const bufferSize = audioState.context.sampleRate * (open ? 0.09 : 0.04);
  const buffer = audioState.context.createBuffer(1, bufferSize, audioState.context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let index = 0; index < bufferSize; index += 1) {
    data[index] = Math.random() * 2 - 1;
  }
  const noise = audioState.context.createBufferSource();
  const filter = audioState.context.createBiquadFilter();
  const gainNode = audioState.context.createGain();
  noise.buffer = buffer;
  filter.type = "highpass";
  filter.frequency.value = open ? 6800 : 8000;
  gainNode.gain.setValueAtTime(open ? 0.035 : 0.02, time);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, time + (open ? 0.09 : 0.04));
  noise.connect(filter);
  filter.connect(gainNode);
  gainNode.connect(audioState.masterGain);
  noise.start(time);
  noise.stop(time + (open ? 0.09 : 0.04));
}

function playBass(time, note) {
  const frequency = 55 * 2 ** (note / 12);
  createEnvelope("triangle", frequency, time, 0.18, 0.035);
  createEnvelope("sine", frequency / 2, time, 0.16, 0.02);
}

function playPad(time, note, duration = 0.42, volume = 0.018) {
  const frequency = 220 * 2 ** (note / 12);
  createEnvelope("triangle", frequency, time, duration, volume);
  createEnvelope("sine", frequency * 1.5, time, duration * 0.9, volume * 0.7);
}

function playUiBlip(frequency = 720, duration = 0.06, type = "triangle", volume = 0.08) {
  if (!ensureAudio()) {
    return;
  }
  createEnvelope(type, frequency, audioState.context.currentTime, duration, volume);
}

function playEatSound() {
  if (!ensureAudio()) {
    return;
  }
  const now = audioState.context.currentTime;
  createEnvelope("triangle", 740, now, 0.08, 0.12);
  createEnvelope("sine", 980, now + 0.05, 0.1, 0.1);
  createEnvelope("triangle", 1320, now + 0.1, 0.12, 0.08);
}

function playCrashSound() {
  if (!ensureAudio()) {
    return;
  }
  const now = audioState.context.currentTime;
  playSnare(now);
  createEnvelope("sawtooth", 120, now, 0.25, 0.1);
  createEnvelope("square", 80, now + 0.03, 0.22, 0.08);
}

function stopBeatLoop() {
  if (audioState.beatTimer) {
    clearInterval(audioState.beatTimer);
    audioState.beatTimer = null;
  }
}

function startBeatLoop() {
  if (!ensureAudio() || audioState.beatTimer) {
    return;
  }

  const kickPattern = [
    [0, 7, 12],
    [0, 6, 10, 14],
    [0, 5, 8, 13],
    [0, 7, 11, 15],
    [0, 4, 9, 12],
    [0, 6, 8, 13],
    [0, 5, 10, 14],
    [0, 7, 12, 15]
  ];
  const snarePattern = [
    [4, 12],
    [4, 11, 12],
    [4, 12],
    [4, 12, 15],
    [4, 12],
    [4, 12, 14],
    [4, 11, 12],
    [4, 12, 15]
  ];
  const hatPattern = [
    [2, 6, 10, 14],
    [1, 3, 6, 9, 11, 14],
    [2, 5, 8, 10, 13, 15],
    [1, 4, 7, 10, 13, 15],
    [2, 6, 9, 12, 15],
    [1, 3, 5, 8, 11, 14],
    [2, 4, 7, 10, 12, 15],
    [1, 5, 8, 10, 13, 15]
  ];
  const bassPattern = [
    { 0: 0, 4: 3, 8: 5, 12: 7 },
    { 0: 0, 3: 7, 8: 3, 11: 5 },
    { 0: -2, 4: 0, 8: 5, 12: 3 },
    { 0: 0, 5: 3, 10: 7, 14: 10 },
    { 0: 3, 4: 7, 8: 5, 12: 10 },
    { 0: -2, 4: 3, 9: 5, 12: 8 },
    { 0: 0, 6: 5, 10: 7, 14: 12 },
    { 0: 0, 4: 3, 8: 7, 12: 5 }
  ];
  const padPattern = [
    { 0: 0, 8: 5 },
    { 0: 3, 8: 7 },
    { 0: -2, 8: 5 },
    { 0: 0, 8: 10 },
    { 0: 3, 8: 8 },
    { 0: -2, 8: 7 },
    { 0: 5, 8: 10 },
    { 0: 0, 8: 12 }
  ];

  audioState.beatTimer = window.setInterval(() => {
    if (!audioState.enabled || !state.running || state.paused) {
      return;
    }

    const time = audioState.context.currentTime + 0.02;
    const step = audioState.beatStep % 16;
    const phrase = audioState.phrase % kickPattern.length;

    if (kickPattern[phrase].includes(step)) {
      playKick(time);
    }
    if (snarePattern[phrase].includes(step)) {
      playSnare(time);
    }
    if (hatPattern[phrase].includes(step)) {
      playHat(time, step === 14 || step === 15);
    }
    if (step in bassPattern[phrase]) {
      playBass(time, bassPattern[phrase][step]);
    }
    if (step in padPattern[phrase]) {
      playPad(time, padPattern[phrase][step]);
    }

    audioState.beatStep += 1;
    if (audioState.beatStep % 16 === 0) {
      audioState.phrase = (audioState.phrase + 1) % kickPattern.length;
    }
  }, audioState.beatInterval * 1000);
}

function updateAudioButton() {
  audioButton.textContent = audioState.enabled ? "Audio On" : "Audio Off";
  audioButton.setAttribute("aria-pressed", String(audioState.enabled));
}

function resetGameState(startDirection = { x: 1, y: 0 }) {
  state.tileCount = Number(gridSelect.value);
  state.moveDelay = Number(speedSelect.value);
  state.solidWalls = wallsToggle.checked;
  state.mapName = mapSelect.value;
  state.fruitStyle = fruitSelect.value;
  state.score = 0;
  state.running = true;
  state.paused = false;
  state.lastTick = 0;

  const center = Math.floor(state.tileCount / 2);
  const safeDirection = startDirection.x === 0 && startDirection.y === 0 ? { x: 1, y: 0 } : startDirection;
  state.snake = [
    { x: center, y: center },
    { x: center - safeDirection.x, y: center - safeDirection.y },
    { x: center - safeDirection.x * 2, y: center - safeDirection.y * 2 }
  ];
  state.previousSnake = state.snake.map((segment) => ({ ...segment }));
  state.direction = { ...safeDirection };
  state.pendingDirection = { ...safeDirection };
  state.inputQueue = [];
  state.obstacles = buildMap(state.mapName, state.tileCount);
  state.particles = [];
  placeFood();
  updateHud();
  hideOverlay();
}

function startGame(startDirection = { x: 1, y: 0 }) {
  const normalizedDirection =
    startDirection && Number.isFinite(startDirection.x) && Number.isFinite(startDirection.y)
      ? startDirection
      : { x: 1, y: 0 };
  ensureAudio();
  audioState.beatStep = 0;
  audioState.phrase = Math.floor(Math.random() * 8);
  stopBeatLoop();
  startBeatLoop();
  playUiBlip(540, 0.08, "sawtooth", 0.09);
  cancelAnimationFrame(state.animationId);
  resetGameState(normalizedDirection);
  titlePanel.classList.add("hidden");
  gamePanel.classList.remove("hidden");
  state.lastTick = performance.now();
  state.animationId = requestAnimationFrame(gameLoop);
}

function updateHud() {
  scoreValue.textContent = state.score;
  bestValue.textContent = bestScore;
  scoreBar.style.width = `${Math.min(100, (state.score % 100) || (state.score > 0 ? 100 : 10))}%`;
  bestBar.style.width = `${Math.min(100, Math.max(12, bestScore / 2))}%`;
}

function pulseScoreCard() {
  const scoreCard = scoreValue.closest(".hud-block");
  if (!scoreCard) {
    return;
  }

  scoreCard.classList.remove("score-pop");
  void scoreCard.offsetWidth;
  scoreCard.classList.add("score-pop");
  clearTimeout(scorePulseTimeout);
  scorePulseTimeout = window.setTimeout(() => {
    scoreCard.classList.remove("score-pop");
  }, 240);
}

function placeFood() {
  const openTiles = [];
  for (let x = 0; x < state.tileCount; x += 1) {
    for (let y = 0; y < state.tileCount; y += 1) {
      const occupied = state.snake.some((segment) => segment.x === x && segment.y === y);
      const blocked = state.obstacles.some((segment) => segment.x === x && segment.y === y);
      if (!occupied && !blocked) {
        openTiles.push({ x, y });
      }
    }
  }
  state.food = openTiles[Math.floor(Math.random() * openTiles.length)];
}

function buildMap(mapName, tileCount) {
  const center = Math.floor(tileCount / 2);
  const safeSpawnZone = new Set([
    `${center},${center}`,
    `${center - 1},${center}`,
    `${center - 2},${center}`,
    `${center + 1},${center}`,
    `${center},${center - 1}`,
    `${center},${center + 1}`
  ]);
  if (mapName === "gates") {
    const gates = [];
    const top = Math.max(3, Math.floor(tileCount * 0.28));
    const bottom = Math.min(tileCount - 4, Math.floor(tileCount * 0.72));
    for (let y = 2; y < tileCount - 2; y += 1) {
      if (y !== center && y !== center - 1) {
        gates.push({ x: top, y });
        gates.push({ x: bottom, y });
      }
    }
    return gates.filter((tile) => !safeSpawnZone.has(`${tile.x},${tile.y}`));
  }

  return [];
}

function setDirection(nextX, nextY) {
  if (!state.running || state.paused) {
    return;
  }

  const proposedDirection =
    state.inputQueue[state.inputQueue.length - 1] || state.pendingDirection || state.direction;

  if (proposedDirection.x === nextX && proposedDirection.y === nextY) {
    return;
  }

  if (proposedDirection.x === -nextX && proposedDirection.y === -nextY) {
    return;
  }

  state.inputQueue.push({ x: nextX, y: nextY });
  if (state.inputQueue.length > 2) {
    state.inputQueue.shift();
  }
}

function stepGame() {
  state.previousSnake = state.snake.map((segment) => ({ ...segment }));
  if (state.inputQueue.length > 0) {
    state.pendingDirection = state.inputQueue.shift();
  }
  state.direction = state.pendingDirection;
  const head = state.snake[0];
  let nextHead = {
    x: head.x + state.direction.x,
    y: head.y + state.direction.y
  };

  if (state.solidWalls) {
    const hitWall =
      nextHead.x < 0 ||
      nextHead.y < 0 ||
      nextHead.x >= state.tileCount ||
      nextHead.y >= state.tileCount;
    if (hitWall) {
      playCrashSound();
      endGame("Crashed into the wall.");
      return;
    }
  } else {
    nextHead = {
      x: (nextHead.x + state.tileCount) % state.tileCount,
      y: (nextHead.y + state.tileCount) % state.tileCount
    };
  }

  const ateFood = nextHead.x === state.food.x && nextHead.y === state.food.y;
  const occupiedSegments = ateFood ? state.snake : state.snake.slice(0, -1);
  const hitSelf = occupiedSegments.some(
    (segment) => segment.x === nextHead.x && segment.y === nextHead.y
  );
  const hitObstacle = state.obstacles.some(
    (segment) => segment.x === nextHead.x && segment.y === nextHead.y
  );
  if (hitSelf) {
    playCrashSound();
    endGame("The snake tied itself in a knot.");
    return;
  }

  if (hitObstacle) {
    playCrashSound();
    endGame("Crashed into a map obstacle.");
    return;
  }

  state.snake.unshift(nextHead);
  spawnTrailParticles(head, nextHead);
  if (ateFood) {
    state.score += 10;
    if (state.score > bestScore) {
      bestScore = state.score;
      localStorage.setItem(bestScoreKey, String(bestScore));
    }
    placeFood();
    playEatSound();
    pulseScoreCard();
    spawnImpactParticles(nextHead.x, nextHead.y, "food");
    canvas.classList.remove("flash");
    void canvas.offsetWidth;
    canvas.classList.add("flash");
  } else {
    state.snake.pop();
  }

  updateHud();
}

function endGame(message) {
  state.running = false;
  cancelAnimationFrame(state.animationId);
  if (state.snake[0]) {
    spawnImpactParticles(state.snake[0].x, state.snake[0].y, "crash");
  }
  updateHud();
  showOverlay("Game Over", message);
}

function showOverlay(title, message) {
  overlayTitle.textContent = title;
  overlayMessage.textContent = message;
  overlay.classList.remove("hidden");
}

function hideOverlay() {
  overlay.classList.add("hidden");
}

function drawBoard() {
  const tileSize = canvas.width / state.tileCount;
  const progress = state.paused || !state.running
    ? 1
    : Math.min((performance.now() - state.lastTick) / state.moveDelay, 1);
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let x = 0; x < state.tileCount; x += 1) {
    for (let y = 0; y < state.tileCount; y += 1) {
      const tone = (x + y) % 2 === 0 ? "#c3cbc4" : "#b5bdb6";
      ctx.fillStyle = tone;
      ctx.beginPath();
      ctx.moveTo(x * tileSize, y * tileSize);
      ctx.lineTo((x + 1) * tileSize, y * tileSize);
      ctx.lineTo((x + 1) * tileSize, (y + 1) * tileSize);
      ctx.lineTo(x * tileSize, (y + 1) * tileSize);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = "rgba(255,255,255,0.06)";
      ctx.beginPath();
      ctx.moveTo(x * tileSize, y * tileSize);
      ctx.lineTo((x + 1) * tileSize, y * tileSize);
      ctx.lineTo(x * tileSize, (y + 1) * tileSize);
      ctx.closePath();
      ctx.fill();
    }
  }

  drawObstacles(tileSize);
  drawFruit(tileSize);
  drawSnake(tileSize, progress);
  drawParticles(tileSize);
  drawLighting(tileSize);
}

function getInterpolatedSnake(progress) {
  return state.snake.map((segment, index) => {
    const previousSegment = state.previousSnake[index] || state.previousSnake[state.previousSnake.length - 1] || segment;
    let deltaX = segment.x - previousSegment.x;
    let deltaY = segment.y - previousSegment.y;
    if (!state.solidWalls) {
      if (Math.abs(deltaX) > 1) {
        deltaX += deltaX > 0 ? -state.tileCount : state.tileCount;
      }
      if (Math.abs(deltaY) > 1) {
        deltaY += deltaY > 0 ? -state.tileCount : state.tileCount;
      }
    }

    return {
      x: (previousSegment.x + deltaX * progress + state.tileCount) % state.tileCount,
      y: (previousSegment.y + deltaY * progress + state.tileCount) % state.tileCount
    };
  });
}

function drawSnake(tileSize, progress) {
  if (state.snake.length === 0) {
    return;
  }
  const root = getComputedStyle(document.documentElement);
  const snakePoints = getInterpolatedSnake(progress);
  const bodyRadius = tileSize * 0.4;
  const headRadius = tileSize * 0.5;
  const head = snakePoints[0];

  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = root.getPropertyValue("--snake-body");
  ctx.lineWidth = tileSize * 0.8;
  ctx.shadowColor = "rgba(73, 242, 194, 0.34)";
  ctx.shadowBlur = tileSize * 0.32;
  ctx.beginPath();
  snakePoints.forEach((segment, index) => {
    const px = segment.x * tileSize + tileSize / 2;
    const py = segment.y * tileSize + tileSize / 2;
    if (index === 0) {
      ctx.moveTo(px, py);
    } else {
      ctx.lineTo(px, py);
    }
  });
  ctx.stroke();

  for (let index = snakePoints.length - 1; index >= 1; index -= 1) {
    const segment = snakePoints[index];
    const px = segment.x * tileSize + tileSize / 2;
    const py = segment.y * tileSize + tileSize / 2;
    ctx.fillStyle = root.getPropertyValue("--snake-body");
    ctx.beginPath();
    ctx.arc(px, py, bodyRadius, 0, Math.PI * 2);
    ctx.fill();
  }

  const headX = head.x * tileSize + tileSize / 2;
  const headY = head.y * tileSize + tileSize / 2;
  ctx.fillStyle = root.getPropertyValue("--snake-head");
  ctx.beginPath();
  ctx.arc(headX, headY, headRadius, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(255, 255, 255, 0.16)";
  ctx.beginPath();
  ctx.arc(headX - headRadius * 0.16, headY - headRadius * 0.18, headRadius * 0.48, 0, Math.PI * 2);
  ctx.fill();

  drawSnakeFace(headX, headY, headRadius);
  ctx.shadowBlur = 0;
}

function drawSnakeFace(headX, headY, headRadius) {
  const angle = Math.atan2(state.direction.y, state.direction.x);
  const eyeOffsetAngle = Math.PI / 2;
  const eyeDistance = headRadius * 0.42;
  const eyeRadius = Math.max(2, headRadius * 0.12);
  const eyeForward = headRadius * 0.14;

  const leftEyeX = headX + Math.cos(angle - eyeOffsetAngle) * eyeDistance + Math.cos(angle) * eyeForward;
  const leftEyeY = headY + Math.sin(angle - eyeOffsetAngle) * eyeDistance + Math.sin(angle) * eyeForward;
  const rightEyeX = headX + Math.cos(angle + eyeOffsetAngle) * eyeDistance + Math.cos(angle) * eyeForward;
  const rightEyeY = headY + Math.sin(angle + eyeOffsetAngle) * eyeDistance + Math.sin(angle) * eyeForward;

  ctx.fillStyle = "#10263d";
  ctx.beginPath();
  ctx.arc(leftEyeX, leftEyeY, eyeRadius, 0, Math.PI * 2);
  ctx.arc(rightEyeX, rightEyeY, eyeRadius, 0, Math.PI * 2);
  ctx.fill();

  const tongueStartX = headX + Math.cos(angle) * headRadius * 0.72;
  const tongueStartY = headY + Math.sin(angle) * headRadius * 0.72;
  const tongueMidX = headX + Math.cos(angle) * headRadius * 1.1;
  const tongueMidY = headY + Math.sin(angle) * headRadius * 1.1;
  const forkOffsetX = Math.cos(angle + Math.PI / 2) * headRadius * 0.14;
  const forkOffsetY = Math.sin(angle + Math.PI / 2) * headRadius * 0.14;

  ctx.strokeStyle = "#ff5a7d";
  ctx.lineWidth = Math.max(2, headRadius * 0.09);
  ctx.beginPath();
  ctx.moveTo(tongueStartX, tongueStartY);
  ctx.lineTo(tongueMidX, tongueMidY);
  ctx.lineTo(tongueMidX + forkOffsetX, tongueMidY + forkOffsetY);
  ctx.moveTo(tongueMidX, tongueMidY);
  ctx.lineTo(tongueMidX - forkOffsetX, tongueMidY - forkOffsetY);
  ctx.stroke();
}

function drawObstacles(tileSize) {
  const root = getComputedStyle(document.documentElement);
  const obstacle = root.getPropertyValue("--obstacle");
  const obstacleShadow = root.getPropertyValue("--obstacle-shadow");
  state.obstacles.forEach((segment) => {
    ctx.fillStyle = obstacle;
    ctx.shadowColor = obstacleShadow;
    ctx.shadowBlur = tileSize * 0.3;
    const x = segment.x * tileSize;
    const y = segment.y * tileSize;
    ctx.beginPath();
    ctx.moveTo(x + tileSize * 0.18, y + tileSize * 0.2);
    ctx.lineTo(x + tileSize * 0.74, y + tileSize * 0.14);
    ctx.lineTo(x + tileSize * 0.82, y + tileSize * 0.72);
    ctx.lineTo(x + tileSize * 0.24, y + tileSize * 0.8);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    ctx.beginPath();
    ctx.moveTo(x + tileSize * 0.18, y + tileSize * 0.2);
    ctx.lineTo(x + tileSize * 0.74, y + tileSize * 0.14);
    ctx.lineTo(x + tileSize * 0.54, y + tileSize * 0.42);
    ctx.closePath();
    ctx.fill();
  });
  ctx.shadowBlur = 0;
}

function drawFruit(tileSize) {
  const root = getComputedStyle(document.documentElement);
  const centerX = state.food.x * tileSize + tileSize / 2;
  const centerY = state.food.y * tileSize + tileSize / 2;
  const bob = Math.sin(performance.now() / 180) * tileSize * 0.06;
  ctx.fillStyle = root.getPropertyValue("--food");
  ctx.strokeStyle = "#fff5d8";
  ctx.lineWidth = Math.max(2, tileSize * 0.07);
  ctx.shadowColor = "rgba(242, 107, 77, 0.25)";
  ctx.shadowBlur = tileSize * 0.3;

  if (state.fruitStyle === "berry") {
    for (const [offsetX, offsetY] of [[-0.12, 0.05], [0.12, 0.05], [0, -0.11]]) {
      ctx.beginPath();
      ctx.arc(centerX + offsetX * tileSize, centerY + offsetY * tileSize + bob, tileSize * 0.16, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
    return;
  }

  if (state.fruitStyle === "star") {
    ctx.beginPath();
    for (let point = 0; point < 10; point += 1) {
      const angle = -Math.PI / 2 + (Math.PI / 5) * point;
      const radius = point % 2 === 0 ? tileSize * 0.28 : tileSize * 0.12;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius + bob;
      if (point === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    return;
  }

  ctx.beginPath();
  ctx.arc(centerX, centerY + bob, tileSize * 0.24, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(centerX, centerY - tileSize * 0.18 + bob);
  ctx.quadraticCurveTo(centerX + tileSize * 0.1, centerY - tileSize * 0.32 + bob, centerX + tileSize * 0.18, centerY - tileSize * 0.2 + bob);
  ctx.stroke();
  ctx.shadowBlur = 0;
}

function drawLighting(tileSize) {
  if (state.snake.length === 0) {
    return;
  }
  const head = state.snake[0];
  if (!head) {
    return;
  }

  const headX = head.x * tileSize + tileSize / 2;
  const headY = head.y * tileSize + tileSize / 2;
  const foodX = state.food.x * tileSize + tileSize / 2;
  const foodY = state.food.y * tileSize + tileSize / 2;

  const headLight = ctx.createRadialGradient(headX, headY, tileSize * 0.4, headX, headY, tileSize * 2.8);
  headLight.addColorStop(0, "rgba(255, 181, 69, 0.2)");
  headLight.addColorStop(1, "rgba(255, 181, 69, 0)");
  ctx.fillStyle = headLight;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const foodLight = ctx.createRadialGradient(foodX, foodY, tileSize * 0.2, foodX, foodY, tileSize * 2.2);
  foodLight.addColorStop(0, "rgba(242, 107, 77, 0.22)");
  foodLight.addColorStop(1, "rgba(242, 107, 77, 0)");
  ctx.fillStyle = foodLight;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "rgba(255,255,255,0.04)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function spawnTrailParticles(from, to) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  for (let index = 0; index < 3; index += 1) {
    state.particles.push({
      x: from.x + 0.5 - dx * 0.18,
      y: from.y + 0.5 - dy * 0.18,
      vx: -dx * 0.02 + (Math.random() - 0.5) * 0.04,
      vy: -dy * 0.02 + (Math.random() - 0.5) * 0.04,
      size: 0.08 + Math.random() * 0.08,
      life: 0.45 + Math.random() * 0.15,
      maxLife: 0.6,
      color: "rgba(61,117,104,0.22)"
    });
  }
}

function spawnImpactParticles(x, y, kind) {
  const count = kind === "crash" ? 22 : 14;
  const color = kind === "crash" ? "rgba(81,99,111,0.5)" : "rgba(242,107,77,0.42)";
  for (let index = 0; index < count; index += 1) {
    const angle = (Math.PI * 2 * index) / count + Math.random() * 0.25;
    const speed = (kind === "crash" ? 0.12 : 0.08) + Math.random() * 0.05;
    state.particles.push({
      x: x + 0.5,
      y: y + 0.5,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: kind === "crash" ? 0.12 + Math.random() * 0.1 : 0.09 + Math.random() * 0.08,
      life: kind === "crash" ? 0.9 : 0.7,
      maxLife: kind === "crash" ? 0.9 : 0.7,
      color
    });
  }
}

function drawParticles(tileSize) {
  const delta = Math.min(0.032, Math.max(0.012, state.moveDelay / 1000 / 3));
  state.particles = state.particles.filter((particle) => {
    particle.x += particle.vx;
    particle.y += particle.vy;
    particle.vx *= 0.96;
    particle.vy *= 0.96;
    particle.life -= delta;

    if (particle.life <= 0) {
      return false;
    }

    const alpha = particle.life / particle.maxLife;
    ctx.fillStyle = particle.color.replace(/[\d.]+\)$/, `${alpha})`);
    ctx.beginPath();
    ctx.arc(particle.x * tileSize, particle.y * tileSize, particle.size * tileSize, 0, Math.PI * 2);
    ctx.fill();
    return true;
  });
}

function gameLoop(timestamp) {
  if (!state.running) {
    drawBoard();
    return;
  }

  if (!state.paused && timestamp - state.lastTick >= state.moveDelay) {
    stepGame();
    state.lastTick = timestamp;
    if (!state.running) {
      drawBoard();
      return;
    }
  }

  drawBoard();
  state.animationId = requestAnimationFrame(gameLoop);
}

function pauseGame() {
  if (!state.running) {
    return;
  }
  state.paused = !state.paused;
  playUiBlip(state.paused ? 420 : 640, 0.07, "triangle", 0.08);
  updateHud();
  if (state.paused) {
    showOverlay("Paused", "Press space to jump back in.");
  } else {
    hideOverlay();
  }
}

function returnToMenu() {
  cancelAnimationFrame(state.animationId);
  state.running = false;
  state.paused = false;
  state.inputQueue = [];
  canvas.classList.remove("flash");
  titlePanel.classList.remove("hidden");
  gamePanel.classList.add("hidden");
  hideOverlay();
  updateHud();
}

function toggleAudio() {
  audioState.enabled = !audioState.enabled;
  updateAudioButton();
  if (!audioState.enabled) {
    stopBeatLoop();
    if (audioState.context && audioState.context.state === "running") {
      audioState.context.suspend();
    }
    return;
  }

  ensureAudio();
  startBeatLoop();
  playUiBlip(880, 0.08, "triangle", 0.08);
}

function setRandomSnakeFact() {
  if (!snakeFact) {
    return;
  }

  let nextIndex = Math.floor(Math.random() * snakeFacts.length);
  if (snakeFacts.length > 1) {
    while (nextIndex === currentFactIndex) {
      nextIndex = Math.floor(Math.random() * snakeFacts.length);
    }
  }

  currentFactIndex = nextIndex;
  snakeFact.textContent = `Snake Fact: ${snakeFacts[currentFactIndex]}`;
}

function tryStartFromDirection(nextX, nextY) {
  const direction = { x: nextX, y: nextY };
  if (!titlePanel.classList.contains("hidden")) {
    startGame(direction);
    return true;
  }

  if (!state.running && !gamePanel.classList.contains("hidden")) {
    startGame(direction);
    return true;
  }

  return false;
}

document.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  const gameplayKey = ["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d", " "].includes(key);

  if (gameplayKey && (!gamePanel.classList.contains("hidden") || !titlePanel.classList.contains("hidden"))) {
    event.preventDefault();
  }

  if (key === "arrowup" || key === "w") {
    if (tryStartFromDirection(0, -1)) {
      return;
    }
    setDirection(0, -1);
  } else if (key === "arrowdown" || key === "s") {
    if (tryStartFromDirection(0, 1)) {
      return;
    }
    setDirection(0, 1);
  } else if (key === "arrowleft" || key === "a") {
    if (tryStartFromDirection(-1, 0)) {
      return;
    }
    setDirection(-1, 0);
  } else if (key === "arrowright" || key === "d") {
    if (tryStartFromDirection(1, 0)) {
      return;
    }
    setDirection(1, 0);
  } else if (key === " ") {
    pauseGame();
  } else if (key === "enter" && !state.running && !titlePanel.classList.contains("hidden")) {
    startGame();
  }
});

startButton.addEventListener("click", () => startGame());
restartButton.addEventListener("click", () => startGame());
menuButton.addEventListener("click", () => {
  setRandomSnakeFact();
  returnToMenu();
});
audioButton.addEventListener("click", toggleAudio);
if (factButton) {
  factButton.addEventListener("click", () => {
    playUiBlip(700, 0.05, "triangle", 0.05);
    setRandomSnakeFact();
  });
}

[startButton, restartButton, menuButton, audioButton].forEach((button) => {
  button.addEventListener("pointerdown", () => {
    playUiBlip(760, 0.05, "triangle", 0.07);
  });
});

[speedSelect, gridSelect, mapSelect, fruitSelect, wallsToggle].forEach((control, index) => {
  control.addEventListener("change", () => {
    playUiBlip(620 + index * 55, 0.05, "triangle", 0.05);
  });
});

updateAudioButton();
setRandomSnakeFact();
drawBoard();



