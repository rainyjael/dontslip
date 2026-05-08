const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = 400; canvas.height = 600;

let gameSpeed, score, gameActive = false;
let player = { x: 165, y: 500, w: 70, h: 55 };
let obstacles = [];
let keys = {};
let waterOffset = 0;
let beat = 0;
let scoreInterval = null;

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
    const tempo = Math.max(140, 280 - (gameSpeed * 8)); 
    if (beat % 2 === 0) playTone(110, 'triangle', 0.2, 0.1); 
    else playTone(146.83, 'triangle', 0.2, 0.05);
    beat++;
    setTimeout(playMusic, tempo);
}

// --- REALISTIC DRAWING FUNCTIONS ---

function drawPlayer(x, y) {
    const cx = x + 35;
    const cy = y + 25;

    // Shadow
    ctx.fillStyle = "rgba(0,0,0,0.15)";
    ctx.beginPath(); ctx.ellipse(cx, y + 55, 30, 8, 0, 0, Math.PI * 2); ctx.fill();

    // Arms wiggling
    const armWave = Math.sin(Date.now() / 150) * 4;
    ctx.fillStyle = "#f1c27d";
    ctx.beginPath(); ctx.ellipse(x + 5, y + 30 + armWave, 6, 12, 0.4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x + 65, y + 30 - armWave, 6, 12, -0.4, 0, Math.PI * 2); ctx.fill();

    // The Floatie (Inner Tube)
    ctx.strokeStyle = "#ff4757"; ctx.lineWidth = 10;
    ctx.beginPath(); ctx.ellipse(cx, cy + 10, 26, 16, 0, 0, Math.PI * 2); ctx.stroke();

    // Head with skin gradient
    let skinGrad = ctx.createRadialGradient(cx, cy - 5, 2, cx, cy - 5, 15);
    skinGrad.addColorStop(0, "#ffdbac"); skinGrad.addColorStop(1, "#f1c27d");
    ctx.fillStyle = skinGrad;
    ctx.beginPath(); ctx.arc(cx, cy - 5, 15, 0, Math.PI * 2); ctx.fill(); 
    
    // Swim Cap
    ctx.fillStyle = "#0984e3";
    ctx.beginPath(); ctx.arc(cx, cy - 8, 15, Math.PI, 0); ctx.fill(); 

    // Eyes
    ctx.fillStyle = "#000";
    ctx.beginPath(); ctx.arc(cx - 5, cy - 5, 2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + 5, cy - 5, 2, 0, Math.PI * 2); ctx.fill();
}

