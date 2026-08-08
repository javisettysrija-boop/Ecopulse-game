const canvas = document.querySelector('#game-canvas');
const context = canvas.getContext('2d');
const overlay = document.querySelector('#game-overlay');
const startButton = document.querySelector('#start-button');
const coordinates = document.querySelector('#coordinates');
const gameFrame = document.querySelector('.game-frame');
const emergencyPanel = document.querySelector('#emergency-panel');
const emergencyName = document.querySelector('#emergency-name');
const clueList = document.querySelector('#clue-list');
const responseGrid = document.querySelector('#response-grid');
const countdown = document.querySelector('#countdown');
const decisionFeedback = document.querySelector('#decision-feedback');
const scoreReadout = document.querySelector('#score');
const comboReadout = document.querySelector('#combo');
const stabilityReadout = document.querySelector('#stability');
const stabilityBar = document.querySelector('#stability-bar');
const multiplierReadout = document.querySelector('#multiplier');
const endPanel = document.querySelector('#end-panel');
const endKicker = document.querySelector('#end-kicker');
const endTitle = document.querySelector('#end-title');
const finalScore = document.querySelector('#final-score');
const finalSolved = document.querySelector('#final-solved');
const finalAccuracy = document.querySelector('#final-accuracy');
const finalCombo = document.querySelector('#final-combo');
const finalStability = document.querySelector('#final-stability');
const playAgainButton = document.querySelector('#play-again');
const mainMenuButton = document.querySelector('#main-menu');
const solvedCountReadout = document.querySelector('#solved-count');
const mainMenuView = document.querySelector('#main-menu-view');
const howToPlayView = document.querySelector('#how-to-play-view');
const creditsView = document.querySelector('#credits-view');
const howToPlayButton = document.querySelector('#how-to-play');
const creditsButton = document.querySelector('#credits');
const muteToggle = document.querySelector('#mute-toggle');
const warningPanel = document.querySelector('#warning-panel');
const scorePop = document.querySelector('#score-pop');
const difficultyLevelReadout = document.querySelector('#difficulty-level');
const musicVolumeControl = document.querySelector('#music-volume');
const sfxVolumeControl = document.querySelector('#sfx-volume');

const world = { width: canvas.width, height: canvas.height, margin: 24 };
const player = { x: 460, y: 280, radius: 12, speed: 250 };
const keys = new Set();
let isPlaying = false;
let lastTime = 0;
let animationFrame = 0;
let emergencyTimer = 0;
let emergencyClockTimer = 0;
let warningTimer = 0;
let score = 0;
let combo = 0;
let stability = 100;
let solvedEmergencies = 0;
let attemptedEmergencies = 0;
let correctAnswers = 0;
let highestCombo = 0;
let multiplier = 1;
const emergencyState = { active: false, warning: false, locked: false, index: 0, deadline: 0 };

