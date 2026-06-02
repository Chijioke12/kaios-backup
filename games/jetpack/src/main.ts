const PIXI = (window as any).PIXI;
const p2 = (window as any).p2;
const Phaser = (window as any).Phaser;

let activeInstance: any = null;

class GameState extends Phaser.State {
    private player!: Phaser.Sprite;
    private jetpackOn: boolean = false;
    private isDead: boolean = false;
    private score: number = 0;
    private distance: number = 0;
    private static highScore: number = 0;

    // Powerup States
    private hasShield: boolean = false;
    private shieldSprite!: Phaser.Sprite;
    private magnetActive: boolean = false;
    private x2Active: boolean = false;
    private invincibleActive: boolean = false;
    private isBoosting: boolean = false;
    
    private magnetTimer: number = 0;
    private x2Timer: number = 0;
    private invincTimer: number = 0;
    private boostTimer: number = 0;

    // Groups
    private bgDetailGroup!: Phaser.Group;
    private hazardGroup!: Phaser.Group;
    private coinGroup!: Phaser.Group;
    private powerupGroup!: Phaser.Group;
    private scientistGroup!: Phaser.Group;
    private explosionGroup!: Phaser.Group;

    // Static Backgrounds
    private wallTile!: Phaser.TileSprite;
    private floorTile!: Phaser.TileSprite;
    private ceilingTile!: Phaser.TileSprite;

    // UI
    private hud!: Phaser.Sprite;
    private scoreText!: Phaser.Text;
    private distanceText!: Phaser.Text;
    private timerText!: Phaser.Text;
    private endScoreText!: Phaser.Text;
    private bestScoreText!: Phaser.Text;
    private startBanner!: Phaser.Sprite;
    private gameOverBanner!: Phaser.Sprite;
    private gameStarted: boolean = false;
    private loadingText!: Phaser.Text;

    // Spawning timers
    private nextHazard: number = 0;
    private nextScientist: number = 0;
    private nextCoin: number = 0;
    private nextPowerup: number = 0;
    private nextBgDetail: number = 0;

    private static musicMuted: boolean = false;
    private static sfxMuted: boolean = false;

    // Audio
    private musicMenu!: Phaser.Sound;
    private musicGame!: Phaser.Sound;
    private musicGameOver!: Phaser.Sound;
    private musicHighScore!: Phaser.Sound;
    private sfxThrust!: Phaser.Sound;
    private sfxCoin!: Phaser.Sound;
    private sfxPowerup!: Phaser.Sound;
    private sfxExplosion!: Phaser.Sound;
    private sfxMissileWarning!: Phaser.Sound;
    private sfxZapperHit!: Phaser.Sound;
    private sfxLaserHum!: Phaser.Sound;
    private sfxShieldActivate!: Phaser.Sound;
    private sfxShieldBreak!: Phaser.Sound;
    private sfxUIClick!: Phaser.Sound;
    private sfxScientistYelp!: Phaser.Sound;
    private sfxGameOverSting!: Phaser.Sound;

    preload() {
        this.loadingText = this.add.text(120, 131, 'Loading...', { font: '16px Arial', fill: '#fff' });
        this.loadingText.anchor.setTo(0.5, 0.5);

        this.load.atlasJSONHash('sprites', 'assets/jetpack_kaios_sprites.png', 'assets/jetpack_kaios_atlas.json');
        this.load.audio('music_menu', 'assets/music_menu.wav');
        this.load.audio('music_game', 'assets/music_game.wav');
        this.load.audio('music_gameover', 'assets/music_gameover.wav');
        this.load.audio('music_highscore', 'assets/music_highscore.wav');
        this.load.audio('jetpack_thrust', 'assets/jetpack_thrust.wav');
        this.load.audio('coin_collect', 'assets/coin_collect.wav');
        this.load.audio('powerup_collect', 'assets/powerup_collect.wav');
        this.load.audio('missile_warning', 'assets/missile_warning.wav');
        this.load.audio('explosion', 'assets/explosion.wav');
        this.load.audio('zapper_hit', 'assets/zapper_hit.wav');
        this.load.audio('laser_hum', 'assets/laser_hum.wav');
        this.load.audio('shield_activate', 'assets/shield_activate.wav');
        this.load.audio('shield_break', 'assets/shield_break.wav');
        this.load.audio('ui_click', 'assets/ui_click.wav');
        this.load.audio('scientist_yelp', 'assets/scientist_yelp.wav');
        this.load.audio('game_over_sting', 'assets/game_over_sting.wav');
    }

