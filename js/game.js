const tg = window.Telegram.WebApp;
tg.expand();

// --- СОСТОЯНИЕ ---
let player = {
    dust: 100,
    level: 1,
    speed: 0, time: 0, doubleHit: 0,
    strength: 0, greed: 0, aoe: 0, luck: 0,
    elements: 0,
    superStr: 0
};

// Загрузка
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

// ГЛОБАЛЬНЫЕ ФУНКЦИИ
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
    document.getElementById('res-dust').innerText = sessionDust;
    const title = document.getElementById('res-title');
    const info = document.getElementById('res-level-info');
    if(win) {
        title.innerText = "УРОВЕНЬ ЗАЧИЩЕН!"; title.style.color = "#0f0";
        info.innerText = "Уровень повышен! Кристаллы стали крепче.";
        player.level++;
    } else {
        title.innerText = "ВРЕМЯ ВЫШЛО"; title.style.color = "#f00";
        info.innerText = "Не хватает урона. Посетите магазин.";
    }
    localStorage.setItem('bioBunkerSave_v10', JSON.stringify(player));
}

// --- МАГАЗИН ---
const UPGRADES = [
    { id: 'speed', max: 5, cost: l=>(l+1)*10, parent: null },
    { id: 'strength', max: 10, cost: l=>(l+1)*10 + 10, parent: null },
    { id: 'elements', max: 11, cost: l=>30, parent: null },
    { id: 'time', max: 5, cost: l=>(l+1)*10 + 10, parent: 'speed' },
    { id: 'greed', max: 1, cost: l=>50, parent: 'strength' },
    { id: 'doubleHit', max: 10, cost: l=>(l+1)*10 + 20, parent: 'time' },
    { id: 'aoe', max: 5, cost: l=>(l+1)*20, parent: 'greed' },
    { id: 'luck', max: 5, cost: l=>(l+1)*20, parent: 'greed' },
    { id: 'superStr', max: 1, cost: l=>5, parent: null }
];

window.openShop = function() {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById('screen-shop').classList.add('active');
    document.getElementById('shop-lvl').innerText = player.level;
    renderTree();
};

function renderTree() {
    document.getElementById('shop-dust').innerText = player.dust;
    UPGRADES.forEach(u => {
        const node = document.getElementById(`node-${u.id}`);
        if(!node) return;
        const lvl = player[u.id];
        const cost = u.cost(lvl);
        const isMax = lvl >= u.max;
        const parentOk = !u.parent || player[u.parent] > 0;

        node.className = 'skill-node';
        if (!parentOk) node.classList.add('node-locked');
        else if (isMax) node.classList.add('node-maxed');
        else node.classList.add('node-available');

        node.querySelector('.node-progress').innerText = `${lvl}/${u.max}`;
        const costEl = node.querySelector('.node-cost');
        if(isMax) costEl.style.display = 'none';
        else {
            costEl.style.display = 'block';
            costEl.innerText = `${cost} 🧪`;
            costEl.style.color = player.dust >= cost ? '#0f0' : '#f00';
        }
    });
}

window.buySkill = function(id) {
    const u = UPGRADES.find(x => x.id === id);
    if(!u) return;
    if (u.parent && player[u.parent] < 1) return;
    const cost = u.cost(player[id]);
    if(player.dust >= cost && player[id] < u.max) {
        player.dust -= cost;
        player[id]++;
        renderTree();
        tg.HapticFeedback.selectionChanged();
        localStorage.setItem('bioBunkerSave_v10', JSON.stringify(player));
    } else {
        tg.HapticFeedback.notificationOccurred('error');
    }
};

window.restartLevel = restartLevel; 

// ЗАПУСК
window.addEventListener('load', () => {
    const viewport = document.getElementById('tree-viewport');
    const treeCanvas = document.getElementById('tree-canvas');
    if(viewport && treeCanvas) {
        let isDragging = false, startX, startY, translateX = 0, translateY = 0;
        viewport.addEventListener('pointerdown', (e) => {
            isDragging = true;
            startX = e.clientX - translateX;
            startY = e.clientY - translateY;
            treeCanvas.style.transition = 'none';
        });
        viewport.addEventListener('pointermove', (e) => {
            if (!isDragging) return;
            translateX = e.clientX - startX;
            translateY = e.clientY - startY;
            treeCanvas.style.transform = `translate(${translateX}px, ${translateY}px)`;
        });
        const stopDrag = () => { isDragging = false; };
        viewport.addEventListener('pointerup', stopDrag);
        viewport.addEventListener('pointercancel', stopDrag);
    }
    
    // Снимаем экран загрузки
    const loader = document.getElementById('loader');
    if(loader) loader.style.display = 'none';
    
    // Открываем магазин
    openShop();
});
