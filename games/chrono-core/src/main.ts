import './style.css';

const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

const ui = {
    menu: document.getElementById('menu-screen')!,
    gameover: document.getElementById('gameover-screen')!,
    hud: document.getElementById('hud')!,
    timeDial: document.getElementById('time-dial')!,
    score: document.getElementById('score-val')!,
    hp: document.getElementById('hp-val')!,
    fScore: document.getElementById('final-score')!,
    timeBar: document.getElementById('time-bar') as HTMLElement
};

// --- AUDIO ASSETS ---
const sounds = {
    laser: new Audio('./assets/laser.ogg'),
    explosion: new Audio('./assets/explosion.ogg'),
    timeSlow: new Audio('./assets/time_slow.ogg')
};

// --- HIGH QUALITY SVG ASSETS (Scaled for KaiOS) ---
const createSVGImage = (svgString: string) => {
    const img = new Image();
    img.src = 'data:image/svg+xml;utf8,' + encodeURIComponent(svgString);
    return img;
};

const assets = {
    player: createSVGImage(`
        <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'>
            <defs>
                <radialGradient id='coreGlow' cx='50%' cy='50%' r='50%'>
                    <stop offset='0%' stop-color='#ffffff'/><stop offset='50%' stop-color='#58a6ff'/><stop offset='100%' stop-color='rgba(88, 166, 255, 0)'/>
                </radialGradient>
                <filter id='neon'><feGaussianBlur stdDeviation='2' result='blur'/><feMerge><feMergeNode in='blur'/><feMergeNode in='SourceGraphic'/></feMerge></filter>
            </defs>
            <circle cx='50' cy='50' r='45' fill='none' stroke='#238636' stroke-width='4' stroke-dasharray='10 15' opacity='0.5'/>
            <circle cx='50' cy='50' r='30' fill='none' stroke='#58a6ff' stroke-width='4' filter='url(#neon)'/>
            <circle cx='50' cy='50' r='20' fill='url(#coreGlow)'/>
            <polygon points='50,0 70,35 30,35' fill='#58a6ff' filter='url(#neon)'/>
        </svg>
    `),
    enemy: createSVGImage(`
        <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'>
            <defs><filter id='redGlow'><feGaussianBlur stdDeviation='3' result='blur'/><feMerge><feMergeNode in='blur'/><feMergeNode in='SourceGraphic'/></feMerge></filter></defs>
            <polygon points='50,15 85,85 50,70 15,85' fill='#0d1117' stroke='#f85149' stroke-width='6' stroke-linejoin='round' filter='url(#redGlow)'/>
            <circle cx='50' cy='60' r='12' fill='#f85149'/>
        </svg>
    `)
};

// --- GAME ENGINE STATE ---
let state = 'MENU';
let score = 0;
let animationFrame: number;
let worldTimeScale = 0.1;
let lastTimeScale = 0.1;

let keys = { up: false, down: false, left: false, right: false, fire: false };

interface Entity {
    x: number;
    y: number;
    size: number;
    angle: number;
}

interface Player extends Entity {
    speed: number;
    hp: number;
    shootCooldown: number;
}

interface Enemy extends Entity {
    speed: number;
}

interface Bullet {
    x: number;
    y: number;
    vx: number;
    vy: number;
    trail: { x: number; y: number }[];
}

interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    color: string;
}

let player: Player;
let enemies: Enemy[] = [];
let bullets: Bullet[] = [];
let particles: Particle[] = [];

function initGame() {
    score = 0;
    worldTimeScale = 0.1;

    player = {
        x: canvas.width / 2, y: canvas.height / 2,
        size: 14, speed: 2.5, hp: 100,
        angle: 0,
        shootCooldown: 0
    };

    enemies = [];
    bullets = [];
    particles = [];

    ui.score.innerText = score.toString();
    ui.hp.innerText = player.hp.toString();
}

