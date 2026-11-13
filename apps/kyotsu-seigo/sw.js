/* 化学ファイナルチェック：オフライン用 Service Worker */
var V = 'cfc-202611130831', RT = 'cfc-rt';
var PRE = ["./", "app.js?v=202611130831", "data.js?v=202611130831", "qrcode.js?v=202611130831", "katex/katex.min.css?v=202611130831", "katex/katex.min.js?v=202611130831", "katex/mhchem.min.js?v=202611130831", "manifest.webmanifest", "icon-180.png", "icon-192.png", "icon-512.png", "katex/fonts/KaTeX_AMS-Regular.woff2", "katex/fonts/KaTeX_Caligraphic-Bold.woff2", "katex/fonts/KaTeX_Caligraphic-Regular.woff2", "katex/fonts/KaTeX_Fraktur-Bold.woff2", "katex/fonts/KaTeX_Fraktur-Regular.woff2", "katex/fonts/KaTeX_Main-Bold.woff2", "katex/fonts/KaTeX_Main-BoldItalic.woff2", "katex/fonts/KaTeX_Main-Italic.woff2", "katex/fonts/KaTeX_Main-Regular.woff2", "katex/fonts/KaTeX_Math-BoldItalic.woff2", "katex/fonts/KaTeX_Math-Italic.woff2", "katex/fonts/KaTeX_SansSerif-Bold.woff2", "katex/fonts/KaTeX_SansSerif-Italic.woff2", "katex/fonts/KaTeX_SansSerif-Regular.woff2", "katex/fonts/KaTeX_Script-Regular.woff2", "katex/fonts/KaTeX_Size1-Regular.woff2", "katex/fonts/KaTeX_Size2-Regular.woff2", "katex/fonts/KaTeX_Size3-Regular.woff2", "katex/fonts/KaTeX_Size4-Regular.woff2", "katex/fonts/KaTeX_Typewriter-Regular.woff2", "fig/f000.png?h=c0aa221a", "fig/f001.png?h=c0aa221a", "fig/f002.png?h=23e92fc0", "fig/f003.png?h=04a2d93f", "fig/f004.png?h=3942ae6b", "fig/f005.png?h=5e30f80f", "fig/f006.png?h=ea09716d", "fig/f007.png?h=4ba756a7", "fig/f008.png?h=6763ff1c", "fig/f009.png?h=9d4b4252", "fig/f010.png?h=f05bf423", "fig/f011.png?h=18566386", "fig/f012.png?h=e05d43b4", "fig/f013.png?h=bd97fd14", "fig/f014.png?h=63d2b712", "fig/f015.png?h=70ba249b", "fig/f016.png?h=094870b9", "fig/f017.png?h=54d5e9cb", "fig/f018.png?h=f83973d8", "fig/f019.png?h=48bf3733", "fig/f020.png?h=db039fe4", "fig/f021.png?h=9d90f954", "fig/f022.png?h=5c86230b", "fig/f023.png?h=9c052001", "fig/f024.png?h=c198d2c6", "fig/f025.png?h=cdcf565f", "fig/f026.png?h=21ea0c36", "fig/f027.png?h=b090622d", "fig/f028.png?h=7e25276b", "fig/f029.png?h=d87b9bef", "fig/f030.png?h=d2a1aba6", "fig/f031.png?h=c8ff7841", "fig/f032.png?h=f634220a", "fig/f033.png?h=9ac43253", "fig/f034.png?h=933010e2", "fig/f035.png?h=4c4342eb", "fig/f036.png?h=7dc5b4e6", "fig/f037.png?h=d97625f1", "fig/f038.png?h=18878a85", "fig/f039.png?h=309cba37", "fig/f040.png?h=951c92b0", "fig/f041.png?h=81c5680f", "fig/f042.png?h=cc597ccd", "fig/f043.png?h=24683d4c", "fig/f044.png?h=d203af0d", "fig/f045.png?h=b50dd65f", "fig/f046.png?h=c8f0ce95", "fig/f047.png?h=57d6b9e9", "fig/f048.png?h=9eef3ca8", "fig/f049.png?h=b1aca2e6", "fig/f050.png?h=24207369", "fig/f051.png?h=9f9b97e1", "fig/f052.png?h=06f11d92", "fig/f053.png?h=348de12d", "fig/f054.png?h=33296981", "fig/f055.png?h=d5b86134", "fig/f056.png?h=959cc85c", "fig/f057.png?h=f424df89", "fig/f058.png?h=c5dfff99", "fig/f059.png?h=549cbffd", "fig/f060.png?h=f5bf5e2b", "fig/f061.png?h=c610ddb0"];
self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(V).then(function (c) { return c.addAll(PRE); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== V && k !== RT && k.indexOf('cfc-') === 0; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  var r = e.request;
  if (r.method !== 'GET') return;
  var u = new URL(r.url);
  if (u.origin !== location.origin) return;
  var base = self.registration.scope;
  if (r.url.indexOf(base) !== 0) return;
  // ページ本体：ネット優先（更新をすぐ反映），つながらなければ保存したもの
  if (r.mode === 'navigate') {
    e.respondWith(fetch(r).then(function (res) {
      if (res.ok) { var cp = res.clone(); caches.open(V).then(function (c) { c.put('./', cp); }); }
      return res;
    }).catch(function () {
      return caches.match('./', { cacheName: V }).then(function (m) { return m || caches.match(r, { ignoreSearch: true }); });
    }));
    return;
  }
  // そのほか：保存したものを優先．紙面画像などは一度開いたら保存
  e.respondWith(caches.match(r).then(function (m) {
    if (m) return m;
    return fetch(r).then(function (res) {
      if (res.ok && /\/(img|fig|katex)\//.test(u.pathname)) { var cp = res.clone(); caches.open(RT).then(function (c) { c.put(r, cp); }); }
      return res;
    });
  }));
});
