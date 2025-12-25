const tg = window.Telegram.WebApp;
tg.expand();

// --- СОСТОЯНИЕ ---
let player = {
    dust: 100, // Стартовый капитал для тестов
    level: 1,
    speed: 0, time: 0, doubleHit: 0,
    strength: 0, greed: 0, aoe: 0, luck: 0,
    elements: 0,
    superStr: 0
};

// Загрузка сохранения
try {
    const saved = localStorage.getItem('bioBunkerSave_v10');
    if(saved) player = JSON.parse(saved);
} catch(e) { console.log('No save found'); }

const CONFIG = { baseCD: 0.3, baseTime: 10, baseHP: 100 };

// --- БОЕВКА ---
let crystals = [], timer = 0, lastTapTime = 0, gameInterval, sessionDust = 0;

function restartLevel() {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById('screen-game').classList.add('active');
    
    const hp = CONFIG.baseHP + ((player.level - 1) * 200);
    const time = CONFIG.baseTime + (player.time * 0.5);
    timer = time; sessionDust = 0;
    document.getElementById('game-dust').innerText = "0";
    
    const area = document.getElementById('game-area');
    area.innerHTML = ''; crystals = [];
    const areaW = area.clientWidth - 70; const areaH = area.clientHeight - 70;

    const crystalEmoji = player.level === 1 ? '🟢' : '🔴';
    const crystalColor = player.level === 1 ? '#0f0' : '#f00';

    for(let i=0; i<10; i++) {
        const c = document.createElement('div');
        c.className = 'crystal';
        c.innerText = crystalEmoji;
        c.style.color = crystalColor;
        c.style.left = Math.random() * areaW + 'px';
        c.style.top = Math.random() * areaH + 'px';
        
        const bar = document.createElement('div'); bar.className = 'hp-bar';
        const fill = document.createElement('div'); fill.className = 'hp-val';
        fill.style.background = crystalColor;
        bar.appendChild(fill); c.appendChild(bar);
        area.appendChild(c);
        crystals.push({ el: c, fill: fill, hp: hp, maxHp: hp, active: true });
    }
    clearInterval(gameInterval);
    gameInterval = setInterval(updateTimer, 100);
}

function updateTimer() {
    timer -= 0.1;
    const tEl = document.getElementById('timer-box');
    tEl.innerText = timer.toFixed(1);
    if(timer<=3) tEl.classList.add('danger-time'); else tEl.classList.remove('danger-time');
    if(timer <= 0) endRound(false);
}

// Эта функция должна быть глобальной, чтобы HTML её видел
window.handleTap = function(e) {
    const now = Date.now();
    const cd = Math.max(0.05, CONFIG.baseCD - (player.speed * 0.01)) * 1000;
    if (now - lastTapTime < cd) {
        const overlay = document.getElementById('cd-layer');
        overlay.style.opacity = 1; setTimeout(()=> overlay.style.opacity = 0, 100);
        return;
    }
    lastTapTime = now;
    tg.HapticFeedback.impactOccurred('light');

    let damage = 1 + player.strength + (player.superStr * 100);
    let hits = 1;
    if (Math.random()*100 < player.doubleHit) { hits = 2; showFloat(e.clientX, e.clientY, "x2!", "#ff0"); }
    let elementalProc = Math.random()*100 < (player.elements * 0.1);
    let aoeProc = Math.random()*100 < (player.aoe * 0.5);

    let live = crystals.filter(c => c.active);
    if(live.length === 0) return;

    if (aoeProc || elementalProc) {
        live.forEach(c => hitCrystal(c, damage, elementalProc ? 10 : damage));
        showFloat(e.clientX, e.clientY, elementalProc ? "BOOM!" : "AOE!", "#f0f");
    } else {
        for(let i=0; i<hits; i++) {
            if(live.length > 0) hitCrystal(live[Math.floor(Math.random()*live.length)], damage);
        }
    }
};

function hitCrystal(c, dmg, bonusDmg = 0) {
    if(!c.active) return;
    const totalDmg = dmg + bonusDmg;
    c.hp -= totalDmg;
    
    showDamage(c.el.offsetLeft + 30, c.el.offsetTop, totalDmg);

    c.el.style.transform = `scale(0.9) rotate(${Math.random()*20-10}deg)`;
    setTimeout(() => c.el.style.transform = 'scale(1) rotate(0deg)', 50);
    c.fill.style.width = Math.max(0, (c.hp / c.maxHp * 100)) + '%';

    let loot = 1;
    if(player.greed > 0) loot += 1;
    if(Math.random()*100 < (player.luck * 0.5)) loot *= 2;
    if(player.level > 1) loot *= 2;
    sessionDust += loot; player.dust += loot;
    document.getElementById('game-dust').innerText = sessionDust;

    if(c.hp <= 0) {
        c.active = false; c.el.style.opacity = 0; c.el.style.pointerEvents = 'none';
        if(crystals.every(cr => !cr.active)) endRound(true);
    }
}

function showDamage(x, y, dmg) {
    const el = document.createElement('div');
    el.className = 'dmg-num'; el.innerText = "-" + dmg;
    el.style.left = x + 'px'; el.style.top = y + 'px';
    document.getElementById('game-area').appendChild(el);
    setTimeout(()=> el.remove(), 600);
}
function showFloat(x, y, text, color) {
    const el = document.createElement('div'); el.className = 'dmg-num'; 
    el.innerText = text; el.style.color = color; el.style.fontSize = '20px';
    el.style.left = x + 'px'; el.style.top = y + 'px';
    document.getElementById('game-area').appendChild(el);
    setTimeout(()=> el.remove(), 600);
}

function endRound(win) {
    clearInterval(gameInterval);
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById('screen-result').classList.add('active');
