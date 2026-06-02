
const Phaser = (window as any).Phaser;
const W = 240, H = 320, TILE = 16, COLS = 15, ROWS = 17, GRID_Y = 28;
let activeState: any = null;

class Boot extends Phaser.State {
    create() {
        this.scale.scaleMode = Phaser.ScaleManager.SHOW_ALL;
        this.scale.pageAlignHorizontally = true;
        this.scale.pageAlignVertically = true;
        this.game.renderer.renderSession.roundPixels = true;
        this.state.start('Preload');
    }
}

class Preload extends Phaser.State {
    preload() {
        this.load.atlasJSONHash('sprites', 'snake_sprites.png', 'snake_atlas.json');
        const audio = [
            'eat', 'eat_golden', 'eat_bonus', 'powerup', 'death', 
            'levelup', 'biome_change', 'ui_click', 'wall_buzz',
            'music_menu', 'music_lab', 'music_jungle', 'music_space', 'music_lava', 'music_gameover'
        ];
        audio.forEach(key => this.load.audio(key, `snake_audio/${key}.wav`));
        const style = { font: "14px monospace", fill: "#fff" };
        this.add.text(W/2, H/2, "LOADING...", style).anchor.set(0.5);
    }
    create() { this.state.start('Menu'); }
}

class Menu extends Phaser.State {
    private biomes = ['lab', 'jng', 'spc', 'lav'];
    private biomeNames = ['LABORATORY', 'JUNGLE', 'DEEP SPACE', 'LAVA CAVE'];
    private skins = ['GREEN WORM', 'YELLOW SERPENT', 'RED DRAGON'];
    
    private selectedBiome = 0;
    private selectedSkin = 0;
    private selectedRow = 0; // 0: Biome, 1: Skin
    
    private bgGroup: Phaser.Group;
    private demoPool: Phaser.Group;
    private demoSnake: any;
    private uiGroup: Phaser.Group;
    private isMuted = false;
    private musicStarted = false;

    create() {
        activeState = this;
        this.selectedBiome = parseInt(localStorage.getItem('snakeEvolved_biome') || '0');
        this.selectedSkin = parseInt(localStorage.getItem('snakeEvolved_skin') || '0');
        this.isMuted = localStorage.getItem('snakeEvolved_muted') === 'true';
        this.game.sound.mute = this.isMuted;

        this.bgGroup = this.add.group();
        this.createBackground();
        
        this.demoPool = this.add.group();
        for(let i=0; i<8; i++) this.demoPool.create(0, 0, 'sprites', 'body_h_t1').visible = false;
        this.demoSnake = { angle: 0 };

        this.add.sprite(20, 40, 'sprites', 'menu');
        
        this.uiGroup = this.add.group();
        this.drawUI();

        const best = localStorage.getItem('snakeEvolved_best') || '0';
        const bt = this.add.text(W/2, 285, `BEST SCORE: ${best}`, { font: "12px monospace", fill: "#aaa", fontWeight: "bold" });
        bt.anchor.set(0.5);

        this.updateSoftkeys("START", this.isMuted ? "UNMUTE" : "MUTE");
        
        // Stop any previous sounds (like gameover music)
        this.game.sound.stopAll();
        this.tryStartMusic();
    }

    private tryStartMusic() {
        if (this.musicStarted) return;
        
        // Stop all sounds first to be safe
        this.game.sound.stopAll();

        // Resume AudioContext (required by most modern browsers)
        if (this.game.sound.context && this.game.sound.context.state === 'suspended') {
            this.game.sound.context.resume();
        }

        const music = this.game.sound.play('music_menu', 0.5, true);
        this.musicStarted = true; // Set even if it hasn't started yet because of browser restrictions
    }

    createBackground() {
        const b = this.biomes[this.selectedBiome];
        this.bgGroup.removeAll(true);
        for (let gy = 0; gy < 20; gy++) {
            for (let gx = 0; gx < COLS; gx++) {
                const isWall = gx === 0 || gx === COLS - 1 || gy === 0 || gy === 19;
                this.bgGroup.create(gx * TILE, gy * TILE, 'sprites', isWall ? `${b}_wall` : `${b}_floor`);
            }
        }
    }

