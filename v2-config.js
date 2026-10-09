// 全家共用後端設定。url 留空＝本機模式（只存在各自瀏覽器）。
// url：Apps Script 部署成網頁應用程式後的網址（https://script.google.com/macros/s/…/exec）
// token：要跟 gas/Code.gs 的 TOKEN 一樣。網頁是公開的，這個值任何開網頁的人都看得到，
//        它只是擋亂掃的機器人，不是機密；真正的保護是「網址只給家人」。
var NAMING_SYNC = {
  url: '',
  token: 'oIJ-Pr4jGVn6zQJvKo9qwU-32Fieogit',
};
