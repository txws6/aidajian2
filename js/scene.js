/* ============================================================
 * Three.js 3D 枪械建模 v2 —— 参考现实枪械结构精细化建模
 * 细节：上下机匣分离 / 皮卡汀尼导轨 / 机械准星 / 拉机柄 /
 *       抛壳窗 / 护木散热孔 / 弹匣纹路 / 枪口装置 / 两脚架等
 * 渲染：PBR 环境反射 + ACES 色调映射 + 接触阴影
 * ============================================================ */

const GunScene = (() => {
  let scene, camera, renderer, gunGroup = null, platformRing, shadowMesh;
  let theta = 0.62, phi = 1.12, radius = 4.3;
  let tTheta = 0.62, tPhi = 1.12, tRadius = 4.3;
  let dragging = false, lastX = 0, lastY = 0;
  let autoRotate = true, gunBaseY = 0.1;
  let transition = null;
  /* ---- ADS 开镜瞄准状态 ---- */
  const HIP_FOV = 60;                                       /* 腰射 FOV */
  const ADS_TIME = 0.2;                                     /* 开/关镜过渡时间（秒） */
  const ADS_FOV_STEPS = [30, 20, 15, 10, 7.5, 5];           /* 多档倍率：FOV 5~30 */
  let adsFovStep = 2;                                       /* 默认档位：15 ≈ 4 倍镜 */
  let ads = null;           /* { active, t, fromPos, toPos, fromLook, toLook, fromFov, toFov } */
  let adsEye = null;        /* 当前枪械倍镜眼点 { x, y }（枪身局部坐标） */
  const ADS_TARGET = { x: 8.5, y: 0.25 };   /* 射击靶心世界坐标（开镜视线落点） */
  const _adsLook = new THREE.Vector3();
  /* ---- 打靶模式（射击系统） ---- */
  let aimMode = false;      /* 肩后持枪视角（左键射击由 shooting.js 处理） */
  let camTween = null;      /* 通用相机过渡 */
  let recoilX = 0, fovKick = 0;                 /* 枪模后坐位移 / FOV 冲击 */
  let targetGroup = null, targetPlate = null;   /* 靶子 / 靶盘引用 */
  let holeGeo = null, holeMat = null;           /* 弹孔共享几何/材质 */
  let targetHp = 5, targetAnim = null;          /* 靶耐久 / 晃动倒下动画状态 */
  const bulletHoles = [];                       /* 弹孔（先进先出，上限 20） */
  const _ray = new THREE.Raycaster();
  const _center2 = new THREE.Vector2(0, 0);
  const clock = new THREE.Clock();
  let canvasEl = null;

  /* ================= 材质 ================= */
  let noiseTex = null, woodTex = null;
  /* 聚合物颗粒凹凸 */
  function makeNoiseTexture() {
    const cv = document.createElement('canvas');
    cv.width = 128; cv.height = 128;
    const ctx = cv.getContext('2d');
    const img = ctx.createImageData(128, 128);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = 195 + Math.random() * 60;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    const t = new THREE.CanvasTexture(cv);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(3, 3);
    return t;
  }
  /* 木纹拉丝凹凸 */
  function makeWoodTexture() {
    const cv = document.createElement('canvas');
    cv.width = 128; cv.height = 128;
    const ctx = cv.getContext('2d');
    for (let x = 0; x < 128; x++) {
      const n = 185 + Math.sin(x * 0.5) * 20 + Math.random() * 30;
      ctx.fillStyle = `rgb(${n},${n},${n})`;
      ctx.fillRect(x, 0, 1, 128);
    }
    const t = new THREE.CanvasTexture(cv);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(2, 1);
    return t;
  }
  function shade(hex, f) {
    const c = new THREE.Color(hex);
    c.multiplyScalar(f);
    return c.getHex();
  }
  function metal(color, rough = 0.3, met = 0.9) {
    return new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: met });
  }
  function polymer(color, rough = 0.62, met = 0.12) {
    if (!noiseTex) noiseTex = makeNoiseTexture();
    return new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: met, bumpMap: noiseTex, bumpScale: 0.004 });
  }
  function wood(color) {
    if (!woodTex) woodTex = makeWoodTexture();
    return new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.06, bumpMap: woodTex, bumpScale: 0.014 });
  }

  /* ================= 几何工具 ================= */
  function B(w, h, d, m, x = 0, y = 0, z = 0, rz = 0, rx = 0) {
    const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    o.position.set(x, y, z); o.rotation.z = rz; o.rotation.x = rx;
    o.castShadow = true;
    return o;
  }
  function C(r, len, m, axis = 'x', x = 0, y = 0, z = 0, seg = 22) {
    const o = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, seg), m);
    if (axis === 'x') o.rotation.z = Math.PI / 2;
    if (axis === 'z') o.rotation.x = Math.PI / 2;
    o.position.set(x, y, z);
    o.castShadow = true;
    return o;
  }
  function S(r, m, x = 0, y = 0, z = 0, seg = 14) {
    const o = new THREE.Mesh(new THREE.SphereGeometry(r, seg, seg), m);
    o.position.set(x, y, z); o.castShadow = true;
    return o;
  }
  /* 皮卡汀尼导轨：底条 + 横隔条 */
  function rail(len, m) {
    const g = new THREE.Group();
    g.add(B(len, 0.022, 0.052, m, 0, 0, 0));
    const n = Math.max(2, Math.round(len / 0.055));
    for (let i = 0; i < n; i++) {
      const x = -len / 2 + 0.026 + i * (len - 0.05) / (n - 1);
      g.add(B(0.024, 0.02, 0.056, m, x, 0.02, 0));
    }
    return g;
  }
  /* 侧散热孔（护木） */
  function vents(len, y, m, rows = 2, n = 5) {
    const g = new THREE.Group();
    for (let s = 0; s < 2; s++) {
      const z = s === 0 ? 0.052 : -0.052;
      for (let i = 0; i < n; i++) {
        for (let r = 0; r < rows; r++) {
          g.add(B(0.035, 0.028, 0.012, m,
            -len / 2 + 0.07 + i * (len - 0.14) / (n - 1),
            y - 0.025 + r * 0.05, z));
        }
      }
    }
    return g;
  }

  /* ================= 部件库 ================= */
  /* 准星（AR/AK 前准星座：三角护圈 + 立柱） */
  function frontSight(m) {
    const g = new THREE.Group();
    g.add(B(0.05, 0.07, 0.02, m, 0, 0.03, 0));
    g.add(B(0.014, 0.06, 0.012, m, 0, 0.07, 0));
    g.add(B(0.05, 0.012, 0.014, m, 0, 0.098, 0));
    return g;
  }
  /* 照门 */
  function rearSight(m) {
    const g = new THREE.Group();
    g.add(B(0.07, 0.03, 0.03, m, 0, 0.01, 0));
    g.add(B(0.016, 0.035, 0.012, m, -0.02, 0.04, 0));
    g.add(B(0.016, 0.035, 0.012, m, 0.02, 0.04, 0));
    return g;
  }
  /* 瞄具（光轴沿 X 与枪管轴线平行；底座底面 = y0，与导轨顶面贴合；z=0 居中） */
  function buildScope(type, m, flavor) {
    const g = new THREE.Group();
    const dark = metal(0x191c21, 0.35, 0.8);
    if (type === 'red') {
      g.add(B(0.15, 0.02, 0.05, dark, 0, 0.01, 0));            /* 底座：底面 y=0 */
      g.add(C(0.042, 0.11, dark, 'x', 0, 0.056, 0, 22));        /* 镜筒沿 X */
      g.add(C(0.046, 0.016, dark, 'x', 0.052, 0.056, 0, 22));   /* 物镜圈 */
      const dot = new THREE.Mesh(new THREE.SphereGeometry(0.011, 10, 10),
        new THREE.MeshBasicMaterial({ color: 0xff2211 }));
      dot.position.set(0.012, 0.056, 0);
      g.add(dot);
      g.add(B(0.022, 0.024, 0.02, dark, 0, 0.096, 0));          /* 顶部旋钮 */
    } else if (type === 'scope4' || type === 'scope8' || flavor === 'integralScope') {
      const big = type === 'scope8' || flavor === 'integralScope';
      const len = big ? 0.38 : 0.26, r = big ? 0.05 : 0.04;
      /* 底座 + 双镜环，底面 y=0 */
      g.add(B(0.16, 0.024, 0.052, dark, 0, 0.012, 0));
      g.add(B(0.03, 0.05, 0.05, dark, -0.05, 0.049, 0));
      g.add(B(0.03, 0.05, 0.05, dark, 0.05, 0.049, 0));
      /* 镜筒沿 X（与枪管平行） */
      const tubeY = 0.074 + r - 0.012;
      g.add(C(r, len, dark, 'x', 0, tubeY, 0, 26));
      g.add(C(r + 0.018, 0.06, dark, 'x', len / 2 - 0.01, tubeY, 0, 26)); /* 物镜圈 */
      g.add(C(r + 0.012, 0.04, dark, 'x', -len / 2 + 0.01, tubeY, 0, 26)); /* 目镜圈 */
      /* 物镜片（朝 +X） */
      const lens = new THREE.Mesh(new THREE.CircleGeometry(r - 0.008, 22),
        new THREE.MeshBasicMaterial({ color: 0x6fc4ff, transparent: true, opacity: 0.9 }));
      lens.position.set(len / 2 + 0.022, tubeY, 0);
      lens.rotation.y = Math.PI / 2;
      g.add(lens);
      /* 橡胶眼罩（朝 -X） */
      const eye = new THREE.Mesh(new THREE.TorusGeometry(r + 0.006, 0.009, 8, 18),
        new THREE.MeshStandardMaterial({ color: 0x0d0f12, roughness: 0.85, metalness: 0.05 }));
      eye.position.set(-len / 2 + 0.008, tubeY, 0);
      eye.rotation.y = Math.PI / 2;
      g.add(eye);
      /* 调节旋钮：顶部 + 右侧 */
      g.add(C(0.022, 0.03, dark, 'y', 0, tubeY + r + 0.004, 0));
      g.add(C(0.02, 0.03, dark, 'z', len / 4, tubeY, r + 0.004));
    } else if (type === 'carry') {
      /* 提把：底面 y=0 贴合机匣顶 */
      g.add(B(0.34, 0.022, 0.05, m, 0.1, 0.011, 0));
      g.add(B(0.05, 0.03, 0.045, m, -0.02, 0.015, 0));
      g.add(B(0.05, 0.03, 0.045, m, 0.22, 0.015, 0));
      g.add(B(0.02, 0.05, 0.012, m, 0.02, 0.047, 0));
      g.add(B(0.02, 0.05, 0.012, m, 0.18, 0.047, 0));
    }
    return g;
  }
  /* 弹匣 */
  function buildMag(type, mats) {
    const g = new THREE.Group();
    const m = mats.accent, dark = mats.dark;
    if (type === 'box') {
      g.add(B(0.085, 0.26, 0.06, m, 0, -0.14, 0, 0.1));
      g.add(B(0.095, 0.028, 0.07, dark, 0, -0.272, 0.026, 0.1)); /* 底板 */
      g.add(B(0.088, 0.012, 0.062, dark, 0, -0.05, 0, 0.1));     /* 弹匣肋 */
      /* 余弹观察孔 */
      g.add(B(0.018, 0.02, 0.006, dark, 0, -0.1, 0.032));
      g.add(B(0.018, 0.02, 0.006, dark, 0, -0.15, 0.032));
      g.add(B(0.018, 0.02, 0.006, dark, 0, -0.2, 0.032));
    } else if (type === 'curved') {
      let px = 0, py = -0.05, ang = 0.1;
      for (let i = 0; i < 3; i++) {
        const seg = B(0.085, 0.13, 0.058, m, px, py, 0, ang);
        g.add(seg);
        g.add(B(0.088, 0.014, 0.06, dark, px + Math.sin(ang) * 0.06, py - Math.cos(ang) * 0.055, 0, ang));
        px += Math.sin(ang) * 0.115; py -= Math.cos(ang) * 0.115;
        ang += 0.28;
      }
      g.add(B(0.095, 0.026, 0.066, dark, px, py + 0.02, 0, ang)); /* 底板 */
    } else if (type === 'drumDown') {
      g.add(C(0.115, 0.055, m, 'z', 0, -0.15, 0, 28));
      g.add(C(0.118, 0.012, dark, 'z', 0, -0.15, 0.028, 28));
      g.add(C(0.06, 0.05, dark, 'z', 0, -0.03, 0));
    } else if (type === 'drumTube') {
      g.add(C(0.06, 0.52, m, 'x', 0.02, -0.075, 0, 24));
      g.add(C(0.064, 0.02, dark, 'x', 0.27, -0.075, 0, 24));
      g.add(C(0.02, 0.05, dark, 'y', -0.05, -0.03, 0));
    } else if (type === 'panTop') {
      g.add(C(0.14, 0.05, m, 'y', -0.12, 0.145, 0, 30));
      for (let i = 0; i < 8; i++) {
        const a = i / 8 * Math.PI * 2;
        g.add(B(0.05, 0.052, 0.012, dark,
          -0.12 + Math.cos(a) * 0.07, 0.147, Math.sin(a) * 0.07, 0, a));
      }
      g.add(C(0.03, 0.028, dark, 'y', -0.12, 0.159, 0));
    } else if (type === 'belt') {
      g.add(B(0.36, 0.17, 0.13, m, 0.04, -0.135, 0));
      g.add(B(0.37, 0.02, 0.135, dark, 0.04, -0.05, 0));
      g.add(B(0.1, 0.05, 0.14, dark, 0.04, -0.19, 0));
    } else if (type === 'tube') {
      g.add(C(0.034, 0.56, mats.metal, 'x', 0.12, -0.055, 0));
      g.add(C(0.04, 0.04, dark, 'x', 0.39, -0.055, 0));
    } else if (type === 'topFlat') {
      /* P90 上置弹匣：顶面 = 0.134，与瞄具底座底面（scY=0.134）贴合不穿模 */
      g.add(B(0.46, 0.03, 0.095, m, 0.02, 0.119, 0, 0));
      g.add(B(0.2, 0.026, 0.095, m, 0.18, 0.121, 0, 0));
    } else if (type === 'revolver') {
      /* 由枪身绘制 */
    }
    return g;
  }
  /* 枪托 */
  function buildStock(type, mats, kind) {
    const g = new THREE.Group();
    const body = mats.wood || mats.body, dark = mats.dark;
    if (type === 'fixed') {
      if (kind === 'ar' || kind === 'dmr') {
        g.add(C(0.032, 0.24, mats.metal, 'x', -0.12, 0.02, 0));   /* 缓冲管 */
        g.add(B(0.06, 0.09, 0.06, dark, -0.23, 0.02, 0));
        g.add(B(0.36, 0.15, 0.07, body, -0.44, 0.0, 0));           /* 托体 */
        g.add(B(0.05, 0.17, 0.075, dark, -0.63, -0.005, 0));       /* 托底板 */
        g.add(B(0.3, 0.02, 0.072, dark, -0.44, 0.072, 0));         /* 贴腮线 */
      } else {
        /* AK / 栓狙木质托 */
        const s1 = B(0.5, 0.14, 0.06, body, -0.25, -0.02, 0, 0.06);
        g.add(s1);
        g.add(B(0.06, 0.18, 0.068, dark, -0.52, -0.06, 0, 0.06));
        g.add(B(0.42, 0.018, 0.062, dark, -0.28, 0.055, 0, 0.06));
      }
    } else if (type === 'skeleton') {
      g.add(B(0.34, 0.028, 0.045, body, -0.18, 0.045, 0));
      g.add(B(0.28, 0.028, 0.045, body, -0.2, -0.1, 0));
      g.add(B(0.05, 0.17, 0.05, dark, -0.35, -0.03, 0));
      g.add(B(0.12, 0.05, 0.045, dark, -0.3, 0.028, 0));
    } else if (type === 'folding') {
      g.add(B(0.28, 0.024, 0.03, mats.metal, -0.17, 0.03, 0.03));
      g.add(B(0.28, 0.024, 0.03, mats.metal, -0.17, 0.03, -0.03));
      g.add(B(0.035, 0.13, 0.09, dark, -0.31, -0.03, 0));
    } else if (type === 'bullpup') {
      g.add(B(0.4, 0.15, 0.062, mats.body, -0.28, 0.0, 0));
      g.add(B(0.04, 0.17, 0.055, dark, -0.48, -0.01, 0));
      g.add(B(0.12, 0.05, 0.058, mats.body, -0.34, -0.11, 0));   /* 后握把颈 */
    }
    return g;
  }
  /* 枪口装置 */
  function buildMuzzle(type, mats, flavor) {
    const g = new THREE.Group();
    const dark = mats.dark, metal = mats.metal;
    if (type === 'suppressor') {
      g.add(C(0.052, 0.34, dark, 'x', 0.16, 0.012, 0, 24));
      for (let i = 0; i < 6; i++) g.add(C(0.054, 0.008, mats.accent, 'x', 0.02 + i * 0.055, 0.012, 0, 24));
    } else if (type === 'brake') {
      g.add(B(0.14, 0.075, 0.07, metal, 0.06, 0.012, 0));
      g.add(B(0.15, 0.014, 0.045, dark, 0.06, 0.052, 0));
      g.add(B(0.05, 0.016, 0.075, dark, 0.03, 0.012, 0));
    } else if (flavor === 'slantBrake') {
      const s = B(0.1, 0.07, 0.055, metal, 0.045, 0.012, 0, 0, 0.45);
      g.add(s);
    } else {
      /* 鸟笼消焰器：开口环 + 三向泄气槽 */
      g.add(C(0.034, 0.12, metal, 'x', 0.055, 0.012, 0, 18));
      for (let i = 0; i < 3; i++) {
        g.add(B(0.085, 0.013, 0.078, dark, 0.05, 0.012, -0.022 + i * 0.022));
      }
      g.add(C(0.03, 0.014, dark, 'x', 0.112, 0.012, 0, 16));
    }
    return g;
  }
  /* 旋转拉机柄（栓动） */
  function boltHandle(m) {
    const g = new THREE.Group();
    const arm = C(0.011, 0.11, m, 'z', -0.02, 0.05, 0.05);
    arm.rotation.x = Math.PI / 2 - 0.5;
    g.add(arm);
    g.add(S(0.02, m, -0.02 + Math.cos(0.5) * 0.0, 0.05 - Math.sin(0.5) * 0.02, 0.1));
    return g;
  }

  /* ================= 主建模 ================= */
  function createGun(gun) {
    const cfg = gun.model;
    adsEye = null;   /* 重置倍镜眼点（无镜枪械为 null） */
    const kind = cfg.kind;
    const mats = {
      body: polymer(cfg.color),
      wood: cfg.wood ? wood(cfg.wood) : null,
      dark: polymer(0x15181d, 0.5, 0.35),
      metal: metal(0x2c313a, 0.28, 0.85),
      steel: metal(0x454c56, 0.32, 0.8),
      accent: polymer(0x1d2126, 0.58, 0.3)
    };
    const flavor = {};
    if (gun.id === 'akm' || gun.id === 'm762' || gun.id === 'qbz95') flavor.slantBrake = gun.id !== 'm762';
    if (gun.id === 'akm' || gun.id === 'm762' || gun.id === 'qbz95' || gun.id === 'groza') flavor.gasTube = true;
    if (gun.id === 'groza') flavor.integralFront = true;
    if (gun.id === 'aug') flavor.integralScope = true;
    if (['kar98k', 'm24', 'awm', 'amr'].includes(gun.id)) flavor.bolt = true;
    if (gun.id === 'kar98k') flavor.hoodedSight = true;
    if (gun.id === 'win94') flavor.lever = true;
    if (gun.id === 'mg3') flavor.perfBarrel = true;
    if (gun.id === 'thompson') flavor.frontGrip = true;

    /* ---- 特殊：平底锅 ---- */
    if (kind === 'pan') {
      const g = new THREE.Group();
      const pm = metal(0x565c64, 0.32, 0.85);
      const pts = [new THREE.Vector2(0.0, 0.0), new THREE.Vector2(0.2, 0.0),
        new THREE.Vector2(0.28, 0.015), new THREE.Vector2(0.3, 0.06),
        new THREE.Vector2(0.3, 0.11)];
      const dish = new THREE.Mesh(new THREE.LatheGeometry(pts, 40),
        new THREE.MeshStandardMaterial({ color: 0x565c64, roughness: 0.3, metalness: 0.85, side: THREE.DoubleSide }));
      dish.castShadow = true;
      g.add(dish);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.302, 0.011, 10, 40), pm);
      rim.rotation.x = Math.PI / 2; rim.position.y = 0.11;
      g.add(rim);
      g.add(B(0.32, 0.04, 0.035, mats.dark, 0.44, 0.045, 0));
      g.add(S(0.02, pm, 0.33, 0.045, 0)); g.add(S(0.02, pm, 0.53, 0.045, 0)); /* 铆钉 */
      const hole = new THREE.Mesh(new THREE.TorusGeometry(0.02, 0.007, 8, 16), pm);
      hole.position.set(0.615, 0.045, 0);
      g.add(hole);
      g.rotation.x = 0.42; g.rotation.z = 0.1;
      const bb = new THREE.Box3().setFromObject(g);
      const ct = bb.getCenter(new THREE.Vector3());
      g.position.set(-ct.x, 0.16 - ct.y, -ct.z);
      return g;
    }
    /* ---- 特殊：十字弩 ---- */
    if (kind === 'crossbow') {
      const g = new THREE.Group();
      const limbM = polymer(0x33372e, 0.5, 0.4);
      g.add(B(0.95, 0.075, 0.06, mats.wood || polymer(0x6a4a2a, 0.6, 0.1), -0.05, 0, 0)); /* 弩身 */
      g.add(rail(0.5, mats.metal).translateX(0.18).translateY(0.05));                       /* 滑轨 */
      /* 弓臂（弧形） */
      for (let s = 0; s < 2; s++) {
        const dir = s === 0 ? 1 : -1;
        const arc = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.018, 10, 24, Math.PI / 2.2), limbM);
        arc.position.set(0.3, 0.08, dir * 0.02);
        arc.rotation.y = Math.PI / 2;
        arc.rotation.z = dir > 0 ? Math.PI / 2.2 : -Math.PI / 2.2 - (Math.PI / 2.2) * 0;
        arc.rotation.z = s === 0 ? -0.35 : Math.PI + 0.35;
        arc.castShadow = true;
        g.add(arc);
      }
      g.add(B(0.02, 0.014, 0.78, mats.dark, 0.31, 0.24, 0)); /* 弦 */
      const arrow = C(0.012, 0.6, mats.wood || mats.body, 'x', 0.1, 0.09, 0);
      g.add(arrow);
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.06, 10), mats.metal);
      tip.rotation.z = -Math.PI / 2; tip.position.set(0.43, 0.09, 0);
      g.add(tip);
      g.add(B(0.06, 0.11, 0.05, mats.dark, -0.16, -0.09, 0, -0.25)); /* 握把 */
      g.add(buildScope('red', mats.metal, {}).translateX(0.0).translateY(0.08));
      const bb = new THREE.Box3().setFromObject(g);
      const ct = bb.getCenter(new THREE.Vector3());
      g.position.set(-ct.x, 0.16 - ct.y, -ct.z);
      return g;
    }

    /* ---- 尺寸预设 ---- */
    const P = {
      ar:      { recL: 0.82, recH: 0.2, recW: 0.1, handL: 0.5, barrel: 0.52, gripX: -0.1, magX: 0.12, frontX: 1.32 },
      dmr:     { recL: 0.85, recH: 0.2, recW: 0.1, handL: 0.55, barrel: 0.62, gripX: -0.1, magX: 0.1, frontX: 1.45 },
      sr:      { recL: 0.7, recH: 0.18, recW: 0.09, handL: 0.0, barrel: 0.85, gripX: -0.12, magX: 0.05, frontX: 1.5 },
      smg:     { recL: 0.58, recH: 0.19, recW: 0.09, handL: 0.3, barrel: 0.3, gripX: -0.05, magX: 0.05, frontX: 0.95 },
      sg:      { recL: 0.62, recH: 0.17, recW: 0.1, handL: 0.25, barrel: 0.75, gripX: -0.1, magX: 0.08, frontX: 1.4 },
      lmg:     { recL: 0.85, recH: 0.22, recW: 0.11, handL: 0.45, barrel: 0.6, gripX: -0.12, magX: 0.1, frontX: 1.4 },
      pistol:  { recL: 0.55, recH: 0.12, recW: 0.085, handL: 0, barrel: 0.06, gripX: -0.13, magX: -0.13, frontX: 0.3 },
      revolver:{ recL: 0.34, recH: 0.15, recW: 0.06, handL: 0, barrel: 0.45, gripX: -0.12, magX: 0, frontX: 0.52 }
    }[kind] || { recL: 0.8, recH: 0.2, recW: 0.1, handL: 0.5, barrel: 0.55, gripX: -0.1, magX: 0.1, frontX: 1.3 };

    const g = new THREE.Group();
    const isBullpup = !!cfg.bullpup;
    const scaleL = cfg.L || 1;
    const recH = P.recH, recW = P.recW;

    /* ============ 机匣（上下分离 + 细节） ============ */
    const upperH = recH * 0.55, lowerH = recH * 0.45;
    const recL = P.recL * (isBullpup ? 1.35 : 1);
    const recCX = isBullpup ? -0.12 : 0;
    if (kind !== 'sr' && kind !== 'sg' || kind === 'sg' && (cfg.mag === 'box' || cfg.stock === 'bullpup')) {
      /* 现代合成机匣：上机匣双色 + 下机匣 */
      const upperM = polymer(shade(cfg.color, 0.86));
      g.add(B(recL, upperH, recW, upperM, recCX, upperH / 2, 0));
      g.add(B(recL, lowerH, recW * 0.96, mats.body, recCX, -lowerH / 2, 0));
      g.add(B(recL * 0.9, 0.014, recW * 0.8, mats.dark, recCX, 0.001, 0)); /* 分缝线 */
      /* 抛壳窗 + 防尘盖铰链 */
      g.add(B(0.16, upperH * 0.5, 0.012, mats.dark, recCX + 0.08, upperH * 0.45, recW / 2));
      g.add(C(0.012, 0.012, mats.steel, 'x', recCX + 0.155, upperH * 0.45, recW / 2 + 0.002));
      /* 拉机柄 */
      g.add(B(0.09, 0.028, 0.05, mats.dark, recCX - recL / 2 + 0.04, upperH - 0.01, 0));
      /* 真实机械细节：销钉 × 2 / 快慢机 / 弹匣卡榫 / 辅助推机杆 */
      g.add(C(0.012, recW + 0.024, mats.steel, 'z', recCX + recL / 2 - 0.08, 0.005, 0));
      g.add(C(0.012, recW + 0.024, mats.steel, 'z', recCX - recL / 2 + 0.1, -0.025, 0));
      g.add(B(0.055, 0.02, 0.014, mats.dark, recCX - 0.04, -0.035, -recW / 2 - 0.002));
      g.add(C(0.013, 0.012, mats.dark, 'x', recCX + 0.1, -0.05, recW / 2 + 0.004));
      g.add(C(0.016, 0.014, mats.dark, 'x', recCX + 0.15, upperH * 0.4, recW / 2 + 0.004));
      /* 弹匣座护圈 */
      const magwellX = isBullpup ? -0.28 : P.magX;
      if (cfg.mag && cfg.mag !== 'none' && cfg.mag !== 'revolver' && cfg.mag !== 'double') {
        g.add(B(0.115, 0.05, recW * 1.14, mats.dark, magwellX, -lowerH + 0.005, 0));
      }
    } else if (kind === 'sr') {
      /* 栓狙：木质/聚合物整托 + 机匣环 */
      const stockM = mats.wood || mats.body;
      g.add(B(1.05, 0.2, 0.075, stockM, -0.32, -0.05, 0));        /* 托体 */
      g.add(B(0.5, 0.12, 0.07, stockM, 0.35, -0.03, 0));           /* 前托 */
      g.add(B(0.42, 0.1, 0.078, mats.metal, -0.1, 0.06, 0));       /* 机匣 */
      g.add(C(0.045, 0.1, mats.metal, 'x', -0.32, 0.06, 0));       /* 机匣环 */
      g.add(B(1.0, 0.016, 0.072, mats.dark, -0.3, 0.045, 0));      /* 弹仓底 */
      if (flavor.bolt) g.add(boltHandle(mats.steel).translateX(-0.12).translateY(0.1));
    }
    if (kind === 'sg' && cfg.mag === 'double' && cfg.stock !== 'bullpup') {
      /* 双管猎枪机匣 */
      const stockM = mats.wood || mats.body;
      g.add(B(0.55, 0.16, 0.07, mats.metal, -0.05, 0.02, 0));
      g.add(B(0.5, 0.13, 0.065, stockM, -0.5, -0.04, 0, 0.05));
    }
    if (kind === 'sg' && cfg.stock === 'bullpup') {
      g.add(B(0.9, 0.2, 0.1, mats.body, -0.15, 0.02, 0));
    }

    /* ============ 机匣顶部导轨（瞄具座，顶面 = upperH + 0.03） ============ */
    if (kind !== 'pistol' && kind !== 'revolver' && kind !== 'sr' && cfg.mag !== 'topFlat') {
      const rr2 = rail(recL * 0.72, mats.dark);
      rr2.position.set(recCX - recL * 0.02, upperH, 0);
      g.add(rr2);
    }

    /* ============ 护木 ============ */
    const woodHere = mats.wood;
    if (P.handL > 0 && kind !== 'sr') {
      const handL = P.handL * scaleL;
      const hx = recCX + recL / 2 + handL / 2 - 0.01;
      if (flavor.gasTube) {
        /* AK 风：木质下护木 + 上方导气管 */
        g.add(B(handL, recH * 0.62, recW * 0.92, woodHere || mats.body, hx, -0.01, 0));
        g.add(C(0.02, handL + 0.1, mats.metal, 'x', hx, recH * 0.42, 0));
        g.add(B(0.05, 0.05, recW, mats.metal, hx - handL / 2 - 0.02, recH * 0.42, 0));
      } else if (kind === 'smg' && cfg.stock !== 'none') {
        g.add(B(handL, recH * 0.7, recW * 0.95, mats.body, hx, 0, 0));
        g.add(vents(handL * 0.8, 0, mats.dark, 1, 4).translateX(hx));
      } else {
        g.add(B(handL, recH * 0.68, recW * 0.95, mats.body, hx, 0, 0));
        g.add(vents(handL * 0.85, 0, mats.dark, 2, 5).translateX(hx));
        const rr = rail(handL * 0.9, mats.dark); rr.position.set(hx, recH * 0.42, 0); g.add(rr);
        /* 节套环（护木与机匣连接）+ 护木尾环 */
        g.add(C(0.03, 0.03, mats.metal, 'x', hx - handL / 2 + 0.012, 0, 0));
        g.add(C(0.027, 0.022, mats.metal, 'x', hx + handL / 2 - 0.008, 0, 0));
      }
      if (flavor.integralFront) {
        g.add(B(handL + 0.15, recH * 0.85, recW * 1.15, mats.body, hx, 0.01, 0));
      }
      if (flavor.frontGrip) {
        g.add(B(0.045, 0.14, 0.04, woodHere || mats.dark, hx + 0.06, -0.13, 0));
      }
    }

    /* ============ 枪管 ============ */
    const bStart = kind === 'sr' ? 0.55 : (isBullpup ? recCX + recL / 2 - 0.05 : recCX + recL / 2 + P.handL * scaleL - 0.02);
    const bLen = Math.max(0.12, P.frontX * scaleL - bStart + 0.15);
    const bR = kind === 'sg' ? 0.03 : (kind === 'lmg' ? 0.026 : 0.021);
    if (kind === 'sg' && cfg.mag === 'double') {
      /* 上下双管 + 肋条 + 珠 */
      const oy = cfg.stock === 'bullpup' ? 0.06 : 0.05;
      g.add(C(0.03, bLen, mats.metal, 'x', bStart + bLen / 2, oy - 0.031, 0, 20));
      g.add(C(0.03, bLen, mats.metal, 'x', bStart + bLen / 2, oy + 0.031, 0, 20));
      g.add(B(bLen, 0.014, 0.018, mats.dark, bStart + bLen / 2, oy + 0.068, 0));
      g.add(S(0.008, mats.gold || mats.metal, bStart + bLen - 0.03, oy + 0.08, 0)); /* 珠 */
    } else if (cfg.mag === 'double') {
      /* 左右双管（短管霰弹） */
      g.add(C(0.028, bLen, mats.metal, 'x', bStart + bLen / 2, 0.02, 0.026, 20));
      g.add(C(0.028, bLen, mats.metal, 'x', bStart + bLen / 2, 0.02, -0.026, 20));
    } else {
      g.add(C(bR, bLen, mats.metal, 'x', bStart + bLen / 2, 0.012, 0, 20));
      if (flavor.perfBarrel) {
        for (let i = 0; i < 7; i++) {
          g.add(B(0.03, 0.014, recW * 1.1, mats.dark, bStart + 0.08 + i * 0.075, 0.03, 0));
        }
        g.add(C(0.045, bLen * 0.5, mats.body, 'x', bStart + bLen * 0.3, 0.012, 0, 20));
      }
    }

    /* ============ 准星 / 照门 ============ */
    if (kind !== 'pistol' && kind !== 'revolver' && !isBullpup) {
      if (flavor.hoodedSight) {
        g.add(B(0.03, 0.045, 0.012, mats.metal, bStart + bLen - 0.06, 0.075, 0.016));
        g.add(B(0.03, 0.045, 0.012, mats.metal, bStart + bLen - 0.06, 0.075, -0.016));
        g.add(B(0.03, 0.012, 0.045, mats.metal, bStart + bLen - 0.06, 0.1, 0));
        g.add(S(0.007, mats.metal, bStart + bLen - 0.06, 0.06, 0));
        g.add(C(0.007, 0.5, mats.steel, 'x', bStart + bLen * 0.42, -0.02, 0)); /* 通条 */
      } else if (kind !== 'sr') {
        const fsY = (kind === 'sg' && cfg.mag === 'double' && cfg.stock !== 'none') ? 0.125
          : (kind === 'sg' ? 0.045 : 0.03);
        const fs = frontSight(mats.metal);
        fs.position.set(bStart + 0.1, fsY, 0);
        g.add(fs);
      }
      if (kind !== 'sr') {
        const hasReceiver = !(kind === 'sg' && cfg.mag === 'tube' && cfg.stock !== 'bullpup');
        if (hasReceiver) {
          const rs = rearSight(mats.metal);
          const rsY = (kind === 'sg' && cfg.mag !== 'box' && cfg.stock !== 'bullpup') ? 0.105 : upperH + 0.035;
          rs.position.set(recCX - recL / 2 + 0.12, rsY, 0);
          g.add(rs);
        }
      } else if (cfg.scope === 'iron') {
        /* 栓狙机瞄（Win94） */
        const fs = frontSight(mats.metal);
        fs.position.set(bStart + bLen - 0.12, 0.03, 0);
        g.add(fs);
        const rs = rearSight(mats.metal);
        rs.position.set(-0.15, 0.115, 0);
        g.add(rs);
      }
    }

    /* ============ 枪口 ============ */
    if (cfg.muzzle && cfg.mag !== 'double') {
      g.add(C(bR + 0.004, 0.035, mats.steel, 'x', bStart + bLen - 0.03, 0.012, 0, 16)); /* 枪口螺纹段 */
    }
    if (cfg.muzzle) {
      const mz = buildMuzzle(cfg.muzzle, mats, flavor);
      mz.position.x = bStart + bLen - 0.05;
      g.add(mz);
    }
    if (cfg.suppressor) {
      g.add(C(0.045, 0.28, mats.dark, 'x', bStart + bLen + 0.08, 0.012, 0, 22));
      for (let i = 0; i < 4; i++) g.add(C(0.047, 0.007, mats.accent, 'x', bStart + bLen - 0.02 + i * 0.06, 0.012, 0, 22));
      /* 消音器端盖 + 枪口孔 */
      g.add(C(0.046, 0.014, mats.accent, 'x', bStart + bLen + 0.213, 0.012, 0, 22));
      const bore = new THREE.Mesh(new THREE.CircleGeometry(0.02, 14),
        new THREE.MeshBasicMaterial({ color: 0x05060a }));
      bore.position.set(bStart + bLen + 0.221, 0.012, 0);
      bore.rotation.y = Math.PI / 2;
      g.add(bore);
    }

    /* ============ 握把 + 扳机护圈 ============ */
    const gripM = woodHere || mats.accent;
    const grip = B(0.075, 0.24, 0.055, gripM, P.gripX, -0.17, 0, -0.32);
    g.add(grip);
    g.add(B(0.055, 0.032, 0.06, gripM, P.gripX - 0.048, -0.062, 0, -0.32)); /* 虎口护翼 */
    for (let i = 0; i < 3; i++) {
      g.add(B(0.02, 0.016, 0.058, mats.dark, P.gripX + 0.02 + i * 0.012 - 0.03, -0.12 - i * 0.045, 0, -0.32));
    }
    const guard = new THREE.Mesh(new THREE.TorusGeometry(0.052, 0.009, 8, 22, Math.PI * 1.1), mats.metal);
    guard.rotation.set(Math.PI / 2, 0, Math.PI / 2 + Math.PI * 0.95);
    guard.position.set(P.gripX + 0.09, -0.1, 0);
    g.add(guard);
    g.add(B(0.014, 0.05, 0.014, mats.steel, P.gripX + 0.085, -0.09, 0, 0.15)); /* 扳机 */

    /* ============ 弹匣 ============ */
    if (cfg.mag && cfg.mag !== 'none' && cfg.mag !== 'revolver' && cfg.mag !== 'double') {
      const mag = buildMag(cfg.mag, mats);
      const magX = isBullpup ? (cfg.mag === 'topFlat' ? 0.05 : -0.28) : P.magX;
      mag.position.set(magX, isBullpup && cfg.mag !== 'topFlat' ? -0.06 : 0, 0);
      g.add(mag);
      if (isBullpup) g.add(B(0.1, 0.05, recW, mats.dark, magX, -0.02, 0)); /* 弹匣座 */
    } else if (cfg.mag === 'revolver') {
      /* 转轮：弹轮 + 烧蚀槽 */
      const cylG = new THREE.Group();
      cylG.add(C(0.058, 0.085, mats.steel, 'x', 0, 0, 0, 24));
      for (let i = 0; i < 6; i++) {
        const a = i / 6 * Math.PI * 2;
        cylG.add(B(0.09, 0.012, 0.014, mats.dark, 0, Math.sin(a) * 0.036, Math.cos(a) * 0.036, 0, a));
      }
      cylG.position.set(-0.04, 0.0, 0);
      g.add(cylG);
      /* 枪管下托 + 准星 */
      g.add(B(0.4, 0.028, 0.032, mats.metal, 0.16, -0.035, 0));
      g.add(B(0.016, 0.05, 0.01, mats.metal, P.frontX - 0.05, 0.05, 0));
      /* 击锤 */
      g.add(B(0.028, 0.055, 0.024, mats.dark, -0.2, 0.1, 0, 0.35));
      /* 弧形握把 */
      g.add(B(0.05, 0.16, 0.05, mats.wood || mats.body, -0.16, -0.14, 0, -0.5));
      g.add(B(0.055, 0.05, 0.052, mats.dark, -0.21, -0.22, 0, -0.7));
      const guard = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.008, 8, 20, Math.PI * 1.15), mats.metal);
      guard.rotation.set(Math.PI / 2, 0, Math.PI / 2 + Math.PI);
      guard.position.set(-0.08, -0.07, 0);
      g.add(guard);
      g.add(B(0.012, 0.04, 0.012, mats.steel, -0.075, -0.065, 0, 0.2));
    }

    /* ============ 枪托 ============ */
    if (cfg.stock && cfg.stock !== 'none' && kind !== 'pistol' && kind !== 'revolver') {
      const st = buildStock(isBullpup ? 'bullpup' : cfg.stock, mats, kind);
      const sx = isBullpup ? -0.42 : (kind === 'sr' ? -0.85 : -0.28);
      st.position.x = sx;
      g.add(st);
    }

    /* ============ 瞄具（底座贴导轨顶面 / 光轴平行枪管 / z=0 居中） ============ */
    if (cfg.scope && cfg.scope !== 'none' && cfg.scope !== 'iron') {
      const sc = buildScope(flavor.integralScope ? 'scope4' : cfg.scope, mats.metal, flavor);
      const scX = (kind === 'sr' || isBullpup) ? -0.05 : 0;
      let scY;
      if (kind === 'pistol') scY = recH + 0.09;          /* 滑套顶面 */
      else if (kind === 'sr') scY = 0.11;                /* 机匣顶面 */
      else if (cfg.mag === 'topFlat') scY = 0.134;       /* P90 上置弹匣顶面 */
      else if (cfg.mag === 'panTop') scY = 0.173;        /* DP-28 弹盘顶面（含散热鳍） */
      else scY = upperH + 0.03;                          /* 机匣导轨顶面 */
      sc.position.set(scX, scY, 0);
      g.add(sc);
      /* 记录倍镜眼点（ADS 用）：镜筒包围盒中心后移 0.3 作为眼距 */
      try {
        const bb = new THREE.Box3().setFromObject(sc);
        const ct = bb.getCenter(new THREE.Vector3());
        adsEye = { x: ct.x - 0.3, y: ct.y };
      } catch (err) { adsEye = { x: scX - 0.3, y: scY + 0.1 }; }
    }

    /* ============ 两脚架 ============ */
    if (cfg.bipod) {
      const bx = bStart + bLen * 0.45;
      for (let s = 0; s < 2; s++) {
        const leg = C(0.009, 0.24, mats.metal, 'y', bx, -0.12, s === 0 ? 0.045 : -0.045);
        leg.rotation.x = (s === 0 ? 1 : -1) * 0.22;
        leg.rotation.z = 0.12;
        g.add(leg);
      }
      g.add(B(0.05, 0.03, recW + 0.02, mats.metal, bx, 0.0, 0));
    }

    /* ============ LMG 专属 ============ */
    if (kind === 'lmg') {
      g.add(B(0.045, 0.16, 0.04, mats.dark, recCX + recL / 2 + P.handL * scaleL - 0.06, -0.14, 0)); /* 前握把 */
      g.add(B(0.1, 0.03, 0.04, mats.metal, recCX - recL / 2 - 0.03, upperH / 2, 0));               /* 尾托 */
    }

    /* ============ 手枪 / 左轮 ============ */
    if (kind === 'pistol') {
      /* 已有机匣结构，补充滑套细节 */
      g.add(B(0.5, 0.11, recW + 0.012, mats.steel, 0.01, recH + 0.035, 0));      /* 滑套 */
      for (let i = 0; i < 4; i++) {
        g.add(B(0.014, 0.09, 0.006, mats.dark, -0.18 + i * 0.035, recH + 0.035, (recW + 0.012) / 2));
        g.add(B(0.014, 0.09, 0.006, mats.dark, -0.18 + i * 0.035, recH + 0.035, -(recW + 0.012) / 2));
      }
      if (gun.id === 'deagle') g.add(B(0.16, 0.018, 0.03, mats.metal, 0.18, recH + 0.098, 0)); /* 顶部肋条（前段，避让红点镜座） */
      g.add(B(0.018, 0.026, 0.018, mats.dark, 0.23, recH + 0.098, 0));            /* 准星 */
      g.add(B(0.04, 0.028, 0.05, mats.dark, -0.21, recH + 0.096, 0));             /* 照门 */
      g.add(B(0.16, 0.05, recW, mats.body, 0.14, -0.01, 0));                      /* 防尘盖 */
      g.add(C(0.016, 0.05, mats.metal, 'x', 0.29, 0.012, 0));                     /* 枪口 */
      if (gun.id !== 'p18c') {
        g.add(B(0.024, 0.04, 0.02, mats.dark, -0.24, recH * 0.75, 0, 0.4));       /* 击锤 */
      }
    }

    /* ============ Win94 杠杆 ============ */
    if (flavor.lever) {
      const lever = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.011, 8, 22, Math.PI * 1.2), mats.steel);
      lever.rotation.set(Math.PI / 2, 0, Math.PI * 0.9);
      lever.position.set(-0.12, -0.1, 0);
      g.add(lever);
      g.add(B(0.028, 0.06, 0.02, mats.steel, -0.16, 0.12, 0, 0.4)); /* 击锤 */
    }

    /* ============ 空投金光 ============ */
    if (gun.rarity === 'airdrop') {
      const glow = new THREE.PointLight(0xffc860, 0.8, 4.5);
      glow.position.set(0, 0.5, 0.9);
      g.add(glow);
    }

    /* 居中悬浮 */
    const bbox = new THREE.Box3().setFromObject(g);
    const center = bbox.getCenter(new THREE.Vector3());
    g.position.x -= center.x;
    gunBaseY = 0.14 - center.y;
    g.position.y = gunBaseY;
    return g;
  }

  /* ================= 场景 ================= */
  function makeEnvTexture() {
    const cv = document.createElement('canvas');
    cv.width = 256; cv.height = 128;
    const ctx = cv.getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, 0, 128);
    grad.addColorStop(0, '#3d4350');
    grad.addColorStop(0.42, '#1a2029');
    grad.addColorStop(0.55, '#0c1016');
    grad.addColorStop(1, '#05070a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 128);
    /* 顶部暖光带（模拟主灯） */
    ctx.fillStyle = 'rgba(255, 235, 200, 0.85)';
    ctx.fillRect(30, 8, 90, 14);
    /* 冷色辅光 */
    ctx.fillStyle = 'rgba(140, 180, 255, 0.5)';
    ctx.fillRect(180, 30, 60, 10);
    /* 侧边微光 */
    ctx.fillStyle = 'rgba(255, 180, 90, 0.25)';
    ctx.fillRect(0, 55, 30, 8);
    const tex = new THREE.CanvasTexture(cv);
    tex.mapping = THREE.EquirectangularReflectionMapping;
    return tex;
  }

  function makeContactShadow() {
    const cv = document.createElement('canvas');
    cv.width = 128; cv.height = 128;
    const ctx = cv.getContext('2d');
    const grad = ctx.createRadialGradient(64, 64, 8, 64, 64, 62);
    grad.addColorStop(0, 'rgba(0,0,0,0.65)');
    grad.addColorStop(0.6, 'rgba(0,0,0,0.25)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(cv);
  }

  function init(canvasId) {
    canvasEl = document.getElementById(canvasId);
    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x0a0e14, 8, 17);

    camera = new THREE.PerspectiveCamera(HIP_FOV, canvasEl.clientWidth / canvasEl.clientHeight, 0.1, 100);

    renderer = new THREE.WebGLRenderer({ canvas: canvasEl, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(canvasEl.clientWidth, canvasEl.clientHeight);
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;

    /* PBR 环境反射 */
    const pmrem = new THREE.PMREMGenerator(renderer);
    pmrem.compileEquirectangularShader();
    const envTex = makeEnvTexture();
    scene.environment = pmrem.fromEquirectangular(envTex).texture;
    envTex.dispose();
    pmrem.dispose();

    /* 灯光 */
    scene.add(new THREE.HemisphereLight(0xbfd0e8, 0x1a1410, 0.55));
    const key = new THREE.DirectionalLight(0xfff1d0, 1.5);
    key.position.set(3.5, 5.5, 4);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x4d8dff, 0.9);
    rim.position.set(-4, 3, -5);
    scene.add(rim);
    const fill = new THREE.PointLight(0xffa040, 0.55, 12);
    fill.position.set(-2.5, 1.5, 3);
    scene.add(fill);
    const edge = new THREE.PointLight(0x88bbff, 0.4, 10);
    edge.position.set(3, -0.5, -2);
    scene.add(edge);

    /* 六边形展示台 */
    const hex = new THREE.Mesh(
      new THREE.CylinderGeometry(1.55, 1.7, 0.09, 6),
      new THREE.MeshStandardMaterial({ color: 0x161c26, roughness: 0.4, metalness: 0.7 })
    );
    hex.rotation.y = Math.PI / 6;
    hex.position.y = -0.33;
    scene.add(hex);
    platformRing = new THREE.Mesh(
      new THREE.RingGeometry(1.5, 1.56, 6),
      new THREE.MeshBasicMaterial({ color: 0x2a3546, side: THREE.DoubleSide })
    );
    platformRing.rotation.x = -Math.PI / 2;
    platformRing.rotation.z = Math.PI / 6;
    platformRing.position.y = -0.283;
    scene.add(platformRing);
    const grid = new THREE.GridHelper(10, 30, 0x1c2735, 0x141c26);
    grid.position.y = -0.38;
    scene.add(grid);

    /* 远处射击靶（ADS 开镜瞄准参照物，靶心与瞄准线 y≈0.25 齐平） */
    const tgt = new THREE.Group();
    const woodM = new THREE.MeshStandardMaterial({ color: 0x6b4b2a, roughness: 0.85 });
    const faceM = new THREE.MeshStandardMaterial({ color: 0xcfcabb, roughness: 1 });
    tgt.add(C(0.03, 0.3, woodM, 'y', 0, -0.29, 0));            /* 支柱 */
    const face = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.04, 28), faceM);
    face.rotation.z = Math.PI / 2; face.position.y = 0.25;
    face.castShadow = true;
    tgt.add(face);                                              /* 靶盘 */
    const ringCols = [[0.30, 0x1a1a1a], [0.20, 0xe8e4d8], [0.10, 0x1a1a1a], [0.045, 0xc23b22]];
    for (const [r, col] of ringCols) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.012, 8, 32),
        new THREE.MeshStandardMaterial({ color: col, roughness: 0.9 }));
      ring.rotation.y = Math.PI / 2; ring.position.y = 0.25;
      tgt.add(ring);                                            /* 靶环 */
    }
    tgt.position.set(ADS_TARGET.x, 0, 0);
    scene.add(tgt);
    targetGroup = tgt;
    targetPlate = face;

    /* 弹孔共享几何/材质（polygonOffset 防 Z-fighting） */
    holeGeo = new THREE.CircleGeometry(0.012, 12);
    holeMat = new THREE.MeshBasicMaterial({
      color: 0x0a0a0a,
      polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2
    });

    /* 接触阴影 */
    shadowMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(3.4, 1.6),
      new THREE.MeshBasicMaterial({ map: makeContactShadow(), transparent: true, depthWrite: false })
    );
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.y = -0.278;
    scene.add(shadowMesh);

    bindControls();
    animate();
    window.addEventListener('resize', onResize);
  }

  /* ================= 交互 ================= */
  function bindControls() {
    canvasEl.addEventListener('pointerdown', e => {
      if (e.button === 2) { toggleAds(); return; }        /* 右键：开/关镜 */
      if (aimMode) return;                                 /* 打靶模式：左键射击由 shooting.js 处理 */
      if (ads && ads.active) return;                       /* 开镜中禁用拖拽 */
      dragging = true; autoRotate = false; lastX = e.clientX; lastY = e.clientY;
      canvasEl.setPointerCapture(e.pointerId);
    });
    canvasEl.addEventListener('contextmenu', e => e.preventDefault()); /* 屏蔽右键菜单 */
    canvasEl.addEventListener('pointermove', e => {
      if (!dragging) return;
      tTheta -= (e.clientX - lastX) * 0.008;
      tPhi -= (e.clientY - lastY) * 0.006;
      tPhi = Math.max(0.15, Math.min(1.4, tPhi));
      lastX = e.clientX; lastY = e.clientY;
    });
    canvasEl.addEventListener('pointerup', () => {
      dragging = false;
      setTimeout(() => { autoRotate = true; }, 3000);
    });
    canvasEl.addEventListener('wheel', e => {
      e.preventDefault();
      if (ads && ads.active) {                              /* 开镜：滚轮多档变倍（FOV 5~30） */
        const dir = e.deltaY < 0 ? 1 : -1;                  /* 上推 → 倍率更高 → FOV 更小 */
        adsFovStep = Math.max(0, Math.min(ADS_FOV_STEPS.length - 1, adsFovStep + dir));
        ads.fromFov = camera.fov; ads.toFov = ADS_FOV_STEPS[adsFovStep]; ads.t = 0;
        return;
      }
      tRadius = Math.max(2.2, Math.min(8, tRadius + e.deltaY * 0.003));
    }, { passive: false });
    let pinchDist = 0;
    canvasEl.addEventListener('touchstart', e => {
      if (e.touches.length === 2) {
        pinchDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY);
      }
    });
    canvasEl.addEventListener('touchmove', e => {
      if (e.touches.length === 2) {
        const d = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY);
        tRadius = Math.max(2.2, Math.min(8, tRadius - (d - pinchDist) * 0.01));
        pinchDist = d;
      }
    }, { passive: true });
  }

  /* ================= 切换 ================= */
  function showGun(gun) {
    if (ads) exitAds(true);                     /* 换枪时立即退出开镜 */
    const newGroup = createGun(gun);
    newGroup.scale.setScalar(0.01);
    scene.add(newGroup);
    transition = { out: gunGroup, inn: newGroup, t0: performance.now() };
    gunGroup = newGroup;
    const isAir = gun.rarity === 'airdrop';
    platformRing.material.color.set(isAir ? 0xffc040 : 0x2a3546);
  }

  function easeOutBack(x) {
    const c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
  }

  function animate() {
    requestAnimationFrame(animate);
    const now = performance.now();
    const dt = Math.min(0.05, clock.getDelta());
    recoilX *= Math.max(0, 1 - dt * 12);            /* 枪模后坐回位 */
    fovKick += (0 - fovKick) * Math.min(1, dt * 10); /* FOV 冲击回落 */

    if (autoRotate && !dragging) tTheta += 0.0032;
    theta += (tTheta - theta) * 0.08;
    phi += (tPhi - phi) * 0.08;
    radius += (tRadius - radius) * 0.08;

    if (ads) {
      /* ---- ADS：相机飞向倍镜眼点 + FOV 平滑过渡（0.2s，SmoothStep 插值） ---- */
      ads.t = Math.min(1, ads.t + dt / ADS_TIME);
      const k = ads.t * ads.t * (3 - 2 * ads.t);
      camera.position.lerpVectors(ads.fromPos, ads.toPos, k);
      _adsLook.lerpVectors(ads.fromLook, ads.toLook, k);
      camera.lookAt(_adsLook);
      camera.fov = ads.fromFov + (ads.toFov - ads.fromFov) * k + fovKick;
      camera.updateProjectionMatrix();
      if (ads.active && ads.t >= 1 && gunGroup) gunGroup.visible = false; /* 开镜到位：隐藏枪模防穿模 */
      if (!ads.active && ads.t >= 1) ads = null;                          /* 关镜到位：交还轨道控制 */
    } else if (camTween) {
      /* ---- 通用相机过渡（进入/退出打靶模式） ---- */
      camTween.t = Math.min(1, camTween.t + dt / camTween.dur);
      const k = camTween.t * camTween.t * (3 - 2 * camTween.t);
      camera.position.lerpVectors(camTween.fromPos, camTween.toPos, k);
      _adsLook.lerpVectors(camTween.fromLook, camTween.toLook, k);
      camera.lookAt(_adsLook);
      camera.fov = camTween.fromFov + (camTween.toFov - camTween.fromFov) * k + fovKick;
      camera.updateProjectionMatrix();
      if (camTween.t >= 1) camTween = null;
    } else if (aimMode) {
      /* ---- 打靶模式：肩后持枪视角 + 轻微呼吸晃动 ---- */
      const sx = Math.sin(now * 0.0012) * 0.004;
      const sy = Math.cos(now * 0.0009) * 0.003;
      camera.position.set(-0.55 + sx, 0.33 + sy, 0.18);
      camera.lookAt(ADS_TARGET.x, ADS_TARGET.y, 0);
      camera.fov = HIP_FOV + fovKick;
      camera.updateProjectionMatrix();
    } else {
      camera.position.set(
        radius * Math.sin(phi) * Math.sin(theta),
        radius * Math.cos(phi),
        radius * Math.sin(phi) * Math.cos(theta)
      );
      camera.lookAt(0, 0.08, 0);
      camera.fov = HIP_FOV + fovKick;
      camera.updateProjectionMatrix();
    }

    /* ---- 靶子动画：命中晃动 / 倒下与复位 ---- */
    if (targetAnim) {
      const a = targetAnim;
      a.t += dt;
      if (a.mode === 'shake') {
        const t = a.t / 0.4;
        if (t >= 1) { targetGroup.rotation.x = 0; targetAnim = null; }
        else targetGroup.rotation.x = Math.sin(t * 25) * THREE.MathUtils.degToRad(3.5) * (1 - t);
      } else if (a.phase === 'down') {                 /* 向后倒下 */
        const t = Math.min(1, a.t / 0.6);
        targetGroup.rotation.z = -THREE.MathUtils.degToRad(85) * t * t;
        if (t >= 1) { a.phase = 'wait'; a.t = 0; }
      } else if (a.phase === 'wait') {
        if (a.t >= 2) { a.phase = 'up'; a.t = 0; }
      } else {                                         /* 弹起复位 */
        const t = Math.min(1, a.t / 0.5);
        targetGroup.rotation.z = -THREE.MathUtils.degToRad(85) * (1 - t) * (1 - t);
        if (t >= 1) {
          targetGroup.rotation.z = 0;
          while (bulletHoles.length) {                 /* 复位清弹孔 */
            const h = bulletHoles.pop();
            h.parent.remove(h); h.geometry.dispose();
          }
          targetHp = 5;
          targetAnim = null;
        }
      }
    }

    if (transition) {
      const t = (now - transition.t0) / 650;
      if (transition.out) {
        const s = Math.max(0.01, 1 - t * 2.2);
        transition.out.scale.setScalar(s);
        transition.out.rotation.y -= 0.05;
        if (t >= 0.45) {
          scene.remove(transition.out);
          disposeGroup(transition.out);
          transition.out = null;
        }
      }
      if (transition.inn) {
        const ti = Math.max(0, Math.min(1, (now - transition.t0) / 750 - 0.12));
        if (ti > 0) transition.inn.scale.setScalar(Math.max(0.01, easeOutBack(ti)));
      }
      if (t >= 1 && !transition.out) transition = null;
    }
    /* 悬浮呼吸（开镜/打靶时冻结 y 漂移）+ 射击后坐位移 */
    if (gunGroup && !ads && (!transition || !transition.out)) {
      gunGroup.position.y = gunBaseY + Math.sin(now * 0.0011) * 0.022;
    }
    if (gunGroup && !transition) gunGroup.position.x = -recoilX;

    renderer.render(scene, camera);
  }

  function disposeGroup(g) {
    g.traverse(o => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) {
        (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.dispose());
      }
    });
  }

  function onResize() {
    if (!canvasEl) return;
    camera.aspect = canvasEl.clientWidth / canvasEl.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(canvasEl.clientWidth, canvasEl.clientHeight);
  }

  /* ================= ADS 开镜瞄准 ================= */
  function toggleAds() {
    if (ads && ads.t < 1) return;               /* 过渡中不重复触发 */
    if (ads) exitAds(false); else enterAds();
  }
  function enterAds() {
    if (!gunGroup || transition) return;        /* 无枪 / 换枪动画中禁止开镜 */
    const fromPos = camera.position.clone();
    const eye = adsEye || { x: -0.3, y: 0.2 };
    const toPos = new THREE.Vector3(
      gunGroup.position.x + eye.x,
      gunGroup.position.y + eye.y,
      gunGroup.position.z);
    ads = {
      active: true, t: 0,
      fromPos,
      toPos,
      fromLook: new THREE.Vector3(0, 0.08, 0),
      toLook: new THREE.Vector3(ADS_TARGET.x, ADS_TARGET.y, 0),  /* 视线沿枪管指向靶心 */
      fromFov: camera.fov,
      toFov: ADS_FOV_STEPS[adsFovStep]
    };
    autoRotate = false;
    setMaskActive(true);
  }
  function exitAds(instant) {
    if (!ads) return;
    if (gunGroup) gunGroup.visible = true;      /* 立即恢复枪模显示 */
    setMaskActive(false);
    if (instant) { ads = null; camera.fov = HIP_FOV; camera.updateProjectionMatrix(); return; }
    const home = aimMode ? shoulderPose() : null;   /* 打靶模式下关镜：回到肩后位而非轨道位 */
    ads = {
      active: false, t: 0,
      fromPos: camera.position.clone(),
      toPos: home ? home.pos.clone() : new THREE.Vector3(
        radius * Math.sin(phi) * Math.sin(theta),
        radius * Math.cos(phi),
        radius * Math.sin(phi) * Math.cos(theta)),
      fromLook: _adsLook.clone(),
      toLook: home ? home.look.clone() : new THREE.Vector3(0, 0.08, 0),
      fromFov: camera.fov,
      toFov: HIP_FOV
    };
  }
  function setMaskActive(on) {
    const m = document.getElementById('scope-mask');
    if (m) m.classList.toggle('active', on);
    document.body.classList.toggle('ads-on', on);   /* 联动淡出所有 HUD */
  }

  /* ================= 打靶模式 / 射击系统接口（供 shooting.js 调用） ================= */
  function shoulderPose() {
    return {
      pos: new THREE.Vector3(-0.55, 0.33, 0.18),
      look: new THREE.Vector3(ADS_TARGET.x, ADS_TARGET.y, 0)
    };
  }
  /* 进入/退出打靶模式（肩后持枪视角） */
  function setAimMode(on) {
    if (on === aimMode || !camera) return;
    aimMode = on;
    if (on) {
      if (ads) exitAds(true);
      autoRotate = false;
      const home = shoulderPose();
      camTween = { fromPos: camera.position.clone(), toPos: home.pos,
                   fromLook: _adsLook.clone(), toLook: home.look,
                   fromFov: camera.fov, toFov: HIP_FOV, t: 0, dur: 0.35 };
    } else {
      if (ads) exitAds(true);
      camTween = { fromPos: camera.position.clone(),
                   toPos: new THREE.Vector3(
                     radius * Math.sin(phi) * Math.sin(theta),
                     radius * Math.cos(phi),
                     radius * Math.sin(phi) * Math.cos(theta)),
                   fromLook: _adsLook.clone(), toLook: new THREE.Vector3(0, 0.08, 0),
                   fromFov: camera.fov, toFov: HIP_FOV, t: 0, dur: 0.35 };
    }
  }
  /* 射击后坐冲击：amount 为枪型系数 */
  function kick(amount) {
    recoilX = Math.min(0.06, recoilX + 0.022 * amount);
    fovKick = Math.min(4, fovKick + 1.6 * amount);
  }
  /* 靶子命中：分环判定 + 弹孔贴花 + 晃动/倒下，返回环数（倒下中返回 null） */
  function hitTarget(point, normal) {
    if (!targetGroup || (targetAnim && targetAnim.mode === 'fall')) return null;
    const toHit = point.clone().sub(new THREE.Vector3(ADS_TARGET.x, ADS_TARGET.y, 0));
    const planar = Math.hypot(toHit.y, toHit.z);            /* 靶面法线沿 X → 平面内为 YZ */
    const ring = Math.max(1, Math.min(10, 10 - Math.floor(planar / 0.42 * 10)));
    /* 弹孔贴花：小黑圆片贴靶面，挂到靶盘随倒下一起运动 */
    const hole = new THREE.Mesh(holeGeo, holeMat);
    hole.position.copy(point).addScaledVector(normal, 0.004);
    hole.lookAt(point.clone().add(normal));
    scene.add(hole);
    targetGroup.attach(hole);                               /* 保持世界变换挂到靶 */
    bulletHoles.push(hole);
    if (bulletHoles.length > 20) {
      const old = bulletHoles.shift();
      old.parent.remove(old); old.geometry.dispose();
    }
    /* 倒下计数 / 晃动 */
    if (--targetHp <= 0) {
      targetHp = 5;
      targetAnim = { mode: 'fall', phase: 'down', t: 0 };
    } else if (!targetAnim) {
      targetAnim = { mode: 'shake', t: 0 };
    }
    return ring;
  }
  /* 从屏幕中心（准星）向靶子射线检测，shooting.js 每次射击调用 */
  function shootRay() {
    if (!targetGroup || !camera) return { hit: false };
    _ray.setFromCamera(_center2, camera);
    const hits = _ray.intersectObject(targetGroup, true);
    if (!hits.length) return { hit: false };
    const h = hits[0];
    const n = h.face.normal.clone().transformDirection(h.object.matrixWorld);
    const ring = hitTarget(h.point, n);
    return { hit: true, ring, point: h.point };
  }
  /* 靶子空间信息（3D 音效：距离衰减 + 声像） */
  function getTargetInfo() {
    const wp = new THREE.Vector3(ADS_TARGET.x, ADS_TARGET.y, 0);
    const dist = camera.position.distanceTo(wp);
    const local = camera.worldToLocal(wp.clone());
    return { dist, pan: Math.max(-1, Math.min(1, local.x / Math.max(0.1, dist))) };
  }
  /* 世界坐标 → 屏幕像素（命中飘字定位） */
  function projectToScreen(p) {
    const v = p.clone().project(camera);
    return { x: (v.x * 0.5 + 0.5) * canvasEl.clientWidth,
             y: (-v.y * 0.5 + 0.5) * canvasEl.clientHeight,
             front: v.z < 1 };
  }

  function resetView() {
    if (ads) exitAds(true);
    if (aimMode) { aimMode = false; camTween = null; document.body.classList.remove('aim-mode'); }
    tTheta = 0.62; tPhi = 1.12; tRadius = 4.3;
    autoRotate = true;
  }

  /* 正交自检视图：side 侧视 / top 顶视 / front 前视 */
  function setView(name) {
    if (ads) exitAds(true);
    if (aimMode) { aimMode = false; camTween = null; document.body.classList.remove('aim-mode'); }
    autoRotate = false;
    tRadius = 3.4;
    if (name === 'side') { tTheta = 0; tPhi = Math.PI / 2 * 0.98; }
    else if (name === 'top') { tTheta = 0.001; tPhi = 0.06; }
    else if (name === 'front') { tTheta = Math.PI / 2; tPhi = Math.PI / 2 * 0.98; }
    else { resetView(); }
  }

  return { init, showGun, resetView, setView, toggleAds,
           setAimMode, shootRay, kick, getTargetInfo, projectToScreen };
})();