    drawUI() {
        this.uiGroup.removeAll(true);
        const style = { font: "12px monospace", fill: "#fff" };
        const activeStyle = { font: "12px monospace", fill: "#0f0", fontWeight: "bold" };

        const rows = [
            { label: "WORLD", value: this.biomeNames[this.selectedBiome] },
            { label: "SKIN", value: this.skins[this.selectedSkin] }
        ];

        rows.forEach((row, i) => {
            const y = 180 + i * 40;
            const isSelected = this.selectedRow === i;
            const s = isSelected ? activeStyle : style;
            const t = this.add.text(W/2, y, `${isSelected ? '▶ ' : ''}${row.label}: ${row.value}`, s, this.uiGroup);
            t.anchor.set(0.5);
            if (isSelected) this.game.add.tween(t.scale).to({ x: 1.1, y: 1.1 }, 300, "Linear", true, 0, -1, true);
        });
    }

    update() {
        this.demoSnake.angle += 0.05;
        const cx = W/2, cy = 95;
        const T = 't' + (this.selectedSkin + 1);
        for (let i = 0; i < 8; i++) {
            const s = this.demoPool.getChildAt(i) as Phaser.Sprite;
            const ang = this.demoSnake.angle - (i * 0.2);
            s.x = cx + Math.cos(ang) * 70; s.y = cy + Math.sin(ang) * 35;
            s.visible = true; s.anchor.set(0.5); s.angle = ang * 57.29 + 90;
            if (i === 0) s.frameName = `head_${T}_down`;
            else if (i === 7) s.frameName = `tail_${T}_up`;
            else s.frameName = `body_v_${T}`;
        }
    }

    onKeyDown(e: KeyboardEvent) {
        // Prevent default for game keys
        const key = e.key;
        
        // Normalize keys
        let action = "";
        if (key === "SoftLeft" || key === "F1") action = "softleft";
        else if (key === "SoftRight" || key === "F2") action = "softright";
        else if (key === "Enter") action = "enter";
        else if (key === "Backspace") action = "back";
        else if (key === "ArrowUp") action = "up";
        else if (key === "ArrowDown") action = "down";
        else if (key === "ArrowLeft") action = "left";
        else if (key === "ArrowRight") action = "right";

        if (!action) return;
        
        e.preventDefault();

        this.tryStartMusic(); // Browser unlock on first key
        this.game.sound.play('ui_click', 0.4);

        if (action === "up" || action === "down") { 
            this.selectedRow = 1 - this.selectedRow; 
            this.drawUI(); 
        }
        else if (action === "left") { this.changeValue(-1); }
        else if (action === "right") { this.changeValue(1); }
        else if (action === "softright") { this.toggleMute(); }
        else if (action === "softleft" || action === "enter") { this.startGame(); }
    }

    private toggleMute() {
        this.isMuted = !this.isMuted; this.game.sound.mute = this.isMuted;
        localStorage.setItem('snakeEvolved_muted', this.isMuted.toString());
        this.updateSoftkeys("START", this.isMuted ? "UNMUTE" : "MUTE");
    }

    private startGame() {
        localStorage.setItem('snakeEvolved_biome', this.selectedBiome.toString());
        localStorage.setItem('snakeEvolved_skin', this.selectedSkin.toString());
        this.game.sound.stopAll();
        this.state.start('Game', true, false, {
            biome: this.biomes[this.selectedBiome],
            skin: this.selectedSkin + 1
        });
    }

    changeValue(dir: number) {
        if (this.selectedRow === 0) { this.selectedBiome = (this.selectedBiome + dir + 4) % 4; this.createBackground(); }
        else if (this.selectedRow === 1) { this.selectedSkin = (this.selectedSkin + dir + 3) % 3; }
        this.drawUI();
    }

    updateSoftkeys(left: string, right: string) {
        document.getElementById('sk-left')!.textContent = left;
        document.getElementById('sk-right')!.textContent = right;
    }
}

