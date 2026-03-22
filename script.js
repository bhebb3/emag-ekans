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
const modeDescription = document.getElementById("modeDescription");
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
const achievementList = document.getElementById("achievementList");
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
  audio: "emag-ekans-audio-prefs",
  achievements: "emag-ekans-achievements"
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
  classic: {
    label: "Classic",
    description: "Balanced endless snake with standard rules and clean arcade pacing.",
    speedScale: 1,
    points: 10,
    wrap: false,
    ghost: false
  },
  sprint: {
    label: "Sprint",
    description: "Higher score rewards and rising speed after every fruit for riskier runs.",
    speedScale: 0.82,
    points: 15,
    wrap: false,
    ghost: false
  },
  zen: {
    label: "Zen",
    description: "Relaxed wraparound play with forgiving movement and no deadly body tangles.",
    speedScale: 1.18,
    points: 8,
    wrap: true,
    ghost: true
  }
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

const achievementConfig = {
  wallDancer: { icon: "WD", name: "Wall Dancer", description: "Wrap around the board 8 times in one no-wall run." },
  zenMaster: { icon: "ZM", name: "Zen Master", description: "Score 60 points in Zen mode." },
  speedDemon: { icon: "SD", name: "Speed Demon", description: "Score 90 points in Sprint mode." },
  gateSurfer: { icon: "GS", name: "Gate Surfer", description: "Score 40 points on the Twin Gates map." },
  fruitFrenzy: { icon: "FF", name: "Fruit Frenzy", description: "Eat 12 fruit in a single run." }
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
  swipeStart: null,
  stats: null,
  usingFocusMode: false
};

let bestScores = loadJson(STORAGE_KEYS.bests, { classic: 0, sprint: 0, zen: 0 });
let scoreHistory = loadJson(STORAGE_KEYS.history, []);
let audioPrefs = { ...defaultAudioPrefs, ...loadJson(STORAGE_KEYS.audio, {}) };
let currentFactIndex = -1;
let scorePulseTimeout = 0;
let achievements = loadJson(STORAGE_KEYS.achievements, {});

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

function saveAchievements() {
  localStorage.setItem(STORAGE_KEYS.achievements, JSON.stringify(achievements));
}

function unlockAchievement(key) {
  if (achievements[key]) {
    return;
  }
  achievements[key] = true;
  saveAchievements();
  renderAchievements();
  playUiBlip(980, 0.11, "triangle", 0.08);
}

function renderAchievements() {
  if (!achievementList) {
    return;
  }

  achievementList.innerHTML = Object.entries(achievementConfig)
    .map(([key, item]) => {
      const unlocked = Boolean(achievements[key]);
      return `<li class="achievement-item ${unlocked ? "" : "locked"}"><span class="achievement-badge">${item.icon}</span><span class="achievement-copy"><strong>${item.name}</strong><span>${unlocked ? "Unlocked" : item.description}</span></span></li>`;
    })
    .join("");
}

