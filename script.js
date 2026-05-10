const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = 400; canvas.height = 600;

let gameSpeed, score, gameActive = false;
let player = { x: 165, y: 500, w: 70, h: 55 };
let obstacles = [];
let powerUps = [];
let keys = {};
let waterOffset = 0;
let beat = 0;
let scoreInterval = null;

// POWER-UP STATES
let isInvincible = false;
let isSlowMo = false; 
let savedSpeed = 5; 
const hitboxMargin = 15; 

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playTone(freq, type, duration, volume) {
    if (audioCtx.state === 'suspended') return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(volume, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0010, audioCtx.currentTime + duration);
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.start(); osc.stop(audioCtx.currentTime + duration);
}

function playMusic() {
    if (!gameActive) return;
    let tempo;
    if (isInvincible) tempo = 100;
    else if (isSlowMo) tempo = 400; 
    else tempo = Math.max(140, 280 - (gameSpeed * 8));

    if (beat % 2 === 0) playTone(isInvincible ? 440 : 110, 'triangle', 0.2, 0.1); 
    else playTone(isInvincible ? 554 : 146.83, 'triangle', 0.2, 0.05);
    beat++;
    setTimeout(playMusic, tempo);
}

// --- DRAWING ---

function drawPlayer(x, y) {
    const cx = x + 35; const cy = y + 25;
    if (isInvincible) { ctx.shadowBlur = 20; ctx.shadowColor = "#fff200"; }
    if (isSlowMo) { ctx.shadowBlur = 10; ctx.shadowColor = "#a2d2ff"; }
    
    const armWave = Math.sin(Date.now() / 150) * 4;
    ctx.fillStyle = "#f1c27d";
    ctx.beginPath(); ctx.ellipse(x + 5, y + 30 + armWave, 6, 12, 0.4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x + 65, y + 30 - armWave, 6, 12, -0.4, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = isInvincible