// --- CORE LOGIC LOOP ---
function update() {
    if (state !== 'PLAYING') return;

    // 1. Calculate Time Dilation
    let isMoving = keys.up || keys.down || keys.left || keys.right;
    let targetTimeScale = isMoving ? 1.0 : 0.05;

    worldTimeScale += (targetTimeScale - worldTimeScale) * 0.15;

    // Audio cue for time dilation
    if (worldTimeScale < 0.2 && lastTimeScale >= 0.2) {
        sounds.timeSlow.currentTime = 0;
        sounds.timeSlow.play().catch(() => {});
    }
    lastTimeScale = worldTimeScale;

    ui.timeBar.style.width = (worldTimeScale * 100) + '%';
    ui.timeBar.style.background = worldTimeScale > 0.8 ? '#58a6ff' : '#8b949e';

    // 2. Player Movement 
    let dx = 0, dy = 0;
    if (keys.up) dy -= 1;
    if (keys.down) dy += 1;
    if (keys.left) dx -= 1;
    if (keys.right) dx += 1;

    if (dx !== 0 && dy !== 0) {
        let length = Math.sqrt(dx * dx + dy * dy);
        dx /= length; dy /= length;
    }

    player.x += dx * player.speed;
    player.y += dy * player.speed;

    player.x = Math.max(player.size, Math.min(canvas.width - player.size, player.x));
    player.y = Math.max(player.size, Math.min(canvas.height - player.size, player.y));

    // 3. AUTO-AIM LOGIC (KaiOS specific)
    let closestEnemy: Enemy | null = null;
    let minDist = Infinity;
    for (let e of enemies) {
        let dist = Math.hypot(player.x - e.x, player.y - e.y);
        if (dist < minDist) {
            minDist = dist;
            closestEnemy = e;
        }
    }

    if (closestEnemy) {
        let targetAngle = Math.atan2(closestEnemy.y - player.y, closestEnemy.x - player.x) + Math.PI / 2;
        let diff = targetAngle - player.angle;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        player.angle += diff * 0.2;
    }

    // 4. Player Shooting (OK Button)
    if (player.shootCooldown > 0) player.shootCooldown -= 1;
    if (keys.fire && player.shootCooldown <= 0) {
        bullets.push({
            x: player.x, y: player.y,
            vx: Math.cos(player.angle - Math.PI / 2) * 8,
            vy: Math.sin(player.angle - Math.PI / 2) * 8,
            trail: []
        });
        player.shootCooldown = 15;
        
        // Play sound
        sounds.laser.currentTime = 0;
        sounds.laser.play().catch(() => {});

        // Screen shake
        ctx.translate((Math.random() - 0.5) * 3, (Math.random() - 0.5) * 3);
    }

    // 5. Enemy Spawning 
    if (Math.random() < 0.04 * worldTimeScale) {
        let edge = Math.floor(Math.random() * 4);
        let ex = edge % 2 === 0 ? Math.random() * canvas.width : (edge === 1 ? canvas.width + 10 : -10);
        let ey = edge % 2 !== 0 ? Math.random() * canvas.height : (edge === 0 ? -10 : canvas.height + 10);

        enemies.push({
            x: ex, y: ey, size: 12,
            speed: 1.0 + Math.random() * 1.0,
            angle: 0
        });
    }

    // 6. Enemy AI Update
    for (let i = enemies.length - 1; i >= 0; i--) {
        let e = enemies[i];
        e.angle = Math.atan2(player.y - e.y, player.x - e.x) + Math.PI / 2;
        e.x += Math.cos(e.angle - Math.PI / 2) * e.speed * worldTimeScale;
        e.y += Math.sin(e.angle - Math.PI / 2) * e.speed * worldTimeScale;

        let dist = Math.hypot(player.x - e.x, player.y - e.y);
        if (dist < player.size + e.size - 5) {
            player.hp -= 20;
            ui.hp.innerText = player.hp.toString();
            createParticles(player.x, player.y, '#f85149', 10);
            enemies.splice(i, 1);
            
            // Play explosion for player hit too?
            sounds.explosion.currentTime = 0;
            sounds.explosion.play().catch(() => {});

            if (player.hp <= 0) gameOver();
        }
    }

    // 7. Bullet Physics
    for (let i = bullets.length - 1; i >= 0; i--) {
        let b = bullets[i];
        b.trail.push({ x: b.x, y: b.y });
        if (b.trail.length > 4) b.trail.shift();

        b.x += b.vx * worldTimeScale;
        b.y += b.vy * worldTimeScale;

        if (b.x < -20 || b.x > canvas.width + 20 || b.y < -20 || b.y > canvas.height + 20) {
            bullets.splice(i, 1);
            continue;
        }

        let hit = false;
        for (let j = enemies.length - 1; j >= 0; j--) {
            let e = enemies[j];
            let dist = Math.hypot(b.x - e.x, b.y - e.y);

            if (dist < e.size) {
                createParticles(e.x, e.y, '#f85149', 6);
                enemies.splice(j, 1);
                bullets.splice(i, 1);
                score++;
                ui.score.innerText = score.toString();
                hit = true;
                
                // Play sound
                sounds.explosion.currentTime = 0;
                sounds.explosion.play().catch(() => {});
                
                break;
            }
        }
        if (hit) continue;
    }

    // 8. Particle Physics
    for (let i = particles.length - 1; i >= 0; i--) {
        let p = particles[i];
        p.x += p.vx * worldTimeScale;
        p.y += p.vy * worldTimeScale;
        p.life -= 0.05 * worldTimeScale;
        if (p.life <= 0) particles.splice(i, 1);
    }
}

