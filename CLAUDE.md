# 命名簿（姓名學 命名）專案規則

這是獨立的 git repo（公開：github.com/jack8168-coder/ming-ming-bu），跟上層艦隊共用層無關；
艦隊的 bot／看門狗／`.bat` 規矩在這裡用不到，也**不要動上層的共用檔**。

- **公開 repo**：不放任何個資（家人姓名、生日、時辰）、不放金鑰。`v2-config.js` 的 token 是刻意公開的共用 token，使用者 2026-10-09 同意。
- **入口是 GitHub Pages**（`v2.html`），`git push` 即上線；claude.ai artifact 只剩本機模式，不再是入口。
- **資料正本在使用者的 Google 試算表**（Apps Script 後端 `gas/Code.gs`）。本機預覽也會寫進正式試算表，測完要清。
- **查不到就說查不到**：筆劃查不到的字不當 0、字義沒有就寫沒有、讀音沒有就說沒檢查；不要用「看起來合理」的值補。
- **資料來源要留紀錄**：生肖字根、諧音詞、字義都是手工資料，加新資料時在該檔註解寫來源與日期；書上沒有的生肖不要自己編。
- **自動產生檔不手改**：`v2-data.js`（`tools/build-v2-data.js`）、`dist/v2-artifact.html`（`tools/build-v2-artifact.js`）。
- commit 訊息寫解決了什麼問題，前綴 `[Claude]`／`[Antigravity]`。交接寫 `handoff.md`，不寫個資。
