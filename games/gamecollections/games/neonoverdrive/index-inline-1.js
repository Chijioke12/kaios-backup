
// Basic debug for KaiOS
window.onerror = function(msg, url, lineNo, columnNo, error) {
    if (msg.includes('ResizeObserver')) return;
    alert('Err: ' + msg + '\nLine: ' + lineNo);
    return false;
};

// --- CANVAS SETUP ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const GAME_WIDTH = 240; 
const GAME_HEIGHT = 295; 

function setupHighDPICanvas() {
    const dpr = window.devicePixelRatio || 1;
    canvas.style.width = GAME_WIDTH + 'px'; 
    canvas.style.height = GAME_HEIGHT + 'px';
    canvas.width = GAME_WIDTH * dpr; 
    canvas.height = GAME_HEIGHT * dpr;
    ctx.scale(dpr, dpr);
}
setupHighDPICanvas();

// --- SYNTH AUDIO (KaiOS Optimized) ---
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playSynth(type) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain); gain.connect(audioCtx.destination);
    const now = audioCtx.currentTime;

    if (type === 'tick') { 
        osc.type = 'square'; osc.frequency.setValueAtTime(800, now);
        gain.gain.setValueAtTime(0.05, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
        osc.start(now); osc.stop(now + 0.05);
    } else if (type === 'move') { 
        osc.type = 'sine'; osc.frequency.setValueAtTime(400, now); osc.frequency.exponentialRampToValueAtTime(800, now + 0.1);
        gain.gain.setValueAtTime(0.1, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.start(now); osc.stop(now + 0.1);
    } else if (type === 'shoot') { 
        osc.type = 'sawtooth'; osc.frequency.setValueAtTime(1200, now); osc.frequency.exponentialRampToValueAtTime(200, now + 0.2);
        gain.gain.setValueAtTime(0.15, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        osc.start(now); osc.stop(now + 0.2);
    } else if (type === 'collect') { 
        osc.type = 'square'; osc.frequency.setValueAtTime(800, now); osc.frequency.setValueAtTime(1200, now + 0.05);
        gain.gain.setValueAtTime(0.1, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.start(now); osc.stop(now + 0.1);
    } else if (type === 'boom') { 
        osc.type = 'square'; osc.frequency.setValueAtTime(150, now); osc.frequency.exponentialRampToValueAtTime(30, now + 0.5);
        gain.gain.setValueAtTime(0.3, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
        osc.start(now); osc.stop(now + 0.5);
    }
}

// --- GAME LOGIC & STATE ---
let state = 'MENU'; 
let menuIdx = 0;
let animationFrame;

// Game Physics Config
let scrollSpeed = 4.0;
let distance = 0;
let highScore = 0;
let screenShake = 0; // The new Juice parameter!

// Try to load high score
try {
    const saved = localStorage.getItem('neon_overdrive_highscore');
    if (saved) highScore = parseInt(saved);
} catch(e) {}
document.getElementById('menu-highscore').innerText = highScore;

// Grid Setup (4 Lanes)
const LANES = [30, 90, 150, 210]; // Center X of each lane

// Player Entity
let p = { 
    lane: 1, 
    x: 90, 
    y: 240, 
    w: 24, 
    h: 36, 
    ammo: 3 
};

// Object Pooling for maximum RAM efficiency
let obstacles = [];
let stars = [];
let particles = [];
let lasers = [];

function initPools() {
    obstacles = [];
    for(let i=0; i<15; i++) {
        obstacles.push({ active: false, lane: 0, y: 0, type: 0, w: 40, h: 20 });
    }
    
    stars = [];
    for(let i=0; i<40; i++) {
        stars.push({ x: Math.random()*GAME_WIDTH, y: Math.random()*GAME_HEIGHT, speed: Math.random()*3 + 2 });
    }

    particles = [];
    for(let i=0; i<30; i++) {
        particles.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, color: '#fff' });
    }

    lasers = [];
    for(let i=0; i<5; i++) {
        lasers.push({ active: false, x: 0, y: 0, w: 6, h: 20 });
    }
}

function spawnObstacle() {
    for(let i=0; i<obstacles.length; i++) {
        if (!obstacles[i].active) {
            let type = Math.random() > 0.85 ? 1 : 0; // 15% chance for ammo
            obstacles[i].active = true;
            obstacles[i].lane = Math.floor(Math.random() * 4);
            obstacles[i].y = -40;
            obstacles[i].type = type;
            obstacles[i].w = type === 0 ? 46 : 16;
            obstacles[i].h = type === 0 ? 20 : 16;
            break;
        }
    }
}

function spawnExplosion(x, y, color) {
    let count = 10; let spawned = 0;
    for(let i=0; i<particles.length; i++) {
        if (!particles[i].active) {
            particles[i].active = true;
            particles[i].x = x; particles[i].y = y;
            particles[i].vx = (Math.random() - 0.5) * 8;
            particles[i].vy = (Math.random() - 0.5) * 8;
            particles[i].life = 1.0;
            particles[i].color = color;
            spawned++;
            if (spawned >= count) break;
        }
    }
}

function fireLaser() {
    if (p.ammo <= 0) return;
    
    for(let i=0; i<lasers.length; i++) {
        if (!lasers[i].active) {
            lasers[i].active = true;
            lasers[i].x = p.x;
            lasers[i].y = p.y - p.h/2;
            p.ammo--;
            screenShake = 6; // Little shake for shooting
            updateHUD();
            playSynth('shoot');
            break;
        }
    }
}

function updateHUD() {
    document.getElementById('score').innerText = Math.floor(distance) + "m";
    document.getElementById('ammo-display').innerText = "Blaster: " + p.ammo;
    if (p.ammo === 0) document.getElementById('ammo-display').style.color = '#FF4444';
    else document.getElementById('ammo-display').style.color = '#00FFFF';
}

function triggerGameOver() {
    state = 'GAMEOVER'; 
    playSynth('boom');
    spawnExplosion(p.x, p.y, '#FF00FF');
    screenShake = 20; // Big shake for crashing
    
    let finalScore = Math.floor(distance);
    document.getElementById('final-score').innerText = finalScore;
    
    let alertText = "";
    if (finalScore > highScore) {
        highScore = finalScore;
        alertText = "NEW HIGH SCORE!";
        try { localStorage.setItem('neon_overdrive_highscore', highScore.toString()); } catch(e) {}
        document.getElementById('menu-highscore').innerText = highScore;
    }
    document.getElementById('highscore-alert').innerText = alertText;
    // Delay UI so player can see crash
    setTimeout(() => {
        if (state === 'GAMEOVER') {
            document.getElementById('gameover-screen').classList.remove('hidden');
            updateSoftkeys();
        }
    }, 1200);
}

function resetGame() {
    initPools();
    p.lane = 1;
    p.x = LANES[p.lane];
    p.ammo = 3;
    scrollSpeed = 4.0;
    distance = 0;
    screenShake = 0;
    updateHUD();
}

// --- GAME LOOP ---
let frameCount = 0;

function update() {
    if (state !== 'PLAYING') return;
    frameCount++;

    // 1. Difficulty Scaling
    scrollSpeed += 0.001; 
    distance += scrollSpeed * 0.1;
    if (frameCount % 10 === 0) updateHUD();
    
    // Update Screenshake
    if (screenShake > 0) screenShake -= 1;

    // 2. Player Movement (Smooth Lerping to lane)
    let targetX = LANES[p.lane];
    p.x += (targetX - p.x) * 0.4;

    // 3. Spawner Logic
    let spawnRate = Math.max(20, Math.floor(60 - scrollSpeed * 3));
    if (frameCount % spawnRate === 0) {
        spawnObstacle();
        if (scrollSpeed > 6.0 && Math.random() > 0.5) setTimeout(spawnObstacle, 100); 
    }

    // 4. Update Stars (Speed lines)
    for(let i=0; i<stars.length; i++) {
        stars[i].y += stars[i].speed + scrollSpeed;
        if (stars[i].y > GAME_HEIGHT) {
            stars[i].y = 0;
            stars[i].x = Math.random() * GAME_WIDTH;
        }
    }

    // 5. Update Lasers
    for(let i=0; i<lasers.length; i++) {
        if (lasers[i].active) {
            lasers[i].y -= 12; 
            if (lasers[i].y < -20) lasers[i].active = false;
        }
    }

    // 6. Update Obstacles & Collisions
    for (let i = 0; i < obstacles.length; i++) {
        let obs = obstacles[i];
        if (!obs.active) continue;

        obs.y += scrollSpeed;
        if (obs.y > GAME_HEIGHT + 40) { obs.active = false; continue; }

        let obsX = LANES[obs.lane];

        // Check Laser Collision
        if (obs.type === 0) {
            for(let j=0; j<lasers.length; j++) {
                if (lasers[j].active && 
                    Math.abs(lasers[j].x - obsX) < obs.w/2 + lasers[j].w/2 &&
                    lasers[j].y < obs.y + obs.h/2 && lasers[j].y > obs.y - obs.h/2) {
                    
                    obs.active = false;
                    lasers[j].active = false;
                    spawnExplosion(obsX, obs.y, '#FF4444');
                    playSynth('boom');
                    screenShake = Math.max(screenShake, 5); // Add shake on hit
                }
            }
        }

        // Check Player Collision
        if (Math.abs(p.x - obsX) < obs.w/2 + p.w/2 - 4 && Math.abs(p.y - obs.y) < obs.h/2 + p.h/2 - 4) {
            if (obs.type === 0) {
                triggerGameOver();
                return;
            } else if (obs.type === 1) {
                obs.active = false;
                p.ammo = Math.min(p.ammo + 1, 9);
                updateHUD();
                playSynth('collect');
                spawnExplosion(obsX, obs.y, '#00FFFF');
            }
        }
    }

    // 7. Update Particles
    for(let i=0; i<particles.length; i++) {
        if (particles[i].active) {
            particles[i].x += particles[i].vx;
            particles[i].y += particles[i].vy + scrollSpeed * 0.5; 
            particles[i].life -= 0.05;
            if (particles[i].life <= 0) particles[i].active = false;
        }
    }
}

function draw() {
    ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    
    // Apply Screenshake Context Translation
    ctx.save();
    if (screenShake > 0) {
        let dx = (Math.random() - 0.5) * screenShake;
        let dy = (Math.random() - 0.5) * screenShake;
        ctx.translate(dx, dy);
    }

    if (state === 'MENU' || state === 'HELP') {
        ctx.fillStyle = '#fff';
        for(let i=0; i<40; i++) {
            ctx.globalAlpha = Math.random() * 0.5 + 0.1;
            ctx.fillRect(Math.random()*GAME_WIDTH, (frameCount*2 + i*20) % GAME_HEIGHT, 1, Math.random()*10+5);
        }
        ctx.globalAlpha = 1.0;
        ctx.restore();
        return;
    }

    // Draw Stars (Speed lines)
    ctx.fillStyle = '#445588';
    for(let i=0; i<stars.length; i++) {
        ctx.fillRect(stars[i].x, stars[i].y, 1, stars[i].speed * 2);
    }

    // Draw Lane Dividers
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.1)';
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 15]);
    ctx.beginPath();
    for(let i=1; i<=3; i++) {
        ctx.moveTo(i * 60, 0 - (distance % 25));
        ctx.lineTo(i * 60, GAME_HEIGHT);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw Lasers
    for(let i=0; i<lasers.length; i++) {
        if (lasers[i].active) {
            ctx.fillStyle = '#FF00FF';
            ctx.shadowBlur = 10; ctx.shadowColor = '#FF00FF';
            ctx.fillRect(lasers[i].x - lasers[i].w/2, lasers[i].y - lasers[i].h/2, lasers[i].w, lasers[i].h);
        }
    }
    ctx.shadowBlur = 0;

    // Draw Obstacles
    for (let i = 0; i < obstacles.length; i++) {
        let obs = obstacles[i];
        if (!obs.active) continue;
        let obsX = LANES[obs.lane];

        if (obs.type === 0) {
            ctx.fillStyle = '#FF4444';
            ctx.shadowBlur = 10; ctx.shadowColor = '#FF0000';
            ctx.fillRect(obsX - obs.w/2, obs.y - obs.h/2, obs.w, obs.h);
            
            ctx.fillStyle = '#220000'; ctx.shadowBlur = 0;
            ctx.fillRect(obsX - obs.w/2 + 5, obs.y - 2, obs.w - 10, 4);
        } else {
            ctx.fillStyle = '#00FFFF';
            ctx.shadowBlur = 15; ctx.shadowColor = '#00FFFF';
            ctx.beginPath();
            ctx.moveTo(obsX, obs.y - obs.h/2);
            ctx.lineTo(obsX + obs.w/2, obs.y);
            ctx.lineTo(obsX, obs.y + obs.h/2);
            ctx.lineTo(obsX - obs.w/2, obs.y);
            ctx.fill();
            ctx.fillStyle = '#fff'; ctx.shadowBlur = 0;
            ctx.beginPath(); ctx.arc(obsX, obs.y, 3, 0, Math.PI*2); ctx.fill();
        }
    }
    ctx.shadowBlur = 0;

    // Draw Particles
    for(let i=0; i<particles.length; i++) {
        if (particles[i].active) {
            ctx.fillStyle = particles[i].color;
            ctx.globalAlpha = particles[i].life;
            ctx.fillRect(particles[i].x, particles[i].y, 3, 3);
        }
    }
    ctx.globalAlpha = 1.0;

    // Draw Player Ship (If alive)
    if (state === 'PLAYING') {
        ctx.shadowBlur = 15; ctx.shadowColor = '#FF00FF';
        
        ctx.fillStyle = '#FF00FF';
        ctx.beginPath();
        ctx.moveTo(p.x, p.y - p.h/2); 
        ctx.lineTo(p.x + p.w/2, p.y + p.h/2); 
        ctx.lineTo(p.x, p.y + p.h/4); 
        ctx.lineTo(p.x - p.w/2, p.y + p.h/2); 
        ctx.fill();

        ctx.fillStyle = '#00FFFF'; ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y - p.h/4);
        ctx.lineTo(p.x + 4, p.y + 2);
        ctx.lineTo(p.x - 4, p.y + 2);
        ctx.fill();

        ctx.fillStyle = '#FFFF00';
        ctx.globalAlpha = Math.random() * 0.5 + 0.5;
        ctx.beginPath(); ctx.arc(p.x, p.y + p.h/2 + 2, 4, 0, Math.PI*2); ctx.fill();
        ctx.globalAlpha = 1.0;
    }
    
    ctx.restore(); // Restore context to fix screenshake offset for HUD
}



