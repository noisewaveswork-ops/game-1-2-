/* ==============================
   ЗВУКОВОЙ МЕНЕДЖЕР (без изменений)
   ============================== */
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
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
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
    bomb() {
        this.playNoise(0.5, 0.25);
        if (this.ctx) setTimeout(() => this.playTone(80, 0.3, 'sawtooth', 0.2), 50);
    }
    playerDeath() { this.playTone(150, 0.8, 'sawtooth', 0.2); }
    waveStart() {
        this.playTone(880, 0.1, 'square', 0.1);
        if (this.ctx) setTimeout(() => this.playTone(1100, 0.1, 'square', 0.1), 100);
    }
}

/* ==============================
   ЗАГРУЗЧИК РЕСУРСОВ
   ============================== */
const ASSETS = {
    player: 'assets/player.png',
    enemy_straight: 'assets/enemy_straight.png',
    enemy_sine: 'assets/enemy_sine.png',
    enemy_spiral: 'assets/enemy_spiral.png',
    enemy_sweeper: 'assets/enemy_sweeper.png',
    enemy_boss: 'assets/enemy_boss.png',
    bullet_player: 'assets/bullet_player.png',
    bullet_homing: 'assets/bullet_homing.png',
    bullet_enemy: 'assets/bullet_enemy.png',
    heart: 'assets/heart.png',
    bomb_icon: 'assets/bomb.png',
    background: 'assets/bg.mp4'   // необязательно
};

class AssetLoader {
    constructor() {
        this.images = {};
        this.total = Object.keys(ASSETS).length;
        this.loaded = 0;
    }

    loadAll() {
        return new Promise((resolve, reject) => {
            if (this.total === 0) return resolve();
            for (let key in ASSETS) {
                const img = new Image();
                img.onload = () => {
                    this.loaded++;
                    this.updateProgress();
                    if (this.loaded === this.total) resolve();
                };
                img.onerror = () => {
                    // Заглушка: пустая картинка (чтобы не крашилось)
                    console.warn(`Не удалось загрузить ${ASSETS[key]}`);
                    this.loaded++;
                    this.updateProgress();
                    if (this.loaded === this.total) resolve();
                };
                img.src = ASSETS[key];
                this.images[key] = img;
            }
        });
    }

    updateProgress() {
        const bar = document.querySelector('#loadingBar');
        if (bar) bar.style.width = `${(this.loaded / this.total) * 100}%`;
        const text = document.querySelector('#loadingText');
        if (text) text.textContent = `Загрузка: ${this.loaded}/${this.total}`;
    }

    get(key) {
        return this.images[key];
    }
}

/* ==============================
   ИГРОВЫЕ КЛАССЫ (переписаны под спрайты)
   ============================== */