function createParticles(x: number, y: number, color: string, amount: number) {
    for (let i = 0; i < amount; i++) {
        particles.push({
            x: x, y: y,
            vx: (Math.random() - 0.5) * 6,
            vy: (Math.random() - 0.5) * 6,
            life: 1.0,
            color: color
        });
    }
}

// --- RENDERING LOOP ---
function draw() {
    ctx.fillStyle = 'rgba(13, 17, 23, 0.4)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grid Background
    ctx.strokeStyle = '#30363d';
    ctx.lineWidth = 1;
    let gridPulse = 15 + (worldTimeScale * 3);
    for (let i = 0; i < canvas.width; i += gridPulse) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, canvas.height); ctx.stroke();
    }
    for (let i = 0; i < canvas.height; i += gridPulse) {
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(canvas.width, i); ctx.stroke();
    }

    if (state === 'PLAYING' && player) {
        // Draw Target Line (Auto-Aim indicator)
        ctx.strokeStyle = 'rgba(88, 166, 255, 0.15)';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 4]);
        ctx.beginPath();
        ctx.moveTo(player.x, player.y);
        ctx.lineTo(player.x + Math.cos(player.angle - Math.PI / 2) * 300, player.y + Math.sin(player.angle - Math.PI / 2) * 300);
        ctx.stroke();
        ctx.setLineDash([]);

        // Draw Player SVG
        ctx.save();
        ctx.translate(player.x, player.y);
        ctx.rotate(player.angle);
        if (assets.player.complete) {
            ctx.drawImage(assets.player, -player.size, -player.size, player.size * 2, player.size * 2);
        }
        ctx.restore();
    }

    // Draw Enemies
    for (let e of enemies) {
        ctx.save();
        ctx.translate(e.x, e.y);
        ctx.rotate(e.angle);
        if (assets.enemy.complete) {
            ctx.drawImage(assets.enemy, -e.size, -e.size, e.size * 2, e.size * 2);
        }
        ctx.restore();
    }

    // Draw Bullets
    for (let b of bullets) {
        ctx.strokeStyle = '#58a6ff';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        // shadowBlur is removed for performance on low-end hardware
        
        ctx.beginPath();
        if (b.trail.length > 0) {
            ctx.moveTo(Math.round(b.trail[0].x), Math.round(b.trail[0].y));
            for (let i = 1; i < b.trail.length; i++) ctx.lineTo(Math.round(b.trail[i].x), Math.round(b.trail[i].y));
        } else {
            ctx.moveTo(Math.round(b.x), Math.round(b.y));
        }
        ctx.lineTo(Math.round(b.x), Math.round(b.y));
        ctx.stroke();
    }

    // Draw Particles
    for (let p of particles) {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillRect(p.x, p.y, 2, 2);
    }
    ctx.globalAlpha = 1.0;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
}

