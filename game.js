// ---------- Звуковой менеджер ----------
class SoundManager {
    constructor() {
        this.ctx = null;
        this.initialized = false;
        this.bgmElement = document.getElementById('bgMusic');
    }

    async init() {
        if (this.initialized) return;

        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();

            // iOS / Android resume
            if (this.ctx.state === 'suspended') {
                await this.ctx.resume();
            }

            // unlock audio
            const buf = this.ctx.createBuffer(1, 1, 22050);
            const src = this.ctx.createBufferSource();

            src.buffer = buf;
            src.connect(this.ctx.destination);
            src.start(0);

        } catch (e) {
            console.warn('Web Audio API не поддерживается', e);
        }

        this.initialized = true;
    }

    playTone(freq, duration, type = 'square', volume = 0.15) {
        if (!this.ctx) return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = type;
        osc.frequency.value = freq;

        gain.gain.setValueAtTime(volume, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(
            0.001,
            this.ctx.currentTime + duration
        );

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    }

    playNoise(duration, volume = 0.2) {
        if (!this.ctx) return;

        const bufferSize = this.ctx.sampleRate * duration;

        const buffer = this.ctx.createBuffer(
            1,
            bufferSize,
            this.ctx.sampleRate
        );

        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const source = this.ctx.createBufferSource();
        source.buffer = buffer;

        const gain = this.ctx.createGain();

        gain.gain.setValueAtTime(volume, this.ctx.currentTime);

        gain.gain.exponentialRampToValueAtTime(
            0.001,
            this.ctx.currentTime + duration
        );

        source.connect(gain);
        gain.connect(this.ctx.destination);

        source.start();
    }

    playerShoot() {
        this.playTone(880, 0.05, 'square', 0.08);
    }

    bossHit() {
        this.playNoise(0.05, 0.15);
    }

    bomb() {
        this.playNoise(0.5, 0.25);

        if (this.ctx) {
            setTimeout(() => {
                this.playTone(80, 0.3, 'sawtooth', 0.2);
            }, 50);
        }
    }

    playerDeath() {
        this.playTone(150, 0.8, 'sawtooth', 0.2);
    }

    waveStart() {
        this.playTone(880, 0.1, 'square', 0.1);

        if (this.ctx) {
            setTimeout(() => {
                this.playTone(1100, 0.1, 'square', 0.1);
            }, 100);
        }
    }

    bossAppear() {
        this.playTone(200, 0.3, 'sawtooth', 0.15);

        if (this.ctx) {
            setTimeout(() => {
                this.playTone(300, 0.5, 'sawtooth', 0.2);
            }, 200);
        }
    }

    bossPhaseChange() {
        this.playTone(600, 0.15, 'square', 0.1);

        if (this.ctx) {
            setTimeout(() => {
                this.playTone(800, 0.15, 'square', 0.1);
            }, 150);

            setTimeout(() => {
                this.playTone(1000, 0.2, 'square', 0.12);
            }, 300);
        }
    }

    pauseAll() {
        if (this.bgmElement) {
            this.bgmElement.pause();
            this.bgmElement.currentTime = 0;
        }

        if (this.ctx) {
            this.ctx.suspend();
        }
    }
}

// ---------- Основные классы ----------
class Player {
    constructor(x, y, image) {
        this.x = x;
        this.y = y;
        this.image = image;
        this.width = 32;
this.height = 32;
        this.lives = 2;
        this.bombs = 3;
        this.score = 0;
        this.invulnerable = false;
        this.invulnerableTimer = 0;
        this.shootCooldown = 0;
this.lastShotTime = 0;
    }

    update(targetX, targetY) {
        this.x = targetX;
        this.y = targetY;
        const halfW = this.width / 2;
        const halfH = this.height / 2;
        this.x = Math.max(halfW, Math.min(400 - halfW, this.x));
        this.y = Math.max(halfH, Math.min(600 - halfH, this.y));

        if (this.invulnerable) {
            this.invulnerableTimer--;
            if (this.invulnerableTimer <= 0) this.invulnerable = false;
        }
        if (this.shootCooldown > 0) this.shootCooldown--;
    }