    create() {
        activeInstance = this;
        this.game.stage.disableVisibilityChange = true;

        if (this.loadingText) this.loadingText.destroy();
        this.gameStarted = false;
        this.isDead = false;
        this.score = 0;
        this.distance = 0;
        
        this.hasShield = false;
        this.magnetActive = false;
        this.x2Active = false;
        this.invincibleActive = false;
        this.isBoosting = false;

        this.physics.startSystem(Phaser.Physics.ARCADE);

        // 1. Layers
        this.wallTile = this.add.tileSprite(0, 0, 240, 262, 'sprites', 'bg_wall');
        
        this.bgDetailGroup = this.add.group();
        
        this.ceilingTile = this.add.tileSprite(0, 0, 240, 16, 'sprites', 'bg_ceiling');
        this.floorTile = this.add.tileSprite(0, 246, 240, 16, 'sprites', 'bg_floor');

        this.scientistGroup = this.add.group();
        this.coinGroup = this.add.group();
        this.powerupGroup = this.add.group();
        this.hazardGroup = this.add.group();
        this.explosionGroup = this.add.group();

        this.player = this.add.sprite(50, 200, 'sprites', 'barry_run1');
        this.player.anchor.setTo(0.5, 0.5);
        this.player.animations.add('run', ['barry_run1', 'barry_run2'], 10, true);
        this.physics.arcade.enable(this.player);
        this.player.body.gravity.y = 1200;
        this.player.body.collideWorldBounds = true;
        this.player.body.setSize(20, 30, 4, 3);

        this.shieldSprite = this.add.sprite(0, 0, 'sprites', 'magnet_field');
        this.shieldSprite.anchor.setTo(0.5, 0.5);
        this.shieldSprite.visible = false;
        this.shieldSprite.alpha = 0.6;

        this.hud = this.add.sprite(0, 0, 'sprites', 'hud');
        this.hud.fixedToCamera = true;
        this.scoreText = this.add.text(40, 8, "0", { font: "bold 12px Arial", fill: "#fff" });
        this.distanceText = this.add.text(140, 8, "0m", { font: "bold 12px Arial", fill: "#fff" });
        this.timerText = this.add.text(10, 32, "", { font: "bold 10px Arial", fill: "#ffff00" });
        this.timerText.fixedToCamera = true;

        this.startBanner = this.add.sprite(120, 131, 'sprites', 'start_banner');
        this.startBanner.anchor.setTo(0.5, 0.5);

        this.gameOverBanner = this.add.sprite(120, 131, 'sprites', 'gameover');
        this.gameOverBanner.anchor.setTo(0.5, 0.5);
        this.gameOverBanner.visible = false;

        this.endScoreText = this.add.text(120, 125, "", { font: "bold 16px Arial", fill: "#ffffff" });
        this.endScoreText.anchor.setTo(0.5, 0.5);
        this.endScoreText.visible = false;

        this.bestScoreText = this.add.text(120, 150, "", { font: "bold 16px Arial", fill: "#ffff00" });
        this.bestScoreText.anchor.setTo(0.5, 0.5);
        this.bestScoreText.visible = false;

        this.initAudio();
    }

    initAudio() {
        this.musicMenu = this.add.audio('music_menu', 0.5, true);
        this.musicGame = this.add.audio('music_game', 0.5, true);
        this.musicGameOver = this.add.audio('music_gameover', 0.5, false);
        this.musicHighScore = this.add.audio('music_highscore', 0.6, false);
        this.sfxThrust = this.add.audio('jetpack_thrust', 0.3, true);
        this.sfxCoin = this.add.audio('coin_collect', 0.4, false);
        this.sfxPowerup = this.add.audio('powerup_collect', 0.5, false);
        this.sfxExplosion = this.add.audio('explosion', 0.6, false);
        this.sfxMissileWarning = this.add.audio('missile_warning', 0.5, false);
        this.sfxZapperHit = this.add.audio('zapper_hit', 0.5, false);
        this.sfxLaserHum = this.add.audio('laser_hum', 0.4, true);
        this.sfxShieldActivate = this.add.audio('shield_activate', 0.5, false);
        this.sfxShieldBreak = this.add.audio('shield_break', 0.5, false);
        this.sfxUIClick = this.add.audio('ui_click', 0.4, false);
        this.sfxScientistYelp = this.add.audio('scientist_yelp', 0.4, false);
        this.sfxGameOverSting = this.add.audio('game_over_sting', 0.7, false);

        this.applyMuteStates();
        if (this.musicMenu) this.musicMenu.play();
    }