const audioManager = (() => {
  let audioContext = null;
  let musicGain = null;
  let sfxGain = null;
  let analyser = null;
  let musicTimer = 0;
  let musicStep = 0;
  let musicVolume = Number(sessionStorage.getItem('ecopulse-music-volume') ?? 0.25);
  let sfxVolume = Number(sessionStorage.getItem('ecopulse-sfx-volume') ?? 0.6);
  let muted = sessionStorage.getItem('ecopulse-muted') === 'true';
  let musicPlaying = false;
  const notes = [196, 246.94, 293.66, 246.94, 220, 277.18, 329.63, 277.18];
  function ensureContext() {
    if (audioContext) return true;
    try {
      const AudioCtor = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtor) return false;
      audioContext = new AudioCtor();
      musicGain = audioContext.createGain(); sfxGain = audioContext.createGain(); analyser = audioContext.createAnalyser(); analyser.fftSize = 256;
      musicGain.connect(analyser); sfxGain.connect(analyser); analyser.connect(audioContext.destination);
      updateGains();
      return true;
    } catch { return false; }
  }
  function updateGains() {
    if (!musicGain || !sfxGain) return;
    musicGain.gain.setTargetAtTime(muted ? 0 : musicVolume, audioContext.currentTime, 0.04);
    sfxGain.gain.setTargetAtTime(muted ? 0 : sfxVolume, audioContext.currentTime, 0.02);
  }
  function resumeContext() {
    if (!ensureContext()) return false;
    if (audioContext.state === 'suspended') audioContext.resume().catch(() => {});
    return true;
  }
  function tone(frequency, duration = 0.12, type = 'sine', volume = 0.16, bus = sfxGain) {
    if (!resumeContext() || muted || !bus) return;
    const oscillator = audioContext.createOscillator(); const gain = audioContext.createGain();
    oscillator.type = type; oscillator.frequency.value = frequency; gain.gain.setValueAtTime(0.0001, audioContext.currentTime); gain.gain.exponentialRampToValueAtTime(volume, audioContext.currentTime + 0.015); gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + duration);
    oscillator.connect(gain); gain.connect(bus); oscillator.start(); oscillator.stop(audioContext.currentTime + duration + 0.02);
  }
  function playPattern(pattern) { if (!resumeContext()) return; pattern.forEach(([frequency, duration, type, volume], index) => window.setTimeout(() => tone(frequency, duration, type, volume, sfxGain), index * 100)); }
  function playClick() { playPattern([[520, 0.06, 'square', 0.1]]); }
  function playWarning() { playPattern([[180, 0.16, 'sawtooth', 0.24], [130, 0.2, 'sawtooth', 0.2]]); }
  function playCorrect() { playPattern([[523, 0.12, 'sine', 0.2], [659, 0.18, 'sine', 0.18]]); }
  function playWrong() { playPattern([[180, 0.2, 'square', 0.2]]); }
  function playTimeout() { playPattern([[130, 0.22, 'sawtooth', 0.2], [100, 0.25, 'sawtooth', 0.16]]); }
  function playCombo(level) { playPattern(level >= 3 ? [[659, 0.1, 'sine', 0.2], [784, 0.1, 'sine', 0.2], [988, 0.25, 'sine', 0.22]] : [[659, 0.1, 'sine', 0.18], [784, 0.2, 'sine', 0.2]]); }
  function playVictory() { playPattern([[523, 0.12, 'sine', 0.2], [659, 0.12, 'sine', 0.2], [784, 0.3, 'sine', 0.22]]); }
  function playGameOver() { playPattern([[220, 0.22, 'sawtooth', 0.2], [165, 0.3, 'sawtooth', 0.16]]); }
  function playMusic() {
    if (!resumeContext() || musicPlaying) return;
    musicPlaying = true;
    musicTimer = window.setInterval(() => tone(notes[musicStep++ % notes.length], 0.55, 'triangle', 0.15, musicGain), 900);
  }
  function stopMusic() { if (musicTimer) window.clearInterval(musicTimer); musicTimer = 0; musicPlaying = false; if (musicGain && audioContext) musicGain.gain.setTargetAtTime(0, audioContext.currentTime, 0.12); }
  function pauseMusic() { stopMusic(); }
  function resumeMusic() { playMusic(); }
  function setMuted(nextMuted) { muted = nextMuted; sessionStorage.setItem('ecopulse-muted', String(muted)); updateGains(); muteToggle.textContent = muted ? 'SOUND OFF' : 'SOUND ON'; muteToggle.setAttribute('aria-pressed', String(muted)); muteToggle.setAttribute('aria-label', muted ? 'Unmute audio' : 'Mute audio'); }
  function setMusicVolume(value) { musicVolume = Number(value); sessionStorage.setItem('ecopulse-music-volume', String(musicVolume)); updateGains(); }
  function setSfxVolume(value) { sfxVolume = Number(value); sessionStorage.setItem('ecopulse-sfx-volume', String(sfxVolume)); updateGains(); }
  setMuted(muted); musicVolumeControl.value = String(Math.round(musicVolume * 100)); sfxVolumeControl.value = String(Math.round(sfxVolume * 100));
  return { playClick, playWarning, playCorrect, playWrong, playTimeout, playCombo, playVictory, playGameOver, playMusic, stopMusic, pauseMusic, resumeMusic, setMuted, setMusicVolume, setSfxVolume, isMuted: () => muted };
})();

