class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 16;
        this.height = 16;
        this.speed = 6; // всё равно не используется при прямом следовании
        this.lives = 3;
        this.bombs = 3;
        this.score = 0;
        this.invulnerable = false;
        this.invulnerableTimer = 0;
        this.shootCooldown = 0;
    }

    update(targetX, targetY) {
        // Мгновенное прилипание к курсору/пальцу
        this.x = targetX;
        this.y = targetY;

        // Границы
        this.x = Math.max(this.width / 2, Math.min(400 - this.width / 2, this.x));
        this.y = Math.max(this.height / 2, Math.min(600 - this.height / 2, this.y));

        // Неуязвимость
        if (this.invulnerable) {
            this.invulnerableTimer--;
            if (this.invulnerableTimer <= 0) this.invulnerable = false;
        }

        // Кулдаун стрельбы
        if (this.shootCooldown > 0) this.shootCooldown--;
    }

    draw(ctx) {
        ctx.save();
        if (!this.invulnerable || Math.floor(Date.now() / 100) % 2) {
            // Корпус корабля
            ctx.fillStyle = '#00ffcc';
            ctx.shadowBlur = 12;
            ctx.shadowColor = '#00ffcc';
            ctx.beginPath();
            ctx.moveTo(this.x, this.y - 12);
            ctx.lineTo(this.x - 8, this.y + 8);
            ctx.lineTo(this.x + 8, this.y + 8);
            ctx.closePath();
            ctx.fill();
            // Кабина
            ctx.fillStyle = '#ffffff';
            ctx.shadowBlur = 0;
            ctx.beginPath();
            ctx.arc(this.x, this.y - 2, 3, 0, Math.PI * 2);
            ctx.fill();
        }

        // Хитбокс (яркая точка в центре)
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
        this.radius = isEnemy ? 5 : 3;
        this.isEnemy = isEnemy;
        this.color = isEnemy ? '#ff4444' : '#ffee00';
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

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = 400;
        this.canvas.height = 600;

        // Определяем, мобильное устройство или нет
        this.isMobile = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
        this.showCorrectControls();

        this.player = new Player(200, 500);
        this.bullets = [];
        this.enemies = [];
        this.mouseX = 200;
        this.mouseY = 500;
        this.gameRunning = false;
        this.gameOver = false;
        this.wave = 1;
        this.waveTimer = 0;
        this.enemiesSpawned = 0;

        // Состояние управления
        this.laserMode = false;       // true = два лазера
        this.laserKeyDown = false;    // зажата Z
        this.twoFingers = false;      // два пальца на экране
        this.bombUsed = false;

        // Обратный отсчёт
        this.countdown = 0;           // 0 = нет отсчёта
        this.countdownTimer = 0;
        this.countdownText = '';

        this.setupEventListeners();
        this.gameLoop();
    }

    showCorrectControls() {
        if (this.isMobile) {
            document.getElementById('desktopControls').classList.add('hidden');
            document.getElementById('mobileControls').classList.remove('hidden');
        } else {
            document.getElementById('desktopControls').classList.remove('hidden');
            document.getElementById('mobileControls').classList.add('hidden');
        }
    }

    setupEventListeners() {
        // Мышь
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const scaleX = this.canvas.width / rect.width;
            const scaleY = this.canvas.height / rect.height;
            this.mouseX = (e.clientX - rect.left) * scaleX;
            this.mouseY = (e.clientY - rect.top) * scaleY;
            // Для мыши прилипаем точно
            if (!this.isMobile) {
                this.player.update(this.mouseX, this.mouseY);
            }
        });

        // Клавиши Z и X (десктоп)
        window.addEventListener('keydown', (e) => {
            if (e.code === 'KeyZ') {
                this.laserKeyDown = true;
            }
            if (e.code === 'KeyX') {
                this.useBomb(); // однократно по нажатию
            }
        });
        window.addEventListener('keyup', (e) => {
            if (e.code === 'KeyZ') {
                this.laserKeyDown = false;
            }
        });

        // Мобильные касания
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (!this.gameRunning || this.gameOver) return;
            const touches = e.touches;
            // Определяем два пальца
            this.twoFingers = touches.length >= 2;

            // Если один палец, запоминаем для тапа (бомба)
            if (touches.length === 1) {
                this.touchStartTime = Date.now();
                this.touchStartPos = {
                    x: touches[0].clientX,
                    y: touches[0].clientY
                };
            }
            this.updateMobilePosition(e.touches);
        }, { passive: false });

        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (!this.gameRunning || this.gameOver) return;
            this.twoFingers = e.touches.length >= 2;
            this.updateMobilePosition(e.touches);
        }, { passive: false });

        this.canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            if (!this.gameRunning || this.gameOver) return;

            // Проверяем тап для бомбы (один палец, короткое нажатие)
            if (e.touches.length === 0 && this.touchStartPos) {
                const dt = Date.now() - this.touchStartTime;
                const dx = this.mouseX - this.touchStartPos.x * (this.canvas.width / this.canvas.getBoundingClientRect().width); // грубо
                const dy = this.mouseY - this.touchStartPos.y * (this.canvas.height / this.canvas.getBoundingClientRect().height);
                if (dt < 300 && Math.abs(dx) < 15 && Math.abs(dy) < 15) {
                    this.useBomb();
                }
                this.touchStartPos = null;
            }
            this.twoFingers = e.touches.length >= 2;
            if (e.touches.length === 0) {
                this.twoFingers = false;
            } else {
                this.updateMobilePosition(e.touches);
            }
        });

        // Кнопки старта и рестарта
        document.getElementById('startButton').addEventListener('click', () => {
            this.startCountdown();
        });
        document.getElementById('restartButton').addEventListener('click', () => {
            this.startCountdown();
        });
    }

    updateMobilePosition(touches) {
        if (touches.length === 0) return;
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        // Используем касание главного пальца (первого)
        const touch = touches[0];
        let tx = (touch.clientX - rect.left) * scaleX;
        let ty = (touch.clientY - rect.top) * scaleY;
        // Смещение вверх, чтобы корабль был над пальцем
        ty = Math.max(20, ty - 80); // не выше 20 пикселей от верха
        this.player.update(tx, ty);
        this.mouseX = tx;
        this.mouseY = ty;
    }

    startCountdown() {
        // Скрываем меню и game over
        document.getElementById('startScreen').classList.add('hidden');
        document.getElementById('gameOver').classList.add('hidden');
        // Сброс игры
        this.player = new Player(200, 500);
        this.bullets = [];
        this.enemies = [];
        this.wave = 1;
        this.enemiesSpawned = 0;
        this.waveTimer = 0;
        this.laserMode = false;
        this.laserKeyDown = false;
        this.twoFingers = false;
        this.gameRunning = false; // пока не стартуем
        this.gameOver = false;
        this.countdown = 3;
        this.countdownTimer = 60; // 1 секунда при 60 fps
        this.countdownText = '3';
    }

    useBomb() {
        if (this.player.useBomb()) {
            this.bullets = this.bullets.filter(b => !b.isEnemy);
            this.enemies.forEach(enemy => {
                if (enemy.hit(3)) {
                    this.player.score += enemy.points * 2;
                }
            });
            this.enemies = this.enemies.filter(e => e.health > 0);
        }
    }

    spawnEnemy() {
        const x = Math.random() * 340 + 30;
        const y = -30;
        const patterns = [
            { health: 1, points: 100, update: (enemy) => { enemy.y += 2.5; } },
            { health: 3, points: 300, update: (enemy) => {
                enemy.y += 1.2;
                enemy.x += Math.sin(enemy.timer * 0.04) * 4;
                if (enemy.timer % 25 === 0) {
                    for (let i = 0; i < 8; i++) {
                        const angle = (Math.PI * 2 / 8) * i + enemy.timer * 0.08;
                        game.bullets.push(new Bullet(enemy.x, enemy.y, angle, 4.5, true));
                    }
                }
            }},
            { health: 2, points: 200, update: (enemy) => {
                enemy.y += 2;
                if (enemy.timer % 40 === 0) {
                    const angle = Math.atan2(game.player.y - enemy.y, game.player.x - enemy.x);
                    game.bullets.push(new Bullet(enemy.x, enemy.y, angle, 5, true));
                }
            }}
        ];
        const pattern = patterns[Math.floor(Math.random() * patterns.length)];
        this.enemies.push(new Enemy(x, y, pattern));
    }

    update() {
        // Обратный отсчёт
        if (this.countdown > 0) {
            this.countdownTimer--;
            if (this.countdownTimer <= 0) {
                this.countdown--;
                if (this.countdown > 0) {
                    this.countdownText = this.countdown.toString();
                    this.countdownTimer = 60;
                } else {
                    this.countdownText = '';
                    this.gameRunning = true; // старт игры
                }
            }
            return;
        }

        if (!this.gameRunning || this.gameOver) return;

        // Режим стрельбы: лазеры если зажат Z (десктоп) или два пальца (мобильный)
        this.laserMode = this.laserKeyDown || this.twoFingers;

        // Автострельба
        if (this.player.shootCooldown <= 0) {
            if (this.laserMode) {
                // Два лазера под углами -35° и +35° от вертикали (вверх = -PI/2)
                const baseAngle = -Math.PI / 2;
                const spread = 35 * Math.PI / 180;
                this.bullets.push(new Bullet(this.player.x, this.player.y - 5, baseAngle - spread, 9, false));
                this.bullets.push(new Bullet(this.player.x, this.player.y - 5, baseAngle + spread, 9, false));
                this.player.shootCooldown = 10; // чуть медленнее, т.к. два выстрела
            } else {
                // Обычный одиночный
                this.bullets.push(new Bullet(this.player.x, this.player.y - 15, -Math.PI / 2, 9, false));
                this.player.shootCooldown = 6;
            }
        }

        // Движение игрока (для мыши уже обновляется в mousemove, но на мобильных тоже обновляется постоянно)
        // На десктопе вызываем update здесь для плавности
        if (!this.isMobile) {
            this.player.update(this.mouseX, this.mouseY);
        } // на мобильных update вызывается в touch-обработчиках

        // Обновление пуль
        this.bullets.forEach(b => b.update());
        this.bullets = this.bullets.filter(b => !b.isOffScreen());

        // Обновление врагов и спавн
        if (this.enemiesSpawned < this.wave * 5) {
            this.waveTimer++;
            if (this.waveTimer > 50) {
                this.spawnEnemy();
                this.enemiesSpawned++;
                this.waveTimer = 0;
            }
        }
        this.enemies.forEach(e => e.update());
        this.checkCollisions();

        // Новая волна
        if (this.enemies.length === 0 && this.enemiesSpawned >= this.wave * 5) {
            this.wave++;
            this.enemiesSpawned = 0;
            this.waveTimer = 0;
            this.player.score += 1000 * (this.wave - 1);
        }
    }

    checkCollisions() {
        // Пули игрока → враги
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            if (!bullet.isEnemy) {
                for (let j = this.enemies.length - 1; j >= 0; j--) {
                    const enemy = this.enemies[j];
                    const dx = bullet.x - enemy.x;
                    const dy = bullet.y - enemy.y;
                    if (Math.sqrt(dx * dx + dy * dy) < 18) {
                        this.bullets.splice(i, 1);
                        if (enemy.hit()) {
                            this.player.score += enemy.points;
                            this.enemies.splice(j, 1);
                        }
                        break;
                    }
                }
            }
        }

        // Вражеские пули → игрок (хитбокс - центр)
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            if (bullet.isEnemy) {
                const dx = bullet.x - this.player.x;
                const dy = bullet.y - this.player.y;
                if (Math.sqrt(dx * dx + dy * dy) < 6) { // маленький радиус хитбокса
                    this.bullets.splice(i, 1);
                    if (this.player.hit() && this.player.lives <= 0) {
                        this.endGame();
                    }
                }
            }
        }

        // Враги → игрок
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            const dx = enemy.x - this.player.x;
            const dy = enemy.y - this.player.y;
            if (Math.sqrt(dx * dx + dy * dy) < 20) {
                this.enemies.splice(i, 1);
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
    }

    drawUI() {
        // Жизни (сердечки)
        for (let i = 0; i < 3; i++) {
            const x = 20 + i * 22;
            const y = 20;
            this.ctx.save();
            this.ctx.fillStyle = i < this.player.lives ? '#ff3366' : '#444';
            this.ctx.shadowBlur = i < this.player.lives ? 8 : 0;
            this.ctx.shadowColor = '#ff3366';
            this.ctx.beginPath();
            this.ctx.arc(x - 5, y - 4, 4, Math.PI, 0, false);
            this.ctx.arc(x + 5, y - 4, 4, Math.PI, 0, false);
            this.ctx.moveTo(x - 9, y - 2);
            this.ctx.lineTo(x, y + 8);
            this.ctx.lineTo(x + 9, y - 2);
            this.ctx.fill();
            this.ctx.restore();
        }

        // Бомбы (иконки внизу по центру)
        const bombY = 580;
        for (let i = 0; i < 3; i++) {
            const x = 160 + i * 40;
            this.ctx.save();
            this.ctx.fillStyle = '#222';
            this.ctx.strokeStyle = i < this.player.bombs ? '#ffaa00' : '#555';
            this.ctx.shadowBlur = i < this.player.bombs ? 8 : 0;
            this.ctx.shadowColor = '#ffaa00';
            this.ctx.beginPath();
            this.ctx.arc(x, bombY, 8, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.stroke();
            // фитиль
            this.ctx.beginPath();
            this.ctx.moveTo(x, bombY - 8);
            this.ctx.lineTo(x + 4, bombY - 14);
            this.ctx.strokeStyle = '#ffaa00';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
            if (i < this.player.bombs) {
                this.ctx.fillStyle = '#ff4400';
                this.ctx.shadowBlur = 6;
                this.ctx.shadowColor = '#ff4400';
                this.ctx.beginPath();
                this.ctx.arc(x + 4, bombY - 16, 3, 0, 2 * Math.PI);
                this.ctx.fill();
            }
            this.ctx.restore();
        }

        // Волна
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '14px Arial';
        this.ctx.textAlign = 'right';
        this.ctx.fillText(`Волна ${this.wave}`, 380, 20);
        this.ctx.textAlign = 'left';
    }

    draw() {
        this.ctx.fillStyle = '#0a0a1a';
        this.ctx.fillRect(0, 0, 400, 600);

        // Звёзды
        this.ctx.fillStyle = '#ffffff';
        for (let i = 0; i < 30; i++) {
            const sx = (i * 47 + 13) % 400;
            const sy = (i * 83 + 7) % 600;
            this.ctx.fillRect(sx, sy, 1.5, 1.5);
        }

        this.enemies.forEach(e => e.draw(this.ctx));
        this.bullets.forEach(b => b.draw(this.ctx));
        this.player.draw(this.ctx);
        this.drawUI();

        // Обратный отсчёт на весь экран
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

    gameLoop() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.gameLoop());
    }
}

const game = new Game();
