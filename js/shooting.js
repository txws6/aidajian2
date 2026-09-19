/* ============================================================
 * 打靶射击系统（Web 版）
 * 对应 Unity 方案：WeaponSystem + WeaponData/WeaponAudioData + ScoreUI
 * - 左键按住连发（按枪型 RPM 限速）/ R 换弹 / 空仓音 / 后坐力
 * - 命中分环（10 环~1 环）→ 得分 UI + 飘字（调用 scene.js 命中接口）
 * - WebAudio 程序化合成音效：每把枪独立音色（枪型 profile + 枪 ID 音高微调）
 * - 靶子命中音为 3D 空间音（距离衰减 + 左右声像）
 * 快捷键：B 打靶模式开关 / R 换弹 / Esc 退出
 * ============================================================ */
window.GunShooting = (function () {
  'use strict';

  /* ---- 枪型射击参数（相当于 Unity 的 WeaponData 资产） ---- */
  const KIND = {
    ar:       { rpm: 600, mag: 30, reload: 2.2, kick: 1.0, sfx: 'ar' },
    smg:      { rpm: 850, mag: 35, reload: 1.8, kick: 0.7, sfx: 'smg' },
    dmr:      { rpm: 260, mag: 10, reload: 2.4, kick: 1.5, sfx: 'dmr' },
    sr:       { rpm: 40,  mag: 5,  reload: 3.2, kick: 2.2, sfx: 'sr' },
    sg:       { rpm: 90,  mag: 5,  reload: 2.8, kick: 1.8, sfx: 'sg' },
    lmg:      { rpm: 650, mag: 60, reload: 4.0, kick: 1.1, sfx: 'ar' },
    pistol:   { rpm: 400, mag: 12, reload: 1.6, kick: 0.9, sfx: 'pistol' },
    revolver: { rpm: 150, mag: 6,  reload: 2.6, kick: 1.4, sfx: 'sr' },
    crossbow: { rpm: 30,  mag: 1,  reload: 2.0, kick: 0.8, sfx: 'dmr' }
  };

  /* ---- 音色 profile（相当于 WeaponAudioData 资产，WebAudio 合成参数） ---- */
  const SFX_PROFILE = {
    ar:     { dur: 0.10, cut: 3800, body: 150, vol: 0.55, echo: 0 },
    smg:    { dur: 0.07, cut: 5200, body: 190, vol: 0.42, echo: 0 },
    dmr:    { dur: 0.16, cut: 3000, body: 110, vol: 0.65, echo: 1 },
    sr:     { dur: 0.45, cut: 2200, body: 65,  vol: 0.85, echo: 1 },
    sg:     { dur: 0.30, cut: 1500, body: 80,  vol: 0.90, echo: 1 },
    pistol: { dur: 0.09, cut: 4500, body: 170, vol: 0.45, echo: 0 }
  };

  /* ---------------- 运行时状态 ---------------- */
  let active = false;        /* 打靶模式开关 */
  let firing = false;        /* 左键按住 */
  let lastShot = 0;          /* 上一发时间（秒） */
  let ammo = 0, reloading = false, reloadEnd = 0;
  let total = 0, shots = 0, best = 0;   /* 累计得分 / 射击数 / 单发最佳 */
  let curGunId = null;
  let audio = null;          /* WebAudio 上下文（首次交互创建） */

  const $ = id => document.getElementById(id);

  /* ================= WebAudio 程序化音效 ================= */
  function ensureAudio() {
    if (audio) { if (audio.state === 'suspended') audio.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    audio = new AC();
    const master = audio.createGain();
    master.gain.value = 0.9;
    master.connect(audio.destination);
    audio._master = master;
    /* 1 秒白噪声源（所有噪声音色共用） */
    const buf = audio.createBuffer(1, audio.sampleRate, audio.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    audio._noise = buf;
  }
  /* 噪声脉冲：dur 时长 / cut 低通截止 / vol 音量 / when 延迟 / hp 高通（机械咔哒用） */
  function playNoise(dur, cut, vol, when, hp) {
    const src = audio.createBufferSource();
    src.buffer = audio._noise;
    src.loop = true;
    src.loopStart = Math.random() * 0.5;
    let node = src;
    const lp = audio.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = cut;
    src.connect(lp); node = lp;
    if (hp) {
      const f = audio.createBiquadFilter();
      f.type = 'highpass'; f.frequency.value = hp;
      node.connect(f); node = f;
    }
    const g = audio.createGain();
    const t = audio.currentTime + (when || 0);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    node.connect(g);
    g.connect(audio._master);
    src.start(t); src.stop(t + dur + 0.05);
  }
  /* 正弦体音：freq 起始 → endFreq 下滑（低频枪体/命中叮） */
  function playTone(freq, endFreq, dur, vol, when, dest) {
    const o = audio.createOscillator();
    o.type = 'sine';
    const t = audio.currentTime + (when || 0);
    o.frequency.setValueAtTime(freq, t);
    if (endFreq) o.frequency.exponentialRampToValueAtTime(endFreq, t + dur);
    const g = audio.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(dest || audio._master);
    o.start(t); o.stop(t + dur + 0.05);
  }
  /* 射击音效：枪型 profile + 枪 ID 音高微调（需求：每把枪独立音效） */
  function sfxShoot(kindName, gunId) {
    ensureAudio(); if (!audio) return;
    const p = SFX_PROFILE[kindName] || SFX_PROFILE.ar;
    let hash = 0;
    for (let i = 0; i < gunId.length; i++) hash = (hash * 31 + gunId.charCodeAt(i)) >>> 0;
    const pm = 0.9 + (hash % 100) / 100 * 0.2;               /* 每把枪 ±10% 音高 */
    playNoise(p.dur / pm, p.cut * pm, p.vol, 0, 120);        /* 枪口爆音 */
    playTone(p.body * pm, p.body * pm * 0.5, p.dur * 1.6, p.vol * 0.9); /* 低频枪体 */
    playNoise(0.03, 8000, p.vol * 0.6, 0, 2500);             /* 高频脆响 */
    if (p.echo) {                                            /* 狙击/霰弹：回声尾 */
      playNoise(p.dur * 0.5, p.cut * 0.6, p.vol * 0.25, 0.22);
      playTone(p.body * 0.6, p.body * 0.4, 0.3, p.vol * 0.2, 0.22);
    }
  }
  function sfxReload(dur) {                                  /* 三声机械咔哒 */
    ensureAudio(); if (!audio) return;
    playNoise(0.05, 6000, 0.35, 0.05, 1200);
    playNoise(0.06, 5000, 0.40, dur * 0.45, 900);
    playNoise(0.05, 6500, 0.45, dur * 0.9, 1500);
  }
  function sfxEmpty() {                                      /* 空仓咔哒 */
    ensureAudio(); if (!audio) return;
    playNoise(0.04, 7000, 0.30, 0, 2000);
  }
  /* 命中"叮"：3D 空间音（距离衰减 + 左右声像，需求：3D 空间音效） */
  function sfxDing(ring) {
    ensureAudio(); if (!audio) return;
    const info = GunScene.getTargetInfo();
    const atten = Math.max(0.05, 1 - (info.dist - 2) / 38);  /* 距离衰减 */
    const vol = (ring >= 10 ? 0.5 : 0.32) * atten;
    let dest = audio._master;
    if (audio.createStereoPanner) {
      const pan = audio.createStereoPanner();
      pan.pan.value = info.pan;
      pan.connect(audio._master);
      dest = pan;
    }
    playTone(1568, 0, 0.4, vol, 0, dest);
    playTone(3136, 0, 0.25, vol * 0.5, 0, dest);
    if (ring >= 10) playTone(2093, 0, 0.5, vol * 0.6, 0.05, dest);
  }

  /* ================= 射击逻辑 ================= */
  function kindOf(gun) { return KIND[gun.model.kind] || KIND.ar; }
  function currentGun() { return window.APP_STATE && window.APP_STATE.currentGun; }

  /* 切换枪械：重置弹匣 + 音效配置自动跟随（需求：切枪自动切换音效） */
  function switchGun(gun) {
    curGunId = gun.id;
    ammo = kindOf(gun).mag;
    reloading = false;
    updateAmmoHud();
  }

  function tryFire() {
    if (reloading || !active) return;
    const gun = currentGun();
    if (!gun) return;
    if (gun.id !== curGunId) switchGun(gun);
    const p = kindOf(gun);
    const now = performance.now() / 1000;
    if (now - lastShot < 60 / p.rpm) return;                 /* 射速限制 */
    lastShot = now;
    if (ammo <= 0) {                                         /* 空仓 */
      sfxEmpty();
      startReload();
      return;
    }
    ammo--;
    sfxShoot(p.sfx, gun.id);                                 /* 当前枪独立射击音 */
    GunScene.kick(p.kick);                                   /* 后坐力（枪模 + FOV 冲击） */
    const res = GunScene.shootRay();                         /* 屏幕中心射线检测 */
    if (res.hit && res.ring != null) onScore(res.ring, res.point);
    updateAmmoHud();
  }

  /* 命中计分：得分 UI + 命中点飘字 + 3D 命中音 */
  function onScore(ring, point) {
    total += ring;
    shots++;
    if (ring > best) best = ring;
    $('score-hud').textContent = '得分 ' + total + ' · 射击 ' + shots + ' · 最佳 ' + best + ' 环';
    sfxDing(ring);
    const s = GunScene.projectToScreen(point);
    if (s.front) {
      const el = document.createElement('div');
      el.className = 'hit-float' + (ring >= 10 ? ' gold' : '');
      el.textContent = ring >= 10 ? '10 环!' : ring + ' 环';
      el.style.left = s.x + 'px';
      el.style.top = s.y + 'px';
      $('hit-floats').appendChild(el);
      setTimeout(() => el.remove(), 900);
    }
  }

  function startReload() {
    if (reloading) return;
    const gun = currentGun();
    if (!gun) return;
    const p = kindOf(gun);
    reloading = true;
    reloadEnd = performance.now() / 1000 + p.reload;
    sfxReload(p.reload);                                     /* 换弹音效 */
    $('reload-hud').hidden = false;
    $('ammo-hud').textContent = '换弹中…';
  }

  function updateAmmoHud() {
    if (reloading) return;
    $('ammo-hud').textContent = ammo + ' / ' + (currentGun() ? kindOf(currentGun()).mag : ammo);
  }

  /* 主循环：连发节流 + 换弹完成检测 */
  function loop() {
    requestAnimationFrame(loop);
    const now = performance.now() / 1000;
    if (reloading && now >= reloadEnd) {
      reloading = false;
      $('reload-hud').hidden = true;
      const gun = currentGun();
      ammo = gun ? kindOf(gun).mag : ammo;
      updateAmmoHud();
    }
    if (active && firing && !reloading) tryFire();
  }

  /* 打靶模式开关 */
  function toggle(force) {
    active = force !== undefined ? force : !active;
    GunScene.setAimMode(active);
    document.body.classList.toggle('aim-mode', active);      /* 联动 HUD 显隐 */
    if (active) {
      const gun = currentGun();
      if (gun) switchGun(gun);
      updateAmmoHud();
    } else {
      firing = false;
      reloading = false;
      $('reload-hud').hidden = true;
    }
  }

  function init() {
    $('btn-aim-mode').addEventListener('click', () => toggle());
    window.addEventListener('keydown', e => {
      if (e.code === 'KeyB') toggle();
      else if (e.code === 'KeyR' && active) startReload();
      else if (e.code === 'Escape' && active) toggle(false);
    });
    const canvas = $('gun-canvas');
    canvas.addEventListener('pointerdown', e => {
      if (!active || e.button !== 0) return;
      ensureAudio();
      firing = true;
      tryFire();
    });
    window.addEventListener('pointerup', () => { firing = false; });
    window.addEventListener('blur', () => { firing = false; });
    requestAnimationFrame(loop);
  }

  return { init, toggle };
})();

GunShooting.init();