const emergencies = [
  {
    name: 'FOREST FIRE',
    clues: ['Smoke is visible near the forest.', 'Temperature is rapidly increasing.', 'Trees are beginning to dry.'],
    focusClues: ['Smoke is concentrated along the west tree line.', 'Temperature spikes are moving with the wind.', 'Dry canopy readings are spreading beyond the trail.'],
    criticalClues: ['Thermal bloom detected under dense canopy.', 'Wind is carrying heat toward the village.', 'Moisture readings have collapsed across the forest edge.'],
    responses: [
      { label: 'Deploy Fire Drone', correct: true }, { label: 'Activate Water Purifier', correct: false, explanation: 'Purification cannot stop a spreading canopy fire.' }, { label: 'Deploy Cleanup Bot', correct: false, explanation: 'Cleanup bots cannot safely operate in active fire zones.' }
    ]
  },
  {
    name: 'WATER CONTAMINATION',
    clues: ['River water is becoming dark.', 'Fish are disappearing.', 'Water quality is falling.'],
    focusClues: ['Dark water is moving downstream from the intake.', 'Fish are vanishing from the shallow channel.', 'Water quality is falling in multiple samples.'],
    criticalClues: ['A contamination plume is crossing the main channel.', 'Aquatic life has abandoned every monitored zone.', 'Water quality is below the safe recovery threshold.'],
    responses: [
      { label: 'Activate Water Purifier', correct: true }, { label: 'Deploy Crop Scanner', correct: false, explanation: 'A crop scanner can diagnose fields, not contaminated water.' }, { label: 'Activate Flood Barrier', correct: false, explanation: 'A barrier controls water levels but cannot remove pollutants.' }
    ]
  },
  {
    name: 'CROP DISEASE',
    clues: ['Crop leaves have unusual spots.', 'Plant growth is slowing.', 'Several crops are becoming unhealthy.'],
    focusClues: ['Spots are appearing in repeating patterns across rows.', 'Growth is slowing in the most exposed beds.', 'Plant health is falling from north to south.'],
    criticalClues: ['Leaf damage is crossing the farm irrigation line.', 'Growth has stalled in three consecutive readings.', 'The crop health signal is spreading between beds.'],
    responses: [
      { label: 'Deploy Crop Scanner', correct: true }, { label: 'Deploy Fire Drone', correct: false, explanation: 'Heat response would damage an already stressed crop.' }, { label: 'Deploy Cleanup Bot', correct: false, explanation: 'Waste collection will not identify a crop-borne disease.' }
    ]
  },
  {
    name: 'FLOOD',
    clues: ['Water level is rising.', 'Heavy rain is occurring.', 'Paths near the river are becoming flooded.'],
    focusClues: ['Water is rising faster at each bridge marker.', 'Rainfall is saturating the village basin.', 'The lower path is no longer passable.'],
    criticalClues: ['Water has reached the village access line.', 'Rainfall is exceeding the drainage capacity.', 'Both river paths are approaching full submersion.'],
    responses: [
      { label: 'Activate Flood Barrier', correct: true }, { label: 'Activate Water Purifier', correct: false, explanation: 'Purification does not prevent rising water from entering the village.' }, { label: 'Deploy Fire Drone', correct: false, explanation: 'Fire response equipment cannot control a flood.' }
    ]
  },
  {
    name: 'PLASTIC POLLUTION',
    clues: ['Plastic waste is appearing near the river.', 'Recycling bins are overflowing.', 'Wildlife is being affected.'],
    focusClues: ['Plastic waste is collecting at both river bends.', 'Recycling bins are overflowing into the path.', 'Wildlife movement has changed near the debris.'],
    criticalClues: ['Plastic waste is blocking the downstream filter.', 'Overflow has spread beyond the recycling station.', 'Wildlife is trapped near multiple waste clusters.'],
    responses: [
      { label: 'Deploy Cleanup Bot', correct: true }, { label: 'Activate Flood Barrier', correct: false, explanation: 'A barrier redirects water but leaves plastic waste behind.' }, { label: 'Deploy Crop Scanner', correct: false, explanation: 'Crop diagnostics cannot remove debris from the environment.' }
    ]
  }
];

const regions = [
  { name: 'FOREST', x: 42, y: 44, width: 292, height: 188, color: '#1c513f', accent: '#8dcc73' },
  { name: 'FARM', x: 42, y: 328, width: 292, height: 168, color: '#8b733d', accent: '#f0ca73' },
  { name: 'VILLAGE', x: 348, y: 44, width: 220, height: 452, color: '#6d7561', accent: '#d8e4b0' },
  { name: 'RECYCLING STATION', x: 668, y: 44, width: 250, height: 188, color: '#39716a', accent: '#8ce3c8' },
  { name: 'AI GUARDIAN', x: 668, y: 328, width: 250, height: 168, color: '#32476a', accent: '#97b9ef' }
];

