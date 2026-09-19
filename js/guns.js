/* ============================================================
 * 和平精英 · 随机枪械图鉴 数据库
 * stats: dmg 伤害 / rate 射速 / rng 射程 / stb 稳定性（0-100 相对值）
 * model: 供 scene.js 程序化建模使用
 * ============================================================ */

const TYPE_COLORS = {
  '突击步枪': '#4da3ff',
  '射手步枪': '#8f7bff',
  '狙击枪':   '#ff5d5d',
  '冲锋枪':   '#4dd2a0',
  '霰弹枪':   '#ff9d4d',
  '轻机枪':   '#e5c84d',
  '手枪':     '#9aa7b5',
  '特殊':     '#b0bec5'
};

const GUNS = [
  /* ================= 突击步枪 ================= */
  {
    id: 'm416', name: 'M416', en: 'HK416', type: '突击步枪', ammo: '5.56mm', rarity: 'normal',
    stats: { dmg: 41, rate: 86, rng: 74, stb: 82 }, mag: '30发（扩容40发）',
    desc: '全能型突击步枪，配件越多越强，公认的"毕业步枪"。',
    detail: '原型为HK416，拥有最全的四个配件槽位（枪口、握把、弹匣、枪托）。满配后后座极低、弹道笔直，中远距离扫射表现优异，是各分段玩家最通用的选择。缺点是裸配手感一般，且对配件依赖度极高。',
    attach: ['步枪补偿器', '垂直握把', '快速扩容弹匣', '战术枪托'],
    model: { kind: 'ar', L: 1.0, scope: 'red', mag: 'box', stock: 'fixed', color: 0x2f353b, muzzle: 'std' }
  },
  {
    id: 'akm', name: 'AKM', en: 'AKM', type: '突击步枪', ammo: '7.62mm', rarity: 'normal',
    stats: { dmg: 47, rate: 78, rng: 78, stb: 55 }, mag: '30发（扩容40发）',
    desc: '大威力的经典步枪，一发爆头二级头，后座力堪称"猛兽"。',
    detail: '伤害在5.56/7.62常规步枪中名列前茅，命中头部收益极高，但全自动后座跳动明显，适合点射与中近距离压制。枪口推荐补偿器，压不住就拉爆头线。裸枪 即可作战，对配件依赖低。',
    attach: ['步枪补偿器', '扩容弹匣'],
    model: { kind: 'ar', L: 1.02, scope: 'red', mag: 'curved', stock: 'fixed', color: 0x2c2823, wood: 0x7a4f2a, muzzle: 'std' }
  },
  {
    id: 'scarl', name: 'SCAR-L', en: 'SCAR-L', type: '突击步枪', ammo: '5.56mm', rarity: 'normal',
    stats: { dmg: 41, rate: 82, rng: 72, stb: 84 }, mag: '30发（扩容40发）',
    desc: '稳定扎实的轻量化步枪，新手最友好的选择之一。',
    detail: '原型FN SCAR-L，射速与稳定性均衡，裸配后座就比M416小，满配件后容错率极高。缺点是上限略低于满配M416，但"捡到就能打"，过渡期神器。',
    attach: ['步枪消焰器', '垂直握把', '扩容弹匣', '战术枪托'],
    model: { kind: 'ar', L: 1.0, scope: 'red', mag: 'box', stock: 'fixed', color: 0x8a7a5c, muzzle: 'std' }
  },
  {
    id: 'm16a4', name: 'M16A4', en: 'M16A4', type: '突击步枪', ammo: '5.56mm', rarity: 'normal',
    stats: { dmg: 43, rate: 76, rng: 80, stb: 78 }, mag: '30发（扩容40发）',
    desc: '只能单发与三连发的"点射神器"，远距离表现优秀。',
    detail: '没有全自动模式，但三连发爆发力强、子弹初速高，配四倍镜当简易连狙使用是高手常用思路。近战三连发掌握好节奏同样凶悍，握把枪托槽位缺失，配件上限有限。',
    attach: ['步枪补偿器', '快速扩容弹匣'],
    model: { kind: 'ar', L: 1.05, scope: 'carry', mag: 'box', stock: 'fixed', color: 0x33383d, muzzle: 'std' }
  },
  {
    id: 'qbz95', name: 'QBZ95', en: 'QBZ-95', type: '突击步枪', ammo: '5.56mm', rarity: 'normal',
    stats: { dmg: 43, rate: 85, rng: 73, stb: 79 }, mag: '30发（扩容40发）',
    desc: '海岛图限定的国产无托步枪，火力与稳定兼备。',
    detail: '仅在海岛地图刷新，无托结构使其射速快、腰部持枪表现好。伤害比M416高2点，近距离对枪强势。因投掷物多的"背枪"问题较小，不少职业选手的偏爱。其他地图无法获取。',
    attach: ['步枪补偿器', '半截式握把', '快速扩容弹匣'],
    model: { kind: 'ar', L: 0.98, scope: 'red', mag: 'box', stock: 'bullpup', bullpup: true, color: 0x44483c, muzzle: 'std' }
  },
  {
    id: 'g36c', name: 'G36C', en: 'G36C', type: '突击步枪', ammo: '5.56mm', rarity: 'normal',
    stats: { dmg: 43, rate: 83, rng: 71, stb: 80 }, mag: '30发（扩容40发）',
    desc: '雪地图维寒迪限定步枪，手感介于M416与SCAR-L之间。',
    detail: '只出现在雪地地图，自带提把导轨可装红点，配件槽齐全。射速稍快于SCAR-L，稳定性略逊M416，雪地落点的首选主武器。',
    attach: ['步枪补偿器', '垂直握把', '快速扩容弹匣', '战术枪托'],
    model: { kind: 'ar', L: 0.97, scope: 'red', mag: 'box', stock: 'fixed', color: 0x2b2f33, muzzle: 'std' }
  },
  {
    id: 'aug', name: 'AUG', en: 'AUG A3', type: '突击步枪', ammo: '5.56mm', rarity: 'airdrop',
    stats: { dmg: 43, rate: 84, rng: 75, stb: 86 }, mag: '30发（扩容42发）',
    desc: '空投限定无托步枪，"近战激光枪"，后座小到离谱。',
    detail: '空投箱专属，裸枪后座就是全场步枪最小之一，开镜即扫、指哪打哪，近中距离表现近乎无解。只差枪口和弹匣两个配件槽，捡到即可无缝替换满配M416。远程稍弱于满配M416。',
    attach: ['步枪消音器', '扩容弹匣'],
    model: { kind: 'ar', L: 0.96, scope: 'red', mag: 'box', stock: 'bullpup', bullpup: true, color: 0x5b5f45, muzzle: 'std' }
  },
  {
    id: 'groza', name: 'Groza', en: 'OTs-14 Groza', type: '突击步枪', ammo: '7.62mm', rarity: 'airdrop',
    stats: { dmg: 49, rate: 88, rng: 62, stb: 66 }, mag: '30发（扩容40发）',
    desc: '空投限定"狗杂"，7.62伤害+高射速，近战王者。',
    detail: '空投箱专属，结合AKM的威力与接近M416的射速，室内与城区近战几乎没有对手，自带消音效果（固定消音枪口）。超过100米后弹道与稳定性明显下滑，是纯粹的近战利器。',
    attach: ['快速扩容弹匣'],
    model: { kind: 'ar', L: 0.94, scope: 'red', mag: 'curved', stock: 'bullpup', bullpup: true, color: 0x3d3a33, muzzle: 'suppressor' }
  },
  {
    id: 'm762', name: 'Beryl M762', en: 'Beryl M762', type: '突击步枪', ammo: '7.62mm', rarity: 'normal',
    stats: { dmg: 46, rate: 85, rng: 70, stb: 52 }, mag: '30发（扩容40发）',
    desc: '"猛男枪"，高伤害高射速高后座，压得住就是神枪。',
    detail: '伤害与射速都优于AKM，但垂直后座极其夸张，满配件（尤其轻型握把+半截式）后才能驯服。近战TTK极短，是高手炫技与职业比赛的常客，手残党慎用。',
    attach: ['步枪补偿器', '轻型握把', '快速扩容弹匣', '战术枪托'],
    model: { kind: 'ar', L: 1.02, scope: 'red', mag: 'curved', stock: 'fixed', color: 0x3a3128, wood: 0x6e4a28, muzzle: 'std' }
  },

  /* ================= 射手步枪 ================= */
  {
    id: 'mini14', name: 'Mini14', en: 'Mini-14', type: '射手步枪', ammo: '5.56mm', rarity: 'normal',
    stats: { dmg: 46, rate: 90, rng: 88, stb: 88 }, mag: '20发（扩容30发）',
    desc: '"粉丝枪"，初速快弹道直，连狙里最稳的选择。',
    detail: '子弹初速全场领先，远距离几乎不用抬太多提前量，后座极小可以连续快速点击。伤害偏低、爆头三级头无法一枪倒地，但容错率和跟枪手感一流，远程消耗神器。',
    attach: ['步枪枪口补偿器', '扩容弹匣', '八倍镜'],
    model: { kind: 'dmr', L: 1.08, scope: 'scope8', mag: 'box', stock: 'fixed', color: 0x7a5a38, wood: 0x7a5a38, muzzle: 'std' }
  },
  {
    id: 'sks', name: 'SKS', en: 'SKS', type: '射手步枪', ammo: '7.62mm', rarity: 'normal',
    stats: { dmg: 53, rate: 74, rng: 82, stb: 62 }, mag: '10发（扩容20发）',
    desc: '经典7.62连狙，威力可观，吃满配件后脱胎换骨。',
    detail: '伤害高于Mini14，但裸枪后座大、上跳明显，需要腮托/托腮板与握把来驯服。适合中远距离点射压血线，配件成型后是威力与射速的平衡点。',
    attach: ['步枪补偿器', '托腮板', '快速扩容弹匣', '四倍镜'],
    model: { kind: 'dmr', L: 1.1, scope: 'scope4', mag: 'box', stock: 'fixed', color: 0x6e4a28, wood: 0x6e4a28, muzzle: 'std' }
  },
  {
    id: 'slr', name: 'SLR', en: 'SLR', type: '射手步枪', ammo: '7.62mm', rarity: 'normal',
    stats: { dmg: 58, rate: 68, rng: 86, stb: 55 }, mag: '10发（扩容20发）',
    desc: '"大炮"，7.62连狙里单发威力最大，后座同样巨大。',
    detail: '单发伤害直逼栓狙的连狙，打三级甲只需三枪，爆头二级头一枪击倒。代价是明显的后座与较慢的栓动节奏，适合稳点射手远距离点名，近距离无力。',
    attach: ['步枪补偿器', '托腮板', '快速扩容弹匣', '八倍镜'],
    model: { kind: 'dmr', L: 1.12, scope: 'scope8', mag: 'box', stock: 'fixed', color: 0x4a3c2c, wood: 0x4a3c2c, muzzle: 'brake' }
  },
  {
    id: 'qbu', name: 'QBU', en: 'QBU-88', type: '射手步枪', ammo: '5.56mm', rarity: 'normal',
    stats: { dmg: 48, rate: 80, rng: 84, stb: 78 }, mag: '10发（扩容20发）',
    desc: '雨林图限定狙击步枪，趴下射击稳定 性大幅提升。',
    detail: '萨诺雨林图专属，替换SKS的位置。自带两脚架，趴下开镜后座大幅降低，配合雨林茂密的伏地玩法相得益彰，"趴着打的88狙"。',
    attach: ['步枪消焰器', '扩容弹匣', '八倍镜'],
    model: { kind: 'dmr', L: 1.1, scope: 'scope8', mag: 'box', stock: 'skeleton', color: 0x53583e, bipod: true, muzzle: 'std' }
  },
  {
    id: 'mk14', name: 'MK14 EBR', en: 'Mk14 EBR', type: '射手步枪', ammo: '7.62mm', rarity: 'airdrop',
    stats: { dmg: 61, rate: 76, rng: 92, stb: 48 }, mag: '10发（扩容20发）',
    desc: '空投"妹控"，唯一带全自动的连狙，秒人只需一瞬。',
    detail: '空投箱专属，单发伤害全场连狙第一，还自带全自动模式，近战开自动泼水就是微型大炮。后座巨大、配件要求高（托腮板必备），捡到妹控等于多一条命。',
    attach: ['步枪补偿器', '托腮板', '快速扩容弹匣', '八倍镜'],
    model: { kind: 'dmr', L: 1.14, scope: 'scope8', mag: 'box', stock: 'fixed', color: 0x5f4023, wood: 0x5f4023, muzzle: 'brake' }
  },
  {
    id: 'mk12', name: 'MK12', en: 'Mk12 SPR', type: '射手步枪', ammo: '5.56mm', rarity: 'normal',
    stats: { dmg: 47, rate: 86, rng: 83, stb: 74 }, mag: '20发（扩容30发）',
    desc: '新生代5.56连狙，射速快后座温和，均衡易上手。',
    detail: ' Ted的步枪，弹药与Mini14同为5.56，但伤害更高、配件槽更多（枪口/握把/弹匣/瞄具）。综合手感均衡，连点流畅，是新版本远距离作战的万金油。',
    attach: ['步枪补偿器', '垂直握把', '快速扩容弹匣', '六倍镜'],
    model: { kind: 'dmr', L: 1.08, scope: 'scope4', mag: 'box', stock: 'fixed', color: 0x3c4043, muzzle: 'std' }
  },
  {
    id: 'vss', name: 'VSS', en: 'VSS Vintorez', type: '射手步枪', ammo: '9mm', rarity: 'normal',
    stats: { dmg: 41, rate: 82, rng: 60, stb: 70 }, mag: '10发（扩容20发）',
    desc: '自带消音与四倍镜的"神秘步枪"，子弹下坠堪比抛物线。',
    detail: '枪械自带消音器和四倍镜，落地即可静音作战，偷袭神器的美誉与"下雨枪"的嘲笑并存。子弹初速极低，超过100米需要明显抬高弹道，适合100米内的隐秘点射。',
    attach: ['扩容弹匣'],
    model: { kind: 'dmr', L: 0.98, scope: 'scope4', mag: 'box', stock: 'skeleton', color: 0x30362f, suppressor: true, muzzle: 'suppressor' }
  },

  /* ================= 狙击枪 ================= */
  {
    id: 'kar98k', name: 'Kar98k', en: 'Kar98k', type: '狙击枪', ammo: '7.62mm', rarity: 'normal',
    stats: { dmg: 79, rate: 40, rng: 95, stb: 70 }, mag: '5发',
    desc: '"98K"，地图刷新栓狙的招牌，一枪爆头二级头的信仰。',
    detail: '地图最常见栓动狙击枪，配合八倍镜爆头可一发击倒佩戴二级头的敌人，打三级头则需补枪。栓动装填慢、弹容5发，讲究"一枪定音"，是无数玩家的情怀与信仰。',
    attach: ['狙击枪消音器', '托腮板', '子弹袋', '八倍镜'],
    model: { kind: 'sr', L: 1.1, scope: 'scope8', mag: 'none', stock: 'fixed', color: 0x6b4526, wood: 0x6b4526, muzzle: 'std' }
  },
  {
    id: 'm24', name: 'M24', en: 'M24', type: '狙击枪', ammo: '7.62mm', rarity: 'normal',
    stats: { dmg: 84, rate: 42, rng: 96, stb: 74 }, mag: '5发（扩容7发）',
    desc: '98K的全面升级版，伤害更高、拉栓更快、手感更顺。',
    detail: '曾经的空投枪，回归地图后成为7.62栓狙天花板：伤害高于98K，初速更快，爆头二级头直接击倒，还能装扩容弹匣。缺点是刷新率较低，见到务必拿走。',
    attach: ['狙击枪消音器', '托腮板', '扩容弹匣', '八倍镜'],
    model: { kind: 'sr', L: 1.14, scope: 'scope8', mag: 'box', stock: 'fixed', color: 0x2f3b33, muzzle: 'std' }
  },
  {
    id: 'awm', name: 'AWM', en: 'AWM', type: '狙击枪', ammo: '.300马格南', rarity: 'airdrop',
    stats: { dmg: 120, rate: 45, rng: 100, stb: 78 }, mag: '5发',
    desc: '空投神器，无视三级头的马格南死神，全图仅20发弹药。',
    detail: '空投箱专属，使用独有的.300马格南弹药（全场仅随枪附赠20发），爆头无视三级头直接击倒，打身体两枪必倒。伤害与射程的天花板，每一发子弹都价值千金。',
    attach: ['狙击枪消音器', '托腮板', '八倍镜'],
    model: { kind: 'sr', L: 1.22, scope: 'scope8', mag: 'box', stock: 'fixed', color: 0x2c3e31, muzzle: 'brake' }
  },
  {
    id: 'win94', name: 'Win94', en: 'Win94', type: '狙击枪', ammo: '.45口径', rarity: 'normal',
    stats: { dmg: 66, rate: 44, rng: 80, stb: 60 }, mag: '8发',
    desc: '杠杆步枪，无法安装瞄具的"机瞄之王"，沙漠图限定。',
    detail: '只在米拉玛沙漠刷新，杠杆式装填速度在栓狙里最快，但永远只能机瞄，射击距离受限。练好机瞄Win94是沙漠高手的浪漫，中距离点名非常灵活。',
    attach: ['子弹袋'],
    model: { kind: 'sr', L: 1.06, scope: 'iron', mag: 'none', stock: 'fixed', color: 0x7c5527, wood: 0x7c5527, muzzle: 'std' }
  },
  {
    id: 'amr', name: 'Lynx AMR', en: 'Lynx AMR', type: '狙击枪', ammo: '.50口径', rarity: 'airdrop',
    stats: { dmg: 135, rate: 38, rng: 100, stb: 82 }, mag: '5发（扩容7发）',
    desc: '反器材狙击步枪，一枪打爆载具，伤害天花板之上的存在。',
    detail: '空投专属的.50反器材步枪，伤害全场第一，对载具造成巨额伤害——一发重创、两发打爆正在飞驰的吉普。爆头无三级头直接击倒，缺点是极慢的栓动与稀缺的.50弹药。',
    attach: ['扩容弹匣', '八倍镜'],
    model: { kind: 'sr', L: 1.3, scope: 'scope8', mag: 'box', stock: 'fixed', color: 0x35402f, muzzle: 'brake', bipod: true }
  },

  /* ================= 冲锋枪 ================= */
  {
    id: 'uzi', name: 'UZI', en: 'Micro UZI', type: '冲锋枪', ammo: '9mm', rarity: 'normal',
    stats: { dmg: 26, rate: 97, rng: 45, stb: 60 }, mag: '25发（扩容35发）',
    desc: '射速全场第一的"腰射之王"，贴脸泼水一瞬间清空弹匣。',
    detail: '理论射速全场最快，腰射精度优秀，近距离遭遇战爆发恐怖。单发伤害低、射程短，超过30米输出断崖式下跌，不能装瞄具（机瞄可用），是"贴脸就是赢"的极端武器。',
    attach: ['冲锋枪补偿器', '快速扩容弹匣', '枪托'],
    model: { kind: 'smg', L: 0.78, scope: 'iron', mag: 'box', stock: 'folding', color: 0x33363a, muzzle: 'std' }
  },
  {
    id: 'ump45', name: 'UMP45', en: 'UMP45', type: '冲锋枪', ammo: '.45口径', rarity: 'normal',
    stats: { dmg: 39, rate: 84, rng: 62, stb: 76 }, mag: '25发（扩容35发）',
    desc: '"车王"，均衡稳定的全能冲锋枪，前期节奏利器。',
    detail: '伤害在冲锋枪里名列前茅，配件槽齐全、后座温和，中近距离综合表现均衡，装红点扫车点人两相宜，"车王"之名来自打爆载具的效率。是前期过渡到决赛圈的可靠选择。',
    attach: ['冲锋枪补偿器', '垂直握把', '快速扩容弹匣', '战术枪托'],
    model: { kind: 'smg', L: 0.92, scope: 'red', mag: 'box', stock: 'folding', color: 0x3b3f42, muzzle: 'std' }
  },
  {
    id: 'vector', name: 'Vector', en: 'Vector', type: '冲锋枪', ammo: '.45口径', rarity: 'normal',
    stats: { dmg: 31, rate: 95, rng: 58, stb: 82 }, mag: '19发（扩容33发）',
    desc: '"短剑"，点射如激光，扩容前19发弹容是硬伤。',
    detail: '后座几乎为0的激光枪，快慢机切二连发点射极其精准。默认19发弹匣容量太小，扩容后33发才能发挥泼水实力。依赖配件（枪托握把），成型后近战手感无解。',
    attach: ['冲锋枪补偿器', '垂直握把', '快速扩容弹匣', '战术枪托'],
    model: { kind: 'smg', L: 0.84, scope: 'red', mag: 'box', stock: 'folding', color: 0x2e3236, foregrip: true, muzzle: 'std' }
  },
  {
    id: 'thompson', name: '汤姆逊', en: 'Thompson', type: '冲锋枪', ammo: '.45口径', rarity: 'normal',
    stats: { dmg: 40, rate: 78, rng: 58, stb: 68 }, mag: '30发（扩容50发）',
    desc: '复古"芝加哥打字机"，弹鼓泼水，腰射强劲。',
    detail: '二战名枪的致敬之作，扩容后50发弹鼓容量在冲锋枪里名列前茅，腰射散射小，扫车与城区混战表现出色。射速中等、不能装瞄具，适合中近距离火力压制。',
    attach: ['冲锋枪消音器', '扩容弹匣'],
    model: { kind: 'smg', L: 0.94, scope: 'iron', mag: 'drumDown', stock: 'fixed', color: 0x3a2f24, wood: 0x6b4b2a, muzzle: 'std' }
  },
  {
    id: 'mp5k', name: 'MP5K', en: 'MP5K', type: '冲锋枪', ammo: '9mm', rarity: 'normal',
    stats: { dmg: 30, rate: 90, rng: 60, stb: 84 }, mag: '30发（扩容40发）',
    desc: '雪地图神冲，稳定与射速兼备，"冲锋枪里的M416"。',
    detail: '维寒迪雪地限定，配件槽全开，满配后稳定性直逼满配M416，中近距离几乎没有短板。射速快伤害略低，是雪地玩家前期就敢刚枪的底气。',
    attach: ['冲锋枪补偿器', '垂直握把', '快速扩容弹匣', '战术枪托'],
    model: { kind: 'smg', L: 0.88, scope: 'red', mag: 'box', stock: 'folding', color: 0x2f3338, muzzle: 'std' }
  },
  {
    id: 'bizon', name: '野牛冲锋枪', en: 'PP-19 Bizon', type: '冲锋枪', ammo: '9mm', rarity: 'normal',
    stats: { dmg: 35, rate: 82, rng: 58, stb: 80 }, mag: '53发（弹鼓）',
    desc: '53发弹鼓"泼水机"，不用换弹的城区压制神器。',
    detail: '弹鼓直接挂在枪管下方，53发大容量几乎不用考虑换弹时机，配合温和后座扫车压人一气呵成。伤害与射程平平、配件仅有瞄具和枪口，是"简单粗暴"的代名词。',
    attach: ['冲锋枪消音器', '红点瞄准镜'],
    model: { kind: 'smg', L: 0.94, scope: 'red', mag: 'drumTube', stock: 'fixed', color: 0x353a3d, muzzle: 'std' }
  },
  {
    id: 'p90', name: 'P90', en: 'FN P90', type: '冲锋枪', ammo: '5.7mm', rarity: 'airdrop',
    stats: { dmg: 33, rate: 92, rng: 64, stb: 84 }, mag: '50发',
    desc: '空投冲锋枪，50发大弹匣+高射速，泼水永动机。',
    detail: '空投箱专属，无托结构+50发弹匣，射速快、后座低、换弹快，中近距离火力密度全场冲锋枪第一。专属5.7mm弹药只随枪附赠，打完就得换枪，"泼完这50发就是传说"。',
    attach: ['红点瞄准镜'],
    model: { kind: 'smg', L: 0.9, scope: 'red', mag: 'topFlat', stock: 'bullpup', bullpup: true, color: 0x4b4f42, muzzle: 'suppressor' }
  },

  /* ================= 霰弹枪 ================= */
  {
    id: 's686', name: 'S686', en: 'S686', type: '霰弹枪', ammo: '12号口径', rarity: 'normal',
    stats: { dmg: 26, rate: 55, rng: 55, stb: 40 }, mag: '2发',
    desc: '"双管猎枪"，两发快速连射，贴脸一对王炸。',
    detail: '双管设计允许两发几乎同时击发，瞬间爆发全场第一，"9mm弹匣不如S686双响"。只有2发容错，打空就是白给，是"要么秒人要么被秒"的赌徒之枪。',
    attach: ['霰弹枪收束器', '子弹袋'],
    model: { kind: 'sg', L: 1.0, scope: 'iron', mag: 'double', stock: 'fixed', color: 0x6e4a2c, wood: 0x7a5230, muzzle: 'std' }
  },
  {
    id: 's1897', name: 'S1897', en: 'S1897', type: '霰弹枪', ammo: '12号口径', rarity: 'normal',
    stats: { dmg: 24, rate: 42, rng: 54, stb: 44 }, mag: '5发',
    desc: '泵动霰弹枪，一发一个不吭声，守楼卡角的噩梦。',
    detail: '泵动装填节奏感强，配合收束器可以适当收拢弹丸提升中距离命中率，是攻楼守角的经典选择。每发之间需要拉栓， MISS一枪就面临被反打的险境。',
    attach: ['霰弹枪收束器', '子弹袋'],
    model: { kind: 'sg', L: 1.02, scope: 'iron', mag: 'tube', stock: 'fixed', color: 0x5c4026, wood: 0x6e4a2c, muzzle: 'std' }
  },
  {
    id: 's12k', name: 'S12K', en: 'S12K', type: '霰弹枪', ammo: '12号口径', rarity: 'normal',
    stats: { dmg: 24, rate: 60, rng: 52, stb: 55 }, mag: '5发（扩容8发）',
    desc: '半自动霰弹枪，AK改的"喷子"，连喷不用拉栓。',
    detail: '基于AK平台的半自动霰弹枪，不用拉栓可以连续开火，装扩容后8发火力持续性好。可装步枪红点瞄具，对新手更友好，单发弹丸密度略低于泵动式。',
    attach: ['步枪补偿器', '快速扩容弹匣', '红点瞄准镜'],
    model: { kind: 'sg', L: 0.98, scope: 'red', mag: 'box', stock: 'fixed', color: 0x3a3e41, muzzle: 'std' }
  },
  {
    id: 'dbs', name: 'DBS', en: 'DBS', type: '霰弹枪', ammo: '12号口径', rarity: 'airdrop',
    stats: { dmg: 26, rate: 66, rng: 58, stb: 50 }, mag: '14发（弹匣）',
    desc: '空投霰弹枪，14发双管连喷，喷子里的"全自动"。',
    detail: '空投箱专属，双管设计+14发弹匣供弹，可以连续快速击发两轮再装填，火力持续性彻底碾压传统喷子。自带收束效果，中距离也有一定命中率，攻楼稳定性恐怖。',
    attach: ['红点瞄准镜'],
    model: { kind: 'sg', L: 1.0, scope: 'red', mag: 'double', stock: 'bullpup', bullpup: true, color: 0x3f4437, muzzle: 'std' }
  },

  /* ================= 轻机枪 ================= */
  {
    id: 'm249', name: 'M249', en: 'M249 SAW', type: '轻机枪', ammo: '5.56mm', rarity: 'airdrop',
    stats: { dmg: 45, rate: 88, rng: 78, stb: 60 }, mag: '100发（弹鼓）',
    desc: '空投机枪，100发弹鼓压制扫车，"人力割草机"。',
    detail: '空投箱专属，100发弹鼓配合高射速，是扫车、封路、压制决赛圈房区的终极答案。开火前需展开支架（趴下后座骤减），换弹8秒较长，泼完100发敌人要么没了要么绕后了。',
    attach: ['红点瞄准镜'],
    model: { kind: 'lmg', L: 1.16, scope: 'red', mag: 'belt', stock: 'fixed', color: 0x39402f, bipod: true, muzzle: 'std' }
  },
  {
    id: 'dp28', name: 'DP-28', en: 'DP-28', type: '轻机枪', ammo: '7.62mm', rarity: 'normal',
    stats: { dmg: 51, rate: 70, rng: 80, stb: 58 }, mag: '47发（弹盘）',
    desc: '"大盘鸡"，47发弹盘+7.62伤害，伏地魔的守护神。',
    detail: '地图刷新轻机枪，顶部弹盘辨识度极高，趴下射击后座几乎消失，配合7.62的伤害是守圈打点位的利器。射速慢、开镜速度慢，趴着是枪，站起来是烧火棍。',
    attach: ['红点瞄准镜'],
    model: { kind: 'lmg', L: 1.12, scope: 'red', mag: 'panTop', stock: 'fixed', color: 0x4b4436, wood: 0x4b4436, bipod: true, muzzle: 'std' }
  },
  {
    id: 'mg3', name: 'MG3', en: 'MG3', type: '轻机枪', ammo: '7.62mm', rarity: 'airdrop',
    stats: { dmg: 48, rate: 95, rng: 82, stb: 50 }, mag: '75发（弹链）',
    desc: '空投机枪，990/660双射速切换，撕碎一切的"电锯"。',
    detail: '空投箱专属，可在990与660两种射速间切换：990模式泼水如暴雨，660模式更稳更省弹。75发弹链火力凶残，中近距离压制力全场顶级，代价是巨大的后座与较慢的开镜。',
    attach: ['红点瞄准镜'],
    model: { kind: 'lmg', L: 1.2, scope: 'red', mag: 'belt', stock: 'fixed', color: 0x37412f, bipod: true, muzzle: 'brake' }
  },

  /* ================= 手枪 ================= */
  {
    id: 'p92', name: 'P92', en: 'P92', type: '手枪', ammo: '9mm', rarity: 'normal',
    stats: { dmg: 35, rate: 62, rng: 40, stb: 55 }, mag: '15发（扩容20发）',
    desc: '大容量起步手枪，落地没枪时的"保命符"。',
    detail: '原型贝瑞塔92F，15发弹容在手枪里名列前茅，落地第一时间捡到就能打。伤害平平、射程有限，定位就是过渡与应急，见到步枪请立刻替换。',
    attach: ['手枪消音器', '扩容弹匣', '红点瞄准镜'],
    model: { kind: 'pistol', L: 0.62, scope: 'iron', mag: 'box', stock: 'none', color: 0x2f3236, muzzle: 'std' }
  },
  {
    id: 'p1911', name: 'P1911', en: 'P1911', type: '手枪', ammo: '.45口径', rarity: 'normal',
    stats: { dmg: 41, rate: 58, rng: 42, stb: 50 }, mag: '7发（扩容10发）',
    desc: '.45口径老将，手枪里伤害数一数二的"小钢炮"。',
    detail: '百年经典M1911，.45口径单发伤害在常规手枪中拔尖，命中头部两枪撂倒无甲敌人。弹容只有7发是硬伤，适合贴脸偷袭，打完就跑。',
    attach: ['手枪消音器', '扩容弹匣'],
    model: { kind: 'pistol', L: 0.6, scope: 'iron', mag: 'box', stock: 'none', color: 0x35302a, muzzle: 'std' }
  },
  {
    id: 'p18c', name: 'P18C', en: 'P18C', type: '手枪', ammo: '9mm', rarity: 'normal',
    stats: { dmg: 23, rate: 88, rng: 38, stb: 48 }, mag: '17发（扩容25发）',
    desc: '唯一全自动手枪，切自动后就是一把"迷你UZI"。',
    detail: '格洛克18C的全自动版本，切到自动模式后射速狂飙，前期贴脸遭遇战经常上演手枪反杀。单发伤害低，扩容25发才是完全体，中后期基本功成身退。',
    attach: ['手枪消音器', '快速扩容弹匣', '红点瞄准镜'],
    model: { kind: 'pistol', L: 0.6, scope: 'iron', mag: 'box', stock: 'none', color: 0x30343a, muzzle: 'std' }
  },
  {
    id: 'r1895', name: 'R1895', en: 'R1895', type: '手枪', ammo: '7.62mm', rarity: 'normal',
    stats: { dmg: 55, rate: 40, rng: 48, stb: 42 }, mag: '7发',
    desc: '纳甘左轮，手枪伤害之王，一发入魂的"决斗枪"。',
    detail: '7.62口径左轮，单发伤害全场手枪第一，爆头无二级头直接击倒。装填繁琐（一发一发压）、射速慢，还有独特的"气隙"漏气设计，伤害会衰减，是老猎人的浪漫。',
    attach: ['手枪消音器'],
    model: { kind: 'revolver', L: 0.66, scope: 'iron', mag: 'revolver', stock: 'none', color: 0x4a4038, wood: 0x5c422e, muzzle: 'std' }
  },
  {
    id: 'deagle', name: '沙漠之鹰', en: 'Desert Eagle', type: '手枪', ammo: '.45口径', rarity: 'normal',
    stats: { dmg: 62, rate: 46, rng: 55, stb: 40 }, mag: '7发',
    desc: '"手炮"，可装瞄具的半自动巨兽，一枪爆头二级头。',
    detail: '空投外威力最大的手枪，62点伤害爆头可一发击倒二级头敌人，还能安装红点/全息瞄具，中距离点名能力离谱。后座巨大、换弹慢，是"一把手枪守一栋楼"的存在。',
    attach: ['手枪消音器', '红点瞄准镜'],
    model: { kind: 'pistol', L: 0.7, scope: 'red', mag: 'box', stock: 'none', color: 0x8a7b45, muzzle: 'brake' }
  },
  {
    id: 'sawedoff', name: '短管霰弹枪', en: 'Sawed-off', type: '手枪', ammo: '12号口径', rarity: 'normal',
    stats: { dmg: 22, rate: 44, rng: 30, stb: 35 }, mag: '2发',
    desc: '锯短的双管喷子，占手枪槽的"贴脸王炸"。',
    detail: '占用副武器手枪槽的双管霰弹枪，极短的枪管换来极散的弹丸，几乎只能贴脸使用。胜在出枪快、两发爆发足，蹲在楼梯转角或门后阴人效果拔群。',
    attach: ['子弹袋'],
    model: { kind: 'sg', L: 0.7, scope: 'iron', mag: 'double', stock: 'none', color: 0x5a4630, wood: 0x5a4630, muzzle: 'std' }
  },

  /* ================= 特殊 ================= */
  {
    id: 'crossbow', name: '十字弩', en: 'Crossbow', type: '特殊', ammo: '弩箭', rarity: 'normal',
    stats: { dmg: 105, rate: 15, rng: 40, stb: 30 }, mag: '1发',
    desc: '无声杀手，105伤害爆头秒人，装填慢到令人发指。',
    detail: '伤害105全场前列且开火完全无声，爆头命中无二级头敌人直接击倒，是"隐秘击杀"玩法的终极浪漫。装填一支箭约4秒，箭矢下坠明显，30米内才是它的主场。',
    attach: ['竖握把', '箭袋'],
    model: { kind: 'crossbow', L: 0.9, scope: 'red', mag: 'none', stock: 'fixed', color: 0x5c452a, wood: 0x6a4a2a }
  },
  {
    id: 'pan', name: '平底锅', en: 'Pan', type: '特殊', ammo: '—', rarity: 'normal',
    stats: { dmg: 80, rate: 20, rng: 10, stb: 0 }, mag: '—',
    desc: '"四级防弹背心"，能挡子弹的近战神器，信仰图腾。',
    detail: '挂在背后可以实打实挡下子弹，被玩家戏称"四级甲"；近战拍人一锅80伤害，两锅放倒。无数玩家的信仰收藏品——"枪可以没，锅必须带"。使用方法：拔出来，抡。',
    attach: [],
    model: { kind: 'pan', L: 0.6, color: 0x555a60 }
  }
];

/* 按类型获取随机池 */
function getPool(typeFilter) {
  if (!typeFilter || typeFilter === '全部') return GUNS;
  return GUNS.filter(g => g.type === typeFilter);
}
function getGunById(id) {
  return GUNS.find(g => g.id === id) || null;
}