function evaluateAchievements() {
  const stats = state.stats;
  if (!stats) {
    return;
  }

  if (!stats.solidWalls && stats.wraps >= 8) {
    unlockAchievement("wallDancer");
  }
  if (stats.mode === "zen" && state.score >= 60) {
    unlockAchievement("zenMaster");
  }
  if (stats.mode === "sprint" && state.score >= 90) {
    unlockAchievement("speedDemon");
  }
  if (stats.map === "gates" && state.score >= 40) {
    unlockAchievement("gateSurfer");
  }
  if (stats.fruits >= 12) {
    unlockAchievement("fruitFrenzy");
  }
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

function playLead(time, note, type = "triangle", duration = 0.16, volume = 0.024) {
  const frequency = 440 * 2 ** (note / 12);
  createEnvelope(type, frequency, time, duration, volume, audioState.musicGain);
}

function getMoodPatterns(scene = "game") {
  const library = {
    breeze: {
      menu: {
        kicks: [[], [], [], []],
        snares: [[], [], [], []],
        hats: [[6, 14, 22, 30], [2, 10, 18, 26], [4, 12, 20, 28], [8, 16, 24]],
        bass: [{ 0: 7, 16: 12 }, { 0: 5, 16: 10 }, { 0: 3, 16: 8 }, { 0: 7, 16: 14 }],
        pads: [{ 0: 7, 16: 12 }, { 0: 5, 16: 10 }, { 0: 3, 16: 8 }, { 0: 7, 16: 14 }],
        lead: [{ 4: 19, 12: 21, 20: 24, 28: 19 }, { 2: 17, 10: 19, 18: 21, 26: 17 }, { 6: 15, 14: 17, 22: 19, 30: 22 }, { 4: 19, 12: 24, 20: 26, 28: 24 }],
        profile: { kick: 0, snare: 0, hat: 0.018, bass: 0.016, pad: 0.024, lead: 0.026, leadType: "sine", leadDuration: 0.22 }
      },
      game: {
        kicks: [[0, 16], [0, 18], [0, 16, 24], [0, 20]],
        snares: [[8, 24], [8, 24], [8, 24], [12, 28]],
        hats: [[4, 12, 20, 28], [2, 10, 18, 26], [6, 14, 22, 30], [4, 8, 20, 24]],
        bass: [{ 0: 0, 16: 7 }, { 0: 0, 18: 5 }, { 0: 3, 16: 8 }, { 0: 5, 20: 10 }],
        pads: [{ 0: 7, 16: 12 }, { 0: 5, 16: 10 }, { 0: 3, 16: 8 }, { 0: 7, 16: 14 }],
        lead: [{ 2: 19, 10: 21, 18: 24, 26: 19 }, { 4: 17, 12: 19, 20: 21, 28: 17 }, { 6: 15, 14: 17, 22: 19, 30: 22 }, { 2: 19, 10: 24, 18: 26, 26: 24 }],
        profile: { kick: 0.08, snare: 0.05, hat: 0.02, bass: 0.018, pad: 0.018, lead: 0.022, leadType: "triangle", leadDuration: 0.18 }
      }
    },
    pulse: {
      menu: {
        kicks: [[0, 16], [0, 12, 24], [0, 18], [0, 16, 28]],
        snares: [[8, 24], [12, 28], [10, 26], [8, 24]],
        hats: [[4, 8, 12, 20, 24, 28], [2, 6, 14, 18, 22, 30], [4, 10, 16, 20, 26, 30], [6, 12, 18, 24, 28]],
        bass: [{ 0: -7, 16: -2 }, { 0: -5, 12: 0, 24: 5 }, { 0: -7, 18: -2 }, { 0: -3, 16: 2, 28: 5 }],
        pads: [{ 0: -7, 16: 0 }, { 0: -5, 16: 2 }, { 0: -3, 16: 5 }, { 0: -2, 16: 7 }],
        lead: [{ 2: 7, 6: 10, 12: 14, 18: 17, 24: 19, 30: 17 }, { 4: 5, 10: 9, 16: 12, 22: 17, 28: 21 }, { 2: 7, 8: 12, 14: 16, 20: 19, 26: 22 }, { 4: 10, 10: 14, 16: 19, 24: 22, 30: 26 }],
        profile: { kick: 0.17, snare: 0.08, hat: 0.026, bass: 0.03, pad: 0.01, lead: 0.028, leadType: "triangle", leadDuration: 0.16 }
      },
      game: {
        kicks: [[0, 5, 11, 16, 21, 27], [0, 7, 12, 16, 23, 29], [0, 4, 9, 16, 20, 25, 30], [0, 6, 12, 17, 22, 28]],
        snares: [[8, 24], [8, 24], [8, 20, 24], [8, 24, 31]],
        hats: [[2, 4, 6, 10, 14, 18, 22, 26, 30], [1, 3, 7, 9, 13, 17, 21, 25, 29], [2, 6, 10, 12, 18, 22, 26, 30], [1, 5, 9, 13, 15, 19, 23, 27, 31]],
        bass: [{ 0: -7, 5: -2, 11: 3, 16: 5, 24: 10 }, { 0: -5, 7: 0, 12: 5, 16: 7, 24: 12 }, { 0: -7, 4: -2, 9: 3, 16: 7, 20: 10, 28: 12 }, { 0: -3, 6: 2, 12: 5, 17: 9, 24: 12 }],
        pads: [{ 0: -7, 16: 5 }, { 0: -5, 16: 7 }, { 0: -3, 16: 8 }, { 0: -2, 16: 10 }],
        lead: [{ 1: 7, 3: 10, 6: 14, 9: 17, 13: 19, 18: 22, 25: 24, 30: 22 }, { 2: 5, 5: 9, 8: 12, 12: 17, 16: 19, 21: 24, 28: 26 }, { 1: 7, 4: 12, 7: 16, 10: 19, 14: 22, 18: 24, 24: 27, 30: 29 }, { 3: 10, 6: 14, 9: 17, 12: 22, 17: 24, 23: 27, 29: 31 }],
        profile: { kick: 0.21, snare: 0.09, hat: 0.03, bass: 0.032, pad: 0.008, lead: 0.03, leadType: "triangle", leadDuration: 0.09 }
      }
    },
    drift: {
      menu: {
        kicks: [[0], [0], [0], [0]],
        snares: [[], [], [], []],
        hats: [[12, 28], [8, 24], [14, 30], [10, 26]],
        bass: [{ 0: -12, 16: -5 }, { 0: -10, 16: -3 }, { 0: -8, 16: 0 }, { 0: -12, 16: 2 }],
        pads: [{ 0: -7, 16: -2 }, { 0: -5, 16: 0 }, { 0: -3, 16: 2 }, { 0: -7, 16: 5 }],
        lead: [{ 8: 2, 20: 5 }, { 6: 0, 18: 3, 30: 7 }, { 10: 2, 22: 5 }, { 12: 7, 28: 10 }],
        profile: { kick: 0.05, snare: 0, hat: 0.014, bass: 0.022, pad: 0.026, lead: 0.018, leadType: "triangle", leadDuration: 0.3 }
      },
      game: {
        kicks: [[0, 12, 24], [0, 10, 22], [0, 14, 24], [0, 8, 20, 28]],
        snares: [[12, 28], [12, 28], [14, 28], [8, 24]],
        hats: [[6, 14, 22, 30], [4, 12, 18, 26], [8, 16, 24, 30], [6, 12, 20, 28]],
        bass: [{ 0: -5, 12: 0, 24: 3 }, { 0: -2, 10: 3, 22: 7 }, { 0: -5, 14: 2, 24: 5 }, { 0: -2, 8: 3, 20: 8 }],
        pads: [{ 0: -5, 16: 0 }, { 0: -2, 16: 3 }, { 0: -5, 16: 5 }, { 0: -2, 16: 8 }],
        lead: [{ 6: 10, 18: 14, 30: 17 }, { 4: 8, 16: 12, 28: 15 }, { 8: 10, 20: 14, 30: 19 }, { 6: 12, 18: 15, 28: 20 }],
        profile: { kick: 0.08, snare: 0.04, hat: 0.016, bass: 0.022, pad: 0.024, lead: 0.02, leadType: "triangle", leadDuration: 0.24 }
      }
    }
  };

  const mood = library[audioPrefs.mood] || library.breeze;
  return mood[scene] || mood.game;
}

function stopBeatLoop() {
  if (audioState.beatTimer) {
    clearInterval(audioState.beatTimer);
    audioState.beatTimer = null;
  }
}

function refreshMusicLoop() {
  stopBeatLoop();
  if (audioPrefs.enabled) {
    audioState.beatStep = 0;
    audioState.phrase = Math.floor(Math.random() * 4);
    startBeatLoop();
  }
}

function startBeatLoop() {
  if (!ensureAudio() || audioState.beatTimer) {
    return;
  }

  audioState.beatTimer = window.setInterval(() => {
    const inMenu = !titlePanel.classList.contains("hidden") && gamePanel.classList.contains("hidden");
    if (!audioPrefs.enabled || audioPrefs.muteMusic || state.paused || (!state.running && !inMenu)) {
      return;
    }

    const scene = inMenu ? "menu" : "game";
    const patterns = getMoodPatterns(scene);
    const profile = patterns.profile;
    const phrase = audioState.phrase % patterns.kicks.length;
    const step = audioState.beatStep % 32;
    const time = audioState.context.currentTime + 0.03;

    if (patterns.kicks[phrase].includes(step) && profile.kick > 0) {
      playKick(time, profile.kick);
    }
    if (patterns.snares[phrase].includes(step) && profile.snare > 0) {
      playSnare(time, profile.snare);
    }
    if (patterns.hats[phrase].includes(step) && profile.hat > 0) {
      playHat(time, step % 8 === 6 || scene === "menu", profile.hat);
    }
    if (step in patterns.bass[phrase] && profile.bass > 0) {
      playBass(time, patterns.bass[phrase][step], profile.bass);
    }
    if (step in patterns.pads[phrase] && profile.pad > 0) {
      playPad(time, patterns.pads[phrase][step], scene === "menu" ? 0.72 : 0.52, profile.pad);
    }
    if (step in patterns.lead[phrase] && profile.lead > 0) {
      playLead(time, patterns.lead[phrase][step], profile.leadType, profile.leadDuration, profile.lead);
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

function updateModeDescription() {
  if (modeDescription) {
    modeDescription.textContent = (modeConfig[modeSelect.value] || modeConfig.classic).description;
  }
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
  const viewportWidth = window.innerWidth || 600;
  const viewportHeight = window.innerHeight || 800;
  const hudHeight = gamePanel.classList.contains("hidden") ? 0 : 170;
  const controlsHeight = window.matchMedia("(hover: none) and (pointer: coarse)").matches ? 130 : 28;
  const horizontalPadding = viewportWidth <= 720 ? 18 : 36;
  const verticalBudget = Math.max(240, viewportHeight - hudHeight - controlsHeight);
  const size = Math.max(280, Math.min(760, viewportWidth - horizontalPadding, verticalBudget));
  canvas.width = 600;
  canvas.height = 600;
  canvas.style.width = `${size}px`;
  canvas.style.height = `${size}px`;
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
  state.stats = { fruits: 0, wraps: 0, mode: state.modeName, map: state.mapName, solidWalls: state.solidWalls };

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
  refreshMusicLoop();
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
  evaluateAchievements();
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
    if (state.stats && (nextHead.x < 0 || nextHead.y < 0 || nextHead.x >= state.tileCount || nextHead.y >= state.tileCount)) {
      state.stats.wraps += 1;
    }
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
    if (state.stats) {
      state.stats.fruits += 1;
    }
    setModeBest(state.score);
    placeFood();
    playEatSound();
    pulseScoreCard();
    spawnImpactParticles(nextHead.x, nextHead.y, "food");
    vibrate(12);
    canvas.classList.remove("flash");
    void canvas.offsetWidth;
    canvas.classList.add("flash");
    evaluateAchievements();
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
  let previousPoint = null;
  snakePoints.forEach((segment, index) => {
    const px = segment.x * tileSize + tileSize / 2;
    const py = segment.y * tileSize + tileSize / 2;
    const jumped = previousPoint && (Math.abs(px - previousPoint.x) > tileSize * 1.4 || Math.abs(py - previousPoint.y) > tileSize * 1.4);
    if (index === 0 || jumped) {
      ctx.moveTo(px, py);
    } else {
      ctx.lineTo(px, py);
    }
    previousPoint = { x: px, y: py };
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
  refreshMusicLoop();
  playUiBlip(880, 0.08, "triangle", 0.08);
}

function updateAudioPrefFromControl(control, key, scale = 100) {
  audioPrefs[key] = Number(control.value) / scale;
  saveAudioPrefs();
  updateAudioGains();
}

function syncModeUi() {
  wallsToggle.disabled = state.modeName === "zen";
  updateModeDescription();
  renderScoreHistory();
  updateHud();
  if (!titlePanel.classList.contains("hidden")) {
    refreshMusicLoop();
  }
}

function toggleFocusMode(force) {
  state.usingFocusMode = force ?? !state.usingFocusMode;
  document.body.classList.toggle("focus-mode", state.usingFocusMode);
  fullscreenButton.textContent = state.usingFocusMode || document.fullscreenElement ? "Exit Fullscreen" : "Fullscreen";
  resizeCanvas();
}

function requestFullscreen() {
  const target = document.documentElement;
  if (document.fullscreenElement) {
    document.exitFullscreen?.().catch(() => toggleFocusMode(false));
    toggleFocusMode(false);
    return;
  }

  if (target.requestFullscreen) {
    target.requestFullscreen().then(() => {
      toggleFocusMode(true);
    }).catch(() => {
      toggleFocusMode();
    });
    return;
  }

  toggleFocusMode();
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
const preventTouchScroll = (event) => {
  if (!gamePanel.classList.contains("hidden")) {
    event.preventDefault();
  }
};

canvas.addEventListener("touchstart", handleSwipeStart, { passive: false });
canvas.addEventListener("touchmove", preventTouchScroll, { passive: false });
canvas.addEventListener("touchend", handleSwipeEnd, { passive: false });
boardWrap?.addEventListener("touchmove", preventTouchScroll, { passive: false });

[startButton, restartButton, menuButton, audioButton, fullscreenButton, factButton, clearHistoryButton].filter(Boolean).forEach((button) => {
  button.addEventListener("pointerdown", () => {
    playUiBlip(760, 0.05, "triangle", 0.07);
    if (!state.running) {
      refreshMusicLoop();
    }
  });
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
      saveAudioPrefs();
      refreshMusicLoop();
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
  if (!document.fullscreenElement) {
    state.usingFocusMode = false;
    document.body.classList.remove("focus-mode");
  }
  fullscreenButton.textContent = document.fullscreenElement || state.usingFocusMode ? "Exit Fullscreen" : "Fullscreen";
  resizeCanvas();
});
window.addEventListener("resize", resizeCanvas);
window.addEventListener("orientationchange", resizeCanvas);

syncAudioControls();
renderAchievements();
applyColorTheme();
updateAudioButton();
resizeCanvas();
state.modeName = modeSelect.value;
syncModeUi();
setRandomSnakeFact();
drawBoard();


























