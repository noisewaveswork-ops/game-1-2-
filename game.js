// ---------- Звуковой менеджер (Web Audio API синтез) ----------
class SoundManager {
    constructor() {
        this.ctx = null;
        this.initialized = false;
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
    enemyShoot() { this.playTone(440, 0.08, 'square', 0.06); }
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
                // Запасной спрайт
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

        // Хитбокс (точка) - увеличенный и более заметный
        ctx.fillStyle = '#ffffff';
        ctx.shadowBlur = 12;
        ctx.shadowColor = '#ff0000';
        ctx.beginPath();
        ctx.arc(this.x, this.y, 5, 0, 2 * Math.PI);
        ctx.fill();
        ctx.strokeStyle = '#ff0000';
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
        this.radius = isEnemy ? 5 : 3;
        this.isEnemy = isEnemy;
        this.color = isEnemy ? '#ff4444' : '#ffee00';
        this.damage = 1;
    }

    update() {
        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed;
    }

    draw(ctx) {
        ctx.save();
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 8;
        ctx.shadowColor = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
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
        this.color = '#ff44ff';
        this.radius = 3;
        this.damage = 0.4;
        this.turnSpeed = 0.08;
    }

    update() {
        const enemies = this.game.enemies;
        let closestEnemy = null;
        let closestDist = Infinity;
        for (let enemy of enemies) {
            const dx = enemy.x - this.x;
            const dy = enemy.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < closestDist) {
                closestDist = dist;
                closestEnemy = enemy;
            }
        }
        if (closestEnemy) {
            const desiredAngle = Math.atan2(closestEnemy.y - this.y, closestEnemy.x - this.x);
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
        ctx.fillStyle = '#ff3366';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#ff3366';
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
        this.maxHealth = 150;
        this.health = this.maxHealth;
        this.phase = 1;
        this.timer = 0;
        this.entered = false;
        this.targetY = 80;
        this.points = 5000;
    }

    update() {
        this.timer++;
        
        // Вход босса
        if (!this.entered) {
            this.y += (this.targetY - this.y) * 0.05;
            if (Math.abs(this.y - this.targetY) < 1) {
                this.y = this.targetY;
                this.entered = true;
                this.timer = 0;
                this.game.sound.bossAppear();
            }
            return;
        }

        // Определение фазы по здоровью
        const healthPercent = this.health / this.maxHealth;
        if (healthPercent > 0.6) {
            this.phase = 1;
        } else if (healthPercent > 0.3) {
            if (this.phase !== 2) {
                this.phase = 2;
                this.timer = 0;
                this.game.sound.bossPhaseChange();
            }
        } else {
            if (this.phase !== 3) {
                this.phase = 3;
                this.timer = 0;
                this.game.sound.bossPhaseChange();
            }
        }

        // Движение и атаки по фазам
        this.x += Math.sin(this.timer * 0.02) * 2;

        switch(this.phase) {
            case 1:
                // Фаза 1: веерные атаки
                if (this.timer % 50 === 0) {
                    const baseAngle = Math.atan2(this.game.player.y - this.y, this.game.player.x - this.x);
                    for (let i = -2; i <= 2; i++) {
                        this.game.bullets.push(new Bullet(this.x, this.y + 20, baseAngle + i * 0.25, 2.5, true));
                    }
                    this.game.sound.enemyShoot();
                }
                if (this.timer % 70 === 0) {
                    for (let i = 0; i < 8; i++) {
                        const angle = (Math.PI * 2 / 8) * i + this.timer * 0.02;
                        this.game.bullets.push(new Bullet(this.x, this.y, angle, 2, true));
                    }
                    this.game.sound.enemyShoot();
                }
                break;
            case 2:
                // Фаза 2: спирали + прицельные
                if (this.timer % 40 === 0) {
                    for (let i = 0; i < 12; i++) {
                        const angle = (Math.PI * 2 / 12) * i + this.timer * 0.04;
                        this.game.bullets.push(new Bullet(this.x, this.y, angle, 2.5, true));
                    }
                    this.game.sound.enemyShoot();
                }
                if (this.timer % 60 === 0) {
                    for (let j = 0; j < 3; j++) {
                        setTimeout(() => {
                            if (this.health > 0) {
                                const angle = Math.atan2(this.game.player.y - this.y, this.game.player.x - this.x);
                                for (let i = -1; i <= 1; i++) {
                                    this.game.bullets.push(new Bullet(this.x, this.y + 30, angle + i * 0.2, 3.5, true));
                                }
                                this.game.sound.enemyShoot();
                            }
                        }, j * 150);
                    }
                }
                break;
            case 3:
                // Фаза 3: безумные атаки
                if (this.timer % 30 === 0) {
                    for (let i = 0; i < 16; i++) {
                        const angle = (Math.PI * 2 / 16) * i + this.timer * 0.06;
                        this.game.bullets.push(new Bullet(this.x, this.y, angle, 3, true));
                    }
                    this.game.sound.enemyShoot();
                }
                if (this.timer % 45 === 0) {
                    const baseAngle = Math.atan2(this.game.player.y - this.y, this.game.player.x - this.x);
                    for (let i = -3; i <= 3; i++) {
                        this.game.bullets.push(new Bullet(this.x, this.y + 25, baseAngle + i * 0.3, 4, true));
                    }
                    this.game.sound.enemyShoot();
                }
                if (this.timer % 80 === 0) {
                    for (let i = 0; i < 20; i++) {
                        const angle = (Math.PI * 2 / 20) * i;
                        this.game.bullets.push(new Bullet(this.x, this.y, angle, 2.8, true));
                    }
                    this.game.sound.enemyShoot();
                }
                break;
        }
    }

