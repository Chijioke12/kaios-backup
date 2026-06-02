
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

// --- SYNTH AUDIO (KaiOS Optimized, No Assets) ---
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
        osc.type = 'sine'; osc.frequency.setValueAtTime(300, now); osc.frequency.exponentialRampToValueAtTime(600, now + 0.15);
        gain.gain.setValueAtTime(0.2, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        osc.start(now); osc.stop(now + 0.15);
    } else if (type === 'switch') { 
        osc.type = 'triangle'; osc.frequency.setValueAtTime(900, now); osc.frequency.setValueAtTime(1200, now + 0.05);
        gain.gain.setValueAtTime(0.1, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.start(now); osc.stop(now + 0.1);
    } else if (type === 'die') { 
        osc.type = 'sawtooth'; osc.frequency.setValueAtTime(200, now); osc.frequency.exponentialRampToValueAtTime(50, now + 0.5);
        gain.gain.setValueAtTime(0.3, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
        osc.start(now); osc.stop(now + 0.5);
    }
}

// --- GAME LOGIC & STATE ---
let state = 'MENU'; // MENU, HELP, PLAYING, GAMEOVER, PAUSED
let menuIdx = 0;
let animationFrame;

const COLORS = ['#00FFFF', '#FF00FF']; // Cyan, Magenta
let p = { x: 120, y: 150, vx: 0, vy: 0, w: 16, h: 16, colorIdx: 0, speed: 150, jumpForce: 550, gravity: 1200 };
let platforms = [];
let score = 0;
let keys = { left: false, right: false, up: false };

// Object Pooling for Memory Efficiency
function initPlatforms() {
    platforms = [];
    // 1st base platform
    platforms.push({ x: GAME_WIDTH/2 - 25, y: GAME_HEIGHT - 30, w: 50, h: 10, colorIdx: 0 });
    
    // Generate sequential platforms safely within jump distance (40-80px gaps)
    let currentY = GAME_HEIGHT - 30;
    for(let i = 0; i < 10; i++) {
        currentY -= Math.floor(Math.random() * 30 + 35);
        spawnPlatform(currentY);
    }
}

function spawnPlatform(yLoc) {
    platforms.push({
        x: Math.random() * (GAME_WIDTH - 40),
        y: yLoc, w: 40, h: 10,
        colorIdx: Math.random() > 0.5 ? 1 : 0
    });
}

function resetGame() {
    p.x = GAME_WIDTH/2 - p.w/2;
    p.y = GAME_HEIGHT/2;
    p.vx = 0; p.vy = 0; p.colorIdx = 0;
    score = 0;
    initPlatforms();
    document.getElementById('score').innerText = "0";
}

// --- GAME LOOP ---
let lastTime = 0;
function update(dt) {
    if (state !== 'PLAYING') return;

    if (dt > 0.1) dt = 0.1; // Cap delta time

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
                p.y + p.h > plat.y && p.y + p.h < plat.y + plat.h + (p.vy * dt) && 
                p.colorIdx === plat.colorIdx) {
                
                p.y = plat.y - p.h; 
                p.vy = -p.jumpForce;  
                playSynth('jump');
            }
        }
    }

    // Camera scroll (Move platforms down)
    if (p.y < GAME_HEIGHT / 2.5) {
        let diff = (GAME_HEIGHT / 2.5) - p.y;
        p.y += diff;
        score += Math.floor(diff);
        document.getElementById('score').innerText = score;
        
        for (let i = 0; i < platforms.length; i++) {
            platforms[i].y += diff;
            
            // If platform goes off the bottom of the screen
            if (platforms[i].y > GAME_HEIGHT) {
                
                // [BUGFIX] Safely find the absolute highest platform currently in the array
                let highestY = GAME_HEIGHT;
                for (let j = 0; j < platforms.length; j++) {
                    if (i !== j && platforms[j].y < highestY) {
                        highestY = platforms[j].y;
                    }
                }
                
                // Spawn securely within reachable jump distance (Max ~65px)
                platforms[i].y = highestY - (Math.floor(Math.random() * 30) + 35); 
                platforms[i].x = Math.random() * (GAME_WIDTH - platforms[i].w);
                platforms[i].colorIdx = Math.random() > 0.5 ? 1 : 0;
            }
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
        ctx.fillStyle = 'rgba(0, 255, 255, 0.1)'; ctx.fillRect(20, GAME_HEIGHT-50, 40, 10);
        ctx.fillStyle = 'rgba(255, 0, 255, 0.1)'; ctx.fillRect(150, GAME_HEIGHT-100, 40, 10);
        return;
    }

    for (let i = 0; i < platforms.length; i++) {
        let plat = platforms[i];
        ctx.fillStyle = COLORS[plat.colorIdx];
        ctx.shadowBlur = 10; ctx.shadowColor = COLORS[plat.colorIdx];
        ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
    }

    // Player (Glowing cube)
    ctx.fillStyle = COLORS[p.colorIdx];
    ctx.shadowBlur = 15; ctx.shadowColor = COLORS[p.colorIdx];
    ctx.fillRect(p.x, p.y, p.w, p.h);
    ctx.fillStyle = '#fff'; ctx.shadowBlur = 0; ctx.fillRect(p.x + 4, p.y + 4, p.w - 8, p.h - 8);
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
        ui.skLeft.innerText = "Menu"; ui.skCenter.innerText = "SWITCH"; ui.skRight.innerText = "Pause";
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
        if (action === 'OK') {
            p.colorIdx = (p.colorIdx === 0) ? 1 : 0;
            playSynth('switch');
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
// Keyboard
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
    
    // Touch Devices
    el.addEventListener('touchstart', (e) => { e.preventDefault(); handleInput(action, true); });
    el.addEventListener('touchend', (e) => { e.preventDefault(); handleInput(action, false); });
    el.addEventListener('touchcancel', (e) => { e.preventDefault(); handleInput(action, false); });
    
    // Mouse (Desktop fallback)
    el.addEventListener('mousedown', (e) => { e.preventDefault(); handleInput(action, true); });
    window.addEventListener('mouseup', () => { handleInput(action, false); });
}

// Start Loop
updateMenuUI(); updateSoftkeys(); loop();
