
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

// --- SYNTH AUDIO ---
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
    } else if (type === 'flap') { 
        osc.type = 'sine'; osc.frequency.setValueAtTime(300, now); osc.frequency.exponentialRampToValueAtTime(600, now + 0.1);
        gain.gain.setValueAtTime(0.15, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.start(now); osc.stop(now + 0.1);
    } else if (type === 'invert') { 
        osc.type = 'triangle'; osc.frequency.setValueAtTime(800, now); osc.frequency.setValueAtTime(1600, now + 0.1);
        gain.gain.setValueAtTime(0.1, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.start(now); osc.stop(now + 0.1);
    } else if (type === 'shatter') { 
        osc.type = 'square'; osc.frequency.setValueAtTime(800, now); osc.frequency.exponentialRampToValueAtTime(200, now + 0.15);
        gain.gain.setValueAtTime(0.15, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        osc.start(now); osc.stop(now + 0.15);
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

// Game Config
const GRAVITY = 0.4;
const FLAP_FORCE = -6.0;
let scrollSpeed = 3.0;
let score = 0;
let highScore = 0;
let screenShake = 0; 
let frameCount = 0;

try {
    const saved = localStorage.getItem('neon_binary_highscore');
    if (saved) highScore = parseInt(saved);
} catch(e) {}
document.getElementById('menu-highscore').innerText = highScore;

// Player Entity
let p = { 
    x: 60, 
    y: 150, 
    vy: 0, 
    r: 10,
    colorIdx: 0 // 0 = Cyan, 1 = Magenta
};

// Object Pools
let walls = [];
let orbs = [];
let particles = [];

function initPools() {
    walls = [];
    for(let i=0; i<6; i++) {
        walls.push({ active: false, x: 0, w: 20, colorIdx: 0 });
    }
    
    orbs = [];
    for(let i=0; i<6; i++) {
        orbs.push({ active: false, x: 0, y: 0, r: 12 });
    }

    particles = [];
    for(let i=0; i<40; i++) {
        particles.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, color: '#fff' });
    }
}

function spawnObstacle() {
    let spawnX = GAME_WIDTH + 20;
    
    // Spawn Wall
    for(let i=0; i<walls.length; i++) {
        if (!walls[i].active) {
            walls[i].active = true;
            walls[i].x = spawnX;
            walls[i].colorIdx = Math.random() > 0.5 ? 1 : 0;
            break;
        }
    }

    // Spawn Inverter Orb halfway between previous wall and new wall
    let orbX = spawnX - 80; // Distance between walls is ~160px
    for(let i=0; i<orbs.length; i++) {
        if (!orbs[i].active) {
            orbs[i].active = true;
            orbs[i].x = orbX;
            // Keep orb safely away from extreme top/bottom
            orbs[i].y = 40 + Math.random() * (GAME_HEIGHT - 80); 
            break;
        }
    }
}

function spawnExplosion(x, y, color, isShatter=false) {
    let count = isShatter ? 20 : 10;
    let spawned = 0;
    for(let i=0; i<particles.length; i++) {
        if (!particles[i].active) {
            particles[i].active = true;
            particles[i].x = x; 
            particles[i].y = y;
            
            if (isShatter) {
                particles[i].vx = (Math.random() - 0.5) * 10;
                particles[i].vy = (Math.random() - 0.5) * 15;
            } else {
                particles[i].vx = (Math.random() - 0.5) * 6;
                particles[i].vy = (Math.random() - 0.5) * 6;
            }
            
            particles[i].life = 1.0;
            particles[i].color = color;
            spawned++;
            if (spawned >= count) break;
        }
    }
}

function triggerGameOver() {
    state = 'GAMEOVER'; 
    playSynth('boom');
    spawnExplosion(p.x, p.y, p.colorIdx === 0 ? '#00FFFF' : '#FF00FF', false);
    screenShake = 20; 
    
    document.getElementById('final-score').innerText = score;
    
    let alertText = "";
    if (score > highScore) {
        highScore = score;
        alertText = "NEW HIGH SCORE!";
        try { localStorage.setItem('neon_binary_highscore', highScore.toString()); } catch(e) {}
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

function flap() {
    p.vy = FLAP_FORCE;
    playSynth('flap');
    
    // Tiny puff effect
    for(let i=0; i<3; i++) {
        for(let j=0; j<particles.length; j++) {
            if (!particles[j].active) {
                particles[j].active = true;
                particles[j].x = p.x - p.r; particles[j].y = p.y + p.r;
                particles[j].vx = -2 - Math.random()*2; particles[j].vy = Math.random()*2;
                particles[j].life = 0.5;
                particles[j].color = '#fff';
                break;
            }
        }
    }
}

function resetGame() {
    initPools();
    p.y = GAME_HEIGHT / 2;
    p.vy = 0;
    p.colorIdx = 0;
    score = 0;
    scrollSpeed = 3.0;
    screenShake = 0;
    frameCount = 0;
    
    // Spawn first obstacle immediately
    spawnObstacle();
    
    document.getElementById('score').innerText = score;
}

// --- GAME LOOP ---
function update() {
    if (state !== 'PLAYING') return;
    frameCount++;

    if (screenShake > 0) screenShake -= 1;

    // 1. Physics
    p.vy += GRAVITY;
    p.y += p.vy;

    // Boundary Death
    if (p.y > GAME_HEIGHT - p.r || p.y < p.r) {
        triggerGameOver();
        return;
    }

    // 2. Spawner
    let spawnInterval = Math.floor(160 / scrollSpeed);
    if (frameCount % spawnInterval === 0) {
        spawnObstacle();
        scrollSpeed += 0.05; // Slightly speed up over time
    }

    // 3. Update Orbs (Logic Inverters)
    for (let i = 0; i < orbs.length; i++) {
        let orb = orbs[i];
        if (!orb.active) continue;

        orb.x -= scrollSpeed;
        if (orb.x < -20) { orb.active = false; continue; }

        // Collision with player
        let dx = p.x - orb.x;
        let dy = p.y - orb.y;
        if (Math.sqrt(dx*dx + dy*dy) < p.r + orb.r) {
            // INVERT COLOR
            orb.active = false;
            p.colorIdx = 1 - p.colorIdx;
            playSynth('invert');
            spawnExplosion(orb.x, orb.y, '#FFFF00', 10);
            screenShake = Math.max(screenShake, 3);
        }
    }

    // 4. Update Walls
    for (let i = 0; i < walls.length; i++) {
        let wall = walls[i];
        if (!wall.active) continue;

        wall.x -= scrollSpeed;
        if (wall.x < -wall.w) { wall.active = false; continue; }

        // Check intersection
        if (p.x + p.r > wall.x && p.x - p.r < wall.x + wall.w) {
            if (p.colorIdx === wall.colorIdx) {
                // MATCH! Shatter the wall
                wall.active = false;
                score++;
                document.getElementById('score').innerText = score;
                playSynth('shatter');
                spawnExplosion(wall.x, p.y, wall.colorIdx === 0 ? '#00FFFF' : '#FF00FF', 20, true);
                screenShake = Math.max(screenShake, 5);
            } else {
                // MISMATCH! Crash
                p.x = wall.x - p.r; // Pin against wall
                triggerGameOver();
                return;
            }
        }
    }

    // 5. Update Particles
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
    
    ctx.save();
    if (screenShake > 0) {
        ctx.translate((Math.random() - 0.5) * screenShake, (Math.random() - 0.5) * screenShake);
    }

    if (state === 'MENU' || state === 'HELP') {
        // Simple background tech pattern
        ctx.strokeStyle = 'rgba(0, 255, 255, 0.05)';
        for(let i=0; i<GAME_WIDTH; i+=20) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, GAME_HEIGHT); ctx.stroke(); }
        ctx.restore();
        return;
    }

    // Background Speed Lines
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    for(let i=0; i<10; i++) {
        let sx = (GAME_WIDTH - ((frameCount * scrollSpeed * 0.5 + i*50) % GAME_WIDTH));
        ctx.fillRect(sx, (i*37)%GAME_HEIGHT, 20, 1);
    }

    // Draw Orbs
    for (let i = 0; i < orbs.length; i++) {
        if (!orbs[i].active) continue;
        
        ctx.fillStyle = '#FFFF00';
        ctx.shadowBlur = 15; ctx.shadowColor = '#FFFF00';
        
        // Spinning Diamond Effect
        let stretch = Math.sin(frameCount * 0.2) * orbs[i].r;
        ctx.beginPath();
        ctx.moveTo(orbs[i].x, orbs[i].y - orbs[i].r);
        ctx.lineTo(orbs[i].x + stretch, orbs[i].y);
        ctx.lineTo(orbs[i].x, orbs[i].y + orbs[i].r);
        ctx.lineTo(orbs[i].x - stretch, orbs[i].y);
        ctx.fill();
        
        ctx.fillStyle = '#fff'; ctx.shadowBlur = 0;
        ctx.beginPath(); ctx.arc(orbs[i].x, orbs[i].y, 2, 0, Math.PI*2); ctx.fill();
    }
    ctx.shadowBlur = 0;

    // Draw Walls
    for (let i = 0; i < walls.length; i++) {
        if (!walls[i].active) continue;
        
        let color = walls[i].colorIdx === 0 ? '#00FFFF' : '#FF00FF';
        
        // Draw the solid floor-to-ceiling block
        ctx.fillStyle = color;
        ctx.shadowBlur = 10; ctx.shadowColor = color;
        ctx.fillRect(walls[i].x, 0, walls[i].w, GAME_HEIGHT);
        
        // Draw inner high-tech lines on the wall
        ctx.fillStyle = '#111'; ctx.shadowBlur = 0;
        ctx.fillRect(walls[i].x + 4, 0, walls[i].w - 8, GAME_HEIGHT);
        
        ctx.fillStyle = color;
        for(let jy=0; jy<GAME_HEIGHT; jy+=20) {
            let offset = (frameCount * 2) % 20;
            ctx.fillRect(walls[i].x + 6, jy + offset, walls[i].w - 12, 4);
        }
    }

    // Draw Particles
    for(let i=0; i<particles.length; i++) {
        if (particles[i].active) {
            ctx.fillStyle = particles[i].color;
            ctx.globalAlpha = particles[i].life;
            ctx.fillRect(particles[i].x, particles[i].y, 3, 3);
        }
    }
    ctx.globalAlpha = 1.0;

    // Draw Player
    if (state === 'PLAYING') {
        let pColor = p.colorIdx === 0 ? '#00FFFF' : '#FF00FF';
        
        ctx.fillStyle = pColor;
        ctx.shadowBlur = 15; ctx.shadowColor = pColor;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2); ctx.fill();
        
        ctx.fillStyle = '#fff'; ctx.shadowBlur = 0;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r - 3, 0, Math.PI*2); ctx.fill();
        
        // Small thruster trail based on velocity
        if (p.vy < 0) {
            ctx.fillStyle = '#FFFF00';
            ctx.beginPath();
            ctx.moveTo(p.x - 4, p.y + p.r);
            ctx.lineTo(p.x + 4, p.y + p.r);
            ctx.lineTo(p.x, p.y + p.r + 8);
            ctx.fill();
        }
    }
    
    ctx.restore();
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
        ui.skLeft.innerText = "Menu"; ui.skCenter.innerText = "FLAP"; ui.skRight.innerText = "Pause";
    } else if (state === 'GAMEOVER') {
        ui.skLeft.innerText = "Menu"; ui.skCenter.innerText = "RETRY"; ui.skRight.innerText = "";
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
        // Both OK button and UP on D-Pad trigger the flap mechanics
        if (action === 'OK' || action === 'UP') { 
            flap();
        }
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
    // Prevent default scrolling for Spacebar and Arrows
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