class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 24;   // размеры спрайта для подгонки
        this.height = 24;
        this.lives = 3;
        this.bombs = 3;
        this.score = 0;
        this.invulnerable = false;
        this.invulnerableTimer = 0;
        this.shootCooldown = 0;
    }

    update(targetX, targetY) {
        this.x = targetX;
        this.y = targetY;
        this.x = Math.max(this.width / 2, Math.min(400 - this.width / 2, this.x));
        this.y = Math.max(this.height / 2, Math.min(600 - this.height / 2, this.y));
        if (this.invulnerable) {
            this.invulnerableTimer--;
            if (this.invulnerableTimer <= 0) this.invulnerable = false;
        }
        if (this.shootCooldown > 0) this.shootCooldown--;
    }

    draw(ctx, assets) {
        ctx.save();
        if (!this.invulnerable || Math.floor(Date.now() / 100) % 2) {
            const img = assets.get('player');
            if (img && img.complete && img.naturalWidth > 0) {
                ctx.drawImage(img, this.x - this.width/2, this.y - this.height/2, this.width, this.height);
            } else {
                // Заглушка
                ctx.fillStyle = '#00ffcc';
                ctx.shadowBlur = 12;
                ctx.shadowColor = '#00ffcc';
                ctx.beginPath();
                ctx.moveTo(this.x, this.y - 12);
                ctx.lineTo(this.x - 8, this.y + 8);
                ctx.lineTo(this.x + 8, this.y + 8);
                ctx.closePath();
                ctx.fill();
            }
        }

        // Хитбокс (точка)
        ctx.fillStyle = '#ffffff';
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#ff0000';
        ctx.beginPath();
        ctx.arc(this.x, this.y, 3, 0, 2 * Math.PI);
        ctx.fill();
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 1.5;
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
        this.radius = isEnemy ? 5 : 4;   // для коллизий
        this.isEnemy = isEnemy;
        this.damage = 1;
    }

    update() {
        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed;
    }

    draw(ctx, assets) {
        ctx.save();
        const key = this.isEnemy ? 'bullet_enemy' : (this instanceof HomingBullet ? 'bullet_homing' : 'bullet_player');
        const img = assets.get(key);
        if (img && img.complete && img.naturalWidth > 0) {
            ctx.drawImage(img, this.x - img.width/2, this.y - img.height/2);
        } else {
            // Заглушка
            ctx.fillStyle = this.isEnemy ? '#ff4444' : '#ffee00';
            ctx.shadowBlur = 8;
            ctx.shadowColor = ctx.fillStyle;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fill();
        }
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
    constructor(x, y, pattern, enemyType = 'straight') {
        this.x = x;
        this.y = y;
        this.pattern = pattern;
        this.type = enemyType;   // ключ для спрайта
        this.timer = 0;
        this.health = pattern.health || 1;
        this.maxHealth = this.health;
        this.points = pattern.points || 100;
        this.width = 28;   // под размер спрайта врага
        this.height = 28;
    }

    update() {
        this.timer++;
        if (this.pattern.update) this.pattern.update(this);
    }

    draw(ctx, assets) {
        ctx.save();
        // Выбираем спрайт по типу врага
        const imgKey = 'enemy_' + this.type;
        const img = assets.get(imgKey) || assets.get('enemy_straight');
        if (img && img.complete && img.naturalWidth > 0) {
            ctx.drawImage(img, this.x - this.width/2, this.y - this.height/2, this.width, this.height);
        } else {
            // Заглушка
            ctx.fillStyle = '#ff3366';
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#ff3366';
            ctx.beginPath();
            ctx.arc(this.x, this.y, 14, 0, Math.PI * 2);
            ctx.fill();
        }
        // Полоска здоровья
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

/* ==============================
   ГЛАВНЫЙ КЛАСС ИГРЫ
   ============================== */
class Game {
    constructor(assets) {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = 400;
        this.canvas.height = 600;
        this.assets = assets;

        this.isMobile = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
        this.showCorrectControls();

        this.sound = new SoundManager();
        this.gameStarted = false;

        this.player = new Player(200, 500);
        this.bullets = [];
        this.enemies = [];
        this.mouseX = 200;
        this.mouseY = 500;
        this.gameRunning = false;
        this.gameOver = false;
        this.wave = 1;
        this.waveSpawnQueue = [];
        this.spawnTimer = 0;

        this.laserMode = false;
        this.laserKeyDown = false;
        this.twoFingers = false;

        this.touchStartTime = 0;
        this.touchStartPos = null;
        this.touchStartFingers = 0;

        this.countdown = 0;
        this.countdownTimer = 0;
        this.countdownText = '';

        // Фиксированный шаг времени
        this.lastTime = 0;
        this.accumulator = 0;
        this.fixedDelta = 1000 / 60;

        this.defineWavePatterns();
        this.setupEventListeners();

        // Показываем стартовый экран после загрузки (скрываем загрузочный экран)
        document.getElementById('loadingScreen').classList.add('hidden');
        document.getElementById('startScreen').classList.remove('hidden');

        requestAnimationFrame((ts) => this.gameLoop(ts));
    }

    defineWavePatterns() {
        this.patterns = {
            straightShooter: {
                health: 3, points: 100, enemyType: 'straight',
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
                health: 4, points: 150, enemyType: 'sine',
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
                health: 6, points: 200, enemyType: 'spiral',
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
                health: 5, points: 180, enemyType: 'sweeper',
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
            },
            miniboss: {
                health: 20, points: 500, enemyType: 'boss',
                update: (enemy) => {
                    enemy.y += 0.8;
                    enemy.x += Math.sin(enemy.timer * 0.02) * 2;
                    if (enemy.timer % 30 === 0) {
                        for (let i = 0; i < 12; i++) {
                            const angle = (Math.PI * 2 / 12) * i + enemy.timer * 0.1;
                            this.bullets.push(new Bullet(enemy.x, enemy.y, angle, 2.2, true));
                        }
                        this.sound.enemyShoot();
                    }
                    if (enemy.timer % 90 === 0) {
                        const base = Math.atan2(this.player.y - enemy.y, this.player.x - enemy.x);
                        for (let i = -2; i <= 2; i++) {
                            this.bullets.push(new Bullet(enemy.x, enemy.y, base + i * 0.2, 3, true));
                        }
                        this.sound.enemyShoot();
                    }
                }
            }
        };
    }

    buildWave(waveNumber) {
        const queue = [];
        if (waveNumber <= 2) {
            for (let i = 0; i < 4; i++) queue.push({ type: 'straightShooter', x: 80 + i * 80, y: -30, delay: i * 30 });
        } else if (waveNumber <= 4) {
            for (let i = 0; i < 3; i++) queue.push({ type: 'straightShooter', x: 60 + i * 120, y: -30, delay: i * 25 });
            queue.push({ type: 'sineFan', x: 200, y: -50, delay: 60 });
            queue.push({ type: 'sineFan', x: 100, y: -70, delay: 90 });
        } else if (waveNumber <= 6) {
            for (let i = 0; i < 2; i++) queue.push({ type: 'straightShooter', x: 150 + i * 100, y: -30, delay: i * 30 });
            queue.push({ type: 'spiral', x: 200, y: -40, delay: 50 });
            queue.push({ type: 'sineFan', x: 300, y: -60, delay: 80 });
        } else if (waveNumber <= 8) {
            queue.push({ type: 'sideSweeper', x: -20, y: 100, delay: 20 });
            queue.push({ type: 'sideSweeper', x: 420, y: 150, delay: 50 });
            queue.push({ type: 'spiral', x: 200, y: -40, delay: 80 });
        } else if (waveNumber === 9) {
            queue.push({ type: 'spiral', x: 120, y: -40, delay: 0 });
            queue.push({ type: 'spiral', x: 280, y: -40, delay: 40 });
            queue.push({ type: 'sideSweeper', x: -20, y: 200, delay: 60 });
        } else if (waveNumber === 10) {
            queue.push({ type: 'miniboss', x: 200, y: -50, delay: 30 });
        } else {
            const types = ['straightShooter', 'sineFan', 'spiral', 'sideSweeper'];
            const count = 3 + Math.floor(waveNumber / 2);
            for (let i = 0; i < count; i++) {
                const type = types[Math.floor(Math.random() * types.length)];
                queue.push({ type, x: 50 + Math.random() * 300, y: -30 - Math.random() * 40, delay: i * 20 });
            }
            if (waveNumber % 5 === 0) queue.push({ type: 'miniboss', x: 200, y: -50, delay: 80 });
        }
        return queue;
    }

    nextWave() {
        this.wave++;
        this.waveSpawnQueue = this.buildWave(this.wave);
        this.spawnTimer = 0;
        this.player.score += 500 * (this.wave - 1);
        if (this.wave > 1) this.sound.waveStart();
    }

    spawnFromQueue() {
        if (this.waveSpawnQueue.length === 0) {
            if (this.enemies.length === 0) this.nextWave();
            return;
        }
        while (this.waveSpawnQueue.length > 0 && this.spawnTimer >= this.waveSpawnQueue[0].delay) {
            const spec = this.waveSpawnQueue.shift();
            const pattern = this.patterns[spec.type];
            if (pattern) {
                const enemyType = pattern.enemyType || 'straight';
                this.enemies.push(new Enemy(spec.x, spec.y, pattern, enemyType));
            }
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

        // Touch-обработчики (аналогичны предыдущим версиям)
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (!this.gameRunning || this.gameOver) return;
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
            if (!this.gameRunning || this.gameOver) return;
            this.twoFingers = e.touches.length >= 2;
            this.updateMobilePosition(e.touches);
        }, { passive: false });

        this.canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            if (!this.gameRunning || this.gameOver) {
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
            if (bgm && bgm.paused) bgm.play().catch(e => console.warn('Музыка не запустилась:', e));
            this.startCountdown();
        });
        document.getElementById('restartButton').addEventListener('click', () => {
            this.startCountdown();
        });

        // Автопауза музыки при скрытии (IntersectionObserver)
        const observer = new IntersectionObserver((entries) => {
            const bgm = document.getElementById('bgMusic');
            if (!bgm) return;
            if (entries[0].isIntersecting) {
                if (this.gameStarted && bgm.paused) bgm.play().catch(e => {});
            } else {
                bgm.pause();
            }
        }, { threshold: 0 });
        observer.observe(this.canvas);

        // Сообщение от Тильды
        window.addEventListener('message', (event) => {
            if (event.data === 'pauseMusic') {
                const bgm = document.getElementById('bgMusic');
                if (bgm) bgm.pause();
            }
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
        this.player = new Player(200, 500);
        this.bullets = [];
        this.enemies = [];
        this.wave = 0;
        this.nextWave();
        this.laserMode = false;
        this.laserKeyDown = false;
        this.twoFingers = false;
        this.gameRunning = false;
        this.gameOver = false;
        this.gameStarted = true;
        this.countdown = 3;
        this.countdownTimer = 60;
        this.countdownText = '3';
    }

    useBomb() {
        if (this.player.useBomb()) {
            this.bullets = this.bullets.filter(b => !b.isEnemy);
            this.enemies.forEach(enemy => {
                if (enemy.hit(3)) this.player.score += enemy.points * 2;
            });
            this.enemies = this.enemies.filter(e => e.health > 0);
            this.sound.bomb();
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

        if (!this.gameRunning || this.gameOver) return;

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

        this.bullets.forEach(b => b.update());
        this.bullets = this.bullets.filter(b => !b.isOffScreen());

        this.enemies.forEach(e => e.update());
        this.enemies = this.enemies.filter(e => e.y < 620 + 20);
        this.spawnFromQueue();
        this.checkCollisions();

        if (this.enemies.length === 0 && this.waveSpawnQueue.length === 0) this.nextWave();
    }

    checkCollisions() {
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            if (!bullet.isEnemy) {
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

        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            const dx = enemy.x - this.player.x;
            const dy = enemy.y - this.player.y;
            if (Math.sqrt(dx * dx + dy * dy) < 20) {
                this.enemies.splice(i, 1);
                if (this.player.hit() && this.player.lives <= 0) this.endGame();
            }
        }
    }

    endGame() {
        this.gameRunning = false;
        this.gameOver = true;
        document.getElementById('finalScore').textContent = `Счёт: ${this.player.score}`;
        document.getElementById('gameOver').classList.remove('hidden');
        this.sound.playerDeath();
    }

    drawUI() {
        const heartImg = this.assets.get('heart');
        for (let i = 0; i < 3; i++) {
            const x = 20 + i * 30, y = 20;
            this.ctx.save();
            if (i < this.player.lives) {
                if (heartImg && heartImg.complete) {
                    this.ctx.drawImage(heartImg, x, y, 20, 20);
                } else {
                    this.ctx.fillStyle = '#ff3366';
                    this.ctx.shadowBlur = 8;
                    this.ctx.shadowColor = '#ff3366';
                    this.ctx.beginPath();
                    this.ctx.arc(x+10, y+10, 8, 0, Math.PI*2);
                    this.ctx.fill();
                }
            } else {
                this.ctx.globalAlpha = 0.3;
                if (heartImg && heartImg.complete) {
                    this.ctx.drawImage(heartImg, x, y, 20, 20);
                } else {
                    this.ctx.fillStyle = '#444';
                    this.ctx.beginPath();
                    this.ctx.arc(x+10, y+10, 8, 0, Math.PI*2);
                    this.ctx.fill();
                }
                this.ctx.globalAlpha = 1;
            }
            this.ctx.restore();
        }

        const bombImg = this.assets.get('bomb_icon');
        for (let i = 0; i < 3; i++) {
            const x = 160 + i * 40, y = 570;
            this.ctx.save();
            if (i < this.player.bombs) {
                if (bombImg && bombImg.complete) {
                    this.ctx.drawImage(bombImg, x, y, 28, 28);
                } else {
                    this.ctx.fillStyle = '#ffaa00';
                    this.ctx.shadowBlur = 8;
                    this.ctx.shadowColor = '#ffaa00';
                    this.ctx.beginPath();
                    this.ctx.arc(x+14, y+14, 10, 0, Math.PI*2);
                    this.ctx.fill();
                }
            } else {
                this.ctx.globalAlpha = 0.3;
                if (bombImg && bombImg.complete) {
                    this.ctx.drawImage(bombImg, x, y, 28, 28);
                } else {
                    this.ctx.fillStyle = '#555';
                    this.ctx.beginPath();
                    this.ctx.arc(x+14, y+14, 10, 0, Math.PI*2);
                    this.ctx.fill();
                }
                this.ctx.globalAlpha = 1;
            }
            this.ctx.restore();
        }

        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '14px Arial';
        this.ctx.textAlign = 'right';
        this.ctx.fillText(`Волна ${this.wave}`, 380, 20);
        this.ctx.textAlign = 'left';
    }

    draw() {
        // Фон
        const bgImg = this.assets.get('background');
        if (bgImg && bgImg.complete && bgImg.naturalWidth > 0) {
            this.ctx.drawImage(bgImg, 0, 0, 400, 600);
        } else {
            this.ctx.fillStyle = '#0a0a1a';
            this.ctx.fillRect(0, 0, 400, 600);
            this.ctx.fillStyle = '#ffffff';
            for (let i = 0; i < 30; i++) {
                const sx = (i * 47 + 13) % 400, sy = (i * 83 + 7) % 600;
                this.ctx.fillRect(sx, sy, 1.5, 1.5);
            }
        }

        this.enemies.forEach(e => e.draw(this.ctx, this.assets));
        this.bullets.forEach(b => b.draw(this.ctx, this.assets));
        this.player.draw(this.ctx, this.assets);
        this.drawUI();

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
        requestAnimationFrame((ts) => this.gameLoop(ts));
    }
}

/* ==============================
   ТОЧКА ВХОДА (загрузка ассетов)
   ============================== */
window.addEventListener('load', () => {
    const loader = new AssetLoader();
    loader.loadAll().then(() => {
        // Загружено – создаём игру, скроется loadingScreen внутри конструктора
        new Game(loader);
    });
});
