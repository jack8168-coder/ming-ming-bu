// ============================================================
// 綜合性格分析模組（生肖 × 星座 × 紫微 × 血型 × 性別）
// 匯集各種「統計法」的性格解讀，產出綜合可能性格
// ============================================================
(function() {

  // --- 血型性格 ---
  const BLOOD_PERSONALITY = {
    'A':  { title:'A 型', traits:'細心謹慎、責任感強、追求完美', desc:'做事有條理、重視規則與他人感受，但容易壓抑自己、想太多。抗壓性看似高其實內心敏感，需要被肯定。', axes:{ ext:-1, act:-1, emo:+1, sta:+1 } },
    'B':  { title:'B 型', traits:'自由奔放、創意十足、樂觀直率', desc:'不喜歡被束縛，興趣廣泛、行動力強，想到什麼就做什麼。專注在喜歡的事物上時爆發力驚人，但容易三分鐘熱度。', axes:{ ext:+1, act:+1, emo:+1, sta:-1 } },
    'O':  { title:'O 型', traits:'大而化之、領袖氣質、目標導向', desc:'個性豪爽、意志堅定，設定目標後勇往直前。人緣好、抗壓性強，但有時過於自信、不拘小節。', axes:{ ext:+1, act:+1, emo:-1, sta:+1 } },
    'AB': { title:'AB 型', traits:'理性冷靜、雙面特質、思維獨特', desc:'兼具 A 型的細膩與 B 型的自由，看事情角度獨特、分析力強。外表冷靜內心熱情，不易被人看透。', axes:{ ext:-1, act:-1, emo:-1, sta:-1 } },
  };

  // --- 太陽星座性格（含別名對照）---
  const ZODIAC_PERSONALITY = {
    '牡羊座': { traits:'熱情衝勁、直來直往、開創先鋒', desc:'行動派代表，想到就做、不怕失敗。競爭意識強，是天生的開路先鋒。', axes:{ ext:+2, act:+2, emo:+1, sta:-1 } },
    '金牛座': { traits:'穩重務實、重視感官、堅持到底', desc:'步調慢但極有耐性，重視安全感與生活品質，決定的事不輕易改變。', axes:{ ext:-1, act:-1, emo:+1, sta:+2 } },
    '雙子座': { traits:'聰明機靈、口才流利、多才多藝', desc:'好奇心旺盛、學東西快，善於溝通交際，但注意力容易分散。', axes:{ ext:+2, act:+1, emo:-1, sta:-2 } },
    '巨蟹座': { traits:'溫柔顧家、感情豐富、保護欲強', desc:'重視家庭與歸屬感，直覺敏銳、善解人意，但情緒容易受環境影響。', axes:{ ext:-1, act:-1, emo:+2, sta:+1 } },
    '獅子座': { traits:'自信大方、王者風範、慷慨熱情', desc:'天生的舞台焦點，重視尊嚴與榮譽，領導欲強、樂於照顧他人。', axes:{ ext:+2, act:+2, emo:+1, sta:+1 } },
    '處女座': { traits:'細膩完美、邏輯分析、服務精神', desc:'觀察力與分析力一流，凡事追求精準完美，是可靠的執行者。', axes:{ ext:-1, act:-1, emo:-2, sta:+1 } },
    '天秤座': { traits:'優雅平衡、社交高手、追求和諧', desc:'天生外交官，重視公平與美感，人緣極佳，但決策時容易猶豫。', axes:{ ext:+1, act:-1, emo:+1, sta:0 } },
    '天蠍座': { traits:'深沉專注、洞察敏銳、意志堅強', desc:'情感濃烈但深藏不露，觀察力驚人，一旦設定目標便全力以赴。', axes:{ ext:-2, act:+1, emo:+2, sta:+1 } },
    '射手座': { traits:'樂觀自由、熱愛冒險、心胸開闊', desc:'不受拘束的冒險家，坦率直言、追求真理與遠方，樂觀是最大本錢。', axes:{ ext:+2, act:+2, emo:-1, sta:-2 } },
    '摩羯座': { traits:'務實上進、自律嚴謹、大器晚成', desc:'目標明確、腳踏實地，責任感極強，願意long-term耕耘等待收成。', axes:{ ext:-1, act:+1, emo:-2, sta:+2 } },
    '水瓶座': { traits:'獨立創新、理性前衛、人道關懷', desc:'思想獨特不從眾，重視自由與友誼，常有超越時代的想法。', axes:{ ext:0, act:+1, emo:-2, sta:-1 } },
    '雙魚座': { traits:'浪漫多情、想像豐富、慈悲包容', desc:'共情能力極強的夢想家，藝術感受力佳，心軟且富同情心。', axes:{ ext:-1, act:-2, emo:+2, sta:-1 } },
  };
  const ZODIAC_ALIAS = { '白羊座':'牡羊座' };

  // --- 生肖性格 ---
  const SHENGXIAO_PERSONALITY = {
    '鼠': { traits:'機智靈活、反應快、適應力強', desc:'頭腦精明、觀察入微，善於把握機會，理財有道。', axes:{ ext:+1, act:+1, emo:-1, sta:-1 } },
    '牛': { traits:'勤勉踏實、任勞任怨、意志堅定', desc:'耐力驚人的實幹家，一步一腳印，值得信賴但較固執。', axes:{ ext:-1, act:-1, emo:-1, sta:+2 } },
    '虎': { traits:'勇敢自信、霸氣十足、天生領袖', desc:'威嚴與行動力兼具，敢衝敢拚，不畏挑戰。', axes:{ ext:+2, act:+2, emo:+1, sta:-1 } },
    '兔': { traits:'溫和謹慎、心思細膩、人緣極佳', desc:'優雅圓融的和平主義者，善於察言觀色，避免正面衝突。', axes:{ ext:-1, act:-1, emo:+1, sta:+1 } },
    '龍': { traits:'志向遠大、氣勢非凡、充滿魅力', desc:'天生自帶光環，企圖心強、精力充沛，追求卓越。', axes:{ ext:+2, act:+2, emo:0, sta:0 } },
    '蛇': { traits:'深思熟慮、直覺敏銳、神秘優雅', desc:'冷靜的智者，思慮周密、洞悉人心，行事低調但精準。', axes:{ ext:-2, act:-1, emo:+1, sta:+1 } },
    '馬': { traits:'熱情奔放、行動迅速、熱愛自由', desc:'活力四射的行動派，不喜束縛，勇於追逐夢想，人緣好。', axes:{ ext:+2, act:+2, emo:+1, sta:-2 } },
    '羊': { traits:'溫柔善良、富同情心、藝術氣質', desc:'心地柔軟的藝術家，重視和諧，默默耕耘，需要安全感。', axes:{ ext:-1, act:-1, emo:+2, sta:0 } },
    '猴': { traits:'聰明幽默、多才多藝、靈活變通', desc:'鬼點子最多的智多星，學習力強、幽默風趣，但易三心二意。', axes:{ ext:+2, act:+1, emo:-1, sta:-2 } },
    '雞': { traits:'勤奮敏銳、追求完美、直言不諱', desc:'觀察敏銳、做事俐落，重視效率與外表，敢於表達意見。', axes:{ ext:+1, act:+1, emo:-1, sta:+1 } },
    '狗': { traits:'忠誠正直、重情重義、防衛心強', desc:'最可靠的夥伴，正義感強、守信用，但容易操心憂慮。', axes:{ ext:0, act:0, emo:+1, sta:+1 } },
    '豬': { traits:'真誠豁達、福氣厚道、樂天知命', desc:'心胸寬大、不記仇，享受生活，人緣好且帶財氣。', axes:{ ext:+1, act:-1, emo:+1, sta:+1 } },
  };

  // --- 紫微主星性格軸 ---
  const ZIWEI_AXES = {
    '紫微': { axes:{ ext:+1, act:+1, emo:-1, sta:+1 }, key:'領導統御' },
    '天機': { axes:{ ext:-1, act:0,  emo:-1, sta:-2 }, key:'智謀多變' },
    '太陽': { axes:{ ext:+2, act:+2, emo:+1, sta:0  }, key:'光明博愛' },
    '武曲': { axes:{ ext:-1, act:+2, emo:-2, sta:+1 }, key:'剛毅務實' },
    '天同': { axes:{ ext:0,  act:-2, emo:+2, sta:+1 }, key:'溫和享福' },
    '廉貞': { axes:{ ext:+1, act:+1, emo:+1, sta:-1 }, key:'多才善交' },
    '天府': { axes:{ ext:0,  act:-1, emo:0,  sta:+2 }, key:'穩重守成' },
    '太陰': { axes:{ ext:-2, act:-1, emo:+2, sta:0  }, key:'細膩內斂' },
    '貪狼': { axes:{ ext:+2, act:+1, emo:+1, sta:-1 }, key:'多藝善變' },
    '巨門': { axes:{ ext:-1, act:0,  emo:-1, sta:0  }, key:'口才分析' },
    '天相': { axes:{ ext:0,  act:-1, emo:+1, sta:+1 }, key:'協調輔佐' },
    '天梁': { axes:{ ext:0,  act:-1, emo:0,  sta:+1 }, key:'老成蔭庇' },
    '七殺': { axes:{ ext:+1, act:+2, emo:-1, sta:-2 }, key:'果敢衝勁' },
    '破軍': { axes:{ ext:+1, act:+2, emo:0,  sta:-2 }, key:'開創破立' },
  };

  // 上升/月亮星座軸（沿用太陽星座軸但權重減半，於彙總時處理）

  function cleanSign(text) {
    if (!text) return null;
    const m = text.match(/([一-鿿]{2,3}座)/);
    if (!m) return null;
    const name = ZODIAC_ALIAS[m[1]] || m[1];
    return ZODIAC_PERSONALITY[name] ? name : null;
  }

  function cleanAnimal(text) {
    if (!text) return null;
    const m = text.match(/([鼠牛虎兔龍蛇馬羊猴雞狗豬])/);
    return m ? m[1] : null;
  }

  function collectSources() {
    const sunSign = cleanSign(document.getElementById('constellation')?.textContent);
    const ascSign = cleanSign(document.getElementById('ascCalc')?.textContent);
    const moonSign = cleanSign(document.getElementById('moonSignCalc')?.textContent);
    const animal = cleanAnimal(document.getElementById('zodiacAnimal')?.textContent);
    const blood = document.getElementById('bloodType')?.value || '';
    const gender = document.getElementById('gender')?.value || '';
    const ziweiText = document.getElementById('ziweiMainStar')?.textContent || '';
    const ziweiStars = Object.keys(ZIWEI_AXES).filter(s => ziweiText.includes(s));
    return { sunSign, ascSign, moonSign, animal, blood, gender, ziweiStars };
  }

  // 彙總四軸分數（外向/行動/感性/穩定）
  function aggregateAxes(src) {
    const sum = { ext:0, act:0, emo:0, sta:0 };
    let weight = 0;
    function add(axes, w) {
      if (!axes) return;
      sum.ext += axes.ext * w; sum.act += axes.act * w;
      sum.emo += axes.emo * w; sum.sta += axes.sta * w;
      weight += w;
    }
    if (src.sunSign) add(ZODIAC_PERSONALITY[src.sunSign].axes, 1.0);
    if (src.ascSign) add(ZODIAC_PERSONALITY[src.ascSign].axes, 0.7);
    if (src.moonSign) add(ZODIAC_PERSONALITY[src.moonSign].axes, 0.7);
    if (src.animal) add(SHENGXIAO_PERSONALITY[src.animal].axes, 0.8);
    for (const s of src.ziweiStars) add(ZIWEI_AXES[s].axes, 0.9);
    if (src.blood && BLOOD_PERSONALITY[src.blood]) add(BLOOD_PERSONALITY[src.blood].axes, 0.6);
    if (weight === 0) return null;
    // 正規化到 -100 ~ +100
    const maxPer = 2;
    return {
      ext: Math.round(sum.ext / (weight * maxPer) * 100),
      act: Math.round(sum.act / (weight * maxPer) * 100),
      emo: Math.round(sum.emo / (weight * maxPer) * 100),
      sta: Math.round(sum.sta / (weight * maxPer) * 100),
      count: weight,
    };
  }

  function axisBar(label, leftLabel, rightLabel, value, color) {
    const pct = Math.max(-100, Math.min(100, value));
    const half = Math.abs(pct) / 2; // 0~50
    const barLeft = pct < 0 ? (50 - half) : 50;
    return `<div class="mb-2">
      <div class="flex justify-between text-xs text-gray-500 mb-0.5">
        <span class="${pct < -15 ? 'font-bold text-gray-800' : ''}">${leftLabel}</span>
        <span class="text-gray-400">${label}</span>
        <span class="${pct > 15 ? 'font-bold text-gray-800' : ''}">${rightLabel}</span>
      </div>
      <div class="h-3 bg-gray-100 rounded-full relative overflow-hidden">
        <div class="absolute top-0 bottom-0" style="left:${barLeft}%; width:${half}%; background:${color}; border-radius:9999px;"></div>
        <div class="absolute top-0 bottom-0 w-px bg-gray-300" style="left:50%"></div>
      </div>
    </div>`;
  }

  function synthesisText(ax, src) {
    const parts = [];
    if (ax.ext >= 20) parts.push('外向健談、樂於社交');
    else if (ax.ext <= -20) parts.push('內斂沉穩、喜歡獨處思考');
    else parts.push('內外平衡、能動能靜');

    if (ax.act >= 20) parts.push('行動力強、想到就做');
    else if (ax.act <= -20) parts.push('謹慎周全、三思後行');
    else parts.push('該衝則衝、該守則守');

    if (ax.emo >= 20) parts.push('感性豐富、重視情感連結');
    else if (ax.emo <= -20) parts.push('理性冷靜、以邏輯判斷');
    else parts.push('感性與理性兼備');

    if (ax.sta >= 20) parts.push('性格穩定、追求安全感');
    else if (ax.sta <= -20) parts.push('喜歡變化、不甘平淡');
    else parts.push('在穩定中保有彈性');

    let t = '綜合各項統計法，此人性格傾向：' + parts.join('；') + '。';
    if (src.gender === 'male') t += ' 男命主動勢，以上特質在事業與外在表現上更明顯。';
    if (src.gender === 'female') t += ' 女命主柔勢，以上特質在人際與家庭經營上更顯細膩。';
    return t;
  }

  function card(title, badge, traits, desc, colorCls) {
    return `<div class="p-3 bg-white rounded-lg border ${colorCls} text-sm">
      <div class="flex items-center gap-2 mb-1">
        <span class="font-bold">${title}</span>
        ${badge ? `<span class="text-xs px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">${badge}</span>` : ''}
      </div>
      <div class="text-xs text-gray-500 mb-1">${traits}</div>
      <div class="text-xs text-gray-700 leading-relaxed">${desc}</div>
    </div>`;
  }

  function renderPersonality() {
    const el = document.getElementById('personalityPanel');
    if (!el) return;
    const src = collectSources();

    // 至少要有生肖或星座（= 已填生日）才顯示
    if (!src.animal && !src.sunSign) {
      el.innerHTML = '<div class="text-gray-400 text-center text-sm py-6">請填入出生日期後顯示綜合性格分析</div>';
      return;
    }

    let html = '';

    // === 1. 各系統解讀卡片 ===
    html += '<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">';
    if (src.animal) {
      const p = SHENGXIAO_PERSONALITY[src.animal];
      html += card('生肖・屬' + src.animal, '東方生肖', p.traits, p.desc, 'border-orange-200');
    }
    if (src.sunSign) {
      const p = ZODIAC_PERSONALITY[src.sunSign];
      html += card('太陽' + src.sunSign, '西洋占星', p.traits, p.desc, 'border-yellow-300');
    }
    if (src.ascSign) {
      const p = ZODIAC_PERSONALITY[src.ascSign];
      html += card('上升' + src.ascSign, '外在印象', p.traits, p.desc, 'border-amber-200');
    }
    if (src.moonSign) {
      const p = ZODIAC_PERSONALITY[src.moonSign];
      html += card('月亮' + src.moonSign, '內在情感', p.traits, p.desc, 'border-indigo-200');
    }
    for (const s of src.ziweiStars) {
      const z = ZIWEI_AXES[s];
      const descEl = (typeof STAR_INTERPRETATION !== 'undefined' && STAR_INTERPRETATION[s]) ? STAR_INTERPRETATION[s].trait : z.key;
      html += card('紫微・' + s, '紫微斗數', z.key, descEl, 'border-purple-200');
    }
    if (src.blood && BLOOD_PERSONALITY[src.blood]) {
      const p = BLOOD_PERSONALITY[src.blood];
      html += card('血型・' + p.title, '血型統計', p.traits, p.desc, 'border-red-200');
    }
    html += '</div>';

    // === 2. 血型未填 → 四種可能性 ===
    if (!src.blood) {
      html += '<div class="mb-4 p-3 bg-gray-50 rounded-xl border">';
      html += '<div class="font-semibold text-gray-700 text-sm mb-2">血型未填 — 四種血型的可能性格分支：</div>';
      html += '<div class="grid grid-cols-1 md:grid-cols-2 gap-2">';
      for (const bt of ['A','B','O','AB']) {
        const p = BLOOD_PERSONALITY[bt];
        html += `<div class="p-2 bg-white rounded-lg border text-xs">
          <span class="font-bold text-red-700">若為 ${p.title}</span>：${p.traits} — ${p.desc}
        </div>`;
      }
      html += '</div></div>';
    }

    // === 3. 性格光譜（四軸彙總）===
    const ax = aggregateAxes(src);
    if (ax) {
      html += '<div class="p-4 bg-gradient-to-br from-violet-50 to-fuchsia-50 rounded-xl border-2 border-violet-300">';
      html += '<div class="font-bold text-violet-900 mb-3">🧬 綜合性格光譜 <span class="text-xs font-normal text-gray-500">（彙總上方各系統加權計算）</span></div>';
      html += '<div class="max-w-lg">';
      html += axisBar('社交傾向', '內向沉靜', '外向活躍', ax.ext, '#8b5cf6');
      html += axisBar('行事風格', '謹慎思考', '果斷行動', ax.act, '#ec4899');
      html += axisBar('決策模式', '理性邏輯', '感性直覺', ax.emo, '#f59e0b');
      html += axisBar('生活態度', '求新求變', '安定持恆', ax.sta, '#10b981');
      html += '</div>';
      html += `<div class="mt-3 p-3 bg-white/70 rounded-lg border border-violet-200 text-sm text-gray-800 leading-relaxed">${synthesisText(ax, src)}</div>`;
      html += '<div class="mt-2 text-xs text-gray-400">※ 權重：太陽星座 1.0、紫微主星 0.9、生肖 0.8、上升/月亮 0.7、血型 0.6。僅供參考。</div>';
      html += '</div>';
    }

    el.innerHTML = html;
  }

  window.renderPersonality = renderPersonality;

  // 綁定：任何生辰相關輸入變更後重算（稍微延遲確保其他模組先算完）
  document.addEventListener('DOMContentLoaded', function() {
    const ids = ['birthYear','birthMonth','birthDay','birthTime','birthCity','birthMinute','gender','bloodType'];
    for (const id of ids) {
      const elx = document.getElementById(id);
      if (elx) elx.addEventListener('change', function() { setTimeout(renderPersonality, 150); });
    }
    setTimeout(renderPersonality, 300);
  });
})();