    applyMuteStates() {
        const music = [this.musicMenu, this.musicGame, this.musicGameOver, this.musicHighScore];
        const sfx = [this.sfxThrust, this.sfxCoin, this.sfxPowerup, this.sfxExplosion, this.sfxMissileWarning, this.sfxZapperHit, this.sfxLaserHum, this.sfxShieldActivate, this.sfxShieldBreak, this.sfxUIClick, this.sfxScientistYelp, this.sfxGameOverSting];
        music.forEach(m => { if(m) m.mute = GameState.musicMuted; });
        sfx.forEach(s => { if(s) s.mute = GameState.sfxMuted; });
    }

    handleAction() {
        if (!this.gameStarted) {
            this.startGame();
        } else if (this.isDead) {
            this.restartGame();
        } else {
            this.jetpackOn = true;
            if (this.sfxThrust && !this.sfxThrust.isPlaying && !this.isDead) {
                this.sfxThrust.play();
            }
        }
    }

    handleRelease() {
        this.jetpackOn = false;
        if (this.sfxThrust) this.sfxThrust.stop();
    }

    toggleMusic() {
        GameState.musicMuted = !GameState.musicMuted;
        this.applyMuteStates();
    }

    toggleSFX() {
        GameState.sfxMuted = !GameState.sfxMuted;
        this.applyMuteStates();
    }

    startGame() {
        if (this.sfxUIClick) this.sfxUIClick.play();
        this.gameStarted = true;
        this.startBanner.visible = false;
        this.endScoreText.visible = false;
        this.bestScoreText.visible = false;
        if (this.musicMenu) this.musicMenu.stop();
        if (this.musicGame) this.musicGame.play();
    }

    restartGame() {
        if (this.sfxUIClick) this.sfxUIClick.play();
        if (this.musicGameOver) this.musicGameOver.stop();
        if (this.musicHighScore) this.musicHighScore.stop();
        this.state.restart();
    }

    update() {
        if (!this.gameStarted || this.isDead) return;
        
        this.distance += 0.1;
        this.distanceText.text = Math.floor(this.distance) + "m";
        this.scoreText.text = this.score.toString();
        
        const scrollSpeed = (this.isBoosting ? 15 : (3 + (this.distance / 500)));
        this.wallTile.tilePosition.x -= scrollSpeed * 0.5;
        this.floorTile.tilePosition.x -= scrollSpeed;
        this.ceilingTile.tilePosition.x -= scrollSpeed;

        if (this.jetpackOn) {
            this.player.body.velocity.y = -350;
            this.player.frameName = 'barry_fly';
        } else {
            if (this.player.body.blocked.down) {
                this.player.animations.play('run');
            } else {
                this.player.frameName = 'barry_fall';
            }
        }

        // Visuals
        if (this.hasShield || this.magnetActive || this.invincibleActive) {
            this.shieldSprite.x = this.player.x;
            this.shieldSprite.y = this.player.y;
            this.shieldSprite.visible = true;
            this.shieldSprite.angle += 2;
            this.shieldSprite.tint = this.invincibleActive ? 0xff0000 : (this.magnetActive ? 0x00ffff : 0xffffff);
        } else {
            this.shieldSprite.visible = false;
        }

        // Magnet logic
        if (this.magnetActive) {
            this.coinGroup.forEach((coin: any) => {
                if (this.physics.arcade.distanceBetween(this.player, coin) < 120) {
                    this.physics.arcade.moveToObject(coin, this.player, 500);
                }
            }, this);
        }

        // Timer management
        let timerStr = "";
        if (this.magnetActive) {
            this.magnetTimer -= this.game.time.elapsed;
            if (this.magnetTimer <= 0) this.magnetActive = false;
            else timerStr += "MAG:" + Math.ceil(this.magnetTimer/1000) + " ";
        }
        if (this.x2Active) {
            this.x2Timer -= this.game.time.elapsed;
            if (this.x2Timer <= 0) this.x2Active = false;
            else timerStr += "X2:" + Math.ceil(this.x2Timer/1000) + " ";
        }
        if (this.invincibleActive) {
            this.invincTimer -= this.game.time.elapsed;
            if (this.invincTimer <= 0) this.invincibleActive = false;
            else timerStr += "INV:" + Math.ceil(this.invincTimer/1000) + " ";
        }
        if (this.isBoosting) {
            this.boostTimer -= this.game.time.elapsed;
            if (this.boostTimer <= 0) this.isBoosting = false;
            else timerStr += "BOOST:" + Math.ceil(this.boostTimer/1000) + " ";
        }
        this.timerText.text = timerStr;

        this.handleSpawning(scrollSpeed);
        this.physics.arcade.overlap(this.player, this.coinGroup, this.collectCoin, undefined, this);
        this.physics.arcade.overlap(this.player, this.hazardGroup, this.hitHazard, undefined, this);
        this.physics.arcade.overlap(this.player, this.powerupGroup, this.collectPowerup, undefined, this);
        this.cleanupGroups();
    }

