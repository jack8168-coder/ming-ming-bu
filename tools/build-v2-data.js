// 產生 v2-data.js：從 script.js 抽出對照表 + 從 xlsx 匯出的 curated.json 合併
// 用法：node tools/build-v2-data.js <curated.json 路徑>
// 輸出：v2-data.js（自動產生，不要手改；手工資料放 v2-pool.js）
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(root, 'script.js'), 'utf8');

function extractObject(name) {
  const start = src.indexOf(`const ${name} = {`);
  if (start < 0) throw new Error('找不到 ' + name);
  const open = src.indexOf('{', start);
  let depth = 0, i = open;
  for (; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') { depth--; if (depth === 0) break; }
  }
  const body = src.slice(open, i + 1);
  // eslint-disable-next-line no-new-func
  return new Function('return ' + body)();
}

const LUCKY_STROKES_DATA = extractObject('LUCKY_STROKES_DATA');
const CHAR_RADICAL_DB = extractObject('CHAR_RADICAL_DB');
const MODERN_STROKE_OVERRIDES = extractObject('MODERN_STROKE_OVERRIDES');
const SANCAI_SHENGKE = extractObject('SANCAI_SHENGKE');
const STAR_INTERPRETATION = extractObject('STAR_INTERPRETATION');

const curatedPath = process.argv[2];
if (!curatedPath) throw new Error('請給 curated.json 路徑');
const curated = JSON.parse(fs.readFileSync(curatedPath, 'utf8'));

const out = `// ⚠️ 自動產生：node tools/build-v2-data.js —— 不要手改，手工資料放 v2-pool.js
// 來源：script.js 的 LUCKY_STROKES_DATA / CHAR_RADICAL_DB / MODERN_STROKE_OVERRIDES，
//       以及兩份 xlsx（現代風／經典風，男女各 50）的 200 個精選名
var V2_DATA = {
  LUCKY_STROKES_DATA: ${JSON.stringify(LUCKY_STROKES_DATA)},
  CHAR_RADICAL_DB: ${JSON.stringify(CHAR_RADICAL_DB)},
  MODERN_STROKE_OVERRIDES: ${JSON.stringify(MODERN_STROKE_OVERRIDES)},
  SANCAI_SHENGKE: ${JSON.stringify(SANCAI_SHENGKE)},
  STAR_INTERPRETATION: ${JSON.stringify(STAR_INTERPRETATION)},
  CURATED: ${JSON.stringify(curated)}
};
`;
fs.writeFileSync(path.join(root, 'v2-data.js'), out, 'utf8');
console.log('lucky', Object.keys(LUCKY_STROKES_DATA).length,
  'radical', Object.keys(CHAR_RADICAL_DB).length,
  'overrides', Object.keys(MODERN_STROKE_OVERRIDES).length,
  'curated', curated.length);
