// ============================================================
// 命名簿 共用後端（Google Apps Script）
// 部署成「網頁應用程式」：執行身分＝我、存取權＝任何人。網址貼到 v2-config.js 的 url。
// 資料存在這個指令碼綁定的試算表：
//   工作表「names」：key | 姓 | 名 | status(fav/dislike) | note | by | at
//   工作表「settings」：key | value(JSON)   目前只有 excluded（劃掉的字）
// TOKEN 要跟 v2-config.js 一樣。它不是機密（網頁本來就公開），只是擋亂掃的機器人。
// ============================================================
var TOKEN = 'oIJ-Pr4jGVn6zQJvKo9qwU-32Fieogit';

function doPost(e) {
  var body;
  try { body = JSON.parse(e.postData.contents); } catch (err) { return out({ ok: false, error: '不是 JSON' }); }
  if (!body || body.token !== TOKEN) return out({ ok: false, error: 'token 不對' });
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var names = sheet(ss, 'names', ['key', '姓', '名', 'status', 'note', 'by', 'at']);
    var settings = sheet(ss, 'settings', ['key', 'value']);
    var by = String(body.by || '').slice(0, 20);
    var now = new Date();
    switch (body.op) {
      case 'load': break;
      case 'set': {
        var key = checkKey(body.key); if (!key) return out({ ok: false, error: 'key 不合法' });
        var status = body.status === 'fav' || body.status === 'dislike' ? body.status : '';
        var row = findRow(names, key);
        var note = String(body.note || '').slice(0, 200);
        if (!status && !note.trim()) { if (row) names.deleteRow(row); }
        else {
          var parts = key.split('|');
          var vals = [key, parts[0], parts[1], status, note, by, now];
          if (row) names.getRange(row, 1, 1, 7).setValues([vals]); else names.appendRow(vals);
        }
        break;
      }
      case 'note': {
        var key2 = checkKey(body.key); if (!key2) return out({ ok: false, error: 'key 不合法' });
        var note2 = String(body.note || '').slice(0, 200);
        var row2 = findRow(names, key2);
        if (row2) { names.getRange(row2, 5, 1, 3).setValues([[note2, by, now]]); if (!note2.trim() && !names.getRange(row2, 4).getValue()) names.deleteRow(row2); }
        else if (note2.trim()) { var p2 = key2.split('|'); names.appendRow([key2, p2[0], p2[1], '', note2, by, now]); }
        break;
      }
      case 'excluded': {
        if (!Array.isArray(body.chars)) return out({ ok: false, error: 'chars 不是陣列' });
        var chars = body.chars.filter(function (c) { return typeof c === 'string' && c.length <= 2; }).slice(0, 2000);
        var r = findRow(settings, 'excluded');
        var v = [['excluded', JSON.stringify(chars)]];
        if (r) settings.getRange(r, 1, 1, 2).setValues(v); else settings.appendRow(v[0]);
        break;
      }
      default: return out({ ok: false, error: '不認得的 op：' + body.op });
    }
    return out(state(names, settings));
  } finally { lock.releaseLock(); }
}

function doGet() { return out({ ok: false, error: '請用 POST' }); }

function state(names, settings) {
  var res = { ok: true, names: {}, excluded: null };
  var rows = names.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    var k = rows[i][0]; if (!k) continue;
    res.names[k] = { status: rows[i][3] || '', note: rows[i][4] || '', by: rows[i][5] || '', at: rows[i][6] ? new Date(rows[i][6]).toISOString() : '' };
  }
  var srows = settings.getDataRange().getValues();
  for (var j = 1; j < srows.length; j++) if (srows[j][0] === 'excluded') { try { res.excluded = JSON.parse(srows[j][1]); } catch (e) { res.excluded = null; } }
  return res;
}
function sheet(ss, name, header) {
  var sh = ss.getSheetByName(name);
  if (!sh) { sh = ss.insertSheet(name); sh.appendRow(header); sh.setFrozenRows(1); }
  return sh;
}
function findRow(sh, key) {
  var col = sh.getRange(1, 1, Math.max(sh.getLastRow(), 1), 1).getValues();
  for (var i = 1; i < col.length; i++) if (col[i][0] === key) return i + 1;
  return 0;
}
function checkKey(k) {
  if (typeof k !== 'string') return '';
  var m = k.match(/^([^|\s]{1,2})\|([^|\s]{2})$/);
  return m ? k : '';
}
function out(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }
