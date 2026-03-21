const titlePanel = document.getElementById("titlePanel");
const gamePanel = document.getElementById("gamePanel");
const boardWrap = document.getElementById("boardWrap");
const startButton = document.getElementById("startButton");
const restartButton = document.getElementById("restartButton");
const menuButton = document.getElementById("menuButton");
const audioButton = document.getElementById("audioButton");
const fullscreenButton = document.getElementById("fullscreenButton");
const modeSelect = document.getElementById("modeSelect");
const speedSelect = document.getElementById("speedSelect");
const gridSelect = document.getElementById("gridSelect");
const mapSelect = document.getElementById("mapSelect");
const fruitSelect = document.getElementById("fruitSelect");
const colorSelect = document.getElementById("colorSelect");
const wallsToggle = document.getElementById("wallsToggle");
const musicMoodSelect = document.getElementById("musicMoodSelect");
const masterVolume = document.getElementById("masterVolume");
const musicVolume = document.getElementById("musicVolume");
const sfxVolume = document.getElementById("sfxVolume");
const musicMuteToggle = document.getElementById("musicMuteToggle");
const sfxMuteToggle = document.getElementById("sfxMuteToggle");
const scoreValue = document.getElementById("scoreValue");
const bestValue = document.getElementById("bestValue");
const snakeFact = document.getElementById("snakeFact");
const factButton = document.getElementById("factButton");
const historyList = document.getElementById("historyList");
const clearHistoryButton = document.getElementById("clearHistoryButton");
const touchUp = document.getElementById("touchUp");
const touchLeft = document.getElementById("touchLeft");
const touchRight = document.getElementById("touchRight");
const touchDown = document.getElementById("touchDown");
const touchPause = document.getElementById("touchPause");
const scoreBar = document.getElementById("scoreBar");
const bestBar = document.getElementById("bestBar");
const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlayTitle");
const overlayMessage = document.getElementById("overlayMessage");
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const STORAGE_KEYS = {
  bests: "emag-ekans-mode-bests",
  history: "emag-ekans-mode-history",
  audio: "emag-ekans-audio-prefs"
};

const snakeFacts = [
  "Some snakes can go months between meals because their metabolism is extremely efficient.",
  "Snakes smell with their tongues by carrying scent particles to an organ on the roof of the mouth.",
  "Not all snakes lay eggs. Many species give birth to live young.",
  "A snake's scales are made of keratin, the same material found in human fingernails.",
  "Pythons and boas can detect heat from warm-blooded animals with specialized facial pits.",
  "Sea snakes can hold their breath for a long time while hunting underwater.",
  "The reticulated python is one of the longest snake species on Earth.",
  "Many snakes can unhinge their jaws so they can swallow prey much wider than their heads."
];

const colorThemes = {
  sage: {
    "--snake-head": "#f6a03d",
    "--snake-body": "#3d7568",
    "--food": "#ea6545"
  },
  berry: {
    "--snake-head": "#ef7f68",
    "--snake-body": "#638c78",
    "--food": "#ba455d"
  },
  mono: {
    "--snake-head": "#2f3532",
    "--snake-body": "#6a746e",
    "--food": "#a4aba6"
  },
  sunset: {
    "--snake-head": "#ff8a53",
    "--snake-body": "#7f5c86",
    "--food": "#ffd166"
  }
};

const modeConfig = {
  classic: { label: "Classic", speedScale: 1, points: 10, wrap: false, ghost: false },
  sprint: { label: "Sprint", speedScale: 0.82, points: 15, wrap: false, ghost: false },
  zen: { label: "Zen", speedScale: 1.18, points: 8, wrap: true, ghost: true }
};

const defaultAudioPrefs = {
  enabled: true,
  mood: "breeze",
  master: 0.55,
  music: 0.38,
  sfx: 0.72,
  muteMusic: false,
  muteSfx: false
};

const state = {
  tileCount: Number(gridSelect.value),
  moveDelay: Number(speedSelect.value),
  baseDelay: Number(speedSelect.value),
  solidWalls: wallsToggle.checked,
  mapName: mapSelect.value,
  fruitStyle: fruitSelect.value,
  modeName: modeSelect.value,
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
  lastTick: 0,
  swipeStart: null
};

let bestScores = loadJson(STORAGE_KEYS.bests, { classic: 0, sprint: 0, zen: 0 });
let scoreHistory = loadJson(STORAGE_KEYS.history, []);
let audioPrefs = { ...defaultAudioPrefs, ...loadJson(STORAGE_KEYS.audio, {}) };
let currentFactIndex = -1;
let scorePulseTimeout = 0;

const audioState = {
  context: null,
  masterGain: null,
  musicGain: null,
  sfxGain: null,
  beatTimer: null,
  beatStep: 0,
  phrase: 0,
  stepDuration: 0.14
};

function loadJson(key, fallback) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || "null");
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function saveAudioPrefs() {
  localStorage.setItem(STORAGE_KEYS.audio, JSON.stringify(audioPrefs));
}

function saveBestScores() {
  localStorage.setItem(STORAGE_KEYS.bests, JSON.stringify(bestScores));
}

function saveScoreHistory() {
  localStorage.setItem(STORAGE_KEYS.history, JSON.stringify(scoreHistory));
}

function getModeRules() {
  return modeConfig[state.modeName] || modeConfig.classic;
}

function getModeBest(mode = state.modeName) {
  return Number(bestScores[mode] || 0);
}

function setModeBest(score, mode = state.modeName) {
  if (score > getModeBest(mode)) {
    bestScores[mode] = score;
    saveBestScores();
  }
}

function rememberRun(score) {
  if (score <= 0) {
    return;
  }

  const entry = {
    mode: state.modeName,
    score,
    label: new Date().toLocaleDateString(undefined, { month: "short", day: "numeric" })
  };
  scoreHistory = [entry, ...scoreHistory].slice(0, 18);
  saveScoreHistory();
  renderScoreHistory();
}

function renderScoreHistory() {
  if (!historyList) {
    return;
  }

  const mode = modeSelect.value;
  const filtered = scoreHistory.filter((entry) => entry.mode === mode).slice(0, 6);
  if (filtered.length === 0) {
    historyList.innerHTML = '<li class="history-empty">No runs in this mode yet.</li>';
    return;
  }

  historyList.innerHTML = filtered
    .map((entry) => `<li><span>${entry.score} pts</span><span>${entry.label}</span></li>`)
    .join("");
}

function setRandomSnakeFact() {
  if (!snakeFact) {
    return;
  }

  let nextIndex = Math.floor(Math.random() * snakeFacts.length);
  while (snakeFacts.length > 1 && nextIndex === currentFactIndex) {
    nextIndex = Math.floor(Math.random() * snakeFacts.length);
  }

  currentFactIndex = nextIndex;
  snakeFact.textContent = `Snake Fact: ${snakeFacts[currentFactIndex]}`;
}

function applyColorTheme() {
  const theme = colorThemes[colorSelect.value] || colorThemes.sage;
  Object.entries(theme).forEach(([key, value]) => {
    document.documentElement.style.setProperty(key, value);
  });
}

function syncAudioControls() {
  musicMoodSelect.value = audioPrefs.mood;
  masterVolume.value = String(Math.round(audioPrefs.master * 100));
  musicVolume.value = String(Math.round(audioPrefs.music * 100));
  sfxVolume.value = String(Math.round(audioPrefs.sfx * 100));
  musicMuteToggle.checked = audioPrefs.muteMusic;
  sfxMuteToggle.checked = audioPrefs.muteSfx;
}

function updateAudioGains() {
  if (!audioState.masterGain) {
    return;
  }

  const now = audioState.context.currentTime;
  audioState.masterGain.gain.cancelScheduledValues(now);
  audioState.musicGain.gain.cancelScheduledValues(now);
  audioState.sfxGain.gain.cancelScheduledValues(now);
  audioState.masterGain.gain.setTargetAtTime(audioPrefs.enabled ? audioPrefs.master : 0, now, 0.03);
  audioState.musicGain.gain.setTargetAtTime(audioPrefs.muteMusic ? 0 : audioPrefs.music, now, 0.03);
  audioState.sfxGain.gain.setTargetAtTime(audioPrefs.muteSfx ? 0 : audioPrefs.sfx, now, 0.03);
}

function updateAudioButton() {
  audioButton.textContent = audioPrefs.enabled ? "Audio On" : "Audio Off";
  audioButton.setAttribute("aria-pressed", String(audioPrefs.enabled));
}

function ensureAudio() {
  if (!audioPrefs.enabled) {
    return false;
  }

  if (!audioState.context) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      return false;
    }

    audioState.context = new AudioContextClass();
    audioState.masterGain = audioState.context.createGain();
    audioState.musicGain = audioState.context.createGain();
    audioState.sfxGain = audioState.context.createGain();
    audioState.musicGain.connect(audioState.masterGain);
    audioState.sfxGain.connect(audioState.masterGain);
    audioState.masterGain.connect(audioState.context.destination);
    updateAudioGains();
  }

  if (audioState.context.state === "suspended") {
    audioState.context.resume();
  }

  updateAudioGains();
  return true;
}
function createEnvelope(type, frequency, startTime, duration, volume, destination) {
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

function playNoiseBurst(time, duration, volume, highpass, destination) {
  const size = Math.max(1, Math.floor(audioState.context.sampleRate * duration));
  const buffer = audioState.context.createBuffer(1, size, audioState.context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let index = 0; index < size; index += 1) {
    data[index] = (Math.random() * 2 - 1) * (1 - index / size);
  }
  const source = audioState.context.createBufferSource();
  const filter = audioState.context.createBiquadFilter();
  const gainNode = audioState.context.createGain();
  source.buffer = buffer;
  filter.type = "highpass";
  filter.frequency.value = highpass;
  gainNode.gain.setValueAtTime(volume, time);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, time + duration);
  source.connect(filter);
  filter.connect(gainNode);
  gainNode.connect(destination);
  source.start(time);
  source.stop(time + duration);
}

function playKick(time, volume = 0.18) {
  const oscillator = audioState.context.createOscillator();
  const gainNode = audioState.context.createGain();
  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(138, time);
  oscillator.frequency.exponentialRampToValueAtTime(42, time + 0.16);
  gainNode.gain.setValueAtTime(volume, time);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, time + 0.18);
  oscillator.connect(gainNode);
  gainNode.connect(audioState.musicGain);
  oscillator.start(time);
  oscillator.stop(time + 0.2);
}

function playSnare(time, volume = 0.08) {
  playNoiseBurst(time, 0.12, volume, 1400, audioState.musicGain);
  createEnvelope("triangle", 200, time, 0.09, volume * 0.5, audioState.musicGain);
}

function playHat(time, open = false, volume = 0.024) {
  playNoiseBurst(time, open ? 0.08 : 0.035, open ? volume * 1.4 : volume, open ? 6800 : 8000, audioState.musicGain);
}

function playBass(time, note, volume = 0.026) {
  const frequency = 55 * 2 ** (note / 12);
  createEnvelope("triangle", frequency, time, 0.2, volume, audioState.musicGain);
  createEnvelope("sine", frequency / 2, time, 0.18, volume * 0.55, audioState.musicGain);
}

function playPad(time, note, duration = 0.42, volume = 0.018) {
  const frequency = 220 * 2 ** (note / 12);
  createEnvelope("triangle", frequency, time, duration, volume, audioState.musicGain);
  createEnvelope("sine", frequency * 1.5, time, duration * 0.9, volume * 0.6, audioState.musicGain);
}

function playUiBlip(frequency = 720, duration = 0.06, type = "triangle", volume = 0.08) {
  if (!ensureAudio() || audioPrefs.muteSfx) {
    return;
  }
  createEnvelope(type, frequency, audioState.context.currentTime, duration, volume, audioState.sfxGain);
}

function playEatSound() {
  if (!ensureAudio() || audioPrefs.muteSfx) {
    return;
  }
  const now = audioState.context.currentTime;
  createEnvelope("triangle", 720, now, 0.08, 0.11, audioState.sfxGain);
  createEnvelope("sine", 940, now + 0.04, 0.1, 0.09, audioState.sfxGain);
  createEnvelope("triangle", 1260, now + 0.08, 0.12, 0.08, audioState.sfxGain);
}

function playCrashSound() {
  if (!ensureAudio() || audioPrefs.muteSfx) {
    return;
  }
  const now = audioState.context.currentTime;
  playNoiseBurst(now, 0.18, 0.13, 1200, audioState.sfxGain);
  createEnvelope("sawtooth", 120, now, 0.22, 0.09, audioState.sfxGain);
  createEnvelope("square", 74, now + 0.04, 0.2, 0.07, audioState.sfxGain);
}

function getMoodPatterns() {
  const moods = {
    breeze: {
      kicks: [[0, 8, 18, 24], [0, 10, 16, 26], [0, 8, 20, 28], [0, 12, 18, 24]],
      snares: [[8, 24], [8, 24], [8, 23, 24], [8, 24]],
      hats: [[4, 12, 20, 28], [2, 6, 14, 22, 30], [4, 10, 18, 26, 30], [3, 11, 19, 27]],
      bass: [{ 0: 0, 8: 5, 16: 3, 24: 7 }, { 0: 0, 10: 3, 16: 7, 24: 5 }, { 0: -2, 8: 5, 18: 3, 24: 8 }, { 0: 0, 12: 3, 18: 5, 24: 10 }],
      pads: [{ 0: 0, 16: 5 }, { 0: 3, 16: 7 }, { 0: -2, 16: 5 }, { 0: 0, 16: 10 }]
    },
    pulse: {
      kicks: [[0, 6, 12, 16, 22, 28], [0, 8, 14, 16, 24, 28], [0, 4, 12, 18, 24, 30], [0, 8, 12, 20, 24, 28]],
      snares: [[8, 24], [8, 20, 24], [8, 24], [8, 24, 30]],
      hats: [[2, 4, 6, 10, 14, 18, 22, 26, 30], [1, 3, 5, 9, 13, 17, 21, 25, 29], [2, 6, 10, 12, 18, 22, 26, 30], [1, 5, 9, 13, 17, 21, 25, 29]],
      bass: [{ 0: 0, 6: 3, 12: 5, 20: 7, 24: 10 }, { 0: 0, 8: 7, 14: 5, 20: 3, 24: 8 }, { 0: -2, 4: 0, 12: 5, 18: 7, 24: 3 }, { 0: 0, 8: 3, 12: 7, 20: 10, 24: 12 }],
      pads: [{ 0: 0, 16: 7 }, { 0: 3, 16: 8 }, { 0: -2, 16: 5 }, { 0: 0, 16: 12 }]
    },
    drift: {
      kicks: [[0, 12, 24], [0, 10, 22], [0, 14, 24], [0, 8, 20, 28]],
      snares: [[12, 28], [12, 28], [14, 28], [8, 24]],
      hats: [[6, 14, 22, 30], [4, 12, 18, 26], [8, 16, 24, 30], [6, 12, 20, 28]],
      bass: [{ 0: -5, 12: 0, 24: 3 }, { 0: -2, 10: 3, 22: 7 }, { 0: -5, 14: 2, 24: 5 }, { 0: -2, 8: 3, 20: 8 }],
      pads: [{ 0: -5, 16: 0 }, { 0: -2, 16: 3 }, { 0: -5, 16: 5 }, { 0: -2, 16: 8 }]
    }
  };
  return moods[audioPrefs.mood] || moods.breeze;
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

  audioState.beatTimer = window.setInterval(() => {
    if (!audioPrefs.enabled || state.paused || !state.running || audioPrefs.muteMusic) {
      return;
    }

    const patterns = getMoodPatterns();
    const phrase = audioState.phrase % patterns.kicks.length;
    const step = audioState.beatStep % 32;
    const time = audioState.context.currentTime + 0.03;

    if (patterns.kicks[phrase].includes(step)) {
      playKick(time, audioPrefs.mood === "pulse" ? 0.2 : 0.16);
    }
    if (patterns.snares[phrase].includes(step)) {
      playSnare(time, audioPrefs.mood === "drift" ? 0.06 : 0.08);
    }
    if (patterns.hats[phrase].includes(step)) {
      playHat(time, step % 8 === 6, audioPrefs.mood === "pulse" ? 0.03 : 0.022);
    }
    if (step in patterns.bass[phrase]) {
      playBass(time, patterns.bass[phrase][step], audioPrefs.mood === "drift" ? 0.02 : 0.028);
    }
    if (step in patterns.pads[phrase]) {
      playPad(time, patterns.pads[phrase][step], 0.52, audioPrefs.mood === "drift" ? 0.022 : 0.016);
    }

    audioState.beatStep += 1;
    if (audioState.beatStep % 32 === 0) {
      audioState.phrase = (audioState.phrase + 1) % patterns.kicks.length;
    }
  }, audioState.stepDuration * 1000);
}

function vibrate(pattern) {
  if (navigator.vibrate) {
    navigator.vibrate(pattern);
  }
}

function syncSettingsFromControls() {
  state.modeName = modeSelect.value;
  state.tileCount = Number(gridSelect.value);
  state.baseDelay = Math.round(Number(speedSelect.value) * getModeRules().speedScale);
  state.moveDelay = state.baseDelay;
  state.mapName = mapSelect.value;
  state.fruitStyle = fruitSelect.value;
  state.solidWalls = getModeRules().wrap ? false : wallsToggle.checked;
}

function updateHud() {
  const bestScore = getModeBest();
  scoreValue.textContent = String(state.score);
  bestValue.textContent = String(bestScore);
  scoreBar.style.width = `${Math.min(100, Math.max(10, (state.score % 100) || state.score))}%`;
  bestBar.style.width = `${Math.min(100, Math.max(12, bestScore))}%`;
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
  scorePulseTimeout = window.setTimeout(() => scoreCard.classList.remove("score-pop"), 240);
}

function shakeBoard() {
  if (!boardWrap) {
    return;
  }
  boardWrap.classList.remove("shake");
  void boardWrap.offsetWidth;
  boardWrap.classList.add("shake");
}

function resizeCanvas() {
  canvas.width = 600;
  canvas.height = 600;
}

function buildMap(mapName, tileCount) {
  if (mapName !== "gates") {
    return [];
  }

  const gates = [];
  const left = Math.max(3, Math.floor(tileCount * 0.28));
  const right = Math.min(tileCount - 4, Math.floor(tileCount * 0.72));
  const center = Math.floor(tileCount / 2);
  for (let y = 2; y < tileCount - 2; y += 1) {
    if (Math.abs(y - center) > 1) {
      gates.push({ x: left, y }, { x: right, y });
    }
  }
  return gates;
}

function resetGameState(startDirection = { x: 1, y: 0 }) {
  syncSettingsFromControls();
  state.score = 0;
  state.running = true;
  state.paused = false;
  state.lastTick = 0;
  state.particles = [];
  state.inputQueue = [];
  state.obstacles = state.modeName === "zen" ? [] : buildMap(state.mapName, state.tileCount);

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
  placeFood();
  updateHud();
  hideOverlay();
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
  state.food = openTiles[Math.floor(Math.random() * openTiles.length)] || { x: 1, y: 1 };
}

function startGame(startDirection = { x: 1, y: 0 }) {
  const normalizedDirection = startDirection && Number.isFinite(startDirection.x) && Number.isFinite(startDirection.y)
    ? startDirection
    : { x: 1, y: 0 };
  ensureAudio();
  audioState.beatStep = 0;
  audioState.phrase = Math.floor(Math.random() * 4);
  stopBeatLoop();
  startBeatLoop();
  playUiBlip(520, 0.08, "sawtooth", 0.07);
  vibrate(10);
  cancelAnimationFrame(state.animationId);
  resetGameState(normalizedDirection);
  titlePanel.classList.add("hidden");
  gamePanel.classList.remove("hidden");
  state.lastTick = performance.now();
  state.animationId = requestAnimationFrame(gameLoop);
}

function returnToMenu() {
  cancelAnimationFrame(state.animationId);
  stopBeatLoop();
  state.running = false;
  state.paused = false;
  state.inputQueue = [];
  titlePanel.classList.remove("hidden");
  gamePanel.classList.add("hidden");
  hideOverlay();
  setRandomSnakeFact();
  renderScoreHistory();
}

function pauseGame() {
  if (!state.running) {
    return;
  }
  state.paused = !state.paused;
  playUiBlip(state.paused ? 430 : 650, 0.07, "triangle", 0.06);
  vibrate(8);
  if (state.paused) {
    showOverlay("Paused", "Press space, tap pause, or swipe again to continue.");
  } else {
    hideOverlay();
    state.lastTick = performance.now();
  }
}

function endGame(message) {
  state.running = false;
  rememberRun(state.score);
  cancelAnimationFrame(state.animationId);
  spawnImpactParticles(state.snake[0]?.x ?? state.food.x, state.snake[0]?.y ?? state.food.y, "crash");
  shakeBoard();
  playCrashSound();
  vibrate([30, 40, 30]);
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

function setDirection(nextX, nextY) {
  if (!state.running || state.paused) {
    return;
  }

  const proposed = state.inputQueue[state.inputQueue.length - 1] || state.pendingDirection || state.direction;
  if (proposed.x === nextX && proposed.y === nextY) {
    return;
  }
  if (proposed.x === -nextX && proposed.y === -nextY) {
    return;
  }

  state.inputQueue.push({ x: nextX, y: nextY });
  if (state.inputQueue.length > 3) {
    state.inputQueue.shift();
  }
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

function handleTouchDirection(nextX, nextY) {
  if (tryStartFromDirection(nextX, nextY)) {
    return;
  }
  setDirection(nextX, nextY);
}

function handleCollision(nextHead, ateFood) {
  const rules = getModeRules();
  const occupiedSegments = ateFood ? state.snake : state.snake.slice(0, -1);
  const hitSelf = occupiedSegments.some((segment) => segment.x === nextHead.x && segment.y === nextHead.y);
  const hitObstacle = state.obstacles.some((segment) => segment.x === nextHead.x && segment.y === nextHead.y);

  if (rules.ghost) {
    return false;
  }

  if (hitSelf) {
    endGame("The snake tied itself in a knot.");
    return true;
  }
  if (hitObstacle) {
    endGame("Crashed into a map obstacle.");
    return true;
  }
  return false;
}

function stepGame() {
  state.previousSnake = state.snake.map((segment) => ({ ...segment }));
  if (state.inputQueue.length > 0) {
    state.pendingDirection = state.inputQueue.shift();
  }
  state.direction = state.pendingDirection;

  const rules = getModeRules();
  const head = state.snake[0];
  let nextHead = { x: head.x + state.direction.x, y: head.y + state.direction.y };

  const wrap = rules.wrap || !state.solidWalls;
  if (wrap) {
    nextHead = {
      x: (nextHead.x + state.tileCount) % state.tileCount,
      y: (nextHead.y + state.tileCount) % state.tileCount
    };
  } else if (nextHead.x < 0 || nextHead.y < 0 || nextHead.x >= state.tileCount || nextHead.y >= state.tileCount) {
    endGame("Crashed into the wall.");
    return;
  }

  const ateFood = nextHead.x === state.food.x && nextHead.y === state.food.y;
  if (handleCollision(nextHead, ateFood)) {
    return;
  }

  state.snake.unshift(nextHead);
  spawnTrailParticles(head, nextHead);

  if (ateFood) {
    state.score += rules.points;
    setModeBest(state.score);
    placeFood();
    playEatSound();
    pulseScoreCard();
    spawnImpactParticles(nextHead.x, nextHead.y, "food");
    vibrate(12);
    canvas.classList.remove("flash");
    void canvas.offsetWidth;
    canvas.classList.add("flash");
    if (state.modeName === "sprint") {
      state.moveDelay = Math.max(88, state.moveDelay - 4);
    }
  } else {
    state.snake.pop();
  }

  updateHud();
}

function getInterpolatedSnake(progress) {
  return state.snake.map((segment, index) => {
    const previous = state.previousSnake[index] || state.previousSnake[state.previousSnake.length - 1] || segment;
    let deltaX = segment.x - previous.x;
    let deltaY = segment.y - previous.y;

    if (!state.solidWalls || getModeRules().wrap) {
      if (Math.abs(deltaX) > 1) {
        deltaX += deltaX > 0 ? -state.tileCount : state.tileCount;
      }
      if (Math.abs(deltaY) > 1) {
        deltaY += deltaY > 0 ? -state.tileCount : state.tileCount;
      }
    }

    return {
      x: (previous.x + deltaX * progress + state.tileCount) % state.tileCount,
      y: (previous.y + deltaY * progress + state.tileCount) % state.tileCount
    };
  });
}

function drawBoard() {
  const tileSize = canvas.width / state.tileCount;
  const progress = state.paused || !state.running ? 1 : Math.min((performance.now() - state.lastTick) / state.moveDelay, 1);
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let x = 0; x < state.tileCount; x += 1) {
    for (let y = 0; y < state.tileCount; y += 1) {
      const tone = (x + y) % 2 === 0 ? "#c3cbc4" : "#b5bdb6";
      ctx.fillStyle = tone;
      ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
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

function drawSnake(tileSize, progress) {
  if (state.snake.length === 0) {
    return;
  }

  const root = getComputedStyle(document.documentElement);
  const snakePoints = getInterpolatedSnake(progress);
  const bodyRadius = tileSize * 0.42;
  const headRadius = tileSize * 0.52;
  const head = snakePoints[0];

  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = root.getPropertyValue("--snake-body");
  ctx.lineWidth = tileSize * 0.84;
  ctx.shadowColor = root.getPropertyValue("--snake-head");
  ctx.shadowBlur = tileSize * 0.36;
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

  ctx.fillStyle = "rgba(255,255,255,0.15)";
  ctx.beginPath();
  ctx.arc(headX - headRadius * 0.15, headY - headRadius * 0.18, headRadius * 0.46, 0, Math.PI * 2);
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
  const tongueMidX = headX + Math.cos(angle) * headRadius * 1.08;
  const tongueMidY = headY + Math.sin(angle) * headRadius * 1.08;
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
  ctx.fillStyle = root.getPropertyValue("--obstacle");
  ctx.shadowColor = root.getPropertyValue("--obstacle-shadow");
  ctx.shadowBlur = tileSize * 0.26;
  state.obstacles.forEach((segment) => {
    const x = segment.x * tileSize;
    const y = segment.y * tileSize;
    ctx.beginPath();
    ctx.moveTo(x + tileSize * 0.18, y + tileSize * 0.2);
    ctx.lineTo(x + tileSize * 0.74, y + tileSize * 0.14);
    ctx.lineTo(x + tileSize * 0.82, y + tileSize * 0.72);
    ctx.lineTo(x + tileSize * 0.24, y + tileSize * 0.8);
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
    [[-0.12, 0.05], [0.12, 0.05], [0, -0.11]].forEach(([offsetX, offsetY]) => {
      ctx.beginPath();
      ctx.arc(centerX + offsetX * tileSize, centerY + offsetY * tileSize + bob, tileSize * 0.16, 0, Math.PI * 2);
      ctx.fill();
    });
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
  if (!state.snake.length) {
    return;
  }
  const head = state.snake[0];
  const headX = head.x * tileSize + tileSize / 2;
  const headY = head.y * tileSize + tileSize / 2;
  const foodX = state.food.x * tileSize + tileSize / 2;
  const foodY = state.food.y * tileSize + tileSize / 2;

  const headLight = ctx.createRadialGradient(headX, headY, tileSize * 0.4, headX, headY, tileSize * 2.8);
  headLight.addColorStop(0, "rgba(255,181,69,0.2)");
  headLight.addColorStop(1, "rgba(255,181,69,0)");
  ctx.fillStyle = headLight;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const foodLight = ctx.createRadialGradient(foodX, foodY, tileSize * 0.2, foodX, foodY, tileSize * 2.2);
  foodLight.addColorStop(0, "rgba(242,107,77,0.22)");
  foodLight.addColorStop(1, "rgba(242,107,77,0)");
  ctx.fillStyle = foodLight;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "rgba(255,255,255,0.04)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function spawnTrailParticles(from, to) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  for (let index = 0; index < 4; index += 1) {
    state.particles.push({
      x: from.x + 0.5 - dx * 0.18,
      y: from.y + 0.5 - dy * 0.18,
      vx: -dx * 0.02 + (Math.random() - 0.5) * 0.04,
      vy: -dy * 0.02 + (Math.random() - 0.5) * 0.04,
      size: 0.08 + Math.random() * 0.08,
      life: 0.48 + Math.random() * 0.16,
      maxLife: 0.64,
      color: "rgba(61,117,104,0.26)"
    });
  }
}

function spawnImpactParticles(x, y, kind) {
  const count = kind === "crash" ? 24 : 16;
  const color = kind === "crash" ? "rgba(81,99,111,0.54)" : "rgba(242,107,77,0.48)";
  for (let index = 0; index < count; index += 1) {
    const angle = (Math.PI * 2 * index) / count + Math.random() * 0.3;
    const speed = (kind === "crash" ? 0.13 : 0.08) + Math.random() * 0.05;
    state.particles.push({
      x: x + 0.5,
      y: y + 0.5,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: kind === "crash" ? 0.12 + Math.random() * 0.1 : 0.09 + Math.random() * 0.08,
      life: kind === "crash" ? 0.9 : 0.72,
      maxLife: kind === "crash" ? 0.9 : 0.72,
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

function toggleAudio() {
  audioPrefs.enabled = !audioPrefs.enabled;
  saveAudioPrefs();
  updateAudioButton();
  if (!audioPrefs.enabled) {
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

function updateAudioPrefFromControl(control, key, scale = 100) {
  audioPrefs[key] = Number(control.value) / scale;
  saveAudioPrefs();
  updateAudioGains();
}

function syncModeUi() {
  wallsToggle.disabled = state.modeName === "zen";
  renderScoreHistory();
  updateHud();
}

function requestFullscreen() {
  const target = document.documentElement;
  if (!document.fullscreenElement && target.requestFullscreen) {
    target.requestFullscreen().catch(() => {});
  } else if (document.exitFullscreen) {
    document.exitFullscreen().catch(() => {});
  }
}

function handleSwipeStart(event) {
  const touch = event.changedTouches?.[0];
  if (!touch) {
    return;
  }
  state.swipeStart = { x: touch.clientX, y: touch.clientY };
}

function handleSwipeEnd(event) {
  const touch = event.changedTouches?.[0];
  if (!touch || !state.swipeStart) {
    return;
  }

  const deltaX = touch.clientX - state.swipeStart.x;
  const deltaY = touch.clientY - state.swipeStart.y;
  state.swipeStart = null;

  if (Math.max(Math.abs(deltaX), Math.abs(deltaY)) < 24) {
    return;
  }

  if (Math.abs(deltaX) > Math.abs(deltaY)) {
    handleTouchDirection(deltaX > 0 ? 1 : -1, 0);
  } else {
    handleTouchDirection(0, deltaY > 0 ? 1 : -1);
  }
}

document.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  const gameplayKey = ["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d", " ", "enter"].includes(key);
  if (gameplayKey && (!gamePanel.classList.contains("hidden") || !titlePanel.classList.contains("hidden"))) {
    event.preventDefault();
  }

  if (key === "arrowup" || key === "w") {
    if (tryStartFromDirection(0, -1)) return;
    setDirection(0, -1);
  } else if (key === "arrowdown" || key === "s") {
    if (tryStartFromDirection(0, 1)) return;
    setDirection(0, 1);
  } else if (key === "arrowleft" || key === "a") {
    if (tryStartFromDirection(-1, 0)) return;
    setDirection(-1, 0);
  } else if (key === "arrowright" || key === "d") {
    if (tryStartFromDirection(1, 0)) return;
    setDirection(1, 0);
  } else if (key === " ") {
    pauseGame();
  } else if (key === "enter" && !state.running) {
    startGame();
  }
});

startButton.addEventListener("click", () => startGame());
restartButton.addEventListener("click", () => startGame());
menuButton.addEventListener("click", returnToMenu);
audioButton.addEventListener("click", toggleAudio);
fullscreenButton.addEventListener("click", requestFullscreen);
factButton?.addEventListener("click", () => {
  playUiBlip(700, 0.05, "triangle", 0.05);
  setRandomSnakeFact();
});
clearHistoryButton?.addEventListener("click", () => {
  scoreHistory = scoreHistory.filter((entry) => entry.mode !== modeSelect.value);
  saveScoreHistory();
  renderScoreHistory();
});

[[touchUp, 0, -1], [touchLeft, -1, 0], [touchRight, 1, 0], [touchDown, 0, 1]].forEach(([button, x, y]) => {
  button?.addEventListener("click", () => handleTouchDirection(x, y));
});
touchPause?.addEventListener("click", pauseGame);
canvas.addEventListener("touchstart", handleSwipeStart, { passive: true });
canvas.addEventListener("touchend", handleSwipeEnd, { passive: true });

[startButton, restartButton, menuButton, audioButton, fullscreenButton, factButton, clearHistoryButton].filter(Boolean).forEach((button) => {
  button.addEventListener("pointerdown", () => playUiBlip(760, 0.05, "triangle", 0.07));
});

[modeSelect, speedSelect, gridSelect, mapSelect, fruitSelect, colorSelect, wallsToggle, musicMoodSelect].forEach((control, index) => {
  control.addEventListener("change", () => {
    if (control === colorSelect) {
      applyColorTheme();
    }
    if (control === modeSelect) {
      state.modeName = modeSelect.value;
      syncModeUi();
    }
    if (control === musicMoodSelect) {
      audioPrefs.mood = musicMoodSelect.value;
      audioState.beatStep = 0;
      audioState.phrase = 0;
      saveAudioPrefs();
    }
    playUiBlip(620 + index * 40, 0.05, "triangle", 0.05);
  });
});

masterVolume.addEventListener("input", () => updateAudioPrefFromControl(masterVolume, "master"));
musicVolume.addEventListener("input", () => updateAudioPrefFromControl(musicVolume, "music"));
sfxVolume.addEventListener("input", () => updateAudioPrefFromControl(sfxVolume, "sfx"));
musicMuteToggle.addEventListener("change", () => {
  audioPrefs.muteMusic = musicMuteToggle.checked;
  saveAudioPrefs();
  updateAudioGains();
});
sfxMuteToggle.addEventListener("change", () => {
  audioPrefs.muteSfx = sfxMuteToggle.checked;
  saveAudioPrefs();
  updateAudioGains();
});

document.addEventListener("fullscreenchange", () => {
  fullscreenButton.textContent = document.fullscreenElement ? "Exit Fullscreen" : "Fullscreen";
});
window.addEventListener("resize", resizeCanvas);

syncAudioControls();
applyColorTheme();
updateAudioButton();
resizeCanvas();
state.modeName = modeSelect.value;
syncModeUi();
setRandomSnakeFact();
drawBoard();