    draw(ctx) {
        ctx.save();
        
        // Основное тело босса
        const gradient = ctx.createRadialGradient(this.x, this.y, 10, this.x, this.y, 35);
        gradient.addColorStop(0, '#ff0000');
        gradient.addColorStop(0.5, '#ff3366');
        gradient.addColorStop(1, '#660000');
        
        ctx.fillStyle = gradient;
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#ff0000';
        ctx.beginPath();
        ctx.arc(this.x, this.y, 35, 0, Math.PI * 2);
        ctx.fill();
        
        // Глаза
        ctx.fillStyle = '#ffffff';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#ffffff';
        ctx.beginPath();
        ctx.arc(this.x - 15, this.y - 8, 8, 0, Math.PI * 2);
        ctx.arc(this.x + 15, this.y - 8, 8, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#000000';
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.arc(this.x - 15, this.y - 8, 4, 0, Math.PI * 2);
        ctx.arc(this.x + 15, this.y - 8, 4, 0, Math.PI * 2);
        ctx.fill();
        
        // Нижние выступы (щупальца)
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 4;
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#ff0000';
        for (let i = 0; i < 4; i++) {
            const baseAngle = Math.PI/2 + (i - 1.5) * 0.3;
            const wiggle = Math.sin(this.timer * 0.1 + i) * 15;
            ctx.beginPath();
            ctx.moveTo(this.x + Math.cos(baseAngle) * 25, this.y + Math.sin(baseAngle) * 25);
            ctx.lineTo(
                this.x + Math.cos(baseAngle) * 50 + wiggle * Math.cos(baseAngle + Math.PI/2),
                this.y + Math.sin(baseAngle) * 50 + wiggle * Math.sin(baseAngle + Math.PI/2)
            );
            ctx.stroke();
        }
        
        // Полоска здоровья
        const barWidth = 300;
        const barHeight = 8;
        ctx.fillStyle = '#333333';
        ctx.shadowBlur = 0;
        ctx.fillRect(50, 10, barWidth, barHeight);
        
        const healthGradient = ctx.createLinearGradient(50, 0, 350, 0);
        healthGradient.addColorStop(0, '#ff0000');
        healthGradient.addColorStop(0.5, '#ffff00');
        healthGradient.addColorStop(0.8, '#00ff00');
        
        ctx.fillStyle = healthGradient;
        ctx.fillRect(50, 10, barWidth * (this.health / this.maxHealth), barHeight);
        
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.strokeRect(50, 10, barWidth, barHeight);
        
        // Текст фазы
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(`Фаза ${this.phase}`, 50, 40);
        ctx.textAlign = 'start';
        
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

        this.isMobile = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
        this.showCorrectControls();

        this.sound = new SoundManager();
        this.gameStarted = false;

        // Скроллящийся фон
        this.bgImage = new Image();
        this.bgImage.src = 'assets/background.png';
        this.bgY = 0;
        this.bgSpeed = 5;

        // Изображение игрока
        this.playerImage = new Image();
        this.playerImage.src = 'assets/player.png';

        // Иконки UI
        this.heartFull = new Image();
        this.heartFull.src = 'assets/heart_full.png';
        this.heartEmpty = new Image();
        this.heartEmpty.src = 'assets/heart_empty.png';
        this.bombFull = new Image();
        this.bombFull.src = 'assets/bomb_full.png';
        this.bombEmpty = new Image();
        this.bombEmpty.src = 'assets/bomb_empty.png';
        
        // UI плашка
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
        this.gameTimer = 0; // Таймер игры
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

        // Фиксированный временной шаг
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
                health: 3, points: 100,
                update: (enemy) => {
                    enemy.y += 2;
                    if (enemy.timer % 60 === 0) {
                        const angle = Math.atan2(this.player.y - enemy.y, this.player.x - enemy.x);
                        this.bullets.push(new Bullet(enemy.x, enemy.y, angle, 3, true));
                        this.sound.enemyShoot();
                    }
                }
            },
            sineFan: {
                health: 4, points: 150,
                update: (enemy) => {
                    enemy.y += 1.8;
                    enemy.x += Math.sin(enemy.timer * 0.05) * 2.5;
                    if (enemy.timer % 50 === 0) {
                        const baseAngle = Math.atan2(this.player.y - enemy.y, this.player.x - enemy.x);
                        for (let i = -1; i <= 1; i++) {
                            this.bullets.push(new Bullet(enemy.x, enemy.y, baseAngle + i * 0.3, 3.5, true));
                        }
                        this.sound.enemyShoot();
                    }
                }
            },
            spiral: {
                health: 6, points: 200,
                update: (enemy) => {
                    enemy.y += 1.2;
                    if (enemy.timer % 40 === 0) {
                        for (let i = 0; i < 6; i++) {
                            const angle = (Math.PI * 2 / 6) * i + enemy.timer * 0.05;
                            this.bullets.push(new Bullet(enemy.x, enemy.y, angle, 2.5, true));
                        }
                        this.sound.enemyShoot();
                    }
                }
            },
            sideSweeper: {
                health: 5, points: 180,
                update: (enemy) => {
                    if (!enemy.initialized) {
                        enemy.initialized = true;
                        enemy.xSpeed = (enemy.x < 200) ? 1.5 : -1.5;
                    }
                    enemy.x += enemy.xSpeed;
                    enemy.y += 1.5;
                    if (enemy.timer % 45 === 0) {
                        const angle = Math.atan2(this.player.y - enemy.y, this.player.x - enemy.x);
                        for (let j = 0; j < 3; j++) {
                            setTimeout(() => {
                                if (enemy.health > 0) {
                                    this.bullets.push(new Bullet(enemy.x, enemy.y, angle, 4, true));
                                    this.sound.enemyShoot();
                                }
                            }, j * 100);
                        }
                    }
                }
            }
        };
    }

    buildWave(waveNumber) {
        const queue = [];
        const types = ['straightShooter', 'sineFan', 'spiral', 'sideSweeper'];
        const count = 3 + Math.floor(waveNumber / 2);
        for (let i = 0; i < count; i++) {
            const type = types[Math.floor(Math.random() * types.length)];
            queue.push({ type, x: 50 + Math.random() * 300, y: -30 - Math.random() * 40, delay: i * 20 });
        }
        return queue;
    }

    nextWave() {
        this.wave++;
        this.waveStep = 0;
        this.waveSpawnQueue = this.buildWave(this.wave);
        this.spawnTimer = 0;
        this.player.score += 200 * this.wave;
        if (this.wave > 1) this.sound.waveStart();
    }

    spawnBoss() {
        this.boss = new Boss(200, -50, this);
        this.bossSpawned = true;
        // Очищаем оставшихся врагов
        this.enemies = [];
        this.waveSpawnQueue = [];
    }

    spawnFromQueue() {
        if (this.bossSpawned) return;
        
        if (this.waveSpawnQueue.length === 0) {
            if (this.enemies.length === 0) this.nextWave();
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
        if (touches.length === 1) {
            this.touchStartTime = Date.now();
            const rect = this.canvas.getBoundingClientRect();
            const scaleX = this.canvas.width / rect.width;
            const scaleY = this.canvas.height / rect.height;
            const touch = touches[0];
            this.touchStartPos = {
                x: (touch.clientX - rect.left) * scaleX,
                y: (touch.clientY - rect.top) * scaleY
            };
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
            bgm.currentTime = 0;
            bgm.volume = 0.7;
            bgm.play()
                .then(() => console.log('Музыка запущена'))
                .catch(e => console.error('Ошибка музыки:', e));
        }
        this.startCountdown();
    });

    document.getElementById('restartButton').addEventListener('click', () => {
        this.startCountdown();
    });
}


    

        document.getElementById('startButton').addEventListener('click', () => {
            this.sound.init();
        const bgm = document.getElementById('bgMusic');
            if (bgm) {
        // Сначала явно сбрасываем, затем играем
            bgm.currentTime = 0;
            bgm.volume = 0.7; // добавьте громкость, если нужно
            const playPromise = bgm.play();
        if (playPromise !== undefined) {
            playPromise
                .then(() => console.log('Музыка запущена'))
                .catch(e => console.error('Ошибка запуска музыки:', e));
            }
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
                // Бомба наносит урон боссу
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
        this.sound.waveStart();
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

        // Сдвиг фона
        this.bgY = (this.bgY + this.bgSpeed) % this.canvas.height;

        // Таймер игры
        this.gameTimer++;
        
        // Спавн босса через ~60 секунд (3600 кадров при 60 FPS)
        if (!this.bossSpawned && this.gameTimer > 3600) {
            this.spawnBoss();
        }

        this.laserMode = this.laserKeyDown || this.twoFingers;

        if (this.player.shootCooldown <= 0) {
            if (this.laserMode) {
                this.bullets.push(new HomingBullet(this.player.x, this.player.y - 5, this));
                this.player.shootCooldown = 10;
            } else {
                this.bullets.push(new Bullet(this.player.x, this.player.y - 15, -Math.PI / 2, 9, false));
                this.player.shootCooldown = 8;
            }
            this.sound.playerShoot();
        }

        if (!this.isMobile) this.player.update(this.mouseX, this.mouseY);

        // Обновление босса
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
        this.enemies = this.enemies.filter(e => e.y < 620 + 20);
        
        if (!this.bossSpawned) {
            this.spawnFromQueue();
        }
        
        this.checkCollisions();

        if (!this.bossSpawned && this.enemies.length === 0 && this.waveSpawnQueue.length === 0) {
            this.nextWave();
        }
    }

    checkCollisions() {
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            if (!bullet.isEnemy) {
                // Проверка столкновения с боссом
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
                
                // Проверка столкновения с врагами
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
                if (Math.sqrt(dx * dx + dy * dy) < 6) {
                    this.bullets.splice(i, 1);
                    if (this.player.hit() && this.player.lives <= 0) this.endGame();
                }
            }
        }

        // Столкновение с врагами
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            const dx = enemy.x - this.player.x;
            const dy = enemy.y - this.player.y;
            if (Math.sqrt(dx * dx + dy * dy) < 20) {
                this.enemies.splice(i, 1);
                if (this.player.hit() && this.player.lives <= 0) this.endGame();
            }
        }
        
        // Столкновение с боссом
        if (this.boss) {
            const dx = this.boss.x - this.player.x;
            const dy = this.boss.y - this.player.y;
            if (Math.sqrt(dx * dx + dy * dy) < 40) {
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
    }

    drawUI() {
        const iconSize = 20;
        
        // Статичная плашка ui.png
        if (this.uiPanel && this.uiPanel.complete && this.uiPanel.naturalWidth > 0) {
            const panelWidth = 300;
            const panelHeight = 30;
            const panelX = (this.canvas.width - panelWidth) / 2; // По центру
            const panelY = 15; // Отступ 15px сверху
            this.ctx.drawImage(this.uiPanel, panelX, panelY, panelWidth, panelHeight);
        } else {
            // Запасной вариант для плашки
            this.ctx.fillStyle = 'rgba(0, 20, 40, 0.8)';
            this.ctx.fillRect(50, 15, 300, 30);
            this.ctx.strokeStyle = '#00ffcc';
            this.ctx.strokeRect(50, 15, 300, 30);
        }

        // Жизни (выровнены по левому краю ui.png, после отступа)
        const livesStartX = (this.canvas.width - 300) / 2 + 10; // Левый край панели + отступ
        const livesY = 60; // 15 + 30 + 15 = 60px от верха
        
        for (let i = 0; i < 2; i++) {
            const x = livesStartX + i * (iconSize + 12); // Расстояние 12px между иконками
            const img = i < this.player.lives ? this.heartFull : this.heartEmpty;
            if (img && img.complete && img.naturalWidth > 0) {
                this.ctx.drawImage(img, x, livesY, iconSize, iconSize);
            } else {
                // Запасной вариант для сердечек
                this.ctx.save();
                this.ctx.fillStyle = i < this.player.lives ? '#ff3366' : '#444';
                this.ctx.shadowBlur = i < this.player.lives ? 8 : 0;
                this.ctx.shadowColor = '#ff3366';
                this.ctx.beginPath();
                this.ctx.arc(x + 8, livesY + 8, 4, Math.PI, 0, false);
                this.ctx.arc(x + 16, livesY + 8, 4, Math.PI, 0, false);
                this.ctx.moveTo(x + 4, livesY + 10);
                this.ctx.lineTo(x + 12, livesY + 18);
                this.ctx.lineTo(x + 20, livesY + 10);
                this.ctx.fill();
                this.ctx.restore();
            }
        }

        // Бомбы (низ по центру)
        for (let i = 0; i < 3; i++) {
            const x = 164 + i * (iconSize + 12);
            const y = 568;
            const img = i < this.player.bombs ? this.bombFull : this.bombEmpty;
            if (img && img.complete && img.naturalWidth > 0) {
                this.ctx.drawImage(img, x, y, iconSize, iconSize);
            } else {
                // Запасной вариант для бомб
                this.ctx.save();
                this.ctx.fillStyle = '#222';
                this.ctx.strokeStyle = i < this.player.bombs ? '#ffaa00' : '#555';
                this.ctx.shadowBlur = i < this.player.bombs ? 8 : 0;
                this.ctx.shadowColor = '#ffaa00';
                this.ctx.beginPath();
                this.ctx.arc(x + 8, y + 8, 8, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.stroke();
                this.ctx.beginPath();
                this.ctx.moveTo(x + 8, y);
                this.ctx.lineTo(x + 12, y - 6);
                this.ctx.strokeStyle = '#ffaa00';
                this.ctx.lineWidth = 2;
                this.ctx.stroke();
                if (i < this.player.bombs) {
                    this.ctx.fillStyle = '#ff4400';
                    this.ctx.shadowBlur = 6;
                    this.ctx.shadowColor = '#ff4400';
                    this.ctx.beginPath();
                    this.ctx.arc(x + 12, y - 8, 3, 0, 2 * Math.PI);
                    this.ctx.fill();
                }
                this.ctx.restore();
            }
        }

        // Счёт и волна
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '14px Arial';
        this.ctx.textAlign = 'right';
        this.ctx.fillText(`${this.player.score}`, 380, 76);
        this.ctx.textAlign = 'left';
    }

    draw() {
        // Скроллящийся фон
        if (this.bgImage.complete && this.bgImage.naturalWidth > 0) {
            const h = this.canvas.height;
            this.ctx.drawImage(this.bgImage, 0, this.bgY, this.canvas.width, h);
            this.ctx.drawImage(this.bgImage, 0, this.bgY - h, this.canvas.width, h);
        } else {
            this.ctx.fillStyle = '#0a0a1a';
            this.ctx.fillRect(0, 0, 400, 600);
        }

        // Игровые объекты
        if (this.boss) this.boss.draw(this.ctx);
        this.enemies.forEach(e => e.draw(this.ctx));
        this.bullets.forEach(b => b.draw(this.ctx));
        this.player.draw(this.ctx);
        this.drawUI();

        // Обратный отсчёт
        if (this.countdown > 0 && this.countdownText) {
            this.ctx.save();
            this.ctx.fillStyle = 'rgba(0,0,0,0.5)';
            this.ctx.fillRect(0, 0, 400, 600);
            this.ctx.font = 'bold 120px Arial';
            this.ctx.fillStyle = '#ffffff';
            this.ctx.textAlign = 'center';
            this.ctx.shadowBlur = 20;
            this.ctx.shadowColor = '#ff0000';
            this.ctx.fillText(this.countdownText, 200, 320);
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

const game = new Game();
