class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 16;
        this.height = 16;
        this.speed = 10;               // Увеличили для быстрого прилипания к курсору
        this.lives = 3;
        this.bombs = 3;
        this.score = 0;
        this.invulnerable = false;
        this.invulnerableTimer = 0;
        this.shootCooldown = 0;
    }

    update(mouseX, mouseY) {
        const dx = mouseX - this.x;
        const dy = mouseY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist > 1) {
            const step = Math.min(this.speed, dist);
            this.x += (dx / dist) * step;
            this.y += (dy / dist) * step;
        }

        this.x = Math.max(this.width/2, Math.min(400 - this.width/2, this.x));
        this.y = Math.max(this.height/2, Math.min(600 - this.height/2, this.y));

        if (this.invulnerable) {
            this.invulnerableTimer--;
            if (this.invulnerableTimer <= 0) this.invulnerable = false;
        }

        if (this.shootCooldown > 0) this.shootCooldown--;
    }

    draw(ctx) {
        ctx.save();
        if (!this.invulnerable || Math.floor(Date.now() / 100) % 2) {
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
        
        // Состояния отсчёта
        this.gameRunning = false;        // игра начнётся после отсчёта
        this.gameOver = false;
        this.countdownActive = true;
        this.countdown = 3;
        this.showGo = false;
        
        this.wave = 1;
        this.waveTimer = 0;
        this.enemiesSpawned = 0;
        
        this.touchActive = false;
        this.touchStartPos = { x: 0, y: 0 };
        
        this.setupEventListeners();
        this.startCountdown();
        this.gameLoop();
    }

    setupEventListeners() {
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const scaleX = this.canvas.width / rect.width;
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
            if (this.isInBombArea(clickX, clickY)) {
                this.useBomb();
            }
        });

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
            this.restartGame();
        });
    }

    isInBombArea(x, y) {
        return (x > 130 && x < 270 && y > 555 && y < 600);
    }

    startCountdown() {
        this.countdown = 3;
        this.countdownActive = true;
        this.gameRunning = false;
        this.showGo = false;

        const interval = setInterval(() => {
            if (this.countdown > 1) {
                this.countdown--;
            } else {
                clearInterval(interval);
                this.countdown = 0;
                this.showGo = true;
                setTimeout(() => {
                    this.showGo = false;
                    this.gameRunning = true;
                    this.countdownActive = false;
                }, 600);
            }
        }, 800);
    }

    restartGame() {
        // Полный сброс и новый отсчёт
        this.player = new Player(200, 500);
        this.bullets = [];
        this.enemies = [];
        this.wave = 1;
        this.enemiesSpawned = 0;
        this.waveTimer = 0;
        this.gameOver = false;
        document.getElementById('gameOver').classList.add('hidden');
        this.startCountdown();
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
            this.player.shootCooldown = 6;
        }

        this.player.update(this.mouseX, this.mouseY);
        this.bullets.forEach(b => b.update());
        this.bullets = this.bullets.filter(b => !b.isOffScreen());

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

        if (this.enemies.length === 0 && this.enemiesSpawned >= this.wave * 5) {
            this.wave++;
            this.enemiesSpawned = 0;
            this.waveTimer = 0;
            this.player.score += 1000 * (this.wave - 1);
        }
    }

    checkCollisions() {
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
            this.ctx.beginPath();
            this.ctx.arc(x - 5, y - 4, 4, Math.PI, 0, false);
            this.ctx.arc(x + 5, y - 4, 4, Math.PI, 0, false);
            this.ctx.moveTo(x - 9, y - 2);
            this.ctx.lineTo(x, y + 8);
            this.ctx.lineTo(x + 9, y - 2);
            this.ctx.fill();
            this.ctx.restore();
        }

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
            this.ctx.beginPath();
            this.ctx.arc(x, bombY, 8, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.stroke();
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
                this.ctx.arc(x + 4, bombY - 16, 3, 0, Math.PI*2);
                this.ctx.fill();
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
        this.ctx.fillStyle = '#0a0a1a';
        this.ctx.fillRect(0, 0, 400, 600);
        
        // Звёзды
        this.ctx.fillStyle = '#ffffff';
        for (let i = 0; i < 30; i++) {
            const sx = (i * 47 + 13) % 400;
            const sy = (i * 83 + 7) % 600;
            this.ctx.fillRect(sx, sy, 1.5, 1.5);
        }

        // Отрисовка объектов
        this.enemies.forEach(e => e.draw(this.ctx));
        this.bullets.forEach(b => b.draw(this.ctx));
        this.player.draw(this.ctx);
        this.drawUI();

        // Обратный отсчёт
        if (this.countdownActive) {
            this.ctx.save();
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
            this.ctx.fillRect(0, 0, 400, 600);
            this.ctx.font = 'bold 72px Arial';
            this.ctx.fillStyle = '#ffffff';
            this.ctx.textAlign = 'center';
            
            if (this.countdown > 0) {
                this.ctx.fillText(this.countdown, 200, 330);
            } else if (this.showGo) {
                this.ctx.fillStyle = '#00ffcc';
                this.ctx.fillText('GO!', 200, 330);
            }
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
