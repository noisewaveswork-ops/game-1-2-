// ---------- Звуковой менеджер (Web Audio API синтез) ----------
class SoundManager {
    constructor() {
        this.ctx = null;
        this.initialized = false;
        this.bgmElement = document.getElementById('bgMusic');
    }

    init() {
        if (this.initialized) return;
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            const buf = this.ctx.createBuffer(1, 1, 22050);
            const src = this.ctx.createBufferSource();
            src.buffer = buf;
            src.connect(this.ctx.destination);
            src.start(0);
        } catch(e) {
            console.warn('Web Audio API не поддерживается');
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
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    }

    playNoise(duration, volume = 0.2) {
        if (!this.ctx) return;
        const bufferSize = this.ctx.sampleRate * duration;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        const source = this.ctx.createBufferSource();
        source.buffer = buffer;
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(volume, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
        source.connect(gain);
        gain.connect(this.ctx.destination);
        source.start();
    }

    playerShoot() { this.playTone(880, 0.05, 'square', 0.08); }
    enemyShoot() { this.playTone(440, 0.05, 'square', 0.03); }
    enemyHit() { this.playNoise(0.03, 0.1); }
    bossHit() { this.playNoise(0.05, 0.15); }
    bomb() {
        this.playNoise(0.5, 0.25);
        if (this.ctx) setTimeout(() => this.playTone(80, 0.3, 'sawtooth', 0.2), 50);
    }
    playerDeath() { this.playTone(150, 0.8, 'sawtooth', 0.2); }
    waveStart() {
        this.playTone(880, 0.1, 'square', 0.1);
        if (this.ctx) setTimeout(() => this.playTone(1100, 0.1, 'square', 0.1), 100);
    }
    bossAppear() {
        this.playTone(200, 0.3, 'sawtooth', 0.15);
        if (this.ctx) setTimeout(() => this.playTone(300, 0.5, 'sawtooth', 0.2), 200);
    }
    bossPhaseChange() {
        this.playTone(600, 0.15, 'square', 0.1);
        if (this.ctx) setTimeout(() => this.playTone(800, 0.15, 'square', 0.1), 150);
        if (this.ctx) setTimeout(() => this.playTone(1000, 0.2, 'square', 0.12), 300);
    }
    pauseAll() {
    if (this.bgmElement) {
        this.bgmElement.pause();
        this.bgmElement.currentTime = 0;
    }

    if (this.ctx) {
        this.ctx.suspend(); // ключевая вещь для мобилок
    }
}
}

// ---------- Основные классы ----------
class Player {
    constructor(x, y, image) {
        this.x = x;
        this.y = y;
        this.image = image;
        this.width = image ? image.width : 16;
        this.height = image ? image.height : 16;
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

class Enemy {
    constructor(x, y, pattern) {
        this.x = x;
        this.y = y;
        this.pattern = pattern;
        this.timer = 0;
        this.health = pattern.health || 1;
        this.maxHealth = this.health;
        this.points = pattern.points || 100;
    }

    update() {
        this.timer++;
        if (this.pattern.update) this.pattern.update(this);
    }

    draw(ctx) {
        ctx.save();
        ctx.fillStyle = '#ff0023';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#ff0023';
        ctx.beginPath();
        ctx.arc(this.x, this.y, 14, 0, Math.PI * 2);
        ctx.fill();
        if (this.health < this.maxHealth) {
            const barWidth = 28;
            const barHeight = 3;
            ctx.fillStyle = '#ff0000';
            ctx.fillRect(this.x - barWidth / 2, this.y - 22, barWidth, barHeight);
            ctx.fillStyle = '#00ff00';
            ctx.fillRect(this.x - barWidth / 2, this.y - 22, barWidth * (this.health / this.maxHealth), barHeight);
        }
        ctx.restore();
    }

    hit(damage = 1) {
        this.health -= damage;
        return this.health <= 0;
    }
}

// ---------- Класс босса ----------
class Boss {
    constructor(x, y, game) {
        this.x = x;
        this.y = y;
        this.game = game;
        this.maxHealth = 250;           // больше здоровья
        this.health = this.maxHealth;
        this.phase = 1;
        this.timer = 0;
        this.entered = false;
        this.targetY = 80;
        this.points = 10000;
        this.xDirection = 1;
        this.xSpeed = 1.5;
    }

    update() {
    this.timer++;

    // Вход босса
    if (!this.entered) {
        this.y += (this.targetY - this.y) * 0.03;

        if (Math.abs(this.y - this.targetY) < 1) {
            this.y = this.targetY;
            this.entered = true;
            this.timer = 0;
            this.game.sound.bossAppear();
        }

        return;
    }

    // Фазы
    const hp = this.health / this.maxHealth;
    const newPhase = hp > 0.66 ? 1 : (hp > 0.33 ? 2 : 3);

    if (newPhase !== this.phase) {
        this.phase = newPhase;
        this.timer = 0;
        this.game.sound.bossPhaseChange();
    }

    // Горизонтальное движение
    this.y = this.targetY;

    this.x += this.xSpeed * this.xDirection;

    if (this.x >= 340) {
        this.x = 340;
        this.xDirection = -1;
    } else if (this.x <= 60) {
        this.x = 60;
        this.xDirection = 1;
    }

    // =========================================
    // ФАЗА 1 — СИНУС ВОЛНЫ
    // =========================================
    if (this.phase === 1) {

        if (this.timer % 16 === 0) {

    for (let i = 0; i < 6; i++) {

        const spread = (i - 2.5) * 0.20;

        const angle =
            Math.PI / 2 +
            spread +
            Math.sin((this.timer + i * 10) * 0.06) * 0.22;

        const bullet = new Bullet(
            this.x,
            this.y + 10,
            angle,
            2.0,
            true
        );

        this.game.bullets.push(bullet);
    }

    this.game.sound.enemyShoot();
}
    }

    // =========================================
    // ФАЗА 2 — БОЛЬШИЕ ПУЛИ С КРАЕВ
    // =========================================
    if (this.phase === 2) {

    if (this.timer % 150 === 0) {

        const rows = 3;

        for (let i = 0; i < rows; i++) {

            const y = 140 + i * 70;

            // LEFT
            const left = new Bullet(
                -30,
                y,
                0,
                1.1,
                true
            );

            left.width = 36;
            left.height = 36;
            left.color = '#ff0023';

            // RIGHT
            const right = new Bullet(
                430,
                y + 35,
                Math.PI,
                1.1,
                true
            );

            right.width = 36;
            right.height = 36;
            right.color = '#ff0023';

            this.game.bullets.push(left);
            this.game.bullets.push(right);
        }

        this.game.sound.enemyShoot();
    }

    // прицельные выстрелы
    if (this.timer % 90 === 0) {

        const angle = Math.atan2(
            this.game.player.y - this.y,
            this.game.player.x - this.x
        );

        for (let i = -1; i <= 1; i++) {

            this.game.bullets.push(
                new Bullet(
                    this.x,
                    this.y,
                    angle + i * 0.18,
                    2.8,
                    true
                )
            );
        }
    }
}

    // =========================================
    // ФАЗА 3 — СПИРАЛЬ С ЗАМЕДЛЕНИЕМ
    // =========================================
    if (this.phase === 3) {

    if (this.timer % 5 === 0) {

        const base = this.timer * 0.16;

        for (let i = 0; i < 2; i++) {

            const angle = base + Math.PI * i;

            const bullet = new Bullet(
                this.x,
                this.y,
                angle,
                3.2,
                true
            );

            bullet.width = 7;
            bullet.height = 7;

            this.game.bullets.push(bullet);
        }

        // второй слой спирали
        if (this.timer % 9 === 0) {

            for (let i = 0; i < 2; i++) {

                const angle =
                    -base * 0.8 +
                    Math.PI * i;

                const bullet = new Bullet(
                    this.x,
                    this.y,
                    angle,
                    2.4,
                    true
                );

                bullet.width = 10;
                bullet.height = 10;

                this.game.bullets.push(bullet);
            }
        }

        this.game.sound.enemyShoot();
    }
}
}

    draw(ctx) {
        ctx.save();
        
        // Тёмный ореол
        const glow = ctx.createRadialGradient(this.x, this.y, 20, this.x, this.y, 50);
        glow.addColorStop(0, 'rgba(255,0,35,0.4)');
        glow.addColorStop(1, 'rgba(255,0,35,0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(this.x, this.y, 50, 0, Math.PI*2);
        ctx.fill();

        // Основное тело
        const grad = ctx.createRadialGradient(this.x, this.y, 10, this.x, this.y, 40);
        grad.addColorStop(0, '#ff0000');
        grad.addColorStop(0.4, '#ff0023');
        grad.addColorStop(1, '#4a0010');
        ctx.fillStyle = grad;
        ctx.shadowBlur = 25;
        ctx.shadowColor = '#ff0023';
        ctx.beginPath();
        ctx.arc(this.x, this.y, 40, 0, Math.PI*2);
        ctx.fill();

        // Глаза
        ctx.fillStyle = '#ffffff';
        ctx.shadowBlur = 12;
        ctx.shadowColor = '#ffffff';
        ctx.beginPath();
        ctx.arc(this.x-18, this.y-10, 10, 0, Math.PI*2);
        ctx.arc(this.x+18, this.y-10, 10, 0, Math.PI*2);
        ctx.fill();
        ctx.fillStyle = '#000000';
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.arc(this.x-18, this.y-10, 5, 0, Math.PI*2);
        ctx.arc(this.x+18, this.y-10, 5, 0, Math.PI*2);
        ctx.fill();

        // Щупальца
        ctx.strokeStyle = '#ff0023';
        ctx.lineWidth = 5;
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#ff0023';
        for (let i = 0; i < 6; i++) {
            const ba = Math.PI/2 + (i-2.5)*0.25;
            const wiggle = Math.sin(this.timer*0.08 + i)*18;
            ctx.beginPath();
            ctx.moveTo(this.x+Math.cos(ba)*30, this.y+Math.sin(ba)*30);
            ctx.lineTo(
                this.x+Math.cos(ba)*60 + wiggle*Math.cos(ba+Math.PI/2),
                this.y+Math.sin(ba)*60 + wiggle*Math.sin(ba+Math.PI/2)
            );
            ctx.stroke();
        }
        
        // Полоска здоровья босса
const bw = 180;
const bh = 8;
const bx = 110;
const by = 45;

ctx.fillStyle = '#111';
ctx.shadowBlur = 0;
ctx.fillRect(bx, by, bw, bh);

const hg = ctx.createLinearGradient(bx, 0, bx + bw, 0);
hg.addColorStop(0, '#ff0000');
hg.addColorStop(0.5, '#ff9900');
hg.addColorStop(1, '#ffff00');

ctx.fillStyle = hg;
ctx.fillRect(
    bx,
    by,
    bw * (this.health / this.maxHealth),
    bh
);

ctx.strokeStyle = '#ffffff';
ctx.lineWidth = 1.5;
ctx.strokeRect(bx, by, bw, bh);

        ctx.restore();
    }

    hit(damage = 1) {
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

        this.isMobile = window.matchMedia("(pointer: coarse)").matches;
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
        this.enemies = [];
        this.boss = null;
        this.mouseX = 200;
        this.mouseY = 500;
        this.gameRunning = false;
        this.gameOver = false;
        this.gameComplete = false;
        this.wave = 0;
        this.waveStep = 0;
        this.waveSpawnQueue = [];
        this.spawnTimer = 0;
        this.gameTimer = 0;
        this.bossSpawned = false;

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

        this.defineWavePatterns();
        this.setupEventListeners();
        requestAnimationFrame((timestamp) => this.gameLoop(timestamp));
    }

    defineWavePatterns() {
        this.patterns = {
            straightShooter: {
                health: 2, points: 100,
                update: (enemy) => {
                    enemy.y += 1.8;
                    if (enemy.y < 450 && enemy.timer % 75 === 0) {
                        const angle = Math.atan2(this.player.y - enemy.y, this.player.x - enemy.x);
                        this.bullets.push(new Bullet(enemy.x, enemy.y, angle, 2.5, true));
                        this.sound.enemyShoot();
                    }
                }
            },
            sineFan: {
                health: 3, points: 150,
                update: (enemy) => {
                    enemy.y += 1.5;
                    enemy.x += Math.sin(enemy.timer * 0.04) * 2.5;
                    if (enemy.y < 450 && enemy.timer % 65 === 0) {
                        const baseAngle = Math.atan2(this.player.y - enemy.y, this.player.x - enemy.x);
                        for (let i = -1; i <= 1; i++) {
                            this.bullets.push(new Bullet(enemy.x, enemy.y, baseAngle + i * 0.3, 3, true));
                        }
                        this.sound.enemyShoot();
                    }
                }
            },
            spiral: {

    health: 5,
    points: 220,

    update: (enemy) => {

        enemy.y += 0.8;

        if (enemy.y < 420 && enemy.timer % 7 === 0) {

            const base = enemy.timer * 0.12;

            for (let i = 0; i < 2; i++) {

                const angle = base + Math.PI * i;

                const bullet = new Bullet(
                    enemy.x,
                    enemy.y,
                    angle,
                    2.1,
                    true
                );

                bullet.width = 8;
                bullet.height = 8;

                this.bullets.push(bullet);
            }

            this.sound.enemyShoot();
        }
    }
},
            sideSweeper: {
                health: 4, points: 180,
                update: (enemy) => {
                    if (!enemy.initialized) {
                        enemy.initialized = true;
                        enemy.xSpeed = (enemy.x < 200) ? 1.2 : -1.2;
                    }
                    enemy.x += enemy.xSpeed;
                    enemy.y += 1.3;
                    if (enemy.y < 450 && enemy.timer % 60 === 0) {
                        const angle = Math.atan2(this.player.y - enemy.y, this.player.x - enemy.x);
                        for (let j = 0; j < 2; j++) {
                            setTimeout(() => {
                                if (enemy.health > 0) {
                                    this.bullets.push(new Bullet(enemy.x, enemy.y, angle, 3.5, true));
                                    this.sound.enemyShoot();
                                }
                            }, j * 120);
                        }
                    }
                }
            }
        };
    }

    buildWave(waveNumber) {

    const queue = [];

    // =====================================
    // WAVE 1
    // ОБУЧЕНИЕ БАЗОВОМУ ШОТУ
    // =====================================

    if (waveNumber === 1) {

        for (let i = 0; i < 5; i++) {

            queue.push({
                type: 'straightShooter',
                x: 70 + i * 65,
                y: -40,
                delay: i * 45
            });
        }
    }

    // =====================================
    // WAVE 2
    // МЕДЛЕННЫЕ ВЕЕРА -> УЧИМ МИКРОДОДЖ
    // =====================================

    else if (waveNumber === 2) {

        for (let i = 0; i < 4; i++) {

            queue.push({
                type: 'sineFan',
                x: 80 + i * 80,
                y: -50,
                delay: i * 55
            });
        }
    }

    // =====================================
    // WAVE 3
    // ЛАЗЕР/HOMING СТАНОВИТСЯ ПОЛЕЗЕН
    // =====================================

    else if (waveNumber === 3) {

        queue.push({
            type: 'sideSweeper',
            x: -20,
            y: 120,
            delay: 0
        });

        queue.push({
            type: 'sideSweeper',
            x: 420,
            y: 180,
            delay: 60
        });

        queue.push({
            type: 'straightShooter',
            x: 200,
            y: -50,
            delay: 120
        });
    }

    // =====================================
    // WAVE 4
    // ПЕРВЫЙ "СТРЕСС"
    // НО С БОЛЬШИМИ ПРОХОДАМИ
    // =====================================

    else if (waveNumber === 4) {

        queue.push({
            type: 'spiral',
            x: 130,
            y: -40,
            delay: 0
        });

        queue.push({
            type: 'spiral',
            x: 270,
            y: -40,
            delay: 80
        });

        queue.push({
            type: 'sineFan',
            x: 200,
            y: -60,
            delay: 150
        });
    }

    // =====================================
    // WAVE 5
    // ПЕРВАЯ ВОЛНА ПОД БОМБУ
    // =====================================

    else if (waveNumber === 5) {

        for (let i = 0; i < 6; i++) {

            queue.push({
                type: 'straightShooter',
                x: 40 + i * 60,
                y: -30,
                delay: i * 18
            });
        }

        queue.push({
            type: 'spiral',
            x: 200,
            y: -50,
            delay: 120
        });
    }

    // =====================================
    // WAVE 6
    // АКТИВНОЕ ПЕРЕКЛЮЧЕНИЕ ОРУЖИЯ
    // =====================================

    else if (waveNumber === 6) {

        queue.push({
            type: 'sideSweeper',
            x: -20,
            y: 120,
            delay: 0
        });

        queue.push({
            type: 'sideSweeper',
            x: 420,
            y: 120,
            delay: 40
        });

        queue.push({
            type: 'spiral',
            x: 200,
            y: -40,
            delay: 100
        });

        queue.push({
            type: 'sineFan',
            x: 90,
            y: -40,
            delay: 170
        });

        queue.push({
            type: 'sineFan',
            x: 310,
            y: -40,
            delay: 200
        });
    }

    // =====================================
    // WAVE 7
    // "НЕ БОЙСЯ БОМБ"
    // =====================================

    else if (waveNumber === 7) {

        for (let i = 0; i < 3; i++) {

            queue.push({
                type: 'spiral',
                x: 80 + i * 120,
                y: -40,
                delay: i * 50
            });
        }

        queue.push({
            type: 'sideSweeper',
            x: -20,
            y: 200,
            delay: 180
        });

        queue.push({
            type: 'sideSweeper',
            x: 420,
            y: 240,
            delay: 220
        });
    }

    // =====================================
    // WAVE 8
    // ПОЧТИ БОСС
    // =====================================

    else if (waveNumber === 8) {

        queue.push({
            type: 'spiral',
            x: 120,
            y: -40,
            delay: 0
        });

        queue.push({
            type: 'spiral',
            x: 280,
            y: -40,
            delay: 40
        });

        queue.push({
            type: 'spiral',
            x: 200,
            y: -40,
            delay: 80
        });

        queue.push({
            type: 'sideSweeper',
            x: -20,
            y: 160,
            delay: 150
        });

        queue.push({
            type: 'sideSweeper',
            x: 420,
            y: 160,
            delay: 190
        });
    }

    // =====================================
    // WAVE 9
    // ФИНАЛЬНЫЙ ЭКЗАМЕН
    // =====================================

    else if (waveNumber === 9) {

        for (let i = 0; i < 4; i++) {

            queue.push({
                type: 'spiral',
                x: 60 + i * 90,
                y: -40,
                delay: i * 35
            });
        }

        queue.push({
            type: 'sideSweeper',
            x: -20,
            y: 180,
            delay: 180
        });

        queue.push({
            type: 'sideSweeper',
            x: 420,
            y: 180,
            delay: 220
        });
    }

    return queue;
}

    nextWave() {
        this.wave++;
        this.waveStep = 0;
        
        if (this.wave >= 10) {
            this.wave = 10;
            this.spawnBoss();
            return;
        }
        
        this.waveSpawnQueue = this.buildWave(this.wave);
        this.spawnTimer = 0;
        this.player.score += 200 * this.wave;
        if (this.wave > 1) this.sound.waveStart();
    }

    spawnBoss() {
        this.boss = new Boss(200, -50, this);
        this.bossSpawned = true;
        this.enemies = [];
        this.waveSpawnQueue = [];
    }

    spawnFromQueue() {
        if (this.bossSpawned) return;
        
        if (this.waveSpawnQueue.length === 0) {
            if (this.enemies.length === 0 && this.wave < 10) this.nextWave();
            return;
        }
        while (this.waveSpawnQueue.length > 0 && this.spawnTimer >= this.waveSpawnQueue[0].delay) {
            const spec = this.waveSpawnQueue.shift();
            const pattern = this.patterns[spec.type];
            if (pattern) this.enemies.push(new Enemy(spec.x, spec.y, pattern));
        }
        this.spawnTimer++;
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
        this.enemies = [];
        this.boss = null;
        this.wave = 0;
        this.gameTimer = 0;
        this.bossSpawned = false;
        this.nextWave();
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
            this.enemies.forEach(enemy => {
                if (enemy.hit(3)) this.player.score += enemy.points * 2;
            });
            this.enemies = this.enemies.filter(e => e.health > 0);
            this.sound.bomb();
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
        
        if (this.bgmElement) {
            this.bgmElement.pause();
        }
    }

    update() {
        if (!this.isMobile) {
            this.player.update(this.mouseX, this.mouseY);
            }
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

        if (!this.bossSpawned && this.wave >= 10) {
            this.spawnBoss();
        }

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

        this.enemies.forEach(e => e.update());
        this.enemies = this.enemies.filter(e => e.y < 600);
        
        if (!this.bossSpawned) {
            this.spawnFromQueue();
        }
        
        this.checkCollisions();

        if (!this.bossSpawned && this.enemies.length === 0 && this.waveSpawnQueue.length === 0 && this.wave < 10) {
            this.nextWave();
        }
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
                        if (this.boss.hit(bullet.damage || 1)) {
                            this.player.score += this.boss.points;
                            this.boss = null;
                            this.completeGame();
                        }
                        continue;
                    }
                }
                
                for (let j = this.enemies.length - 1; j >= 0; j--) {
                    const enemy = this.enemies[j];
                    const dx = bullet.x - enemy.x;
                    const dy = bullet.y - enemy.y;
                    if (Math.sqrt(dx * dx + dy * dy) < 18) {
                        this.bullets.splice(i, 1);
                        if (enemy.hit(bullet.damage || 1)) {
                            this.player.score += enemy.points;
                            this.enemies.splice(j, 1);
                            this.sound.enemyHit();
                        }
                        break;
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
                    if (this.player.hit() && this.player.lives <= 0) this.endGame();
                }
            }
        }

        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            const dx = enemy.x - this.player.x;
            const dy = enemy.y - this.player.y;
            if (Math.sqrt(dx * dx + dy * dy) < 14) {
                this.enemies.splice(i, 1);
                if (this.player.hit() && this.player.lives <= 0) this.endGame();
            }
        }
        
        if (this.boss) {
            const dx = this.boss.x - this.player.x;
            const dy = this.boss.y - this.player.y;
            if (Math.sqrt(dx * dx + dy * dy) < 28) {
                if (this.player.hit() && this.player.lives <= 0) this.endGame();
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
        
        if (this.bgmElement) {
            this.bgmElement.pause();
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

            wave: {
                x: 370,
                y: 70,
                size: 12,
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

        ctx.font = `${UI.wave.size}px "Unbounded", "Unbounded Medium", Arial`;
        ctx.fillStyle = UI.wave.color;
        ctx.fillText(`Волна ${this.wave}`, UI.wave.x, UI.panelY + UI.wave.y);
        ctx.textAlign = 'left';

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

        this.enemies.forEach(e => e.draw(this.ctx));
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


window.addEventListener('DOMContentLoaded', () => {
    window.game = new Game();
});
