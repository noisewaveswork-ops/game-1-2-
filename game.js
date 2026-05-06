class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 20;
        this.height = 20;
        this.speed = 5;
        this.lives = 3;
        this.bombs = 3;
        this.score = 0;
        this.invulnerable = false;
        this.invulnerableTimer = 0;
        this.shooting = false;
        this.shootCooldown = 0;
    }

    update(keys) {
        // Движение
        if (keys.ArrowLeft || keys.KeyA) this.x -= this.speed;
        if (keys.ArrowRight || keys.KeyD) this.x += this.speed;
        if (keys.ArrowUp || keys.KeyW) this.y -= this.speed;
        if (keys.ArrowDown || keys.KeyS) this.y += this.speed;

        // Ограничение движения (ширина 400)
        this.x = Math.max(this.width/2, Math.min(400 - this.width/2, this.x));
        this.y = Math.max(this.height/2, Math.min(600 - this.height/2, this.y));

        // Неуязвимость после попадания
        if (this.invulnerable) {
            this.invulnerableTimer--;
            if (this.invulnerableTimer <= 0) {
                this.invulnerable = false;
            }
        }

        // Кулдаун стрельбы
        if (this.shootCooldown > 0) {
            this.shootCooldown--;
        }
    }

    draw(ctx) {
        ctx.save();
        
        // Мигание при неуязвимости
        if (!this.invulnerable || Math.floor(Date.now() / 100) % 2) {
            // Корпус корабля
            ctx.fillStyle = '#00ff00';
            ctx.beginPath();
            ctx.moveTo(this.x, this.y - 15);
            ctx.lineTo(this.x - 10, this.y + 10);
            ctx.lineTo(this.x + 10, this.y + 10);
            ctx.closePath();
            ctx.fill();

            // Свечение
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#00ff00';
            ctx.fillStyle = '#33ff33';
            ctx.beginPath();
            ctx.moveTo(this.x, this.y - 13);
            ctx.lineTo(this.x - 8, this.y + 8);
            ctx.lineTo(this.x + 8, this.y + 8);
            ctx.closePath();
            ctx.fill();
        }

        ctx.restore();
    }

    hit() {
        if (!this.invulnerable) {
            this.lives--;
            this.invulnerable = true;
            this.invulnerableTimer = 120; // 2 секунды при 60 FPS
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
        this.radius = isEnemy ? 5 : 4;
        this.isEnemy = isEnemy;
        this.color = isEnemy ? '#ff0000' : '#ffff00';
    }

    update() {
        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed;
    }

    draw(ctx) {
        ctx.save();
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    isOffScreen() {
        // Проверка для ширины 400
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
        if (this.pattern.update) {
            this.pattern.update(this);
        }
    }

    draw(ctx) {
        ctx.save();
        
        // Вражеский корабль
        ctx.fillStyle = '#ff0000';
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#ff0000';
        ctx.beginPath();
        ctx.arc(this.x, this.y, 15, 0, Math.PI * 2);
        ctx.fill();
        
        // Индикатор здоровья
        if (this.health < this.maxHealth) {
            ctx.fillStyle = '#ff0000';
            ctx.fillRect(this.x - 15, this.y - 25, 30, 4);
            ctx.fillStyle = '#00ff00';
            ctx.fillRect(this.x - 15, this.y - 25, 30 * (this.health / this.maxHealth), 4);
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
        // Размеры теперь из HTML, но дублируем для удобства
        this.canvas.width = 400;
        this.canvas.height = 600;
        
        this.player = new Player(200, 500);  // было 400,500
        this.bullets = [];
        this.enemies = [];
        this.keys = {};
        this.gameRunning = false;
        this.gameOver = false;
        this.wave = 0;
        this.waveTimer = 0;
        this.enemiesSpawned = 0;
        this.maxEnemiesPerWave = 10;
        
        this.setupEventListeners();
        this.gameLoop();
    }

    setupEventListeners() {
        document.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            
            if (e.code === 'KeyB') {
                this.useBomb();
            }
        });

        document.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });

        document.getElementById('startButton').addEventListener('click', () => {
            this.startGame();
        });

        document.getElementById('restartButton').addEventListener('click', () => {
            this.startGame();
        });
    }

    startGame() {
        this.player = new Player(200, 500);  // тоже сброс на центр X
        this.bullets = [];
        this.enemies = [];
        this.wave = 1;
        this.enemiesSpawned = 0;
        this.gameRunning = true;
        this.gameOver = false;
        
        document.getElementById('gameOver').classList.add('hidden');
        document.getElementById('startScreen').classList.add('hidden');
    }

    useBomb() {
        if (this.player.useBomb()) {
            // Очистка всех вражеских пуль
            this.bullets = this.bullets.filter(bullet => !bullet.isEnemy);
            
            // Урон всем врагам на экране
            this.enemies.forEach(enemy => {
                if (enemy.hit(2)) {
                    this.player.score += enemy.points * 2;
                }
            });
            
            this.enemies = this.enemies.filter(enemy => enemy.health > 0);
        }
    }

    spawnEnemy() {
        // X от 50 до 350 (для ширины 400)
        const x = Math.random() * 300 + 50;
        const y = -30;
        
        const patterns = [
            {
                health: 1,
                points: 100,
                update: (enemy) => {
                    enemy.y += 2;
                }
            },
            {
                health: 3,
                points: 300,
                update: (enemy) => {
                    enemy.y += 1;
                    enemy.x += Math.sin(enemy.timer * 0.05) * 3;
                    
                    // Стрельба спиралью
                    if (enemy.timer % 30 === 0) {
                        for (let i = 0; i < 8; i++) {
                            const angle = (Math.PI * 2 / 8) * i + enemy.timer * 0.1;
                            game.bullets.push(new Bullet(enemy.x, enemy.y, angle, 4, true));
                        }
                    }
                }
            }
        ];
        
        const pattern = patterns[Math.floor(Math.random() * patterns.length)];
        this.enemies.push(new Enemy(x, y, pattern));
    }

    update() {
        if (!this.gameRunning || this.gameOver) return;

        // Обновление игрока
        this.player.update(this.keys);

        // Стрельба игрока
        if (this.keys.Space) {
            if (this.player.shootCooldown <= 0) {
                this.bullets.push(new Bullet(this.player.x, this.player.y - 15, -Math.PI/2, 8, false));
                this.player.shootCooldown = 8;
            }
        }

        // Обновление пуль
        this.bullets.forEach(bullet => bullet.update());
        this.bullets = this.bullets.filter(bullet => !bullet.isOffScreen());

        // Обновление врагов
        this.enemies.forEach(enemy => enemy.update());

        // Спавн врагов
        if (this.enemiesSpawned < this.wave * 5) {
            this.waveTimer++;
            if (this.waveTimer > 60) {
                this.spawnEnemy();
                this.enemiesSpawned++;
                this.waveTimer = 0;
            }
        }

        // Проверка коллизий
        this.checkCollisions();

        // Проверка завершения волны
        if (this.enemies.length === 0 && this.enemiesSpawned >= this.wave * 5) {
            this.wave++;
            this.enemiesSpawned = 0;
            this.waveTimer = 0;
            this.player.score += 1000 * (this.wave - 1);
        }

        // Обновление UI
        document.getElementById('score').textContent = `Score: ${this.player.score}`;
        document.getElementById('lives').textContent = `Lives: ${this.player.lives}`;
        document.getElementById('bombs').textContent = `Bombs: ${this.player.bombs}`;
    }

    checkCollisions() {
        // Проверка коллизий пуль игрока с врагами
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            if (!this.bullets[i].isEnemy) {
                const bullet = this.bullets[i];
                
                for (let j = this.enemies.length - 1; j >= 0; j--) {
                    const enemy = this.enemies[j];
                    const dx = bullet.x - enemy.x;
                    const dy = bullet.y - enemy.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    if (distance < 20) {
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

        // Проверка коллизий вражеских пуль с игроком
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            if (bullet.isEnemy) {
                const dx = bullet.x - this.player.x;
                const dy = bullet.y - this.player.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < 15) {
                    this.bullets.splice(i, 1);
                    
                    if (this.player.hit()) {
                        if (this.player.lives <= 0) {
                            this.endGame();
                        }
                    }
                }
            }
        }

        // Проверка коллизий врагов с игроком
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            const dx = enemy.x - this.player.x;
            const dy = enemy.y - this.player.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < 25) {
                this.enemies.splice(i, 1);
                
                if (this.player.hit()) {
                    if (this.player.lives <= 0) {
                        this.endGame();
                    }
                }
            }
        }
    }

    endGame() {
        this.gameRunning = false;
        this.gameOver = true;
        
        document.getElementById('finalScore').textContent = `Финальный счёт: ${this.player.score}`;
        document.getElementById('gameOver').classList.remove('hidden');
    }

    draw() {
        // Очистка canvas (400x600)
        this.ctx.fillStyle = '#0a0a1a';
        this.ctx.fillRect(0, 0, 400, 600);

        // Звездный фон
        this.ctx.fillStyle = '#ffffff';
        for (let i = 0; i < 50; i++) {
            this.ctx.fillRect(
                Math.random() * 400,
                Math.random() * 600,
                2,
                2
            );
        }

        // Отрисовка врагов
        this.enemies.forEach(enemy => enemy.draw(this.ctx));

        // Отрисовка пуль
        this.bullets.forEach(bullet => bullet.draw(this.ctx));

        // Отрисовка игрока
        if (this.gameRunning || this.gameOver) {
            this.player.draw(this.ctx);
        }

        // Информация о волне
        if (this.gameRunning) {
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = '20px Arial';
            this.ctx.fillText(`Wave ${this.wave}`, 300, 30);  // было 700
        }
    }

    gameLoop() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.gameLoop());
    }
}

// Запуск игры
const game = new Game();
