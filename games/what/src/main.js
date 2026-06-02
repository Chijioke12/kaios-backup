
// --- POLYFILLS ---
if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
        if (w < 2 * r) r = w / 2;
        if (h < 2 * r) r = h / 2;
        this.beginPath();
        this.moveTo(x + r, y);
        this.arcTo(x + w, y, x + w, y + h, r);
        this.arcTo(x + w, y + h, x, y + h, r);
        this.arcTo(x, y + h, x, y, r);
        this.arcTo(x, y, x + w, y, r);
        this.closePath();
        return this;
    };
}

// --- GEMINI API ENGINE (AI Banter) ---
const apiKey = ""; // Will be provided by environment
let banterTimeout;

async function generateBanter(context) {
    if (!config.aiBanter || !apiKey) return;
    
    const prompt = `You are a highly competitive Nigerian Whot player. Context: ${context}. Give me one short, funny sentence of trash talk in Nigerian Pidgin English. Keep it under 10 words. No quotes.`;
    
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });
        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (text) {
            const bubble = document.getElementById('banter-bubble');
            bubble.innerText = text.trim();
            bubble.style.opacity = '1';
            clearTimeout(banterTimeout);
            banterTimeout = setTimeout(() => bubble.style.opacity = '0', 4000);
        }
    } catch (error) { console.log("Banter failed", error); }
}

// --- CONFIGURATION & LOCAL STORAGE ---
const CONFIG_KEY = "naija_whot_settings_hd";
let config = { sfx: true, aiBanter: true, whotCard: true, pick3: true, suspend: true, emptyMarketEnds: false };

function loadConfig() { try { const saved = localStorage.getItem(CONFIG_KEY); if (saved) config = { ...config, ...JSON.parse(saved) }; } catch(e) {} }
function saveConfig() { try { localStorage.setItem(CONFIG_KEY, JSON.stringify(config)); } catch(e) {} }

// --- HIGH-DPI CANVAS SCALING FIX ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const GAME_WIDTH = 240; const GAME_HEIGHT = 295; 

function setupHighDPICanvas() {
    const dpr = window.devicePixelRatio || 1;
    canvas.style.width = GAME_WIDTH + 'px'; canvas.style.height = GAME_HEIGHT + 'px';
    canvas.width = GAME_WIDTH * dpr; canvas.height = GAME_HEIGHT * dpr;
    ctx.scale(dpr, dpr);
}
setupHighDPICanvas();

// --- SMART AUDIO FALLBACK SYSTEM ---
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

// Maps your specific JSON manifest to the internal engine
const SOUND_FILES = {
    'deal': 'assets/sfx/sfx_card_deal.ogg', 'play': 'assets/sfx/sfx_card_play.ogg', 'error': 'assets/sfx/sfx_invalid_move.ogg',
    'tick': 'assets/sfx/sfx_btn_click.ogg', 'whot': 'assets/sfx/sfx_whot_played.ogg', 'hold': 'assets/sfx/sfx_hold_on.ogg',
    'pick2': 'assets/sfx/sfx_pick_two.ogg', 'pick3': 'assets/sfx/sfx_pick_three.ogg', 'suspend': 'assets/sfx/sfx_suspension.ogg',
    'market': 'assets/sfx/sfx_gen_market.ogg', 'win': 'assets/sfx/sfx_win.ogg', 'lose': 'assets/sfx/sfx_lose.ogg'
};

function playSound(type) {
    if (!config.sfx) return; 
    const filename = SOUND_FILES[type] || SOUND_FILES['play'];
    
    try {
        const audio = new Audio(filename);
        const playPromise = audio.play();
        if (playPromise !== undefined && typeof playPromise.catch === 'function') {
            playPromise.catch(function(e) {
                playSynth(type);
            });
        }
    } catch (e) {
        playSynth(type);
    }
}