    handleSpawning(speed: number) {
        const now = this.time.now;
        
        // Background Details
        if (now > this.nextBgDetail) {
            const type = this.rnd.pick(['bg_pipe', 'bg_window', 'bg_panel', 'bg_light_on', 'bg_light_off']);
            const detail = this.bgDetailGroup.create(250, this.rnd.integerInRange(40, 200), 'sprites', type);
            this.physics.arcade.enable(detail);
            detail.body.velocity.x = -speed * 30; // Match floor speed
            this.nextBgDetail = now + this.rnd.integerInRange(500, 2000);
        }

        // More Scientists
        if (now > this.nextScientist) {
            this.spawnScientist(speed);
            this.nextScientist = now + this.rnd.integerInRange(500, 1500);
        }

        if (now > this.nextCoin) {
            this.spawnCoinRow();
            this.nextCoin = now + this.rnd.integerInRange(2000, 4000);
        }

        if (now > this.nextHazard && !this.isBoosting) {
            this.spawnHazard();
            this.nextHazard = now + this.rnd.integerInRange(1000, 2500);
        }

        if (now > this.nextPowerup) {
            this.spawnPowerup();
            this.nextPowerup = now + this.rnd.integerInRange(10000, 20000);
        }
    }

    spawnScientist(speed: number) {
        const s = this.scientistGroup.create(250, 230, 'sprites', 'scientist_run');
        this.physics.arcade.enable(s);
        s.anchor.setTo(0.5, 0.5);
        s.body.velocity.x = -speed * 40 - this.rnd.integerInRange(20, 100);
        s.animations.add('run', ['scientist_run', 'scientist_idle'], 10, true);
        s.animations.play('run');
        if (this.rnd.integerInRange(1, 100) <= 15 && this.sfxScientistYelp) this.sfxScientistYelp.play();
    }

    spawnCoinRow() {
        const y = this.rnd.integerInRange(50, 200);
        for (let i = 0; i < 8; i++) {
            const c = this.coinGroup.create(250 + (i * 15), y, 'sprites', 'coin');
            this.physics.arcade.enable(c);
            c.anchor.setTo(0.5, 0.5);
            c.body.velocity.x = -200;
        }
    }

    spawnPowerup() {
        const type = this.rnd.pick(['pu_shield', 'pu_magnet', 'pu_x2', 'pu_speed', 'pu_invincibility', 'pu_headstart']);
        const pu = this.powerupGroup.create(250, this.rnd.integerInRange(50, 200), 'sprites', type);
        this.physics.arcade.enable(pu);
        pu.anchor.setTo(0.5, 0.5);
        pu.body.velocity.x = -150;
    }

    spawnHazard() {
        const type = this.rnd.pick(['zapper_v', 'zapper_h', 'missile', 'laser']);
        if (type === 'missile') {
            this.spawnMissileWithWarning();
        } else if (type === 'laser') {
            this.spawnLaserBeam();
        } else {
            const hazard = this.hazardGroup.create(250, this.rnd.integerInRange(40, 200), 'sprites', type);
            this.physics.arcade.enable(hazard);
            hazard.anchor.setTo(0.5, 0.5);
            hazard.body.velocity.x = -200;
            if (this.sfxZapperHit) this.sfxZapperHit.play();
        }
    }

    spawnLaserBeam() {
        const y = this.rnd.integerInRange(60, 180);
        const top = this.hazardGroup.create(250, y - 40, 'sprites', 'laser_emitter_top');
        const bot = this.hazardGroup.create(250, y + 40, 'sprites', 'laser_emitter_bottom');
        const beam = this.hazardGroup.create(250, y, 'sprites', 'laser_beam');
        
        [top, bot, beam].forEach(l => {
            this.physics.arcade.enable(l);
            l.anchor.setTo(0.5, 0.5);
            l.body.velocity.x = -200;
        });
        
        beam.scale.setTo(1, 5); // Make it thick
        if (this.sfxLaserHum) this.sfxLaserHum.play();
    }