    draw(ctx) {
        ctx.save();
        if (!this.invulnerable || Math.floor(Date.now() / 100) % 2) {
            if (this.image && this.image.complete && this.image.naturalWidth > 0) {
                const w = this.width;
                const h = this.height;
                ctx.drawImage(this.image, this.x - w/2, this.y - h/2 + 30, w, h);
            } else {
                ctx.fillStyle = '#00ffcc';
                ctx.shadowBlur = 12;
                ctx.shadowColor = '#00ffcc';
                ctx.beginPath();
                ctx.moveTo(this.x, this.y - 12);
                ctx.lineTo(this.x - 8, this.y + 8);
                ctx.lineTo(this.x + 8, this.y + 8);
                ctx.closePath();
                ctx.fill();
                ctx.fillStyle = '#ffffff';
                ctx.shadowBlur = 0;
                ctx.beginPath();
                ctx.arc(this.x, this.y - 2, 3, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        ctx.fillStyle = '#7ab6ff';
        ctx.shadowBlur = 12;
        ctx.shadowColor = '#7ab6ff';
        ctx.beginPath();
        ctx.arc(this.x, this.y, 5, 0, 2 * Math.PI);
        ctx.fill();
        ctx.strokeStyle = '#7ab6ff';
        ctx.lineWidth = 2.5;
        ctx.shadowBlur = 0;
        ctx.stroke();
        ctx.restore();
    }

    hit() {
        if (!this.invulnerable) {
            this.lives--;
            this.invulnerable = true;
            this.invulnerableTimer = 90;
            return true;
        }
        return false;
    }

    useBomb() {
        if (this.bombs > 0) {
            this.bombs--;
            return true;
        }
        return false;
    }
}

class Bullet {
    constructor(x, y, angle, speed, isEnemy = true) {
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.speed = speed;
        this.width = isEnemy ? 5 : 14;
        this.height = isEnemy ? 5 : 6;
        this.isEnemy = isEnemy;
        this.color = isEnemy ? '#ff0023' : '#d9d9d9';
        this.damage = 1;
    }

    update() {

    if (this.customUpdate) {
        this.customUpdate();
    }

    this.x += Math.cos(this.angle) * this.speed;
    this.y += Math.sin(this.angle) * this.speed;
}

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 4;
        ctx.shadowColor = this.color;
        ctx.fillRect(-this.width/2, -this.height/2, this.width, this.height);
        ctx.restore();
    }

    isOffScreen() {
        return this.x < -20 || this.x > 420 || this.y < -20 || this.y > 620;
    }
}

class HomingBullet extends Bullet {
    constructor(x, y, game) {
        super(x, y, -Math.PI / 2, 6, false);
        this.game = game;
        this.color = '#d9d9d9';
        this.width = 14;
        this.height = 6;
        this.damage = 0.4;
        this.turnSpeed = 0.08;
    }

    update() {
        let closestTarget = null;
        let closestDist = Infinity;
        
        for (let enemy of this.game.enemies) {
            const dx = enemy.x - this.x;
            const dy = enemy.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < closestDist) {
                closestDist = dist;
                closestTarget = enemy;
            }
        }
        
        if (this.game.boss) {
            const dx = this.game.boss.x - this.x;
            const dy = this.game.boss.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < closestDist) {
                closestDist = dist;
                closestTarget = this.game.boss;
            }
        }
        
        if (closestTarget) {
            const desiredAngle = Math.atan2(closestTarget.y - this.y, closestTarget.x - this.x);
            let angleDiff = desiredAngle - this.angle;
            while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
            while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
            if (angleDiff > this.turnSpeed) this.angle += this.turnSpeed;
            else if (angleDiff < -this.turnSpeed) this.angle -= this.turnSpeed;
            else this.angle = desiredAngle;
        }
        super.update();
    }
}