const paths = [
  { x: 286, y: 116, width: 210, height: 22 }, { x: 268, y: 401, width: 228, height: 22 },
  { x: 454, y: 138, width: 22, height: 280 }, { x: 476, y: 126, width: 242, height: 22 },
  { x: 476, y: 396, width: 242, height: 22 }, { x: 698, y: 228, width: 22, height: 178 },
  { x: 570, y: 228, width: 70, height: 22 }, { x: 570, y: 386, width: 70, height: 22 }
];
const trees = [[74, 93], [128, 78], [190, 102], [264, 78], [88, 174], [160, 166], [225, 184], [300, 151]].map(([x, y]) => ({ x, y, radius: 17 }));
const crops = Array.from({ length: 28 }, (_, index) => ({ x: 76 + (index % 7) * 32, y: 362 + Math.floor(index / 7) * 29 }));
const houses = [
  { x: 382, y: 94, width: 66, height: 48, roof: '#b65e4e' }, { x: 484, y: 178, width: 58, height: 46, roof: '#d09b58' },
  { x: 374, y: 338, width: 70, height: 48, roof: '#b65e4e' }, { x: 484, y: 424, width: 62, height: 45, roof: '#d09b58' }
];
const stars = Array.from({ length: 58 }, (_, index) => ({ x: (index * 137) % world.width, y: (index * 83) % world.height, radius: index % 5 === 0 ? 2 : 1, alpha: 0.15 + (index % 4) * 0.08 }));
const river = { x: 592, y: 24, width: 76, height: 492 };
const bridges = [{ y: 228, height: 22 }, { y: 386, height: 22 }];
const collisionRects = [
  ...trees.map((tree) => ({ x: tree.x - 13, y: tree.y + 3, width: 26, height: 22 })),
  ...houses.map((house) => ({ x: house.x, y: house.y + 10, width: house.width, height: house.height - 10 })),
  { x: 744, y: 128, width: 120, height: 54 }, { x: 724, y: 354, width: 178, height: 84 }
];