function loop() {
    if (state === 'GAMEOVER' && screenShake > 0) {
        screenShake -= 0.5;
        for(let i=0; i<particles.length; i++) {
            if (particles[i].active) {
                particles[i].x += particles[i].vx; particles[i].y += particles[i].vy; particles[i].life -= 0.05;
                if (particles[i].life <= 0) particles[i].active = false;
            }
        }
    } else if (state === 'PLAYING' || state === 'MENU' || state === 'HELP') {
        update(); 
    }
    draw();
    animationFrame = requestAnimationFrame(loop);
}

// --- UI & INPUT HANDLING ---
const ui = {
    menu: document.getElementById('menu-screen'),
    help: document.getElementById('help-screen'),
    gameover: document.getElementById('gameover-screen'),
    skLeft: document.getElementById('sk-left'),
    skCenter: document.getElementById('sk-center'),
    skRight: document.getElementById('sk-right')
};

function updateMenuUI() {
    document.getElementById('menu-play').className = (menuIdx === 0) ? "menu-item active" : "menu-item";
    document.getElementById('menu-help').className = (menuIdx === 1) ? "menu-item active" : "menu-item";
}

function updateSoftkeys() {
    if (state === 'MENU') {
        ui.skLeft.innerText = "Exit"; ui.skCenter.innerText = "SELECT"; ui.skRight.innerText = "";
    } else if (state === 'HELP') {
        ui.skLeft.innerText = "Back"; ui.skCenter.innerText = ""; ui.skRight.innerText = "";
    } else if (state === 'PLAYING') {
        ui.skLeft.innerText = "Menu"; ui.skCenter.innerText = "FIRE"; ui.skRight.innerText = "Pause";
    } else if (state === 'GAMEOVER') {
        ui.skLeft.innerText = "Menu"; ui.skCenter.innerText = "RESTART"; ui.skRight.innerText = "";
    } else if (state === 'PAUSED') {
        ui.skLeft.innerText = "Menu"; ui.skCenter.innerText = "RESUME"; ui.skRight.innerText = "";
    }
}

