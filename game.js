// ============================================
// BALLOON POP - GAME ENGINE
// With water-drop bonus mechanic
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

    // --- Constants ---
    var BRIDGE_HEIGHT_RATIO = 0.09;
    var BRIDGE_Y_OFFSET = 0.88;
    var BAD_GUY_SCALE = 1;

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
        waterDrops: [],
        badGuys: [],
        splashes: [],
        waterHits: 0,
        totalWaterHits: 0,
    };

    // --- Level Definitions ---
    const LEVELS = [
        { name: 'Sunny Meadow',    target: 8,  spawnRate: 1.2,  speed: 1,    badGuys: 2, bgGradient: ['#87CEEB','#e0f7e9'],   colors: ['#ff6b6b','#ff8e53','#ffd93d','#6bcb77','#4d96ff'] },
        { name: 'Ocean Breeze',     target: 12, spawnRate: 1.0,  speed: 1.15, badGuys: 3, bgGradient: ['#0077b6','#caf0f8'],   colors: ['#00b4d8','#0077b6','#48cae4','#90e0ef','#caf0f8'] },
        { name: 'Sunset Glow',      target: 15, spawnRate: 0.9,  speed: 1.3,  badGuys: 3, bgGradient: ['#ff758f','#ffd93d'],   colors: ['#ff6b6b','#ff8e53','#ffd93d','#c9184a','#ff758f'] },
        { name: 'Enchanted Forest', target: 18, spawnRate: 0.8,  speed: 1.4,  badGuys: 4, bgGradient: ['#1b4332','#95d5b2'],   colors: ['#2d6a4f','#40916c','#52b788','#74c69d','#95d5b2'] },
        { name: 'Neon Night',       target: 22, spawnRate: 0.7,  speed: 1.5,  badGuys: 4, bgGradient: ['#0d1b2a','#1b263b'],   colors: ['#f72585','#7209b7','#3a0ca3','#4361ee','#4cc9f0'] },
        { name: 'Candy Land',       target: 25, spawnRate: 0.65, speed: 1.6,  badGuys: 5, bgGradient: ['#ffe4f0','#ffd1e8'],   colors: ['#ff69b4','#ff1493','#ff6ec7','#da70d6','#ee82ee'] },
        { name: 'Volcanic Core',    target: 28, spawnRate: 0.6,  speed: 1.7,  badGuys: 5, bgGradient: ['#1a0000','#8b0000'],   colors: ['#ff4500','#ff6347','#ff7f50','#dc143c','#b22222'] },
        { name: 'Arctic Frost',     target: 30, spawnRate: 0.55, speed: 1.8,  badGuys: 6, bgGradient: ['#e0f7fa','#ffffff'],   colors: ['#e0f7fa','#b2ebf2','#80deea','#4dd0e1','#26c6da'] },
        { name: 'Space Odyssey',    target: 35, spawnRate: 0.5,  speed: 2.0,  badGuys: 6, bgGradient: ['#000000','#1a1a3e'],   colors: ['#bb86fc','#03dac6','#cf6679','#ffffff','#ffde03'] },
        { name: 'The Grand Finale', target: 40, spawnRate: 0.45, speed: 2.2,  badGuys: 8, bgGradient: ['#2c3e50','#3498db'],   colors: ['#ffd700','#ff6b6b','#4ecdc4','#45b7d1','#f9ca24'] },
    ];

    var BAD_GUY_COLORS = [
        { skin: '#c9184a', hat: '#6a0136' },
        { skin: '#7209b7', hat: '#3a0ca3' },
        { skin: '#e85d04', hat: '#6a040f' },
        { skin: '#2d6a4f', hat: '#1b4332' },
        { skin: '#0077b6', hat: '#023e8a' },
        { skin: '#9d4edd', hat: '#5a189a' },
        { skin: '#d62828', hat: '#6a040f' },
        { skin: '#457b9d', hat: '#1d3557' },
    ];

    // --- Resize ---
    function resize() {
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        var h = rect.height;
        BAD_GUY_SCALE = Math.max(0.6, Math.min(1.2, h / 700));
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

    function getBridgeY() {
        return canvas.getBoundingClientRect().height * BRIDGE_Y_OFFSET;
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

    // --- Bad Guy Factory ---
    function createBadGuy(index, total) {
        var w = canvas.getBoundingClientRect().width;
        var spacing = w / (total + 1);
        var palette = BAD_GUY_COLORS[index % BAD_GUY_COLORS.length];
        return {
            x: spacing * (index + 1),
            speed: rand(25, 55) * (Math.random() < 0.5 ? 1 : -1),
            width: 18 * BAD_GUY_SCALE,
            height: 28 * BAD_GUY_SCALE,
            color: palette.skin,
            hatColor: palette.hat,
            walkPhase: rand(0, Math.PI * 2),
            soakTimer: 0,
            jumpVy: 0,
            jumpOffset: 0,
            shakeTimer: 0,
            dripTimer: 0,
        };
    }

    function spawnBadGuys() {
        var config = getLevelConfig();
        var count = config.badGuys;
        state.badGuys = [];
        for (var i = 0; i < count; i++) {
            state.badGuys.push(createBadGuy(i, count));
        }
    }

    // --- Balloon Factory ---
    function createBalloon() {
        const config = getLevelConfig();
        const w = canvas.getBoundingClientRect().width;
        const h = canvas.getBoundingClientRect().height;
        const bridgeTop = h * BRIDGE_Y_OFFSET - 20;
        const radius = rand(22, 40);
        const isGolden = Math.random() < 0.08;

        return {
            x: rand(radius + 10, w - radius - 10),
            y: bridgeTop + radius + rand(10, 60),
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

    // --- Water Drop System ---
    function spawnWaterDrops(x, y, count) {
        for (var i = 0; i < count; i++) {
            state.waterDrops.push({
                x: x + rand(-12, 12),
                y: y + rand(-5, 5),
                vx: rand(-30, 30),
                vy: rand(20, 80),
                radius: rand(2.5, 5),
                life: 1,
            });
        }
    }

    // --- Splash Effect ---
    function spawnSplash(x, y) {
        for (var i = 0; i < 6; i++) {
            state.splashes.push({
                x: x + rand(-8, 8),
                y: y,
                vx: rand(-60, 60),
                vy: rand(-80, -30),
                radius: rand(1.5, 3.5),
                life: 1,
                decay: rand(2, 4),
            });
        }
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
    function spawnPopEffect(x, y, text, cssClass) {
        const el = document.createElement('div');
        el.className = 'pop-effect' + (cssClass ? ' ' + cssClass : '');
        el.textContent = text;
        el.style.left = x + 'px';
        el.style.top = y + 'px';
        document.getElementById('game-container').appendChild(el);
        setTimeout(function() { el.remove(); }, 800);
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

                state.currentCombo++;
                state.comboTimer = 1.5;
                const comboMultiplier = Math.min(state.currentCombo, 5);
                state.bestCombo = Math.max(state.bestCombo, state.currentCombo);

                const points = basePoints * goldenMultiplier * comboMultiplier;
                state.score += points;
                state.levelPopped++;
                state.totalPopped++;

                spawnParticles(b.x, b.y, b.color, b.golden ? 20 : 10);
                spawnPopEffect(pos.x, pos.y, '+' + points);

                // Spawn water drops falling from the popped balloon
                var dropCount = b.golden ? 12 : 6;
                spawnWaterDrops(b.x, b.y, dropCount);

                updateHUD();
                checkLevelComplete();
                break;
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

        let starCount = 1;
        if (accuracy >= 60) starCount = 2;
        if (accuracy >= 85) starCount = 3;

        const bonus = starCount * 50 + (state.lives * 25);
        state.score += bonus;

        document.getElementById('lc-popped').textContent = state.levelPopped;
        document.getElementById('lc-accuracy').textContent = accuracy + '%';
        document.getElementById('lc-score').textContent = state.score;
        document.getElementById('lc-bonus').textContent = '+' + bonus;
        document.getElementById('lc-soaked').textContent = state.waterHits;

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
        document.getElementById('go-soaked').textContent = state.totalWaterHits;
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
        state.waterDrops = [];
        state.badGuys = [];
        state.splashes = [];
        state.waterHits = 0;
        state.totalWaterHits = 0;
        updateHUD();
    }

    function startLevel() {
        state.levelPopped = 0;
        state.levelClicks = 0;
        state.currentCombo = 0;
        state.comboTimer = 0;
        state.spawnTimer = 0;
        state.waterHits = 0;
        state.balloons = [];
        state.particles = [];
        state.waterDrops = [];
        state.splashes = [];
        state.running = true;
        state.paused = false;
        spawnBadGuys();
        updateHUD();
    }

    // ============================================
    // UPDATE
    // ============================================

    function update(dt) {
        const config = getLevelConfig();
        const w = canvas.getBoundingClientRect().width;
        const h = canvas.getBoundingClientRect().height;
        var bridgeY = getBridgeY();

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
            b.x = Math.max(b.radius, Math.min(w - b.radius, b.x));

            if (b.y + b.radius < -20) {
                b.escaped = true;
                state.lives--;
                updateHUD();
                if (state.lives <= 0) {
                    triggerGameOver();
                }
            }
        });

        state.balloons = state.balloons.filter(function(b) {
            return !b.popped && !b.escaped;
        });

        // Update bad guys
        state.badGuys.forEach(function(g) {
            g.walkPhase += dt * 5;

            // Soaked reaction
            if (g.soakTimer > 0) {
                g.soakTimer -= dt;
                g.shakeTimer -= dt;
                g.dripTimer -= dt;

                // Jump arc
                if (g.jumpVy !== 0) {
                    g.jumpOffset += g.jumpVy * dt;
                    g.jumpVy += 400 * dt;
                    if (g.jumpOffset >= 0) {
                        g.jumpOffset = 0;
                        g.jumpVy = 0;
                    }
                }
                return; // Don't walk while soaked
            }

            g.jumpOffset = 0;
            g.x += g.speed * dt;

            // Bounce off edges
            var margin = g.width;
            if (g.x <= margin) {
                g.x = margin;
                g.speed = Math.abs(g.speed);
            } else if (g.x >= w - margin) {
                g.x = w - margin;
                g.speed = -Math.abs(g.speed);
            }
        });

        // Update water drops
        state.waterDrops.forEach(function(d) {
            d.x += d.vx * dt;
            d.vy += 320 * dt; // gravity
            d.y += d.vy * dt;
            d.vx *= 0.98;

            // Check collision with bad guys
            state.badGuys.forEach(function(g) {
                if (d.life <= 0) return;
                var gTop = bridgeY - g.height + g.jumpOffset;
                var gLeft = g.x - g.width * 0.5;
                var gRight = g.x + g.width * 0.5;

                if (d.x >= gLeft - 4 && d.x <= gRight + 4 &&
                    d.y >= gTop - 4 && d.y <= bridgeY + 2) {
                    d.life = 0;

                    if (g.soakTimer <= 0) {
                        g.soakTimer = 2.0;
                        g.shakeTimer = 0.6;
                        g.dripTimer = 1.8;
                        g.jumpVy = -140;
                        g.jumpOffset = 0;

                        var waterBonus = Math.round(25 * (1 + (state.level - 1) * 0.15));
                        state.score += waterBonus;
                        state.waterHits++;
                        state.totalWaterHits++;

                        spawnSplash(g.x, gTop + g.height * 0.3);
                        spawnPopEffect(g.x, gTop - 10, '+' + waterBonus + ' SPLASH!', 'water-bonus');
                        updateHUD();
                    }
                }
            });

            // Remove if off-screen or hit bridge
            if (d.y > bridgeY + 10 || d.y > h + 20) {
                d.life = 0;
            }
        });

        state.waterDrops = state.waterDrops.filter(function(d) { return d.life > 0; });

        // Update splashes
        state.splashes.forEach(function(s) {
            s.x += s.vx * dt;
            s.y += s.vy * dt;
            s.vy += 200 * dt;
            s.life -= s.decay * dt;
        });

        state.splashes = state.splashes.filter(function(s) { return s.life > 0; });

        // Update particles
        state.particles.forEach(function(p) {
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vy += 200 * dt;
            p.life -= p.decay * dt;
        });

        state.particles = state.particles.filter(function(p) { return p.life > 0; });
    }

    // ============================================
    // DRAWING
    // ============================================

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

    function drawBridge() {
        var w = canvas.getBoundingClientRect().width;
        var h = canvas.getBoundingClientRect().height;
        var bridgeY = getBridgeY();
        var plankH = 8 * BAD_GUY_SCALE;
        var ropeY = bridgeY - 2;

        // Rope top
        ctx.strokeStyle = '#8B6914';
        ctx.lineWidth = 2 * BAD_GUY_SCALE;
        ctx.beginPath();
        ctx.moveTo(0, ropeY);
        for (var rx = 0; rx < w; rx += 30) {
            ctx.lineTo(rx + 15, ropeY - 2);
            ctx.lineTo(rx + 30, ropeY);
        }
        ctx.stroke();

        // Planks
        var plankW = 22 * BAD_GUY_SCALE;
        var gap = 2;
        var plankColors = ['#a0522d', '#8b4513', '#996633'];
        for (var px = 0; px < w; px += plankW + gap) {
            ctx.fillStyle = plankColors[Math.floor(px / (plankW + gap)) % plankColors.length];
            ctx.fillRect(px, bridgeY, plankW, plankH);

            // Plank grain
            ctx.strokeStyle = 'rgba(0,0,0,0.1)';
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(px + 3, bridgeY + 2);
            ctx.lineTo(px + plankW - 3, bridgeY + 2);
            ctx.moveTo(px + 2, bridgeY + plankH - 2);
            ctx.lineTo(px + plankW - 2, bridgeY + plankH - 2);
            ctx.stroke();
        }

        // Rope bottom
        ctx.strokeStyle = '#8B6914';
        ctx.lineWidth = 1.5 * BAD_GUY_SCALE;
        var bottomRope = bridgeY + plankH + 1;
        ctx.beginPath();
        ctx.moveTo(0, bottomRope);
        ctx.lineTo(w, bottomRope);
        ctx.stroke();

        // Below bridge fade
        var fadeGrad = ctx.createLinearGradient(0, bridgeY + plankH, 0, h);
        fadeGrad.addColorStop(0, 'rgba(0,0,0,0.25)');
        fadeGrad.addColorStop(1, 'rgba(0,0,0,0.0)');
        ctx.fillStyle = fadeGrad;
        ctx.fillRect(0, bridgeY + plankH, w, h - bridgeY - plankH);
    }

    function drawBadGuy(g) {
        var bridgeY = getBridgeY();
        var s = BAD_GUY_SCALE;
        var x = g.x;
        var baseY = bridgeY + g.jumpOffset;
        var soaked = g.soakTimer > 0;
        var shaking = g.shakeTimer > 0;

        ctx.save();

        // Shake offset
        var shakeX = 0;
        if (shaking) {
            shakeX = Math.sin(g.shakeTimer * 40) * 2.5 * s;
        }
        ctx.translate(x + shakeX, baseY);

        // Facing direction
        var facingRight = g.speed >= 0;
        if (soaked) facingRight = true; // face forward when soaked

        // --- Legs (walk animation) ---
        var legSpread = soaked ? 0 : Math.sin(g.walkPhase) * 4 * s;
        ctx.strokeStyle = g.color;
        ctx.lineWidth = 2.5 * s;
        ctx.lineCap = 'round';
        // Left leg
        ctx.beginPath();
        ctx.moveTo(-3 * s, -4 * s);
        ctx.lineTo((-3 - legSpread) * s, 0);
        ctx.stroke();
        // Right leg
        ctx.beginPath();
        ctx.moveTo(3 * s, -4 * s);
        ctx.lineTo((3 + legSpread) * s, 0);
        ctx.stroke();

        // --- Body ---
        ctx.fillStyle = g.color;
        ctx.beginPath();
        ctx.roundRect(-6 * s, -16 * s, 12 * s, 13 * s, 3 * s);
        ctx.fill();

        // --- Arms ---
        ctx.strokeStyle = g.color;
        ctx.lineWidth = 2.5 * s;
        if (soaked) {
            // Arms up in surprise
            ctx.beginPath();
            ctx.moveTo(-6 * s, -12 * s);
            ctx.lineTo(-11 * s, -20 * s);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(6 * s, -12 * s);
            ctx.lineTo(11 * s, -20 * s);
            ctx.stroke();
        } else {
            // Walking arm swing
            var armSwing = Math.sin(g.walkPhase + Math.PI) * 3 * s;
            ctx.beginPath();
            ctx.moveTo(-6 * s, -12 * s);
            ctx.lineTo((-10 - armSwing) * s, -6 * s);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(6 * s, -12 * s);
            ctx.lineTo((10 + armSwing) * s, -6 * s);
            ctx.stroke();
        }

        // --- Head ---
        var headR = 6.5 * s;
        var headY = -21 * s;
        ctx.fillStyle = soaked ? '#7eb8d8' : '#fce4b8';
        ctx.beginPath();
        ctx.arc(0, headY, headR, 0, Math.PI * 2);
        ctx.fill();

        // --- Hat ---
        ctx.fillStyle = g.hatColor;
        ctx.beginPath();
        ctx.ellipse(0, headY - headR + 1 * s, headR * 1.3, 3 * s, 0, Math.PI, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(-4.5 * s, headY - headR - 5 * s, 9 * s, 6 * s);

        // --- Face ---
        var eyeY = headY - 1 * s;
        if (soaked) {
            // Surprised face: wide eyes, open mouth
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(-2.5 * s, eyeY, 2.2 * s, 0, Math.PI * 2);
            ctx.arc(2.5 * s, eyeY, 2.2 * s, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#222';
            ctx.beginPath();
            ctx.arc(-2.5 * s, eyeY, 1.2 * s, 0, Math.PI * 2);
            ctx.arc(2.5 * s, eyeY, 1.2 * s, 0, Math.PI * 2);
            ctx.fill();

            // Open mouth
            ctx.fillStyle = '#222';
            ctx.beginPath();
            ctx.ellipse(0, headY + 3 * s, 2.5 * s, 2 * s, 0, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // Normal face: beady eyes, smirk
            ctx.fillStyle = '#222';
            var ex = facingRight ? 0.5 * s : -0.5 * s;
            ctx.beginPath();
            ctx.arc(-2.5 * s + ex, eyeY, 1.2 * s, 0, Math.PI * 2);
            ctx.arc(2.5 * s + ex, eyeY, 1.2 * s, 0, Math.PI * 2);
            ctx.fill();

            // Smirk
            ctx.strokeStyle = '#222';
            ctx.lineWidth = 1 * s;
            ctx.beginPath();
            ctx.arc(0, headY + 2 * s, 2 * s, 0.1, Math.PI - 0.1);
            ctx.stroke();
        }

        // --- Drip effect when soaked ---
        if (g.dripTimer > 0) {
            ctx.fillStyle = 'rgba(100, 180, 255, ' + Math.min(1, g.dripTimer) + ')';
            var dripPhase = g.soakTimer * 8;
            for (var di = 0; di < 4; di++) {
                var dx = (di - 1.5) * 4 * s;
                var dy = headY + headR + Math.abs(Math.sin(dripPhase + di * 1.5)) * 6 * s;
                ctx.beginPath();
                ctx.ellipse(dx, dy, 1.2 * s, 2 * s, 0, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        ctx.restore();
    }

    function drawWaterDrops() {
        ctx.fillStyle = 'rgba(80, 170, 255, 0.8)';
        state.waterDrops.forEach(function(d) {
            ctx.beginPath();
            // Teardrop shape
            ctx.save();
            ctx.translate(d.x, d.y);
            ctx.beginPath();
            ctx.moveTo(0, -d.radius);
            ctx.quadraticCurveTo(d.radius, 0, 0, d.radius * 1.3);
            ctx.quadraticCurveTo(-d.radius, 0, 0, -d.radius);
            ctx.fill();
            ctx.restore();
        });
    }

    function drawSplashes() {
        state.splashes.forEach(function(s) {
            ctx.save();
            ctx.globalAlpha = Math.max(0, s.life);
            ctx.fillStyle = 'rgba(100, 190, 255, 0.9)';
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        });
    }

    function drawBalloon(b) {
        if (b.popped || b.escaped) return;

        ctx.save();
        ctx.globalAlpha = b.opacity;

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

    // ============================================
    // GAME LOOP
    // ============================================

    function gameLoop(timestamp) {
        if (!state.lastTime) state.lastTime = timestamp;
        const dt = Math.min((timestamp - state.lastTime) / 1000, 0.05);
        state.lastTime = timestamp;

        if (state.running && !state.paused) {
            update(dt);
        }

        draw();
        requestAnimationFrame(gameLoop);
    }

    function draw() {
        const w = canvas.getBoundingClientRect().width;
        const h = canvas.getBoundingClientRect().height;

        ctx.clearRect(0, 0, w, h);
        drawBackground();

        // Bridge behind everything on it
        drawBridge();

        // Bad guys on the bridge
        state.badGuys.forEach(drawBadGuy);

        // Balloons float above
        state.balloons.forEach(drawBalloon);

        // Water drops falling
        drawWaterDrops();

        // Splash particles
        drawSplashes();

        // Pop particles
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
