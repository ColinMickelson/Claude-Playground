// ============================================
// BALLOON POP - GAME ENGINE
// Power-ups, dynamic scenery, boss levels
// ============================================

(function () {
    'use strict';

    var canvas = document.getElementById('game-canvas');
    var ctx = canvas.getContext('2d');

    // --- DOM ---
    var hudScore = document.getElementById('hud-score');
    var hudLevel = document.getElementById('hud-level');
    var hudLives = document.getElementById('hud-lives');
    var hudTarget = document.getElementById('hud-target');
    var pauseBtn = document.getElementById('pause-btn');

    var modalStart = document.getElementById('modal-start');
    var modalPause = document.getElementById('modal-pause');
    var modalLevelComplete = document.getElementById('modal-level-complete');
    var modalGameOver = document.getElementById('modal-game-over');

    var btnStart = document.getElementById('btn-start');
    var btnResume = document.getElementById('btn-resume');
    var btnRestartPause = document.getElementById('btn-restart-pause');
    var btnNextLevel = document.getElementById('btn-next-level');
    var btnPlayAgain = document.getElementById('btn-play-again');
    var btnMainMenu = document.getElementById('btn-main-menu');

    // --- Constants ---
    var BRIDGE_Y_OFFSET = 0.88;
    var BAD_GUY_SCALE = 1;

    // --- Power-up types ---
    var POWERUP_TYPES = [
        { id: 'freeze',   label: 'FREEZE',    icon: '❄',  color: '#4dc9f6', duration: 6 },
        { id: 'multi',    label: 'MULTI-POP',  icon: '💥', color: '#ff6b6b', duration: 0 },
        { id: 'double',   label: '2X POINTS',  icon: '×2', color: '#ffd700', duration: 8 },
        { id: 'life',     label: '+1 LIFE',    icon: '❤',  color: '#ff4d6d', duration: 0 },
        { id: 'shield',   label: 'SHIELD',     icon: '🛡', color: '#7ec8e3', duration: 15 },
    ];

    // --- Game State ---
    var state = {
        score: 0,
        level: 1,
        lives: 3,
        totalPopped: 0,
        levelPopped: 0,
        levelClicks: 0,
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
        // Power-ups
        powerups: [],
        activePowerups: {},
        powerupSpawnTimer: 0,
        multiPopReady: false,
        shieldActive: false,
        // Boss
        boss: null,
        bossDefeated: false,
        bossFlashTimer: 0,
        // Scenery
        scenery: [],
        sceneryTime: 0,
    };

    // --- Level Definitions ---
    var LEVELS = [
        { name: 'Sunny Meadow',    target: 8,  spawnRate: 1.2,  speed: 1,    badGuys: 2, boss: false, bgGradient: ['#87CEEB','#e0f7e9'],   colors: ['#ff6b6b','#ff8e53','#ffd93d','#6bcb77','#4d96ff'], sceneryType: 'meadow' },
        { name: 'Ocean Breeze',     target: 12, spawnRate: 1.0,  speed: 1.15, badGuys: 3, boss: false, bgGradient: ['#0077b6','#caf0f8'],   colors: ['#00b4d8','#0077b6','#48cae4','#90e0ef','#caf0f8'], sceneryType: 'ocean' },
        { name: 'Sunset Glow',      target: 15, spawnRate: 0.9,  speed: 1.3,  badGuys: 3, boss: false, bgGradient: ['#ff758f','#ffd93d'],   colors: ['#ff6b6b','#ff8e53','#ffd93d','#c9184a','#ff758f'], sceneryType: 'sunset' },
        { name: 'Enchanted Forest', target: 18, spawnRate: 0.8,  speed: 1.4,  badGuys: 4, boss: false, bgGradient: ['#1b4332','#95d5b2'],   colors: ['#2d6a4f','#40916c','#52b788','#74c69d','#95d5b2'], sceneryType: 'forest' },
        { name: 'Neon Night',       target: 22, spawnRate: 0.7,  speed: 1.5,  badGuys: 4, boss: true,  bgGradient: ['#0d1b2a','#1b263b'],   colors: ['#f72585','#7209b7','#3a0ca3','#4361ee','#4cc9f0'], sceneryType: 'neon' },
        { name: 'Candy Land',       target: 25, spawnRate: 0.65, speed: 1.6,  badGuys: 5, boss: false, bgGradient: ['#ffe4f0','#ffd1e8'],   colors: ['#ff69b4','#ff1493','#ff6ec7','#da70d6','#ee82ee'], sceneryType: 'candy' },
        { name: 'Volcanic Core',    target: 28, spawnRate: 0.6,  speed: 1.7,  badGuys: 5, boss: false, bgGradient: ['#1a0000','#8b0000'],   colors: ['#ff4500','#ff6347','#ff7f50','#dc143c','#b22222'], sceneryType: 'volcano' },
        { name: 'Arctic Frost',     target: 30, spawnRate: 0.55, speed: 1.8,  badGuys: 6, boss: false, bgGradient: ['#e0f7fa','#ffffff'],   colors: ['#e0f7fa','#b2ebf2','#80deea','#4dd0e1','#26c6da'], sceneryType: 'arctic' },
        { name: 'Space Odyssey',    target: 35, spawnRate: 0.5,  speed: 2.0,  badGuys: 6, boss: false, bgGradient: ['#000000','#1a1a3e'],   colors: ['#bb86fc','#03dac6','#cf6679','#ffffff','#ffde03'], sceneryType: 'space' },
        { name: 'The Grand Finale', target: 40, spawnRate: 0.45, speed: 2.2,  badGuys: 8, boss: true,  bgGradient: ['#2c3e50','#3498db'],   colors: ['#ffd700','#ff6b6b','#4ecdc4','#45b7d1','#f9ca24'], sceneryType: 'finale' },
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
        var dpr = window.devicePixelRatio || 1;
        var rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        BAD_GUY_SCALE = Math.max(0.6, Math.min(1.2, rect.height / 700));
    }
    window.addEventListener('resize', resize);
    resize();

    // --- Utility ---
    function rand(min, max) { return Math.random() * (max - min) + min; }
    function getLevelConfig() { return LEVELS[Math.min(state.level - 1, LEVELS.length - 1)]; }
    function getBridgeY() { return canvas.getBoundingClientRect().height * BRIDGE_Y_OFFSET; }

    function lightenColor(hex, amt) {
        var n = parseInt(hex.replace('#',''), 16);
        var r = Math.min(255, (n >> 16) + amt);
        var g = Math.min(255, ((n >> 8) & 0xff) + amt);
        var b = Math.min(255, (n & 0xff) + amt);
        return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    }
    function darkenColor(hex, amt) {
        var n = parseInt(hex.replace('#',''), 16);
        var r = Math.max(0, (n >> 16) - amt);
        var g = Math.max(0, ((n >> 8) & 0xff) - amt);
        var b = Math.max(0, (n & 0xff) - amt);
        return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    }

    // --- Modal Helpers ---
    function showModal(m) { m.classList.add('active'); }
    function hideModal(m) { m.classList.remove('active'); }
    function hideAllModals() { [modalStart, modalPause, modalLevelComplete, modalGameOver].forEach(hideModal); }

    // ============================================
    // SCENERY SYSTEM
    // ============================================

    function generateScenery() {
        var config = getLevelConfig();
        var w = canvas.getBoundingClientRect().width;
        var h = canvas.getBoundingClientRect().height;
        var bridgeY = getBridgeY();
        var items = [];

        switch (config.sceneryType) {
            case 'meadow':
                // Rolling hills
                items.push({ type: 'hill', x: 0, y: bridgeY, w: w * 0.5, h: 60, color: '#7ec850' });
                items.push({ type: 'hill', x: w * 0.35, y: bridgeY, w: w * 0.5, h: 45, color: '#6ab840' });
                items.push({ type: 'hill', x: w * 0.7, y: bridgeY, w: w * 0.45, h: 55, color: '#7ec850' });
                // Clouds
                for (var i = 0; i < 4; i++) {
                    items.push({ type: 'cloud', x: rand(0, w), y: rand(30, h * 0.3), size: rand(25, 50), speed: rand(8, 20) });
                }
                // Flowers
                for (var f = 0; f < 8; f++) {
                    items.push({ type: 'flower', x: rand(10, w - 10), y: bridgeY - rand(2, 12), color: ['#ff6b6b','#ffd93d','#ff8ed4','#fff'][Math.floor(rand(0,4))], size: rand(3, 6) });
                }
                break;

            case 'ocean':
                for (var oi = 0; oi < 3; oi++) {
                    items.push({ type: 'wave', y: bridgeY - 5 + oi * 8, amplitude: rand(3, 6), frequency: rand(0.01, 0.02), speed: rand(0.5, 1.5), color: 'rgba(0,119,182,' + (0.15 - oi * 0.04) + ')' });
                }
                for (var si = 0; si < 3; si++) {
                    items.push({ type: 'seagull', x: rand(0, w), y: rand(20, h * 0.25), speed: rand(15, 35), wingPhase: rand(0, Math.PI * 2) });
                }
                items.push({ type: 'cloud', x: rand(0, w * 0.3), y: rand(20, 60), size: rand(30, 45), speed: rand(6, 12) });
                items.push({ type: 'cloud', x: rand(w * 0.5, w), y: rand(30, 70), size: rand(25, 40), speed: rand(8, 15) });
                break;

            case 'sunset':
                items.push({ type: 'sun', x: w * 0.75, y: bridgeY * 0.55, radius: 40 });
                for (var ci = 0; ci < 3; ci++) {
                    items.push({ type: 'cloud', x: rand(0, w), y: rand(30, h * 0.35), size: rand(30, 55), speed: rand(5, 12), color: 'rgba(255,180,100,0.4)' });
                }
                items.push({ type: 'hill', x: 0, y: bridgeY, w: w * 0.6, h: 70, color: 'rgba(80,20,40,0.5)' });
                items.push({ type: 'hill', x: w * 0.4, y: bridgeY, w: w * 0.7, h: 55, color: 'rgba(80,20,40,0.4)' });
                break;

            case 'forest':
                for (var ti = 0; ti < 7; ti++) {
                    items.push({ type: 'tree', x: rand(10, w - 10), y: bridgeY, height: rand(40, 80), width: rand(20, 35), color: ['#2d6a4f','#40916c','#1b4332'][Math.floor(rand(0,3))] });
                }
                for (var ff = 0; ff < 12; ff++) {
                    items.push({ type: 'firefly', x: rand(0, w), y: rand(h * 0.2, bridgeY - 20), phase: rand(0, Math.PI * 2), speed: rand(10, 25) });
                }
                break;

            case 'neon':
                // City skyline
                for (var bi = 0; bi < 10; bi++) {
                    var bw = rand(25, 55);
                    items.push({ type: 'building', x: bi * (w / 10) + rand(-5, 5), w: bw, h: rand(40, 100), color: '#0a0a1a',
                        windows: Math.floor(rand(2, 5)), neonColor: ['#f72585','#7209b7','#4361ee','#4cc9f0'][Math.floor(rand(0,4))] });
                }
                for (var si2 = 0; si2 < 20; si2++) {
                    items.push({ type: 'star', x: rand(0, w), y: rand(5, h * 0.35), size: rand(0.5, 2), twinklePhase: rand(0, Math.PI * 2) });
                }
                break;

            case 'candy':
                for (var li = 0; li < 5; li++) {
                    items.push({ type: 'lollipop', x: rand(20, w - 20), y: bridgeY, stickH: rand(30, 60), radius: rand(10, 18),
                        color1: ['#ff69b4','#ff1493','#da70d6'][Math.floor(rand(0,3))], color2: '#fff' });
                }
                items.push({ type: 'hill', x: 0, y: bridgeY, w: w * 0.4, h: 35, color: '#ffb6c1' });
                items.push({ type: 'hill', x: w * 0.5, y: bridgeY, w: w * 0.55, h: 40, color: '#ffc0cb' });
                items.push({ type: 'cloud', x: w * 0.2, y: 50, size: 35, speed: 10, color: 'rgba(255,200,220,0.5)' });
                items.push({ type: 'cloud', x: w * 0.7, y: 35, size: 40, speed: 8, color: 'rgba(255,200,220,0.5)' });
                break;

            case 'volcano':
                items.push({ type: 'mountain', x: w * 0.5, y: bridgeY, hw: w * 0.3, mh: 100, color: '#3d0000' });
                items.push({ type: 'mountain', x: w * 0.15, y: bridgeY, hw: w * 0.2, mh: 60, color: '#4a0000' });
                items.push({ type: 'mountain', x: w * 0.85, y: bridgeY, hw: w * 0.2, mh: 70, color: '#4a0000' });
                for (var em = 0; em < 8; em++) {
                    items.push({ type: 'ember', x: w * 0.5 + rand(-30, 30), y: bridgeY - 100, vx: rand(-20, 20), vy: rand(-60, -20), life: rand(0.5, 1), phase: rand(0, Math.PI * 2) });
                }
                break;

            case 'arctic':
                items.push({ type: 'snowdrift', x: 0, y: bridgeY, w: w * 0.35, h: 25, color: 'rgba(220,240,255,0.6)' });
                items.push({ type: 'snowdrift', x: w * 0.55, y: bridgeY, w: w * 0.5, h: 30, color: 'rgba(220,240,255,0.6)' });
                for (var sn = 0; sn < 30; sn++) {
                    items.push({ type: 'snowflake', x: rand(0, w), y: rand(-20, h), size: rand(2, 5), speed: rand(15, 35), drift: rand(-10, 10), phase: rand(0, Math.PI * 2) });
                }
                for (var ic = 0; ic < 5; ic++) {
                    items.push({ type: 'icicle', x: rand(20, w - 20), y: 0, len: rand(15, 35) });
                }
                break;

            case 'space':
                for (var st = 0; st < 40; st++) {
                    items.push({ type: 'star', x: rand(0, w), y: rand(0, h * 0.85), size: rand(0.5, 2.5), twinklePhase: rand(0, Math.PI * 2) });
                }
                items.push({ type: 'planet', x: w * 0.15, y: h * 0.2, radius: 25, color: '#bb86fc', ringColor: 'rgba(187,134,252,0.3)' });
                items.push({ type: 'planet', x: w * 0.8, y: h * 0.35, radius: 15, color: '#03dac6', ringColor: null });
                items.push({ type: 'nebula', x: w * 0.5, y: h * 0.15, w: 120, h: 60, color: 'rgba(207,102,121,0.12)' });
                break;

            case 'finale':
                for (var st2 = 0; st2 < 25; st2++) {
                    items.push({ type: 'star', x: rand(0, w), y: rand(0, h * 0.7), size: rand(0.5, 2), twinklePhase: rand(0, Math.PI * 2) });
                }
                for (var fw = 0; fw < 4; fw++) {
                    items.push({ type: 'firework', x: rand(w * 0.1, w * 0.9), y: rand(h * 0.1, h * 0.35),
                        color: ['#ffd700','#ff6b6b','#4ecdc4','#f9ca24'][fw], phase: rand(0, Math.PI * 2), burstSize: rand(15, 30) });
                }
                break;
        }

        state.scenery = items;
    }

    function updateScenery(dt) {
        var w = canvas.getBoundingClientRect().width;
        var h = canvas.getBoundingClientRect().height;
        state.sceneryTime += dt;

        state.scenery.forEach(function(s) {
            if (s.type === 'cloud') {
                s.x += s.speed * dt;
                if (s.x > w + s.size) s.x = -s.size * 2;
            } else if (s.type === 'seagull') {
                s.x += s.speed * dt;
                s.wingPhase += dt * 6;
                if (s.x > w + 20) s.x = -20;
            } else if (s.type === 'firefly') {
                s.phase += dt * 2;
                s.x += Math.sin(s.phase) * s.speed * dt;
                s.y += Math.cos(s.phase * 0.7) * s.speed * 0.5 * dt;
            } else if (s.type === 'snowflake') {
                s.y += s.speed * dt;
                s.x += s.drift * dt + Math.sin(s.phase + state.sceneryTime * 2) * 5 * dt;
                s.phase += dt;
                if (s.y > h + 10) { s.y = -10; s.x = rand(0, w); }
            } else if (s.type === 'ember') {
                s.x += s.vx * dt;
                s.y += s.vy * dt;
                s.vy -= 10 * dt;
                s.life -= dt * 0.3;
                if (s.life <= 0) {
                    s.life = rand(0.6, 1);
                    s.x = canvas.getBoundingClientRect().width * 0.5 + rand(-30, 30);
                    s.y = getBridgeY() - 100;
                    s.vx = rand(-20, 20);
                    s.vy = rand(-60, -20);
                }
            }
        });
    }

    function drawScenery() {
        var w = canvas.getBoundingClientRect().width;
        var h = canvas.getBoundingClientRect().height;
        var bridgeY = getBridgeY();
        var t = state.sceneryTime;

        state.scenery.forEach(function(s) {
            ctx.save();
            switch (s.type) {
                case 'hill':
                case 'snowdrift':
                    ctx.fillStyle = s.color;
                    ctx.beginPath();
                    ctx.moveTo(s.x, s.y);
                    ctx.quadraticCurveTo(s.x + s.w * 0.5, s.y - s.h, s.x + s.w, s.y);
                    ctx.fill();
                    break;

                case 'cloud':
                    ctx.fillStyle = s.color || 'rgba(255,255,255,0.35)';
                    var cs = s.size;
                    ctx.beginPath();
                    ctx.arc(s.x, s.y, cs * 0.5, 0, Math.PI * 2);
                    ctx.arc(s.x + cs * 0.4, s.y - cs * 0.15, cs * 0.4, 0, Math.PI * 2);
                    ctx.arc(s.x + cs * 0.8, s.y, cs * 0.45, 0, Math.PI * 2);
                    ctx.arc(s.x + cs * 0.35, s.y + cs * 0.15, cs * 0.35, 0, Math.PI * 2);
                    ctx.fill();
                    break;

                case 'flower':
                    ctx.fillStyle = '#4a7c3f';
                    ctx.fillRect(s.x - 0.5, s.y, 1, 8);
                    ctx.fillStyle = s.color;
                    for (var p = 0; p < 5; p++) {
                        var a = (p / 5) * Math.PI * 2;
                        ctx.beginPath();
                        ctx.arc(s.x + Math.cos(a) * s.size * 0.5, s.y - Math.sin(a) * s.size * 0.5, s.size * 0.4, 0, Math.PI * 2);
                        ctx.fill();
                    }
                    ctx.fillStyle = '#ffd700';
                    ctx.beginPath();
                    ctx.arc(s.x, s.y, s.size * 0.25, 0, Math.PI * 2);
                    ctx.fill();
                    break;

                case 'wave':
                    ctx.strokeStyle = s.color;
                    ctx.lineWidth = 3;
                    ctx.beginPath();
                    for (var wx = 0; wx < w; wx += 3) {
                        var wy = s.y + Math.sin(wx * s.frequency + t * s.speed) * s.amplitude;
                        if (wx === 0) ctx.moveTo(wx, wy); else ctx.lineTo(wx, wy);
                    }
                    ctx.stroke();
                    break;

                case 'seagull':
                    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
                    ctx.lineWidth = 1.5;
                    var wingY = Math.sin(s.wingPhase) * 4;
                    ctx.beginPath();
                    ctx.moveTo(s.x - 8, s.y + wingY);
                    ctx.quadraticCurveTo(s.x - 3, s.y - 2, s.x, s.y);
                    ctx.quadraticCurveTo(s.x + 3, s.y - 2, s.x + 8, s.y + wingY);
                    ctx.stroke();
                    break;

                case 'sun':
                    var sunGrad = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.radius * 2);
                    sunGrad.addColorStop(0, 'rgba(255,200,50,0.6)');
                    sunGrad.addColorStop(0.5, 'rgba(255,150,50,0.2)');
                    sunGrad.addColorStop(1, 'rgba(255,100,50,0)');
                    ctx.fillStyle = sunGrad;
                    ctx.beginPath();
                    ctx.arc(s.x, s.y, s.radius * 2, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.fillStyle = '#ffd93d';
                    ctx.beginPath();
                    ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
                    ctx.fill();
                    break;

                case 'tree':
                    ctx.fillStyle = '#5c3d2e';
                    ctx.fillRect(s.x - 3, s.y - s.height * 0.3, 6, s.height * 0.3);
                    ctx.fillStyle = s.color;
                    ctx.beginPath();
                    ctx.moveTo(s.x - s.width * 0.5, s.y - s.height * 0.25);
                    ctx.lineTo(s.x, s.y - s.height);
                    ctx.lineTo(s.x + s.width * 0.5, s.y - s.height * 0.25);
                    ctx.fill();
                    ctx.beginPath();
                    ctx.moveTo(s.x - s.width * 0.4, s.y - s.height * 0.5);
                    ctx.lineTo(s.x, s.y - s.height * 1.1);
                    ctx.lineTo(s.x + s.width * 0.4, s.y - s.height * 0.5);
                    ctx.fill();
                    break;

                case 'firefly':
                    var glow = 0.3 + Math.sin(s.phase * 3) * 0.3;
                    ctx.fillStyle = 'rgba(200, 255, 100, ' + glow + ')';
                    ctx.beginPath();
                    ctx.arc(s.x, s.y, 3, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.fillStyle = 'rgba(200, 255, 100, ' + (glow * 0.3) + ')';
                    ctx.beginPath();
                    ctx.arc(s.x, s.y, 8, 0, Math.PI * 2);
                    ctx.fill();
                    break;

                case 'building':
                    ctx.fillStyle = s.color;
                    ctx.fillRect(s.x, bridgeY - s.h, s.w, s.h);
                    // Windows
                    var winRows = s.windows;
                    var winCols = Math.floor(s.w / 10);
                    for (var wr = 0; wr < winRows; wr++) {
                        for (var wc = 0; wc < winCols; wc++) {
                            var lit = Math.sin(t * 0.5 + wr + wc + s.x) > 0;
                            ctx.fillStyle = lit ? s.neonColor : 'rgba(30,30,60,0.8)';
                            ctx.globalAlpha = lit ? 0.7 + Math.sin(t * 2 + wr * wc) * 0.3 : 0.5;
                            ctx.fillRect(s.x + 4 + wc * 10, bridgeY - s.h + 6 + wr * (s.h / winRows), 6, 5);
                        }
                    }
                    ctx.globalAlpha = 1;
                    break;

                case 'star':
                    var twinkle = 0.4 + Math.sin(t * 3 + s.twinklePhase) * 0.4;
                    ctx.fillStyle = 'rgba(255,255,255,' + twinkle + ')';
                    ctx.beginPath();
                    ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
                    ctx.fill();
                    break;

                case 'lollipop':
                    ctx.fillStyle = '#fff';
                    ctx.fillRect(s.x - 1.5, s.y - s.stickH, 3, s.stickH);
                    for (var sw = 0; sw < 6; sw++) {
                        ctx.fillStyle = sw % 2 === 0 ? s.color1 : s.color2;
                        ctx.beginPath();
                        ctx.arc(s.x, s.y - s.stickH, s.radius, sw * Math.PI / 3, (sw + 1) * Math.PI / 3);
                        ctx.lineTo(s.x, s.y - s.stickH);
                        ctx.fill();
                    }
                    break;

                case 'mountain':
                    ctx.fillStyle = s.color;
                    ctx.beginPath();
                    ctx.moveTo(s.x - s.hw, bridgeY);
                    ctx.lineTo(s.x, bridgeY - s.mh);
                    ctx.lineTo(s.x + s.hw, bridgeY);
                    ctx.fill();
                    ctx.fillStyle = 'rgba(255,80,0,0.15)';
                    ctx.beginPath();
                    ctx.moveTo(s.x - 8, bridgeY - s.mh);
                    ctx.lineTo(s.x, bridgeY - s.mh - 10);
                    ctx.lineTo(s.x + 8, bridgeY - s.mh);
                    ctx.fill();
                    break;

                case 'ember':
                    if (s.life > 0) {
                        ctx.fillStyle = 'rgba(255,' + Math.floor(100 + s.life * 100) + ',0,' + s.life + ')';
                        ctx.beginPath();
                        ctx.arc(s.x, s.y, 2, 0, Math.PI * 2);
                        ctx.fill();
                    }
                    break;

                case 'icicle':
                    ctx.fillStyle = 'rgba(200, 230, 255, 0.5)';
                    ctx.beginPath();
                    ctx.moveTo(s.x - 3, s.y);
                    ctx.lineTo(s.x, s.y + s.len);
                    ctx.lineTo(s.x + 3, s.y);
                    ctx.fill();
                    break;

                case 'snowflake':
                    ctx.fillStyle = 'rgba(255,255,255,0.7)';
                    ctx.beginPath();
                    ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
                    ctx.fill();
                    break;

                case 'planet':
                    ctx.fillStyle = s.color;
                    ctx.beginPath();
                    ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.fillStyle = lightenColor(s.color, 50);
                    ctx.beginPath();
                    ctx.arc(s.x - s.radius * 0.25, s.y - s.radius * 0.25, s.radius * 0.3, 0, Math.PI * 2);
                    ctx.fill();
                    if (s.ringColor) {
                        ctx.strokeStyle = s.ringColor;
                        ctx.lineWidth = 2;
                        ctx.beginPath();
                        ctx.ellipse(s.x, s.y, s.radius * 1.7, s.radius * 0.4, -0.3, 0, Math.PI * 2);
                        ctx.stroke();
                    }
                    break;

                case 'nebula':
                    var nebGrad = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.w * 0.5);
                    nebGrad.addColorStop(0, s.color);
                    nebGrad.addColorStop(1, 'rgba(0,0,0,0)');
                    ctx.fillStyle = nebGrad;
                    ctx.beginPath();
                    ctx.ellipse(s.x, s.y, s.w * 0.5, s.h * 0.5, 0, 0, Math.PI * 2);
                    ctx.fill();
                    break;

                case 'firework':
                    var burst = (Math.sin(t * 1.5 + s.phase) + 1) * 0.5;
                    var alpha = burst > 0.7 ? (1 - burst) * 3 : 0;
                    if (alpha > 0.05) {
                        var rays = 8;
                        for (var ri = 0; ri < rays; ri++) {
                            var ra = (ri / rays) * Math.PI * 2;
                            var rl = s.burstSize * burst;
                            ctx.strokeStyle = s.color;
                            ctx.globalAlpha = alpha;
                            ctx.lineWidth = 1.5;
                            ctx.beginPath();
                            ctx.moveTo(s.x + Math.cos(ra) * rl * 0.3, s.y + Math.sin(ra) * rl * 0.3);
                            ctx.lineTo(s.x + Math.cos(ra) * rl, s.y + Math.sin(ra) * rl);
                            ctx.stroke();
                        }
                        ctx.globalAlpha = 1;
                    }
                    break;
            }
            ctx.restore();
        });
    }

    // ============================================
    // POWER-UP SYSTEM
    // ============================================

    function createPowerup() {
        var w = canvas.getBoundingClientRect().width;
        var bridgeY = getBridgeY();
        var type = POWERUP_TYPES[Math.floor(rand(0, POWERUP_TYPES.length))];
        return {
            x: rand(30, w - 30),
            y: bridgeY + 20,
            vy: -rand(30, 50),
            type: type,
            radius: 16,
            time: 0,
            collected: false,
        };
    }

    function collectPowerup(pu) {
        pu.collected = true;
        var type = pu.type;

        spawnPopEffect(pu.x, pu.y - 15, type.label, 'powerup-text');

        if (type.id === 'life') {
            state.lives = Math.min(state.lives + 1, 5);
            updateHUD();
        } else if (type.id === 'multi') {
            state.multiPopReady = true;
            state.activePowerups['multi'] = 10;
        } else if (type.id === 'freeze') {
            state.activePowerups['freeze'] = type.duration;
        } else if (type.id === 'double') {
            state.activePowerups['double'] = type.duration;
        } else if (type.id === 'shield') {
            state.shieldActive = true;
            state.activePowerups['shield'] = type.duration;
        }
    }

    function drawPowerup(pu) {
        if (pu.collected) return;
        ctx.save();
        var bob = Math.sin(pu.time * 3) * 3;
        ctx.translate(pu.x, pu.y + bob);

        // Glow
        ctx.fillStyle = pu.type.color;
        ctx.globalAlpha = 0.2 + Math.sin(pu.time * 4) * 0.1;
        ctx.beginPath();
        ctx.arc(0, 0, pu.radius * 1.5, 0, Math.PI * 2);
        ctx.fill();

        // Circle background
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = pu.type.color;
        ctx.beginPath();
        ctx.arc(0, 0, pu.radius, 0, Math.PI * 2);
        ctx.fill();

        // Border
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, pu.radius, 0, Math.PI * 2);
        ctx.stroke();

        // Icon
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#fff';
        ctx.font = 'bold ' + Math.round(pu.radius * 0.9) + 'px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(pu.type.icon, 0, 1);

        ctx.restore();
    }

    function drawActivePowerups() {
        var keys = Object.keys(state.activePowerups);
        if (keys.length === 0) return;
        var startX = 8;
        var y = 52;
        keys.forEach(function(key, i) {
            var remaining = state.activePowerups[key];
            var type = POWERUP_TYPES.find(function(t) { return t.id === key; });
            if (!type) return;

            ctx.save();
            ctx.globalAlpha = 0.85;
            ctx.fillStyle = type.color;
            ctx.beginPath();
            ctx.roundRect(startX + i * 58, y, 54, 22, 6);
            ctx.fill();

            ctx.globalAlpha = 1;
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 11px sans-serif';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText(type.icon + ' ' + Math.ceil(remaining) + 's', startX + i * 58 + 6, y + 11);
            ctx.restore();
        });
    }

    // ============================================
    // BOSS SYSTEM
    // ============================================

    function createBoss() {
        var w = canvas.getBoundingClientRect().width;
        var h = canvas.getBoundingClientRect().height;
        var maxHP = state.level >= 10 ? 12 : 8;
        return {
            x: w * 0.5,
            y: h * 0.25,
            radius: 55,
            hp: maxHP,
            maxHP: maxHP,
            color: state.level >= 10 ? '#ff0044' : '#8b00ff',
            accentColor: state.level >= 10 ? '#ffd700' : '#00ffcc',
            time: 0,
            moveAngle: 0,
            moveSpeed: 40 + state.level * 3,
            hitFlash: 0,
            defeated: false,
            defeatTimer: 0,
        };
    }

    function hitBoss() {
        var boss = state.boss;
        if (!boss || boss.defeated) return;
        boss.hp--;
        boss.hitFlash = 0.25;

        var dmgPoints = 50;
        if (state.activePowerups['double']) dmgPoints *= 2;
        state.score += dmgPoints;
        spawnPopEffect(boss.x, boss.y - boss.radius - 10, '+' + dmgPoints + ' BOSS HIT!', 'boss-hit-text');
        spawnParticles(boss.x, boss.y, boss.accentColor, 8);

        if (boss.hp <= 0) {
            boss.defeated = true;
            boss.defeatTimer = 1.5;
            var bossBonus = 500 * state.level;
            state.score += bossBonus;
            spawnPopEffect(boss.x, boss.y - 30, '+' + bossBonus + ' BOSS DEFEATED!', 'boss-defeat-text');
            spawnParticles(boss.x, boss.y, boss.color, 30);
            spawnParticles(boss.x, boss.y, boss.accentColor, 20);
            spawnParticles(boss.x, boss.y, '#ffd700', 15);
            state.bossDefeated = true;
            updateHUD();
        }
        updateHUD();
    }

    function updateBoss(dt) {
        var boss = state.boss;
        if (!boss) return;
        var w = canvas.getBoundingClientRect().width;
        var h = canvas.getBoundingClientRect().height;

        boss.time += dt;

        if (boss.defeated) {
            boss.defeatTimer -= dt;
            boss.radius += dt * 30;
            return;
        }

        boss.hitFlash = Math.max(0, boss.hitFlash - dt);
        boss.moveAngle += dt * 0.8;

        var targetX = w * 0.5 + Math.sin(boss.moveAngle) * w * 0.3;
        var targetY = h * 0.2 + Math.cos(boss.moveAngle * 0.7) * h * 0.12;
        boss.x += (targetX - boss.x) * dt * 1.5;
        boss.y += (targetY - boss.y) * dt * 1.5;
    }

    function drawBoss() {
        var boss = state.boss;
        if (!boss) return;

        ctx.save();

        if (boss.defeated) {
            ctx.globalAlpha = Math.max(0, boss.defeatTimer / 1.5);
        }

        // Danger aura
        var auraAlpha = 0.1 + Math.sin(boss.time * 3) * 0.05;
        var auraGrad = ctx.createRadialGradient(boss.x, boss.y, boss.radius, boss.x, boss.y, boss.radius * 2);
        auraGrad.addColorStop(0, boss.color.replace(')', ',' + auraAlpha + ')').replace('rgb', 'rgba').replace('#', ''));
        auraGrad.addColorStop(1, 'rgba(0,0,0,0)');
        // Use simpler aura
        ctx.fillStyle = 'rgba(255,0,80,' + auraAlpha + ')';
        ctx.beginPath();
        ctx.arc(boss.x, boss.y, boss.radius * 1.8, 0, Math.PI * 2);
        ctx.fill();

        // Flash on hit
        if (boss.hitFlash > 0) {
            ctx.fillStyle = 'rgba(255,255,255,' + (boss.hitFlash * 3) + ')';
            ctx.beginPath();
            ctx.arc(boss.x, boss.y, boss.radius * 1.3, 0, Math.PI * 2);
            ctx.fill();
        }

        // Boss balloon body
        var bossGrad = ctx.createRadialGradient(
            boss.x - boss.radius * 0.2, boss.y - boss.radius * 0.2, boss.radius * 0.1,
            boss.x, boss.y, boss.radius
        );
        bossGrad.addColorStop(0, lightenColor(boss.color, 60));
        bossGrad.addColorStop(0.6, boss.color);
        bossGrad.addColorStop(1, darkenColor(boss.color, 40));
        ctx.fillStyle = bossGrad;
        ctx.beginPath();
        ctx.ellipse(boss.x, boss.y, boss.radius * 0.9, boss.radius, 0, 0, Math.PI * 2);
        ctx.fill();

        // Spiky armor ridges
        ctx.strokeStyle = boss.accentColor;
        ctx.lineWidth = 2.5;
        var spikes = 8;
        for (var si = 0; si < spikes; si++) {
            var sa = (si / spikes) * Math.PI * 2 + boss.time * 0.5;
            var innerR = boss.radius * 0.85;
            var outerR = boss.radius * 1.1;
            ctx.beginPath();
            ctx.moveTo(boss.x + Math.cos(sa) * innerR, boss.y + Math.sin(sa) * innerR);
            ctx.lineTo(boss.x + Math.cos(sa) * outerR, boss.y + Math.sin(sa) * outerR);
            ctx.stroke();
        }

        // Angry face
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.ellipse(boss.x - 12, boss.y - 5, 8, 9, 0, 0, Math.PI * 2);
        ctx.ellipse(boss.x + 12, boss.y - 5, 8, 9, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#111';
        ctx.beginPath();
        ctx.arc(boss.x - 12, boss.y - 4, 4, 0, Math.PI * 2);
        ctx.arc(boss.x + 12, boss.y - 4, 4, 0, Math.PI * 2);
        ctx.fill();

        // Angry eyebrows
        ctx.strokeStyle = '#111';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(boss.x - 18, boss.y - 16);
        ctx.lineTo(boss.x - 6, boss.y - 12);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(boss.x + 18, boss.y - 16);
        ctx.lineTo(boss.x + 6, boss.y - 12);
        ctx.stroke();

        // Mouth
        ctx.strokeStyle = '#111';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(boss.x, boss.y + 12, 10, 0.2, Math.PI - 0.2);
        ctx.stroke();

        // Health bar
        if (!boss.defeated) {
            var barW = boss.radius * 2;
            var barH = 7;
            var barX = boss.x - barW * 0.5;
            var barY = boss.y - boss.radius - 18;
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.beginPath();
            ctx.roundRect(barX - 1, barY - 1, barW + 2, barH + 2, 4);
            ctx.fill();
            var hpRatio = boss.hp / boss.maxHP;
            var hpColor = hpRatio > 0.5 ? '#4ecdc4' : hpRatio > 0.25 ? '#ffd93d' : '#ff4444';
            ctx.fillStyle = hpColor;
            ctx.beginPath();
            ctx.roundRect(barX, barY, barW * hpRatio, barH, 3);
            ctx.fill();
        }

        ctx.restore();
    }

    // ============================================
    // BAD GUY SYSTEM
    // ============================================

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
        state.badGuys = [];
        for (var i = 0; i < config.badGuys; i++) {
            state.badGuys.push(createBadGuy(i, config.badGuys));
        }
    }

    // ============================================
    // BALLOON, WATER, PARTICLES
    // ============================================

    function createBalloon() {
        var config = getLevelConfig();
        var w = canvas.getBoundingClientRect().width;
        var bridgeTop = canvas.getBoundingClientRect().height * BRIDGE_Y_OFFSET - 20;
        var radius = rand(22, 40);
        var isGolden = Math.random() < 0.08;
        var speedMult = state.activePowerups['freeze'] ? 0.3 : 1;
        return {
            x: rand(radius + 10, w - radius - 10),
            y: bridgeTop + radius + rand(10, 60),
            radius: radius,
            color: isGolden ? '#ffd700' : config.colors[Math.floor(Math.random() * config.colors.length)],
            speed: rand(40, 70) * config.speed * speedMult,
            baseSpeed: rand(40, 70) * config.speed,
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

    function spawnWaterDrops(x, y, count) {
        for (var i = 0; i < count; i++) {
            state.waterDrops.push({
                x: x + rand(-12, 12), y: y + rand(-5, 5),
                vx: rand(-30, 30), vy: rand(20, 80),
                radius: rand(2.5, 5), life: 1,
            });
        }
    }

    function spawnSplash(x, y) {
        for (var i = 0; i < 6; i++) {
            state.splashes.push({
                x: x + rand(-8, 8), y: y,
                vx: rand(-60, 60), vy: rand(-80, -30),
                radius: rand(1.5, 3.5), life: 1, decay: rand(2, 4),
            });
        }
    }

    function spawnParticles(x, y, color, count) {
        for (var i = 0; i < count; i++) {
            state.particles.push({
                x: x, y: y,
                vx: rand(-120, 120), vy: rand(-160, 40),
                radius: rand(2, 5), color: color,
                life: 1, decay: rand(1.5, 3),
            });
        }
    }

    function spawnPopEffect(x, y, text, cssClass) {
        var el = document.createElement('div');
        el.className = 'pop-effect' + (cssClass ? ' ' + cssClass : '');
        el.textContent = text;
        el.style.left = x + 'px';
        el.style.top = y + 'px';
        document.getElementById('game-container').appendChild(el);
        setTimeout(function() { el.remove(); }, 800);
    }

    // ============================================
    // INPUT
    // ============================================

    function getInputPos(e) {
        var rect = canvas.getBoundingClientRect();
        if (e.touches && e.touches.length > 0) {
            return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
        }
        return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }

    function handlePop(e) {
        if (!state.running || state.paused) return;
        e.preventDefault();
        var pos = getInputPos(e);
        state.levelClicks++;

        // Check power-up collection first
        for (var pi = state.powerups.length - 1; pi >= 0; pi--) {
            var pu = state.powerups[pi];
            if (pu.collected) continue;
            var pdx = pos.x - pu.x;
            var pdy = pos.y - pu.y;
            if (Math.sqrt(pdx * pdx + pdy * pdy) <= pu.radius + 10) {
                collectPowerup(pu);
                return;
            }
        }

        // Check boss hit
        if (state.boss && !state.boss.defeated) {
            var bdx = pos.x - state.boss.x;
            var bdy = pos.y - state.boss.y;
            if (Math.sqrt(bdx * bdx + bdy * bdy) <= state.boss.radius + 10) {
                hitBoss();
                // Boss hit also spawns some water
                spawnWaterDrops(state.boss.x, state.boss.y + state.boss.radius, 4);
                return;
            }
        }

        // Multi-pop: pop all balloons in a radius
        if (state.multiPopReady) {
            state.multiPopReady = false;
            delete state.activePowerups['multi'];
            var multiRadius = 120;
            var multiCount = 0;

            state.balloons.forEach(function(b) {
                if (b.popped || b.escaped) return;
                var dx = pos.x - b.x;
                var dy = pos.y - b.y;
                if (Math.sqrt(dx * dx + dy * dy) <= multiRadius) {
                    b.popped = true;
                    multiCount++;
                    var pts = Math.round(10 * (1 + (state.level - 1) * 0.2)) * (b.golden ? 5 : 1);
                    if (state.activePowerups['double']) pts *= 2;
                    state.score += pts;
                    state.levelPopped++;
                    state.totalPopped++;
                    spawnParticles(b.x, b.y, b.color, 8);
                    spawnWaterDrops(b.x, b.y, b.golden ? 12 : 6);
                }
            });

            if (multiCount > 0) {
                spawnPopEffect(pos.x, pos.y, multiCount + 'x MULTI-POP!', 'multi-pop-text');
                // Shockwave particles
                for (var mi = 0; mi < 16; mi++) {
                    var ang = (mi / 16) * Math.PI * 2;
                    state.particles.push({
                        x: pos.x, y: pos.y,
                        vx: Math.cos(ang) * 150, vy: Math.sin(ang) * 150,
                        radius: 3, color: '#ff6b6b', life: 1, decay: 2.5,
                    });
                }
            }

            updateHUD();
            checkLevelComplete();
            return;
        }

        // Normal pop
        var popped = false;
        for (var i = state.balloons.length - 1; i >= 0; i--) {
            var b = state.balloons[i];
            if (b.popped || b.escaped) continue;

            var dx2 = pos.x - b.x;
            var dy2 = pos.y - b.y;
            if (Math.sqrt(dx2 * dx2 + dy2 * dy2) <= b.radius + 8) {
                b.popped = true;
                popped = true;

                var basePoints = Math.round(10 * (1 + (state.level - 1) * 0.2));
                var goldenMult = b.golden ? 5 : 1;

                state.currentCombo++;
                state.comboTimer = 1.5;
                var comboMult = Math.min(state.currentCombo, 5);
                state.bestCombo = Math.max(state.bestCombo, state.currentCombo);

                var points = basePoints * goldenMult * comboMult;
                if (state.activePowerups['double']) points *= 2;
                state.score += points;
                state.levelPopped++;
                state.totalPopped++;

                spawnParticles(b.x, b.y, b.color, b.golden ? 20 : 10);
                spawnPopEffect(pos.x, pos.y, '+' + points);
                spawnWaterDrops(b.x, b.y, b.golden ? 12 : 6);

                updateHUD();
                checkLevelComplete();
                break;
            }
        }
        if (!popped) state.currentCombo = 0;
    }

    canvas.addEventListener('mousedown', handlePop);
    canvas.addEventListener('touchstart', handlePop, { passive: false });

    // --- HUD ---
    function updateHUD() {
        hudScore.textContent = state.score;
        hudLevel.textContent = state.level;
        hudLives.textContent = state.lives;
        var config = getLevelConfig();
        hudTarget.textContent = state.levelPopped + '/' + config.target;
    }

    // --- Check Level Complete ---
    function checkLevelComplete() {
        var config = getLevelConfig();
        if (state.levelPopped >= config.target) {
            // If boss level, need boss defeated too
            if (config.boss && !state.bossDefeated) return;
            state.running = false;
            showLevelComplete();
        }
    }

    function showLevelComplete() {
        var config = getLevelConfig();
        var accuracy = state.levelClicks > 0 ? Math.round((state.levelPopped / state.levelClicks) * 100) : 0;

        var starCount = 1;
        if (accuracy >= 60) starCount = 2;
        if (accuracy >= 85) starCount = 3;

        var bonus = starCount * 50 + (state.lives * 25);
        state.score += bonus;

        document.getElementById('lc-popped').textContent = state.levelPopped;
        document.getElementById('lc-accuracy').textContent = accuracy + '%';
        document.getElementById('lc-score').textContent = state.score;
        document.getElementById('lc-bonus').textContent = '+' + bonus;
        document.getElementById('lc-soaked').textContent = state.waterHits;

        var nextIdx = Math.min(state.level, LEVELS.length - 1);
        document.getElementById('lc-next-name').textContent = LEVELS[nextIdx].name;
        var nextConfig = LEVELS[nextIdx];
        var bossLabel = document.getElementById('lc-boss-label');
        if (bossLabel) {
            bossLabel.style.display = nextConfig.boss ? 'block' : 'none';
        }

        var starsContainer = document.getElementById('stars-container');
        starsContainer.querySelectorAll('.star').forEach(function(star, i) {
            star.classList.toggle('earned', i < starCount);
        });

        showModal(modalLevelComplete);
        updateHUD();
    }

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

    function resetGame() {
        state.score = 0; state.level = 1; state.lives = 3;
        state.totalPopped = 0; state.levelPopped = 0; state.levelClicks = 0;
        state.bestCombo = 0; state.currentCombo = 0; state.comboTimer = 0;
        state.paused = false; state.running = false; state.gameOver = false;
        state.spawnTimer = 0;
        state.balloons = []; state.particles = [];
        state.waterDrops = []; state.badGuys = []; state.splashes = [];
        state.waterHits = 0; state.totalWaterHits = 0;
        state.powerups = []; state.activePowerups = {};
        state.powerupSpawnTimer = 0; state.multiPopReady = false; state.shieldActive = false;
        state.boss = null; state.bossDefeated = false; state.bossFlashTimer = 0;
        state.scenery = []; state.sceneryTime = 0;
        updateHUD();
    }

    function startLevel() {
        state.levelPopped = 0; state.levelClicks = 0;
        state.currentCombo = 0; state.comboTimer = 0; state.spawnTimer = 0;
        state.waterHits = 0;
        state.balloons = []; state.particles = [];
        state.waterDrops = []; state.splashes = [];
        state.powerups = []; state.activePowerups = {};
        state.powerupSpawnTimer = rand(6, 12);
        state.multiPopReady = false; state.shieldActive = false;
        state.running = true; state.paused = false;

        // Boss
        var config = getLevelConfig();
        state.bossDefeated = false;
        state.bossFlashTimer = 0;
        if (config.boss) {
            state.boss = createBoss();
            state.bossFlashTimer = 2.0;
        } else {
            state.boss = null;
        }

        spawnBadGuys();
        generateScenery();
        updateHUD();
    }

    // ============================================
    // UPDATE
    // ============================================

    function update(dt) {
        var config = getLevelConfig();
        var w = canvas.getBoundingClientRect().width;
        var h = canvas.getBoundingClientRect().height;
        var bridgeY = getBridgeY();

        // Scenery
        updateScenery(dt);

        // Boss flash timer
        if (state.bossFlashTimer > 0) state.bossFlashTimer -= dt;

        // Active power-up timers
        Object.keys(state.activePowerups).forEach(function(key) {
            state.activePowerups[key] -= dt;
            if (state.activePowerups[key] <= 0) {
                delete state.activePowerups[key];
                if (key === 'shield') state.shieldActive = false;
                if (key === 'multi') state.multiPopReady = false;
            }
        });

        // Freeze effect on existing balloons
        var freezeActive = !!state.activePowerups['freeze'];
        state.balloons.forEach(function(b) {
            if (!b.popped && !b.escaped) {
                b.speed = b.baseSpeed * (freezeActive ? 0.3 : 1);
            }
        });

        // Combo timer
        if (state.comboTimer > 0) {
            state.comboTimer -= dt;
            if (state.comboTimer <= 0) state.currentCombo = 0;
        }

        // Spawn balloons
        state.spawnTimer -= dt;
        if (state.spawnTimer <= 0) {
            state.balloons.push(createBalloon());
            state.spawnTimer = config.spawnRate * rand(0.6, 1.2);
        }

        // Spawn power-ups
        state.powerupSpawnTimer -= dt;
        if (state.powerupSpawnTimer <= 0) {
            state.powerups.push(createPowerup());
            state.powerupSpawnTimer = rand(10, 20);
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
                if (state.shieldActive) {
                    state.shieldActive = false;
                    delete state.activePowerups['shield'];
                    spawnPopEffect(w * 0.5, 90, 'SHIELD BLOCKED!', 'shield-text');
                } else {
                    state.lives--;
                    updateHUD();
                    if (state.lives <= 0) triggerGameOver();
                }
            }
        });
        state.balloons = state.balloons.filter(function(b) { return !b.popped && !b.escaped; });

        // Update power-ups
        state.powerups.forEach(function(pu) {
            if (pu.collected) return;
            pu.time += dt;
            pu.y += pu.vy * dt;
            if (pu.y < -30) pu.collected = true;
        });
        state.powerups = state.powerups.filter(function(pu) { return !pu.collected; });

        // Update boss
        if (state.boss) {
            updateBoss(dt);
            if (state.boss.defeated && state.boss.defeatTimer <= 0) {
                state.boss = null;
                checkLevelComplete();
            }
        }

        // Update bad guys
        state.badGuys.forEach(function(g) {
            g.walkPhase += dt * 5;
            if (g.soakTimer > 0) {
                g.soakTimer -= dt;
                g.shakeTimer -= dt;
                g.dripTimer -= dt;
                if (g.jumpVy !== 0) {
                    g.jumpOffset += g.jumpVy * dt;
                    g.jumpVy += 400 * dt;
                    if (g.jumpOffset >= 0) { g.jumpOffset = 0; g.jumpVy = 0; }
                }
                return;
            }
            g.jumpOffset = 0;
            g.x += g.speed * dt;
            var margin = g.width;
            if (g.x <= margin) { g.x = margin; g.speed = Math.abs(g.speed); }
            else if (g.x >= w - margin) { g.x = w - margin; g.speed = -Math.abs(g.speed); }
        });

        // Update water drops
        state.waterDrops.forEach(function(d) {
            d.x += d.vx * dt;
            d.vy += 320 * dt;
            d.y += d.vy * dt;
            d.vx *= 0.98;

            state.badGuys.forEach(function(g) {
                if (d.life <= 0) return;
                var gTop = bridgeY - g.height + g.jumpOffset;
                var gLeft = g.x - g.width * 0.5;
                var gRight = g.x + g.width * 0.5;
                if (d.x >= gLeft - 4 && d.x <= gRight + 4 && d.y >= gTop - 4 && d.y <= bridgeY + 2) {
                    d.life = 0;
                    if (g.soakTimer <= 0) {
                        g.soakTimer = 2.0; g.shakeTimer = 0.6; g.dripTimer = 1.8;
                        g.jumpVy = -140; g.jumpOffset = 0;
                        var waterBonus = Math.round(25 * (1 + (state.level - 1) * 0.15));
                        if (state.activePowerups['double']) waterBonus *= 2;
                        state.score += waterBonus;
                        state.waterHits++; state.totalWaterHits++;
                        spawnSplash(g.x, gTop + g.height * 0.3);
                        spawnPopEffect(g.x, gTop - 10, '+' + waterBonus + ' SPLASH!', 'water-bonus');
                        updateHUD();
                    }
                }
            });

            if (d.y > bridgeY + 10 || d.y > h + 20) d.life = 0;
        });
        state.waterDrops = state.waterDrops.filter(function(d) { return d.life > 0; });

        // Update splashes & particles
        state.splashes.forEach(function(s) { s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 200 * dt; s.life -= s.decay * dt; });
        state.splashes = state.splashes.filter(function(s) { return s.life > 0; });
        state.particles.forEach(function(p) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 200 * dt; p.life -= p.decay * dt; });
        state.particles = state.particles.filter(function(p) { return p.life > 0; });
    }

    // ============================================
    // DRAWING
    // ============================================

    function drawBackground() {
        var config = getLevelConfig();
        var w = canvas.getBoundingClientRect().width;
        var h = canvas.getBoundingClientRect().height;
        var gradient = ctx.createLinearGradient(0, 0, 0, h);
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

        ctx.strokeStyle = '#8B6914';
        ctx.lineWidth = 2 * BAD_GUY_SCALE;
        ctx.beginPath();
        ctx.moveTo(0, ropeY);
        for (var rx = 0; rx < w; rx += 30) {
            ctx.lineTo(rx + 15, ropeY - 2);
            ctx.lineTo(rx + 30, ropeY);
        }
        ctx.stroke();

        var plankW = 22 * BAD_GUY_SCALE;
        var gap = 2;
        var plankColors = ['#a0522d', '#8b4513', '#996633'];
        for (var px = 0; px < w; px += plankW + gap) {
            ctx.fillStyle = plankColors[Math.floor(px / (plankW + gap)) % plankColors.length];
            ctx.fillRect(px, bridgeY, plankW, plankH);
            ctx.strokeStyle = 'rgba(0,0,0,0.1)';
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(px + 3, bridgeY + 2);
            ctx.lineTo(px + plankW - 3, bridgeY + 2);
            ctx.moveTo(px + 2, bridgeY + plankH - 2);
            ctx.lineTo(px + plankW - 2, bridgeY + plankH - 2);
            ctx.stroke();
        }

        ctx.strokeStyle = '#8B6914';
        ctx.lineWidth = 1.5 * BAD_GUY_SCALE;
        ctx.beginPath();
        ctx.moveTo(0, bridgeY + plankH + 1);
        ctx.lineTo(w, bridgeY + plankH + 1);
        ctx.stroke();

        var fadeGrad = ctx.createLinearGradient(0, bridgeY + plankH, 0, h);
        fadeGrad.addColorStop(0, 'rgba(0,0,0,0.25)');
        fadeGrad.addColorStop(1, 'rgba(0,0,0,0.0)');
        ctx.fillStyle = fadeGrad;
        ctx.fillRect(0, bridgeY + plankH, w, h - bridgeY - plankH);
    }

    function drawBadGuy(g) {
        var bridgeY = getBridgeY();
        var s = BAD_GUY_SCALE;
        var baseY = bridgeY + g.jumpOffset;
        var soaked = g.soakTimer > 0;
        var shaking = g.shakeTimer > 0;

        ctx.save();
        var shakeX = shaking ? Math.sin(g.shakeTimer * 40) * 2.5 * s : 0;
        ctx.translate(g.x + shakeX, baseY);
        var facingRight = g.speed >= 0;
        if (soaked) facingRight = true;

        var legSpread = soaked ? 0 : Math.sin(g.walkPhase) * 4 * s;
        ctx.strokeStyle = g.color; ctx.lineWidth = 2.5 * s; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(-3 * s, -4 * s); ctx.lineTo((-3 - legSpread) * s, 0); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(3 * s, -4 * s); ctx.lineTo((3 + legSpread) * s, 0); ctx.stroke();

        ctx.fillStyle = g.color;
        ctx.beginPath(); ctx.roundRect(-6 * s, -16 * s, 12 * s, 13 * s, 3 * s); ctx.fill();

        ctx.strokeStyle = g.color; ctx.lineWidth = 2.5 * s;
        if (soaked) {
            ctx.beginPath(); ctx.moveTo(-6*s, -12*s); ctx.lineTo(-11*s, -20*s); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(6*s, -12*s); ctx.lineTo(11*s, -20*s); ctx.stroke();
        } else {
            var armSwing = Math.sin(g.walkPhase + Math.PI) * 3 * s;
            ctx.beginPath(); ctx.moveTo(-6*s, -12*s); ctx.lineTo((-10 - armSwing)*s, -6*s); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(6*s, -12*s); ctx.lineTo((10 + armSwing)*s, -6*s); ctx.stroke();
        }

        var headR = 6.5 * s, headY = -21 * s;
        ctx.fillStyle = soaked ? '#7eb8d8' : '#fce4b8';
        ctx.beginPath(); ctx.arc(0, headY, headR, 0, Math.PI * 2); ctx.fill();

        ctx.fillStyle = g.hatColor;
        ctx.beginPath(); ctx.ellipse(0, headY - headR + 1*s, headR*1.3, 3*s, 0, Math.PI, Math.PI*2); ctx.fill();
        ctx.fillRect(-4.5*s, headY - headR - 5*s, 9*s, 6*s);

        var eyeY = headY - 1 * s;
        if (soaked) {
            ctx.fillStyle = '#fff';
            ctx.beginPath(); ctx.arc(-2.5*s, eyeY, 2.2*s, 0, Math.PI*2); ctx.arc(2.5*s, eyeY, 2.2*s, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = '#222';
            ctx.beginPath(); ctx.arc(-2.5*s, eyeY, 1.2*s, 0, Math.PI*2); ctx.arc(2.5*s, eyeY, 1.2*s, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = '#222';
            ctx.beginPath(); ctx.ellipse(0, headY + 3*s, 2.5*s, 2*s, 0, 0, Math.PI*2); ctx.fill();
        } else {
            ctx.fillStyle = '#222';
            var ex = facingRight ? 0.5*s : -0.5*s;
            ctx.beginPath(); ctx.arc(-2.5*s+ex, eyeY, 1.2*s, 0, Math.PI*2); ctx.arc(2.5*s+ex, eyeY, 1.2*s, 0, Math.PI*2); ctx.fill();
            ctx.strokeStyle = '#222'; ctx.lineWidth = 1*s;
            ctx.beginPath(); ctx.arc(0, headY + 2*s, 2*s, 0.1, Math.PI - 0.1); ctx.stroke();
        }

        if (g.dripTimer > 0) {
            ctx.fillStyle = 'rgba(100, 180, 255, ' + Math.min(1, g.dripTimer) + ')';
            var dripPhase = g.soakTimer * 8;
            for (var di = 0; di < 4; di++) {
                var dx = (di - 1.5) * 4 * s;
                var dy = headY + headR + Math.abs(Math.sin(dripPhase + di * 1.5)) * 6 * s;
                ctx.beginPath(); ctx.ellipse(dx, dy, 1.2*s, 2*s, 0, 0, Math.PI*2); ctx.fill();
            }
        }
        ctx.restore();
    }

    function drawWaterDrops() {
        ctx.fillStyle = 'rgba(80, 170, 255, 0.8)';
        state.waterDrops.forEach(function(d) {
            ctx.save(); ctx.translate(d.x, d.y);
            ctx.beginPath();
            ctx.moveTo(0, -d.radius);
            ctx.quadraticCurveTo(d.radius, 0, 0, d.radius * 1.3);
            ctx.quadraticCurveTo(-d.radius, 0, 0, -d.radius);
            ctx.fill(); ctx.restore();
        });
    }

    function drawSplashes() {
        state.splashes.forEach(function(s) {
            ctx.save(); ctx.globalAlpha = Math.max(0, s.life);
            ctx.fillStyle = 'rgba(100, 190, 255, 0.9)';
            ctx.beginPath(); ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
        });
    }

    function drawBalloon(b) {
        if (b.popped || b.escaped) return;
        ctx.save(); ctx.globalAlpha = b.opacity;
        ctx.beginPath(); ctx.ellipse(b.x, b.y, b.radius * 0.85, b.radius, 0, 0, Math.PI * 2);
        if (b.golden) {
            var glow = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.radius);
            glow.addColorStop(0, '#fff8dc'); glow.addColorStop(0.4, '#ffd700'); glow.addColorStop(1, '#daa520');
            ctx.fillStyle = glow;
        } else {
            var grad = ctx.createRadialGradient(b.x - b.radius*0.25, b.y - b.radius*0.3, b.radius*0.1, b.x, b.y, b.radius);
            grad.addColorStop(0, lightenColor(b.color, 60)); grad.addColorStop(0.7, b.color); grad.addColorStop(1, darkenColor(b.color, 30));
            ctx.fillStyle = grad;
        }
        ctx.fill();
        ctx.beginPath(); ctx.ellipse(b.x - b.radius*0.25, b.y - b.radius*0.35, b.radius*0.2, b.radius*0.3, -0.3, 0, Math.PI*2);
        ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.fill();
        ctx.beginPath(); ctx.moveTo(b.x-3, b.y+b.radius-2); ctx.lineTo(b.x, b.y+b.radius+5); ctx.lineTo(b.x+3, b.y+b.radius-2);
        ctx.fillStyle = darkenColor(b.color, 40); ctx.fill();
        ctx.beginPath(); ctx.moveTo(b.x, b.y+b.radius+5);
        ctx.quadraticCurveTo(b.x+Math.sin(b.time*2)*5, b.y+b.radius+20, b.x+Math.sin(b.time*1.5)*3, b.y+b.radius+35);
        ctx.strokeStyle = 'rgba(0,0,0,0.2)'; ctx.lineWidth = 1; ctx.stroke();
        if (b.golden) {
            ctx.beginPath(); ctx.ellipse(b.x, b.y, b.radius*1.2, b.radius*1.35, 0, 0, Math.PI*2);
            ctx.strokeStyle = 'rgba(255,215,0,' + (0.3+Math.sin(b.time*4)*0.15) + ')'; ctx.lineWidth = 2; ctx.stroke();
        }

        // Freeze tint
        if (state.activePowerups['freeze']) {
            ctx.fillStyle = 'rgba(100,200,255,0.15)';
            ctx.beginPath(); ctx.ellipse(b.x, b.y, b.radius*0.85, b.radius, 0, 0, Math.PI*2); ctx.fill();
        }
        ctx.restore();
    }

    function drawParticles() {
        state.particles.forEach(function(p) {
            ctx.save(); ctx.globalAlpha = p.life;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fillStyle = p.color; ctx.fill(); ctx.restore();
        });
    }

    // --- Main Draw ---
    function draw() {
        var w = canvas.getBoundingClientRect().width;
        var h = canvas.getBoundingClientRect().height;
        ctx.clearRect(0, 0, w, h);

        drawBackground();
        drawScenery();
        drawBridge();
        state.badGuys.forEach(drawBadGuy);

        // Boss
        if (state.boss) drawBoss();

        state.balloons.forEach(drawBalloon);
        state.powerups.forEach(drawPowerup);
        drawWaterDrops();
        drawSplashes();
        drawParticles();

        // Active power-up indicators
        drawActivePowerups();

        // Multi-pop ready indicator
        if (state.multiPopReady) {
            ctx.save();
            ctx.font = 'bold 0.9rem sans-serif';
            ctx.fillStyle = 'rgba(255,107,107,0.9)';
            ctx.textAlign = 'center';
            ctx.fillText('TAP to MULTI-POP!', w * 0.5, h - 20);
            ctx.restore();
        }

        // Boss level flash
        if (state.bossFlashTimer > 0 && state.boss) {
            ctx.save();
            ctx.globalAlpha = Math.min(1, state.bossFlashTimer);
            ctx.font = 'bold 2.5rem sans-serif';
            ctx.fillStyle = '#ff0044';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('BOSS LEVEL!', w * 0.5, h * 0.45);
            ctx.restore();
        }

        // Combo
        if (state.currentCombo >= 2 && state.running && !state.paused) {
            ctx.save();
            ctx.font = 'bold 1.2rem sans-serif';
            ctx.fillStyle = 'rgba(255,255,255,0.85)';
            ctx.textAlign = 'center';
            ctx.fillText(state.currentCombo + 'x COMBO!', w / 2, 70);
            ctx.restore();
        }

        // Shield indicator
        if (state.shieldActive) {
            ctx.save();
            ctx.strokeStyle = 'rgba(126,200,227,0.4)';
            ctx.lineWidth = 3;
            ctx.setLineDash([8, 5]);
            ctx.beginPath();
            ctx.moveTo(0, 4);
            ctx.lineTo(w, 4);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.restore();
        }
    }

    // ============================================
    // GAME LOOP
    // ============================================

    function gameLoop(timestamp) {
        if (!state.lastTime) state.lastTime = timestamp;
        var dt = Math.min((timestamp - state.lastTime) / 1000, 0.05);
        state.lastTime = timestamp;
        if (state.running && !state.paused) update(dt);
        draw();
        requestAnimationFrame(gameLoop);
    }

    // --- Buttons ---
    btnStart.addEventListener('click', function() { hideAllModals(); resetGame(); startLevel(); });
    pauseBtn.addEventListener('click', function() {
        if (!state.running) return;
        state.paused = true;
        document.getElementById('pause-score').textContent = state.score;
        document.getElementById('pause-level').textContent = state.level;
        document.getElementById('pause-lives').textContent = state.lives;
        document.getElementById('pause-popped').textContent = state.totalPopped;
        showModal(modalPause);
    });
    btnResume.addEventListener('click', function() { hideModal(modalPause); state.paused = false; });
    btnRestartPause.addEventListener('click', function() { hideAllModals(); resetGame(); startLevel(); });
    btnNextLevel.addEventListener('click', function() { hideAllModals(); state.level++; startLevel(); });
    btnPlayAgain.addEventListener('click', function() { hideAllModals(); resetGame(); startLevel(); });
    btnMainMenu.addEventListener('click', function() { hideAllModals(); resetGame(); showModal(modalStart); });

    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
            if (state.running && !state.paused) pauseBtn.click();
            else if (state.paused) btnResume.click();
        }
    });

    showModal(modalStart);
    requestAnimationFrame(gameLoop);
})();