function handleInput(action, isDown = true) {
    if (!isDown) return; 

    if (state === 'MENU') {
        if (action === 'UP' || action === 'DOWN') {
            menuIdx = (menuIdx === 0) ? 1 : 0;
            updateMenuUI(); playSynth('tick');
        } else if (action === 'OK') {
            playSynth('tick');
            if (menuIdx === 0) {
                ui.menu.classList.add('hidden');
                resetGame(); state = 'PLAYING'; updateSoftkeys();
            } else {
                ui.menu.classList.add('hidden'); ui.help.classList.remove('hidden');
                state = 'HELP'; updateSoftkeys();
            }
        }
    } 
    else if (state === 'HELP') {
        if (action === 'SOFT_LEFT' || action === 'OK') {
            ui.help.classList.add('hidden'); ui.menu.classList.remove('hidden');
            state = 'MENU'; updateSoftkeys(); playSynth('tick');
        }
    } 
    else if (state === 'PLAYING') {
        if (action === 'LEFT') { if (p.lane > 0) { p.lane--; playSynth('move'); } }
        else if (action === 'RIGHT') { if (p.lane < 3) { p.lane++; playSynth('move'); } }
        else if (action === 'OK') { fireLaser(); }
        else if (action === 'SOFT_LEFT') { state = 'MENU'; ui.menu.classList.remove('hidden'); updateSoftkeys(); }
        else if (action === 'SOFT_RIGHT') { state = 'PAUSED'; updateSoftkeys(); }
    }
    else if (state === 'PAUSED') {
        if (action === 'OK' || action === 'SOFT_RIGHT') { state = 'PLAYING'; updateSoftkeys(); } 
        else if (action === 'SOFT_LEFT') { state = 'MENU'; ui.menu.classList.remove('hidden'); updateSoftkeys(); }
    }
    else if (state === 'GAMEOVER') {
        if (action === 'OK') {
            ui.gameover.classList.add('hidden');
            resetGame(); state = 'PLAYING'; updateSoftkeys(); playSynth('tick');
        } else if (action === 'SOFT_LEFT') {
            ui.gameover.classList.add('hidden'); ui.menu.classList.remove('hidden');
            state = 'MENU'; updateSoftkeys();
        }
    }
}

