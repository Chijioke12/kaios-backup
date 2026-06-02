
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
    } else if (type === 'jump1') { 
        osc.type = 'sine'; osc.frequency.setValueAtTime(300, now); osc.frequency.exponentialRampToValueAtTime(600, now + 0.15);
        gain.gain.setValueAtTime(0.2, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        osc.start(now); osc.stop(now + 0.15);
    } else if (type === 'jump2') { 
        osc.type = 'sine'; osc.frequency.setValueAtTime(400, now); osc.frequency.exponentialRampToValueAtTime(800, now + 0.15);
        gain.gain.setValueAtTime(0.2, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        osc.start(now); osc.stop(now + 0.15);
    } else if (type === 'sync') { 
        osc.type = 'triangle'; osc.frequency.setValueAtTime(1000, now); osc.frequency.setValueAtTime(2000, now + 0.1);
        gain.gain.setValueAtTime(0.2, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        osc.start(now); osc.stop(now + 0.2);
    } else if (type === 'collect') { 
        osc.type = 'square'; osc.frequency.setValueAtTime(800, now); osc.frequency.setValueAtTime(1200, now + 0.05);
        gain.gain.setValueAtTime(0.1, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.start(now); osc.stop(now + 0.1);
    } else if (type === 'die') { 
        osc.type = 'sawtooth'; osc.frequency.setValueAtTime(200, now); osc.frequency.exponentialRampToValueAtTime(50, now + 0.6);
        gain.gain.setValueAtTime(0.3, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
        osc.start(now); osc.stop(now + 0.6);
    }
}

// --- GAME LOGIC & STATE ---
let state = 'MENU'; 
let menuIdx = 0;
let animationFrame;

// Config
const GRAVITY = 0.42;
const JUMP_FORCE = -7.8;
const MOVE_SPEED = 5.5;
let score = 0;
let highScore = 0;
let syncs = 3;
let keys = { left: false, right: false, up: false };
let screenShake = 0;
let syncFlash = 0;

try {
    const saved = localStorage.getItem('neon_echo_highscore');
    if (saved) highScore = parseInt(saved);
} catch(e) {}
document.getElementById('menu-highscore').innerText = highScore;

// Two Players
let p1 = { x: 50, y: 200, vx: 0, vy: 0, w: 14, h: 14, color: '#00FFFF', speed: 150, jumpForce: 550, gravity: 1200 };
let p2 = { x: 176, y: 200, vx: 0, vy: 0, w: 14, h: 14, color: '#FF00FF', speed: 150, jumpForce: 550, gravity: 1200 };

// Object Pools
let platforms = [];
let syncOrbs = [];

function initPools() {
    platforms = [];
    // Base platforms
    platforms.push({ side: 0, x: 45, y: 280, w: 30, h: 8 });
    platforms.push({ side: 1, x: 165, y: 280, w: 30, h: 8 });
    
    let currentY = 280;
    for(let i=0; i<12; i++) { // 12 pairs
        currentY -= Math.floor(Math.random() * 25 + 35);
        spawnPlatformPair(currentY);
    }
    
    syncOrbs = [];
    for(let i=0; i<3; i++) {
        syncOrbs.push({ active: false, x: 0, y: 0, r: 6 });
    }
}

function spawnPlatformPair(yLoc) {
    // Left side (0 to 90)
    platforms.push({ side: 0, x: Math.random() * 90, y: yLoc + (Math.random()*10-5), w: 30, h: 8 });
    // Right side (120 to 210)
    platforms.push({ side: 1, x: 120 + Math.random() * 90, y: yLoc + (Math.random()*10-5), w: 30, h: 8 });
    
    // Rare chance to spawn a sync orb
    if (Math.random() > 0.9 && score > 200) {
        for(let i=0; i<syncOrbs.length; i++) {
            if (!syncOrbs[i].active) {
                syncOrbs[i].active = true;
                syncOrbs[i].y = yLoc - 20;
                syncOrbs[i].x = Math.random() > 0.5 ? 60 : 180;
                break;
            }
        }
    }
}

function triggerGameOver() {
    state = 'GAMEOVER'; 
    playSynth('die');
    screenShake = 20; 
    
    document.getElementById('final-score').innerText = score;
    
    let alertText = "";
    if (score > highScore) {
        highScore = score;
        alertText = "NEW HIGH SCORE!";
        try { localStorage.setItem('neon_echo_highscore', highScore.toString()); } catch(e) {}
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

function updateHUD() {
    document.getElementById('score').innerText = score;
    document.getElementById('syncs').innerText = "Syncs: " + syncs;
    if (syncs === 0) document.getElementById('syncs').style.color = '#555';
    else document.getElementById('syncs').style.color = '#FFFF00';
}

function executeEchoSync() {
    if (syncs <= 0) return;
    
    syncs--;
    syncFlash = 1.0;
    playSynth('sync');
    screenShake = 5;
    
    // Determine who is higher (lower Y value)
    if (p1.y < p2.y) {
        // p1 is higher, rescue p2
        p2.y = p1.y;
        p2.vy = p1.vy;
    } else {
        // p2 is higher, rescue p1
        p1.y = p2.y;
        p1.vy = p2.vy;
    }
    updateHUD();
}

function resetGame() {
    initPools();
    p1.x = 45; p1.y = 200; p1.vy = 0;
    p2.x = 165; p2.y = 200; p2.vy = 0;
    score = 0;
    syncs = 3;
    screenShake = 0;
    syncFlash = 0;
    updateHUD();
}

// --- GAME LOOP ---
let lastTime = 0;
function update(dt) {
    if (state !== 'PLAYING') return;

    if (dt > 0.1) dt = 0.1;

    if (screenShake > 0) screenShake -= 1;
    if (syncFlash > 0) syncFlash -= 0.05;

    // 1. Mirrored Movement
    if (keys.left) {
        p1.vx = -p1.speed;
        p2.vx = p2.speed; // Mirrored!
    } else if (keys.right) {
        p1.vx = p1.speed;
        p2.vx = -p2.speed;
    } else {
        p1.vx = 0; p2.vx = 0;
    }

    // "Hold Up Button -> Stop Jumping" mechanics
    if (keys.up) {
        if (p1.vy < 0) p1.vy += p1.gravity * dt;
        if (p2.vy < 0) p2.vy += p2.gravity * dt;
    }

    p1.x += p1.vx * dt; p1.vy += p1.gravity * dt; p1.y += p1.vy * dt;
    p2.x += p2.vx * dt; p2.vy += p2.gravity * dt; p2.y += p2.vy * dt;

    // 2. Dual Wrap-Around logic
    // Left Zone: 0 to 120
    if (p1.x < -p1.w) p1.x = 120;
    if (p1.x > 120) p1.x = -p1.w;
    // Right Zone: 120 to 240
    if (p2.x < 120 - p2.w) p2.x = 240;
    if (p2.x > 240) p2.x = 120 - p2.w;

    // 3. Independent Collision
    if (p1.vy > 0) {
        for (let i = 0; i < platforms.length; i++) {
            let plat = platforms[i];
            if (plat.side === 0 && p1.x + p1.w > plat.x && p1.x < plat.x + plat.w && 
                p1.y + p1.h > plat.y && p1.y + p1.h < plat.y + plat.h + (p1.vy * dt)) {
                p1.y = plat.y - p1.h; 
                p1.vy = -p1.jumpForce;  
                playSynth('jump1');
            }
        }
    }
    
    if (p2.vy > 0) {
        for (let i = 0; i < platforms.length; i++) {
            let plat = platforms[i];
            if (plat.side === 1 && p2.x + p2.w > plat.x && p2.x < plat.x + plat.w && 
                p2.y + p2.h > plat.y && p2.y + p2.h < plat.y + plat.h + (p2.vy * dt)) {
                p2.y = plat.y - p2.h; 
                p2.vy = -p2.jumpForce;  
                playSynth('jump2');
            }
        }
    }

    // 4. Sync Orb Collection
    for(let i=0; i<syncOrbs.length; i++) {
        let orb = syncOrbs[i];
        if (!orb.active) continue;
        
        let d1 = Math.sqrt((p1.x - orb.x)**2 + (p1.y - orb.y)**2);
        let d2 = Math.sqrt((p2.x - orb.x)**2 + (p2.y - orb.y)**2);
        
        if (d1 < p1.w + orb.r || d2 < p2.w + orb.r) {
            orb.active = false;
            syncs = Math.min(syncs + 1, 9);
            playSynth('collect');
            updateHUD();
        }
    }

    // 5. Camera Follows the HIGHEST cube
    let highestY = Math.min(p1.y, p2.y);
    if (highestY < GAME_HEIGHT / 2.5) {
        let diff = (GAME_HEIGHT / 2.5) - highestY;
        p1.y += diff;
        p2.y += diff;
        score += Math.floor(diff);
        document.getElementById('score').innerText = score;
        
        // Move platforms down
        for (let i = 0; i < platforms.length; i++) {
            platforms[i].y += diff;
            if (platforms[i].y > GAME_HEIGHT) {
                // Find highest platform to spawn above
                let highestPlatY = GAME_HEIGHT;
                for (let j = 0; j < platforms.length; j++) {
                    if (i !== j && platforms[j].y < highestPlatY) highestPlatY = platforms[j].y;
                }
                
                platforms[i].y = highestPlatY - (Math.floor(Math.random() * 20) + 20); 
                if (platforms[i].side === 0) platforms[i].x = Math.random() * 90;
                else platforms[i].x = 120 + Math.random() * 90;
            }
        }
        
        // Move Orbs down
        for(let i=0; i<syncOrbs.length; i++) {
            if (syncOrbs[i].active) {
                syncOrbs[i].y += diff;
                if (syncOrbs[i].y > GAME_HEIGHT) syncOrbs[i].active = false;
            }
        }
    }

    // 6. Game Over Condition (If either falls)
    if (p1.y > GAME_HEIGHT + 20 || p2.y > GAME_HEIGHT + 20) {
        triggerGameOver();
    }
}

function draw() {
    ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    
    ctx.save();
    if (screenShake > 0) {
        ctx.translate((Math.random() - 0.5) * screenShake, (Math.random() - 0.5) * screenShake);
    }

    // Flash Effect for Sync
    if (syncFlash > 0) {
        ctx.fillStyle = `rgba(255, 255, 0, ${syncFlash * 0.3})`;
        ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    }

    if (state === 'MENU' || state === 'HELP') {
        ctx.strokeStyle = 'rgba(0, 255, 255, 0.05)';
        for(let i=0; i<GAME_WIDTH; i+=20) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, GAME_HEIGHT); ctx.stroke(); }
        ctx.restore();
        return;
    }

    // Draw the Dimension Splitter
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.beginPath(); ctx.moveTo(120, 0); ctx.lineTo(120, GAME_HEIGHT); ctx.stroke();
    ctx.setLineDash([]);

    // Draw Sync Connection Line (Shows height difference)
    if (state === 'PLAYING') {
        ctx.strokeStyle = 'rgba(255, 255, 0, 0.2)';
        ctx.beginPath();
        ctx.moveTo(p1.x + p1.w/2, p1.y + p1.h/2);
        ctx.lineTo(p2.x + p2.w/2, p2.y + p2.h/2);
        ctx.stroke();
    }

    // Draw Orbs
    for(let i=0; i<syncOrbs.length; i++) {
        if (!syncOrbs[i].active) continue;
        ctx.fillStyle = '#FFFF00';
        ctx.shadowBlur = 10; ctx.shadowColor = '#FFFF00';
        ctx.beginPath(); ctx.arc(syncOrbs[i].x, syncOrbs[i].y, syncOrbs[i].r, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.shadowBlur = 0;
        ctx.beginPath(); ctx.arc(syncOrbs[i].x, syncOrbs[i].y, 2, 0, Math.PI*2); ctx.fill();
    }
    ctx.shadowBlur = 0;

    // Draw Platforms
    for (let i = 0; i < platforms.length; i++) {
        let plat = platforms[i];
        let color = plat.side === 0 ? '#00FFFF' : '#FF00FF';
        
        ctx.fillStyle = color;
        ctx.shadowBlur = 8; ctx.shadowColor = color;
        ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
        
        ctx.fillStyle = '#222'; ctx.shadowBlur = 0;
        ctx.fillRect(plat.x + 4, plat.y + 2, plat.w - 8, plat.h - 4);
    }

    // Draw Players
    if (state === 'PLAYING' || state === 'GAMEOVER') {
        // P1
        ctx.fillStyle = p1.color;
        ctx.shadowBlur = 15; ctx.shadowColor = p1.color;
        ctx.fillRect(p1.x, p1.y, p1.w, p1.h);
        ctx.fillStyle = '#fff'; ctx.shadowBlur = 0;
        ctx.fillRect(p1.x + 3, p1.y + 3, p1.w - 6, p1.h - 6);
        
        // P2
        ctx.fillStyle = p2.color;
        ctx.shadowBlur = 15; ctx.shadowColor = p2.color;
        ctx.fillRect(p2.x, p2.y, p2.w, p2.h);
        ctx.fillStyle = '#fff'; ctx.shadowBlur = 0;
        ctx.fillRect(p2.x + 3, p2.y + 3, p2.w - 6, p2.h - 6);
    }
    
    ctx.restore();
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
        ui.skLeft.innerText = "Menu"; ui.skCenter.innerText = "SYNC"; ui.skRight.innerText = "Pause";
    } else if (state === 'GAMEOVER') {
        ui.skLeft.innerText = "Menu"; ui.skCenter.innerText = "RETRY"; ui.skRight.innerText = "";
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
        
        if (action === 'OK') executeEchoSync();
        
        if (action === 'SOFT_LEFT') { state = 'MENU'; ui.menu.classList.remove('hidden'); updateSoftkeys(); }
        if (action === 'SOFT_RIGHT') { state = 'PAUSED'; updateSoftkeys(); }
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

initPools(); updateMenuUI(); updateSoftkeys(); loop();