class Game extends Phaser.State {
    private config: any; private snake: any;
    private pool: Phaser.Group; private bgGroup: Phaser.Group;
    private foodGroup: Phaser.Group; private powerupSprite: Phaser.Sprite;
    private particles: Phaser.Group; private hudGroup: Phaser.Group;
    private moveTimer: number = 0; private moveInterval: number = 250;
    private score: number = 0; private combo: number = 1;
    private lastEatTime: number = 0; private activeMusic: Phaser.Sound;
    private paused_game: boolean = false;
    private scoreText: Phaser.Text; private lengthText: Phaser.Text;
    private puText: Phaser.Text; private puBar: Phaser.Graphics;
    private activePowerup: string | null = null; private puEndTime: number = 0;

    init(config: any) { this.config = config; }

    create() {
        activeState = this;
        this.score = 0; this.combo = 1; this.moveInterval = 250;
        this.bgGroup = this.add.group();
        this.createBackground();
        this.pool = this.add.group();
        for (let i = 0; i < 150; i++) this.pool.create(0, 0, 'sprites', 'body_h_t1').visible = false;
        this.foodGroup = this.add.group();
        this.powerupSprite = this.add.sprite(0, 0, 'sprites', 'pu_shield');
        this.powerupSprite.visible = false;
        this.hudGroup = this.add.group();
        this.add.sprite(0, 0, 'sprites', 'hud', this.hudGroup);
        this.scoreText = this.add.text(12, 7, "0", { font: "12px monospace", fill: "#0f0" }, this.hudGroup);
        this.lengthText = this.add.text(W/2, 7, "3", { font: "12px monospace", fill: "#fff" }, this.hudGroup);
        this.lengthText.anchor.set(0.5, 0);
        this.puBar = this.add.graphics(0, 28);
        this.puText = this.add.text(W/2, 38, "", { font: "10px monospace", fill: "#fff", fontWeight: "bold" });
        this.puText.anchor.set(0.5);
        this.particles = this.add.group();
        this.snake = {
            segments: [{gx: 7, gy: 8}, {gx: 6, gy: 8}, {gx: 5, gy: 8}],
            direction: 'right', nextDir: 'right',
            tier: this.config.skin, length: 3, growing: 0, shield: false, ghost: false, magnet: false
        };
        this.spawnFood(); this.spawnFood();
        this.startMusic();
        this.updateSoftkeys("PAUSE", "MUTE");
        this.renderSnake();
    }

    createBackground() {
        this.bgGroup.removeAll(true);
        const b = this.config.biome; 
        for (let gy = 0; gy < ROWS; gy++) {
            for (let gx = 0; gx < COLS; gx++) {
                const isWall = gx === 0 || gx === COLS - 1 || gy === 0 || gy === ROWS - 1;
                this.bgGroup.create(gx * TILE, GRID_Y + gy * TILE, 'sprites', isWall ? `${b}_wall` : `${b}_floor`);
                if (!isWall && Math.random() < 0.1) this.bgGroup.create(gx * TILE, GRID_Y + gy * TILE, 'sprites', `${b}_deco`);
            }
        }
    }

    startMusic() {
        if (this.activeMusic) this.activeMusic.stop();
        const musicMap:any = { lab:'lab', jng:'lab', spc:'space', lav:'lava', jungle:'jungle' };
        let m = musicMap[this.config.biome] || 'lab';
        if (this.config.biome === 'jng') m = 'jungle';
        this.activeMusic = this.game.sound.play(`music_${m}`, 0.4, true);
    }

    update() {
        if (this.paused_game) return;
        if (this.game.time.now > this.moveTimer) { this.move(); this.moveTimer = this.game.time.now + this.moveInterval; }
        if (this.activePowerup) {
            const rem = this.puEndTime - this.game.time.now;
            if (rem <= 0) this.deactivatePowerup();
            else { this.puBar.clear(); this.puBar.beginFill(0x00ffff, 0.7); this.puBar.drawRect(0, 0, (rem/8000)*W, 2); }
            if (this.snake.magnet) this.pullFood();
        }
    }