// --- INPUT WIRING ---
window.addEventListener('keydown', (e) => {
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Enter', ' '].includes(e.key)) e.preventDefault();
    if (e.key === 'ArrowLeft' || e.key === '4') handleInput('LEFT', true);
    else if (e.key === 'ArrowRight' || e.key === '6') handleInput('RIGHT', true);
    else if (e.key === 'ArrowUp' || e.key === '2') handleInput('UP', true);
    else if (e.key === 'ArrowDown' || e.key === '8') handleInput('DOWN', true);
    else if (e.key === 'Enter' || e.key === '5' || e.key === ' ') handleInput('OK', true);
    else if (e.key === 'q' || e.key === 'Q' || e.key === 'SoftLeft') handleInput('SOFT_LEFT', true);
    else if (e.key === 'e' || e.key === 'E' || e.key === 'SoftRight') handleInput('SOFT_RIGHT', true);
});

const dpadMap = {
    'btn-left': 'LEFT', 'btn-right': 'RIGHT', 'btn-up': 'UP', 'btn-down': 'DOWN', 
    'btn-ok': 'OK', 'sk-left': 'SOFT_LEFT', 'sk-right': 'SOFT_RIGHT', 'sk-center': 'OK'
};

for (const [id, action] of Object.entries(dpadMap)) {
    const el = document.getElementById(id);
    if (!el) continue;
    el.addEventListener('touchstart', (e) => { e.preventDefault(); handleInput(action, true); });
    el.addEventListener('mousedown', (e) => { e.preventDefault(); handleInput(action, true); });
}

initPools(); updateMenuUI(); updateSoftkeys(); loop();
