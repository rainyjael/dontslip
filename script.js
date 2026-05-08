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
let isInvincible = false;
const hitboxMargin = 15; // Makes the game easier/realistic hitbox

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
    const tempo = isInvincible ? 100 : Math.max(140, 280 - (gameSpeed * 8)); 
    if (beat % 2 === 0) playTone(isInvincible ? 440 : 110, 'triangle', 0.2, 0.1); 
    else playTone(isInvincible ? 554 : 146.83, 'triangle', 0.2, 0.05);
    beat++;
    setTimeout(playMusic, tempo);
}

// --- DRAWING ---

function drawPlayer(x, y) {
    const cx = x + 35; const cy = y + 25;
    if (isInvincible) { ctx.shadowBlur = 20; ctx.shadowColor = "#fff200"; }
    
    // Body & Animation
    const armWave = Math.sin(Date.now() / 150) * 4;
    ctx.fillStyle = "#f1c27d";
    ctx.beginPath(); ctx.ellipse(x + 5, y + 30 + armWave, 6, 12, 0.4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x + 65, y + 30 - armWave, 6, 12, -0.4, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = isInvincible ? "#fff200" : "#ff4757"; 
    ctx.lineWidth = 10;
    ctx.beginPath(); ctx.ellipse(cx, cy + 10, 26, 16, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = "#ffdbac";
    ctx.beginPath(); ctx.arc(cx, cy - 5, 15, 0, Math.PI * 2); ctx.fill(); 
    ctx.fillStyle = "#0984e3";
    ctx.beginPath(); ctx.arc(cx, cy - 8, 15, Math.PI, 0); ctx.fill(); 
    ctx.shadowBlur = 0;
}

function drawLifeJacket(pu) {
    const { x, y } = pu;
    const bounce = Math.sin(Date.now() / 300) * 10;
    const drawY = y + bounce;

    // Rays
    ctx.save();
    ctx.translate(x + 20, drawY + 22);
    ctx.strokeStyle = "rgba(255, 242, 0, 0.6)";
    ctx.lineWidth = 3;
    for (let i = 0; i < 8; i++) {
        ctx.rotate(Math.PI / 4);
        ctx.beginPath(); ctx.moveTo(25, 0); ctx.lineTo(45, 0); ctx.stroke();
    }
    ctx.restore();

    // Jacket
    ctx.fillStyle = "#ff7f50";
    ctx.beginPath(); ctx.roundRect(x, drawY, 40, 45, 8); ctx.fill();
    ctx.fillStyle = "#81ecec"; ctx.fillRect(x + 15, drawY + 5, 10, 40);
    ctx.fillStyle = "#2d3436";
    ctx.fillRect(x, drawY + 15, 40, 4); ctx.fillRect(x, drawY + 30, 40, 4);
}

function drawObstacle(obs) {
    const { x, y, type } = obs;
    if (type === 'ice-cream') {
        ctx.fillStyle = "#ff7eb9";
        ctx.beginPath(); ctx.ellipse(x+20, y+32, 18, 10, 0, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = "#deab5d";
        ctx.beginPath(); ctx.moveTo(x+8, y+28); ctx.lineTo(x+32, y+28); ctx.lineTo(x+20, y+5); ctx.closePath(); ctx.fill();
    } else if (type === 'poo') {
        ctx.fillStyle = "#634832";
        ctx.beginPath(); ctx.roundRect(x+5, y+25, 30, 12, 10); ctx.fill();
        ctx.beginPath(); ctx.roundRect(x+10, y+15, 20, 10, 8); ctx.fill();
        ctx.beginPath(); ctx.roundRect(x+15, y+5, 10, 10, 5); ctx.fill();
    } else {
        ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
        ctx.beginPath(); ctx.ellipse(x+20, y+20, 28, 14, 0.1, 0, Math.PI*2); ctx.fill();
    }
}

// --- LOGIC ---

function activatePowerUp() {
    isInvincible = true;
    let oldSpeed = gameSpeed;
    gameSpeed = 30; 
    playTone(523, 'square', 0.5, 0.1);
    let gained = 0;
    let boost = setInterval(() => {
        score++; gained++;
        document.getElementById('score').innerText = score + "m";
        if (gained >= 75) { clearInterval(boost); isInvincible = false; gameSpeed = oldSpeed; }
    }, 30);
}

function startGame() {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    gameActive = true; score = 0; gameSpeed = 4; obstacles = []; powerUps = []; player.x = 165;
    document.getElementById('start-screen').style.display = 'none';
    document.getElementById('game-over').style.display = 'none';
    document.getElementById('leaderboard-screen').style.display = 'none';
    document.getElementById('score').style.display = 'block';
    if (scoreInterval) clearInterval(scoreInterval);
    scoreInterval = setInterval(() => { if (gameActive && !isInvincible) { score++; document.getElementById('score').innerText = score + "m"; } }, 1000);
    playMusic(); animate();
}

function animate() {
    if (!gameActive) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    waterOffset += gameSpeed * 0.4;
    if (waterOffset > 100) waterOffset = 0;
    for (let i = -100; i < canvas.height; i += 50) {
        ctx.beginPath();
        ctx.strokeStyle = isInvincible ? "white" : `rgba(255, 255, 255, ${0.15 + (Math.sin(i + waterOffset) * 0.05)})`;
        ctx.lineWidth = isInvincible ? 6 : 3;
        ctx.moveTo(40, i + waterOffset);
        ctx.bezierCurveTo(150, i + waterOffset - 25, 250, i + waterOffset + 25, 360, i + waterOffset);
        ctx.stroke();
    }

    ctx.fillStyle = "#fd79a8"; ctx.fillRect(0,0,40,600); ctx.fillRect(360,0,40,600);

    if (keys['ArrowLeft'] && player.x > 45) player.x -= 7;
    if (keys['ArrowRight'] && player.x < 285) player.x += 7;
    drawPlayer(player.x, player.y);

    // Spawning
    if (!isInvincible && Math.random() < 0.05) {
        const lane = Math.floor(Math.random() * 3);
        if (obstacles.filter(o => o.y < 120).length < 2) {
            obstacles.push({ x: 65 + (lane * 100), y: -60, type: ['ice-cream', 'poo', 'puddle'][Math.floor(Math.random()*3)], w: 40, h: 40 });
        }
    }
    if (score >= 40 && powerUps.length === 0 && !isInvincible && Math.random() < 0.006) {
        powerUps.push({ x: 65 + (Math.floor(Math.random() * 3) * 100), y: -100, w: 40, h: 45 });
    }

    // Powerups Update
    powerUps.forEach((pu, i) => {
        pu.y += gameSpeed; drawLifeJacket(pu);
        if (player.x < pu.x + pu.w && player.x + player.w > pu.x && player.y < pu.y + pu.h && player.y + player.h > pu.y) {
            powerUps.splice(i, 1); activatePowerUp();
        }
        if (pu.y > 600) powerUps.splice(i, 1);
    });

    // Obstacles Update (SHRUNKEN HITBOX)
    obstacles.forEach((obs, i) => {
        obs.y += gameSpeed; drawObstacle(obs);
        if (!isInvincible) {
            if (player.x + hitboxMargin < obs.x + obs.w - hitboxMargin && 
                player.x + player.w - hitboxMargin > obs.x + hitboxMargin && 
                player.y + hitboxMargin < obs.y + obs.h - hitboxMargin && 
                player.y + player.h - hitboxMargin > obs.y + hitboxMargin) {
                playTone(150, 'sawtooth', 0.5, 0.1); endGame();
            }
        }
        if (obs.y > 600) obstacles.splice(i, 1);
    });

    if (!isInvincible) gameSpeed = 6 + (Math.floor(score / 10) * 1.3);
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
    localStorage.setItem('slideScores', JSON.stringify(scores.slice(0, 5)));
    document.getElementById('game-over').style.display = 'none';
    document.getElementById('leaderboard-screen').style.display = 'block';
    document.getElementById('leaderboard-list').innerHTML = scores.slice(0,5).map((s, i) => `<div>${i+1}. ${s.initials} .. ${s.score}m</div>`).join('');
}

function resetGame() { location.reload(); }
window.addEventListener('keydown', e => keys[e.code] = true);
window.addEventListener('keyup', e => keys[e.code] = false);
const savedScores = JSON.parse(localStorage.getItem('slideScores')) || [];
if(savedScores.length > 0) document.getElementById('best-score-display').innerText = `BEST: ${savedScores[0].score}m`;
