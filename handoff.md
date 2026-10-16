# handoff.md：命名簿（ming-ming-bu）

> 這個 repo 是公開的。這裡不寫家人姓名、生日、生辰時辰等個資。

## 2026-10-16（Claude）

**目前狀態**
- 正式入口：https://jack8168-coder.github.io/ming-ming-bu/v2.html （GitHub Pages，master 根目錄，`git push` 即上線，不用打包）。
- 全家共用後端已接通：Google Apps Script（`gas/Code.gs`）＋使用者自己的「命名簿」試算表。網址與 token 在 `v2-config.js`。
  不用登入，任何人開網址就能按喜歡／不喜歡、寫筆記、改字庫勾選；第一次按喜歡會問一次稱呼。
- 後端狀態：試算表目前只有「劃掉的字」預設 21 字，`names` 工作表是空的（測試資料已清）。
- claude.ai artifact（`dist/v2-artifact.html`）還在但連不到後端，只剩本機模式，**不再是入口**；`tools/build-v2-artifact.js` 只為它存在。
- 字庫共 1,092 字一起組名（精選 205 字有人工現代感評分，其餘一律中等），排序只靠「傳統 VS 現代」滑桿；
  三層字庫切換、投票功能都已拿掉（使用者 2026-10-09～10-13 決定）。

**已決定但要知道的設計**
- 共用模式載入完成前不畫本機舊紀錄（右上角顯示「連線到共用資料中」），避免按到舊狀態。
- 字庫勾選：點字立刻劃掉；整頁重算等手停 0.4 秒、後端寫入等 1.5 秒才送一次；後端輪詢每 15 秒，資料沒變不重畫；分頁在背景只跳過輪詢、不跳過首次載入。
- 生肖喜忌字根只有「馬」（書 p.48–51 抄的），使用者說寶寶是馬年、馬就夠。
- 諧音比對忽略聲調、前後鼻音、捲舌、l/n；查五個位置（名字、姓＋名1、全名、英文序的 名2＋姓、名1名2＋姓）；成語只比前兩音。

**未完成／可做**
1. 台語諧音（需另一套台語讀音表，使用者未要求）。
2. 其他生肖的喜忌字根（要書頁照片才能加，不要自己編）。
3. 擴充字（887 字）沒有人工現代感評分，滑桿對它們沒鑑別力；使用者說可以自己判斷，先不處理。

**下一步建議**
- 等家人實際用過，看試算表 `names` 的內容再決定要不要加功能。
- 若要改 v2：改 `v2.html`／`v2.js`／`v2-pool.js`／`v2-gloss.js`／`v2-pinyin.js`／`v2-all.js`，`git push` 就好；想順便更新 artifact 再跑 `node tools/build-v2-artifact.js`。

**避坑**
- GitHub Pages 有快取（約 10 分鐘）：推完用 `curl` 看新字串出現再測；瀏覽器要 `fetch(url,{cache:'reload'})` 或強制重整。
- 本機 `http-server`（`.claude/launch.json` 的 nameapp）也會讀 `v2-config.js`，所以**本機測試一樣會寫到正式試算表**；測完要清。
- Apps Script 回 302 轉址：curl 要用 `-L` 且不要 `-X POST`（會變 411）；Windows bash 送中文 JSON 會被 cp950 弄壞，用 Python `urllib` 送。
- `gas/Code.gs` 的 TOKEN 跟 `v2-config.js` 要一樣；兩邊都是公開的，只擋亂掃機器人，使用者 2026-10-09 同意（財損風險：無，只會灌垃圾到試算表或吃完 Apps Script 當日額度）。
- 瀏覽器自動化測試時 `prompt()` 不可用，程式已 try/catch 當匿名；真人瀏覽器正常。
- 使用者要求：介面文字照畫面講（Google 寫「所有人」就說「所有人」，不說「任何人」）。
- `v2-data.js` 由 `tools/build-v2-data.js` 從 `script.js`＋兩份 xlsx 自動產生，不要手改。