    pullFood() {
        const h = this.snake.segments[0];
        this.foodGroup.forEach((f: any) => {
            if (f.visible && Math.abs(f.gx - h.gx) <= 2 && Math.abs(f.gy - h.gy) <= 2) {
                f.gx = h.gx; f.gy = h.gy; f.x = f.gx * TILE + 8; f.y = GRID_Y + f.gy * TILE + 8;
            }
        }, this);
    }

    move() {
        this.snake.direction = this.snake.nextDir;
        let h = this.snake.segments[0]; let nx = h.gx, ny = h.gy;
        if (this.snake.direction === 'right') nx++; else if (this.snake.direction === 'left') nx--;
        else if (this.snake.direction === 'up') ny--; else if (this.snake.direction === 'down') ny++;

        if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) {
            if (this.snake.ghost) { nx = (nx + COLS) % COLS; ny = (ny + ROWS) % ROWS; }
            else { this.die('wall_buzz'); return; }
        }
        if (this.snake.segments.some((s:any, i:number) => i>0 && s.gx===nx && s.gy===ny)) { this.die('death'); return; }

        this.snake.segments.unshift({gx: nx, gy: ny});
        let ate = false;
        this.foodGroup.forEach((f: any) => { if (f.visible && nx === f.gx && ny === f.gy) { this.eat(f); ate = true; } }, this);
        if (this.powerupSprite.visible && nx === (this.powerupSprite as any).gx && ny === (this.powerupSprite as any).gy) this.collectPowerup();