function drawObstacle(obs) {
    const { x, y, type } = obs;
    
    if (type === 'ice-cream') {
        // Spilled splat puddle
        ctx.fillStyle = "#ff7eb9";
        ctx.beginPath(); ctx.ellipse(x+20, y+32, 18, 10, 0, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(x+10, y+35, 6, 0, Math.PI*2); ctx.fill();
        // Upside down cone
        ctx.fillStyle = "#deab5d";
        ctx.beginPath();
        ctx.moveTo(x+8, y+28); ctx.lineTo(x+32, y+28); ctx.lineTo(x+20, y+5); ctx.closePath();
        ctx.fill();
        // Cone detail lines
        ctx.strokeStyle = "rgba(0,0,0,0.1)"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(x+15, y+28); ctx.lineTo(x+20, y+5); ctx.stroke();
    } else if (type === 'poo') {
        ctx.fillStyle = "#634832";
        ctx.beginPath(); ctx.roundRect(x+5, y+25, 30, 12, 10); ctx.fill();
        ctx.beginPath(); ctx.roundRect(x+10, y+15, 20, 10, 8); ctx.fill();
        ctx.beginPath(); ctx.roundRect(x+15, y+5, 10, 10, 5); ctx.fill();
    } else {
        // Puddle
        ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
        ctx.beginPath(); ctx.ellipse(x+20, y+20, 28, 14, 0.1, 0, Math.PI*2); ctx.fill();
    }
}

// --- GAME CORE ---

function startGame() {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    gameActive = true; score = 0; gameSpeed = 4; obstacles = []; player.x = 165;
    document.getElementById('start-screen').style.display = 'none';
    document.getElementById('game-over').style.display = 'none';
    document.getElementById('leaderboard-screen').style.display = 'none';
    document.getElementById('score').style.display = 'block';
    document.getElementById('score').innerText = "0m";

    if (scoreInterval) clearInterval(scoreInterval);
    scoreInterval = setInterval(() => { if (gameActive) score++; document.getElementById('score').innerText = score + "m"; }, 1000);

    playMusic(); animate();
}

function animate() {
    if (!gameActive) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Realistic Moving Water Lines
    waterOffset += gameSpeed * 0.4;
    if (waterOffset > 100) waterOffset = 0;
    for (let i = -100; i < canvas.height; i += 50) {
        ctx.beginPath();
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.15 + (Math.sin(i + waterOffset) * 0.05)})`;
        ctx.lineWidth = 3;
        ctx.moveTo(40, i + waterOffset);
        ctx.bezierCurveTo(150, i + waterOffset - 25, 250, i + waterOffset + 25, 360, i + waterOffset);
        ctx.stroke();
    }

    // Side Walls
    ctx.fillStyle = "#fd79a8"; ctx.fillRect(0,0,40,600); ctx.fillRect(360,0,40,600);

    // Player Movement
    if (keys['ArrowLeft'] && player.x > 45) player.x -= 7;
    if (keys['ArrowRight'] && player.x < 285) player.x += 7;
    drawPlayer(player.x, player.y);

    // Smart Spawning: Never block all 3 lanes
    if (Math.random() < 0.05) {
        const lane = Math.floor(Math.random() * 3);
        const activeTopObstacles = obstacles.filter(o => o.y < 120);
        if (activeTopObstacles.length < 2) { // Allow max 2 obstacles at once vertically
            obstacles.push({ 
                x: 65 + (lane * 100), y: -60, 
                type: ['ice-cream', 'poo', 'puddle'][Math.floor(Math.random()*3)], 
                w: 40, h: 40 
            });
        }
    }

    obstacles.forEach((obs, i) => {
        obs.y += gameSpeed;
        drawObstacle(obs);
        if (player.x < obs.x+obs.w && player.x+player.w > obs.x && player.y < obs.y+obs.h && player.y+player.h > obs.y) {
            playTone(150, 'sawtooth', 0.5, 0.1); endGame();
        }
        if (obs.y > 600) obstacles.splice(i, 1);
    });

    gameSpeed = 6 + (Math.floor(score / 10) * 1.3);
    requestAnimationFrame(animate);
}

function endGame() {
    gameActive = false; clearInterval(scoreInterval);
    document.getElementById('game-over').style.display = 'block';
    document.getElementById('final-score-text').innerText = `RESULT: ${score}m`;
}

function saveAndShowLeaderboard() {
    let init = document.getElementById('player-initials').value.toUpperCase() || "AAA";
    let scores = JSON.parse(localStorage.getItem('slideScores')) || [];
    scores.push({ initials: init, score });
    scores.sort((a, b) => b.score - a.score);
    const topScores = scores.slice(0, 5);
    localStorage.setItem('slideScores', JSON.stringify(topScores));
    
    document.getElementById('game-over').style.display = 'none';
    document.getElementById('leaderboard-screen').style.display = 'block';
    
    document.getElementById('leaderboard-list').innerHTML = topScores.map((s, i) => 
        `<div>${i+1}. ${s.initials} .... ${s.score}m</div>`
    ).join('');
}

function resetGame() { location.reload(); }

window.addEventListener('keydown', e => keys[e.code] = true);
window.addEventListener('keyup', e => keys[e.code] = false);

const savedScores = JSON.parse(localStorage.getItem('slideScores')) || [];
if(savedScores.length > 0) document.getElementById('best-score-display').innerText = `BEST: ${savedScores[0].score}m`;