// ---------- Класс босса ----------
class Hibachi {
    phaseOne() {

    if (this.timer % 6 === 0) {

        const base = this.timer * 0.07;

        for (let i = 0; i < 16; i++) {

            const angle =
                base +
                (Math.PI * 2 / 16) * i;

            const b = new Bullet(
                this.x,
                this.y,
                angle,
                2.8,
                true
            );

            b.width = 8;
            b.height = 8;
            b.color = '#ff0022';

            this.game.bullets.push(b);
        }
    }
}

phaseTwo() {

    if (this.timer % 50 === 0) {

        const aim = Math.atan2(
            this.game.player.y - this.y,
            this.game.player.x - this.x
        );

        for (let i = -8; i <= 8; i++) {

            const b = new Bullet(
                this.x,
                this.y,
                aim + i * 0.05,
                5,
                true
            );

            b.width = 5;
            b.height = 20;
            b.color = '#ffffff';

            this.game.bullets.push(b);
        }
    }
}

phaseThree() {

    if (this.timer % 3 === 0) {

        const spin = this.timer * 0.15;

        for (let i = 0; i < 3; i++) {

            const angle =
                spin +
                i * (Math.PI * 2 / 3);

            const b = new Bullet(
                this.x,
                this.y,
                angle,
                4,
                true
            );

            b.width = 10;
            b.height = 10;

            this.game.bullets.push(b);
        }
    }
}

    constructor(game) {

        this.game = game;

        this.x = 200;
        this.y = -120;

        this.targetY = 120;

        this.timer = 0;

        this.entered = false;

        this.maxHealth = 5000;
        this.health = this.maxHealth;

        this.phase = 0;

        this.moveTargetX = 200;

        this.auraRotation = 0;

        this.dead = false;
    }

    update() {
        if (this.phase === 1) this.phaseOne();
if (this.phase === 2) this.phaseTwo();
if (this.phase === 3) this.phaseThree();

        this.timer++;

        this.auraRotation += 0.02;

        // Entrance
        if (!this.entered) {

            this.y += (this.targetY - this.y) * 0.04;

            if (Math.abs(this.y - this.targetY) < 1) {

                this.entered = true;
                this.timer = 0;
                this.phase = 1;

                this.game.sound.bossAppear();
            }

            return;
        }

        // Movement
        this.x += (this.moveTargetX - this.x) * 0.015;

        if (this.timer % 180 === 0) {
            this.moveTargetX = 80 + Math.random() * 240;
        }

        const hp = this.health / this.maxHealth;

        if (hp < 0.75 && this.phase === 1) {
            this.phase = 2;
            this.timer = 0;
            this.game.sound.bossPhaseChange();
        }

        if (hp < 0.45 && this.phase === 2) {
            this.phase = 3;
            this.timer = 0;
            this.game.sound.bossPhaseChange();
        }

}
    draw(ctx) {
    ctx.save();

    ctx.translate(this.x, this.y);

    ctx.fillStyle = '#ff0023';
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#ff0023';

    ctx.beginPath();
    ctx.arc(0, 0, 35, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

hit(damage) {
    this.health -= damage;
    return this.health <= 0;
}
}
// ---------- Главный класс игры ----------
class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = 400;
        this.canvas.height = 600;

        this.isMobile = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
        this.showCorrectControls();

        this.sound = new SoundManager();
        this.gameStarted = false;

        this.bgImage = new Image();
        this.bgImage.src = 'assets/background.png';
        this.bgY = 0;
        this.bgSpeed = 5;

        this.playerImage = new Image();
        this.playerImage.src = 'assets/player.png';

        this.heartFull = new Image();
        this.heartFull.src = 'assets/heart_full.png';
        this.heartEmpty = new Image();
        this.heartEmpty.src = 'assets/heart_empty.png';
        this.bombFull = new Image();
        this.bombFull.src = 'assets/bomb_full.png';
        this.bombEmpty = new Image();
        this.bombEmpty.src = 'assets/bomb_empty.png';
        
        this.uiPanel = new Image();
        this.uiPanel.src = 'assets/ui.png';

        this.player = new Player(200, 500, this.playerImage);
        this.bullets = [];
        this.boss = null;
        this.mouseX = 200;
        this.mouseY = 500;
        this.gameRunning = false;
        this.gameOver = false;
        this.gameComplete = false;
        this.gameTimer = 0;

        this.laserMode = false;
        this.laserKeyDown = false;
        this.twoFingers = false;

        this.touchStartTime = 0;
        this.touchStartPos = null;
        this.touchStartFingers = 0;

        this.countdown = 0;
        this.countdownTimer = 0;
        this.countdownText = '';

        this.bombIconPositions = [];

        this.lastTime = 0;
        this.accumulator = 0;
        this.fixedDelta = 1000 / 60;
        this.enemies = [];
        this.wave = 1;

        this.boss = new Hibachi(this);

        this.setupEventListeners();
        requestAnimationFrame((timestamp) => this.gameLoop(timestamp));
    }

    

    

