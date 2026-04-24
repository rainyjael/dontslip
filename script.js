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

// --- AUDIO ENGINE ---
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playTone(freq, type, duration, volume) {
    try {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        gain.gain.setValueAtTime(volume, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0010, audioCtx.currentTime + duration);
        osc.connect(gain); gain.connect(audioCtx.destination);
        osc.start(); osc.stop(audioCtx.currentTime + duration);
    } catch(e) { console.log("Audio error:", e); }
}

function playMusic() {
    if (!gameActive) return;
    const tempo = Math.max(140, 280 - (gameSpeed * 8)); 
    if (beat % 2 === 0) playTone(110, 'triangle', 0.2, 0.1); 
    else playTone(146.83, 'triangle', 0.2, 0.05);
    beat++;
    setTimeout(playMusic, tempo);
}

// --- RENDERING (Your Original Graphics) ---
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
    
    // Reset Logic
    gameActive = true;
    score = 0;
    gameSpeed = 4;
    obstacles = [];
    player.x = 165;

    // UI Cleanup
    document.getElementById('start-screen').style.display = 'none';
    document.getElementById('game-over').style.display = 'none';
    document.getElementById('leaderboard-screen').style.display = 'none';
    document.getElementById('score').style.display = 'block';
    document.getElementById('score').innerText = "0m";

    // METER TIMER (The 1-second logic)
    if (scoreInterval) clearInterval(scoreInterval);
    scoreInterval = setInterval(() => {
        if (gameActive) {
            score++;
            document.getElementById('score').innerText = score + "m";
        }
    }, 1000);

    playMusic();
    animate();
}

function animate() {
    if (!gameActive) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Water Texture
    waterOffset += gameSpeed; if (waterOffset > 40) waterOffset = 0;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.3)"; ctx.lineWidth = 2;
    for (let i = -40; i < canvas.height; i += 40) {
        ctx.beginPath(); ctx.moveTo(45, i + waterOffset);
        ctx.bezierCurveTo(100, i + waterOffset - 10, 300, i + waterOffset + 10, 355, i + waterOffset); ctx.stroke();
    }
    ctx.fillStyle = "#fd79a8"; ctx.fillRect(0,0,40,600); ctx.fillRect(360,0,40,600);

    // Movement
    if (keys['ArrowLeft'] && player.x > 45) player.x -= 7;
    if (keys['ArrowRight'] && player.x < 285) player.x += 7;

    drawPlayer(player.x, player.y);

    // Spawning
    if (obstacles.length < 6 && Math.random() < 0.04) {
        const lane = Math.floor(Math.random() * 3);
        obstacles.push({ 
            x: 55 + (lane * 100), 
            y: -50, 
            type: ['ice-cream', 'poo', 'puddle'][Math.floor(Math.random()*3)], 
            w: 40, h: 40 
        });
    }

    obstacles.forEach((obs, i) => {
        obs.y += gameSpeed;
        drawObstacle(obs);
        
        // Collision
        if (player.x < obs.x+obs.w && player.x+player.w > obs.x && player.y < obs.y+obs.h && player.y+player.h > obs.y) {
            endGame();
        }
        if (obs.y > 600) obstacles.splice(i, 1);
    });

    gameSpeed = 4 + (Math.floor(score / 10) * 0.5);
    requestAnimationFrame(animate);
}

function endGame() {
    gameActive = false;
    clearInterval(scoreInterval);
    document.getElementById('game-over').style.display = 'block';
    document.getElementById('final-score-text').innerText = `RESULT: ${score}m`;
}

function saveAndShowLeaderboard() {
    let init = document.getElementById('player-initials').value.toUpperCase() || "AAA";
    let scores = JSON.parse(localStorage.getItem('slideScores')) || [];
    scores.push({ initials: init, score });
    scores.sort((a, b) => b.score - a.score);
    localStorage.setItem('slideScores', JSON.stringify(scores.slice(0, 5)));
    location.reload();
}

function resetGame() { location.reload(); }
window.addEventListener('keydown', e => keys[e.code] = true);
window.addEventListener('keyup', e => keys[e.code] = false);

const savedScores = JSON.parse(localStorage.getItem('slideScores')) || [];
if(savedScores.length > 0) document.getElementById('best-score-display').innerText = `BEST: ${savedScores[0].score}m`;