function loop() {
    if (state === 'PLAYING') {
        update();
        draw();
        animationFrame = requestAnimationFrame(loop);
    }
}

function startGame() {
    state = 'PLAYING';
    ui.menu.classList.add('hidden');
    ui.gameover.classList.add('hidden');
    ui.hud.classList.remove('hidden');
    ui.timeDial.classList.remove('hidden');

    keys = { up: false, down: false, left: false, right: false, fire: false };
    initGame();
    loop();
}

function gameOver() {
    state = 'GAMEOVER';
    ui.hud.classList.add('hidden');
    ui.timeDial.classList.add('hidden');
    ui.gameover.classList.remove('hidden');
    ui.fScore.innerText = score.toString();
    cancelAnimationFrame(animationFrame);
    draw();
}

// --- CONTROLS ---

window.addEventListener('keydown', (e) => {
    const k = e.key;
    const isFireKey = k === 'Enter' || k === '5' || k === 'SoftCenter' || k === 'Select' || k === 'OK';
    const isMoveKey = k === 'ArrowUp' || k === '2' || k === 'ArrowDown' || k === '8' || k === 'ArrowLeft' || k === '4' || k === 'ArrowRight' || k === '6';

    if (isFireKey || isMoveKey) {
        e.preventDefault();
    }

    if (state === 'PLAYING') {
        if (k === 'ArrowUp' || k === '2') keys.up = true;
        if (k === 'ArrowDown' || k === '8') keys.down = true;
        if (k === 'ArrowLeft' || k === '4') keys.left = true;
        if (k === 'ArrowRight' || k === '6') keys.right = true;
        if (isFireKey) keys.fire = true;
    } else if (state === 'MENU' || state === 'GAMEOVER') {
        if (isFireKey) startGame();
    }
});

window.addEventListener('keyup', (e) => {
    const k = e.key;
    const isFireKey = k === 'Enter' || k === '5' || k === 'SoftCenter' || k === 'Select' || k === 'OK';
    
    if (k === 'ArrowUp' || k === '2') keys.up = false;
    if (k === 'ArrowDown' || k === '8') keys.down = false;
    if (k === 'ArrowLeft' || k === '4') keys.left = false;
    if (k === 'ArrowRight' || k === '6') keys.right = false;
    if (isFireKey) keys.fire = false;
});

const addTouch = (id: string, key: 'up' | 'down' | 'left' | 'right' | 'fire') => {
    const el = document.getElementById(id);
    if (!el) return;

    const start = (e: Event) => {
        e.preventDefault();
        keys[key] = true;
        // Allow simulator OK button to start/restart game
        if (key === 'fire' && (state === 'MENU' || state === 'GAMEOVER')) {
            startGame();
        }
    };
    const end = (e: Event) => {
        e.preventDefault();
        keys[key] = false;
    };

    el.addEventListener('touchstart', start, { passive: false });
    el.addEventListener('touchend', end, { passive: false });
    el.addEventListener('mousedown', start);
    el.addEventListener('mouseup', end);
    el.addEventListener('mouseleave', end);
};

addTouch('btn-up', 'up');
addTouch('btn-down', 'down');
addTouch('btn-left', 'left');
addTouch('btn-right', 'right');
addTouch('btn-ok', 'fire');

// Restore click listeners for dev mode UI buttons
document.getElementById('start-btn')?.addEventListener('click', startGame);
document.getElementById('restart-btn')?.addEventListener('click', startGame);

// Controls handled by keydown listener for non-touch KaiOS
// Initial draw
draw();

// Hide simulator in production
if (import.meta.env.PROD) {
    const dpad = document.getElementById('d-pad');
    if (dpad) dpad.style.display = 'none';
}

window.focus();