        if (this.snake.growing > 0) { this.snake.growing--; this.snake.length++; this.lengthText.text = this.snake.length.toString(); this.checkTier(); }
        else this.snake.segments.pop();
        this.renderSnake();
    }

    checkTier() {
        let nt = this.snake.tier;
        if (this.snake.length >= 30) nt = Math.max(nt, 3); else if (this.snake.length >= 15) nt = Math.max(nt, 2);
        if (nt > this.snake.tier) {
            this.snake.tier = nt; this.game.sound.play('levelup'); this.game.camera.shake(0.01, 200);
            const lu = this.add.sprite(W/2, H/2, 'sprites', 'levelup'); lu.anchor.set(0.5); lu.scale.set(0.5);
            this.game.add.tween(lu.scale).to({x:1.1, y:1.1}, 400, "Back.easeOut", true).onComplete.add(() => {
                this.game.time.events.add(1000, () => { this.game.add.tween(lu).to({alpha:0}, 300, "Linear", true).onComplete.add(()=>lu.destroy()); });
            });
        }
    }

    eat(f: any) {
        const d = this.getFoodData(f.type);
        if (this.game.time.now - this.lastEatTime < 4000) this.combo = Math.min(5, this.combo + 1); else this.combo = 1;
        this.lastEatTime = this.game.time.now;
        const v = d.score * this.combo; this.score += v; this.scoreText.text = this.score.toString();
        this.game.sound.play(d.sound); this.showScorePopup(f.x, f.y, v, this.combo);
        this.spawnParticles(f.x, f.y, d.ptcl, 15);
        f.visible = false; this.snake.growing += d.grow; this.moveInterval = Math.max(80, 250 - (this.snake.length * 3));
        if (this.score >= 500 && Math.floor(this.score / 500) > Math.floor((this.score - v) / 500)) this.changeBiome();
        if (this.snake.length % 15 === 0) this.spawnPowerup();
        this.spawnFood();
    }

    showScorePopup(x: number, y: number, v: number, c: number) {
        const group = this.add.group();
        this.add.sprite(x, y, 'sprites', 'score_popup', group).anchor.set(0.5);
        this.add.text(x, y, `+${v}${c>1?' x'+c:''}`, { font: "10px monospace", fill: "#ff0", fontWeight: "bold" }, group).anchor.set(0.5);
        this.game.add.tween(group).to({ y: y - 40, alpha: 0 }, 800, "Linear", true).onComplete.add(() => group.destroy());
    }

    getFoodData(type: string) {
        const m: any = { 
            apple: { score: 10, grow: 1, sound: 'eat', ptcl: 'ptcl_eat' }, 
            cherry: { score: 20, grow: 1, sound: 'eat', ptcl: 'ptcl_eat' },
            strawberry: { score: 30, grow: 1, sound: 'eat', ptcl: 'ptcl_eat' },
            golden_apple: { score: 50, grow: 2, sound: 'eat_golden', ptcl: 'ptcl_glow' }, 
            bonus_orb: { score: 100, grow: 0, sound: 'eat_bonus', ptcl: 'ptcl_glow' } 
        };
        return m[type] || m.apple;
    }

    spawnFood() {
        let gx, gy; do { gx = 1+Math.floor(Math.random()*(COLS-2)); gy = 1+Math.floor(Math.random()*(ROWS-2)); } while (this.isOccupied(gx, gy));
        const r = Math.random(); let type = 'apple';
        if (r < 0.08) type = 'bonus_orb'; else if (r < 0.18) type = 'golden_apple';
        else if (r < 0.35) type = 'strawberry'; else if (r < 0.55) type = 'cherry';
        let f = this.foodGroup.getFirstDead(true, gx*TILE+8, GRID_Y+gy*TILE+8, 'sprites', type);
        f.anchor.set(0.5); f.gx = gx; f.gy = gy; f.type = type; f.visible = true;
        
        // Enhance visibility with pulsing and glow particles
        if (!f.pulse) f.pulse = this.game.add.tween(f.scale).to({x:1.25, y:1.25}, 400, "Sine.easeInOut", true, 0, -1, true);
        this.game.time.events.loop(200, () => { if(f.visible) this.spawnParticles(f.x, f.y, 'ptcl_glow', 1); });
    }

    spawnPowerup() {
        if (this.powerupSprite.visible) return;
        let gx, gy; do { gx = 1+Math.floor(Math.random()*(COLS-2)); gy = 1+Math.floor(Math.random()*(ROWS-2)); } while (this.isOccupied(gx, gy));
        const ts = ['pu_shield', 'pu_ghost', 'pu_magnet', 'pu_speed'];
        const type = ts[Math.floor(Math.random()*4)];
        this.powerupSprite.frameName = type; this.powerupSprite.x = gx*TILE+8; this.powerupSprite.y = GRID_Y+gy*TILE+8;
        this.powerupSprite.anchor.set(0.5); (this.powerupSprite as any).gx = gx; (this.powerupSprite as any).gy = gy; (this.powerupSprite as any).type = type;
        this.powerupSprite.visible = true;
        
        // Enhance visibility
        if (!this.powerupSprite.pulse) this.powerupSprite.pulse = this.game.add.tween(this.powerupSprite.scale).to({x:1.3, y:1.3}, 300, "Sine.easeInOut", true, 0, -1, true);
        this.game.time.events.add(10000, () => { this.powerupSprite.visible = false; });
    }

    collectPowerup() {
        const t = (this.powerupSprite as any).type; this.activePowerup = t; this.puEndTime = this.game.time.now + 8000;
        this.powerupSprite.visible = false; this.game.sound.play('powerup'); this.puText.text = t.replace('pu_','').toUpperCase();
        if (t === 'pu_shield') this.snake.shield = true;
        if (t === 'pu_ghost') { this.snake.ghost = true; this.pool.setAll('alpha', 0.6); }
        if (t === 'pu_magnet') this.snake.magnet = true;
        if (t === 'pu_speed') this.moveInterval = Math.max(70, this.moveInterval - 60);
    }

    deactivatePowerup() { this.snake.shield = false; this.snake.ghost = false; this.snake.magnet = false; this.pool.setAll('alpha', 1); this.activePowerup = null; this.puText.text = ""; this.puBar.clear(); }
    isOccupied(gx: number, gy: number) { return this.snake.segments.some((s:any) => s.gx===gx && s.gy===gy); }

    renderSnake() {
        this.pool.setAll('visible', false); const T = 't' + this.snake.tier;
        this.snake.segments.forEach((seg: any, i: number) => {
            let f = ''; if (i === 0) f = `head_${T}_${this.snake.direction}`;
            else if (i === this.snake.segments.length - 1) f = `tail_${T}_${this.getDir(this.snake.segments[i-1], seg)}`;
            else {
                const d1 = this.getDir(seg, this.snake.segments[i-1]), d2 = this.getDir(this.snake.segments[i+1], seg);
                if (d1 === d2) f = (d1==='left'||d1==='right') ? `body_h_${T}` : `body_v_${T}`;
                else f = `${this.getCorner(d1, d2)}_${T}`;
            }
            const s = this.pool.getChildAt(i) as Phaser.Sprite; s.frameName = f; s.x = seg.gx*TILE; s.y = GRID_Y+seg.gy*TILE; s.visible = true;
        });
    }

    getDir(f: any, t: any) { return f.gx<t.gx?'left':f.gx>t.gx?'right':f.gy<t.gy?'up':'down'; }
    getCorner(f: string, t: string) {
        const m: any = { 'right_down':'corner_tl', 'right_up':'corner_bl', 'left_down':'corner_tr', 'left_up':'corner_br', 'down_right':'corner_br', 'down_left':'corner_bl', 'up_right':'corner_tr', 'up_left':'corner_tl' };
        return m[`${f}_${t}`] || `body_h_t1`;
    }

    changeBiome() {
        const bs = ['lab', 'jng', 'spc', 'lav']; const curIdx = bs.indexOf(this.config.biome);
        this.config.biome = bs[(curIdx + 1) % 4];
        this.game.sound.play('biome_change'); this.createBackground(); this.startMusic();
        const bnr = this.add.sprite(W/2, -50, 'sprites', `banner_${this.config.biome}`); bnr.anchor.set(0.5);
        this.game.add.tween(bnr).to({ y: H/2 }, 500, "Back.easeOut", true).onComplete.add(() => {
            this.game.time.events.add(1500, () => { this.game.add.tween(bnr).to({ y: -50 }, 400, "Back.easeIn", true).onComplete.add(() => bnr.destroy()); });
        });
    }

    die(s: string) {
        if (this.snake.shield) { this.deactivatePowerup(); this.game.camera.shake(0.01, 200); return; }
        this.paused_game = true; this.game.sound.play(s); this.game.camera.shake(0.02, 300);
        const h = this.pool.getChildAt(0) as Phaser.Sprite; this.spawnParticles(h.x+8, h.y+8, 'ptcl_spark', 20);
        this.game.time.events.add(1000, () => { this.game.sound.stopAll(); this.state.start('GameOver', true, false, this.score, this.config); });
    }

    spawnParticles(x: number, y: number, f='ptcl_eat', n=5) {
        for (let i = 0; i < n; i++) {
            const p = this.particles.create(x, y, 'sprites', f); p.anchor.set(0.5);
            this.game.add.tween(p).to({ x: x+(Math.random()-0.5)*60, y: y+(Math.random()-0.5)*60-30, alpha: 0 }, 600, "Linear", true).onComplete.add(() => p.destroy());
        }
    }

    onKeyDown(e: KeyboardEvent) {
        const d = this.snake.direction;
        const key = e.key;

        // Normalize keys
        let action = "";
        if (key === "SoftLeft" || key === "F1") action = "softleft";
        else if (key === "SoftRight" || key === "F2") action = "softright";
        else if (key === "Enter") action = "enter";
        else if (key === "Backspace") action = "back";
        else if (key === "ArrowUp") action = "up";
        else if (key === "ArrowDown") action = "down";
        else if (key === "ArrowLeft") action = "left";
        else if (key === "ArrowRight") action = "right";

        if (!action) return;
        e.preventDefault();

        if (action === 'up' && d !== 'down') this.snake.nextDir = 'up';
        else if (action === 'down' && d !== 'up') this.snake.nextDir = 'down';
        else if (action === 'left' && d !== 'right') this.snake.nextDir = 'left';
        else if (action === 'right' && d !== 'left') this.snake.nextDir = 'right';
        else if (action === "softleft" || action === "enter") { 
            this.paused_game = !this.paused_game; 
            this.updateSoftkeys(this.paused_game?"RESUME":"PAUSE", this.game.sound.mute?"UNMUTE":"MUTE"); 
        }
        else if (action === "softright") { 
            this.game.sound.mute = !this.game.sound.mute; 
            this.updateSoftkeys(this.paused_game?"RESUME":"PAUSE", this.game.sound.mute?"UNMUTE":"MUTE"); 
        }
        else if (action === "back") this.state.start('Menu');
    }
    updateSoftkeys(l: string, r: string) { document.getElementById('sk-left')!.textContent = l; document.getElementById('sk-right')!.textContent = r; }
}

