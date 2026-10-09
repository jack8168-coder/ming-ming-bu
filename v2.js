// ============================================================
// 命名簿 v2 —— 以「名字」為主角的找名字工具
// 傳統：五格全吉（81 數）、三才生剋、部首五行補八字
// 現代：字庫附「現代感」評分、菜市場字標記、聲調順口檢查
// 依賴：kangxi-data.js（康熙筆劃）、v2-data.js（自動產生）、v2-pool.js（手工字庫）、js/lunar.js（八字）
// ============================================================
(function () {
  'use strict';

  // ---------- 基礎資料 ----------
  const KX = (typeof KANGXI_DATA !== 'undefined') ? KANGXI_DATA : null;
  if (!KX) { fatal('kangxi-data.js 沒載入，無法查筆劃'); return; }
  KX['頤'] = 16; // 與 v1 一致的特別修正

  const D = V2_DATA;
  const LUCKY = new Set(Object.keys(D.LUCKY_STROKES_DATA).map(Number));
  // 81 數裡口碑特別好的「首領／富貴」數，用來加分（不是硬篩）
  const TOP = new Set([21, 23, 24, 31, 32, 33, 35, 37, 39, 41, 45, 47, 48, 52]);
  const ELS = ['木', '火', '土', '金', '水'];
  const SHENG = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };
  const KE = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' };
  const GAN_EL = { 甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土', 己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水' };
  const GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
  const ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
  const CANGGAN = {
    子: [['癸', 1]], 丑: [['己', .6], ['癸', .3], ['辛', .1]], 寅: [['甲', .6], ['丙', .3], ['戊', .1]],
    卯: [['乙', 1]], 辰: [['戊', .6], ['乙', .3], ['癸', .1]], 巳: [['丙', .6], ['庚', .3], ['戊', .1]],
    午: [['丁', .6], ['己', .3]], 未: [['己', .6], ['丁', .3], ['乙', .1]], 申: [['庚', .6], ['壬', .3], ['戊', .1]],
    酉: [['辛', 1]], 戌: [['戊', .6], ['辛', .3], ['丁', .1]], 亥: [['壬', .6], ['甲', .3]],
  };
  const SURNAME_TONE = { 李: 3, 王: 2, 陳: 2, 林: 2, 張: 1, 黃: 2, 吳: 2, 劉: 2, 蔡: 4, 楊: 2, 許: 3, 鄭: 4, 謝: 4, 郭: 1, 洪: 2, 曾: 1, 邱: 1, 廖: 4, 賴: 4, 徐: 2, 周: 1, 葉: 4, 蘇: 1, 莊: 1, 呂: 3, 江: 1, 何: 2, 蕭: 1, 羅: 2, 高: 1, 潘: 1, 簡: 3, 朱: 1, 鍾: 1, 游: 2, 彭: 2, 詹: 1, 胡: 2, 施: 1, 沈: 3, 余: 2, 盧: 2, 梁: 2, 趙: 4, 顏: 2, 柯: 1, 翁: 1, 魏: 4, 孫: 1, 戴: 4, 范: 4, 方: 1, 宋: 4, 鄧: 4, 杜: 4, 傅: 4, 侯: 2, 曹: 2, 薛: 1, 丁: 1, 卓: 2, 馬: 3, 董: 3, 唐: 2, 溫: 1, 藍: 2, 石: 2, 姚: 2, 紀: 4, 康: 1, 田: 2, 白: 2, 秦: 2 };

  // 字義字典（字庫外的字才用到）
  const GLOSS = (typeof V2_GLOSS !== 'undefined') ? V2_GLOSS : {};
  // 字庫：同字第一筆為準
  const POOL = new Map();
  for (const p of V2_POOL) if (!POOL.has(p.c)) POOL.set(p.c, p);
  // 擴充字庫：字義字典裡、不在精選字庫的字。沒有人工現代感評分（一律 3）、沒有常見字標記；
  // 性別只用「女字旁」粗分，其餘當通用。部首五行查對照表，查不到就是「？」。
  const EXT_FEMALE = new Set([...'娜姍娟媛嬅嫻姝妙娣嫚婧妲姞娉娃姬嬌媚嫄妘娥婭妃']);
  const EXT = new Map();
  for (const [c, v] of Object.entries((typeof V2_GLOSS !== 'undefined') ? V2_GLOSS : {})) {
    if (POOL.has(c) || KX[c] === undefined) continue;
    EXT.set(c, { c, g: EXT_FEMALE.has(c) ? 'F' : 'U', s: 3, t: v[1], m: v[0], hot: false, wx: D.CHAR_RADICAL_DB[c] || null, ext: true });
  }
  // 第三層「全部」：舊版常用字清單，只有拼音和聲調，沒字義、沒評分
  const ALL = new Map();
  for (const [c, v] of Object.entries((typeof V2_ALL !== 'undefined') ? V2_ALL : {})) {
    if (POOL.has(c) || EXT.has(c) || KX[c] === undefined) continue;
    ALL.set(c, { c, g: 'U', s: 3, t: v[1], m: null, hot: false, wx: D.CHAR_RADICAL_DB[c] || null, ext: true, all: true });
  }
  function activePool() {
    if (S.poolMode === 'all') return [...POOL.values(), ...EXT.values(), ...ALL.values()];
    if (S.poolMode === 'ext') return [...POOL.values(), ...EXT.values()];
    return [...POOL.values()];
  }

  // 精選名（xlsx 匯入）：key = 名1名2
  const CURATED = new Map();
  for (const n of D.CURATED) {
    const k = n.n1 + n.n2;
    const prev = CURATED.get(k);
    if (prev) { prev.styles.add(n.style); prev.genders.add(n.g); }
    else CURATED.set(k, { meaning: n.meaning, styles: new Set([n.style]), genders: new Set([n.g]) });
  }

  // ---------- 純函式 ----------
  function strokesOf(str) {
    // 回傳 {total, parts:[{c, k}], missing:[...]}；查不到就進 missing，絕不當 0
    const parts = [], missing = [];
    let total = 0;
    for (const c of [...(str || '')]) {
      const k = KX[c];
      if (k === undefined) missing.push(c);
      else { parts.push({ c, k }); total += k; }
    }
    return { total, parts, missing };
  }
  function elOf(n) {
    const last = n % 10;
    if (last === 1 || last === 2) return '木';
    if (last === 3 || last === 4) return '火';
    if (last === 5 || last === 6) return '土';
    if (last === 7 || last === 8) return '金';
    return '水';
  }
  function isLucky(n) {
    if (!n || n <= 0) return false;
    const norm = n > 81 ? ((n - 1) % 81) + 1 : n;
    return LUCKY.has(norm);
  }
  function relation(a, b) {
    if (a === b) return '比和';
    if (SHENG[a] === b) return '生';       // a 生 b
    if (SHENG[b] === a) return '被生';     // b 生 a
    if (KE[a] === b) return '剋';         // a 剋 b
    return '被剋';                        // b 剋 a
  }
  function sanCai(t, r, d) {
    const tr = relation(t, r), rd = relation(r, d);
    const good = x => x === '比和' || x === '生' || x === '被生';
    const overall = (good(tr) && good(rd)) ? '大吉' : (good(tr) || good(rd)) ? '中吉' : '需注意';
    return { t, r, d, tr, rd, overall, str: t + r + d };
  }
  function grids(S, n1, n2) {
    const g = { tian: S + 1, ren: S + n1, di: n1 + n2, wai: n2 + 1, zong: S + n1 + n2 };
    g.allLucky = ['tian', 'ren', 'di', 'wai', 'zong'].every(k => isLucky(g[k]));
    g.sc = sanCai(elOf(g.tian), elOf(g.ren), elOf(g.di));
    return g;
  }
  const pairCache = new Map();
  function validPairs(S) {
    if (pairCache.has(S)) return pairCache.get(S);
    const m = new Map();
    if (isLucky(S + 1)) {
      for (let a = 1; a <= 30; a++) {
        if (!isLucky(S + a)) continue;
        for (let b = 1; b <= 30; b++) {
          if (!isLucky(b + 1) || !isLucky(a + b) || !isLucky(S + a + b)) continue;
          m.set(a + '-' + b, grids(S, a, b));
        }
      }
    }
    pairCache.set(S, m);
    return m;
  }
  function charMeta(c) {
    // 字庫優先；不在字庫的字用對照表；都沒有就誠實標 null
    const p = POOL.get(c) || EXT.get(c) || ALL.get(c);
    const st = strokesOf(c);
    return {
      c,
      k: st.missing.length ? null : st.total,
      modern: D.MODERN_STROKE_OVERRIDES[c],
      wx: p ? p.wx : (D.CHAR_RADICAL_DB[c] || null),
      wxSrc: p ? '字庫' : (D.CHAR_RADICAL_DB[c] ? '對照表' : null),
      m: p ? p.m : (GLOSS[c] ? GLOSS[c][0] : null), s: p ? p.s : null, t: p ? p.t : (GLOSS[c] ? GLOSS[c][1] : null),
      hot: !!(p && p.hot), g: p ? p.g : null, inPool: !!p, inGloss: !p && !!GLOSS[c],
    };
  }
  function toneLabel(t) { return t === 1 || t === 2 ? '平' : '仄'; }

  // ---------- 順口檢查（聲調、連音） ----------
  // 回傳問題清單 [{key,label,why}]；資料不足（沒聲調／沒拼音）的項目略過，不猜
  function flowCheck(surTone, a, b) {
    const issues = [];
    const p1 = PY[a.c] || null, p2 = PY[b.c] || null;
    if (surTone && a.t && b.t && surTone === a.t && a.t === b.t) issues.push({ key: '三字同調', label: '三字同調', why: `三個字都是 ${a.t} 聲，唸起來平板` });
    else if (a.t && b.t && a.t === b.t) issues.push({ key: '兩字同調', label: '名字兩字同調', why: `名字兩字都是 ${a.t} 聲，少了起伏` });
    if (p1 && p2 && p1 === p2) issues.push({ key: '疊音', label: '兩字同音', why: `兩字都唸 ${p1}` });
    if (p2 && /^[aeo]/.test(p2)) issues.push({ key: '連音', label: '第二字零聲母', why: `「${b.c}」（${p2}）沒有子音開頭，接在前一個字後面容易黏成一團、聽不清楚` });
    return issues;
  }

  // ---------- 諧音檢查 ----------
  const PY = Object.assign({}, (typeof V2_PINYIN !== 'undefined') ? V2_PINYIN : {});
  for (const [c, v] of Object.entries((typeof V2_ALL !== 'undefined') ? V2_ALL : {})) if (!PY[c]) PY[c] = v[0];
  const SUR_PY = (typeof V2_SURNAME_PY !== 'undefined') ? V2_SURNAME_PY : {};
  // 台灣國語常混的音視為同音：前後鼻音、捲舌、l／n 不分（承洛→承諾）
  function normPy(p) { return p.toLowerCase().replace(/ng\b/g, 'n').replace(/zh/g, 'z').replace(/ch/g, 'c').replace(/sh/g, 's').replace(/^n/, 'l'); }
  const HOMO = [];
  for (const [word, py] of ((typeof V2_HOMOPHONES !== 'undefined') ? V2_HOMOPHONES : [])) {
    const parts = py.split(/\s+/); HOMO.push({ word, py, key: parts.map(normPy).join(' '), n: parts.length });
  }
  const HOMO_BY_KEY = new Map();
  for (const h of HOMO) { if (!HOMO_BY_KEY.has(h.key)) HOMO_BY_KEY.set(h.key, []); HOMO_BY_KEY.get(h.key).push(h.word); }
  function pyOf(c) { return PY[c] || null; }
  function surPy(surname) { return [...surname].map(c => SUR_PY[c] || PY[c] || null); }
  // 回傳 { hits:[{span, word}], py:'li luo cheng', unknown:['字'] }
  function homophoneCheck(surname, c1, c2) {
    const sp = surPy(surname), p1 = pyOf(c1), p2 = pyOf(c2);
    const unknown = [];
    sp.forEach((p, i) => { if (!p) unknown.push([...surname][i]); });
    if (!p1) unknown.push(c1); if (!p2) unknown.push(c2);
    const hits = [];
    const look = (parts, span) => { const k = parts.map(normPy).join(' '); const ws = HOMO_BY_KEY.get(k); if (ws) ws.forEach(w => hits.push({ span, word: w })); };
    const surOk = sp.every(Boolean);
    if (p1 && p2) look([p1, p2], '名字');
    if (surOk && p1) look([...sp, p1], '姓＋名1');
    if (surOk && p1 && p2) look([...sp, p1, p2], '全名');
    // 英文順序：first name + last name → 名1名2＋姓，最後兩個音是「名2＋姓」
    if (surOk && p2) look([p2, ...sp], '名2＋姓');
    if (surOk && p1 && p2) look([p1, p2, ...sp], '名1名2＋姓');
    return { hits, py: [...sp, p1, p2].map(p => p || '?').join(' '), pyEn: [p1, p2, ...sp].map(p => p || '?').join(' '), unknown };
  }
  // 五個檢查位置，各自可勾選要不要排除
  const HOMO_SPANS = ['名字', '姓＋名1', '名2＋姓', '全名', '名1名2＋姓'];
  const HOMO_SHORT = { '名字': '名字', '姓＋名1': '姓+名1', '名2＋姓': '名2+姓', '全名': '全名', '名1名2＋姓': '英文序' };
  function homoExcluded(homo) { return homo.hits.some(h => S.homoSpans.has(h.span)); }
  function homoTag(homo) {
    const parts = [];
    for (const span of HOMO_SPANS) { const ws = [...new Set(homo.hits.filter(h => h.span === span).map(h => h.word))]; if (ws.length) parts.push(`${HOMO_SHORT[span]}→${ws.join('、')}`); }
    return parts.join('；');
  }

  const DEFAULT_EXCLUDED = [...'聿旻若瑀丞笙一瑄寬璟霖樂家書宸柏致采卓庭梓'];

  // ---------- 狀態 ----------
  const S = {
    surname: '李', gender: 'M', style: 'all', sancai: 'zhongji',
    need: new Set(), needStrict: false, avoidHot: false, exclude: '', include: '',
    weight: 0.5, sort: 'overall', pair: null, limit: 48,
    poolMode: 'all', // 固定用全部字（2026-09-13 使用者拿掉三層切換：所有字一起上，只靠滑桿排序）
    pickGroup: 'gender', // 字庫勾選的分組：gender／stroke
    zodiac: '', zodiacOnly: false, zodiacAvoidOff: false, // 生肖喜忌字根（目前只有「馬」有書上資料）
    noHomo: true, // 排除對到尷尬諧音的名字
    noAwkward: true, // 排除拗口（三字同調、兩字同調、兩字同音、第二字零聲母）
    homoSpans: new Set(['名字', '姓＋名1', '名2＋姓', '全名', '名1名2＋姓']), // 哪些位置對到要排除
    bazi: null, // {pillars, counts, weak, note}
    favs: loadFavs(),
    dislikes: loadSet('naming-v2-dislikes'),
    meta: loadMeta(),
    // 字庫勾選：被劃掉的字不進名字。第一次打開用預設清單（2026-09-11 使用者初步不喜歡的字）
    excludedChars: (() => { try { const raw = localStorage.getItem('naming-v2-excluded-chars'); return raw === null ? new Set(DEFAULT_EXCLUDED) : new Set(JSON.parse(raw)); } catch { return new Set(DEFAULT_EXCLUDED); } })(),
  };
  function saveExcluded() { saveSet('naming-v2-excluded-chars', S.excludedChars); shSaveExcluded(); }

  // ---------- 計分 ----------
  function score(a, b, g) {
    let trad = g.sc.overall === '大吉' ? 45 : g.sc.overall === '中吉' ? 20 : 0;
    const wxs = [a.wx, b.wx].filter(Boolean);
    let cov = [];
    if (S.need.size) {
      cov = [...S.need].filter(e => wxs.includes(e));
      trad += Math.round(30 * cov.length / S.need.size);
    } else trad += 15; // 沒指定補什麼：給中性分
    if (TOP.has(g.zong)) trad += 15;
    if (TOP.has(g.ren)) trad += 10;
    const zwFit = ziweiFit(wxs);
    if (zwFit) trad += 10;
    const zo = zodiacCheck(a.c, b.c);
    if (zo) { if (zo.fav.length) trad += 10; trad -= 15 * zo.ruleCount; }
    trad = Math.max(0, Math.min(100, trad));
    const avg = ((a.s || 3) + (b.s || 3)) / 2;
    const modern = Math.round((avg - 1) / 4 * 100);
    const overall = Math.round(S.weight * trad + (1 - S.weight) * modern);
    return { trad, modern, overall, cov, zwFit, zo };
  }

  function buildCandidates() {
    const st = strokesOf(S.surname);
    if (st.missing.length || !st.total) return { error: `姓氏「${st.missing.join('')}」查不到康熙筆劃`, list: [] };
    const Sk = st.total;
    const pairs = validPairs(Sk);
    if (!pairs.size) return { error: `「${S.surname}」（${Sk} 劃）天格 ${Sk + 1} 不是吉數，五格無法全吉。傳統上會改看三才或改用其他派別。`, list: [] };
    const cands = [];
    const okG = p => p.g === 'U' || p.g === S.gender;
    const exclude = new Set([...S.exclude, ...S.excludedChars]);
    const include = [...S.include].filter(c => c.trim());
    const list = activePool().filter(okG);
    for (const a of list) {
      const ka = KX[a.c]; if (ka === undefined) continue;
      if (exclude.has(a.c)) continue;
      for (const b of list) {
        if (a.c === b.c) continue;
        if (S.dislikes.has(S.surname + '|' + a.c + b.c)) continue;
        const kb = KX[b.c]; if (kb === undefined) continue;
        if (exclude.has(b.c)) continue;
        if (include.length && !include.some(c => c === a.c || c === b.c)) continue;
        const g = pairs.get(ka + '-' + kb);
        if (!g) continue;
        if (S.pair && S.pair !== ka + '-' + kb) continue;
        if (S.sancai === 'daji' && g.sc.overall !== '大吉') continue;
        if (S.avoidHot && (a.hot || b.hot)) continue;
        const cur = CURATED.get(a.c + b.c) || null;
        const avg = (a.s + b.s) / 2;
        if (S.style === 'modern' && !(avg >= 3.5 || (cur && cur.styles.has('modern')))) continue;
        if (S.style === 'classic' && !(avg <= 3 || (cur && cur.styles.has('classic')))) continue;
        const sc = score(a, b, g);
        if (S.needStrict && S.need.size && sc.cov.length < S.need.size) continue;
        if (sc.zo && S.zodiacOnly && !sc.zo.fav.length) continue;
        if (sc.zo && S.zodiacAvoidOff && sc.zo.ruleCount) continue;
        const st0 = SURNAME_TONE[[...S.surname].slice(-1)[0]];
        const tones = [st0, a.t, b.t];
        const sameTone = st0 && a.t === b.t && b.t === st0;
        const homo = homophoneCheck(S.surname, a.c, b.c);
        if (S.noHomo && homoExcluded(homo)) continue;
        const flow = flowCheck(st0, a, b);
        if (S.noAwkward && flow.length) continue;
        cands.push({ key: a.c + b.c, a, b, g, ka, kb, sc, cur, tones, sameTone, homo, flow, hot: a.hot || b.hot });
      }
    }
    const cmp = {
      overall: (x, y) => y.sc.overall - x.sc.overall || y.sc.trad - x.sc.trad,
      trad: (x, y) => y.sc.trad - x.sc.trad || y.sc.modern - x.sc.modern,
      modern: (x, y) => y.sc.modern - x.sc.modern || y.sc.trad - x.sc.trad,
      zong: (x, y) => x.g.zong - y.g.zong || y.sc.overall - x.sc.overall,
      curated: (x, y) => (y.cur ? 1 : 0) - (x.cur ? 1 : 0) || y.sc.overall - x.sc.overall,
    }[S.sort];
    cands.sort(cmp);
    return { error: null, list: cands, surStrokes: Sk, pairs };
  }

  // ---------- 八字 ----------
  function computeBazi(y, m, d, hourSel) {
    if (typeof Lunar !== 'function') return { error: 'js/lunar.js 沒載入' };
    try {
      let hourZhiIdx = null, h = 0;
      if (hourSel !== '') { h = parseInt(hourSel, 10); hourZhiIdx = (h === 23 || h === 0) ? 0 : Math.floor((h + 1) / 2) % 12; }
      solar.h = h;
      Lunar(0, y, m, d);
      const pillars = [
        { n: '年', g: GanGB[gan2.y], z: ZhiGB[zhi2.y] },
        { n: '月', g: GanGB[gan2.m], z: ZhiGB[zhi2.m] },
        { n: '日', g: GanGB[gan2.d], z: ZhiGB[zhi2.d] },
      ];
      if (hourZhiIdx !== null) {
        const hg = GAN[(gan2.d * 12 + hourZhiIdx) % 10];
        pillars.push({ n: '時', g: hg, z: ZHI[hourZhiIdx] });
      }
      const counts = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
      for (const p of pillars) {
        counts[GAN_EL[p.g]] += 1;
        for (const [stem, w] of CANGGAN[p.z]) counts[GAN_EL[stem]] += w;
      }
      const weak = ELS.filter(e => counts[e] < 0.5);
      const lunarStr = `${GanGB[gan.y]}${ZhiGB[zhi.y]}年 ${lunar.l ? '閏' : ''}${lunar.m}月${lunar.d}日`;
      const zodiac = ['鼠', '牛', '虎', '兔', '龍', '蛇', '馬', '羊', '猴', '雞', '狗', '豬'][((lunar.y - 4) % 12 + 12) % 12];
      const sign = sunSign(m, d);
      // 紫微：要有時辰才排得出命宮
      let zw = null, zwErr = null;
      if (hourZhiIdx === null) zwErr = '沒有時辰，排不了紫微命宮';
      else if (typeof ziwei === 'undefined') zwErr = 'js/ziweicore.js 沒載入';
      else {
        try {
          solar.h = h;
          const place = ziwei.computeZiWei(y, m, d, ZHI[hourZhiIdx], S.gender);
          const ming = place.find(p => p.MangB === '【命宮】');
          const stars = ming ? ming.StarA.map(s => s.replace(/<[^>]*>/g, '').substring(0, 2)) : [];
          const bureau = ziwei.getFiveElement();
          const bureauEl = bureau ? bureau.charAt(0) : null;
          if (!ELS.includes(bureauEl)) throw new Error('五行局讀不到：' + bureau);
          zw = { bureau, bureauEl, stars, interp: stars.map(s => ({ name: s, ...(D.STAR_INTERPRETATION[s] || {}) })) };
        } catch (e) { zwErr = '紫微計算失敗：' + e.message; }
      }
      return { pillars, counts, weak, lunarStr, zodiac, sign, zw, zwErr, dayMaster: GAN_EL[pillars[2].g], partial: hourZhiIdx === null };
    } catch (e) {
      return { error: '八字計算失敗：' + e.message };
    }
  }

  function sunSign(m, d) {
    // cut[m-1]：該月從這一天起換成下一個星座（與 v1 的分界相同）
    const cut = [20, 19, 21, 20, 21, 22, 23, 23, 23, 24, 23, 22];
    const names = ['摩羯座', '水瓶座', '雙魚座', '牡羊座', '金牛座', '雙子座', '巨蟹座', '獅子座', '處女座', '天秤座', '天蠍座', '射手座'];
    if (m < 1 || m > 12) return '—';
    return d < cut[m - 1] ? names[m - 1] : names[m % 12];
  }
  // 生肖喜忌字根：查 v2-pool.js 的 V2_ZODIAC（書上抄的，只有字庫內的字有標）
  const ZODIAC = (typeof V2_ZODIAC !== 'undefined') ? V2_ZODIAC : {};
  function zodiacCheck(c1, c2) {
    const Z = ZODIAC[S.zodiac]; if (!Z) return null;
    const A = Z.avoid || { rules: {}, chars: {}, kou: {}, ri: {} };
    const fav = [], avoid = [], rules = new Set();
    for (const c of [c1, c2]) {
      const f = Z.chars[c]; if (f) fav.push({ c, roots: f.map(k => Z.rules[k] ? Z.rules[k].label : k), keys: f });
      const av = A.chars[c]; if (av) { avoid.push({ c, rules: av.map(k => A.rules[k] ? A.rules[k].label : k), keys: av }); av.forEach(k => rules.add(k)); }
    }
    const kou = (A.kou[c1] || 0) + (A.kou[c2] || 0), ri = (A.ri[c1] || 0) + (A.ri[c2] || 0);
    let double = null;
    if (kou >= 2) double = `兩口（${c1}${A.kou[c1] ? '×' + A.kou[c1] : ''}、${c2}${A.kou[c2] ? '×' + A.kou[c2] : ''}）`;
    else if (ri >= 2) double = `雙日（${c1}${A.ri[c1] ? '×' + A.ri[c1] : ''}、${c2}${A.ri[c2] ? '×' + A.ri[c2] : ''}）`;
    if (double) rules.add('雙口');
    const tagged = c => !!(Z.chars[c] || A.chars[c] || A.kou[c] || A.ri[c]) || POOL.has(c);
    return { fav, avoid, double, ruleCount: rules.size, untagged: [c1, c2].filter(c => !tagged(c)) };
  }
  // 紫微契合：名字部首五行 = 五行局本身或它生出的五行（沿用 v1 的 P2 判法）
  function ziweiFit(wxs) {
    const zw = S.bazi && S.bazi.zw; if (!zw) return null;
    return wxs.includes(zw.bureauEl) || wxs.includes(SHENG[zw.bureauEl]);
  }

  // ---------- 我的最愛 ----------
  function loadSet(key) { try { return new Set(JSON.parse(localStorage.getItem(key) || '[]')); } catch { return new Set(); } }
  function saveSet(key, set) { try { localStorage.setItem(key, JSON.stringify([...set])); } catch { /* 私密模式忽略 */ } }
  function loadFavs() { return loadSet('naming-v2-favs'); }
  function saveFavs() { saveSet('naming-v2-favs', S.favs); }
  function favKey(n1, n2) { return S.surname + '|' + n1 + n2; }
  // 每個名字的附加資料：note 筆記、by 誰寫的
  function loadMeta() { try { return new Map(Object.entries(JSON.parse(localStorage.getItem('naming-v2-meta') || '{}'))); } catch { return new Map(); } }
  function saveMeta() { try { localStorage.setItem('naming-v2-meta', JSON.stringify(Object.fromEntries(S.meta))); } catch { /* 私密模式忽略 */ } }
  function metaOf(k) { return S.meta.get(k) || { note: '' }; }

  // ---------- 全家共用（Google Apps Script + 試算表當後端；網址在 v2-config.js，沒設就是本機模式） ----------
  // 任何人開網址都能存，不用登入。第一次按喜歡會問稱呼（爸爸、阿嬤…），只用來標「誰按的」。
  // 協定：POST text/plain JSON {token, op, ...}；op = load | set(key,status,note,by) | note(key,note,by) | excluded(chars,by)
  //       每次都回整份 {ok, names:{key:{status,note,by,at}}, excluded:[...]|null}
  const CFG = (typeof NAMING_SYNC !== 'undefined' && NAMING_SYNC) ? NAMING_SYNC : {};
  const SH = { on: !!(CFG.url && CFG.token), nick: (() => { try { return localStorage.getItem('naming-v2-nick') || ''; } catch { return ''; } })(), timer: null, busy: 0, lastErr: '' };
  function nickAsk(force) {
    if (SH.nick && !force) return SH.nick;
    const v = (prompt('你的稱呼（給家人看的，例如：爸爸、阿嬤、小姑）', SH.nick || '') || '').trim();
    if (v) { SH.nick = v.slice(0, 12); try { localStorage.setItem('naming-v2-nick', SH.nick); } catch { /* ignore */ } setShStatus(); }
    return SH.nick;
  }
  async function shCall(body) {
    const res = await fetch(CFG.url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ token: CFG.token, ...body }) });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const j = await res.json();
    if (!j || !j.ok) throw new Error((j && j.error) || '後端回傳不是 ok');
    return j;
  }
  function applyState(j) {
    const favs = new Set(), dis = new Set(), meta = new Map();
    for (const [k, v] of Object.entries(j.names || {})) {
      if (!v) continue;
      if (v.status === 'fav') favs.add(k); else if (v.status === 'dislike') dis.add(k);
      if (v.note && v.note.trim()) meta.set(k, { note: v.note, by: v.by || '' });
    }
    S.favs = favs; S.dislikes = dis; S.meta = meta;
    saveFavs(); saveDislikes(); saveMeta();
    if (Array.isArray(j.excluded)) { S.excludedChars = new Set(j.excluded); saveSet('naming-v2-excluded-chars', S.excludedChars); renderPicker(); }
    render(); updateCounts(); if ($('favs').classList.contains('open')) renderFavs();
  }
  async function shWrite(body, what) {
    if (!SH.on) return;
    if (!body.by) body.by = nickAsk() || '匿名';
    SH.busy++; setShStatus();
    try { const j = await shCall(body); SH.lastErr = ''; applyState(j); }
    catch (e) { console.error('共用寫入失敗', what, e); SH.lastErr = String(e.message || e); toast(`共用存檔失敗：${what}。這次只存在這台，請檢查網路後再按一次。`); }
    finally { SH.busy--; setShStatus(); }
  }
  function shSetStatus(k, status) { const [surname, name] = k.split('|'); return shWrite({ op: 'set', key: k, status: status || '', note: metaOf(k).note || '' }, `${surname}${name} ${status === 'fav' ? '喜歡' : status === 'dislike' ? '不喜歡' : '移除'}`); }
  function shNote(k, note) { const [surname, name] = k.split('|'); return shWrite({ op: 'note', key: k, note }, `${surname}${name} 筆記`); }
  function shSaveExcluded() { return shWrite({ op: 'excluded', chars: [...S.excludedChars] }, '字庫勾選'); }
  async function shLoad() {
    if (!SH.on || document.hidden) return;
    try { const j = await shCall({ op: 'load' }); SH.lastErr = ''; SH.loaded = true; applyState(j); }
    catch (e) { console.error('共用讀取失敗', e); SH.lastErr = String(e.message || e); }
    setShStatus();
  }
  function setShStatus() {
    const el = $('shStatus'); if (!el) return;
    if (!SH.on) { el.innerHTML = '<span class="dot-off"></span>本機模式：候選、不喜歡只存在這台'; el.title = '還沒設定共用後端（v2-config.js）'; return; }
    const who = SH.nick ? `你是「${esc(SH.nick)}」` : '還沒填稱呼';
    if (SH.lastErr) { el.innerHTML = `<span class="dot-ro"></span>共用連不上（${esc(SH.lastErr)}）・${who} <button id="nickBtn" class="lnk">改稱呼</button>`; }
    else if (!SH.loaded) { el.innerHTML = '<span class="dot-ro"></span>連線到共用資料中，稍等再按…'; }
    else el.innerHTML = `<span class="dot-on"></span>${SH.busy ? '存檔中…' : '全家共用中'}・${who} <button id="nickBtn" class="lnk">改稱呼</button>`;
    el.title = '家人開同一個網址，看到的候選、不喜歡、筆記都是同一份';
  }
  function initShared() {
    setShStatus();
    if (!SH.on) return;
    // 共用模式：以後端為準，不拿這台的舊紀錄先畫（否則載入完成前按到的會是舊狀態）
    S.favs = new Set(); S.dislikes = new Set(); S.meta = new Map(); render(); updateCounts();
    shLoad();
    SH.timer = setInterval(shLoad, 15000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) shLoad(); });
    $('shStatus').addEventListener('click', e => { if (e.target.closest('#nickBtn')) nickAsk(true); });
  }

  // 不喜歡清單：按 ✕ 就從列表消失，抽屜裡可以放回來
  function saveDislikes() { saveSet('naming-v2-dislikes', S.dislikes); }
  function dislike(nm) {
    const [n1, n2] = [...nm]; const k = favKey(n1, n2);
    S.dislikes.add(k); saveDislikes();
    if (S.favs.has(k)) { S.favs.delete(k); saveFavs(); }
    shSetStatus(k, 'dislike');
    S.limit = Math.max(48, document.querySelectorAll('.card').length); // 補一張上來，位置不要跳
    render(); updateCounts();
    toast(`已把 ${S.surname}${nm} 放進不喜歡`, () => { undislike(nm); });
  }
  function undislike(nm) {
    const [n1, n2] = [...nm]; const k = favKey(n1, n2); S.dislikes.delete(k); saveDislikes(); shSetStatus(k, null); render(); updateCounts(); renderFavs();
  }
  function setNote(nm, note) {
    const k = favKey(...[...nm]);
    if (!note.trim()) S.meta.delete(k); else S.meta.set(k, { note, by: SH.nick || '' });
    saveMeta(); shNote(k, note);
  }
  function updateCounts() {
    $('favCount').textContent = [...S.favs].filter(x => x.startsWith(S.surname + '|')).length;
    const d = [...S.dislikes].filter(x => x.startsWith(S.surname + '|')).length;
    $('dislikeCount').textContent = d ? `✕ ${d}` : '';
  }
  let toastTimer = null;
  function toast(msg, undo) {
    const t = $('toast'); t.innerHTML = `${esc(msg)} ${undo ? '<button id="toastUndo">復原</button>' : ''}`;
    t.hidden = false; if (undo) $('toastUndo').addEventListener('click', () => { undo(); t.hidden = true; });
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, 5000);
  }

  // ---------- DOM ----------
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function fatal(msg) { const el = document.getElementById('fatal'); if (el) { el.textContent = msg; el.hidden = false; } }
  const elTag = e => e ? `<span class="wx wx-${e}">${e}</span>` : '<span class="wx wx-none">？</span>';

  function render() {
    const r = buildCandidates();
    const list = r.list;
    $('resultCount').textContent = r.error ? '' : `${list.length} 個`;
    $('surStrokes').textContent = r.surStrokes ? `${r.surStrokes} 劃・天格 ${r.surStrokes + 1}` : '';
    const grid = $('grid');
    if (r.error) { grid.innerHTML = `<div class="empty">${esc(r.error)}</div>`; $('moreWrap').hidden = true; renderPairs(null); return; }
    if (!list.length) { grid.innerHTML = '<div class="empty">沒有符合條件的名字。放寬三才、取消「必須補到」或清掉排除字試試。</div>'; $('moreWrap').hidden = true; renderPairs(r.pairs, list); return; }
    grid.innerHTML = list.slice(0, S.limit).map((c, i) => card(c, i)).join('');
    $('moreWrap').hidden = list.length <= S.limit;
    $('moreBtn').textContent = `再顯示 ${Math.min(48, list.length - S.limit)} 個（還有 ${list.length - S.limit} 個）`;
    renderPairs(r.pairs, list);
    window._v2list = list;
  }

  function card(c, i) {
    const fav = S.favs.has(favKey(c.a.c, c.b.c));
    const sc = c.g.sc;
    const cov = c.sc.cov.length ? `補${c.sc.cov.join('')}` : '';
    const tags = [];
    if (c.cur) tags.push(`<span class="tag tag-cur">精選・${c.cur.styles.has('modern') ? '現代' : ''}${c.cur.styles.size === 2 ? '／' : ''}${c.cur.styles.has('classic') ? '經典' : ''}</span>`);
    if (c.sc.zwFit) tags.push('<span class="tag tag-zw">合紫微局</span>');
    if (c.sc.zo) {
      const zo = c.sc.zo;
      if (zo.fav.length) tags.push(`<span class="tag tag-zo">${esc(S.zodiac)}喜：${esc([...new Set(zo.fav.flatMap(f => f.keys))].join('・'))}</span>`);
      const bad = [...new Set(zo.avoid.flatMap(x => x.keys))]; if (zo.double) bad.push('雙口');
      if (bad.length) tags.push(`<span class="tag tag-bad">${esc(S.zodiac)}忌：${esc(bad.join('・'))}</span>`);
    }
    if (c.hot) tags.push('<span class="tag tag-hot">常見字</span>');
    if (c.flow && c.flow.length) tags.push(`<span class="tag tag-warn">拗口：${esc(c.flow.map(f => f.label).join('、'))}</span>`);
    if (c.homo && c.homo.hits.length) tags.push(`<span class="tag tag-bad">諧音 ${esc(homoTag(c.homo))}</span>`);
    const meaning = c.cur ? c.cur.meaning : `${c.a.m}・${c.b.m}`;
    return `<article class="card ${fav ? 'is-fav' : ''}" data-key="${esc(c.key)}" style="--i:${Math.min(i, 24)}">
      <button class="fav" data-fav="${esc(c.key)}" title="加入候選" aria-label="加入候選">${fav ? '♥' : '♡'}</button>
      <button class="nope" data-nope="${esc(c.key)}" title="不喜歡，以後不要再出現" aria-label="不喜歡">✕</button>
      <div class="stamp stamp-${sc.overall === '大吉' ? 'a' : sc.overall === '中吉' ? 'b' : 'c'}">${sc.overall}</div>
      <div class="name"><span class="sur">${esc(S.surname)}</span><span>${esc(c.a.c)}</span><span>${esc(c.b.c)}</span></div>
      <div class="strokes">${c.ka}・${c.kb} 劃 ／ 總格 ${c.g.zong}</div>
      <div class="line">${elTag(sc.t)}${elTag(sc.r)}${elTag(sc.d)}<span class="dot">·</span>部首 ${elTag(c.a.wx)}${elTag(c.b.wx)} ${cov ? `<b class="cov">${cov}</b>` : ''}</div>
      <div class="meaning">${esc(meaning)}</div>
      <div class="tags">${tags.join('')}</div>
      <div class="bars">
        <span class="bar" title="傳統分（三才・補五行・吉數）"><i style="width:${c.sc.trad}%"></i><em>傳統 ${c.sc.trad}</em></span>
        <span class="bar bar-m" title="現代感（字庫評分）"><i style="width:${c.sc.modern}%"></i><em>現代 ${c.sc.modern}</em></span>
      </div>
    </article>`;
  }

  function renderPairs(pairs, list) {
    const box = $('pairTable');
    if (!pairs) { box.innerHTML = ''; return; }
    const count = new Map();
    for (const c of (list || [])) { const k = c.ka + '-' + c.kb; count.set(k, (count.get(k) || 0) + 1); }
    const rows = [...pairs.entries()].sort((x, y) => (count.get(y[0]) || 0) - (count.get(x[0]) || 0));
    box.innerHTML = `<table><thead><tr><th>名1</th><th>名2</th><th>人</th><th>地</th><th>外</th><th>總</th><th>三才</th><th>可用名</th></tr></thead><tbody>` +
      rows.map(([k, g]) => `<tr class="${S.pair === k ? 'on' : ''} ${count.get(k) ? '' : 'dim'}" data-pair="${k}">
        <td><b>${k.split('-')[0]}</b></td><td><b>${k.split('-')[1]}</b></td><td>${g.ren}</td><td>${g.di}</td><td>${g.wai}</td><td>${g.zong}</td>
        <td><span class="sc sc-${g.sc.overall === '大吉' ? 'a' : g.sc.overall === '中吉' ? 'b' : 'c'}">${g.sc.str} ${g.sc.overall}</span></td><td>${count.get(k) || 0}</td></tr>`).join('') + '</tbody></table>';
    $('pairHint').textContent = S.pair ? `目前只看 ${S.pair.replace('-', '＋')} 劃，點同一列取消` : '點一列只看該劃數組合';
  }

  // ---------- 詳細面板 ----------
  function openDetail(n1, n2, fromCheck) {
    const a = charMeta(n1), b = charMeta(n2);
    const st = strokesOf(S.surname);
    const box = $('detailBody');
    $('detail').classList.add('open');
    document.body.classList.add('drawer-open');
    const problems = [];
    if (st.missing.length) problems.push(`姓氏「${st.missing.join('')}」查不到筆劃`);
    if (a.k == null) problems.push(`「${n1}」查不到康熙筆劃`);
    if (b.k == null) problems.push(`「${n2}」查不到康熙筆劃`);
    if (problems.length) { box.innerHTML = `<div class="empty">${esc(problems.join('；'))}。這個工具不會猜筆劃，請換字或先確認寫法。</div>`; return; }
    const g = grids(st.total, a.k, b.k);
    const sc = g.sc;
    const cur = CURATED.get(n1 + n2);
    const need = [...S.need];
    const cov = need.filter(e => [a.wx, b.wx].includes(e));
    const st0 = SURNAME_TONE[[...S.surname].slice(-1)[0]];
    const gridRows = [['天格', g.tian, '姓＋1', '祖運・1～12 歲'], ['人格', g.ren, '姓＋名1', '主運・性格'], ['地格', g.di, '名1＋名2', '前運・家庭'], ['外格', g.wai, '名2＋1', '副運・人際'], ['總格', g.zong, '姓＋名1＋名2', '後運・一生']]
      .map(([lab, v, f, desc]) => {
        const lucky = isLucky(v);
        const txt = D.LUCKY_STROKES_DATA[v > 81 ? ((v - 1) % 81) + 1 : v];
        return `<tr class="${lucky ? '' : 'bad'}"><th>${lab}</th><td class="num">${v}</td><td>${elTag(elOf(v))}</td><td>${lucky ? '<b class="ok">吉</b>' : '<b class="ng">凶</b>'}</td><td class="desc"><span class="f">${f}・${desc}</span>${txt ? `<br>${esc(txt.content)}` : ''}</td></tr>`;
      }).join('');
    const rel = (x, y, r) => `${x}${r === '比和' ? '＝' : r === '生' ? '→' : r === '被生' ? '←' : r === '剋' ? '⊣' : '⊢'}${y}（${r === '被生' ? y + '生' + x : r === '被剋' ? y + '剋' + x : r === '比和' ? '比和' : x + r + y}）`;
    const scText = (x, y) => D.SANCAI_SHENGKE[x + y] || '';
    const charBlock = m => `<div class="cb">
        <div class="cb-c">${esc(m.c)}</div>
        <div class="cb-k">康熙 ${m.k} 劃${m.modern && m.modern !== m.k ? `<small>（現代寫法 ${m.modern} 劃，姓名學以康熙為準）</small>` : ''}</div>
        <div>部首五行 ${elTag(m.wx)} <small>${m.wxSrc ? '依' + m.wxSrc : '未收錄，請自行判斷'}</small></div>
        <div>字義：${m.m ? esc(m.m) : (ALL.has(m.c) ? '<small>沒有字義資料（舊版常用字清單只有讀音）</small>' : '<small>字庫和字義字典都沒有這個字</small>')}${m.inGloss ? ' <small>（字義字典）</small>' : ''}</div>
        <div>聲調：${m.t ? `${m.t} 聲（${toneLabel(m.t)}）` : '<small>—</small>'}${m.hot ? ' <span class="tag tag-hot">常見字</span>' : ''}${m.s ? ` <small>現代感 ${m.s}/5</small>` : m.inGloss ? ' <small>不在推薦字庫，沒有現代感評分</small>' : ''}</div>
      </div>`;
    const tones = [st0, a.t, b.t];
    const toneStr = tones.every(Boolean) ? `平仄：${tones.map(toneLabel).join('')}（${tones.join('-')} 聲）` : '<small>有字沒有聲調資料，平仄略過</small>';
    const fav = S.favs.has(favKey(n1, n2));
    box.innerHTML = `
      <div class="d-head">
        <div class="d-name">${esc(S.surname)}${esc(n1)}${esc(n2)}</div>
        <div class="d-sub">${g.allLucky ? '<b class="ok">五格全吉</b>' : '<b class="ng">有凶格</b>'}・三才 ${sc.str} <span class="sc sc-${sc.overall === '大吉' ? 'a' : sc.overall === '中吉' ? 'b' : 'c'}">${sc.overall}</span>・總格 ${g.zong}</div>
        ${cur ? `<div class="d-meaning">「${esc(cur.meaning)}」<small>—— 精選名單（${[...cur.styles].map(s => s === 'modern' ? '現代風' : '經典風').join('／')}）</small></div>` : ''}
        <button class="btn ${fav ? 'btn-on' : ''}" data-fav="${esc(n1 + n2)}" data-detail="1">${fav ? '♥ 已在候選' : '♡ 加入候選'}</button>
      </div>
      <h4>兩個字</h4>
      <div class="cbs">${charBlock(a)}${charBlock(b)}</div>
      <h4>五格（81 數）</h4>
      <table class="gt"><tbody>${gridRows}</tbody></table>
      <h4>三才（天→人→地）</h4>
      <div class="d-sc">
        <div>${rel(sc.t, sc.r, sc.tr)} <small>${esc(scText(sc.t, sc.r))}</small></div>
        <div>${rel(sc.r, sc.d, sc.rd)} <small>${esc(scText(sc.r, sc.d))}</small></div>
        <small>判法：天人、人地都不是相剋 → 大吉；一組相剋 → 中吉；兩組相剋 → 需注意。</small>
      </div>
      <h4>補五行</h4>
      <div>${need.length ? `想補：${need.map(elTag).join('')}　名字帶：${[a.wx, b.wx].map(elTag).join('')}　→ ${cov.length === need.length ? '<b class="ok">全補到</b>' : cov.length ? `<b class="ok">補到 ${cov.join('')}</b>，缺 ${need.filter(e => !cov.includes(e)).join('')}` : '<b class="ng">沒補到</b>'}` : '<small>尚未指定要補的五行（左側輸入生辰或手動勾選）</small>'}</div>
      <h4>紫微斗數</h4>
      <div>${S.bazi && S.bazi.zw ? (() => { const zw = S.bazi.zw; const fit = ziweiFit([a.wx, b.wx]); return `${esc(zw.bureau)}・命宮 ${zw.stars.length ? zw.stars.join('、') : '無主星（借對宮）'}<br>名字帶 ${elTag(zw.bureauEl)} 或 ${elTag(SHENG[zw.bureauEl])} 才算合局 → ${fit ? '<b class="ok">合局</b>' : '<b class="ng">不合局</b>'}${zw.interp.length ? '<br><small>' + zw.interp.map(i => i.type ? `${i.name}（${i.type}星）：${i.naming}` : '').filter(Boolean).join('；') + '</small>' : ''}`; })() : `<small>${S.bazi && S.bazi.zwErr ? esc(S.bazi.zwErr) : '左側填生辰（含時辰）後才有紫微'}</small>`}</div>
      <h4>生肖字根</h4>
      <div>${(() => {
        if (!S.zodiac) return '<small>左側「生肖喜忌」選了生肖才會看（目前只有馬有書上資料）</small>';
        const zo = zodiacCheck(n1, n2); const Z = ZODIAC[S.zodiac]; if (!zo || !Z) return '';
        const A = Z.avoid || { rules: {} };
        let h = '';
        h += zo.fav.length ? zo.fav.map(f => `<div><b class="ok">${esc(f.c)}</b> 喜用：${f.keys.map(k => `${esc(Z.rules[k].label)}<small>（${esc(Z.rules[k].why)}）</small>`).join('；')}</div>`).join('') : '<div><small>兩字都沒有書上列的喜用字根</small></div>';
        h += zo.avoid.map(x => `<div><b class="ng">${esc(x.c)}</b> 忌用：${x.keys.map(k => `${esc(A.rules[k].label)}<small>（${esc(A.rules[k].why)}）</small>`).join('；')}</div>`).join('');
        if (zo.double) h += `<div><b class="ng">${esc(zo.double)}</b> <small>${esc(A.rules['雙口'].why)}</small></div>`;
        if (zo.untagged.length) h += `<div><small>「${esc(zo.untagged.join('、'))}」不在字庫，沒有人工標記，請自己對照書頁。</small></div>`;
        h += `<div class="note">來源：書上「生肖${esc(S.zodiac)}喜用／忌用之字」，字根判定是人工看字形標的，姓氏不計入兩口雙日。</div>`;
        return h;
      })()}</div>
      <h4>聲調・唸起來順不順</h4>
      <div>${toneStr}</div>
      <div>${(() => {
        const fl = flowCheck(st0, a, b);
        const missing = [a, b].filter(m => !m.t || !PY[m.c]).map(m => m.c);
        let h = fl.length ? fl.map(f => `<div><b class="ng">${esc(f.label)}</b> <small>${esc(f.why)}</small></div>`).join('') : (missing.length ? '' : '<b class="ok">聲調有起伏、沒有連音問題</b>');
        if (missing.length) h += `<div><small>「${esc(missing.join('、'))}」沒有聲調或讀音資料，順口檢查${fl.length ? '只做了一部分' : '沒辦法做'}。</small></div>`;
        return h;
      })()}</div>
      <div class="note">一二聲是「平」、三四聲是「仄」。三個字有平有仄，唸起來才有起伏；名字兩字同一個聲調會少了起伏，三字同調更平板。第二個字如果是「安、恩、昂（a／e／o 開頭）」這種沒有子音開頭的音，接在前一個字後面容易黏成一團（恩安、詩安）。這只是順口參考，不是命理。</div>
      <h4>諧音・會不會被笑</h4>
      <div>${(() => {
        const h = homophoneCheck(S.surname, n1, n2);
        let out = `<div>中文順序：<code>${esc(h.py)}</code>　英文順序：<code>${esc(h.pyEn)}</code></div>`;
        if (h.hits.length) out += h.hits.map(x => `<div><b class="ng">${esc(x.span)}</b> 唸起來像「<b class="ng">${esc(x.word)}</b>」</div>`).join('');
        else out += '<div><b class="ok">五個位置都沒對到尷尬詞</b></div>';
        if (h.unknown.length) out += `<div><small>「${esc(h.unknown.join('、'))}」沒有讀音資料，這部分沒檢查。</small></div>`;
        out += `<div class="note">查五個位置：名字兩字、姓＋名1、全名，以及英文順序的 名2＋姓、名1名2＋姓。成語只比前兩個音（一洛→一落千丈）。比對時忽略聲調，前後鼻音、捲舌音、l／n 都當同音（所以洛丞會對到落塵、承洛會對到承諾）。字典目前 ${HOMO.length} 個詞，沒對到不代表沒問題，自己多唸幾遍、也用台語唸看看。</div>`;
        return out;
      })()}</div>
      ${fromCheck ? '<p class="note">這是你自己輸入的名字，字庫外的字不會有字義與現代感評分，但五格、三才照樣算。</p>' : ''}`;
  }
  function closeDetail() { $('detail').classList.remove('open'); document.body.classList.remove('drawer-open'); }

  // ---------- 候選（最愛）面板 ----------
  async function renderFavs() {
    const items = [...S.favs].filter(k => k.startsWith(S.surname + '|')).map(k => k.split('|')[1]);
    $('favCount').textContent = items.length;
    const box = $('favBody');
    const dis = [...S.dislikes].filter(k => k.startsWith(S.surname + '|')).map(k => k.split('|')[1]);
    const disHtml = `<h4 style="margin-top:24px">不喜歡（${dis.length}）<small>　這些不會再出現在列表；按名字可放回去</small></h4>` +
      (dis.length ? `<div class="dislist">${dis.map(nm => `<button class="chip" data-undislike="${esc(nm)}" title="放回列表">${esc(S.surname + nm)} <span>↩</span></button>`).join('')}</div><div style="margin-top:8px"><button id="dislikeClear" class="btn">全部放回去</button></div>` : '<div class="empty" style="padding:14px">還沒有。在卡片右上角按 ✕ 就會進來。</div>');
    if (!items.length) { box.innerHTML = '<div class="empty">還沒有候選。在名字卡片上按 ♡ 收藏。</div>' + disHtml; return; }
    const st = strokesOf(S.surname).total;
    const bz = S.bazi && !S.bazi.error ? S.bazi : null;
    const profile = bz ? `<div class="profile">這個人：${esc(bz.zodiac)}・${esc(bz.sign)}・八字日主 ${elTag(bz.dayMaster)}${bz.weak.length ? `・偏弱 ${bz.weak.join('')}` : ''}${bz.zw ? `・${esc(bz.zw.bureau)}・命宮 ${esc(bz.zw.stars.join('、') || '無主星')}` : ''}</div>` : '<div class="profile"><small>左側填生辰後，這裡會一起比較八字與紫微。</small></div>';
    const rows = items.map(nm => {
      const [n1, n2] = [...nm];
      const a = charMeta(n1), b = charMeta(n2);
      if (a.k == null || b.k == null) return `<tr><td>${esc(S.surname + nm)}</td><td colspan="9">筆劃查不到</td></tr>`;
      const g = grids(st, a.k, b.k);
      const cur = CURATED.get(nm);
      const sc = score(a, b, g);
      const cov = sc.cov;
      const zwFit = sc.zwFit;
      const homo = homophoneCheck(S.surname, n1, n2);
      const m = metaOf(favKey(n1, n2));
      return `<tr>
        <td class="fn" data-open="${esc(nm)}">${esc(S.surname + nm)}${homo.hits.length ? `<br><small class="ng">諧音 ${esc(homoTag(homo))}</small>` : ''}</td>
        <td class="notecell"><input class="note" data-note="${esc(nm)}" value="${esc(m.note || '')}" placeholder="筆記：誰喜歡、為什麼…">${m.by ? `<small>${esc(m.by)} 寫的</small>` : ''}</td>
        <td>${a.k}・${b.k}<br><small>總 ${g.zong}</small></td>
        <td><span class="sc sc-${g.sc.overall === '大吉' ? 'a' : g.sc.overall === '中吉' ? 'b' : 'c'}">${g.sc.str} ${g.sc.overall}</span></td>
        <td>${elTag(a.wx)}${elTag(b.wx)}<br><small>${S.need.size ? (cov.length === S.need.size ? '<b class="ok">全補</b>' : cov.length ? '補' + cov.join('') : '<b class="ng">未補</b>') : '未指定'}</small></td>
        <td>${zwFit === null ? '<small>—</small>' : zwFit ? '<b class="ok">合局</b>' : '<b class="ng">不合</b>'}</td>
        <td>${!sc.zo ? '<small>—</small>' : `${sc.zo.fav.length ? '<b class="ok">喜' + [...new Set(sc.zo.fav.flatMap(f => f.keys))].join('') + '</b>' : ''}${sc.zo.ruleCount ? ' <b class="ng">忌' + [...new Set(sc.zo.avoid.flatMap(x => x.keys))].concat(sc.zo.double ? ['雙口'] : []).join('') + '</b>' : ''}${!sc.zo.fav.length && !sc.zo.ruleCount ? '<small>無</small>' : ''}`}</td>
        <td><b>${sc.trad}</b><small> / </small>${sc.modern}</td>
        <td class="fm">${cur ? esc(cur.meaning) : esc((a.m || '—') + '・' + (b.m || '—'))}</td>
        <td><button class="x" data-unfav="${esc(nm)}" title="移除">×</button></td></tr>`;
    }).join('');
    box.innerHTML = profile + `<div class="tbl"><table class="ft"><thead><tr><th>名字</th><th>筆記</th><th>筆劃</th><th>三才</th><th>部首・補八字</th><th>紫微</th><th>生肖</th><th>傳統/現代</th><th>寓意</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>` + disHtml;
  }
  function favsText() {
    const st = strokesOf(S.surname).total;
    const items = [...S.favs].filter(k => k.startsWith(S.surname + '|')).map(k => k.split('|')[1]);
    return items.map(nm => {
      const [n1, n2] = [...nm]; const a = charMeta(n1), b = charMeta(n2);
      if (a.k == null || b.k == null) return `${S.surname}${nm}\t筆劃查不到`;
      const g = grids(st, a.k, b.k); const cur = CURATED.get(nm);
      const m = metaOf(favKey(n1, n2));
      return `${S.surname}${nm}\t${(m.note || '').replace(/\s+/g, ' ')}\t${a.k}+${b.k}劃\t總格${g.zong}\t三才${g.sc.str}${g.sc.overall}\t部首${a.wx || '?'}${b.wx || '?'}\t${cur ? cur.meaning : (a.m || '') + '・' + (b.m || '')}`;
    }).join('\n');
  }

  // ---------- 字庫勾選 ----------
  function renderPicker() {
    const box = $('charPicker'); if (!box) return;
    const list = activePool().filter(p => p.g === 'U' || p.g === S.gender);
    let groups;
    if (S.pickGroup === 'stroke') {
      // 照 Excel 第一版的排法：依康熙筆劃分組，並標這個姓氏下該筆劃能當名1／名2
      const st = strokesOf(S.surname); const pairs = st.missing.length ? new Map() : validPairs(st.total);
      const n1s = new Set(), n2s = new Set();
      for (const k of pairs.keys()) { const [a, b] = k.split('-').map(Number); n1s.add(a); n2s.add(b); }
      const by = new Map();
      for (const p of list) { const k = KX[p.c]; if (!by.has(k)) by.set(k, []); by.get(k).push(p); }
      groups = [...by.keys()].sort((a, b) => a - b).map(k => {
        const pos = [n1s.has(k) ? '名1' : '', n2s.has(k) ? '名2' : ''].filter(Boolean).join('・');
        return [`${k} 劃${pos ? '　可當' + pos : '　⚠ 這個姓配不出全吉'}`, by.get(k)];
      });
    } else {
      groups = [['通用', list.filter(p => p.g === 'U' && !p.ext)], [S.gender === 'M' ? '男生' : '女生', list.filter(p => p.g !== 'U' && !p.ext)],
        ['其他常用字（未評現代感）', list.filter(p => p.ext)]];
    }
    box.innerHTML = groups.map(([lab, arr]) => `<div class="grp">${lab}（${arr.length}）</div>` +
      arr.map(p => `<button data-pick="${esc(p.c)}" class="${S.excludedChars.has(p.c) ? 'off' : ''}" title="${esc(p.m)}・${KX[p.c] ?? '?'} 劃">${esc(p.c)}</button>`).join('')).join('');
    const n = list.filter(p => S.excludedChars.has(p.c)).length;
    $('exclCount').textContent = n ? `（已排除 ${n} 字）` : '';
  }

  // ---------- 八字區 ----------
  function renderBazi() {
    const box = $('baziOut');
    const bz = S.bazi;
    if (!bz) { box.innerHTML = ''; return; }
    if (bz.error) { box.innerHTML = `<div class="empty">${esc(bz.error)}</div>`; return; }
    const max = Math.max(1.5, ...ELS.map(e => bz.counts[e]));
    const zw = bz.zw;
    box.innerHTML = `
      <div class="facts"><span><i>生肖</i>${esc(bz.zodiac)}</span><span><i>星座</i>${esc(bz.sign)}</span><span><i>農曆</i>${esc(bz.lunarStr)}</span></div>
      <div class="pillars">${bz.pillars.map(p => `<span><i>${p.n}</i>${p.g}${p.z}</span>`).join('')}${bz.partial ? '<small>沒有時辰，只算三柱</small>' : ''}</div>
      <div class="lunar">八字日主 ${elTag(bz.dayMaster)}</div>
      <div class="ebars">${ELS.map(e => `<div class="eb"><span class="wx wx-${e}">${e}</span><i class="eb-bar"><b class="wxbg-${e}" style="width:${Math.round(bz.counts[e] / max * 100)}%"></b></i><small>${bz.counts[e].toFixed(1)}${bz.counts[e] < 0.5 ? '・弱' : ''}</small></div>`).join('')}</div>
      <div class="note">${bz.weak.length ? `五行偏弱：<b>${bz.weak.join('、')}</b>，已自動勾選為「想補」。` : '五行俱全，沒有特別要補的；想補也可以手動勾。'}</div>
      <div class="zw">${zw ? `<div class="facts"><span><i>紫微</i>${esc(zw.bureau)}</span><span><i>命宮</i>${zw.stars.length ? esc(zw.stars.join('、')) : '無主星'}</span></div>
        ${zw.interp.filter(i => i.trait).map(i => `<div class="note">${esc(i.name)}（${esc(i.type)}星）：${esc(i.trait)}。<br>${esc(i.naming)}</div>`).join('')}
        <div class="note">合局：名字帶 ${elTag(zw.bureauEl)} 或 ${elTag(SHENG[zw.bureauEl])}，卡片會標「合紫微局」並加 10 分傳統分。</div>` : `<div class="note">紫微：${esc(bz.zwErr || '')}</div>`}</div>`;
  }

  // ---------- 事件 ----------
  function bind() {
    $('surname').addEventListener('input', e => { S.surname = e.target.value.trim() || '李'; S.pair = null; render(); renderFavs(); updateCounts(); });
    document.querySelectorAll('[data-gender]').forEach(b => b.addEventListener('click', () => { S.gender = b.dataset.gender; setSeg('gender', b); render(); renderPicker(); }));
    $('charPicker').addEventListener('click', e => {
      const b = e.target.closest('[data-pick]'); if (!b) return;
      const c = b.dataset.pick; if (S.excludedChars.has(c)) S.excludedChars.delete(c); else S.excludedChars.add(c);
      saveExcluded(); renderPicker(); S.limit = 48; render();
    });
    document.querySelectorAll('[data-pgroup]').forEach(b => b.addEventListener('click', () => { S.pickGroup = b.dataset.pgroup; setSeg('pgroup', b); renderPicker(); }));
    $('surname').addEventListener('input', () => renderPicker());
    $('pickAll').addEventListener('click', () => { for (const p of POOL.values()) if (p.g === 'U' || p.g === S.gender) S.excludedChars.delete(p.c); saveExcluded(); renderPicker(); render(); });
    $('pickNone').addEventListener('click', () => { for (const p of POOL.values()) if (p.g === 'U' || p.g === S.gender) S.excludedChars.add(p.c); saveExcluded(); renderPicker(); render(); });
    $('pickDefault').addEventListener('click', () => { S.excludedChars = new Set(DEFAULT_EXCLUDED); saveExcluded(); renderPicker(); render(); });
    document.querySelectorAll('[data-style]').forEach(b => b.addEventListener('click', () => { S.style = b.dataset.style; setSeg('style', b); render(); }));
    document.querySelectorAll('[data-sancai]').forEach(b => b.addEventListener('click', () => { S.sancai = b.dataset.sancai; setSeg('sancai', b); render(); }));
    document.querySelectorAll('[data-need]').forEach(b => b.addEventListener('click', () => { const e = b.dataset.need; if (S.need.has(e)) S.need.delete(e); else S.need.add(e); b.classList.toggle('on', S.need.has(e)); render(); }));
    $('needStrict').addEventListener('change', e => { S.needStrict = e.target.checked; render(); });
    $('zodiac').addEventListener('change', e => { S.zodiac = e.target.value; render(); });
    $('zodiacOnly').addEventListener('change', e => { S.zodiacOnly = e.target.checked; render(); });
    $('zodiacAvoidOff').addEventListener('change', e => { S.zodiacAvoidOff = e.target.checked; render(); });
    $('avoidHot').addEventListener('change', e => { S.avoidHot = e.target.checked; render(); });
    $('noAwkward').addEventListener('change', e => { S.noAwkward = e.target.checked; render(); });
    $('noHomo').addEventListener('change', e => { S.noHomo = e.target.checked; $('homoSpans').hidden = !S.noHomo; render(); });
    document.querySelectorAll('[data-hspan]').forEach(cb => cb.addEventListener('change', () => { const k = cb.dataset.hspan; if (cb.checked) S.homoSpans.add(k); else S.homoSpans.delete(k); render(); }));
    $('exclude').addEventListener('input', e => { S.exclude = e.target.value; render(); });
    $('include').addEventListener('input', e => { S.include = e.target.value; render(); });
    $('weight').addEventListener('input', e => { S.weight = e.target.value / 100; updateVs(); render(); });
    $('sort').addEventListener('change', e => { S.sort = e.target.value; render(); });
    $('moreBtn').addEventListener('click', () => { S.limit += 48; render(); });
    $('grid').addEventListener('click', e => {
      const fb = e.target.closest('[data-fav]');
      if (fb) { toggleFav(fb.dataset.fav); return; }
      const nb = e.target.closest('[data-nope]');
      if (nb) { dislike(nb.dataset.nope); return; }
      const c = e.target.closest('.card'); if (c) { const [n1, n2] = [...c.dataset.key]; openDetail(n1, n2); }
    });
    $('pairTable').addEventListener('click', e => { const tr = e.target.closest('tr[data-pair]'); if (!tr) return; S.pair = S.pair === tr.dataset.pair ? null : tr.dataset.pair; S.limit = 48; render(); });
    $('detailClose').addEventListener('click', closeDetail);
    $('detail').addEventListener('click', e => { const fb = e.target.closest('[data-fav]'); if (fb) { toggleFav(fb.dataset.fav); const [n1, n2] = [...fb.dataset.fav]; openDetail(n1, n2); } });
    $('favOpen').addEventListener('click', () => { renderFavs(); $('favs').classList.add('open'); });
    $('favClose').addEventListener('click', () => $('favs').classList.remove('open'));
    $('favBody').addEventListener('click', e => {
      const u = e.target.closest('[data-unfav]'); if (u) { toggleFav(u.dataset.unfav); renderFavs(); return; }
      const r = e.target.closest('[data-undislike]'); if (r) { undislike(r.dataset.undislike); return; }
      const clr = e.target.closest('#dislikeClear'); if (clr) { const ks = [...S.dislikes].filter(k => k.startsWith(S.surname + '|')); for (const k of ks) S.dislikes.delete(k); saveDislikes(); (async () => { for (const k of ks) await shSetStatus(k, null); })(); render(); updateCounts(); renderFavs(); return; }
      const o = e.target.closest('[data-open]'); if (o) { const [n1, n2] = [...o.dataset.open]; openDetail(n1, n2); }
    });
    $('favBody').addEventListener('change', e => { const n = e.target.closest('[data-note]'); if (n) setNote(n.dataset.note, n.value); });
    $('favCopy').addEventListener('click', () => { const t = favsText(); if (!t) return; navigator.clipboard.writeText(t).then(() => flash($('favCopy'), '已複製')).catch(() => flash($('favCopy'), '複製失敗')); });
    $('favCsv').addEventListener('click', () => {
      // 複製成 tab 分隔的表格文字：貼進 Excel／Google 試算表會自動分欄（不用下載，手機和分享頁都能用）
      const t = favsText(); if (!t) return;
      const tsv = '名字\t筆記\t筆劃\t總格\t三才\t部首五行\t寓意\n' + t;
      navigator.clipboard.writeText(tsv).then(() => flash($('favCsv'), '已複製，貼到試算表')).catch(() => flash($('favCsv'), '複製失敗'));
    });
    $('checkBtn').addEventListener('click', doCheck);
    ['check1', 'check2'].forEach(id => $(id).addEventListener('keydown', e => { if (e.key === 'Enter') doCheck(); }));
    $('baziBtn').addEventListener('click', () => {
      const y = +$('by').value, m = +$('bm').value, d = +$('bd').value, h = $('bh').value;
      if (!y || !m || !d) { S.bazi = { error: '請填完整年月日' }; renderBazi(); return; }
      if (y < 1901 || y > 2040) { S.bazi = { error: '年份只支援 1901～2040' }; renderBazi(); return; }
      S.bazi = computeBazi(y, m, d, h);
      if (!S.bazi.error) {
        S.need = new Set(S.bazi.weak);
        document.querySelectorAll('[data-need]').forEach(b => b.classList.toggle('on', S.need.has(b.dataset.need)));
        // 生肖有書上資料就自動選；沒有就清掉並在面板說明
        S.zodiac = ZODIAC[S.bazi.zodiac] ? S.bazi.zodiac : '';
        $('zodiac').value = S.zodiac;
        $('zodiacNote').textContent = S.zodiac ? '' : `生肖${S.bazi.zodiac}的喜忌字根還沒抄書，先不看。`;
      }
      renderBazi(); render();
    });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeDetail(); $('favs').classList.remove('open'); } });
    $('scrim').addEventListener('click', () => { closeDetail(); $('favs').classList.remove('open'); });
    $('sideToggle').addEventListener('click', () => { const open = $('side').classList.toggle('open'); $('sideToggle').classList.toggle('open', open); });
  }
  function setSeg(group, btn) { btn.parentElement.querySelectorAll('button').forEach(b => b.classList.toggle('on', b === btn)); }
  function updateVs() {
    const t = Math.round(S.weight * 100), m = 100 - t;
    $('pctT').textContent = t + '%'; $('pctM').textContent = m + '%';
    $('weight').style.setProperty('--w', t + '%');
    document.querySelector('.vs-t').classList.toggle('win', t > m); document.querySelector('.vs-t').classList.toggle('lose', t < m);
    document.querySelector('.vs-m').classList.toggle('win', m > t); document.querySelector('.vs-m').classList.toggle('lose', m < t);
    $('weightLabel').innerHTML = t === m ? '勢均力敵：排序兩邊各算一半' : t > m ? `往左拉越多，<b>傳統</b>（三才・補五行・吉數）越優先` : `往右拉越多，<b>現代</b>（字的當代感）越優先`;
  }
  function toggleFav(nm) {
    const [n1, n2] = [...nm]; const k = favKey(n1, n2);
    if (S.favs.has(k)) S.favs.delete(k); else S.favs.add(k);
    saveFavs(); shSetStatus(k, S.favs.has(k) ? 'fav' : null);
    $('favCount').textContent = [...S.favs].filter(x => x.startsWith(S.surname + '|')).length;
    const c = document.querySelector(`.card[data-key="${CSS.escape(nm)}"]`);
    if (c) { c.classList.toggle('is-fav', S.favs.has(k)); c.querySelector('.fav').textContent = S.favs.has(k) ? '♥' : '♡'; }
  }
  function doCheck() {
    const n1 = [...$('check1').value.trim()][0], n2 = [...$('check2').value.trim()][0];
    if (!n1 || !n2) { $('checkMsg').textContent = '兩個字都要填'; return; }
    $('checkMsg').textContent = '';
    openDetail(n1, n2, true);
  }
  function flash(btn, txt) { const o = btn.textContent; btn.textContent = txt; setTimeout(() => btn.textContent = o, 1500); }

  // ---------- 啟動 ----------
  document.addEventListener('DOMContentLoaded', () => {
    const by = $('by'); for (let y = 2027; y >= 1990; y--) by.insertAdjacentHTML('beforeend', `<option value="${y}">${y}</option>`);
    $('kxCount').textContent = Object.keys(KX).length.toLocaleString();
    $('poolCount').textContent = POOL.size;
    $('allCount').textContent = POOL.size + EXT.size + ALL.size;
    updateVs();
    bind();
    render();
    renderPicker();
    updateCounts();
    initShared();
  });
})();
