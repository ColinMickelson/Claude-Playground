// ============================================
// BALLOON POP - GAME ENGINE
// ============================================

(function () {
    'use strict';

    // --- Canvas Setup ---
    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');

    // --- DOM References ---
    const hudScore = document.getElementById('hud-score');
    const hudLevel = document.getElementById('hud-level');
    const hudLives = document.getElementById('hud-lives');
    const hudTarget = document.getElementById('hud-target');
    const pauseBtn = document.getElementById('pause-btn');

    const modalStart = document.getElementById('modal-start');
    const modalPause = document.getElementById('modal-pause');
    const modalLevelComplete = document.getElementById('modal-level-complete');
    const modalGameOver = document.getElementById('modal-game-over');

    const btnStart = document.getElementById('btn-start');
    const btnResume = document.getElementById('btn-resume');
    const btnRestartPause = document.getElementById('btn-restart-pause');
    const btnNextLevel = document.getElementById('btn-next-level');
    const btnPlayAgain = document.getElementById('btn-play-again');
    const btnMainMenu = document.getElementById('btn-main-menu');

    // --- Game State ---
    const state = {
        score: 0,
        level: 1,
        lives: 3,
        totalPopped: 0,
        levelPopped: 0,
        levelClicks: 0,
        levelTarget: 10,
        bestCombo: 0,
        currentCombo: 0,
        comboTimer: 0,
        highScore: parseInt(localStorage.getItem('balloonPop_highScore') || '0', 10),
        paused: false,
        running: false,
        gameOver: false,
        lastTime: 0,
        spawnTimer: 0,
        balloons: [],
        particles: [],
        popEffects: [],
    };

    // --- Level Definitions ---
    const LEVELS = [
        { name: 'Sunny Meadow',   target: 8,  spawnRate: 1.2,  speed: 1,    colors: ['#ff6b6b','#ff8e53','#ffd93d','#6bcb77','#4d96ff'], bgGradient: ['#87CEEB','#e0f7e9'] },
        { name: 'Ocean Breeze',    target: 12, spawnRate: 1.0,  speed: 1.15, colors: ['#00b4d8','#0077b6','#48cae4','#90e0ef','#caf0f8'], bgGradient: ['#0077b6','#caf0f8'] },
        { name: 'Sunset Glow',     target: 15, spawnRate: 0.9,  speed: 1.3,  colors: ['#ff6b6b','#ff8e53','#ffd93d','#c9184a','#ff758f'], bgGradient: ['#ff758f','#ffd93d'] },
        { name: 'Enchanted Forest', target: 18, spawnRate: 0.8, speed: 1.4,  colors: ['#2d6a4f','#40916c','#52b788','#74c69d','#95d5b2'], bgGradient: ['#1b4332','#95d5b2'] },
        { name: 'Neon Night',      target: 22, spawnRate: 0.7,  speed: 1.5,  colors: ['#f72585','#7209b7','#3a0ca3','#4361ee','#4cc9f0'], bgGradient: ['#0d1b2a','#1b263b'] },
        { name: 'Candy Land',      target: 25, spawnRate: 0.65, speed: 1.6,  colors: ['#ff69b4','#ff1493','#ff6ec7','#da70d6','#ee82ee'], bgGradient: ['#ffe4f0','#ffd1e8'] },
        { name: 'Volcanic Core',   target: 28, spawnRate: 0.6,  speed: 1.7,  colors: ['#ff4500','#ff6347','#ff7f50','#dc143c','#b22222'], bgGradient: ['#1a0000','#8b0000'] },
        { name: 'Arctic Frost',    target: 30, spawnRate: 0.55, speed: 1.8,  colors: ['#e0f7fa','#b2ebf2','#80deea','#4dd0e1','#26c6da'], bgGradient: ['#e0f7fa','#ffffff'] },
        { name: 'Space Odyssey',   target: 35, spawnRate: 0.5,  speed: 2.0,  colors: ['#bb86fc','#03dac6','#cf6679','#ffffff','#ffde03'], bgGradient: ['#000000','#1a1a3e'] },
        { name: 'The Grand Finale', target: 40, spawnRate: 0.45, speed: 2.2, colors: ['#ffd700','#ff6b6b','#4ecdc4','#45b7d1','#f9ca24'], bgGradient: ['#2c3e50','#3498db'] },
    ];

    // --- Resize ---
    function resize() {
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    window.addEventListener('resize', resize);
    resize();

    // --- Utility ---
    function rand(min, max) {
        return Math.random() * (max - min) + min;
    }

    function getLevelConfig() {
        const idx = Math.min(state.level - 1, LEVELS.length - 1);
        return LEVELS[idx];
    }

    // --- Modal Helpers ---
    function showModal(modal) {
        modal.classList.add('active');
    }

    function hideModal(modal) {
        modal.classList.remove('active');
    }

    function hideAllModals() {
        [modalStart, modalPause, modalLevelComplete, modalGameOver].forEach(hideModal);
    }

    // --- Balloon Class ---
    function createBalloon() {
        const config = getLevelConfig();
        const w = canvas.getBoundingClientRect().width;
        const h = canvas.getBoundingClientRect().height;
        const radius = rand(22, 40);
        const isGolden = Math.random() < 0.08;

        return {
            x: rand(radius + 10, w - radius - 10),
            y: h + radius + rand(10, 60),
            radius: radius,
            color: isGolden ? '#ffd700' : config.colors[Math.floor(Math.random() * config.colors.length)],
            speed: rand(40, 70) * config.speed,
            wobbleSpeed: rand(1.5, 3),
            wobbleAmount: rand(8, 20),
            wobbleOffset: rand(0, Math.PI * 2),
            time: 0,
            popped: false,
            escaped: false,
            golden: isGolden,
            opacity: 1,
        };
    }

    // --- Particle System ---
    function spawnParticles(x, y, color, count) {
        for (let i = 0; i < count; i++) {
            state.particles.push({
                x: x,
                y: y,
                vx: rand(-120, 120),
                vy: rand(-160, 40),
                radius: rand(2, 5),
                color: color,
                life: 1,
                decay: rand(1.5, 3),
            });
        }
    }

    // --- Pop Score Effect ---
    function spawnPopEffect(x, y, points) {
        const el = document.createElement('div');
        el.className = 'pop-effect';
        el.textContent = '+' + points;
        el.style.left = x + 'px';
        el.style.top = y + 'px';
        document.getElementById('game-container').appendChild(el);
        setTimeout(function() {
            el.remove();
        }, 800);
    }

    // --- Input Handling ---
    function getInputPos(e) {
        const rect = canvas.getBoundingClientRect();
        if (e.touches && e.touches.length > 0) {
            return {
                x: e.touches[0].clientX - rect.left,
                y: e.touches[0].clientY - rect.top,
            };
        }
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        };
    }

    function handlePop(e) {
        if (!state.running || state.paused) return;
        e.preventDefault();

        const pos = getInputPos(e);
        state.levelClicks++;

        let popped = false;
        // Check from top (newest/front) to bottom
        for (let i = state.balloons.length - 1; i >= 0; i--) {
            const b = state.balloons[i];
            if (b.popped || b.escaped) continue;

            const dx = pos.x - b.x;
            const dy = pos.y - b.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist <= b.radius + 8) {
                b.popped = true;
                popped = true;

                const basePoints = Math.round(10 * (1 + (state.level - 1) * 0.2));
                const goldenMultiplier = b.golden ? 5 : 1;

                // Combo
                state.currentCombo++;
                state.comboTimer = 1.5;
                const comboMultiplier = Math.min(state.currentCombo, 5);
                state.bestCombo = Math.max(state.bestCombo, state.currentCombo);

                const points = basePoints * goldenMultiplier * comboMultiplier;
                state.score += points;
                state.levelPopped++;
                state.totalPopped++;

                spawnParticles(b.x, b.y, b.color, b.golden ? 20 : 10);
                spawnPopEffect(pos.x, pos.y, points);

                updateHUD();
                checkLevelComplete();
                break; // Only pop one balloon per click
            }
        }

        if (!popped) {
            state.currentCombo = 0;
        }
    }

    canvas.addEventListener('mousedown', handlePop);
    canvas.addEventListener('touchstart', handlePop, { passive: false });

    // --- Update HUD ---
    function updateHUD() {
        hudScore.textContent = state.score;
        hudLevel.textContent = state.level;
        hudLives.textContent = state.lives;
        const config = getLevelConfig();
        hudTarget.textContent = state.levelPopped + '/' + config.target;
    }

    // --- Check Level Complete ---
    function checkLevelComplete() {
        const config = getLevelConfig();
        if (state.levelPopped >= config.target) {
            state.running = false;
            showLevelComplete();
        }
    }

    // --- Show Level Complete ---
    function showLevelComplete() {
        const config = getLevelConfig();
        const accuracy = state.levelClicks > 0
            ? Math.round((state.levelPopped / state.levelClicks) * 100)
            : 0;

        // Stars
        let starCount = 1;
        if (accuracy >= 60) starCount = 2;
        if (accuracy >= 85) starCount = 3;

        // Bonus points
        const bonus = starCount * 50 + (state.lives * 25);
        state.score += bonus;

        // Update modal
        document.getElementById('lc-popped').textContent = state.levelPopped;
        document.getElementById('lc-accuracy').textContent = accuracy + '%';
        document.getElementById('lc-score').textContent = state.score;
        document.getElementById('lc-bonus').textContent = '+' + bonus;

        const nextIdx = Math.min(state.level, LEVELS.length - 1);
        document.getElementById('lc-next-name').textContent = LEVELS[nextIdx].name;

        const starsContainer = document.getElementById('stars-container');
        const stars = starsContainer.querySelectorAll('.star');
        stars.forEach(function(star, i) {
            star.classList.toggle('earned', i < starCount);
        });

        showModal(modalLevelComplete);
        updateHUD();
    }

    // --- Game Over ---
    function triggerGameOver() {
        state.running = false;
        state.gameOver = true;

        if (state.score > state.highScore) {
            state.highScore = state.score;
            localStorage.setItem('balloonPop_highScore', String(state.highScore));
        }

        document.getElementById('go-final-score').textContent = state.score;
        document.getElementById('go-level').textContent = state.level;
        document.getElementById('go-popped').textContent = state.totalPopped;
        document.getElementById('go-combo').textContent = state.bestCombo + 'x';
        document.getElementById('go-highscore').textContent = state.highScore;

        showModal(modalGameOver);
    }

    // --- Reset Game ---
    function resetGame() {
        state.score = 0;
        state.level = 1;
        state.lives = 3;
        state.totalPopped = 0;
        state.levelPopped = 0;
        state.levelClicks = 0;
        state.bestCombo = 0;
        state.currentCombo = 0;
        state.comboTimer = 0;
        state.paused = false;
        state.running = false;
        state.gameOver = false;
        state.spawnTimer = 0;
        state.balloons = [];
        state.particles = [];
        updateHUD();
    }

    function startLevel() {
        state.levelPopped = 0;
        state.levelClicks = 0;
        state.currentCombo = 0;
        state.comboTimer = 0;
        state.spawnTimer = 0;
        state.balloons = [];
        state.particles = [];
        state.running = true;
        state.paused = false;
        updateHUD();
    }

    // --- Drawing ---
    function drawBackground() {
        const config = getLevelConfig();
        const w = canvas.getBoundingClientRect().width;
        const h = canvas.getBoundingClientRect().height;
        const gradient = ctx.createLinearGradient(0, 0, 0, h);
        gradient.addColorStop(0, config.bgGradient[0]);
        gradient.addColorStop(1, config.bgGradient[1]);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, w, h);
    }

    function drawBalloon(b) {
        if (b.popped || b.escaped) return;

        ctx.save();
        ctx.globalAlpha = b.opacity;

        // Balloon body
        ctx.beginPath();
        ctx.ellipse(b.x, b.y, b.radius * 0.85, b.radius, 0, 0, Math.PI * 2);

        if (b.golden) {
            const glow = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.radius);
            glow.addColorStop(0, '#fff8dc');
            glow.addColorStop(0.4, '#ffd700');
            glow.addColorStop(1, '#daa520');
            ctx.fillStyle = glow;
        } else {
            const grad = ctx.createRadialGradient(
                b.x - b.radius * 0.25, b.y - b.radius * 0.3, b.radius * 0.1,
                b.x, b.y, b.radius
            );
            grad.addColorStop(0, lightenColor(b.color, 60));
            grad.addColorStop(0.7, b.color);
            grad.addColorStop(1, darkenColor(b.color, 30));
            ctx.fillStyle = grad;
        }
        ctx.fill();

        // Highlight
        ctx.beginPath();
        ctx.ellipse(
            b.x - b.radius * 0.25,
            b.y - b.radius * 0.35,
            b.radius * 0.2,
            b.radius * 0.3,
            -0.3, 0, Math.PI * 2
        );
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.fill();

        // Knot
        ctx.beginPath();
        ctx.moveTo(b.x - 3, b.y + b.radius - 2);
        ctx.lineTo(b.x, b.y + b.radius + 5);
        ctx.lineTo(b.x + 3, b.y + b.radius - 2);
        ctx.fillStyle = darkenColor(b.color, 40);
        ctx.fill();

        // String
        ctx.beginPath();
        ctx.moveTo(b.x, b.y + b.radius + 5);
        ctx.quadraticCurveTo(
            b.x + Math.sin(b.time * 2) * 5,
            b.y + b.radius + 20,
            b.x + Math.sin(b.time * 1.5) * 3,
            b.y + b.radius + 35
        );
        ctx.strokeStyle = 'rgba(0,0,0,0.2)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Golden glow effect
        if (b.golden) {
            ctx.beginPath();
            ctx.ellipse(b.x, b.y, b.radius * 1.2, b.radius * 1.35, 0, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(255, 215, 0, ' + (0.3 + Math.sin(b.time * 4) * 0.15) + ')';
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        ctx.restore();
    }

    function drawParticles() {
        state.particles.forEach(function(p) {
            ctx.save();
            ctx.globalAlpha = p.life;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.fill();
            ctx.restore();
        });
    }

    // --- Color Helpers ---
    function lightenColor(hex, amount) {
        const num = parseInt(hex.replace('#', ''), 16);
        const r = Math.min(255, (num >> 16) + amount);
        const g = Math.min(255, ((num >> 8) & 0xff) + amount);
        const b = Math.min(255, (num & 0xff) + amount);
        return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    }

    function darkenColor(hex, amount) {
        const num = parseInt(hex.replace('#', ''), 16);
        const r = Math.max(0, (num >> 16) - amount);
        const g = Math.max(0, ((num >> 8) & 0xff) - amount);
        const b = Math.max(0, (num & 0xff) - amount);
        return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    }

    // --- Game Loop ---
    function gameLoop(timestamp) {
        if (!state.lastTime) state.lastTime = timestamp;
        const dt = Math.min((timestamp - state.lastTime) / 1000, 0.05); // cap delta
        state.lastTime = timestamp;

        if (state.running && !state.paused) {
            update(dt);
        }

        draw();
        requestAnimationFrame(gameLoop);
    }

    function update(dt) {
        const config = getLevelConfig();
        const w = canvas.getBoundingClientRect().width;
        const h = canvas.getBoundingClientRect().height;

        // Combo timer
        if (state.comboTimer > 0) {
            state.comboTimer -= dt;
            if (state.comboTimer <= 0) {
                state.currentCombo = 0;
            }
        }

        // Spawn balloons
        state.spawnTimer -= dt;
        if (state.spawnTimer <= 0) {
            state.balloons.push(createBalloon());
            state.spawnTimer = config.spawnRate * rand(0.6, 1.2);
        }

        // Update balloons
        state.balloons.forEach(function(b) {
            if (b.popped || b.escaped) return;
            b.time += dt;
            b.y -= b.speed * dt;
            b.x += Math.sin(b.time * b.wobbleSpeed + b.wobbleOffset) * b.wobbleAmount * dt;

            // Keep in bounds horizontally
            b.x = Math.max(b.radius, Math.min(w - b.radius, b.x));

            // Escaped off top
            if (b.y + b.radius < -20) {
                b.escaped = true;
                state.lives--;
                updateHUD();
                if (state.lives <= 0) {
                    triggerGameOver();
                }
            }
        });

        // Clean up old balloons
        state.balloons = state.balloons.filter(function(b) {
            return !b.popped && !b.escaped;
        });

        // Update particles
        state.particles.forEach(function(p) {
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vy += 200 * dt; // gravity
            p.life -= p.decay * dt;
        });

        state.particles = state.particles.filter(function(p) {
            return p.life > 0;
        });
    }

    function draw() {
        const w = canvas.getBoundingClientRect().width;
        const h = canvas.getBoundingClientRect().height;

        ctx.clearRect(0, 0, w, h);
        drawBackground();

        // Draw balloons
        state.balloons.forEach(drawBalloon);

        // Draw particles
        drawParticles();

        // Combo indicator
        if (state.currentCombo >= 2 && state.running && !state.paused) {
            ctx.save();
            ctx.font = 'bold 1.2rem sans-serif';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
            ctx.textAlign = 'center';
            ctx.fillText(state.currentCombo + 'x COMBO!', w / 2, 70);
            ctx.restore();
        }
    }

    // --- Button Handlers ---
    btnStart.addEventListener('click', function () {
        hideAllModals();
        resetGame();
        startLevel();
    });

    pauseBtn.addEventListener('click', function () {
        if (!state.running) return;
        state.paused = true;

        document.getElementById('pause-score').textContent = state.score;
        document.getElementById('pause-level').textContent = state.level;
        document.getElementById('pause-lives').textContent = state.lives;
        document.getElementById('pause-popped').textContent = state.totalPopped;

        showModal(modalPause);
    });

    btnResume.addEventListener('click', function () {
        hideModal(modalPause);
        state.paused = false;
    });

    btnRestartPause.addEventListener('click', function () {
        hideAllModals();
        resetGame();
        startLevel();
    });

    btnNextLevel.addEventListener('click', function () {
        hideAllModals();
        state.level++;
        startLevel();
    });

    btnPlayAgain.addEventListener('click', function () {
        hideAllModals();
        resetGame();
        startLevel();
    });

    btnMainMenu.addEventListener('click', function () {
        hideAllModals();
        resetGame();
        showModal(modalStart);
    });

    // --- Keyboard ---
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
            if (state.running && !state.paused) {
                pauseBtn.click();
            } else if (state.paused) {
                btnResume.click();
            }
        }
    });

    // --- Init ---
    showModal(modalStart);
    requestAnimationFrame(gameLoop);
})();
