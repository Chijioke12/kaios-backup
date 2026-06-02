
// Basic debug for KaiOS
window.onerror = function(msg, url, lineNo, columnNo, error) {
    if (msg.includes('ResizeObserver')) return;
    alert('Err: ' + msg + '\nLine: ' + lineNo);
    return false;
};

// --- POLYFILLS & CANVAS SETUP ---

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const GAME_WIDTH = 240; 
const GAME_HEIGHT = 295; // Leaving 25px for softkey bar

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
    } else if (type === 'jump') { 
        osc.type = 'sine'; osc.frequency.setValueAtTime(400, now); osc.frequency.exponentialRampToValueAtTime(800, now + 0.15);
        gain.gain.setValueAtTime(0.2, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        osc.start(now); osc.stop(now + 0.15);
    } else if (type === 'pulse') { 
        osc.type = 'square'; osc.frequency.setValueAtTime(200, now); osc.frequency.exponentialRampToValueAtTime(1000, now + 0.2);
        gain.gain.setValueAtTime(0.15, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        osc.start(now); osc.stop(now + 0.2);
    } else if (type === 'break') { 
        osc.type = 'sawtooth'; osc.frequency.setValueAtTime(150, now); osc.frequency.exponentialRampToValueAtTime(50, now + 0.2);
        gain.gain.setValueAtTime(0.2, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        osc.start(now); osc.stop(now + 0.2);
    } else if (type === 'die') { 
        osc.type = 'sawtooth'; osc.frequency.setValueAtTime(300, now); osc.frequency.exponentialRampToValueAtTime(40, now + 0.6);
        gain.gain.setValueAtTime(0.3, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
        osc.start(now); osc.stop(now + 0.6);
    }
}

// --- GAME LOGIC & STATE ---
let state = 'MENU'; 
let menuIdx = 0;
let animationFrame;

// Game Entities
let platforms = [];
let particles = [];

// Physics Constants
let p = { x: 120, y: 150, vx: 0, vy: 0, w: 16, h: 16, canPulse: false, speed: 150, jumpForce: 550, gravity: 1200, pulseForce: 660 };

let score = 0;
let keys = { left: false, right: false, up: false };

// Object Pooling for Platforms
function initPlatforms() {
    platforms = [];
    platforms.push({ x: GAME_WIDTH/2 - 25, y: GAME_HEIGHT - 30, w: 50, h: 10, type: 0, vx: 0 }); // Base platform
    
    let currentY = GAME_HEIGHT - 30;
    for(let i = 0; i < 15; i++) {
        currentY -= Math.floor(Math.random() * 30 + 35);
        spawnPlatform(currentY);
    }
}

function spawnPlatform(yLoc) {
    // Difficulty logic: higher score = more tricky platforms
    let typeRand = Math.random();
    let type = 0; // 0 = Normal(Cyan)
    let vx = 0;
    
    if (score > 1000) {
        if (typeRand < 0.3) { type = 1; vx = (Math.random() > 0.5 ? 1 : -1) * (1 + Math.random()); } // 1 = Moving(Magenta)
        else if (typeRand < 0.6) { type = 2; } // 2 = Fragile(Yellow)
    } else if (score > 300) {
        if (typeRand < 0.2) { type = 1; vx = (Math.random() > 0.5 ? 1 : -1) * 1.5; }
        else if (typeRand < 0.4) { type = 2; }
    }

    platforms.push({
        x: Math.random() * (GAME_WIDTH - 40),
        y: yLoc, 
        w: type === 2 ? 30 : 40, // Fragile platforms are slightly smaller
        h: 10,
        type: type,
        vx: vx
    });
}

// Object Pooling for Particles (Pre-allocate to save RAM)
function initParticles() {
    particles = [];
    for(let i=0; i<30; i++) {
        particles.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, color: '#fff' });
    }
}

function spawnExplosion(x, y, color, count) {
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
            if (spawned >= count) break;
        }
    }
}

function resetGame() {
    p.x = GAME_WIDTH/2 - p.w/2;
    p.y = GAME_HEIGHT/2;
    p.vx = 0; p.vy = 0; p.canPulse = false;
    score = 0;
    initPlatforms();
    initParticles();
    document.getElementById('score').innerText = "0";
}

