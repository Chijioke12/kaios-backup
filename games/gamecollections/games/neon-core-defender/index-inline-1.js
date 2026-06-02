
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

// --- SYNTH AUDIO (Retained Optimization) ---
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
    } else if (type === 'block') { 
        osc.type = 'sawtooth'; osc.frequency.setValueAtTime(400, now); osc.frequency.exponentialRampToValueAtTime(100, now + 0.1);
        gain.gain.setValueAtTime(0.1, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.start(now); osc.stop(now + 0.1);
    } else if (type === 'absorb') { 
        osc.type = 'sine'; osc.frequency.setValueAtTime(800, now); osc.frequency.exponentialRampToValueAtTime(1600, now + 0.1);
        gain.gain.setValueAtTime(0.1, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.start(now); osc.stop(now + 0.1);
    } else if (type === 'deflect') { // Wasted energy hit shield
        osc.type = 'triangle'; osc.frequency.setValueAtTime(200, now); osc.frequency.exponentialRampToValueAtTime(100, now + 0.1);
        gain.gain.setValueAtTime(0.05, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.start(now); osc.stop(now + 0.1);
    } else if (type === 'shockwave') { 
        osc.type = 'square'; osc.frequency.setValueAtTime(1000, now); osc.frequency.exponentialRampToValueAtTime(50, now + 0.8);
        gain.gain.setValueAtTime(0.2, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.8);
        osc.start(now); osc.stop(now + 0.8);
    } else if (type === 'boom') { 
        osc.type = 'sawtooth'; osc.frequency.setValueAtTime(150, now); osc.frequency.exponentialRampToValueAtTime(30, now + 0.6);
        gain.gain.setValueAtTime(0.3, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
        osc.start(now); osc.stop(now + 0.6);
    }
}

// --- GAME LOGIC & STATE ---
let state = 'MENU'; 
let menuIdx = 0;
let animationFrame;

// Game Physics Config
const CX = GAME_WIDTH / 2;
const CY = GAME_HEIGHT / 2;
const SHIELD_RADIUS = 35;
const CORE_RADIUS = 12;

let score = 0;
let highScore = 0;
let screenShake = 0; // Retained Juice Feature
let difficultySpeed = 1.5;
let spawnRate = 60; // Frames between spawns

// Try to load high score
try {
    const saved = localStorage.getItem('neon_core_highscore');
    if (saved) highScore = parseInt(saved);
} catch(e) {}
document.getElementById('menu-highscore').innerText = highScore;

// Player Entity (The Shield)
let p = { 
    targetAngle: Math.PI / 2, // Starts facing bottom
    currentAngle: Math.PI / 2,
    arcWidth: Math.PI / 2, // 90 degrees wide
    energy: 0,
    maxEnergy: 10
};

// Shockwave Effect Data
let shockwave = { active: false, radius: 0, alpha: 0 };

// Object Pooling (Retained RAM Optimization)
let mobs = [];
let particles = [];

function initPools() {
    mobs = [];
    for(let i=0; i<20; i++) {
        // type: 0 = Enemy (Red), 1 = Energy (Yellow)
        mobs.push({ active: false, x: 0, y: 0, angle: 0, speed: 0, type: 0 });
    }
    
    particles = [];
    for(let i=0; i<40; i++) {
        particles.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, color: '#fff' });
    }
}

function spawnMob() {
    for(let i=0; i<mobs.length; i++) {
        if (!mobs[i].active) {
            let type = Math.random() > 0.75 ? 1 : 0; // 25% chance for Energy
            let edge = Math.floor(Math.random() * 4); // 0:Top, 1:Right, 2:Bottom, 3:Left
            
            mobs[i].active = true;
            mobs[i].type = type;
            mobs[i].speed = difficultySpeed + (Math.random() * 0.5);
            
            // Spawn strictly on cardinal axes for logic purity
            if (edge === 0) { mobs[i].x = CX; mobs[i].y = -20; mobs[i].angle = Math.PI/2; }
            else if (edge === 1) { mobs[i].x = GAME_WIDTH + 20; mobs[i].y = CY; mobs[i].angle = Math.PI; }
            else if (edge === 2) { mobs[i].x = CX; mobs[i].y = GAME_HEIGHT + 20; mobs[i].angle = -Math.PI/2; }
            else if (edge === 3) { mobs[i].x = -20; mobs[i].y = CY; mobs[i].angle = 0; }
            
            break;
        }
    }
}

function spawnExplosion(x, y, color, amount=10) {
    let spawned = 0;
    for(let i=0; i<particles.length; i++) {
        if (!particles[i].active) {
            particles[i].active = true;
            particles[i].x = x; particles[i].y = y;
            particles[i].vx = (Math.random() - 0.5) * 6;
            particles[i].vy = (Math.random() - 0.5) * 6;
            particles[i].life = 1.0;
            particles[i].color = color;
            spawned++;
            if (spawned >= amount) break;
        }
    }
}

function triggerShockwave() {
    if (p.energy < p.maxEnergy) return;
    
    p.energy = 0;
    updateHUD();
    playSynth('shockwave');
    screenShake = 15;
    
    shockwave.active = true;
    shockwave.radius = CORE_RADIUS;
    shockwave.alpha = 1.0;

    // Destroy all active enemies
    for(let i=0; i<mobs.length; i++) {
        if (mobs[i].active) {
            mobs[i].active = false;
            score += 2; // Bonus points
            spawnExplosion(mobs[i].x, mobs[i].y, mobs[i].type === 0 ? '#FF4444' : '#FFFF00', 5);
        }
    }
    document.getElementById('score').innerText = score;
}

function updateHUD() {
    document.getElementById('score').innerText = score;
    let bar = document.getElementById('energy-bar-fill');
    let pct = (p.energy / p.maxEnergy) * 100;
    bar.style.width = pct + '%';
    
    if (p.energy >= p.maxEnergy) {
        bar.classList.add('energy-full');
        ui.skCenter.style.color = '#00FFFF';
    } else {
        bar.classList.remove('energy-full');
        ui.skCenter.style.color = '#fff';
    }
}

function triggerGameOver() {
    state = 'GAMEOVER'; 
    playSynth('boom');
    spawnExplosion(CX, CY, '#FF00FF', 30); // Massive core explosion
    screenShake = 25; 
    
    document.getElementById('final-score').innerText = score;
    
    let alertText = "";
    if (score > highScore) {
        highScore = score;
        alertText = "NEW HIGH SCORE!";
        try { localStorage.setItem('neon_core_highscore', highScore.toString()); } catch(e) {}
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
    p.energy = 0;
    p.targetAngle = Math.PI / 2;
    p.currentAngle = Math.PI / 2;
    score = 0;
    difficultySpeed = 1.5;
    spawnRate = 60;
    screenShake = 0;
    shockwave.active = false;
    updateHUD();
}

// Utility: Shortest angular distance interpolation
function lerpAngle(current, target, factor) {
    let diff = target - current;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    return current + diff * factor;
}

// Utility: Angle difference
function angleDiff(a, b) {
    let diff = a - b;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    return diff;
}

// --- GAME LOOP ---
let frameCount = 0;

function update() {
    if (state !== 'PLAYING') return;
    frameCount++;

    // 1. Difficulty Scaling
    if (frameCount % 300 === 0) {
        difficultySpeed += 0.2;
        spawnRate = Math.max(20, spawnRate - 5);
    }
    
    if (screenShake > 0) screenShake -= 1;

    // 2. Shield Rotation
    p.currentAngle = lerpAngle(p.currentAngle, p.targetAngle, 0.3);

    // 3. Spawner Logic
    if (frameCount % spawnRate === 0) {
        spawnMob();
        // Rare double spawn
        if (score > 50 && Math.random() > 0.7) setTimeout(spawnMob, 200); 
    }

    // 4. Update Shockwave
    if (shockwave.active) {
        shockwave.radius += 8;
        shockwave.alpha -= 0.03;
        if (shockwave.alpha <= 0) shockwave.active = false;
    }

    // 5. Update Mobs & Collisions
    for (let i = 0; i < mobs.length; i++) {
        let mob = mobs[i];
        if (!mob.active) continue;

        // Move towards center
        mob.x += Math.cos(mob.angle) * mob.speed;
        mob.y += Math.sin(mob.angle) * mob.speed;

        let distFromCenter = Math.sqrt((mob.x - CX)**2 + (mob.y - CY)**2);
        
        // Calculate incoming angle from core's perspective (opposite of travel angle)
        let incomingAngle = mob.angle + Math.PI;
        while (incomingAngle > Math.PI*2) incomingAngle -= Math.PI*2;

        // A. Check Shield Collision (Outer Ring)
        if (distFromCenter < SHIELD_RADIUS + 4 && distFromCenter > SHIELD_RADIUS - 4) {
            let diff = Math.abs(angleDiff(incomingAngle, p.currentAngle));
            
            // Is it hitting the shield arc?
            if (diff < p.arcWidth / 2) {
                mob.active = false;
                if (mob.type === 0) {
                    // BLOCKED ENEMY
                    score++;
                    playSynth('block');
                    spawnExplosion(mob.x, mob.y, '#00FFFF', 5); // Sparks
                    screenShake = Math.max(screenShake, 3);
                    updateHUD();
                } else {
                    // DEFLECTED ENERGY (Wasted)
                    playSynth('deflect');
                    spawnExplosion(mob.x, mob.y, '#555555', 3);
                }
                continue;
            }
        }

        // B. Check Core Collision (Inner Ring)
        if (distFromCenter < CORE_RADIUS + 4) {
            mob.active = false;
            if (mob.type === 0) {
                // CORE HIT BY ENEMY -> GAME OVER
                triggerGameOver();
                return;
            } else {
                // ABSORBED ENERGY (Success)
                p.energy = Math.min(p.energy + 1, p.maxEnergy);
                score += 2;
                playSynth('absorb');
                spawnExplosion(CX, CY, '#FFFF00', 8); // Core glow burst
                updateHUD();
            }
        }
    }

    // 6. Update Particles
    for(let i=0; i<particles.length; i++) {
        if (particles[i].active) {
            particles[i].x += particles[i].vx;
            particles[i].y += particles[i].vy;
            particles[i].life -= 0.05;
            if (particles[i].life <= 0) particles[i].active = false;
        }
    }
}

function draw() {
    ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    
    // Apply Screenshake Context Translation (Retained Feature)
    ctx.save();
    if (screenShake > 0) {
        let dx = (Math.random() - 0.5) * screenShake;
        let dy = (Math.random() - 0.5) * screenShake;
        ctx.translate(dx, dy);
    }

    if (state === 'MENU' || state === 'HELP') {
        // Aesthetic Grid Background
        ctx.strokeStyle = 'rgba(0, 255, 255, 0.05)';
        ctx.beginPath();
        for(let i=0; i<GAME_WIDTH; i+=20) { ctx.moveTo(i, 0); ctx.lineTo(i, GAME_HEIGHT); }
        for(let j=0; j<GAME_HEIGHT; j+=20) { ctx.moveTo(0, j); ctx.lineTo(GAME_WIDTH, j); }
        ctx.stroke();
        ctx.restore();
        return;
    }

    // Background Arena Rings
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(CX, CY, SHIELD_RADIUS, 0, Math.PI*2); ctx.stroke();
    ctx.beginPath(); ctx.arc(CX, CY, 100, 0, Math.PI*2); ctx.stroke();
    
    // Draw Axis lines
    ctx.setLineDash([5, 5]);
    ctx.beginPath(); ctx.moveTo(CX, 0); ctx.lineTo(CX, GAME_HEIGHT); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, CY); ctx.lineTo(GAME_WIDTH, CY); ctx.stroke();
    ctx.setLineDash([]);

    // Draw Shockwave
    if (shockwave.active) {
        ctx.strokeStyle = `rgba(0, 255, 255, ${shockwave.alpha})`;
        ctx.lineWidth = 10 * shockwave.alpha;
        ctx.beginPath(); ctx.arc(CX, CY, shockwave.radius, 0, Math.PI*2); ctx.stroke();
    }

    // Draw Mobs
    for (let i = 0; i < mobs.length; i++) {
        let mob = mobs[i];
        if (!mob.active) continue;

        ctx.translate(mob.x, mob.y);
        ctx.rotate(mob.angle);

        if (mob.type === 0) {
            // Enemy (Red Spikes)
            ctx.fillStyle = '#FF4444';
            ctx.shadowBlur = 10; ctx.shadowColor = '#FF0000';
            ctx.beginPath();
            ctx.moveTo(6, 0); // Pointing forward
            ctx.lineTo(-6, -6);
            ctx.lineTo(-3, 0);
            ctx.lineTo(-6, 6);
            ctx.fill();
        } else {
            // Energy (Yellow Diamonds)
            ctx.fillStyle = '#FFFF00';
            ctx.shadowBlur = 15; ctx.shadowColor = '#FFFF00';
            ctx.beginPath();
            ctx.moveTo(5, 0);
            ctx.lineTo(0, 4);
            ctx.lineTo(-5, 0);
            ctx.lineTo(0, -4);
            ctx.fill();
        }

        ctx.rotate(-mob.angle);
        ctx.translate(-mob.x, -mob.y);
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

    // Draw Core & Shield (If alive)
    if (state === 'PLAYING') {
        // Core Glow based on energy
        let glowPulse = Math.sin(frameCount * 0.1) * 2;
        let coreColor = p.energy >= p.maxEnergy ? '#00FFFF' : '#FF00FF';
        
        ctx.fillStyle = coreColor;
        ctx.shadowBlur = 15 + glowPulse; ctx.shadowColor = coreColor;
        ctx.beginPath(); ctx.arc(CX, CY, CORE_RADIUS, 0, Math.PI*2); ctx.fill();
        
        // Core inner white
        ctx.fillStyle = '#fff'; ctx.shadowBlur = 0;
        ctx.beginPath(); ctx.arc(CX, CY, CORE_RADIUS - 4, 0, Math.PI*2); ctx.fill();

        // The Shield Arc
        ctx.strokeStyle = '#00FFFF';
        ctx.lineWidth = 6;
        ctx.lineCap = 'round';
        ctx.shadowBlur = 15; ctx.shadowColor = '#00FFFF';
        ctx.beginPath();
        ctx.arc(CX, CY, SHIELD_RADIUS, p.currentAngle - p.arcWidth/2, p.currentAngle + p.arcWidth/2);
        ctx.stroke();
        ctx.shadowBlur = 0;
    }
    
    ctx.restore(); // Restore context to fix screenshake offset for UI overlays
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
        ui.skLeft.innerText = "Menu"; ui.skCenter.innerText = "BLAST"; ui.skRight.innerText = "Pause";
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
        // Shield Direction Controls
        if (action === 'UP') { p.targetAngle = -Math.PI / 2; playSynth('tick'); }
        else if (action === 'RIGHT') { p.targetAngle = 0; playSynth('tick'); }
        else if (action === 'DOWN') { p.targetAngle = Math.PI / 2; playSynth('tick'); }
        else if (action === 'LEFT') { p.targetAngle = Math.PI; playSynth('tick'); }
        
        // Shockwave
        else if (action === 'OK') { triggerShockwave(); }
        
        // Menus
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
