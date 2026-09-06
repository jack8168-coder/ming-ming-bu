// ============================================================
// 純 JS 西洋占星計算（無需 WASM）
// 使用簡化天文算法，精度足夠命理用途（誤差 < 1度）
// ============================================================

(function() {
  const ZODIAC_NAMES = ['白羊座','金牛座','雙子座','巨蟹座','獅子座','處女座','天秤座','天蠍座','射手座','摩羯座','水瓶座','雙魚座'];
  const ZODIAC_EMOJIS = ['♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓'];
  const ZODIAC_ELEMENTS = ['火','土','風','水','火','土','風','水','火','土','風','水'];

  const COORDINATES = {
    taipei:    { lat: 25.0330, lng: 121.5654 },
    linkou:    { lat: 25.0770, lng: 121.3719 },
    taoyuan:   { lat: 24.9936, lng: 121.3010 },
    taichung:  { lat: 24.1477, lng: 120.6736 },
    kaohsiung: { lat: 22.6273, lng: 120.3014 },
  };

  const SHICHEN_HOURS = {
    '子': 0, '丑': 2, '寅': 4, '卯': 6, '辰': 8, '巳': 10,
    '午': 12, '未': 14, '申': 16, '酉': 18, '戌': 20, '亥': 22
  };

  // 計算儒略日
  function julianDay(year, month, day, hourUT) {
    if (month <= 2) { year--; month += 12; }
    const A = Math.floor(year / 100);
    const B = 2 - A + Math.floor(A / 4);
    return Math.floor(365.25 * (year + 4716)) + Math.floor(30.6001 * (month + 1)) + day + hourUT / 24.0 + B - 1524.5;
  }

  // 太陽黃經（簡化算法，精度 ~0.01度）
  function sunLongitude(jd) {
    const T = (jd - 2451545.0) / 36525.0;
    const L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
    const M = 357.52911 + 35999.05029 * T - 0.0001537 * T * T;
    const Mrad = M * Math.PI / 180;
    const C = (1.914602 - 0.004817 * T) * Math.sin(Mrad) +
              (0.019993 - 0.000101 * T) * Math.sin(2 * Mrad) +
              0.000289 * Math.sin(3 * Mrad);
    let sunLon = L0 + C;
    // 修正章動
    const omega = 125.04 - 1934.136 * T;
    sunLon = sunLon - 0.00569 - 0.00478 * Math.sin(omega * Math.PI / 180);
    return ((sunLon % 360) + 360) % 360;
  }

  // 月亮黃經（簡化算法，精度 ~0.5度）
  function moonLongitude(jd) {
    const T = (jd - 2451545.0) / 36525.0;
    const Lp = 218.3165 + 481267.8813 * T; // 月亮平均黃經
    const D = 297.8502 + 445267.1115 * T;  // 平均距角
    const M = 357.5291 + 35999.0503 * T;   // 太陽平均近點角
    const Mp = 134.9634 + 477198.8676 * T;  // 月亮平均近點角
    const F = 93.2720 + 483202.0175 * T;   // 月亮升交點角距

    const toRad = Math.PI / 180;
    let lon = Lp
      + 6.289 * Math.sin(Mp * toRad)
      + 1.274 * Math.sin((2 * D - Mp) * toRad)
      + 0.658 * Math.sin(2 * D * toRad)
      + 0.214 * Math.sin(2 * Mp * toRad)
      - 0.186 * Math.sin(M * toRad)
      - 0.114 * Math.sin(2 * F * toRad)
      + 0.059 * Math.sin((2 * D - 2 * Mp) * toRad)
      + 0.057 * Math.sin((2 * D - M - Mp) * toRad)
      + 0.053 * Math.sin((2 * D + Mp) * toRad)
      + 0.046 * Math.sin((2 * D - M) * toRad)
      - 0.041 * Math.sin((M - Mp) * toRad)
      - 0.035 * Math.sin(D * toRad)
      - 0.031 * Math.sin((M + Mp) * toRad);

    return ((lon % 360) + 360) % 360;
  }

  // 恆星時（GMST）
  function gmst(jd) {
    const T = (jd - 2451545.0) / 36525.0;
    let st = 280.46061837 + 360.98564736629 * (jd - 2451545.0)
           + 0.000387933 * T * T - T * T * T / 38710000.0;
    return ((st % 360) + 360) % 360;
  }

  // 黃道傾角
  function obliquity(jd) {
    const T = (jd - 2451545.0) / 36525.0;
    return 23.4393 - 0.013 * T;
  }

  // 上升星座（ASC）
  function ascendant(jd, lat, lng) {
    const LST = gmst(jd) + lng; // 地方恆星時
    const LSTrad = LST * Math.PI / 180;
    const eps = obliquity(jd) * Math.PI / 180;
    const latRad = lat * Math.PI / 180;

    // ASC = atan2(cos(LST), -(sin(LST)*cos(eps) + tan(lat)*sin(eps)))
    // 修正：原公式兩引數同時反號導致差180°（算成下降點）
    const y = Math.cos(LSTrad);
    const x = -(Math.sin(LSTrad) * Math.cos(eps) + Math.tan(latRad) * Math.sin(eps));
    let asc = Math.atan2(y, x) * 180 / Math.PI;
    asc = ((asc % 360) + 360) % 360;
    return asc;
  }

  function calculateAstrology() {
    const yearStr = document.getElementById('birthYear').value;
    const monthStr = document.getElementById('birthMonth').value;
    const dayStr = document.getElementById('birthDay').value;
    const hourRaw = document.getElementById('birthTime').value;
    const cityStr = document.getElementById('birthCity').value;

    var minuteVal = document.getElementById('birthMinute').value;
    if (!yearStr || !monthStr || !dayStr || !hourRaw || !cityStr) {
      document.getElementById('ascCalc').textContent = '-';
      document.getElementById('moonSignCalc').textContent = '-';
      document.getElementById('crossRefWarning').classList.add('hidden');
      if (document.getElementById('astroDescPanel')) document.getElementById('astroDescPanel').classList.add('hidden');
      return;
    }
    if (minuteVal === '' || minuteVal === null) {
      document.getElementById('ascCalc').textContent = '需填寫分鐘';
      document.getElementById('moonSignCalc').textContent = '需填寫分鐘';
      document.getElementById('crossRefWarning').classList.add('hidden');
      if (document.getElementById('astroDescPanel')) document.getElementById('astroDescPanel').classList.add('hidden');
      return;
    }

    // 解析新格式 "shichen|hour"，或舊格式（純地支）
    let hourBase;
    if (hourRaw.includes('|')) {
      hourBase = parseInt(hourRaw.split('|')[1]);
    } else {
      hourBase = SHICHEN_HOURS[hourRaw] || 0;
    }

    const year = parseInt(yearStr);
    const month = parseInt(monthStr);
    const day = parseInt(dayStr);
    const coord = COORDINATES[cityStr];
    const minute = parseInt(document.getElementById('birthMinute').value) || 0;
    const timezone = 8;
    const hourUT = hourBase + (minute / 60) - timezone;

    try {
      const jd = julianDay(year, month, day, hourUT);

      // 月亮星座
      const moonLon = moonLongitude(jd);
      const moonIdx = Math.floor(moonLon / 30) % 12;

      // 上升星座
      const ascLon = ascendant(jd, coord.lat, coord.lng);
      const ascIdx = Math.floor(ascLon / 30) % 12;

      const ascName = ZODIAC_NAMES[ascIdx];
      const moonName = ZODIAC_NAMES[moonIdx];
      document.getElementById('ascCalc').textContent = ZODIAC_EMOJIS[ascIdx] + ' ' + ascName;
      document.getElementById('moonSignCalc').textContent = ZODIAC_EMOJIS[moonIdx] + ' ' + moonName;
      document.getElementById('ascendant').value = ascName;

      // 顯示描述
      showAstroDescriptions(ascName, moonName);
      // 跨系統命名建議
      generateAstroNamingAdvice(ascName, moonName, ZODIAC_ELEMENTS[ascIdx], ZODIAC_ELEMENTS[moonIdx]);
      // 五行交叉警告
      checkCrossReference(ZODIAC_ELEMENTS[ascIdx], ZODIAC_ELEMENTS[moonIdx], ascName, moonName);
    } catch (e) {
      console.error('Astro calc error:', e);
      document.getElementById('ascCalc').textContent = '計算錯誤';
      document.getElementById('moonSignCalc').textContent = '計算錯誤';
    }
  }

  function checkCrossReference(ascElement, moonElement, ascSign, moonSign) {
    var warningEl = document.getElementById('crossRefWarning');
    var fiveElText = (document.getElementById('fiveElementBureau') || {}).textContent || '-';
    var warnings = [];

    // 星座分組
    var signGroups = {
      '火': ['白羊座','獅子座','射手座'],
      '土': ['金牛座','處女座','摩羯座'],
      '風': ['雙子座','天秤座','水瓶座'],
      '水': ['巨蟹座','天蠍座','雙魚座'],
    };
    // 星座元素 → 五行對應
    var zodiacToWuxing = { '火':'火', '土':'土', '風':'金', '水':'水' };

    // 判斷上升/月亮屬哪個元素
    var ascZodiacEl = '', moonZodiacEl = '';
    for (var group in signGroups) {
      if (signGroups[group].indexOf(ascSign) >= 0) ascZodiacEl = group;
      if (signGroups[group].indexOf(moonSign) >= 0) moonZodiacEl = group;
    }
    var ascWuxing = zodiacToWuxing[ascZodiacEl] || '';
    var moonWuxing = zodiacToWuxing[moonZodiacEl] || '';

    // 取得智能推薦引擎的禁止清單（八字已 > 1.5 的五行）
    var rec = (typeof getRecommendedElements === 'function') ? getRecommendedElements() : { priority:[], ok:[], forbidden:[] };
    var forbiddenSet = rec.forbidden || [];

    // 命理建議表
    var adviceMap = {
      '水': { radical:'氵、冫、水', example:'沛、沁、涵、淳、瀚', color:'blue' },
      '火': { radical:'日、心、火、灬', example:'昕、昱、煜、燦、曦', color:'red' },
      '木': { radical:'艹、木、林、竹', example:'芯、若、柏、楓、萱', color:'green' },
      '金': { radical:'金、王、玉、刂', example:'銘、鑫、錦、瑋、璇', color:'amber' },
      '土': { radical:'土、山、石、田', example:'培、岩、磊、頤、璋', color:'yellow' },
    };

    // 情況1: 上升/月亮五行 與 紫微局相同 → 該元素極盛
    if (fiveElText !== '-') {
      var bureauEl = fiveElText.charAt(0);

      // 上升五行 = 紫微局 → 極盛
      if (ascWuxing && zodiacToWuxing[ascZodiacEl] === bureauEl) {
        var shengTarget = {'木':'火','火':'土','土':'金','金':'水','水':'木'}[bureauEl] || '';
        warnings.push({ color: adviceMap[bureauEl]?.color || 'gray',
          text: '上升' + ascSign + '（' + ascZodiacEl + '象/' + ascWuxing + '）與紫微' + fiveElText + '同屬' + bureauEl + '，命中' + bureauEl + '氣極盛。取名建議搭配「' + (adviceMap[shengTarget]?.radical||'') + '」部首（如：' + (adviceMap[shengTarget]?.example||'') + '）以' + bureauEl + '生' + shengTarget + '通氣。'
        });
      }
      if (moonWuxing && zodiacToWuxing[moonZodiacEl] === bureauEl && moonWuxing !== ascWuxing) {
        var shengTarget2 = {'木':'火','火':'土','土':'金','金':'水','水':'木'}[bureauEl] || '';
        warnings.push({ color: adviceMap[bureauEl]?.color || 'gray',
          text: '月亮' + moonSign + '（' + moonZodiacEl + '象/' + moonWuxing + '）與紫微' + fiveElText + '同屬' + bureauEl + '，內在' + bureauEl + '能量充沛。可選用「' + (adviceMap[shengTarget2]?.radical||'') + '」部首的字順勢引導。'
        });
      }

      // 情況2: 上升/月亮五行 ≠ 紫微局 → 可用名字呼應（但排除已過旺的五行）
      if (ascWuxing && zodiacToWuxing[ascZodiacEl] !== bureauEl && forbiddenSet.indexOf(ascWuxing) < 0) {
        var adv = adviceMap[ascWuxing];
        if (adv) {
          warnings.push({ color: adv.color,
            text: '上升' + ascSign + '帶' + ascZodiacEl + '象能量（' + ascWuxing + '），紫微為' + fiveElText + '。可適度選用「' + adv.radical + '」部首的字（如：' + adv.example + '）呼應上升特質。'
          });
        }
      } else if (ascWuxing && forbiddenSet.indexOf(ascWuxing) >= 0) {
        warnings.push({ color: 'gray',
          text: '上升' + ascSign + '帶' + ascZodiacEl + '象（' + ascWuxing + '），但八字' + ascWuxing + '已充足（>1.5），命名不需再補' + ascWuxing + '。'
        });
      }
      if (moonWuxing && zodiacToWuxing[moonZodiacEl] !== bureauEl && moonZodiacEl !== ascZodiacEl && forbiddenSet.indexOf(moonWuxing) < 0) {
        var adv2 = adviceMap[moonWuxing];
        if (adv2) {
          warnings.push({ color: adv2.color,
            text: '月亮' + moonSign + '帶' + moonZodiacEl + '象能量（' + moonWuxing + '），紫微為' + fiveElText + '。可考慮選用「' + adv2.radical + '」部首的字（如：' + adv2.example + '）滋養內在情感。'
          });
        }
      } else if (moonWuxing && forbiddenSet.indexOf(moonWuxing) >= 0 && moonZodiacEl !== ascZodiacEl) {
        warnings.push({ color: 'gray',
          text: '月亮' + moonSign + '帶' + moonZodiacEl + '象（' + moonWuxing + '），但八字' + moonWuxing + '已充足（>1.5），命名不需再補' + moonWuxing + '。'
        });
      }
    }

    if (warnings.length > 0) {
      warningEl.classList.remove('hidden');
      warningEl.className = 'mt-2';
      var colorMap = { blue:'bg-blue-50 border-blue-300 text-blue-800', red:'bg-red-50 border-red-300 text-red-800', green:'bg-green-50 border-green-300 text-green-800', amber:'bg-amber-50 border-amber-300 text-amber-800', yellow:'bg-yellow-50 border-yellow-300 text-yellow-800', gray:'bg-gray-50 border-gray-300 text-gray-800' };
      warningEl.innerHTML = warnings.map(function(w) {
        var c = colorMap[w.color] || colorMap.gray;
        return '<div class="' + c + ' rounded-lg p-3 mb-2 border text-sm">' + w.text + '</div>';
      }).join('');
    } else {
      warningEl.classList.add('hidden');
    }
  }

  // --- 星座描述資料 ---
  const ASC_DESC = {
    '白羊座':{traits:'開拓者、活力、直接、競爭意識',desc:'給人急先鋒的強烈印象，生命力旺盛，處事積極主動。具天生領導潛力與勇氣，但需注意情緒較易衝動。'},
    '金牛座':{traits:'穩定、審美、固執、感官享受',desc:'展現沈穩可靠的氣息，對生活品質與美感有極高要求。步調雖慢但耐力驚人，給人氣質優雅、踏實的感覺。'},
    '雙子座':{traits:'靈動、機智、多變、資訊交流',desc:'具備強烈好奇心，學習速度極快。社交能力極佳，但有時給人浮躁、專注力不足的印象。'},
    '巨蟹座':{traits:'溫柔、敏感、保護欲、直覺強',desc:'給人母性般親切感，外殼堅硬但內心柔軟。對情緒變化非常敏銳，注重隱私與安全感。'},
    '獅子座':{traits:'華麗、耀眼、自信、慷慨',desc:'自帶舞台光環，充滿戲劇性與威嚴。具極強榮譽感與慷慨性格，渴望被看見與肯定。'},
    '處女座':{traits:'精細、服務、秩序、觀察力',desc:'給人乾淨得體的印象，處事嚴謹且注重細節。擁有極強邏輯分析能力與自我要求。'},
    '天秤座':{traits:'和諧、優雅、社交、外交手腕',desc:'天生的外交官，具極佳平衡感與審美觀。不喜歡衝突，總能優雅處理人際關係。'},
    '天蠍座':{traits:'神祕、深沈、洞察力、轉化力',desc:'眼神銳利具極強穿透力，給人冷靜神祕的距離感。情感能量深沈專注，具驚人意志力。'},
    '射手座':{traits:'自由、樂觀、宏觀、智慧探索',desc:'充滿陽光的運動氣息，對世界充滿探索欲。性格坦率不拘小節，是不知疲倦的冒險家。'},
    '摩羯座':{traits:'嚴肅、自律、野心、社會地位',desc:'給人超越年齡的成熟感，性格沈穩具高度責任心。重視社會階層與規範，是典型晚成大器者。'},
    '水瓶座':{traits:'獨特、理智、疏離、人道主義',desc:'疏離且獨特的冷靜氣質，不盲目從眾。思考跳躍具原創性，給人活在未來的知性美感。'},
    '雙魚座':{traits:'夢幻、同情心、柔順、藝術靈性',desc:'眼神朦朧帶夢幻感，具極強共情能力與藝術想像力。溫柔無害且充滿靈性。'},
  };

  const MOON_DESC = {
    '白羊座':{needs:'情感主動、即時回饋、冒險、獨立',desc:'內心充滿熱情且情感直接，不喜歡憋著委屈。安全感來自於「贏」與「掌握主控權」。'},
    '金牛座':{needs:'物質穩定、觸覺安慰、感官享受',desc:'內心極其追求安定，安全感來自充足睡眠、美味食物與舒適環境。情緒反應較慢但記得久。'},
    '雙子座':{needs:'資訊流通、溝通對話、心智刺激',desc:'遇到壓力喜歡透過說話或閱讀排解。安全感來自被理解與新奇感。'},
    '巨蟹座':{needs:'家庭歸屬、情感共鳴、安全堡壘',desc:'月亮強勢位，情感極其豐富細膩。安全感來自母親陪伴與熟悉的家。'},
    '獅子座':{needs:'被讚美、被看見、尊嚴感、歡樂',desc:'內心有個驕傲的小王子/小公主，非常在乎尊嚴與體面。安全感來自被肯定。'},
    '處女座':{needs:'秩序感、生活規律、有用武之地',desc:'內在傾向理性分析，安全感來自乾淨整潔的環境與事情在掌握中。'},
    '天秤座':{needs:'關係和諧、伴侶感、美感、公平',desc:'最怕寂寞與衝突，天生會迎合他人以換取和諧。需要學習表達真實情緒。'},
    '天蠍座':{needs:'深層信任、私密空間、情感掌控',desc:'情感密度極高，具強烈直覺與疑心。一旦信任便極其忠誠，情緒轉化力極強。'},
    '射手座':{needs:'信仰自由、空間寬敞、尋找意義',desc:'內心住著流浪者，不喜歡被過度管教。安全感來自未來有希望與不被限制。'},
    '摩羯座':{needs:'明確目標、自律、被尊重、實質回報',desc:'情感表達壓抑沈穩，常被誇懂事但內心給自己很大壓力。需學習放鬆。'},
    '水瓶座':{needs:'知性理解、獨特性、獨立思考',desc:'對情感持理性疏離感，即使親密關係也需獨立空間。對朋友往往比家人更熱情。'},
    '雙魚座':{needs:'靈魂相通、夢幻空間、慈悲、藝術',desc:'內心如海洋般深邃無邊界，極具共情力。安全感來自無條件的愛與隱居角落。'},
  };

  const ZODIAC_WUXING_MAP = {
    '白羊座':'火','金牛座':'土','雙子座':'風','巨蟹座':'水',
    '獅子座':'火','處女座':'土','天秤座':'風','天蠍座':'水',
    '射手座':'火','摩羯座':'土','水瓶座':'風','雙魚座':'水',
  };

  function showAstroDescriptions(ascName, moonName) {
    var panel = document.getElementById('astroDescPanel');
    if (!panel) return;
    var asc = ASC_DESC[ascName];
    var moon = MOON_DESC[moonName];
    if (!asc || !moon) { panel.classList.add('hidden'); return; }

    panel.classList.remove('hidden');
    document.getElementById('ascDescTitle').textContent = '上升' + ascName + '（第一印象）';
    document.getElementById('ascTraits').textContent = asc.traits;
    document.getElementById('ascDesc').textContent = asc.desc;
    document.getElementById('moonDescTitle').textContent = '月亮' + moonName + '（內在情感）';
    document.getElementById('moonNeeds').textContent = '需求：' + moon.needs;
    document.getElementById('moonDesc').textContent = moon.desc;
  }

  function generateAstroNamingAdvice(ascName, moonName, ascEl, moonEl) {
    var adviceEl = document.getElementById('astroNamingAdvice');
    if (!adviceEl) return;
    var fiveEl = (document.getElementById('fiveElementBureau') || {}).textContent || '-';
    var baziMissing = (document.getElementById('baziMissing') || {}).textContent || '';
    var ziweiMainStar = (document.getElementById('ziweiMainStar') || {}).textContent || '';
    var advice = [];

    // 上升獅子 + 紫微有太陽
    if (ascName === '獅子座' && ziweiMainStar.includes('太陽')) {
      advice.push({color:'amber', text:'陽光特質極強（上升獅子＋紫微命宮太陽），名字可選屬土的字（如：頤）來收斂光芒，避免過度張揚。'});
    }
    // 上升雙魚 + 缺水
    if (ascName === '雙魚座' && baziMissing.includes('水')) {
      advice.push({color:'blue', text:'外在氣質（雙魚）與內在需求契合，名字補水效果加倍，有利於發揮靈性才華。'});
    }
    // 內外衝突：火象上升 + 水象月亮
    var fireAsc = ['白羊座','獅子座','射手座'].includes(ascName);
    var waterMoon = ['巨蟹座','天蠍座','雙魚座'].includes(moonName);
    if (fireAsc && waterMoon) {
      advice.push({color:'purple', text:'外表風風火火，內心極其細膩多情（上升' + ascName + ' + 月亮' + moonName + '）。外格與總格可選較強勢筆劃（如23、31劃）支撐外在；地格可選溫潤的水、木五行字，呵護柔軟內心。'});
    }
    // 姓李(金) + 月亮天蠍(水)
    if (moonName === '天蠍座') {
      advice.push({color:'indigo', text:'姓「李」7劃屬金，金生水。月亮天蠍帶極致水能量，意志力驚人。建議加入「土」屬性字（如：頤），形成土生金、金生水的連環相生能量場。'});
    }
    // 月亮巨蟹（強勢月）
    if (moonName === '巨蟹座') {
      advice.push({color:'teal', text:'月亮巨蟹是月亮入廟位，情感極其豐富。名字可選用帶「家」「安」意象的字，強化其天生的守護能量。'});
    }

    if (advice.length > 0) {
      adviceEl.classList.remove('hidden');
      adviceEl.innerHTML = advice.map(function(a) {
        return '<div class="bg-' + a.color + '-50 border border-' + a.color + '-200 rounded-lg p-3 mb-2 text-sm text-' + a.color + '-800">' + a.text + '</div>';
      }).join('');
    } else {
      adviceEl.classList.add('hidden');
    }
  }

  // Expose globally
  window.calculateAstrology = calculateAstrology;

  // Wire up listeners after DOM ready
  // 注意：birthYear/Month/Day/Time/gender 的變更已由 script.js 的 updateBirthInfo 統一驅動
  // （其中會呼叫 calculateAstrology），這裡只監聽 script.js 沒接手的欄位，避免重複計算
  document.addEventListener('DOMContentLoaded', function() {
    var city = document.getElementById('birthCity');
    if (city) city.addEventListener('change', calculateAstrology);
    var bm = document.getElementById('birthMinute');
    if (bm) bm.addEventListener('input', calculateAstrology);
  });
})();