// --- GAME LOOP ---
let lastTime = 0;
function update(dt) {
    if (state !== 'PLAYING') return;

    if (dt > 0.1) dt = 0.1;

    // Movement & Physics
    if (keys.left) p.vx = -p.speed;
    else if (keys.right) p.vx = p.speed;
    else p.vx = 0; 
    
    // "Hold Up Button -> Stop Jumping" mechanics
    if (keys.up && p.vy < 0) {
        p.vy += p.gravity * dt;
    }

    p.x += p.vx * dt; 
    p.vy += p.gravity * dt; 
    p.y += p.vy * dt;

    // Screen Wrap
    if (p.x < -p.w) p.x = GAME_WIDTH;
    if (p.x > GAME_WIDTH) p.x = -p.w;

    // Collision (falling down only)
    if (p.vy > 0) {
        for (let i = 0; i < platforms.length; i++) {
            let plat = platforms[i];
            if (p.x + p.w > plat.x && p.x < plat.x + plat.w && 
                p.y + p.h > plat.y && p.y + p.h < plat.y + plat.h + (p.vy * dt)) {
                
                p.y = plat.y - p.h; 
                p.vy = -p.jumpForce;  
                p.canPulse = true; // Reset double jump on bounce
                
                if (plat.type === 2) {
                    // Fragile platform breaks
                    playSynth('break');
                    spawnExplosion(plat.x + plat.w/2, plat.y + plat.h/2, '#FFFF00', 8);
                    plat.y = GAME_HEIGHT + 100; // Throw offscreen to trigger recycling
                } else {
                    playSynth('jump');
                }
            }
        }
    }

    // Camera scroll (Move platforms & particles down)
    if (p.y < GAME_HEIGHT / 2.5) {
        let diff = (GAME_HEIGHT / 2.5) - p.y;
        p.y += diff;
        score += Math.floor(diff);
        document.getElementById('score').innerText = score;
        
        // Move Particles
        for(let i=0; i<particles.length; i++) {
            if (particles[i].active) particles[i].y += diff;
        }

        // Move and Recycle Platforms
        for (let i = 0; i < platforms.length; i++) {
            platforms[i].y += diff;
            
            // Re-spawn platforms that fall off the bottom
            if (platforms[i].y > GAME_HEIGHT) {
                
                // [RETAINED FIX] Safely find the absolute highest platform currently in the array
                let highestY = GAME_HEIGHT;
                for (let j = 0; j < platforms.length; j++) {
                    if (i !== j && platforms[j].y < highestY) highestY = platforms[j].y;
                }
                
                // Difficulty scale gap width
                let maxGap = score > 1500 ? 70 : 60;
                
                // Spawn securely within reachable jump distance
                platforms[i].y = highestY - (Math.floor(Math.random() * 25) + (maxGap - 25)); 
                platforms[i].x = Math.random() * (GAME_WIDTH - platforms[i].w);
                
                // Re-roll platform type
                let typeRand = Math.random();
                platforms[i].type = 0; platforms[i].vx = 0; platforms[i].w = 40;
                
                if (score > 1000) {
                    if (typeRand < 0.3) { platforms[i].type = 1; platforms[i].vx = (Math.random() > 0.5 ? 1 : -1) * (1 + Math.random()); }
                    else if (typeRand < 0.6) { platforms[i].type = 2; platforms[i].w = 30; }
                } else if (score > 300) {
                    if (typeRand < 0.2) { platforms[i].type = 1; platforms[i].vx = (Math.random() > 0.5 ? 1 : -1) * 1.5; }
                    else if (typeRand < 0.4) { platforms[i].type = 2; platforms[i].w = 30; }
                }
            }
        }
    }

    // Update Moving Platforms
    for (let i = 0; i < platforms.length; i++) {
        if (platforms[i].type === 1) {
            platforms[i].x += platforms[i].vx;
            if (platforms[i].x < 0 || platforms[i].x + platforms[i].w > GAME_WIDTH) {
                platforms[i].vx *= -1; // Bounce off walls
            }
        }
    }
    
    // Update Particles
    for(let i=0; i<particles.length; i++) {
        if (particles[i].active) {
            particles[i].x += particles[i].vx;
            particles[i].y += particles[i].vy;
            particles[i].life -= 0.05;
            if (particles[i].life <= 0) particles[i].active = false;
        }
    }

    // Game Over 
    if (p.y > GAME_HEIGHT) {
        state = 'GAMEOVER'; playSynth('die');
        document.getElementById('final-score').innerText = score;
        // Delay UI so player can see crash
    setTimeout(() => {
        if (state === 'GAMEOVER') {
            document.getElementById('gameover-screen').classList.remove('hidden');
            updateSoftkeys();
        }
    }, 1200);
    }
}