class GameOver extends Phaser.State {
    private score: number; private config: any;
    private bgGroup: Phaser.Group;

    init(s: number, c: any) { this.score = s; this.config = c; }
    create() {
        activeState = this;
        
        // 1. Show the world background where player failed
        this.bgGroup = this.add.group();
        const b = this.config.biome;
        for (let gy = 0; gy < 20; gy++) {
            for (let gx = 0; gx < COLS; gx++) {
                const isWall = gx === 0 || gx === COLS - 1 || gy === 0 || gy === 19;
                this.bgGroup.create(gx * TILE, gy * TILE, 'sprites', isWall ? `${b}_wall` : `${b}_floor`);
            }
        }
        
        // 2. Dark overlay to make the GameOver panel pop
        const overlay = this.add.graphics(0, 0);
        overlay.beginFill(0x000000, 0.7);
        overlay.drawRect(0, 0, W, H);
        overlay.endFill();

        const panel = this.add.sprite(20, 50, 'sprites', 'gameover');
        
        const best = parseInt(localStorage.getItem('snakeEvolved_best') || '0');
        if (this.score > best) localStorage.setItem('snakeEvolved_best', this.score.toString());
        
        const scoreStyle = { font: "16px monospace", fill: "#0f0", fontWeight: "bold" };
        const bestStyle = { font: "14px monospace", fill: "#ff0", fontWeight: "bold" };

        // Positioned inside the two dark boxes
        this.add.text(W/2, 85, `${this.score}`, scoreStyle).anchor.set(0.5);
        this.add.text(W/2, 118, `${Math.max(this.score, best)}`, bestStyle).anchor.set(0.5);
        
        this.add.text(W/2, 65, "SCORE", { font: "8px monospace", fill: "#aaa" }).anchor.set(0.5);
        this.add.text(W/2, 99, "BEST", { font: "8px monospace", fill: "#aaa" }).anchor.set(0.5);

        this.game.sound.play('music_gameover', 0.5, false);
        this.updateSoftkeys("RETRY", "MENU");
    }
    onKeyDown(e: KeyboardEvent) { 
        const key = e.key;
        
        // Normalize keys
        let action = "";
        if (key === "SoftLeft" || key === "F1") action = "softleft";
        else if (key === "SoftRight" || key === "F2") action = "softright";
        else if (key === "Enter") action = "enter";
        else if (key === "Backspace") action = "back";

        if (!action) return;
        e.preventDefault();

        if (action === "softleft" || action === "enter") this.state.start('Game', true, false, this.config); 
        else if (action === "softright" || action === "back") this.state.start('Menu'); 
    }
    updateSoftkeys(l: string, r: string) { document.getElementById('sk-left')!.textContent = l; document.getElementById('sk-right')!.textContent = r; }
}

window.onload = () => {
    const game = new Phaser.Game(W, H, Phaser.CANVAS, 'game-container');
    game.state.add('Boot', Boot); game.state.add('Preload', Preload); game.state.add('Menu', Menu); game.state.add('Game', Game); game.state.add('GameOver', GameOver);
    game.state.start('Boot');
};
document.addEventListener('keydown', (e) => { if (activeState && activeState.onKeyDown) activeState.onKeyDown(e); });
