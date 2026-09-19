/* ============================================================
 * 主逻辑：随机生成 + 属性面板 + 历史记录
 * ============================================================ */

const APP_STATE = { currentGun: null, filter: '全部', history: [] };
window.APP_STATE = APP_STATE;   /* 暴露给 shooting.js / ai.js 读取当前枪械 */

(() => {
  const $ = id => document.getElementById(id);
  const rollBtn = $('roll-btn');
  const resetBtn = $('reset-view');
  const typeChipsWrap = $('type-chips');
  const historyWrap = $('history-list');
  let rolling = false;

  /* ---------- 类型筛选 chips ---------- */
  const TYPES = ['全部', '突击步枪', '射手步枪', '狙击枪', '冲锋枪', '霰弹枪', '轻机枪', '手枪', '特殊'];
  TYPES.forEach(t => {
    const b = document.createElement('button');
    b.className = 'chip' + (t === '全部' ? ' active' : '');
    b.textContent = t;
    b.addEventListener('click', () => {
      APP_STATE.filter = t;
      typeChipsWrap.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
      b.classList.add('active');
      roll();
    });
    typeChipsWrap.appendChild(b);
  });

  /* ---------- 属性条渲染 ---------- */
  function barColor(v) {
    if (v >= 85) return 'linear-gradient(90deg,#ffb020,#ffd75e)';
    if (v >= 65) return 'linear-gradient(90deg,#4da3ff,#7cc4ff)';
    if (v >= 45) return 'linear-gradient(90deg,#4dd2a0,#8ef0c8)';
    return 'linear-gradient(90deg,#ff7d5c,#ffb08e)';
  }
  function setBar(id, v, max = 100) {
    const pct = Math.min(100, Math.round(v / max * 100));
    const fill = $(id).querySelector('.bar-fill');
    const num = $(id).querySelector('.bar-num');
    fill.style.width = pct + '%';
    fill.style.background = barColor(pct);
    num.textContent = v;
  }

  /* ---------- 渲染枪械信息 ---------- */
  function renderGun(gun) {
    const isAir = gun.rarity === 'airdrop';
    const typeColor = TYPE_COLORS[gun.type] || '#9aa7b5';

    $('gun-name').textContent = gun.name;
    $('gun-en').textContent = gun.en;
    $('gun-desc').textContent = gun.desc;
    $('gun-ammo').textContent = gun.ammo;
    $('gun-mag').textContent = gun.mag;
    $('gun-detail').textContent = gun.detail;
    $('gun-index').textContent = 'NO.' + (GUNS.findIndex(g => g.id === gun.id) + 1).toString().padStart(2, '0');

    const badge = $('gun-rarity');
    badge.textContent = isAir ? '空投传奇' : '地图刷新';
    badge.className = 'rarity-badge ' + (isAir ? 'airdrop' : 'normal');

    const typeTag = $('gun-type');
    typeTag.textContent = gun.type;
    typeTag.style.setProperty('--type-color', typeColor);

    setBar('stat-dmg', gun.stats.dmg, 135);
    setBar('stat-rate', gun.stats.rate);
    setBar('stat-rng', gun.stats.rng);
    setBar('stat-stb', gun.stats.stb);

    /* 配件推荐 */
    const attachWrap = $('gun-attach');
    attachWrap.innerHTML = '';
    if (gun.attach && gun.attach.length) {
      gun.attach.forEach(a => {
        const chip = document.createElement('span');
        chip.className = 'attach-chip';
        chip.textContent = a;
        attachWrap.appendChild(chip);
      });
    } else {
      attachWrap.innerHTML = '<span class="attach-none">这把"武器"不需要配件。</span>';
    }

    /* 触发面板入场动画 */
    const card = $('gun-card');
    card.classList.remove('pop');
    void card.offsetWidth;
    card.classList.add('pop');
  }

  /* ---------- 历史记录 ---------- */
  function renderHistory() {
    historyWrap.innerHTML = '';
    APP_STATE.history.slice(-8).reverse().forEach(id => {
      const g = getGunById(id);
      if (!g) return;
      const tag = document.createElement('button');
      tag.className = 'history-tag' + (APP_STATE.currentGun && APP_STATE.currentGun.id === id ? ' current' : '');
      tag.innerHTML = `<i style="background:${TYPE_COLORS[g.type]}"></i>${g.name}`;
      tag.addEventListener('click', () => applyGun(g, false));
      historyWrap.appendChild(tag);
    });
  }

  /* ---------- 应用一把枪 ---------- */
  function applyGun(gun, record = true) {
    APP_STATE.currentGun = gun;
    renderGun(gun);
    GunScene.showGun(gun);
    if (record) {
      APP_STATE.history.push(gun.id);
      if (APP_STATE.history.length > 20) APP_STATE.history.shift();
    }
    renderHistory();
    AIChat.notifyNewGun(gun);
  }

  /* ---------- 随机抽取 ---------- */
  function roll() {
    if (rolling) return;
    rolling = true;
    rollBtn.classList.add('rolling');
    const pool = getPool(APP_STATE.filter);
    let pick = pool[Math.floor(Math.random() * pool.length)];
    if (pool.length > 1 && APP_STATE.currentGun && pick.id === APP_STATE.currentGun.id) {
      pick = pool[(pool.indexOf(pick) + 1 + Math.floor(Math.random() * (pool.length - 1))) % pool.length];
    }
    setTimeout(() => {
      applyGun(pick);
      rolling = false;
      rollBtn.classList.remove('rolling');
    }, 260);
  }

  rollBtn.addEventListener('click', roll);
  resetBtn.addEventListener('click', () => GunScene.resetView());
  document.addEventListener('keydown', e => {
    if (e.code === 'Space' && document.activeElement.tagName !== 'INPUT'
      && document.activeElement.tagName !== 'TEXTAREA') {
      e.preventDefault();
      roll();
    }
  });

  /* ---------- 右上角搜索 ---------- */
  const searchInput = $('search-input');
  const searchResults = $('search-results');
  function renderSearch(kw) {
    const q = kw.trim().toLowerCase();
    if (!q) { searchResults.classList.remove('show'); return; }
    const hits = GUNS.filter(g =>
      g.name.toLowerCase().includes(q) ||
      g.en.toLowerCase().includes(q) ||
      g.type.includes(q) ||
      g.ammo.toLowerCase().includes(q)
    ).slice(0, 8);
    searchResults.innerHTML = hits.length ? '' : '<div class="search-empty">未找到相关枪械</div>';
    hits.forEach(h => {
      const item = document.createElement('button');
      item.className = 'search-item';
      item.innerHTML = `<i style="background:${TYPE_COLORS[h.type]}"></i>` +
        `<span class="s-name">${h.name}</span><span class="s-en">${h.en}</span>` +
        `<span class="s-type">${h.type}</span>`;
      item.addEventListener('click', () => {
        applyGun(h, true);
        searchInput.value = '';
        searchResults.classList.remove('show');
        searchInput.blur();
      });
      searchResults.appendChild(item);
    });
    const kbd = document.createElement('div');
    kbd.className = 'search-kbd';
    kbd.textContent = 'Enter 选中第一项 · Esc 关闭';
    searchResults.appendChild(kbd);
    searchResults.classList.add('show');
  }
  searchInput.addEventListener('input', e => renderSearch(e.target.value));
  searchInput.addEventListener('focus', e => { if (e.target.value.trim()) renderSearch(e.target.value); });
  searchInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      const first = searchResults.querySelector('.search-item');
      if (first) first.click();
    } else if (e.key === 'Escape') {
      searchInput.value = '';
      searchResults.classList.remove('show');
      searchInput.blur();
    }
  });
  document.addEventListener('click', e => {
    if (!e.target.closest('#search-wrap')) searchResults.classList.remove('show');
  });

  /* ---------- 启动 ---------- */
  GunScene.init('gun-canvas');
  AIChat.init();
  roll();
})();