    spawnBoss() {
        this.boss = new Hibachi(this);
    }

    

    showCorrectControls() {
        document.getElementById('desktopControls').classList.toggle('hidden', this.isMobile);
        document.getElementById('mobileControls').classList.toggle('hidden', !this.isMobile);
    }

    isTapOnBomb(tx, ty) {
        for (let pos of this.bombIconPositions) {
            if (tx >= pos.x && tx <= pos.x + pos.size &&
                ty >= pos.y && ty <= pos.y + pos.size) {
                return pos.index;
            }
        }
        return -1;
    }

    setupEventListeners() {
        this.canvas.addEventListener('mousemove', (e) => {
            if (this.isMobile) return;
            const rect = this.canvas.getBoundingClientRect();
            const scaleX = this.canvas.width / rect.width;
            const scaleY = this.canvas.height / rect.height;
            this.mouseX = (e.clientX - rect.left) * scaleX;
            this.mouseY = (e.clientY - rect.top) * scaleY;
            this.player.update(this.mouseX, this.mouseY);
        });

        window.addEventListener('keydown', (e) => {
            if (e.code === 'KeyZ') this.laserKeyDown = true;
            if (e.code === 'KeyX') this.useBomb();
        });
        window.addEventListener('keyup', (e) => {
            if (e.code === 'KeyZ') this.laserKeyDown = false;
        });

        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (!this.gameRunning || this.gameOver || this.gameComplete) return;
            
            const touches = e.touches;
            this.twoFingers = touches.length >= 2;
            this.touchStartFingers = touches.length;
            
            const rect = this.canvas.getBoundingClientRect();
            const scaleX = this.canvas.width / rect.width;
            const scaleY = this.canvas.height / rect.height;
            const touch = touches[0];
            const tx = (touch.clientX - rect.left) * scaleX;
            const ty = (touch.clientY - rect.top) * scaleY;
            
            if (this.isMobile) {
                const bombIndex = this.isTapOnBomb(tx, ty);
                if (bombIndex !== -1) {
                    this.useBomb();
                    return;
                }
            }
            
            if (touches.length === 1) {
                this.touchStartTime = Date.now();
                this.touchStartPos = { x: tx, y: ty };
            }
            this.updateMobilePosition(touches);
        }, { passive: false });

        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (!this.gameRunning || this.gameOver || this.gameComplete) return;
            this.twoFingers = e.touches.length >= 2;
            this.updateMobilePosition(e.touches);
        }, { passive: false });

        this.canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            if (!this.gameRunning || this.gameOver || this.gameComplete) {
                this.twoFingers = false;
                return;
            }
            
            if (this.touchStartFingers === 1 && this.touchStartPos) {
                const dt = Date.now() - this.touchStartTime;
                const dx = Math.abs(this.mouseX - this.touchStartPos.x);
                const dy = Math.abs(this.mouseY - this.touchStartPos.y);
                if (dt < 300 && dx < 20 && dy < 20) this.useBomb();
            }
            
            this.twoFingers = e.touches.length >= 2;
            if (e.touches.length > 0) this.updateMobilePosition(e.touches);
            this.touchStartPos = null;
            this.touchStartFingers = 0;
        });

        document.getElementById('startButton').addEventListener('click', () => {
            this.sound.init();
            const bgm = document.getElementById('bgMusic');
            if (bgm) {
                bgm.pause();
                bgm.currentTime = 0;
                bgm.volume = 0.7;
                setTimeout(() => {
                    bgm.play().catch(e => console.error('Ошибка музыки:', e));
                }, 50);
            }
            this.startCountdown();
        });

        document.getElementById('restartButton').addEventListener('click', () => {
            const bgm = document.getElementById('bgMusic');
            if (bgm && bgm.paused) {
                setTimeout(() => {
                    bgm.play().catch(e => console.error('Ошибка музыки:', e));
                }, 50);
            }
            this.startCountdown();
        });
    }

    updateMobilePosition(touches) {
        if (touches.length === 0) return;
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        const touch = touches[0];
        let tx = (touch.clientX - rect.left) * scaleX;
        let ty = (touch.clientY - rect.top) * scaleY;
        ty = Math.max(20, ty - 80);
        this.player.update(tx, ty);
        this.mouseX = tx;
        this.mouseY = ty;
    }

    startCountdown() {

    document.getElementById('startScreen').classList.add('hidden');
    document.getElementById('gameOver').classList.add('hidden');

    this.player = new Player(200, 500, this.playerImage);

    this.bullets = [];

    // ВОТ ЭТО ВАЖНО
    this.boss = new Hibachi(this);

    this.gameTimer = 0;

    this.laserMode = false;
    this.laserKeyDown = false;
    this.twoFingers = false;

    this.gameRunning = false;
    this.gameOver = false;
    this.gameComplete = false;

    this.gameStarted = true;

    this.countdown = 3;
    this.countdownTimer = 60;
    this.countdownText = '3';
}
    useBomb() {
        if (this.player.useBomb()) {
            this.bullets = this.bullets.filter(b => !b.isEnemy);
            if (this.boss) {
                if (this.boss.hit(10)) {
                    this.player.score += this.boss.points;
                    this.boss = null;
                    this.completeGame();
                }
                this.sound.bossHit();
            }
        }
    }

    completeGame() {
        this.gameRunning = false;
        this.gameComplete = true;
        document.getElementById('finalScore').textContent = `Победа! Счёт: ${this.player.score}`;
        document.getElementById('gameOver').classList.remove('hidden');
        document.querySelector('#gameOver h2').textContent = 'Поздравляем!';
        document.querySelector('#gameOver h2').style.color = '#7ab6ff';
        this.sound.waveStart();
        
        const bgm = document.getElementById('bgMusic');

if (bgm) {
    bgm.pause();
}
    }

    update() {
        if (this.countdown > 0) {
            this.countdownTimer--;
            if (this.countdownTimer <= 0) {
                this.countdown--;
                if (this.countdown > 0) {
                    this.countdownText = this.countdown.toString();
                    this.countdownTimer = 60;
                } else {
                    this.countdownText = '';
                    this.gameRunning = true;
                }
            }
            return;
        }

        if (!this.gameRunning || this.gameOver || this.gameComplete) return;

        this.bgY = (this.bgY + this.bgSpeed) % this.canvas.height;

        this.gameTimer++;


        this.laserMode = this.laserKeyDown || this.twoFingers;

        const now = performance.now();

if (!this.laserMode) {
    if (now - this.player.lastShotTime > 120) {
        this.bullets.push(new Bullet(this.player.x, this.player.y - 15, -Math.PI / 2, 9, false));
        this.player.lastShotTime = now;
        this.sound.playerShoot();
    }
}

if (this.laserMode) {
    if (now - this.player.lastShotTime > 200) {
        this.bullets.push(new HomingBullet(this.player.x, this.player.y - 5, this));
        this.player.lastShotTime = now;
        this.sound.playerShoot();
    }
}
        if (this.isMobile) this.player.update(this.mouseX, this.mouseY);

        if (this.boss) {
            this.boss.update();
            if (this.boss.health <= 0) {
                this.player.score += this.boss.points;
                this.boss = null;
                this.completeGame();
            }
        }

        this.bullets.forEach(b => b.update());
        this.bullets = this.bullets.filter(b => !b.isOffScreen());

        
        
        this.checkCollisions();
        }

    checkCollisions() {
    for (let i = this.bullets.length - 1; i >= 0; i--) {
        const bullet = this.bullets[i];

        if (!bullet.isEnemy) {
            if (this.boss) {
                const dx = bullet.x - this.boss.x;
                const dy = bullet.y - this.boss.y;

                if (Math.sqrt(dx * dx + dy * dy) < 40) {
                    this.bullets.splice(i, 1);

                    this.sound.bossHit();

                    this.boss.health -= bullet.damage || 1;

                    if (this.boss.health <= 0) {
                        this.completeGame();
                    }

                    continue;
                }
            }
        }
    }

    for (let i = this.bullets.length - 1; i >= 0; i--) {
        const bullet = this.bullets[i];

        if (bullet.isEnemy) {
            const dx = bullet.x - this.player.x;
            const dy = bullet.y - this.player.y;

            if (Math.sqrt(dx * dx + dy * dy) < 2.2) {
                this.bullets.splice(i, 1);

                if (this.player.hit() && this.player.lives <= 0) {
                    this.endGame();
                }
            }
        }
    }

    if (this.boss) {
        const dx = this.boss.x - this.player.x;
        const dy = this.boss.y - this.player.y;

        if (Math.sqrt(dx * dx + dy * dy) < 28) {
            if (this.player.hit() && this.player.lives <= 0) {
                this.endGame();
            }
        }
    }
}

    endGame() {
        this.gameRunning = false;
        this.gameOver = true;
        document.getElementById('finalScore').textContent = `Счёт: ${this.player.score}`;
        document.getElementById('gameOver').classList.remove('hidden');
        document.querySelector('#gameOver h2').textContent = 'Игра окончена!';
        this.sound.playerDeath();
        
        const bgm = document.getElementById('bgMusic');

if (bgm) {
    bgm.pause();
}
    }

    drawUI() {
        this.bombIconPositions = [];

        const UI = {

    panelY: 0,
    panelHeight: 600,

    lives: {
        x: 30,
        y: 45,
        gap: 8,
        size: 20
    },

    score: {
        x: 370,
        y: 50,
        size: 14,
        color: '#d9d9d9'
    },

    bombs: this.isMobile ? {
        startX: 370,
        startY: 270,
        gap: 8,
        size: 24
    } : {
        startX: 140,
        startY: 540,
        gap: 15,
        size: 30
    }
};
        const ctx = this.ctx;
        ctx.save();

        if (this.uiPanel && this.uiPanel.complete && this.uiPanel.naturalWidth > 0) {
            ctx.drawImage(this.uiPanel, 0, UI.panelY, 400, UI.panelHeight);
        } else {
            ctx.fillStyle = 'rgba(0, 20, 40, 0.8)';
            ctx.fillRect(0, UI.panelY, 400, UI.panelHeight);
            ctx.strokeStyle = '#00ffcc';
            ctx.strokeRect(0, UI.panelY, 400, UI.panelHeight);
        }

        const lv = UI.lives;
        for (let i = 0; i < 2; i++) {
            const x = lv.x + i * (lv.size + lv.gap);
            const y = UI.panelY + lv.y;
            const img = i < this.player.lives ? this.heartFull : this.heartEmpty;
            if (img && img.complete && img.naturalWidth > 0) {
                ctx.drawImage(img, x, y, lv.size, lv.size);
            } else {
                ctx.fillStyle = i < this.player.lives ? '#ff3366' : '#444';
                ctx.beginPath();
                ctx.arc(x + 10, y + 10, 8, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        ctx.font = `${UI.score.size}px "Unbounded", "Unbounded Medium", Arial`;
        ctx.fillStyle = UI.score.color;
        ctx.textAlign = 'right';
        ctx.fillText(`${this.player.score}`, UI.score.x, UI.panelY + UI.score.y);


        const bv = UI.bombs;
        if (this.isMobile) {
            for (let i = 0; i < 3; i++) {
                const x = bv.startX;
                const y = bv.startY + i * (bv.size + bv.gap);
                const img = i < this.player.bombs ? this.bombFull : this.bombEmpty;
                
                this.bombIconPositions.push({ x, y, size: bv.size, index: i });
                
                if (img && img.complete && img.naturalWidth > 0) {
                    ctx.drawImage(img, x, y, bv.size, bv.size);
                } else {
                    ctx.fillStyle = i < this.player.bombs ? '#ffaa00' : '#555';
                    ctx.beginPath();
                    ctx.arc(x + bv.size/2, y + bv.size/2, bv.size/2, 0, 2 * Math.PI);
                    ctx.fill();
                }
            }
        } else {
            for (let i = 0; i < 3; i++) {
                const x = bv.startX + i * (bv.size + bv.gap);
                const y = bv.startY;
                const img = i < this.player.bombs ? this.bombFull : this.bombEmpty;
                
                this.bombIconPositions.push({ x, y, size: bv.size, index: i });
                
                if (img && img.complete && img.naturalWidth > 0) {
                    ctx.drawImage(img, x, y, bv.size, bv.size);
                } else {
                    ctx.fillStyle = i < this.player.bombs ? '#ffaa00' : '#555';
                    ctx.beginPath();
                    ctx.arc(x + bv.size/2, y + bv.size/2, bv.size/2, 0, 2 * Math.PI);
                    ctx.fill();
                }
            }
        }

        ctx.restore();
    }

    draw() {
        if (this.bgImage.complete && this.bgImage.naturalWidth > 0) {
            const h = this.canvas.height;
            this.ctx.drawImage(this.bgImage, 0, this.bgY, this.canvas.width, h);
            this.ctx.drawImage(this.bgImage, 0, this.bgY - h, this.canvas.width, h);
        } else {
            this.ctx.fillStyle = '#0a0a1a';
            this.ctx.fillRect(0, 0, 400, 600);
        }

        if (this.boss) this.boss.draw(this.ctx);
        
        this.bullets.forEach(b => {
            if (!b.isEnemy) b.draw(this.ctx);
        });
        
        this.player.draw(this.ctx);
        
        this.bullets.forEach(b => {
            if (b.isEnemy) b.draw(this.ctx);
        });
        
        this.drawUI();

        if (this.countdown > 0 && this.countdownText) {
            this.ctx.save();

this.ctx.fillStyle = 'rgba(0,0,0,0.5)';
this.ctx.fillRect(0, 0, 400, 600);

this.ctx.font = '700 110px "Unbounded", sans-serif';
this.ctx.textAlign = 'center';
this.ctx.textBaseline = 'middle';

this.ctx.fillStyle = '#d9d9d9';

this.ctx.shadowBlur = 20;
this.ctx.shadowColor = '#ff0023';

this.ctx.fillText(this.countdownText, 200, 300);

this.ctx.restore();
        }
    }

    gameLoop(timestamp) {
        if (this.lastTime === 0) this.lastTime = timestamp;
        let delta = timestamp - this.lastTime;
        this.lastTime = timestamp;
        if (delta > 1000) delta = 1000;

        this.accumulator += delta;
        while (this.accumulator >= this.fixedDelta) {
            this.update();
            this.accumulator -= this.fixedDelta;
        }

        this.draw();
        requestAnimationFrame((nextTimestamp) => this.gameLoop(nextTimestamp));
    }
}
window.addEventListener('message', (event) => {
    if (event.data === 'pauseMusic') {
        const bgm = document.getElementById('bgMusic');
        if (bgm) {
            bgm.pause();
            bgm.currentTime = 0;
        }

        if (window.game && window.game.sound) {
            window.game.sound.pauseAll();
        }
    }
});

window.addEventListener('pagehide', () => {
    window.postMessage('pauseMusic', '*');
});

document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        window.postMessage('pauseMusic', '*');
    }
});
window.game = new Game();