    spawnMissileWithWarning() {
        const targetY = this.player.y;
        const warning = this.add.sprite(220, targetY, 'sprites', 'warning_sign');
        warning.anchor.setTo(0.5, 0.5);
        this.add.tween(warning).to({ alpha: 0 }, 200, "Linear", true, 0, 3, true);
        if (this.sfxMissileWarning) this.sfxMissileWarning.play();
        this.time.events.add(1000, () => {
            warning.destroy();
            if (this.isDead) return;
            const missile = this.hazardGroup.create(250, targetY, 'sprites', 'missile');
            this.physics.arcade.enable(missile);
            missile.anchor.setTo(0.5, 0.5);
            missile.body.velocity.x = -450;
        });
    }

    collectCoin(player: any, coin: any) {
        coin.destroy();
        this.score += this.x2Active ? 20 : 10;
        if (this.sfxCoin) this.sfxCoin.play();
        const spark = this.explosionGroup.create(coin.x, coin.y, 'sprites', 'spark');
        this.time.events.add(200, () => spark.destroy());
    }

    collectPowerup(player: any, pu: any) {
        const type = pu.frameName;
        pu.destroy();
        if (this.sfxPowerup) this.sfxPowerup.play();

        if (type === 'pu_shield') {
            this.hasShield = true;
            if (this.sfxShieldActivate) this.sfxShieldActivate.play();
        } else if (type === 'pu_magnet') {
            this.magnetActive = true;
            this.magnetTimer = 10000;
        } else if (type === 'pu_x2') {
            this.x2Active = true;
            this.x2Timer = 10000;
        } else if (type === 'pu_invincibility') {
            this.invincibleActive = true;
            this.invincTimer = 8000;
        } else if (type === 'pu_headstart') {
            this.isBoosting = true;
            this.boostTimer = 3000;
        }
    }

    hitHazard(player: any, hazard: any) {
        if (this.isDead || this.invincibleActive || this.isBoosting) return;

        if (this.hasShield) {
            this.hasShield = false;
            hazard.destroy();
            if (this.sfxShieldBreak) this.sfxShieldBreak.play();
            this.player.alpha = 0.5;
            this.time.events.add(1000, () => this.player.alpha = 1.0);
            return;
        }
        
        this.isDead = true;
        this.player.frameName = 'barry_dead';
        this.player.body.velocity.x = -100;
        this.player.body.velocity.y = -200;
        if (this.sfxThrust) this.sfxThrust.stop();
        if (this.sfxExplosion) this.sfxExplosion.play();
        if (this.sfxGameOverSting) this.sfxGameOverSting.play();
        if (this.musicGame) this.musicGame.stop();

        const exp = this.add.sprite(this.player.x, this.player.y, 'sprites', 'explosion_1');
        exp.anchor.setTo(0.5, 0.5);
        exp.animations.add('boom', ['explosion_1', 'explosion_2', 'explosion_3', 'explosion_4'], 10, false);
        exp.animations.play('boom').onComplete.add(() => {
            exp.destroy();
            if (this.score > GameState.highScore) {
                GameState.highScore = this.score;
                if (this.musicHighScore) this.musicHighScore.play();
            } else {
                if (this.musicGameOver) this.musicGameOver.play();
            }
            this.endScoreText.text = "Score: " + this.score;
            this.bestScoreText.text = "Best: " + GameState.highScore;
            this.endScoreText.visible = true;
            this.bestScoreText.visible = true;
        });
        this.gameOverBanner.visible = true;
    }

    cleanupGroups() {
        [this.bgDetailGroup, this.scientistGroup, this.coinGroup, this.hazardGroup, this.explosionGroup, this.powerupGroup].forEach(group => {
            group.forEach((item: any) => {
                if (item.x < -100) item.destroy();
            }, this);
        });
    }
}

document.addEventListener('keydown', (e) => {
    if (!activeInstance) return;
    if (e.key === '1') { activeInstance.toggleMusic(); return; }
    if (e.key === '2') { activeInstance.toggleSFX(); return; }
    e.preventDefault();
    activeInstance.handleAction();
});

document.addEventListener('keyup', (e) => {
    if (!activeInstance) return;
    activeInstance.handleRelease();
});

window.onload = () => {
    const config: Phaser.IGameConfig = {
        width: 240,
        height: 262,
        renderer: Phaser.CANVAS,
        parent: 'game-container',
        state: GameState,
        antialias: false
    };
    new Phaser.Game(config);
};