function draw() {
    ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    if (state === 'MENU' || state === 'HELP' || state === 'GAMEOVER') {
        // Aesthetic background grid pattern
        ctx.strokeStyle = 'rgba(0, 255, 255, 0.05)';
        ctx.beginPath();
        for(let i=0; i<GAME_WIDTH; i+=20) { ctx.moveTo(i, 0); ctx.lineTo(i, GAME_HEIGHT); }
        for(let j=0; j<GAME_HEIGHT; j+=20) { ctx.moveTo(0, j); ctx.lineTo(GAME_WIDTH, j); }
        ctx.stroke();
        return;
    }

    // Draw Platforms
    for (let i = 0; i < platforms.length; i++) {
        let plat = platforms[i];
        let color = '#00FFFF'; // Cyan (Normal)
        if (plat.type === 1) color = '#FF00FF'; // Magenta (Moving)
        if (plat.type === 2) color = '#FFFF00'; // Yellow (Fragile)
        
        ctx.fillStyle = color;
        ctx.shadowBlur = 10; ctx.shadowColor = color;
        ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
    }

    // Draw Particles
    ctx.shadowBlur = 5;
    for(let i=0; i<particles.length; i++) {
        if (particles[i].active) {
            ctx.fillStyle = particles[i].color;
            ctx.shadowColor = particles[i].color;
            ctx.globalAlpha = particles[i].life;
            ctx.fillRect(particles[i].x, particles[i].y, 3, 3);
        }
    }
    ctx.globalAlpha = 1.0;

    // Draw Player (Glowing cube)
    // Core color depends on if pulse jump is available
    let pColor = p.canPulse ? '#00FFFF' : '#444444';
    ctx.fillStyle = pColor;
    ctx.shadowBlur = p.canPulse ? 15 : 0; ctx.shadowColor = pColor;
    ctx.fillRect(p.x, p.y, p.w, p.h);
    
    // Inner styling
    ctx.fillStyle = '#fff'; ctx.shadowBlur = 0; 
    ctx.fillRect(p.x + 3, p.y + 3, p.w - 6, p.h - 6);
}



function loop(timestamp) {
    let dt = (timestamp - lastTime) / 1000;
    if (!lastTime) dt = 0;
    lastTime = timestamp;

    update(dt); 
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
        ui.skLeft.innerText = "Menu"; ui.skCenter.innerText = "PULSE"; ui.skRight.innerText = "Pause";
    } else if (state === 'GAMEOVER') {
        ui.skLeft.innerText = "Menu"; ui.skCenter.innerText = "RESTART"; ui.skRight.innerText = "";
    } else if (state === 'PAUSED') {
        ui.skLeft.innerText = "Menu"; ui.skCenter.innerText = "RESUME"; ui.skRight.innerText = "";
    }
}

function handleInput(action, isDown = true) {
    if (!isDown) {
        if (action === 'LEFT') keys.left = false;
        if (action === 'RIGHT') keys.right = false;
        if (action === 'UP') keys.up = false;
        return;
    }

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
        if (action === 'LEFT') keys.left = true;
        if (action === 'RIGHT') keys.right = true;
        if (action === 'UP') keys.up = true;
        
        // Pulse Jump Mechanic
        if (action === 'OK' && p.canPulse) {
            p.vy = -p.pulseForce;
            p.canPulse = false;
            playSynth('pulse');
            spawnExplosion(p.x + p.w/2, p.y + p.h, '#00FFFF', 12);
        }
        
        if (action === 'SOFT_LEFT') {
            state = 'MENU'; ui.menu.classList.remove('hidden');
            document.getElementById('score').innerText = "0"; updateSoftkeys();
        }
        if (action === 'SOFT_RIGHT') {
            state = 'PAUSED'; updateSoftkeys();
        }
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
window.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowLeft' || e.key === '4') handleInput('LEFT', false);
    else if (e.key === 'ArrowRight' || e.key === '6') handleInput('RIGHT', false);
    else if (e.key === 'ArrowUp' || e.key === '2') handleInput('UP', false);
});

// On-Screen Softkeys & Controller Mapping
const dpadMap = {
    'btn-left': 'LEFT', 'btn-right': 'RIGHT', 'btn-up': 'UP', 'btn-down': 'DOWN', 
    'btn-ok': 'OK', 'sk-left': 'SOFT_LEFT', 'sk-right': 'SOFT_RIGHT', 'sk-center': 'OK'
};

for (const [id, action] of Object.entries(dpadMap)) {
    const el = document.getElementById(id);
    if (!el) continue;
    el.addEventListener('touchstart', (e) => { e.preventDefault(); handleInput(action, true); });
    el.addEventListener('touchend', (e) => { e.preventDefault(); handleInput(action, false); });
    el.addEventListener('touchcancel', (e) => { e.preventDefault(); handleInput(action, false); });
    el.addEventListener('mousedown', (e) => { e.preventDefault(); handleInput(action, true); });
    window.addEventListener('mouseup', () => { handleInput(action, false); });
}

// Start Loop
updateMenuUI(); updateSoftkeys(); loop();
