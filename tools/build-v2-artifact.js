// 把 v2 打包成單一 HTML 片段（給 claude.ai Artifact 用：不含 doctype/html/head/body，所有 script 內嵌）
// 用法：node tools/build-v2-artifact.js  → 輸出 dist/v2-artifact.html
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8').replace(/^\uFEFF/, '');
let html = read('v2.html');
// 取 <title>、<style>、<link> 與 <body> 內容
const title = html.match(/<title>[\s\S]*?<\/title>/)[0];
const link = (html.match(/<link[^>]*fonts\.googleapis[^>]*>/g) || []).join('\n');
const style = html.match(/<style>[\s\S]*?<\/style>/)[0];
let body = html.match(/<body>([\s\S]*)<\/body>/)[1];
// 外部 script 改成內嵌
body = body.replace(/<script src="([^"]+)"><\/script>/g, (m, src) => {
  const code = read(src).replace(/<\/script/gi, '<\/script');
  return `<script>/* ${src} */\n${code}\n</script>`;
});
if (/<script src=/.test(body)) throw new Error('還有外部 script 沒內嵌');
const out = `${title}\n${link}\n${style}\n<!-- 自動產生：node tools/build-v2-artifact.js；改東西請改 v2.html / v2.js / v2-pool.js -->\n${body}`;
fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
fs.writeFileSync(path.join(root, 'dist', 'v2-artifact.html'), out, 'utf8');
console.log('dist/v2-artifact.html', (out.length / 1024).toFixed(0), 'KB');
