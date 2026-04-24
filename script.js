const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = 400; canvas.height = 600;

let gameSpeed, score, gameActive = false;
let player = { x: 165, y: 500, w: 70, h: 55 };
let obstacles = [];
let keys = {};
let waterOffset = 0;
let beat = 0;
let scoreFrameCounter = 0; // Tracks frames to count seconds

// --- AUDIO ENGINE ---
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playTone(freq, type, duration, volume) {
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
    const tempo = Math.max(140, 280 - (gameSpeed * 8)); 
    if (beat % 2 === 0) playTone(110, 'triangle', 0.2, 0.1); 
    else playTone(146.83, 'triangle', 0.2, 0.05);
    if (beat % 4 === 0) {
        const notes = [440, 523, 587, 659];
        playTone(notes[Math.floor(Math.random()*notes.length)], 'square', 0.1, 0.02);
    }
    beat++;
    setTimeout(playMusic, tempo);
}

// --- RENDERING ---
function drawPlayer(x, y) {
    const cx = x + 35; const cy = y + 25;
    ctx.fillStyle = "rgba(0,0,0,0.15)";
    ctx.beginPath(); ctx.ellipse(cx, y + 52, 35, 8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#e0ac69";
    ctx.beginPath(); ctx.ellipse(x+5, y+25, 12, 8, 0.8, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x+65, y+25, 12, 8, -0.8, 0, Math.PI*2); ctx.fill();
    let grad = ctx.createRadialGradient(cx, cy, 5, cx, cy, 40);
    grad.addColorStop(0, "#ffdbac"); grad.addColorStop(1, "#f1c27d");
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.roundRect(x+10, y+10, 50, 42, [25, 25, 15, 15]); ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.1)"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx, y+15); ctx.lineTo(cx, y+35); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x+15, y+38); ctx.quadraticCurveTo(cx, y+43, x+55, y+38); ctx.stroke();
    ctx.fillStyle = "#3d2b1f"; ctx.beginPath(); ctx.arc(cx, y+5, 12, Math.PI, 0); ctx.fill();
    ctx.fillStyle = "#ffdbac"; ctx.fillRect(cx-12, y+5, 24, 7);
    const drawF = (fx) => {
        ctx.fillStyle = "#ff9f43"; ctx.beginPath(); ctx.roundRect(fx, y+18, 20, 24, 8); ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.4)"; ctx.beginPath(); ctx.ellipse(fx+6, y+25, 3, 6, 0.2, 0, Math.PI*2); ctx.fill();
    };
    drawF(x-5); drawF(x+55);
    ctx.fillStyle = "#0984e3"; ctx.beginPath(); ctx.roundRect(x+10, y+45, 50, 10, [0, 0, 12, 12]); ctx.fill();
}

function drawObstacle(obs) {
    const { x, y, type } = obs;
    if (type === 'ice-cream') {
        ctx.fillStyle = "#e67e22"; ctx.beginPath(); ctx.moveTo(x+10, y+15); ctx.lineTo(x+30, y+15); ctx.lineTo(x+20, y+40); ctx.fill();
        ctx.fillStyle = "#ff75a0"; ctx.beginPath(); ctx.arc(x+20, y+12, 12, 0, Math.PI*2); ctx.fill();
    } else if (type === 'poo') {
        ctx.fillStyle = "#634832"; ctx.fillRect(x+5, y+25, 30, 10); ctx.fillRect(x+10, y+15, 20, 10); ctx.fillRect(x+15, y+5, 10, 10);
    } else {
        ctx.fillStyle = "rgba(255, 234, 167, 0.7)"; ctx.beginPath(); ctx.ellipse(x+20, y+20, 25, 15, 0, 0, Math.PI*2); ctx.fill();
    }
}

// --- GAME ENGINE ---
function startGame() {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    gameSpeed = 4; score = 0; scoreFrameCounter = 0; gameActive = true; obstacles = []; player.x = 165;
    document.getElementById('start-screen').style.display = 'none';
    document.getElementById('game-over').style.display = 'none';
    document.getElementById('leaderboard-screen').style.display = 'none';
    document.getElementById('score').style.display = 'block';
    document.getElementById('score').innerText = "0m";
    playMusic(); animate();
}

function spawnObstacle() {
    if (obstacles.length < 7 && Math.random() < 0.04) {
        const lane = Math.floor(Math.random() * 3);
        const newX = 55 + (lane * 100);
        if (!obstacles.some(o => Math.abs(o.y - (-50)) < 150)) {
            obstacles.push({ x: newX, y: -50, type: ['ice-cream', 'poo', 'puddle'][Math.floor(Math.random()*3)], w: 40, h: 40 });
        }