function roundedRect(x, y, width, height, radius) { context.beginPath(); context.roundRect(x, y, width, height, radius); }
function drawRegion(region) {
  context.fillStyle = region.color; roundedRect(region.x, region.y, region.width, region.height, 18); context.fill();
  context.strokeStyle = `${region.accent}55`; context.lineWidth = 1; context.stroke(); context.fillStyle = `${region.accent}bb`;
  context.font = '500 11px DM Mono, monospace'; context.fillText(region.name, region.x + 16, region.y + 24);
}
function drawTree(tree) {
  context.fillStyle = '#593f2b'; context.fillRect(tree.x - 4, tree.y + 9, 8, 16); context.fillStyle = '#133b32';
  context.beginPath(); context.arc(tree.x, tree.y, tree.radius + 4, 0, Math.PI * 2); context.fill(); context.fillStyle = '#3f8a57';
  context.beginPath(); context.arc(tree.x - 5, tree.y - 5, tree.radius, 0, Math.PI * 2); context.fill(); context.fillStyle = '#83bd65';
  context.beginPath(); context.arc(tree.x - 10, tree.y - 10, 4, 0, Math.PI * 2); context.fill();
}
function drawHouse(house) {
  context.fillStyle = '#d8c89b'; context.fillRect(house.x, house.y + 10, house.width, house.height - 10); context.fillStyle = house.roof;
  context.beginPath(); context.moveTo(house.x - 6, house.y + 12); context.lineTo(house.x + house.width / 2, house.y - 12); context.lineTo(house.x + house.width + 6, house.y + 12); context.closePath(); context.fill();
  context.fillStyle = '#375d61'; context.fillRect(house.x + 12, house.y + 22, 13, 12); context.fillRect(house.x + house.width - 25, house.y + 22, 13, 12);
  context.fillStyle = '#674532'; context.fillRect(house.x + house.width / 2 - 7, house.y + house.height - 18, 14, 18);
}
function drawStation(x, y, width, height, accent, symbol) {
  context.fillStyle = '#172b39'; roundedRect(x, y, width, height, 10); context.fill(); context.strokeStyle = `${accent}99`; context.lineWidth = 2; context.stroke();
  context.fillStyle = accent; context.font = '700 28px Space Grotesk, sans-serif'; context.textAlign = 'center'; context.fillText(symbol, x + width / 2, y + 40); context.textAlign = 'start';
}
function getDifficulty(index = emergencyState.index) {
  if (index < 3) return { level: 1, label: 'CALM', seconds: 15, delay: 3000, wrongPenalty: 15, timeoutPenalty: 20 };
  if (index < 6) return { level: 2, label: 'FOCUS', seconds: 12, delay: 2200, wrongPenalty: 18, timeoutPenalty: 22 };
  return { level: 3, label: 'CRITICAL', seconds: 10, delay: 1500, wrongPenalty: 22, timeoutPenalty: 25 };
}
function getEmergencyClues(emergency) {
  const difficulty = getDifficulty();
  return difficulty.level === 1 ? emergency.clues : difficulty.level === 2 ? emergency.focusClues : emergency.criticalClues;
}
function renderStats() {
  scoreReadout.textContent = String(score).padStart(6, '0');
  comboReadout.textContent = `x${combo}`;
  multiplierReadout.textContent = `x${multiplier}`;
  stabilityReadout.textContent = `${stability}%`;
  solvedCountReadout.textContent = String(solvedEmergencies);
  const difficulty = getDifficulty(); difficultyLevelReadout.textContent = `LEVEL ${difficulty.level} · ${difficulty.label}`;
  stabilityBar.style.width = `${stability}%`;
  stabilityBar.style.background = stability <= 35 ? '#ff8f6b' : stability <= 65 ? '#ffce73' : '#c5f36b';
}
function getMultiplier(nextCombo) { return nextCombo >= 5 ? 3 : nextCombo >= 3 ? 2 : 1; }
function clearGameTimers() {
  window.clearTimeout(emergencyTimer);
  window.clearInterval(emergencyClockTimer);
  window.clearTimeout(warningTimer);
}
function showMenuView(view) {
  [mainMenuView, howToPlayView, creditsView].forEach((menuView) => { menuView.hidden = menuView !== view; });
}
function resetGame() {
  clearGameTimers();
  audioManager.stopMusic();
  score = 0; combo = 0; stability = 100; solvedEmergencies = 0; attemptedEmergencies = 0; correctAnswers = 0; highestCombo = 0; multiplier = 1;
  emergencyState.active = false; emergencyState.warning = false; emergencyState.locked = false; emergencyState.index = 0; emergencyState.deadline = 0;
  player.x = 460; player.y = 280; keys.clear();
  gameFrame.classList.remove('has-success', 'has-consequence', 'has-multiplier');
  emergencyPanel.hidden = true; warningPanel.hidden = true; endPanel.hidden = true; overlay.classList.remove('is-hidden'); showMenuView(mainMenuView); coordinates.textContent = 'SECTOR 04.12 / READY'; renderStats();
}
function showEndScreen(victory) {
  clearGameTimers(); emergencyState.active = false; emergencyState.warning = false; emergencyState.locked = true; isPlaying = false; emergencyPanel.hidden = true; warningPanel.hidden = true;
  endKicker.textContent = victory ? 'Field trial complete' : 'The island needs more time';
  endTitle.textContent = victory ? 'ENVIRONMENT SAVED!' : 'ENVIRONMENT COLLAPSED';
  playAgainButton.textContent = victory ? 'Play again' : 'Try again';
  finalScore.textContent = String(score).padStart(6, '0');
  finalSolved.textContent = String(solvedEmergencies);
  finalAccuracy.textContent = `${attemptedEmergencies ? Math.round(correctAnswers / attemptedEmergencies * 100) : 0}%`;
  finalCombo.textContent = `x${highestCombo}`;
  finalStability.textContent = `${stability}%`;
  endPanel.hidden = false;
}
function triggerEmergency() {
  const difficulty = getDifficulty();
  emergencyState.warning = true;
  emergencyState.active = false;
  warningPanel.hidden = false;
  audioManager.playWarning();
  warningTimer = window.setTimeout(openEmergency, 760);
  renderStats();
  void difficulty;
}
function openEmergency() {
  const emergency = emergencies[emergencyState.index % emergencies.length];
  const difficulty = getDifficulty();
  emergencyState.warning = false;
  emergencyState.active = true;
  emergencyState.locked = false;
  emergencyState.deadline = performance.now() + difficulty.seconds * 1000;
  emergencyName.textContent = emergency.name;
  clueList.replaceChildren(...getEmergencyClues(emergency).map((clue) => { const item = document.createElement('li'); item.textContent = clue; return item; }));
  responseGrid.replaceChildren(...emergency.responses.map((response, index) => {
    const button = document.createElement('button');
    button.className = 'response-button'; button.type = 'button'; button.textContent = response.label;
    button.addEventListener('click', () => { audioManager.playClick(); resolveEmergency(index); });
    return button;
  }));
  decisionFeedback.textContent = '';
  decisionFeedback.className = 'decision-feedback';
  countdown.textContent = String(difficulty.seconds).padStart(2, '0');
  warningPanel.hidden = true;
  emergencyPanel.hidden = false;
  emergencyClockTimer = window.setInterval(() => {
    if (!emergencyState.active || emergencyState.locked) return;
    const seconds = Math.max(0, Math.ceil((emergencyState.deadline - performance.now()) / 1000));
    countdown.textContent = String(seconds).padStart(2, '0');
    if (seconds === 0) resolveEmergency(null);
  }, 250);
}
function closeEmergency() {
  window.clearInterval(emergencyClockTimer);
  emergencyPanel.hidden = true;
  emergencyState.active = false;
  emergencyState.index += 1;
  gameFrame.classList.remove('has-success', 'has-consequence');
  if (isPlaying) emergencyTimer = window.setTimeout(triggerEmergency, getDifficulty().delay);
}
function showScorePop(text, isNegative = false) {
  scorePop.textContent = text; scorePop.className = `score-pop${isNegative ? ' is-negative' : ''}`;
  window.requestAnimationFrame(() => scorePop.classList.add('is-visible'));
  window.setTimeout(() => { scorePop.className = 'score-pop'; }, 950);
}
function resolveEmergency(responseIndex) {
  if (!emergencyState.active || emergencyState.locked) return;
  emergencyState.locked = true;
  window.clearInterval(emergencyClockTimer);
  const emergency = emergencies[emergencyState.index % emergencies.length];
  const response = responseIndex === null ? null : emergency.responses[responseIndex];
  const difficulty = getDifficulty();
  attemptedEmergencies += 1;
  responseGrid.querySelectorAll('button').forEach((button) => { button.disabled = true; });
  if (response?.correct) {
    const previousMultiplier = multiplier;
    correctAnswers += 1; solvedEmergencies += 1; combo += 1; highestCombo = Math.max(highestCombo, combo); multiplier = getMultiplier(combo);
    const secondsRemaining = Math.max(0, (emergencyState.deadline - performance.now()) / 1000);
    const timeBonus = Math.round(secondsRemaining * 4);
    const points = (100 + timeBonus) * multiplier;
    score += points; stability = Math.min(100, stability + 5);
    decisionFeedback.innerHTML = `<strong>✓ CORRECT!</strong> <span>+100</span><br><small>${response.label} deployed. +${timeBonus} speed bonus. The island is recovering.</small>`;
    gameFrame.classList.add('has-success');
    showScorePop(`+${points}`); audioManager.playCorrect();
    if (multiplier > previousMultiplier) gameFrame.classList.add('has-multiplier');
    if (multiplier > previousMultiplier) audioManager.playCombo(multiplier);
  } else if (response) {
    score = Math.max(0, score - 25); combo = 0; multiplier = 1; stability = Math.max(0, stability - difficulty.wrongPenalty);
    decisionFeedback.innerHTML = `<strong>✕ INCORRECT</strong><br><small>${response.explanation}</small>`;
    decisionFeedback.classList.add('is-wrong'); gameFrame.classList.add('has-consequence'); showScorePop('-25', true); audioManager.playWrong();
  } else {
    score = Math.max(0, score - 25); combo = 0; multiplier = 1; stability = Math.max(0, stability - difficulty.timeoutPenalty);
    decisionFeedback.innerHTML = `<strong>TIME'S UP!</strong><br><small>The emergency escalated before a response was deployed.</small>`;
    decisionFeedback.classList.add('is-timeout'); gameFrame.classList.add('has-consequence'); showScorePop('-25', true); audioManager.playTimeout();
  }
  renderStats();
  window.setTimeout(() => {
    if (stability <= 0) { audioManager.stopMusic(); audioManager.playGameOver(); showEndScreen(false); }
    else if (solvedEmergencies >= 10) { audioManager.stopMusic(); audioManager.playVictory(); showEndScreen(true); }
    else closeEmergency();
  }, 1900);
}
function updateEmergencyClock(time) {
  if (!emergencyState.active || emergencyState.locked) return;
  const seconds = Math.max(0, Math.ceil((emergencyState.deadline - time) / 1000));
  countdown.textContent = String(seconds).padStart(2, '0');
  if (seconds === 0) resolveEmergency(null);
}
function drawEmergencyEffects(time) {
  if (!emergencyState.active) return;
  const emergencyName = emergencies[emergencyState.index % emergencies.length].name;
  const flicker = 0.5 + Math.sin(time * 0.012) * 0.18;
  context.save();
  if (emergencyName === 'FOREST FIRE') {
    context.fillStyle = `rgba(255, 102, 55, ${0.06 + flicker * 0.04})`;
    context.fillRect(42, 44, 292, 188);
    for (let index = 0; index < 12; index += 1) {
      const x = 58 + (index * 47) % 255;
      const y = 190 - ((time * (0.02 + index * 0.002) + index * 23) % 105);
      context.fillStyle = index % 3 === 0 ? '#ff9a45' : 'rgba(53, 42, 37, 0.55)';
      context.beginPath(); context.arc(x, y, index % 3 === 0 ? 3 : 7, 0, Math.PI * 2); context.fill();
    }
  }
  if (emergencyName === 'WATER CONTAMINATION') {
    context.fillStyle = 'rgba(23, 38, 65, 0.42)'; context.fillRect(river.x, river.y, river.width, river.height);
    context.strokeStyle = 'rgba(126, 77, 116, 0.65)'; context.lineWidth = 2;
    for (let y = 56; y < 500; y += 38) { context.beginPath(); context.moveTo(river.x + 8, y); context.quadraticCurveTo(river.x + 38, y - 6, river.x + 68, y); context.stroke(); }
  }
  if (emergencyName === 'CROP DISEASE') {
    context.fillStyle = 'rgba(121, 84, 44, 0.4)'; context.fillRect(42, 328, 292, 168);
    context.fillStyle = '#9a9b52'; crops.forEach((crop, index) => { if (index % 2 === 0) { context.beginPath(); context.arc(crop.x + 6, crop.y + 5, 3, 0, Math.PI * 2); context.fill(); } });
  }
  if (emergencyName === 'FLOOD') {
    context.fillStyle = 'rgba(101, 184, 213, 0.14)'; context.fillRect(24, 24, 912, 492);
    context.strokeStyle = 'rgba(190, 232, 255, 0.45)'; context.lineWidth = 1;
    for (let index = 0; index < 18; index += 1) { const x = (index * 61 + time * 0.08) % 960; const y = (index * 37 + time * 0.14) % 540; context.beginPath(); context.moveTo(x, y); context.lineTo(x - 5, y + 17); context.stroke(); }
  }
  if (emergencyName === 'PLASTIC POLLUTION') {
    context.fillStyle = '#d7e9d0';
    for (let index = 0; index < 18; index += 1) { const x = 610 + (index * 43) % 285; const y = 55 + (index * 71) % 430; context.save(); context.translate(x, y); context.rotate(index); context.fillRect(0, 0, 8, 5); context.restore(); }
  }
  if (emergencyName === 'FOREST FIRE') { context.fillStyle = `rgba(255, 102, 55, ${0.03 + flicker * 0.02})`; context.fillRect(0, 0, world.width, world.height); }
  context.restore();
}
function drawScene(time) {
  const pulse = 1 + Math.sin(time * 0.004) * 0.08; context.clearRect(0, 0, world.width, world.height); context.fillStyle = '#071b1a'; context.fillRect(0, 0, world.width, world.height);
  context.fillStyle = '#123a35'; roundedRect(world.margin, world.margin, world.width - world.margin * 2, world.height - world.margin * 2, 25); context.fill(); regions.forEach(drawRegion);
  context.fillStyle = '#b8955b'; paths.forEach((path) => { roundedRect(path.x, path.y, path.width, path.height, 8); context.fill(); }); context.fillStyle = '#d4b56d'; paths.forEach((path) => context.fillRect(path.x, path.y + path.height / 2 - 1, path.width, 2));
  context.fillStyle = '#2b8aa0'; context.fillRect(river.x, river.y, river.width, river.height); context.fillStyle = '#4bb9c0';
  for (let y = 44; y < 500; y += 42) { context.fillRect(river.x + 14 + (y % 3) * 7, y, 30, 2); context.fillRect(river.x + 48, y + 14, 17, 2); }
  bridges.forEach((bridge) => { context.fillStyle = '#b8955b'; context.fillRect(river.x, bridge.y, river.width, bridge.height); context.fillStyle = '#d4b56d'; context.fillRect(river.x, bridge.y + bridge.height / 2 - 1, river.width, 2); });
  trees.forEach(drawTree); crops.forEach((crop) => { context.fillStyle = '#b6d75b'; context.fillRect(crop.x, crop.y, 4, 13); context.fillRect(crop.x + 7, crop.y + 3, 4, 10); }); houses.forEach(drawHouse);
  drawStation(740, 78, 150, 72, '#8ce3c8', '♻'); drawStation(724, 354, 178, 84, '#97b9ef', 'AI'); context.fillStyle = '#79a7e0'; context.beginPath(); context.arc(813, 330, 18, 0, Math.PI * 2); context.fill(); context.fillStyle = '#d5eaff'; context.beginPath(); context.arc(807, 324, 5, 0, Math.PI * 2); context.fill();
  stars.forEach((star) => { context.globalAlpha = star.alpha; context.fillStyle = '#e4f6bf'; context.beginPath(); context.arc(star.x, star.y, star.radius, 0, Math.PI * 2); context.fill(); }); context.globalAlpha = 1;
  drawEmergencyEffects(time);
  const glow = context.createRadialGradient(player.x, player.y, 1, player.x, player.y, 90 * pulse); glow.addColorStop(0, 'rgba(197, 243, 107, 0.34)'); glow.addColorStop(1, 'rgba(197, 243, 107, 0)'); context.fillStyle = glow; context.fillRect(player.x - 100, player.y - 100, 200, 200);
  const walking = keys.has('arrowleft') || keys.has('arrowright') || keys.has('arrowup') || keys.has('arrowdown') || keys.has('w') || keys.has('a') || keys.has('s') || keys.has('d');
  const bob = walking ? Math.sin(time * 0.025) * 2 : Math.sin(time * 0.004) * 1;
  context.fillStyle = 'rgba(0, 0, 0, 0.28)'; context.beginPath(); context.ellipse(player.x, player.y + 14, 14, 5, 0, 0, Math.PI * 2); context.fill();
  context.strokeStyle = 'rgba(197, 243, 107, 0.42)'; context.lineWidth = 2; context.beginPath(); context.arc(player.x, player.y + bob, 25 * pulse, 0, Math.PI * 2); context.stroke(); context.fillStyle = '#c5f36b'; context.beginPath(); context.arc(player.x, player.y + bob, player.radius, 0, Math.PI * 2); context.fill(); context.fillStyle = '#f1ffc8'; context.beginPath(); context.arc(player.x - 4, player.y - 4 + bob, 4, 0, Math.PI * 2); context.fill();
}
function overlapsRect(x, y, radius, rect) { const closestX = Math.max(rect.x, Math.min(x, rect.x + rect.width)); const closestY = Math.max(rect.y, Math.min(y, rect.y + rect.height)); return Math.hypot(x - closestX, y - closestY) < radius; }
function blocked(x, y) {
  if (x - player.radius < world.margin || x + player.radius > world.width - world.margin || y - player.radius < world.margin || y + player.radius > world.height - world.margin) return true;
  if (collisionRects.some((rect) => overlapsRect(x, y, player.radius, rect))) return true;
  const inRiver = x + player.radius > river.x && x - player.radius < river.x + river.width; const onBridge = bridges.some((bridge) => y + player.radius > bridge.y && y - player.radius < bridge.y + bridge.height);
  return inRiver && !onBridge;
}
function update(delta) {
  if (emergencyState.active || emergencyState.warning) return;
  let horizontal = 0; let vertical = 0; if (keys.has('arrowleft') || keys.has('a')) horizontal -= 1; if (keys.has('arrowright') || keys.has('d')) horizontal += 1; if (keys.has('arrowup') || keys.has('w')) vertical -= 1; if (keys.has('arrowdown') || keys.has('s')) vertical += 1;
  const length = Math.hypot(horizontal, vertical) || 1; const moveX = horizontal / length * player.speed * delta; const moveY = vertical / length * player.speed * delta;
  if (!blocked(player.x + moveX, player.y)) player.x += moveX; if (!blocked(player.x, player.y + moveY)) player.y += moveY;
  coordinates.textContent = `SECTOR ${String(Math.floor(player.x / 60)).padStart(2, '0')}.${String(Math.floor(player.y / 60)).padStart(2, '0')} / ACTIVE`;
}
function frame(time) { const delta = Math.min((time - lastTime) / 1000, 0.05); lastTime = time; if (isPlaying) update(delta); updateEmergencyClock(time); drawScene(time); animationFrame = requestAnimationFrame(frame); }
function startGame() { isPlaying = true; overlay.classList.add('is-hidden'); endPanel.hidden = true; audioManager.playMusic(); canvas.focus(); emergencyTimer = window.setTimeout(triggerEmergency, 3500); }
window.addEventListener('keydown', (event) => { if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(event.key)) event.preventDefault(); keys.add(event.key.toLowerCase()); if (!isPlaying && event.key === 'Enter') startGame(); });
window.addEventListener('keyup', (event) => keys.delete(event.key.toLowerCase()));
startButton.addEventListener('click', startGame);
howToPlayButton.addEventListener('click', () => showMenuView(howToPlayView));
creditsButton.addEventListener('click', () => showMenuView(creditsView));
document.querySelectorAll('.back-button').forEach((button) => button.addEventListener('click', () => showMenuView(mainMenuView)));
muteToggle.addEventListener('click', () => { const muted = !audioManager.isMuted(); audioManager.setMuted(muted); if (!muted && isPlaying) audioManager.resumeMusic(); });
musicVolumeControl.addEventListener('input', (event) => audioManager.setMusicVolume(Number(event.target.value) / 100));
sfxVolumeControl.addEventListener('input', (event) => audioManager.setSfxVolume(Number(event.target.value) / 100));
document.querySelectorAll('button').forEach((button) => { if (button !== muteToggle) button.addEventListener('click', () => audioManager.playClick()); });
playAgainButton.addEventListener('click', () => { resetGame(); startGame(); }); mainMenuButton.addEventListener('click', resetGame); renderStats(); drawScene(0); animationFrame = requestAnimationFrame(frame);
window.addEventListener('beforeunload', () => cancelAnimationFrame(animationFrame));