function playSynth(type) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain); gain.connect(audioCtx.destination);
    const now = audioCtx.currentTime;

    if (type === 'deal' || type === 'market') {
        osc.type = 'sine'; osc.frequency.setValueAtTime(600, now); osc.frequency.exponentialRampToValueAtTime(800, now + 0.1);
        gain.gain.setValueAtTime(0.2, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.start(now); osc.stop(now + 0.1);
    } else if (type === 'play' || type === 'hold' || type === 'suspend') {
        osc.type = 'triangle'; osc.frequency.setValueAtTime(400, now); osc.frequency.exponentialRampToValueAtTime(200, now + 0.15);
        gain.gain.setValueAtTime(0.3, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        osc.start(now); osc.stop(now + 0.15);
    } else if (type === 'error' || type === 'lose') {
        osc.type = 'sawtooth'; osc.frequency.setValueAtTime(150, now); osc.frequency.exponentialRampToValueAtTime(100, now + 0.3);
        gain.gain.setValueAtTime(0.2, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        osc.start(now); osc.stop(now + 0.3);
    } else if (type === 'pick2' || type === 'pick3' || type === 'win') {
        osc.type = 'square'; osc.frequency.setValueAtTime(400, now); osc.frequency.setValueAtTime(600, now + 0.1);
        gain.gain.setValueAtTime(0.2, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
        osc.start(now); osc.stop(now + 0.4);
    } else if (type === 'whot') {
        osc.type = 'sine'; osc.frequency.setValueAtTime(800, now); osc.frequency.exponentialRampToValueAtTime(1200, now + 0.5);
        gain.gain.setValueAtTime(0.3, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
        osc.start(now); osc.stop(now + 0.5);
    } else if (type === 'tick') {
        osc.type = 'square'; osc.frequency.setValueAtTime(800, now);
        gain.gain.setValueAtTime(0.1, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
        osc.start(now); osc.stop(now + 0.05);
    }
}

// --- UI ELEMENTS ---
const ui = {
    menu: document.getElementById('menu-screen'), gameover: document.getElementById('gameover-screen'),
    helpScreen: document.getElementById('help-screen'), settingsScreen: document.getElementById('settings-screen'),
    banner: document.getElementById('msg-banner'), menuPlayText: document.getElementById('menu-play-text'),
    skCenter: document.getElementById('sk-center'), skLeft: document.getElementById('sk-left'), skRight: document.getElementById('sk-right')
};

const CARD_W = 46; const CARD_H = 68;
const SUITS = ['circle', 'triangle', 'cross', 'square', 'star'];
const NUMBERS = [1, 2, 3, 4, 5, 7, 8, 10, 11, 13, 14];
const COLORS = { 'circle': '#e74c3c', 'triangle': '#2ecc71', 'cross': '#3498db', 'square': '#e67e22', 'star': '#9b59b6', 'whot': '#111111' };

let state = 'MENU'; let gameInProgress = false; 
let deck = [], market = [], discard = [];
let pHand = [], cHand = [];
let selectedIdx = 0;

let menuSelectIdx = 0; let whotSelectIdx = 0; let settingsSelectIdx = 0; 
const settingsKeys = ['sfx', 'aiBanter', 'whotCard', 'pick3', 'suspend', 'emptyMarketEnds'];

let penalty = 0; let declaredSuit = null; let animationFrame;

// --- HELPER: DRAW SUIT SHAPE ---
function drawSuitShape(ctx, suit, cx, cy, size, color) {
    ctx.fillStyle = color; ctx.strokeStyle = color;
    ctx.beginPath(); ctx.lineWidth = 3;
    if (suit === 'circle') ctx.arc(cx, cy, size, 0, Math.PI*2);
    else if (suit === 'triangle') { ctx.moveTo(cx, cy - size); ctx.lineTo(cx + size, cy + size); ctx.lineTo(cx - size, cy + size); ctx.closePath(); }
    else if (suit === 'square') { ctx.rect(cx - size, cy - size, size*2, size*2); }
    else if (suit === 'cross') { ctx.moveTo(cx, cy - size*1.2); ctx.lineTo(cx, cy + size*1.2); ctx.moveTo(cx - size*1.2, cy); ctx.lineTo(cx + size*1.2, cy); }
    else if (suit === 'star') {
        for(let i=0; i<5; i++) {
            ctx.lineTo(cx + Math.cos(18 + i*72 * Math.PI/180) * size, cy - Math.sin(18 + i*72 * Math.PI/180) * size);
            ctx.lineTo(cx + Math.cos(54 + i*72 * Math.PI/180) * (size/2), cy - Math.sin(54 + i*72 * Math.PI/180) * (size/2));
        } ctx.closePath();
    }
    ctx.stroke(); ctx.fill();
}

// --- CRISP CARD RENDERING WITH VALID HINTS ---
function drawCard(ctx, rawX, rawY, card, isFaceUp, isSelected, isValidMove = false) {
    const x = Math.round(rawX); const y = Math.round(rawY);

    if (isSelected) {
        ctx.strokeStyle = '#f1c40f'; ctx.lineWidth = 3;
    } else if (isValidMove) {
        ctx.strokeStyle = '#2ecc71'; ctx.lineWidth = 2;
    } else {
        ctx.strokeStyle = '#ddd'; ctx.lineWidth = 1;
    }

    ctx.fillStyle = '#fdfaf0'; ctx.beginPath(); ctx.roundRect(x, y, CARD_W, CARD_H, 4); ctx.fill(); ctx.stroke(); 

    if (!isFaceUp) {
        ctx.fillStyle = '#1a8f55'; ctx.beginPath(); ctx.roundRect(x+4, y+4, CARD_W-8, CARD_H-8, 2); ctx.fill();
        ctx.strokeStyle = '#fdfaf0'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x+4, y+4); ctx.lineTo(x+CARD_W-4, y+CARD_H-4); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x+CARD_W-4, y+4); ctx.lineTo(x+4, y+CARD_H-4); ctx.stroke();
        ctx.fillStyle = '#fdfaf0'; ctx.font = 'bold 12px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; 
        ctx.fillText("WHOT", x + CARD_W/2, y + CARD_H/2); return;
    }

    const color = COLORS[card.suit]; ctx.fillStyle = color; ctx.strokeStyle = color;
    ctx.font = 'bold 12px Arial'; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; 
    ctx.fillText(card.num, x + 4, y + 4);
    if (card.suit === 'star') { ctx.font = 'bold 8px Arial'; ctx.fillText("(" + (card.num * 2) + ")", x + 4, y + 16); }

    ctx.save(); ctx.translate(x + CARD_W - 4, y + CARD_H - 4); ctx.rotate(Math.PI);
    ctx.font = 'bold 12px Arial'; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText(card.num, 0, 0);
    if (card.suit === 'star') { ctx.font = 'bold 8px Arial'; ctx.fillText("(" + (card.num * 2) + ")", 0, 12); }
    ctx.restore();

    const cx = x + CARD_W/2; const cy = y + CARD_H/2; const size = 12;

    if (card.suit === 'whot') {
        ctx.font = 'bold 14px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText("WHOT", cx, cy - 6); ctx.font = '10px Arial'; ctx.fillText("20", cx, cy + 8);
    } else { drawSuitShape(ctx, card.suit, cx, cy, size, color); }
}

// --- GAME LOGIC & SCORING ---
function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function refillMarket() {
    if (discard.length <= 1) return false;
    const topCard = discard.pop();
    market = [...discard];
    discard = [topCard];
    market.forEach(c => { c.x = 20; c.y = 110; c.tx = 20; c.ty = 110; });
    shuffle(market);
    showBanner('MARKET REFILLED!', '#2ecc71');
    return true;
}

function calculateScore(hand) {
    return hand.reduce((sum, card) => {
        if (card.suit === 'whot') return sum + 20;
        if (card.suit === 'star') return sum + (card.num * 2); 
        return sum + card.num;
    }, 0);
}

function initGame() {
    deck = [];
    const distribution = {
        'circle': [1, 2, 3, 4, 5, 7, 8, 10, 11, 12, 13, 14],
        'triangle': [1, 2, 3, 4, 5, 7, 8, 10, 11, 12, 13, 14],
        'cross': [1, 2, 3, 5, 7, 10, 11, 13, 14],
        'square': [1, 2, 3, 5, 7, 10, 11, 13, 14],
        'star': [1, 2, 3, 4, 5, 7, 8]
    };

    Object.keys(distribution).forEach(suit => {
        distribution[suit].forEach(num => {
            deck.push({suit, num, x: 20, y: 110, tx: 20, ty: 110});
        });
    });

    if (config.whotCard) {
        for(let i=0; i<5; i++) deck.push({suit: 'whot', num: 20, x: 20, y: 110, tx: 20, ty: 110});
    }

    shuffle(deck);
    market = [...deck]; pHand = []; cHand = []; discard = []; penalty = 0; declaredSuit = null;
    for(let i=0; i<4; i++) { pHand.push(market.pop()); cHand.push(market.pop()); }
    let first = market.pop();
    while(first.suit === 'whot' || [1,2,5,8,14].includes(first.num)) { market.unshift(first); first = market.pop(); }
    discard.push(first); first.tx = 97; first.ty = 110;
    selectedIdx = 0; updateLayouts();
}
function updateLayouts() {
    const cSpace = Math.min(25, 180 / Math.max(1, cHand.length)); const cStartX = 120 - ((cHand.length-1) * cSpace) / 2 - CARD_W/2;
    cHand.forEach((c, i) => { c.tx = cStartX + (i * cSpace); c.ty = 10; });
    const pSpace = Math.min(30, 200 / Math.max(1, pHand.length)); const pStartX = 120 - ((pHand.length-1) * pSpace) / 2 - CARD_W/2;
    pHand.forEach((c, i) => { c.tx = pStartX + (i * pSpace); c.ty = i === selectedIdx && state === 'PLAYING' ? 200 : 210; });
    if (selectedIdx >= pHand.length) selectedIdx = Math.max(0, pHand.length - 1);
    
    if (penalty > 0) {
        ui.skCenter.innerText = "DEFEND"; ui.skRight.innerText = "DRAW " + penalty; ui.skRight.style.color = "#e74c3c"; ui.skLeft.innerText = "Pause"; 
    } else {
        ui.skCenter.innerText = "PLAY"; ui.skRight.innerText = "MARKET"; ui.skRight.style.color = "#bdc3c7"; ui.skLeft.innerText = "Pause"; 
    }
}

function showBanner(msg, color) {
    ui.banner.innerText = msg; ui.banner.style.color = color; ui.banner.style.opacity = '1';
    setTimeout(() => ui.banner.style.opacity = '0', 1500);
}

function checkValid(card) {
    if (discard.length === 0) return false;
    const top = discard[discard.length-1];
    if (penalty > 0) {
        if (top.num === 2 && card.num === 2) return true;
        if (config.pick3 && top.num === 5 && card.num === 5) return true; 
        return false;
    }
    if (card.suit === 'whot') return true;
    if (declaredSuit) return card.suit === declaredSuit;
    return card.suit === top.suit || card.num === top.num;
}

function triggerGameOver(winner) {
    state = 'GAMEOVER'; gameInProgress = false; ui.gameover.classList.remove('hidden');
    let pScore = calculateScore(pHand); let cScore = calculateScore(cHand);

    if (winner === 'PLAYER') {
        document.getElementById('end-title').innerText = "YOU WIN!"; document.getElementById('end-desc').innerText = `CPU Score: ${cScore}`;
        playSound('win'); generateBanter("You just lost the game. The player beat you.");
    } else if (winner === 'CPU') {
        document.getElementById('end-title').innerText = "CPU WINS!"; document.getElementById('end-title').style.color = '#e74c3c'; document.getElementById('end-desc').innerText = `Your Score: ${pScore}`;
        playSound('lose'); generateBanter("You just won the game. Gloat and brag to the player.");
    } else {
        document.getElementById('end-title').innerText = "MARKET EMPTY!";
        if (pScore === cScore) document.getElementById('end-desc').innerText = `It's a Tie! (${pScore} pts)`;
        else if (pScore < cScore) { document.getElementById('end-desc').innerText = `You Win! (${pScore} vs ${cScore})`; playSound('win'); }
        else { document.getElementById('end-desc').innerText = `CPU Wins! (${cScore} vs ${pScore})`; playSound('lose'); }
    }
    updateSoftkeys('GAMEOVER');
}

function playCard(isPlayer) {
    const hand = isPlayer ? pHand : cHand;
    const idx = isPlayer ? selectedIdx : getCPUChoice();

    if (idx === -1) {
        if (penalty > 0) {
            for(let i=0; i<penalty; i++) {
                if (market.length === 0 && !config.emptyMarketEnds) refillMarket();
                if(market.length>0) hand.push(market.pop());
            }
            penalty = 0;
        } else {
            if (market.length === 0 && !config.emptyMarketEnds) refillMarket();
            if(market.length>0) hand.push(market.pop()); 
            else if (config.emptyMarketEnds) { triggerGameOver('EMPTY'); return; }
        }
        playSound('deal'); showBanner(isPlayer ? 'YOU DRAW' : 'CPU DRAWS', '#f1c40f');
        state = 'PLAYING'; updateLayouts(); return;
    }

    const card = hand[idx];
    if (isPlayer && !checkValid(card)) { playSound('error'); showBanner('INVALID MOVE!', '#e74c3c'); return; }

    hand.splice(idx, 1); discard.push(card);
    card.tx = 97 + (Math.random()*4-2); card.ty = 110 + (Math.random()*4-2); declaredSuit = null; 

    if (hand.length === 0) { playSound('play'); triggerGameOver(isPlayer ? 'PLAYER' : 'CPU'); return; }

    let extraTurn = false;
    if (card.num === 1) { showBanner('HOLD ON!', '#f1c40f'); extraTurn = true; playSound('hold'); if (!isPlayer) generateBanter("You played a Hold On (1) card. Tell them to wait.");}
    else if (card.num === 2) { showBanner('PICK TWO!', '#e74c3c'); penalty += 2; playSound('pick2'); if (!isPlayer) generateBanter("You played a Pick Two (2) card. Tell them to pick up two cards.");}
    else if (card.num === 5 && config.pick3) { showBanner('PICK THREE!', '#e74c3c'); penalty += 3; playSound('pick3'); if (!isPlayer) generateBanter("You played a Pick Three (5) card. Tell them they are in trouble.");}
    else if (card.num === 8 && config.suspend) { showBanner('SUSPENSION!', '#f1c40f'); extraTurn = true; playSound('suspend'); if (!isPlayer) generateBanter("You played a Suspension (8) card. Tell them you skipped them.");} 
    else if (card.num === 14) { showBanner('GEN MARKET!', '#e74c3c'); penalty += 1; playSound('market'); if (!isPlayer) generateBanter("You played a General Market (14) card. Tell everybody to go to the market.");} 
    else { playSound('play'); }
    
    if (card.suit === 'whot') {
        playSound('whot');
        if (isPlayer) {
            state = 'WHOT_CHOICE'; whotSelectIdx = 0; updateLayouts(); updateSoftkeys('WHOT_CHOICE'); return; 
        } else {
            let counts = {'circle':0, 'triangle':0, 'cross':0, 'square':0, 'star':0};
            cHand.forEach(c => { if(c.suit !== 'whot') counts[c.suit]++; });
            declaredSuit = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
            showBanner(`CPU NEEDS ${declaredSuit.toUpperCase()}`, COLORS[declaredSuit]);
            generateBanter(`You played a WHOT card and requested ${declaredSuit}. Demand it confidently.`);
        }
    }

    updateLayouts();
    if (isPlayer) { if (!extraTurn) { state = 'CPU_TURN'; setTimeout(() => playCard(false), 1200); } } 
    else { if (extraTurn) { setTimeout(() => playCard(false), 1200); } else { state = 'PLAYING'; } }
}

function getCPUChoice() { for (let i = 0; i < cHand.length; i++) { if (checkValid(cHand[i])) return i; } return -1; }

function drawFromMarket() {
    if (state !== 'PLAYING') return;
    if (market.length === 0 && !config.emptyMarketEnds) refillMarket();
    if (market.length === 0) { if (config.emptyMarketEnds) triggerGameOver('EMPTY'); return; }
    
    if (penalty > 0) {
        for(let i=0; i<penalty; i++) { 
            if (market.length === 0 && !config.emptyMarketEnds) refillMarket();
            if(market.length>0) pHand.push(market.pop()); 
        }
        penalty = 0; playSound('deal'); state = 'CPU_TURN'; updateLayouts(); setTimeout(() => playCard(false), 1200);
    } else {
        pHand.push(market.pop()); playSound('deal'); state = 'CPU_TURN'; updateLayouts(); setTimeout(() => playCard(false), 1200);
    }
}

// --- RENDER LOOP ---
function draw() {
    ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    if (state === 'WHOT_CHOICE') ctx.globalAlpha = 0.3; 

    if (market.length > 0) {
        drawCard(ctx, 20, 110, {suit: 'whot', num: ''}, false, false, false);
        ctx.fillStyle = '#fdfaf0'; ctx.fillRect(22, 108, CARD_W, 2);
        ctx.fillStyle = '#fdfaf0'; ctx.font = 'bold 12px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; 
        ctx.fillText(market.length, 20 + CARD_W/2, 110 + CARD_H + 5);
    }
    discard.forEach((c, idx) => {
        c.x += (c.tx - c.x) * 0.2; c.y += (c.ty - c.y) * 0.2;
        if (idx > discard.length - 4) drawCard(ctx, c.x, c.y, c, true, false, false);
    });

    cHand.forEach(c => { c.x += (c.tx - c.x) * 0.2; c.y += (c.ty - c.y) * 0.2; drawCard(ctx, c.x, c.y, c, false, false, false); });
    ctx.fillStyle = '#fff'; ctx.font = 'bold 12px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillText(`CPU: ${cHand.length}`, GAME_WIDTH/2, 85);

    ctx.globalAlpha = 1.0; 

    pHand.forEach((c, idx) => {
        c.x += (c.tx - c.x) * 0.2; c.y += (c.ty - c.y) * 0.2;
        let isSelected = (idx === selectedIdx && state === 'PLAYING');
        let isValid = (state === 'PLAYING' && checkValid(c)); 
        drawCard(ctx, c.x, c.y, c, true, isSelected, isValid);
    });

    if (declaredSuit && state !== 'WHOT_CHOICE') {
        ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.beginPath(); ctx.roundRect(160, 120, 60, 40, 5); ctx.fill();
        ctx.fillStyle = COLORS[declaredSuit]; ctx.font = 'bold 10px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; 
        ctx.fillText("NEEDED:", 190, 135); ctx.fillText(declaredSuit.toUpperCase(), 190, 150);
    }

    // --- NATIVE RADIAL WHOT MENU ---
    if (state === 'WHOT_CHOICE') {
        ctx.fillStyle = 'rgba(0,0,0,0.85)';
        ctx.fillRect(0, 40, GAME_WIDTH, 160);

        ctx.fillStyle = '#f1c40f'; ctx.font = 'bold 16px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText("I NEED...", GAME_WIDTH/2, 80);

        const centerX = GAME_WIDTH / 2; const centerY = 120; const radius = 50;   
        
        SUITS.forEach((suit, idx) => {
            const angle = Math.PI + (idx * (Math.PI / 4));
            const x = centerX + Math.cos(angle) * radius; const y = centerY + Math.sin(angle) * radius;
            const isSelected = (idx === whotSelectIdx); const size = isSelected ? 16 : 10;

            if (isSelected) {
                ctx.fillStyle = 'rgba(241, 196, 15, 0.2)'; ctx.beginPath(); ctx.arc(x, y, 20, 0, Math.PI*2); ctx.fill();
                ctx.strokeStyle = '#f1c40f'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, 20, 0, Math.PI*2); ctx.stroke();
            }
            drawSuitShape(ctx, suit, x, y, size, COLORS[suit]);
        });
    }
}

function loop() { draw(); animationFrame = requestAnimationFrame(loop); }

// --- SOFTKEY & MENUS ---
function updateSoftkeys(newState) {
    if (newState === 'MENU') {
        ui.skLeft.innerText = "Exit"; ui.skCenter.innerText = "SELECT"; ui.skRight.innerText = "";
    } else if (newState === 'HELP') {
        ui.skLeft.innerText = "Back"; ui.skCenter.innerText = ""; ui.skRight.innerText = "";
    } else if (newState === 'SETTINGS') {
        ui.skLeft.innerText = "Back"; ui.skCenter.innerText = "TOGGLE"; ui.skRight.innerText = "";
    } else if (newState === 'WHOT_CHOICE') {
        ui.skLeft.innerText = ""; ui.skCenter.innerText = "SELECT"; ui.skRight.innerText = "";
    } else if (newState === 'GAMEOVER') {
        ui.skLeft.innerText = "Menu"; ui.skCenter.innerText = "REPLAY"; ui.skRight.innerText = "";
    }
}

function updateMenuUI() {
    const items = document.querySelectorAll('.menu-item');
    items.forEach((item, idx) => { if (idx === menuSelectIdx) item.classList.add('active'); else item.classList.remove('active'); });
    ui.menuPlayText.innerText = gameInProgress ? "RESUME GAME" : "PLAY GAME";
}

function updateSettingsUI() {
    const items = document.querySelectorAll('.setting-item');
    items.forEach((item, idx) => { if (idx === settingsSelectIdx) item.classList.add('active'); else item.classList.remove('active'); });
    document.getElementById('tg-sfx').innerText = config.sfx ? "ON" : "OFF"; document.getElementById('tg-sfx').className = config.sfx ? "toggle-box" : "toggle-box toggle-off";
    document.getElementById('tg-ai').innerText = config.aiBanter ? "ON" : "OFF"; document.getElementById('tg-ai').className = config.aiBanter ? "toggle-box" : "toggle-box toggle-off";
    document.getElementById('tg-whot').innerText = config.whotCard ? "ON" : "OFF"; document.getElementById('tg-whot').className = config.whotCard ? "toggle-box" : "toggle-box toggle-off";
    document.getElementById('tg-pick3').innerText = config.pick3 ? "ON" : "OFF"; document.getElementById('tg-pick3').className = config.pick3 ? "toggle-box" : "toggle-box toggle-off";
    document.getElementById('tg-suspend').innerText = config.suspend ? "ON" : "OFF"; document.getElementById('tg-suspend').className = config.suspend ? "toggle-box" : "toggle-box toggle-off";
    document.getElementById('tg-empty').innerText = config.emptyMarketEnds ? "ON" : "OFF"; document.getElementById('tg-empty').className = config.emptyMarketEnds ? "toggle-box" : "toggle-box toggle-off";
}

function confirmWhot() {
    declaredSuit = SUITS[whotSelectIdx]; playSound('whot'); showBanner(`SUIT: ${declaredSuit.toUpperCase()}`, COLORS[declaredSuit]);
    state = 'CPU_TURN'; updateLayouts(); setTimeout(() => playCard(false), 1200);
}

// --- INPUT HANDLING ---
function handleInput(action) {
    if (state === 'MENU') {
        if (action === 'UP') { menuSelectIdx = (menuSelectIdx - 1 + 3) % 3; updateMenuUI(); playSound('tick'); } 
        else if (action === 'DOWN') { menuSelectIdx = (menuSelectIdx + 1) % 3; updateMenuUI(); playSound('tick'); } 
        else if (action === 'OK') {
            playSound('tick'); if (audioCtx.state === 'suspended') audioCtx.resume();
            if (menuSelectIdx === 0) {
                ui.menu.classList.add('hidden'); state = 'PLAYING'; 
                if (!gameInProgress) { initGame(); gameInProgress = true; playSound('deal'); }
            } else if (menuSelectIdx === 1) {
                ui.menu.classList.add('hidden'); ui.helpScreen.classList.remove('hidden'); state = 'HELP'; updateSoftkeys('HELP');
            } else if (menuSelectIdx === 2) {
                ui.menu.classList.add('hidden'); ui.settingsScreen.classList.remove('hidden'); state = 'SETTINGS'; settingsSelectIdx = 0; updateSettingsUI(); updateSoftkeys('SETTINGS');
            }
        }
    } else if (state === 'HELP') {
        const helpDiv = document.getElementById('help-content');
        if (action === 'UP') { helpDiv.scrollTop -= 30; playSound('tick'); } 
        else if (action === 'DOWN') { helpDiv.scrollTop += 30; playSound('tick'); } 
        else if (action === 'SOFT_LEFT' || action === 'OK') {
            ui.helpScreen.classList.add('hidden'); ui.menu.classList.remove('hidden'); state = 'MENU'; updateSoftkeys('MENU'); playSound('tick');
        }
    } else if (state === 'SETTINGS') {
        if (action === 'UP') { settingsSelectIdx = (settingsSelectIdx - 1 + settingsKeys.length) % settingsKeys.length; updateSettingsUI(); playSound('tick'); } 
        else if (action === 'DOWN') { settingsSelectIdx = (settingsSelectIdx + 1) % settingsKeys.length; updateSettingsUI(); playSound('tick'); } 
        else if (action === 'OK') { const key = settingsKeys[settingsSelectIdx]; config[key] = !config[key]; saveConfig(); updateSettingsUI(); playSound('tick'); } 
        else if (action === 'SOFT_LEFT') { ui.settingsScreen.classList.add('hidden'); ui.menu.classList.remove('hidden'); state = 'MENU'; updateSoftkeys('MENU'); playSound('tick'); }
    } else if (state === 'PLAYING') {
        if (action === 'LEFT') { selectedIdx = (selectedIdx - 1 + pHand.length) % pHand.length; playSound('tick'); updateLayouts(); } 
        else if (action === 'RIGHT') { selectedIdx = (selectedIdx + 1) % pHand.length; playSound('tick'); updateLayouts(); } 
        else if (action === 'OK') { playCard(true); } 
        else if (action === 'SOFT_RIGHT') { drawFromMarket(); } 
        else if (action === 'SOFT_LEFT') { state = 'MENU'; ui.menu.classList.remove('hidden'); updateMenuUI(); updateSoftkeys('MENU'); }
    } else if (state === 'WHOT_CHOICE') {
        if (action === 'LEFT' || action === 'UP') { whotSelectIdx = (whotSelectIdx - 1 + 5) % 5; playSound('tick'); } 
        else if (action === 'RIGHT' || action === 'DOWN') { whotSelectIdx = (whotSelectIdx + 1) % 5; playSound('tick'); } 
        else if (action === 'OK') { confirmWhot(); }
    } else if (state === 'GAMEOVER') {
        if (action === 'OK') {
            document.getElementById('end-title').style.color = ''; ui.gameover.classList.add('hidden'); state = 'PLAYING'; gameInProgress = true; initGame(); playSound('deal');
        } else if (action === 'SOFT_LEFT') {
            document.getElementById('end-title').style.color = ''; ui.gameover.classList.add('hidden'); ui.menu.classList.remove('hidden'); state = 'MENU'; gameInProgress = false; updateMenuUI(); updateSoftkeys('MENU');
        }
    }
}

document.addEventListener('keydown', (e) => {
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Enter', 'Accept', 'Select', 'SoftLeft', 'SoftRight', '4', '6', '2', '8', '5', 'q', 'Q', 'e', 'E'].includes(e.key)) {
        e.preventDefault();
    }
    if (e.key === 'ArrowLeft' || e.key === '4') handleInput('LEFT'); else if (e.key === 'ArrowRight' || e.key === '6') handleInput('RIGHT');
    else if (e.key === 'ArrowUp' || e.key === '2') handleInput('UP'); else if (e.key === 'ArrowDown' || e.key === '8') handleInput('DOWN');
    else if (e.key === 'Enter' || e.key === 'Accept' || e.key === 'Select' || e.key === '5') handleInput('OK'); else if (e.key === 'SoftLeft' || e.key === 'q' || e.key === 'Q') handleInput('SOFT_LEFT'); 
    else if (e.key === 'SoftRight' || e.key === 'e' || e.key === 'E') handleInput('SOFT_RIGHT'); 
});

document.getElementById('sk-left').addEventListener('mousedown', () => handleInput('SOFT_LEFT')); document.getElementById('sk-left').addEventListener('touchstart', (e) => { e.preventDefault(); handleInput('SOFT_LEFT'); });
document.getElementById('sk-right').addEventListener('mousedown', () => handleInput('SOFT_RIGHT')); document.getElementById('sk-right').addEventListener('touchstart', (e) => { e.preventDefault(); handleInput('SOFT_RIGHT'); });
document.getElementById('sk-center').addEventListener('mousedown', () => handleInput('OK')); document.getElementById('sk-center').addEventListener('touchstart', (e) => { e.preventDefault(); handleInput('OK'); });

const btnIds = {'btn-left': 'LEFT', 'btn-right': 'RIGHT', 'btn-up': 'UP', 'btn-down': 'DOWN', 'btn-ok': 'OK'};
for (let id in btnIds) {
    let el = document.getElementById(id); 
    if (el) {
        el.addEventListener('mousedown', () => handleInput(btnIds[id])); 
        el.addEventListener('touchstart', (e) => { e.preventDefault(); handleInput(btnIds[id]); });
    }
}

loadConfig(); updateMenuUI(); updateSoftkeys('MENU'); loop();
