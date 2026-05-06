class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 16;
        this.height = 16;
        this.speed = 6;
        this.lives = 3;
        this.bombs = 3;
        this.score = 0;
        this.invulnerable = false;
        this.invulnerableTimer = 0;
        this.shootCooldown = 0;
    }

    update(mouseX, mouseY) {
        // Следуем за мышью (плавное движение)
        const dx = mouseX - this.x;
        const dy = mouseY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist > 1) {
            const step = Math.min(this.speed, dist);
            this.x += (dx / dist) * step;
            this.y += (dy / dist) * step;
        }

        // Границы канваса
        this.x = Math.max(this.width/2, Math.min(400 - this.width/2, this.x));
        this.y = Math.max(this.height/2, Math.min(600 - this.height/2, this.y));

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
            // Кораблик
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
        ctx.restore();
    }

    hit() {
        if (!this.invulnerable) {
            this.lives--;
            this.invulnerable = true;
            this.invulnerableTimer = 90; // 1.5 сек при 60 fps
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
        // Вражеский объект
        ctx.fillStyle = '#ff3366';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#ff3366';
        ctx.beginPath();
        ctx.arc(this.x, this.y, 14, 0, Math.PI * 2);
        ctx.fill();
        
        // Полоска здоровья
        if (this.health < this.maxHealth) {
            const barWidth = 28;
            const barHeight = 3;
            ctx.fillStyle = '#ff0000';
            ctx.fillRect(this.x - barWidth/2, this.y - 22, barWidth, barHeight);
            ctx.fillStyle = '#00ff00';
            ctx.fillRect(this.x - barWidth/2, this.y - 22, barWidth * (this.health / this.maxHealth), barHeight);
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
        
        this.player = new Player(200, 500);
        this.bullets = [];
        this.enemies = [];
        this.mouseX = 200;
        this.mouseY = 500;
        this.gameRunning = true;
        this.gameOver = false;
        this.wave = 1;
        this.waveTimer = 0;
        this.enemiesSpawned = 0;
        
        // Для мобильного управления
        this.touchActive = false;
        this.touchStartPos = { x: 0, y: 0 };
        
        this.setupEventListeners();
        this.gameLoop();
    }

    setupEventListeners() {
        // Мышь
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const scaleX = this.canvas.width / rect.width;   // корректировка масштаба
            const scaleY = this.canvas.height / rect.height;
            this.mouseX = (e.clientX - rect.left) * scaleX;
            this.mouseY = (e.clientY - rect.top) * scaleY;
        });

        this.canvas.addEventListener('click', (e) => {
            if (!this.gameRunning || this.gameOver) return;
            const rect = this.canvas.getBoundingClientRect();
            const scaleX = this.canvas.width / rect.width;
            const scaleY = this.canvas.height / rect.height;
            const clickX = (e.clientX - rect.left) * scaleX;
            const clickY = (e.clientY - rect.top) * scaleY;
            
            // Проверяем зону бомб (низ по центру)
            if (this.isInBombArea(clickX, clickY)) {
                this.useBomb();
            }
        });

        // Мобильные касания
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (!this.gameRunning || this.gameOver) return;
            const touch = e.touches[0];
            const rect = this.canvas.getBoundingClientRect();
            const scaleX = this.canvas.width / rect.width;
            const scaleY = this.canvas.height / rect.height;
            this.touchStartPos.x = (touch.clientX - rect.left) * scaleX;
            this.touchStartPos.y = (touch.clientY - rect.top) * scaleY;
            this.touchActive = true;
            
            // Сразу двигаем игрока к точке касания
            this.mouseX = this.touchStartPos.x;
            this.mouseY = this.touchStartPos.y;
        }, { passive: false });

        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (!this.gameRunning || this.gameOver || !this.touchActive) return;
            const touch = e.touches[0];
            const rect = this.canvas.getBoundingClientRect();
            const scaleX = this.canvas.width / rect.width;
            const scaleY = this.canvas.height / rect.height;
            this.mouseX = (touch.clientX - rect.left) * scaleX;
            this.mouseY = (touch.clientY - rect.top) * scaleY;
        }, { passive: false });

        this.canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            if (!this.gameRunning || this.gameOver) {
                this.touchActive = false;
                return;
            }
            
            const rect = this.canvas.getBoundingClientRect();
            // Если палец почти не двигался, считаем тапом (для бомбы)
            const dx = this.mouseX - this.touchStartPos.x;
            const dy = this.mouseY - this.touchStartPos.y;
            if (Math.abs(dx) < 10 && Math.abs(dy) < 10) {
                if (this.isInBombArea(this.touchStartPos.x, this.touchStartPos.y)) {
                    this.useBomb();
                }
            }
            this.touchActive = false;
        });

        document.getElementById('restartButton').addEventListener('click', () => {
            this.startGame();
        });
    }

    isInBombArea(x, y) {
        // Бомбы рисуются внизу по центру: три иконки между x от 140 до 260, y от 565 до 590
        return (x > 130 && x < 270 && y > 555 && y < 600);
    }

    startGame() {
        this.player = new Player(200, 500);
        this.bullets = [];
        this.enemies = [];
        this.wave = 1;
        this.enemiesSpawned = 0;
        this.waveTimer = 0;
        this.gameRunning = true;
        this.gameOver = false;
        document.getElementById('gameOver').classList.add('hidden');
    }

    useBomb() {
        if (this.player.useBomb()) {
            // Уничтожаем вражеские пули
            this.bullets = this.bullets.filter(b => !b.isEnemy);
            // Наносим урон всем врагам
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
            {
                health: 1,
                points: 100,
                update: (enemy) => { enemy.y += 2.5; }
            },
            {
                health: 3,
                points: 300,
                update: (enemy) => {
                    enemy.y += 1.2;
                    enemy.x += Math.sin(enemy.timer * 0.04) * 4;
                    if (enemy.timer % 25 === 0) {
                        for (let i = 0; i < 8; i++) {
                            const angle = (Math.PI * 2 / 8) * i + enemy.timer * 0.08;
                            game.bullets.push(new Bullet(enemy.x, enemy.y, angle, 4.5, true));
                        }
                    }
                }
            },
            {
                health: 2,
                points: 200,
                update: (enemy) => {
                    enemy.y += 2;
                    if (enemy.timer % 40 === 0) {
                        const angle = Math.atan2(game.player.y - enemy.y, game.player.x - enemy.x);
                        game.bullets.push(new Bullet(enemy.x, enemy.y, angle, 5, true));
                    }
                }
            }
        ];
        
        const pattern = patterns[Math.floor(Math.random() * patterns.length)];
        this.enemies.push(new Enemy(x, y, pattern));
    }

    update() {
        if (!this.gameRunning || this.gameOver) return;

        // Автострельба
        if (this.player.shootCooldown <= 0) {
            this.bullets.push(new Bullet(this.player.x, this.player.y - 15, -Math.PI/2, 9, false));
            this.player.shootCooldown = 6; // ~10 выстрелов в секунду
        }

        this.player.update(this.mouseX, this.mouseY);
        
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
                    if (Math.sqrt(dx*dx + dy*dy) < 18) {
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

        // Вражеские пули → игрок
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            if (bullet.isEnemy) {
                const dx = bullet.x - this.player.x;
                const dy = bullet.y - this.player.y;
                if (Math.sqrt(dx*dx + dy*dy) < 14) {
                    this.bullets.splice(i, 1);
                    if (this.player.hit() && this.player.lives <= 0) {
                        this.endGame();
                    }
                }
            }
        }

        // Враги → игрок (столкновение тел)
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            const dx = enemy.x - this.player.x;
            const dy = enemy.y - this.player.y;
            if (Math.sqrt(dx*dx + dy*dy) < 25) {
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
        // Жизни (левый верх)
        for (let i = 0; i < 3; i++) {
            const x = 20 + i * 22;
            const y = 20;
            this.ctx.save();
            if (i < this.player.lives) {
                this.ctx.fillStyle = '#ff3366';
                this.ctx.shadowBlur = 8;
                this.ctx.shadowColor = '#ff3366';
            } else {
                this.ctx.fillStyle = '#444';
                this.ctx.shadowBlur = 0;
            }
            // Сердечко
            this.ctx.beginPath();
            this.ctx.arc(x - 5, y - 4, 4, Math.PI, 0, false);
            this.ctx.arc(x + 5, y - 4, 4, Math.PI, 0, false);
            this.ctx.moveTo(x - 9, y - 2);
            this.ctx.lineTo(x, y + 8);
            this.ctx.lineTo(x + 9, y - 2);
            this.ctx.fill();
            this.ctx.restore();
        }

        // Бомбы (низ по центру)
        const bombY = 580;
        for (let i = 0; i < 3; i++) {
            const x = 160 + i * 40;
            this.ctx.save();
            if (i < this.player.bombs) {
                this.ctx.fillStyle = '#222';
                this.ctx.strokeStyle = '#ffaa00';
                this.ctx.shadowBlur = 8;
                this.ctx.shadowColor = '#ffaa00';
            } else {
                this.ctx.fillStyle = '#333';
                this.ctx.strokeStyle = '#555';
                this.ctx.shadowBlur = 0;
            }
            // Корпус бомбы
            this.ctx.beginPath();
            this.ctx.arc(x, bombY, 8, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.stroke();
            // Фитиль
            this.ctx.beginPath();
            this.ctx.moveTo(x, bombY - 8);
            this.ctx.lineTo(x + 4, bombY - 14);
            this.ctx.strokeStyle = '#ffaa00';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
            // Искра
            if (i < this.player.bombs) {
                this.ctx.fillStyle = '#ff4400';
                this.ctx.shadowBlur = 6;
                this.ctx.shadowColor = '#ff4400';
                this.ctx.beginPath();
                this.ctx.arc(x + 4, bombY - 16, 3, 0, Math.PI*2);
                this.ctx.fill();
            }
            this.ctx.restore();
        }

        // Номер волны
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '14px Arial';
        this.ctx.textAlign = 'right';
        this.ctx.fillText(`Волна ${this.wave}`, 380, 20);
        this.ctx.textAlign = 'left';
    }

    draw() {
        // Фон
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
    }

    gameLoop() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.gameLoop());
    }
}

const game = new Game();
