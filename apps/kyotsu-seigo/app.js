/* 化学ファイナルチェックお試し：過去問 正誤問題（記述ごとの○×判定・演習モード） */
(function () {
  'use strict';
  var CH = ['物質の構成', '物質の変化', '化学と人間生活・実験', '物質の構成と状態', '物質の変化と平衡', '非金属元素', '金属元素', '脂肪族と芳香族', '高分子化合物'];
  var CHS = ['物質の構成', '物質の変化', '人間生活・実験', '構成と状態', '変化と平衡', '非金属元素', '金属元素', '脂肪族・芳香族', '高分子化合物'];   // 狭い画面の章タブ用
  var KISO = 3;   // 第1〜3章が化学基礎
  var GRP = ['kiso', 'kiso', 'kiso', 'riron', 'riron', 'muki', 'muki', 'yuki', 'yuki'];   // 化学基礎・理論・無機・有機
  var GNM = { kiso: '基礎', riron: '理論', muki: '無機', yuki: '有機' };
  function gBadge(n, long) { var g = GRP[n - 1]; return '<small class="kb2 g-' + g + '">' + (long && g === 'kiso' ? '化学基礎' : GNM[g]) + '</small>'; }
  function chTitle(n) { return GNM[GRP[n - 1]] + '：' + CH[n - 1]; }
  // コース：化学（全章）／化学基礎（第1〜3章）．記録はコースに関係なく共通
  var COURSE = 'chem';
  try { if ((JSON.parse(localStorage.getItem('cfc-cfg') || '{}') || {}).course === 'kiso') COURSE = 'kiso'; } catch (e) {}
  function chIn(n) { return COURSE === 'chem' || n <= KISO; }
  function inC(it) { return chIn(it.ch); }
  var D = window.CFC_DATA;
  var BYID = {};
  D.forEach(function (it) { BYID[it.id] = it; });

  // ---------------------------------------------------------------- 保存
  var marks = {};
  try { marks = JSON.parse(localStorage.getItem('cfc-marks') || '{}') || {}; } catch (e) { marks = {}; }
  var saveWarned = false;
  function saveFail() {
    if (saveWarned) return; saveWarned = true;
    setTimeout(function () { if (window.CFC_toast) CFC_toast('記録を保存できませんでした（プライベートブラウズ中か，端末の空き容量不足の可能性があります）'); }, 0);
  }
  function save() { try { localStorage.setItem('cfc-marks', JSON.stringify(marks)); } catch (e) { saveFail(); } }
  function setMark(id, v) { if (v) marks[id] = v; else delete marks[id]; save(); }
  function ld(k, d) { try { var v = JSON.parse(localStorage.getItem(k) || 'null'); return v && typeof v === 'object' ? v : d; } catch (e) { return d; } }
  function sv(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { saveFail(); } }
  // 記録を消されにくくする（対応ブラウザのみ．最初に解答したときに一度だけ頼む）
  var askedPersist = false;
  function askPersist() {
    if (askedPersist) return; askedPersist = true;
    try { if (navigator.storage && navigator.storage.persist) navigator.storage.persisted().then(function (p) { if (!p) navigator.storage.persist(); }); } catch (e) {}
  }
  var QW = ld('cfc-qw', {});     // 問題ごとの答え合わせ  'id' → [正解回数, 間違い回数, 最終日]
  var ST = ld('cfc-st', {});     // 記述ごとの成績  'id#s' → [正解数, 誤答数, 最終日]
  var RV = ld('cfc-rv', {});     // 復習予定  's:id#s' / 'q:id' → [段階, 予定日]
  function today() { var d = new Date(); return Math.floor((d.getTime() - d.getTimezoneOffset() * 60000) / 86400000); }
  var INT = [1, 3, 7];           // 間違えた翌日 → 3日後 → 1週間後 → 卒業
  function srs(k, ok) {
    if (ses && ses.nosrs) return;   // 今日の復習の解き直しでは予定を変えない
    var t = today(), r = RV[k];
    if (!ok) RV[k] = [0, t + 1];
    else if (r && r[1] <= t) { var g = r[0] + 1; if (g >= INT.length) delete RV[k]; else RV[k] = [g, t + INT[g]]; }
    else return;
    sv('cfc-rv', RV); updRev();
  }
  // ボタン1回ごとの解答数（ランキング用）  n:解いた数 c:正解数 wk:{週の開始日:[n,c]}
  var CT = ld('cfc-ct', { n: 0, c: 0, wk: {} });
  function weekStart(d) { d = d === undefined ? today() : d; return d - (d + 3) % 7; }   // 月曜はじまり
  function cnt(ok) {
    askPersist();
    CT.n++; if (ok) CT.c++;
    var w = weekStart(), a = CT.wk[w] || [0, 0]; a[0]++; if (ok) a[1]++; CT.wk[w] = a;
    Object.keys(CT.wk).forEach(function (k) { if (+k < w - 56) delete CT.wk[k]; });
    sv('cfc-ct', CT);
  }
  var PROF = ld('cfc-prof', {});
  if (!PROF.id) { PROF.id = 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); sv('cfc-prof', PROF); }
  function recS(id, s, ok) {
    cnt(ok);
    var k = id + '#' + s, r = ST[k] || [0, 0, 0];
    if (ok) r[0]++; else r[1]++;
    r[2] = today(); ST[k] = r; sv('cfc-st', ST);
    srs('s:' + k, ok);
  }
  function recQ(id, ok) {
    var r = QW[id] || [0, 0, 0];
    if (ok) r[0]++; else r[1]++;
    r[2] = today(); QW[id] = r; sv('cfc-qw', QW);
  }
  // 間違えた回数：記述の ○× で間違えた回数（一問一答を含む）
  function sW(id, s) { var r = ST[id + '#' + s]; return r ? r[1] : 0; }
  // 問題として間違えた回数：答え合わせで間違えた回数．記述ごとの最大値より少なければそちらを使う（以前の記録や一問一答の分）
  function qW(id) {
    var w = QW[id] ? QW[id][1] : 0, ss = SIDS[id] || [];
    for (var i = 0; i < ss.length; i++) w = Math.max(w, sW(id, ss[i]));
    return w;
  }
  function wqHTML(id) { var w = qW(id); return '<span class="wq' + (w >= 3 ? ' w3' : '') + '"' + (w ? '' : ' hidden') + ' title="間違えた回数">間違い ' + w + '回</span>'; }
  function wcHTML(id, s) { var w = sW(id, s); return '<span class="wc"' + (w ? '' : ' hidden') + ' title="この記述を間違えた回数">×' + w + '</span>'; }
  var TAGS = window.CFC_TAGS || [];
  // 記述の一覧（一問一答・成績用）
  var STM = [], SBY = {}, SIDS = {};
  D.forEach(function (it) {
    var stem = null, lst = null;
    (it.P || []).forEach(function (b) {
      if (!stem && b.t === 'p') stem = b;
      if (!lst && b.t === 'list' && b.items.some(function (x) { return x.s !== undefined; })) lst = b;
    });
    function add(x, isJ) {
      var o = { k: it.id + '#' + x.s, id: it.id, s: x.s, l: x.l, b: isJ ? null : x.b, v: x.v, it: it, lst: lst, stem: stem };
      STM.push(o); SBY[o.k] = o; (SIDS[it.id] = SIDS[it.id] || []).push(x.s);
    }
    function walk(bs) {
      (bs || []).forEach(function (b) {
        if (b.t === 'list') b.items.forEach(function (x) { if (x.s !== undefined) add(x); walk(x.b); });
        else if (b.b) walk(b.b);
      });
    }
    walk(it.P);
    (it.J || []).forEach(function (x) { add(x, true); });
  });

  // ---------------------------------------------------------------- 数式
  function splitCe(tex) {
    var m = tex.match(/^\\ce\{([^{}\[\]]*)\}$/);
    if (!m || m[1].length < 26) return null;
    var p = m[1].split(/ (?=(?:\+|->|<=>|<-->|<=>>|<<=>) )/);
    return p.length > 1 ? p.map(function (x) { return '\\ce{' + x + '}'; }) : null;
  }
  function typeset(root) {
    if (!window.katex) return;
    var els = root.querySelectorAll('span.m:not(.done)');
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      var tex = el.textContent;
      try {
        var parts = !el.classList.contains('d') && splitCe(tex);
        if (parts) {   // 長い反応式は ＋・→ の前で折り返せるように分けて描く
          el.textContent = '';
          parts.forEach(function (t, k) {
            if (k) el.appendChild(document.createTextNode('\u2009'));
            var sp = document.createElement('span'); sp.className = 'ceb';
            katex.render(t, sp, { throwOnError: false, strict: 'ignore' }); el.appendChild(sp);
          });
        } else katex.render(tex, el, { displayMode: el.classList.contains('d'), throwOnError: false, strict: 'ignore' });
      } catch (e) { el.textContent = tex; }
      el.classList.add('done');
    }
  }

  // ---------------------------------------------------------------- ブロック → HTML
  function fig(b) {
    var ar = (1 / b.ar).toFixed(4);
    var st = 'width:calc(' + b.w + 'px * var(--fz));max-width:100%;aspect-ratio:' + ar;
    if (b.inline) return '<img class="ifig" loading="lazy" src="' + b.src + '" style="' + st + '" alt="図">';
    return '<div class="figw"><img class="fig" loading="lazy" src="' + b.src + '" style="' + st + '" alt="図"></div>';
  }
  function judgeBtns(s) {
    return '<span class="jg" data-s="' + s + '"><button type="button" class="jb" data-v="1" aria-label="正しい">○</button>' +
      '<button type="button" class="jb" data-v="0" aria-label="誤り">×</button><span class="tv"></span></span>';
  }
  function blocks(bs) {
    var h = '';
    (bs || []).forEach(function (b) { h += block(b); });
    return h;
  }
  function block(b) {
    switch (b.t) {
      case 'p': return '<p>' + b.h + '</p>';
      case 'pf': return '<p>' + b.parts.map(function (x) { return typeof x === 'string' ? x : fig(x); }).join('') + '</p>';
      case 'fig': return fig(b);
      case 'center': return '<div class="ctr">' + blocks(b.b) + '</div>';
      case 'note': return '<div class="note"><b>【補足】</b>' + blocks(b.b) + '</div>';
      case 'h': return '<div class="mh">【' + b.h + '】</div>';
      case 'h2': return '<div class="mh2">□ ' + b.h + '</div>';
      case 'list':
        return '<ul class="lst ' + b.kind + '">' + b.items.map(function (it) {
          var j = (it.s !== undefined) ? judgeBtns(it.s) : '';
          return '<li' + (j ? ' class="st"' : '') + '><span class="lb">' + it.l + '</span><div class="bd">' + blocks(it.b) + '</div>' + j + '</li>';
        }).join('') + '</ul>';
      case 'choices':
        return '<div class="chs">' + b.items.map(function (it) {
          return '<span class="ch"><span class="lb">' + it.l + '</span> ' + it.h + '</span>';
        }).join('') + '</div>';
      case 'seigo':
        return '<table class="sg"><tr><th></th>' + b.heads.map(function (x) { return '<th>' + x + '</th>'; }).join('') + '</tr>' +
          b.rows.map(function (r) {
            return '<tr>' + r.map(function (x, k) { return k ? '<td class="' + (x === '誤' ? 'g' : '') + '">' + x + '</td>' : '<th>' + x + '</th>'; }).join('') + '</tr>';
          }).join('') + '</table>';
      case 'table':
        return '<div class="tw"><table class="tb">' + b.rows.map(function (r) {
          return '<tr>' + r.map(function (c) { return '<td' + (c.span ? ' colspan="' + c.span + '"' : '') + '>' + c.h + '</td>'; }).join('') + '</tr>';
        }).join('') + '</table></div>';
      case 'hantei':
        return '<ul class="ht">' + b.items.map(function (it) {
          var tag = it.j === 'sei' ? '<span class="tz sei">正</span>' : it.j === 'go' ? '<span class="tz go">誤</span>' : '<span class="tz"></span>';
          return '<li><span class="lb">' + it.l + '</span>' + tag + '<div class="bd">' + blocks(it.b) + '</div></li>';
        }).join('') + '</ul>';
      default: return '';
    }
  }


  // 演習モード：選択肢（記述①〜）の順番を入れかえ，番号を振り直したコピーを返す
  var CIR = '①②③④⑤⑥⑦⑧⑨';
  function permItem(it) {
    if (!it.sh) return it;
    var x = JSON.parse(JSON.stringify(it));
    var L = null;
    x.P.forEach(function (b) { if (!L && b.t === 'list' && b.items.some(function (y) { return y.s !== undefined; })) L = b; });
    if (!L) return it;
    var n = L.items.length, idx = [];
    for (var i = 0; i < n; i++) idx.push(i);
    var same = true;
    for (var tries = 0; tries < 5 && same; tries++) { shuffle(idx); same = idx.every(function (v, i) { return v === i; }); }
    var map = {};
    var items = idx.map(function (j, i) { var y = L.items[j]; map[y.l] = CIR.charAt(i); y.l = CIR.charAt(i); return y; });
    L.items = items;
    var re = new RegExp('[' + CIR + ']', 'g');
    function rp(str) { return str.replace(re, function (c) { return map[c] || c; }); }
    x.K = JSON.parse(rp(JSON.stringify(x.K)));
    x.K.forEach(function (b) {
      if (b.t === 'hantei') b.items.sort(function (p, q) { return CIR.indexOf(p.l) - CIR.indexOf(q.l); });
    });
    var a = rp(x.a), tok = a.split('，');
    if (tok.length > 1 && tok.every(function (t) { return CIR.indexOf(t.charAt(0)) >= 0; }))
      a = tok.sort(function (p, q) { return CIR.indexOf(p.charAt(0)) - CIR.indexOf(q.charAt(0)); }).join('，');
    x.a = a;
    x.perm = true;
    return x;
  }
  window.CFC_perm = permItem;
  // ---------------------------------------------------------------- カード
  function markHTML(id) {
    var m = marks[id];
    return m === 'y' ? '<span class="mark ok">○ できた</span>' : m === 'n' ? '<span class="mark ng">× まちがえた</span>' : '<span class="mark"></span>';
  }
  function metaHTML(it) {
    return '<span class="no">' + it.ch + '–' + it.n + '</span><span>' + it.y + '年度</span><span class="badge ' + (it.c ? 'c' : '') + '">' + it.ex + '</span><span>' + it.q + '</span>';
  }

  /* opts.onDone(result) … 答え合わせ後に呼ぶ（演習モード用）．result = {id, judged, right, total, mark} */
  function card(it, opts) {
    opts = opts || {};
    var el = document.createElement('section');
    el.className = 'card';
    el.id = 'q-' + it.id;
    var panel = '';
    if (it.J && it.J.length) {
      panel = '<div class="jp"><div class="jph">記述ごとの判定</div>' + it.J.map(function (x) {
        return '<div class="jpr st"><span class="lb">' + x.l + '</span><span class="bd">の記述は</span>' + judgeBtns(x.s) + '</div>';
      }).join('') + '</div>';
    }
    var hint = it.ns ? '<div class="hint">各記述が正しければ ○，誤りを含めば × をタップしてから答え合わせ（省略して解答を見ることもできます）</div>' :
      (it.sel ? '<div class="hint">答えの番号をタップしてから答え合わせ（省略して解答を見ることもできます）</div>' : '');
    if (it.sel) {
      panel += '<div class="jp sp"><div class="jph">答えを選ぶ</div>' + it.sel.map(function (r, k) {
        var bs = '';
        for (var i = 0; i < r.n; i++) bs += '<button type="button" class="sb" data-c="' + CIR.charAt(i) + '">' + CIR.charAt(i) + '</button>';
        return '<div class="spr" data-k="' + k + '">' + (r.l ? '<span class="lb">' + r.l + '</span>' : '') + bs + '</div>';
      }).join('') + '</div>';
    }
    el.innerHTML =
      '<div class="meta">' + metaHTML(it) + wqHTML(it.id) + markHTML(it.id) + '</div>' +
      (!opts.run && it.tg && it.tg.length ? '<div class="tgs">' + it.tg.map(function (i) { return '<button type="button" class="tg" data-t="' + i + '">#' + TAGS[i] + '</button>'; }).join('') + '</div>' : '') +
      hint +
      '<div class="pb">' + blocks(it.P) + panel + '</div>' +
      '<div class="orig"><button type="button" class="ob">' + (it.perm ? '紙面で見る（元の番号）' : '紙面で見る') + '</button><img class="img" alt="紙面（問題）" data-src="' + it.pi + '" style="aspect-ratio:' + (1 / it.par).toFixed(4) + '"></div>' +
      '<button type="button" class="reveal">' + ((it.ns || it.sel) ? '答え合わせ' : '解答を見る') + '</button>' +
      '<div class="ansbox">' +
      '<div class="res"></div>' +
      '<div class="ansline"><span class="lbl">正解</span><span class="v">' + it.a + '</span></div>' +
      '<div class="kb"></div>' +
      '<div class="orig k"><button type="button" class="ob">' + (it.perm ? '解説を紙面で見る（元の番号）' : '解説を紙面で見る') + '</button><img class="img" alt="紙面（解説）" data-src="' + it.ki + '" style="aspect-ratio:' + (1 / it.kar).toFixed(4) + '"></div>' +
      '<div class="self"><button type="button" class="y">○ できた</button><button type="button" class="n">× まちがえた</button></div>' +
      '<div class="after"></div>' +
      '</div>';
    typeset(el);

    var pick = {};          // 記述番号 → 0/1
    Array.prototype.forEach.call(el.querySelectorAll('.jg'), function (g) { g.insertAdjacentHTML('beforeend', wcHTML(it.id, g.dataset.s)); });
    function updW() {
      var q = el.querySelector('.wq'); if (q) q.outerHTML = wqHTML(it.id);
      Array.prototype.forEach.call(el.querySelectorAll('.jg'), function (g) { var c = g.querySelector('.wc'); if (c) c.outerHTML = wcHTML(it.id, g.dataset.s); });
    }
    var qrec = false, qrecM = null;   // この回の答え合わせを問題の記録に入れたか（自己採点は付け替えられる）
    var opened = false;
    var jgs = el.querySelectorAll('.jg');
    Array.prototype.forEach.call(jgs, function (g) {
      Array.prototype.forEach.call(g.querySelectorAll('.jb'), function (b) {
        b.addEventListener('click', function () {
          if (opened) return;
          var s = g.dataset.s, v = +b.dataset.v;
          if (pick[s] === v) delete pick[s]; else pick[s] = v;
          Array.prototype.forEach.call(g.querySelectorAll('.jb'), function (x) { x.classList.toggle('on', pick[s] === +x.dataset.v); });
        });
      });
    });
    var selp = {};          // 選択行 → 選んだ番号
    var sprs = el.querySelectorAll('.spr');
    Array.prototype.forEach.call(sprs, function (r) {
      Array.prototype.forEach.call(r.querySelectorAll('.sb'), function (b) {
        b.addEventListener('click', function () {
          if (opened) return;
          var k = r.dataset.k, c = b.dataset.c;
          if (selp[k] === c) delete selp[k]; else selp[k] = c;
          Array.prototype.forEach.call(r.querySelectorAll('.sb'), function (x) { x.classList.toggle('on', selp[k] === x.dataset.c); });
        });
      });
    });
    // 正解（記述番号 → 0/1）
    var truth = {};
    function collect(bs) {
      (bs || []).forEach(function (b) {
        if (b.t === 'list') b.items.forEach(function (x) { if (x.s !== undefined) truth[x.s] = x.v; collect(x.b); });
        if (b.b && b.t !== 'list') collect(b.b);
      });
    }
    collect(it.P);
    (it.J || []).forEach(function (x) { truth[x.s] = x.v; });

    var rb = el.querySelector('.reveal');
    var y = el.querySelector('.self .y'), n = el.querySelector('.self .n');
    function syncMark() {
      y.classList.toggle('on', marks[it.id] === 'y');
      n.classList.toggle('on', marks[it.id] === 'n');
      var m = el.querySelector('.mark'); if (m) m.outerHTML = markHTML(it.id);
      if (opts.onMark) opts.onMark();
    }
    var lastJudged = 0;
    function manual(v) {
      setMark(it.id, marks[it.id] === v ? null : v); syncMark();
      // 答え合わせで記録していないとき（自己採点だけのとき）は，○×ボタンで問題の記録を付け替える
      if (!qrec) {
        if (qrecM) { var r0 = QW[it.id]; if (r0) { r0[qrecM === 'y' ? 0 : 1] = Math.max(0, r0[qrecM === 'y' ? 0 : 1] - 1); sv('cfc-qw', QW); } qrecM = null; }
        if (marks[it.id] === v) { recQ(it.id, v === 'y'); qrecM = v; }
        updW();
      }
      // 記述の判定をしていない問題は，問題単位で復習に入れる
      if (marks[it.id] === v && (!jgs.length || !lastJudged)) srs('q:' + it.id, v === 'y');
    }
    y.onclick = function () { manual('y'); };
    n.onclick = function () { manual('n'); };
    syncMark();

    var kbDone = false;
    function open() {
      opened = true;
      if (!kbDone) { var kb = el.querySelector('.kb'); kb.innerHTML = blocks(it.K); typeset(kb); kbDone = true; }   // 解説は答え合わせのときに組み立てる
      el.classList.add('open');
      var judged = 0, right = 0, total = 0;
      Array.prototype.forEach.call(jgs, function (g) {
        var s = g.dataset.s, t = truth[s];
        total++;
        var tv = g.querySelector('.tv');
        tv.textContent = t ? '正' : '誤';
        tv.className = 'tv ' + (t ? 'sei' : 'go');
        g.classList.add('shown');
        if (pick[s] !== undefined) {
          judged++;
          var ok = pick[s] === t;
          if (ok) right++;
          g.classList.add(ok ? 'ok' : 'ng');
          recS(it.id, s, ok);
        }
      });
      Array.prototype.forEach.call(sprs, function (r) {
        var k = r.dataset.k, ans = it.sel[+k].a;
        total++;
        r.classList.add('shown');
        Array.prototype.forEach.call(r.querySelectorAll('.sb'), function (x) { x.classList.toggle('ans', x.dataset.c === ans); });
        if (selp[k] !== undefined) {
          judged++;
          var ok = selp[k] === ans;
          cnt(ok);
          if (ok) right++;
          r.classList.add(ok ? 'ok' : 'ng');
        }
      });
      if (judged && right < judged) { recQ(it.id, false); qrec = true; }
      else if (judged && judged === total) { recQ(it.id, true); qrec = true; }
      updW();
      var res = el.querySelector('.res');
      var mark = null;
      if (judged) {
        res.innerHTML = (it.sel ? '解答：' : '記述の判定：') + '<b>' + right + '</b> / ' + total + ' 正解' + (judged < total ? '（' + (total - judged) + ' 個は未' + (it.sel ? '解答' : '判定') + '）' : '');
        res.className = 'res ' + (right === total ? 'ok' : 'ng');
        if (judged === total) {
          mark = right === total ? 'y' : 'n';
          if (it.sel || RV['q:' + it.id]) srs('q:' + it.id, mark === 'y');
          setMark(it.id, mark);
          syncMark();
          res.innerHTML += '<span class="auto">　→ ' + (mark === 'y' ? '○' : '×') + ' で記録しました</span>';
        }
      } else {
        res.innerHTML = ''; res.className = 'res';
      }
      lastJudged = judged;
      rb.textContent = 'もう一度解く';
      if (opts.onDone) opts.onDone({ id: it.id, judged: judged, right: right, total: total, mark: mark });
    }
    function reset() {
      opened = false; qrec = false; qrecM = null;
      el.classList.remove('open');
      pick = {};
      Array.prototype.forEach.call(jgs, function (g) {
        g.classList.remove('shown', 'ok', 'ng');
        Array.prototype.forEach.call(g.querySelectorAll('.jb'), function (x) { x.classList.remove('on'); });
      });
      rb.textContent = (it.ns || it.sel) ? '答え合わせ' : '解答を見る';
      selp = {};
      Array.prototype.forEach.call(sprs, function (r) {
        r.classList.remove('shown', 'ok', 'ng');
        Array.prototype.forEach.call(r.querySelectorAll('.sb'), function (x) { x.classList.remove('on', 'ans'); });
      });
    }
    rb.onclick = function () {
      if (opened) { reset(); el.scrollIntoView({ block: 'start', behavior: 'smooth' }); }
      else open();
    };
    Array.prototype.forEach.call(el.querySelectorAll('.orig'), function (o) {
      var b = o.querySelector('.ob'), im = o.querySelector('img');
      b.onclick = function () {
        var on = o.classList.toggle('on');
        if (on && !im.getAttribute('src')) im.src = im.dataset.src;
        b.textContent = on ? '紙面を閉じる' : ((o.classList.contains('k') ? '解説を紙面で見る' : '紙面で見る') + (it.perm ? '（元の番号）' : ''));
      };
    });
    el.cfc = { open: open, after: el.querySelector('.after') };
    return el;
  }

  // ---------------------------------------------------------------- 一覧
  var ch = 1, fsrc = 'all', fst = 'all';
  var M = document.getElementById('main');
  var tabs = document.getElementById('tabs');
  var grid = document.getElementById('chgrid');
  CH.forEach(function (t, i) {
    if (!chIn(i + 1)) return;
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'tab g-' + GRP[i]; b.dataset.ch = i + 1;
    b.innerHTML = '<span class="tn">' + (i + 1) + '</span>' + gBadge(i + 1) + '<span class="tf">' + t + '</span><span class="ts">' + CHS[i] + '</span>';
    b.onclick = function () { if (searching()) { clearSearch(); if (location.hash === '#ch' + (i + 1)) { render(); return; } } location.hash = 'ch' + (i + 1); };
    tabs.appendChild(b);
    var c = document.createElement('button');
    c.type = 'button'; c.className = 'chc g-' + GRP[i]; c.dataset.ch = i + 1;
    c.innerHTML = '<span class="cn">' + (i + 1) + gBadge(i + 1, true) + '</span><span class="ct">' + t + '</span><span class="cs"></span><span class="cb"><i class="y"></i><i class="n"></i></span>';
    c.onclick = function () {
      if (searching()) { clearSearch(); if (location.hash === '#ch' + (i + 1)) { render(); jumpList(); return; } }
      if (location.hash === '#ch' + (i + 1)) jumpList(); else { pendingJump = true; location.hash = 'ch' + (i + 1); }
    };
    grid.appendChild(c);
  });
  var pendingJump = false;
  function jumpList() {
    var nav = document.getElementById('nav');
    window.scrollTo({ top: nav.getBoundingClientRect().top + window.pageYOffset - 0, behavior: 'smooth' });
  }
  function segs(id, set) {
    var box = document.getElementById(id);
    Array.prototype.forEach.call(box.querySelectorAll('button'), function (x) {
      x.onclick = function () {
        if (x.disabled) return;
        set(x.dataset.f);
        Array.prototype.forEach.call(box.querySelectorAll('button'), function (y) { y.classList.toggle('on', y === x); });
        render(true);
      };
    });
  }
  segs('fsrc', function (f) { fsrc = f; });
  segs('fst', function (f) { fst = f; });
  function pass(it, f) {
    return f === 'all' || (f === 'kyotsu' && !it.c) || (f === 'center' && it.c) || (f === 'ng' && marks[it.id] === 'n') ||
      (f === 'un' && !marks[it.id]) || (f === 'ngun' && marks[it.id] !== 'y') || (f === 'w2' && qW(it.id) >= 2);
  }
  function stat() {
    var all = searching() ? searchBase() : D.filter(function (it) { return it.ch === ch; });
    var ok = all.filter(function (it) { return marks[it.id] === 'y'; }).length;
    var ng = all.filter(function (it) { return marks[it.id] === 'n'; }).length;
    document.getElementById('stat').innerHTML = '<b class="y">○' + ok + '</b>　<b class="n">×' + ng + '</b>　／' + all.length + '問';
    // 出典・表示ボタンの件数
    ['all', 'kyotsu', 'center'].forEach(function (f) {
      var b = document.querySelector('#fsrc button[data-f="' + f + '"]');
      var n = all.filter(function (it) { return pass(it, f) && pass(it, fst); }).length;
      b.dataset.label = b.dataset.label || b.textContent;
      b.innerHTML = b.dataset.label + '<em>' + n + '</em>';
      b.disabled = f !== 'all' && !all.filter(function (it) { return pass(it, f); }).length;
    });
    ['all', 'ng', 'un', 'w2'].forEach(function (f) {
      var b = document.querySelector('#fst button[data-f="' + f + '"]');
      var n = all.filter(function (it) { return pass(it, fsrc) && pass(it, f); }).length;
      b.dataset.label = b.dataset.label || b.textContent;
      b.innerHTML = b.dataset.label + '<em>' + n + '</em>';
    });
    // 章カード
    Array.prototype.forEach.call(grid.children, function (c) {
      var i = +c.dataset.ch - 1;
      var L = D.filter(function (it) { return it.ch === i + 1; });
      var y = L.filter(function (it) { return marks[it.id] === 'y'; }).length;
      var n = L.filter(function (it) { return marks[it.id] === 'n'; }).length;
      c.querySelector('.cs').textContent = L.length + '問　○' + y + '　×' + n;
      c.querySelector('.cb .y').style.width = (L.length ? 100 * y / L.length : 0) + '%';
      c.querySelector('.cb .n').style.width = (L.length ? 100 * n / L.length : 0) + '%';
      c.classList.toggle('on', i + 1 === ch && !searching());
    });
  }
  function fromHash() { var m = (location.hash || '').match(/^#ch([1-9])$/); ch = m ? +m[1] : 1; if (!chIn(ch)) { ch = 1; if (m) history.replaceState(null, '', location.pathname + location.search + '#ch1'); } }
  // 一覧は最初の数問だけすぐ表示し，残りは少しずつ描画する
  var RJ = null;
  function later(f) { if (window.requestIdleCallback) requestIdleCallback(f, { timeout: 120 }); else setTimeout(f, 16); }
  function queueRender(gens) {
    var job = { g: gens, i: 0 }; RJ = job;
    function put() { M.appendChild(job.g[job.i++]()); }
    for (var n = 0; job.i < job.g.length && n < 8; n++) put();
    (function step() {
      if (RJ !== job) return;
      if (document.body.classList.contains('running')) { RJ = null; return; }
      if (job.i >= job.g.length) { RJ = null; return; }
      var t = performance.now();
      while (job.i < job.g.length && performance.now() - t < 14) put();
      later(step);
    })();
  }
  function flushRender() { var job = RJ; if (!job) return; RJ = null; while (job.i < job.g.length) M.appendChild(job.g[job.i++]()); }
  function el2(cls, txt) { return function () { var d = document.createElement('div'); d.className = cls; d.textContent = txt; return d; }; }
  function cardGen(it) { return function () { return card(it, { onMark: stat }); }; }
  function render(keep) {
    RJ = null;
    document.body.classList.remove('running');
    ses = null;
    if (searching()) return renderSearch();
    // センターの問題がない章では「センター」を選べないので，すべてに戻す
    if (fsrc === 'center' && !D.some(function (it) { return it.ch === ch && it.c; })) {
      fsrc = 'all';
      Array.prototype.forEach.call(document.querySelectorAll('#fsrc button'), function (y) { y.classList.toggle('on', y.dataset.f === 'all'); });
    }
    Array.prototype.forEach.call(document.querySelectorAll('.tab'), function (t) { t.classList.toggle('on', +t.dataset.ch === ch); });
    var sti = document.getElementById('stat'); if (sti) sti.style.visibility = '';
    var on = tabs.querySelector('[data-ch="' + ch + '"]'); if (on && on.scrollIntoView) tabs.scrollLeft = on.offsetLeft - 12;
    M.innerHTML = '';
    var h = document.createElement('div'); h.className = 'chtitle'; h.textContent = '第' + ch + '章　' + chTitle(ch); M.appendChild(h);
    var L = D.filter(function (it) { return it.ch === ch && pass(it, fsrc) && pass(it, fst); });
    if (!L.length) { var e = document.createElement('div'); e.className = 'empty'; e.textContent = '該当する問題はありません'; M.appendChild(e); }
    var g = null, gens = [];
    L.forEach(function (it) {
      var gg = it.c ? 'センター試験' : '共通テスト';
      if (gg !== g) { g = gg; gens.push(el2('grp', gg)); }
      gens.push(cardGen(it));
    });
    queueRender(gens);
    stat();
  }
  window.addEventListener('hashchange', function () {
    if (/^#import=/.test(location.hash)) { checkImport(); return; }
    if (run || ses) return; fromHash(); clearSearch(); render();
    var nav = document.getElementById('nav');
    if (pendingJump || window.pageYOffset > nav.offsetTop) jumpList();
    pendingJump = false;
  });
  document.getElementById('top').onclick = function () { window.scrollTo({ top: 0, behavior: 'smooth' }); };

  // ---------------------------------------------------------------- 演習モード
  var run = null, timerId = null;
  var setup = document.getElementById('setup');
  document.getElementById('openSetup').onclick = function () { setup.classList.add('on'); updCount(); };
  document.getElementById('closeSetup').onclick = function () { setup.classList.remove('on'); };
  setup.addEventListener('click', function (e) { if (e.target === setup) setup.classList.remove('on'); });
  function val(name) { var x = setup.querySelector('input[name="' + name + '"]:checked'); return x ? x.value : null; }
  function chosenChapters() { return Array.prototype.map.call(setup.querySelectorAll('input[name="sch"]:checked'), function (x) { return +x.value; }); }
  function pool() {
    var chs = chosenChapters(), src = val('src'), tgt = val('tgt');
    return D.filter(function (it) {
      return chs.indexOf(it.ch) >= 0 && pass(it, src) && pass(it, tgt);
    });
  }
  function updCount() {
    var p = pool();
    document.getElementById('poolN').textContent = p.length;
    document.getElementById('startRun').disabled = !p.length;
  }
  setup.addEventListener('change', updCount);
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  document.getElementById('startRun').onclick = function () {
    var p = pool();
    if (val('ord') === 'rand') shuffle(p);
    var cnt = val('cnt'); if (cnt !== 'all') p = p.slice(0, +cnt);
    var per = +val('tm');
    startRun(p.map(function (x) { return x.id; }), per);
    setup.classList.remove('on');
  };
  function startRun(ids, per) {
    run = { ids: ids, k: 0, res: {}, per: per, left: per ? per * ids.length : 0, over: false, sh: val('chs') !== 'keep',
      t0: Date.now(), qt: {}, qs: Date.now(), end: 0 };
    document.body.classList.add('running');
    clearInterval(timerId);
    timerId = setInterval(tick, 1000);
    showRun();
  }
  function fmt(s) { var m = Math.floor(s / 60), x = s % 60; return m + ':' + (x < 10 ? '0' : '') + x; }
  function sec(ms) { return Math.max(0, Math.floor(ms / 1000)); }
  // 経過時間（全体）と，この問題にかけている時間（答え合わせで止まる）
  function clocks() {
    var a = document.getElementById('relap'), q = document.getElementById('rq'), id = run.ids[run.k];
    if (a) a.textContent = fmt(sec(Date.now() - run.t0));
    if (q) { q.textContent = fmt(sec(run.qt[id] !== undefined ? run.qt[id] : Date.now() - run.qs)); q.parentNode.classList.toggle('stop', run.qt[id] !== undefined); }
  }
  function tick() {
    if (!run || run.end) return;
    clocks();
    if (!run.per) return;
    run.left--;
    var t = document.getElementById('rtime');
    if (t) { t.textContent = '残り ' + fmt(Math.max(0, run.left)); t.classList.toggle('warn', run.left <= 60); }
    if (run.left <= 0) { clearInterval(timerId); run.over = true; showResult(); }
  }
  function runBar() {
    return '<div class="rbar"><span class="rpos">' + (run.k + 1) + ' / ' + run.ids.length + '</span>' +
      '<span class="rprog"><i style="width:' + (100 * run.k / run.ids.length) + '%"></i></span>' +
      '<button type="button" class="rquit" id="rquit">終了</button>' +
      '<span class="rclk">' + (run.per ? '<span class="rtime" id="rtime">残り ' + fmt(run.left) + '</span>' : '') +
      '<span>⏱ 全体 <b id="relap">0:00</b></span><span>この問題 <b id="rq">0:00</b></span></span></div>';
  }
  function showRun() {
    var id = run.ids[run.k], it = run.sh ? permItem(BYID[id]) : BYID[id];
    run.qs = Date.now();
    M.innerHTML = runBar(); clocks();
    var c = card(it, {
      run: true,
      onDone: function (r) { run.res[id] = r; if (run.qt[id] === undefined) run.qt[id] = Date.now() - run.qs; clocks(); nextBtn(c); },
      onMark: function () { var r = run.res[id]; if (r) r.mark = marks[id] || null; }
    });
    M.appendChild(c);
    document.getElementById('rquit').onclick = function () {
      if (confirm('ここで終了して結果を表示しますか？')) { clearInterval(timerId); showResult(); }
    };
    window.scrollTo(0, 0);
  }
  function nextBtn(c) {
    var last = run.k === run.ids.length - 1;
    c.cfc.after.innerHTML = '<button type="button" class="next">' + (last ? '結果を見る' : '次の問題へ →') + '</button>';
    c.cfc.after.querySelector('.next').onclick = function () {
      if (last) { clearInterval(timerId); showResult(); }
      else { run.k++; showRun(); }
    };
  }
  function showResult() {
    if (!run.end) run.end = Date.now();
    var ids = run.ids, ok = 0, ng = 0, un = 0, sr = 0, st = 0, tq = 0, nq = 0;
    var rows = ids.map(function (id, i) {
      var it = BYID[id], r = run.res[id];
      var m = r ? (r.mark || marks[id] || null) : null;
      if (r && r.judged) { sr += r.right; st += r.total; }
      if (!r) un++; else if (m === 'y') ok++; else if (m === 'n') ng++; else un++;
      var ic = !r ? '<span class="ri un">－</span>' : m === 'y' ? '<span class="ri ok">○</span>' : m === 'n' ? '<span class="ri ng">×</span>' : '<span class="ri un">？</span>';
      var det = r && r.judged ? '<span class="rd">記述 ' + r.right + '/' + r.total + '</span>' : '';
      var qt = run.qt[id]; if (qt !== undefined) { tq += qt; nq++; }
      return '<li data-id="' + id + '">' + ic + '<span class="rm">' + metaHTML(it) + '</span>' + det + (qt !== undefined ? '<span class="rq">' + fmt(sec(qt)) + '</span>' : '') + '</li>';
    }).join('');
    var wrong = ids.filter(function (id) { var r = run.res[id]; return !r || (r.mark || marks[id]) !== 'y'; });
    M.innerHTML = '<div class="result"><h2>結果' + (run.over ? '（時間切れ）' : '') + '</h2>' +
      '<div class="score"><b>' + ok + '</b> / ' + ids.length + ' 問 正解</div>' +
      (st ? '<div class="sub">記述ごとの判定：' + sr + ' / ' + st + '（' + Math.round(100 * sr / st) + '%）</div>' : '') +
      '<div class="sub">○ ' + ok + '　× ' + ng + '　未解答・未記録 ' + un + '</div>' +
      '<div class="sub rtm">⏱ かかった時間 <b>' + fmt(sec(run.end - run.t0)) + '</b>' + (nq ? '　1問あたり平均 <b>' + fmt(Math.round(tq / nq / 1000)) + '</b>' : '') + '</div>' +
      '<ul class="rlist">' + rows + '</ul>' +
      '<div class="rbtns">' + (wrong.length ? '<button type="button" id="again">○以外の ' + wrong.length + ' 問をもう一度</button>' : '') +
      '<button type="button" id="back" class="sec">一覧に戻る</button></div></div>';
    typeset(M);
    var per = run.per;
    if (wrong.length) document.getElementById('again').onclick = function () { startRun(wrong.slice(), per); };
    document.getElementById('back').onclick = function () { run = null; fromHash(); render(); window.scrollTo(0, 0); updRev(); };
    Array.prototype.forEach.call(M.querySelectorAll('.rlist li'), function (li) {
      li.onclick = function () { goTo(li.dataset.id); };
    });
    window.scrollTo(0, 0);
  }

  // ================================================================ 共通
  var ses = null;
  function $(id) { return document.getElementById(id); }
  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  window.CFC_toast = function (m) { toast(m); };
  function toast(msg) {
    var t = $('toast');
    if (!t) { t = document.createElement('div'); t.id = 'toast'; document.body.appendChild(t); }
    t.textContent = msg; t.classList.add('on');
    clearTimeout(toast.h); toast.h = setTimeout(function () { t.classList.remove('on'); }, 2600);
  }
  function goTo(id) {
    var it = BYID[id]; if (!it) return;
    run = null; ses = null; clearInterval(timerId);
    clearSearch();
    ch = it.ch;
    if (location.hash !== '#ch' + ch) history.replaceState(null, '', '#ch' + ch);
    fsrc = 'all'; fst = 'all';
    Array.prototype.forEach.call(document.querySelectorAll('.seg button'), function (x) { x.classList.toggle('on', x.dataset.f === 'all'); });
    render();
    flushRender();
    var el = $('q-' + id); if (el) el.scrollIntoView();
  }
  function plain(h) { var d = document.createElement('div'); d.innerHTML = h; return d.textContent; }

  // ================================================================ 検索
  var qtext = '', qtags = [];
  var NORM_IDX = null;
  function norm(t) {
    t = (t || '').normalize ? t.normalize('NFKC') : t;
    return t.toLowerCase().replace(/<[^>]*>/g, '').replace(/\\(ce|mathrm|text|mathit|rm|bf|textbf)\b/g, '')
      .replace(/\\[a-z]+/g, '').replace(/[{}_^$\s　~]/g, '').replace(/[，,．。・]/g, '');
  }
  function strings(x, out) {
    if (typeof x === 'string') return;
    if (Array.isArray(x)) { x.forEach(function (y) { strings(y, out); }); return; }
    if (x && typeof x === 'object') {
      if (typeof x.h === 'string') out.push(x.h);
      if (typeof x.l === 'string') out.push(x.l);
      Object.keys(x).forEach(function (k) { if (k !== 'h' && k !== 'l' && typeof x[k] === 'object') strings(x[k], out); });
    }
  }
  function idx() {
    if (NORM_IDX) return NORM_IDX;
    NORM_IDX = {};
    D.forEach(function (it) {
      var o = []; strings(it.P, o); strings(it.K, o); o.push(it.a, it.ex, String(it.y));
      (it.tg || []).forEach(function (i) { o.push(TAGS[i]); });
      NORM_IDX[it.id] = norm(o.join(' '));
    });
    return NORM_IDX;
  }
  function searching() { return !!(qtext.trim() || qtags.length); }
  function searchBase() {
    var words = qtext.trim().split(/[\s　]+/).map(norm).filter(Boolean), X = words.length ? idx() : null;
    return D.filter(function (it) {
      if (!inC(it)) return false;
      if (qtags.length && !qtags.some(function (t) { return (it.tg || []).indexOf(t) >= 0; })) return false;
      return words.every(function (w) { return X[it.id].indexOf(w) >= 0; });
    });
  }
  function clearSearch() { qtext = ''; qtags = []; var q = $('qbox'); if (q) q.value = ''; syncTags(); }
  var SLIM = 60;
  function renderSearch(more) {
    RJ = null;
    Array.prototype.forEach.call(document.querySelectorAll('.tab'), function (t) { t.classList.remove('on'); });
    M.innerHTML = '';
    var base = searchBase();
    var L = base.filter(function (it) { return pass(it, fsrc) && pass(it, fst); });
    var lab = [];
    if (qtext.trim()) lab.push('「' + esc(qtext.trim()) + '」');
    if (qtags.length) lab.push(qtags.map(function (i) { return '#' + esc(TAGS[i]); }).join(' または '));
    var h = document.createElement('div'); h.className = 'sinfo';
    h.innerHTML = '<span>' + lab.join('　') + '：' + L.length + ' 問</span><button type="button" id="sclr">検索をやめる</button>' +
      (L.length ? '<button type="button" id="sdrill">この問題の記述で一問一答</button>' : '');
    M.appendChild(h);
    $('sclr').onclick = function () { clearSearch(); render(); };
    if ($('sdrill')) $('sdrill').onclick = function () {
      var ids = {}; L.forEach(function (it) { ids[it.id] = 1; });
      var q = shuffle(STM.filter(function (o) { return ids[o.id]; })).slice(0, 50);
      if (!q.length) { toast('記述の ○× がある問題がありません'); return; }
      startSes(q.map(function (o) { return { t: 's', k: o.k }; }), '一問一答（検索結果）');
    };
    if (!L.length) { var e = document.createElement('div'); e.className = 'empty'; e.textContent = '該当する問題はありません'; M.appendChild(e); }
    L.sort(function (a, b) { return a.ch - b.ch || a.n - b.n; });
    var show = more ? L : L.slice(0, SLIM), g = null, gens = [];
    show.forEach(function (it) {
      if (it.ch !== g) { g = it.ch; gens.push(el2('chhd', '第' + g + '章　' + chTitle(g))); }
      gens.push(cardGen(it));
    });
    if (show.length < L.length) gens.push(function () {
      var mb = document.createElement('button'); mb.type = 'button'; mb.className = 'reveal';
      mb.textContent = '残り ' + (L.length - show.length) + ' 問も表示'; mb.onclick = function () { renderSearch(true); };
      return mb;
    });
    queueRender(gens);
    stat();
    var hd = document.querySelector('#nav .chname'); if (hd) hd.textContent = '検索結果';
  }
  function setTags(a) { qtags = a.slice(); syncTags(); render(); }
  var TGRP = [['物質の構成', 0, 8], ['物質の変化', 8, 18], ['実験・生活', 18, 20], ['無機', 20, 26], ['有機・高分子', 26, TAGS.length]];
  function tagCounts() { var c = TAGS.map(function () { return 0; }); D.forEach(function (it) { if (inC(it)) (it.tg || []).forEach(function (i) { c[i]++; }); }); return c; }
  (function buildTagSel() {
    var w = $('tagwrap'); if (!w) return;
    var c = tagCounts();
    w.innerHTML = TGRP.map(function (g) {
      var bs = '';
      for (var i = g[1]; i < g[2]; i++) if (c[i]) bs += '<button type="button" class="tg" data-t="' + i + '">' + esc(TAGS[i]) + '<em>' + c[i] + '</em></button>';
      if (!bs) return '';
      return '<div class="tgrp"><h4>' + g[0] + '</h4><div class="tgw">' + bs + '</div></div>';
    }).join('');
    w.addEventListener('click', function (e) {
      var b = e.target.closest('.tg'); if (!b) return;
      var t = +b.dataset.t, k = qtags.indexOf(t);
      if (k >= 0) qtags.splice(k, 1); else qtags.push(t);
      syncTags(); render();
    });
    var q = $('qbox'), tm = null;
    q.addEventListener('input', function () { clearTimeout(tm); tm = setTimeout(function () { qtext = q.value; render(); }, 250); });
    q.addEventListener('keydown', function (e) { if (e.key === 'Enter') { clearTimeout(tm); qtext = q.value; render(); q.blur(); jumpList(); } });
    $('qclr').onclick = function () { clearSearch(); render(); };
    var dt = $('dtag');
    TAGS.forEach(function (t, i) { if (!c[i]) return; var o = document.createElement('option'); o.value = i; o.textContent = t + '（' + c[i] + '問）'; dt.appendChild(o); });
  })();
  function syncTags() {
    Array.prototype.forEach.call(document.querySelectorAll('#tagwrap .tg'), function (b) { b.classList.toggle('on', qtags.indexOf(+b.dataset.t) >= 0); });
    var on = $('tagon'); if (on) on.textContent = qtags.length ? qtags.length + ' 個選択中' : '';
  }
  M.addEventListener('click', function (e) {
    var b = e.target.closest('.tgs .tg'); if (!b) return;
    var q = $('qbox'); qtext = ''; if (q) q.value = '';
    setTags([+b.dataset.t]); jumpList();
  });

  // ================================================================ 一問一答
  function hexp(it, l) {
    var found = null;
    (function walk(bs) {
      (bs || []).forEach(function (b) {
        if (found) return;
        if (b.t === 'hantei') b.items.forEach(function (x) { if (!found && x.l === l) found = x; });
        else if (b.b) walk(b.b);
        else if (b.t === 'list') b.items.forEach(function (x) { walk(x.b); });
      });
    })(it.K);
    return found;
  }
  function leadOf(o) {
    if (!o.stem) return '';
    var m = o.stem.h.match(/^(.*?)を，次の/);
    if (m) return m[1];
    // 「次の物質①〜⑥について，単体であれば○…」のような短い問題文は，そのまま見出しにする
    return plain(o.stem.h).length <= 110 && !/図|表/.test(plain(o.stem.h)) ? o.stem.h : '';
  }
  function dcard(o, done) {
    var it = o.it, lead = leadOf(o);
    var ctx = (it.P || []).filter(function (b) { return b !== o.lst; });
    var auto = !o.b || !lead || ctx.length > 1;
    var noCtx = o.b && lead === (o.stem && o.stem.h) && ctx.length === 1;   // 見出しが問題文そのもの
    var el = document.createElement('section');
    el.className = 'dcard';
    function dw() { var w = sW(o.id, o.s); return '<span class="wq' + (w >= 3 ? ' w3' : '') + '"' + (w ? '' : ' hidden') + '>この記述の間違い ' + w + '回</span>'; }
    el.innerHTML = '<div class="meta">' + metaHTML(it) + dw() + '</div>' +
      (lead ? '<div class="dlead">' + lead + '</div>' : '') +
      (noCtx ? '' : '<details class="dctx"' + (auto ? ' open' : '') + '><summary>問題文' + (it.P.some(function (b) { return b.t === 'fig' || b.t === 'pf'; }) ? '・図' : '') + '</summary><div class="pb">' + blocks(ctx) + '</div></details>') +
      (o.b ? '<div class="dst"><span class="lb">' + o.l + '</span><div class="bd">' + blocks(o.b) + '</div></div>' :
        '<div class="dst"><div class="bd"><p>上の問題文・図の <b>' + o.l + '</b> は' + (o.stem && /適当/.test(o.stem.h) ? '適当？' : '正しい？') + '</p></div></div>') +
      '<div class="dbtns"><button type="button" class="dO" data-v="1">○<small>正しい</small></button><button type="button" class="dX" data-v="0">×<small>誤り</small></button></div>' +
      '<div class="dres"><div class="dv"></div><div class="dex"></div><div class="dfoot"></div></div>';
    typeset(el);
    var answered = false;
    Array.prototype.forEach.call(el.querySelectorAll('.dbtns button'), function (b) {
      b.onclick = function () {
        if (answered) return; answered = true;
        var v = +b.dataset.v, ok = v === o.v;
        recS(o.id, o.s, ok);
        var wq = el.querySelector('.meta .wq'); if (wq) wq.outerHTML = dw();
        Array.prototype.forEach.call(el.querySelectorAll('.dbtns button'), function (x) { x.disabled = true; x.classList.toggle('pick', x === b); });
        var dv = el.querySelector('.dv');
        dv.className = 'dv ' + (ok ? 'ok' : 'ng');
        dv.innerHTML = (ok ? '○ 正解' : '× 不正解') + '<small>この記述は' + (o.v ? '正しい' : '誤り') + '</small>';
        var h = hexp(it, o.l);
        el.querySelector('.dex').innerHTML = h ? blocks(h.b) : '<p>正解：' + it.a + '</p>';
        el.classList.add('done');
        typeset(el);
        if (done) done(ok, el);
      };
    });
    return el;
  }
  function stmPool() {
    var chs = Array.prototype.map.call(document.querySelectorAll('#dsetup input[name="dch"]:checked'), function (x) { return +x.value; });
    var src = (document.querySelector('#dsetup input[name="dsrc"]:checked') || {}).value || 'all';
    var tgt = (document.querySelector('#dsetup input[name="dtgt"]:checked') || {}).value || 'all';
    var tg = $('dtag').value;
    return STM.filter(function (o) {
      var it = o.it, r = ST[o.k];
      if (!inC(it)) return false;
      if (chs.indexOf(it.ch) < 0 || !pass(it, src)) return false;
      if (tg !== '' && (it.tg || []).indexOf(+tg) < 0) return false;
      if (tgt === 'un') return !r;
      if (tgt === 'ng') return !!(r && r[1]);
      if (tgt === 'weak') return !!(r && r[1] > r[0]);
      if (tgt === 'w2') return !!(r && r[1] >= 2);
      return true;
    });
  }
  var dsetup = $('dsetup');
  function dcount() { var n = stmPool().length; $('dpoolN').textContent = n; $('dstart').disabled = !n; }
  dsetup.addEventListener('change', dcount);
  dsetup.addEventListener('click', function (e) { if (e.target === dsetup) dsetup.classList.remove('on'); });
  $('goDrill').onclick = function () { dsetup.classList.add('on'); dcount(); };
  $('dclose').onclick = function () { dsetup.classList.remove('on'); };
  $('dstart').onclick = function () {
    var p = shuffle(stmPool()), c = (document.querySelector('#dsetup input[name="dcnt"]:checked') || {}).value || '20';
    if (c !== 'all') p = p.slice(0, +c);
    dsetup.classList.remove('on');
    startSes(p.map(function (o) { return { t: 's', k: o.k }; }), '一問一答');
  };

  // ---------------------------------------------------------------- セッション（一問一答・今日の復習）
  function startSes(q, title, kind) {
    q = q.filter(function (e) { return e.t === 'q' ? BYID[e.id] : SBY[e.k]; });
    if (!q.length) { toast('出題できる問題がありません'); return; }
    run = null; clearInterval(timerId);
    document.body.classList.add('running');
    ses = { q: q, k: 0, res: [], title: title, kind: kind || '', nosrs: kind === 'rvp' };
    showSes();
  }
  function sesBar() {
    return '<div class="rbar"><span class="rpos">' + (ses.k + 1) + ' / ' + ses.q.length + '</span>' +
      '<span class="rprog"><i style="width:' + (100 * ses.k / ses.q.length) + '%"></i></span>' +
      '<span class="rsc">' + esc(ses.title) + '</span>' +
      '<button type="button" class="rquit" id="rquit">終了</button></div>';
  }
  function sesNext(box) {
    var last = ses.k === ses.q.length - 1;
    box.innerHTML = '<button type="button" class="dnext">' + (last ? '結果を見る' : '次へ →') + '</button>';
    var b = box.querySelector('.dnext');
    b.onclick = function () { if (last) sesResult(); else { ses.k++; showSes(); } };
    return b;
  }
  function showSes() {
    var e = ses.q[ses.k], my = ses;
    M.innerHTML = sesBar();
    $('rquit').onclick = function () { if (!my.res.length || confirm('ここで終了して結果を表示しますか？')) sesResult(); };
    if (e.t === 's') {
      var o = SBY[e.k];
      var c = dcard(o, function (ok, el) {
        my.res[my.k] = { e: e, ok: ok };
        if (my.kind === 'rv') logRv(e, ok);
        var b = sesNext(el.querySelector('.dfoot'));
        try { b.focus({ preventScroll: true }); } catch (x) {}
        var r = el.querySelector('.dres').getBoundingClientRect();
        if (r.bottom > window.innerHeight) window.scrollBy({ top: Math.min(r.top - 60, r.bottom - window.innerHeight + 16), behavior: 'smooth' });
      });
      M.appendChild(c);
    } else {
      var it = BYID[e.id];
      var cc = card(it, {
        run: true,
        onDone: function (r) {
          my.res[my.k] = { e: e, ok: r.mark ? r.mark === 'y' : null };
          if (my.kind === 'rv') logRv(e, my.res[my.k].ok);
          var box = cc.cfc.after; box.style.padding = '0 12px 14px'; sesNext(box);
        },
        onMark: function () { var r = my.res[my.k]; if (r) { r.ok = marks[e.id] ? marks[e.id] === 'y' : null; if (my.kind === 'rv') logRv(e, r.ok); } }
      });
      M.appendChild(cc);
    }
    window.scrollTo(0, 0);
  }
  document.addEventListener('keydown', function (ev) {
    if (!ses || !ses.q || ev.target.tagName === 'INPUT' || ev.target.tagName === 'TEXTAREA') return;
    var k = ev.key.toLowerCase();
    if (k === 'o' || k === '1') { var b = M.querySelector('.dcard:not(.done) .dO'); if (b) b.click(); }
    else if (k === 'x' || k === '2') { var c = M.querySelector('.dcard:not(.done) .dX'); if (c) c.click(); }
  });
  function sesResult() {
    var my = ses, R = my.res.filter(Boolean);
    var sR = R.filter(function (r) { return r.e.t === 's'; }), qR = R.filter(function (r) { return r.e.t === 'q'; });
    var sOk = sR.filter(function (r) { return r.ok; }).length, qOk = qR.filter(function (r) { return r.ok; }).length;
    var wrong = R.filter(function (r) { return r.ok === false; });
    var rest = my.q.length - R.length;
    var li = wrong.map(function (r) {
      if (r.e.t === 's') {
        var o = SBY[r.e.k];
        return '<li data-id="' + o.id + '"><div class="dm">' + o.it.ch + '–' + o.it.n + '　' + o.it.y + '年度 ' + o.it.ex + '　→ この記述は' + (o.v ? '正しい' : '誤り') + '</div><div class="dt"><b>' + o.l + '</b> ' + (o.b ? blocks(o.b) : '（問題文・図を参照）') + '</div></li>';
      }
      var it = BYID[r.e.id];
      return '<li data-id="' + it.id + '"><div class="dm">問題　' + it.ch + '–' + it.n + '　' + it.y + '年度 ' + it.ex + '</div><div class="dt">' + esc(it.q) + '</div></li>';
    }).join('');
    M.innerHTML = '<div class="result"><h2>' + esc(my.title) + '　結果</h2>' +
      (sR.length ? '<div class="score"><b>' + sOk + '</b> / ' + sR.length + ' 記述 正解</div>' : '') +
      (qR.length ? '<div class="sub">問題：○ ' + qOk + ' / ' + qR.length + '</div>' : '') +
      (rest ? '<div class="sub">未回答 ' + rest + '</div>' : '') +
      (wrong.length ? '<div class="sub">間違えたものは「今日の復習」に入り，翌日 → 3日後 → 1週間後に出題されます．</div>' +
        '<h3 style="font-size:14px;margin:14px 0 4px;color:var(--hd)">間違えたもの（タップで問題へ）</h3><ul class="dlist">' + li + '</ul>' : '<div class="sub">全問正解です．</div>') +
      '<div class="rbtns">' + (wrong.length ? '<button type="button" id="again">間違えた ' + wrong.length + ' 個をもう一度</button>' : '') +
      '<button type="button" id="back" class="sec">ホームに戻る</button></div></div>';
    typeset(M);
    if (wrong.length) $('again').onclick = function () { startSes(wrong.map(function (r) { return r.e; }), my.title); };
    $('back').onclick = function () { ses = null; fromHash(); render(); updRev(); window.scrollTo(0, 0); };
    Array.prototype.forEach.call(M.querySelectorAll('.dlist li'), function (x) { x.onclick = function () { goTo(x.dataset.id); }; });
    if (my.kind === 'rv' && !dueList().length) { RVP = { d: rvDay(), done: true }; sv('cfc-rvp', RVP); }
    if (my.kind === 'rv') M.querySelector('.rbtns').insertAdjacentHTML('beforeend', '<button type="button" id="rvlog" class="sec">今日の復習の一覧</button>');
    if ($('rvlog')) $('rvlog').onclick = showRvLog;
    ses = { done: true };
    updRev();
    window.scrollTo(0, 0);
  }

  // ---------------------------------------------------------------- 今日の復習
  function dueList() {
    var t = today();
    return Object.keys(RV).filter(function (k) { return RV[k][1] <= t; }).map(function (k) {
      return k.charAt(0) === 's' ? { t: 's', k: k.slice(2) } : { t: 'q', id: k.slice(2) };
    }).filter(function (e) { return e.t === 'q' ? BYID[e.id] && inC(BYID[e.id]) : SBY[e.k] && inC(SBY[e.k].it); });
  }
  function updRev() {
    var n = $('revN'), sub = $('revSub'), b = $('goReview'); if (!n) return;
    var d = dueList().length, t = today();
    var next = Object.keys(RV).map(function (k) { return RV[k][1]; }).filter(function (x) { return x > t; }).sort(function (a, b) { return a - b; })[0];
    n.textContent = d; n.classList.toggle('on', d > 0);
    b.classList.toggle('due', d > 0);
    sub.textContent = d ? d + ' 個が待っています' : rvLog().length ? '今日は済み・一覧を見る' : (next ? '次は' + (next - t === 1 ? '明日' : (next - t) + '日後') : '間違えた記述');
  }
  function startReview() {
    var q = dueList();
    if (!q.length) {
      if (rvLog().length) { showRvLog(); return; }
      var tot = Object.keys(RV).length;
      toast(tot ? '今日の復習はありません（予定 ' + tot + ' 個）' : '復習はまだありません．間違えた記述が翌日から出題されます．');
      return;
    }
    shuffle(q);
    q.sort(function (a, b) { return (a.t === 'q') - (b.t === 'q'); });
    startSes(q, '今日の復習', 'rv');
  }
  $('goReview').onclick = startReview;

  // ---------------------------------------------------------------- 今日の復習：お知らせと記録
  // 1日の区切りは朝5時．その日の復習が全部終わるまで，ページを開くたび（30分以上離れて戻ったときも）お知らせする
  function rvDay() { var d = new Date(); return Math.floor((d.getTime() - d.getTimezoneOffset() * 60000 - 5 * 3600000) / 86400000); }
  var RVP = ld('cfc-rvp', {});      // { d: 日, done: その日の復習を終えたか }
  var RVL = ld('cfc-rvlog', {});    // { d: 日, r: [[種類, キー, ○×], …] }  その日に復習で解いたもの
  function rvLog() { return RVL && RVL.d === rvDay() && Array.isArray(RVL.r) ? RVL.r : []; }
  function logRv(e, ok) {
    var d = rvDay(), key = e.t === 's' ? e.k : e.id;
    if (!RVL || RVL.d !== d || !Array.isArray(RVL.r)) RVL = { d: d, r: [] };
    var i = RVL.r.findIndex(function (x) { return x[0] === e.t && x[1] === key; });
    var v = ok === null || ok === undefined ? null : ok ? 1 : 0;
    if (i >= 0) RVL.r[i][2] = v; else RVL.r.push([e.t, key, v]);
    sv('cfc-rvlog', RVL);
  }
  function rvEntry(x) { return x[0] === 's' ? { t: 's', k: x[1] } : { t: 'q', id: x[1] }; }
  function rvLi(x) {
    var ic = x[2] === 1 ? '<span class="ri ok">○</span>' : x[2] === 0 ? '<span class="ri ng">×</span>' : '<span class="ri un">？</span>';
    if (x[0] === 's') {
      var o = SBY[x[1]]; if (!o) return '';
      return '<li data-id="' + o.id + '"><div class="dm">' + ic + ' ' + o.it.ch + '–' + o.it.n + '　' + o.it.y + '年度 ' + o.it.ex + '　→ この記述は' + (o.v ? '正しい' : '誤り') + '</div><div class="dt"><b>' + o.l + '</b> ' + (o.b ? blocks(o.b) : '（問題文・図を参照）') + '</div></li>';
    }
    var it = BYID[x[1]]; if (!it) return '';
    return '<li data-id="' + it.id + '"><div class="dm">' + ic + ' 問題　' + it.ch + '–' + it.n + '　' + it.y + '年度 ' + it.ex + '</div><div class="dt">' + esc(it.q) + '</div></li>';
  }
  function showRvLog() {
    var L = rvLog();
    run = null; clearInterval(timerId); ses = { stats: true };
    document.body.classList.add('running');
    var ok = L.filter(function (x) { return x[2] === 1; }).length, ng = L.filter(function (x) { return x[2] === 0; });
    var due = dueList().length;
    M.innerHTML = '<div class="rbar"><span class="rpos">今日の復習</span><span class="rprog" style="visibility:hidden"></span><button type="button" class="rquit" id="lback">ホームへ</button></div>' +
      '<div class="result"><h2>今日の復習' + (due ? '' : '（済）') + '</h2>' +
      (L.length ? '<div class="score"><b>' + ok + '</b> / ' + L.length + ' 正解</div>' +
        '<div class="sub">' + (due ? 'まだ ' + due + ' 個残っています．' : '今日の分は終わりました．') + '解き直しても，復習の予定（翌日 → 3日後 → 1週間後）は変わりません．</div>' +
        '<div class="rbtns" style="margin:12px 0">' + (due ? '<button type="button" id="lrest">残りの ' + due + ' 個を解く</button>' : '') +
        '<button type="button" id="lall"' + (due ? ' class="sec"' : '') + '>もう一度解く（' + L.length + ' 個）</button>' +
        (ng.length ? '<button type="button" id="lng" class="sec">間違えた ' + ng.length + ' 個だけ</button>' : '') + '</div>' +
        '<h3 style="font-size:14px;margin:14px 0 4px;color:var(--hd)">今日解いたもの（タップで問題へ）</h3><ul class="dlist rvl">' + L.map(rvLi).join('') + '</ul>'
        : '<div class="sub">今日はまだ復習をしていません．</div>') +
      '</div>';
    typeset(M);
    $('lback').onclick = function () { ses = null; fromHash(); render(); updRev(); window.scrollTo(0, 0); };
    if ($('lrest')) $('lrest').onclick = startReview;
    if ($('lall')) $('lall').onclick = function () { startSes(shuffle(L.map(rvEntry)), '今日の復習（解き直し）', 'rvp'); };
    if ($('lng')) $('lng').onclick = function () { startSes(shuffle(ng.map(rvEntry)), '今日の復習（解き直し）', 'rvp'); };
    Array.prototype.forEach.call(M.querySelectorAll('.rvl li'), function (x) { x.onclick = function () { goTo(x.dataset.id); }; });
    window.scrollTo(0, 0);
  }
  // お知らせ
  var rvAsk = $('rvask');
  function askRv() {
    if (!rvAsk || rvAsk.classList.contains('on')) return;
    if (document.body.classList.contains('running') || document.querySelector('.setup.on')) return;
    if (/^#import/.test(location.hash)) return;
    var n = dueList().length;
    if (!n || (RVP.d === rvDay() && RVP.done)) return;
    $('rvaN').textContent = n;
    var L = rvLog(); $('rvaSub').textContent = L.length ? '今日はすでに ' + L.length + ' 個解きました．残りを片づけましょう．' : '';
    rvAsk.classList.add('on');
  }
  if (rvAsk) {
    $('rvNow').onclick = function () { rvAsk.classList.remove('on'); startReview(); };
    $('rvLater').onclick = function () { rvAsk.classList.remove('on'); toast('ホームの「今日の復習」からいつでもできます'); };
    rvAsk.addEventListener('click', function (e) { if (e.target === rvAsk) rvAsk.classList.remove('on'); });
    setTimeout(askRv, 700);
    var hiddenAt = 0;
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) hiddenAt = Date.now();
      else if (hiddenAt && Date.now() - hiddenAt >= 30 * 60000) { hiddenAt = 0; askRv(); }
    });
  }

  // ---------------------------------------------------------------- 成績
  function acc(list) {
    var c = 0, w = 0;
    list.forEach(function (o) { var r = ST[o.k]; if (r) { c += r[0]; w += r[1]; } });
    return { c: c, w: w, n: c + w, p: c + w ? Math.round(100 * c / (c + w)) : null };
  }
  function srow(name, y, n, tot, p, attr, na) {
    return '<div class="srow' + (na ? ' na' : '') + '" ' + attr + '><span class="sn">' + name + '</span>' +
      '<span class="sb2"><i class="y" style="width:' + (tot ? 100 * y / tot : 0) + '%"></i><i class="n" style="width:' + (tot ? 100 * n / tot : 0) + '%"></i></span>' +
      '<span class="sp' + (p !== null && p < 60 ? ' lo' : '') + '">' + (p === null ? '－' : p + '%') + '</span></div>';
  }
  function showStats() {
    run = null; ses = { stats: true }; clearInterval(timerId);
    document.body.classList.add('running');
    // このコースの範囲だけで集計する（解いた数・正答率・今週はコース共通）
    var DV = D.filter(inC), STV = STM.filter(function (o) { return inC(o.it); });
    var my = DV.filter(function (it) { return marks[it.id]; }).map(function (it) { return it.id; }), y = my.filter(function (k) { return marks[k] === 'y'; }).length;
    var A = acc(STV), stTried = STV.filter(function (o) { return ST[o.k]; }).length;
    var t = today(), due = dueList().length, rvn = Object.keys(RV).length;
    var h = '<div class="rbar"><span class="rpos">成績</span><span class="rprog" style="visibility:hidden"></span><button type="button" class="rquit" id="sback">ホームへ</button></div>';
    var wk = CT.wk[weekStart()] || [0, 0];
    h += '<div class="sts"><h2>成績' + (PROF.nick ? '<small style="font-size:13px;color:var(--sub);margin-left:8px">' + esc(PROF.nick) + '</small>' : '') + '</h2>' +
      '<div class="tiles t3">' +
      '<div class="tile"><b>' + CT.n + '</b><span>解いた数（○×・番号ボタン）</span></div>' +
      '<div class="tile"><b>' + (CT.n ? Math.round(1000 * CT.c / CT.n) / 10 + '%' : '－') + '</b><span>正答率（' + CT.c + ' / ' + CT.n + '）</span></div>' +
      '<div class="tile"><b>' + wk[0] + '</b><span>今週の解いた数（月曜から）</span></div></div>' +
      '<p class="shint">ボタンを1回押して答え合わせするごとに数えます（解き直しも毎回数えます）．' + (PROF.nick ? '' : '設定でニックネームを登録できます．') + '</p>' +
      '<div class="tiles" style="margin-top:10px">' +
      '<div class="tile"><b>' + my.length + '</b><span>記録した問題 / ' + DV.length + '</span></div>' +
      '<div class="tile"><b>' + y + '</b><span>○ できた問題</span></div>' +
      '<div class="tile"><b>' + (A.p === null ? '－' : A.p + '%') + '</b><span>記述の正答率（' + stTried + ' / ' + STV.length + ' 記述）</span></div>' +
      '<div class="tile"><b>' + due + '</b><span>今日の復習（予定 ' + rvn + '）</span></div></div>';
    h += '<h3>章別</h3><p class="shint">○×：問題ごとの記録　バー・右の数字：記述の ○× の正解（緑）と間違い（赤）．タップでその章へ．</p>';
    CH.forEach(function (name, i) {
      if (!chIn(i + 1)) return;
      var L = D.filter(function (it) { return it.ch === i + 1; });
      var yy = L.filter(function (it) { return marks[it.id] === 'y'; }).length, nn = L.filter(function (it) { return marks[it.id] === 'n'; }).length;
      var a = acc(STM.filter(function (o) { return o.it.ch === i + 1; }));
      h += srow((i + 1) + '. ' + gBadge(i + 1) + name + '<small style="color:var(--sub)">　' + L.length + '問　○' + yy + ' ×' + nn + '</small>', a.c, a.w, a.n, a.p, 'data-ch="' + (i + 1) + '"', !a.n && !yy && !nn);
    });
    // 単元別
    var T = TAGS.map(function (name, i) {
      var L = STV.filter(function (o) { return (o.it.tg || []).indexOf(i) >= 0; });
      var a = acc(L); a.i = i; a.name = name; a.q = DV.filter(function (it) { return (it.tg || []).indexOf(i) >= 0; }).length; return a;
    });
    T.sort(function (a, b) { return (a.p === null) - (b.p === null) || (a.p - b.p) || b.n - a.n; });
    h += '<h3>単元別（苦手な順）</h3><p class="shint">タップでその単元の問題を表示します．</p>';
    T.forEach(function (a) {
      if (!a.q) return;
      h += srow(esc(a.name) + '<small style="color:var(--sub)">　' + a.q + '問' + (a.n ? '・' + a.n + '回' : '') + '</small>', a.c, a.w, a.n, a.p, 'data-t="' + a.i + '"', !a.n);
    });
    // よく間違える問題
    var WQ = DV.filter(function (it) { return qW(it.id); }).sort(function (a, b) {
      return qW(b.id) - qW(a.id) || (QW[b.id] ? QW[b.id][2] : 0) - (QW[a.id] ? QW[a.id][2] : 0);
    });
    h += '<h3>よく間違える問題</h3>';
    if (!WQ.length) h += '<p class="shint">まだありません．答え合わせで間違えると，ここに集まります．</p>';
    else h += '<p class="shint">答え合わせで間違えた回数（記述の ○× や一問一答で同じ記述を何度も間違えたときは，その回数）の多い順．タップでその問題へ．</p><ul class="wlist wq2">' + WQ.slice(0, 20).map(function (it) {
      return '<li data-id="' + it.id + '"><div class="wm"><span>' + it.ch + '–' + it.n + '　' + it.y + '年度 ' + esc(it.ex) + '　' + esc(it.q) + '</span><span><b>間違い ' + qW(it.id) + '回</b>' + (QW[it.id] && QW[it.id][0] ? '　正解 ' + QW[it.id][0] + '回' : '') + '</span></div></li>';
    }).join('') + '</ul>';
    if (WQ.length) h += '<div class="bline" style="margin-top:8px"><button type="button" id="wqrun">間違えた ' + Math.min(WQ.length, 20) + ' 問を演習モードで解く</button></div>';
    // よく間違える記述
    var W = STV.filter(function (o) { var r = ST[o.k]; return r && r[1]; }).sort(function (a, b) {
      var p = ST[a.k], q = ST[b.k]; return (q[1] - q[0]) - (p[1] - p[0]) || q[1] - p[1] || q[2] - p[2];
    });
    h += '<h3>よく間違える記述</h3>';
    if (!W.length) h += '<p class="shint">まだありません．問題の記述に ○× をつけて答え合わせをすると，ここに集まります．</p>';
    else h += '<ul class="wlist">' + W.slice(0, 20).map(function (o) {
      var r = ST[o.k];
      return '<li data-id="' + o.id + '"><div class="wm"><span>' + o.it.ch + '–' + o.it.n + '　' + o.it.y + '年度 ' + esc(o.it.ex) + '</span><span><b>×' + r[1] + '</b>　○' + r[0] + '</span><span>正解：' + (o.v ? '○ 正しい' : '× 誤り') + '</span></div>' +
        '<div class="wt"><b>' + o.l + '</b> ' + (o.b ? blocks(o.b) : '（問題文・図を参照）') + '</div></li>';
    }).join('') + '</ul>';
    h += '<div class="bline">' + (W.length ? '<button type="button" id="wdrill">間違えた ' + W.length + ' 記述を一問一答</button>' : '') +
      (due ? '<button type="button" id="wrev">今日の復習（' + due + '）</button>' : '') + '<button type="button" class="sec" id="sback2">ホームへ</button></div></div>';
    M.innerHTML = h;
    typeset(M);
    function home() { ses = null; fromHash(); render(); window.scrollTo(0, 0); }
    $('sback').onclick = home; $('sback2').onclick = home;
    if ($('wdrill')) $('wdrill').onclick = function () { startSes(shuffle(W.slice()).slice(0, 50).map(function (o) { return { t: 's', k: o.k }; }), '間違えた記述'); };
    if ($('wqrun')) $('wqrun').onclick = function () { startRun(shuffle(WQ.slice(0, 20).map(function (it) { return it.id; })), 0); };
    if ($('wrev')) $('wrev').onclick = function () { $('goReview').onclick(); };
    Array.prototype.forEach.call(M.querySelectorAll('.srow[data-ch]'), function (r) { r.onclick = function () { ses = null; clearSearch(); location.hash = 'ch' + r.dataset.ch; fromHash(); render(); jumpList(); }; });
    Array.prototype.forEach.call(M.querySelectorAll('.srow[data-t]'), function (r) { r.onclick = function () { ses = null; qtext = ''; var q = $('qbox'); if (q) q.value = ''; setTags([+r.dataset.t]); jumpList(); }; });
    Array.prototype.forEach.call(M.querySelectorAll('.wlist li'), function (x) { x.onclick = function () { goTo(x.dataset.id); }; });
    window.scrollTo(0, 0);
  }
  $('goStats').onclick = showStats;

  // ================================================================ 設定
  var CFG = ld('cfc-cfg', {});
  var cfg = $('cfg');
  function applyCfg() {
    var de = document.documentElement;
    de.style.setProperty('--fz', CFG.fz || 1);
    var th = CFG.th || 'light';
    if (th === 'auto') th = window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    de.setAttribute('data-theme', th);
    var mt = document.querySelector('meta[name="theme-color"]'); if (mt) mt.content = th === 'dark' ? '#0f1420' : '#13254a';
  }
  if (window.matchMedia) { var mq = matchMedia('(prefers-color-scheme: dark)'); if (mq.addEventListener) mq.addEventListener('change', applyCfg); }
  applyCfg();
  function openCfg() {
    var f = String(CFG.fz || 1), th = CFG.th || 'light';
    Array.prototype.forEach.call(cfg.querySelectorAll('input[name="fz"]'), function (x) { x.checked = x.value === f; });
    Array.prototype.forEach.call(cfg.querySelectorAll('input[name="th"]'), function (x) { x.checked = x.value === th; });
    $('expBox').hidden = true; $('impBox').hidden = true; $('impMsg').textContent = '';
    var sw = $('swState');
    sw.textContent = !('serviceWorker' in navigator) ? 'この端末のブラウザはオフライン表示に対応していません．' :
      navigator.serviceWorker.controller ? '✓ オフラインでも使える状態です．' : 'オフライン用の準備中です（もう一度開くと有効になります）．';
    var ps = $('psState');
    ps.textContent = '';
    try {
      if (navigator.storage && navigator.storage.persisted) navigator.storage.persisted().then(function (p) {
        ps.textContent = p ? '✓ この端末の記録は「消されにくい保存」になっています．' :
          (isIOS() && !standalone() ? 'Safari では，しばらく開かないと記録が消えることがあります．ホーム画面に追加して使うか，ときどき書き出しておいてください．' :
            'ブラウザの判断で記録が消えることがまれにあります．ときどき書き出しておくと安心です．');
      });
    } catch (e) {}
    var bk = null; try { bk = JSON.parse(localStorage.getItem('cfc-bak') || 'null'); } catch (e) {}
    var ub = $('undoBtn');
    if (bk && bk.d) { var dt = new Date(bk.t); ub.hidden = false; ub.textContent = '「' + bk.why + '」の前の記録に戻す（' + (dt.getMonth() + 1) + '/' + dt.getDate() + ' ' + dt.getHours() + ':' + ('0' + dt.getMinutes()).slice(-2) + '）'; }
    else ub.hidden = true;
    cfg.classList.add('on');
  }
  $('goCfg').onclick = openCfg;
  function isIOS() { return /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); }
  function standalone() { return (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true; }
  function syncNick() { var x = $('nick'); if (x) x.value = PROF.nick || ''; }
  syncNick();
  $('nick').addEventListener('change', function () {
    var v = this.value.replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 12);
    this.value = v; if (v) PROF.nick = v; else delete PROF.nick; sv('cfc-prof', PROF);
    toast(v ? 'ニックネームを「' + v + '」にしました' : 'ニックネームを消しました');
  });
  $('cfgClose').onclick = function () { cfg.classList.remove('on'); };
  cfg.addEventListener('click', function (e) { if (e.target === cfg) cfg.classList.remove('on'); });
  cfg.addEventListener('change', function (e) {
    if (e.target.name === 'fz') { CFG.fz = +e.target.value; sv('cfc-cfg', CFG); applyCfg(); }
    if (e.target.name === 'th') { CFG.th = e.target.value; sv('cfc-cfg', CFG); applyCfg(); }
  });
  // ---------------------------------------------------------------- 記録の引き継ぎ
  function b64u(bytes) {
    var s = '', CH2 = 0x8000;
    for (var i = 0; i < bytes.length; i += CH2) s += String.fromCharCode.apply(null, bytes.subarray(i, i + CH2));
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function unb64u(t) {
    t = t.replace(/-/g, '+').replace(/_/g, '/'); while (t.length % 4) t += '=';
    var s = atob(t), u = new Uint8Array(s.length); for (var i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u;
  }
  function streamBytes(bytes, ts) {
    return new Response(new Blob([bytes]).stream().pipeThrough(ts)).arrayBuffer().then(function (b) { return new Uint8Array(b); });
  }
  function payload() { return JSON.stringify({ v: 1, m: marks, s: ST, q: QW, r: RV, c: CT, p: PROF }); }
  function encode() {
    var u = new TextEncoder().encode(payload());
    if (window.CompressionStream) {
      try { return streamBytes(u, new CompressionStream('deflate-raw')).then(function (z) { return 'C1.' + b64u(z); }); } catch (e) {}
    }
    return Promise.resolve('J1.' + b64u(u));
  }
  function decode(code) {
    code = (code || '').trim();
    var m = code.match(/#import=(.+)$/); if (m) code = decodeURIComponent(m[1]);
    if (code.charAt(0) === '{') return Promise.resolve(JSON.parse(code));
    var p = code.slice(0, 3), body = code.slice(3).replace(/\s+/g, '');
    if (p === 'J1.') return Promise.resolve(JSON.parse(new TextDecoder().decode(unb64u(body))));
    if (p === 'C1.') {
      if (!window.DecompressionStream) return Promise.reject(new Error('このブラウザではコードを読めません．ファイルで移してください．'));
      return streamBytes(unb64u(body), new DecompressionStream('deflate-raw')).then(function (u) { return JSON.parse(new TextDecoder().decode(u)); });
    }
    return Promise.reject(new Error('コードの形式が正しくありません'));
  }
  var lastCode = '';
  $('expBtn').onclick = function () {
    encode().then(function (code) {
      lastCode = code;
      CFG.exp = today(); sv('cfc-cfg', CFG); updBackupNote();
      $('expBox').hidden = false; $('impBox').hidden = true;
      $('expCode').value = code;
      var url = location.origin + location.pathname + '#import=' + code;
      var q = $('expQR'); q.innerHTML = '';
      var n = Object.keys(marks).length, ns = Object.keys(ST).length;
      var note = '問題 ' + n + ' 問・記述 ' + ns + ' 個の記録（' + code.length + ' 文字）．';
      if (window.qrcode && url.length <= 1600) {
        try {
          var qr = qrcode(0, 'L'); qr.addData(url); qr.make();
          var cell = Math.max(2, Math.floor(240 / (qr.getModuleCount() + 8)));
          q.innerHTML = qr.createImgTag(cell, cell * 4, '記録の引き継ぎ用QRコード');
          note += 'QRコードを別の端末のカメラで読み取ると，そのまま読み込み画面が開きます．';
        } catch (e) { note += '記録が多いため QRコードは作れません．コードかファイルで移してください．'; }
      } else note += window.qrcode ? '記録が多いため QRコードは作れません．コードのコピーかファイルで移してください．' : '';
      $('expNote').textContent = note;
      $('expShare').hidden = !navigator.share;
    });
  };
  $('expCopy').onclick = function () {
    var ta = $('expCode');
    (navigator.clipboard ? navigator.clipboard.writeText(lastCode) : Promise.reject()).then(function () { toast('コピーしました'); }, function () {
      ta.focus(); ta.select(); try { document.execCommand('copy'); toast('コピーしました'); } catch (e) { toast('選択してコピーしてください'); }
    });
  };
  function fname() { var d = new Date(); return 'kagaku-fc-' + d.getFullYear() + ('0' + (d.getMonth() + 1)).slice(-2) + ('0' + d.getDate()).slice(-2) + '.json'; }
  $('expFile').onclick = function () {
    CFG.exp = today(); sv('cfc-cfg', CFG); updBackupNote();
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([payload()], { type: 'application/json' }));
    a.download = fname(); document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  };
  $('expShare').onclick = function () {
    var url = location.origin + location.pathname + '#import=' + lastCode;
    navigator.share({ title: '化学ファイナルチェックの記録', text: '化学ファイナルチェックの記録を読み込むリンク', url: url }).catch(function () {});
  };
  function openImport(code) {
    $('impBox').hidden = false; $('expBox').hidden = true;
    $('impCode').value = code || ''; $('impMsg').textContent = '';
    if (code) $('impMsg').textContent = '「読み込む」を押すと記録を取り込みます．';
    $('impMsg').className = 'msg';
  }
  $('impOpen').onclick = function () { openImport(''); };
  // 読み込んだ記録の検証：存在する問題・記述の記録だけを，正しい形で受け取る
  function own(o, k) { return Object.prototype.hasOwnProperty.call(o, k); }
  function nat(x, max) { return typeof x === 'number' && isFinite(x) && x >= 0 && x <= (max || 1e7) && Math.floor(x) === x; }
  function isObj(x) { return x && typeof x === 'object' && !Array.isArray(x); }
  function cleanImport(d) {
    if (!isObj(d) || !isObj(d.m)) throw new Error('記録の形式が正しくありません');
    var o = { m: {}, s: {}, q: {}, r: {}, c: null, p: null }, bad = 0;
    Object.keys(d.m).forEach(function (k) { if (own(BYID, k) && (d.m[k] === 'y' || d.m[k] === 'n')) o.m[k] = d.m[k]; else bad++; });
    if (isObj(d.s)) Object.keys(d.s).forEach(function (k) {
      var v = d.s[k];
      if (own(SBY, k) && Array.isArray(v) && v.length === 3 && nat(v[0]) && nat(v[1]) && nat(v[2], 1e6)) o.s[k] = [v[0], v[1], v[2]]; else bad++;
    });
    if (isObj(d.q)) Object.keys(d.q).forEach(function (k) {
      var v = d.q[k];
      if (own(BYID, k) && Array.isArray(v) && v.length === 3 && nat(v[0]) && nat(v[1]) && nat(v[2], 1e6)) o.q[k] = [v[0], v[1], v[2]]; else bad++;
    });
    if (isObj(d.r)) Object.keys(d.r).forEach(function (k) {
      var v = d.r[k], ok = (k.slice(0, 2) === 's:' && own(SBY, k.slice(2))) || (k.slice(0, 2) === 'q:' && own(BYID, k.slice(2)));
      if (ok && Array.isArray(v) && v.length === 2 && nat(v[0], INT.length - 1) && nat(v[1], 1e6)) o.r[k] = [v[0], v[1]]; else bad++;
    });
    if (isObj(d.c) && nat(d.c.n) && nat(d.c.c) && d.c.c <= d.c.n) {
      o.c = { n: d.c.n, c: d.c.c, wk: {} };
      if (isObj(d.c.wk)) Object.keys(d.c.wk).forEach(function (k) {
        var v = d.c.wk[k];
        if (/^\d{1,7}$/.test(k) && Array.isArray(v) && v.length === 2 && nat(v[0]) && nat(v[1]) && v[1] <= v[0]) o.c.wk[k] = [v[0], v[1]];
      });
    }
    if (isObj(d.p) && typeof d.p.id === 'string' && /^p[a-z0-9]{6,40}$/.test(d.p.id)) {
      o.p = { id: d.p.id };
      if (typeof d.p.nick === 'string') { var nk = d.p.nick.replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 12); if (nk) o.p.nick = nk; }
    }
    o.bad = bad;
    return o;
  }
  // 読み込み・消去の直前の記録を１世代だけ控えておく（「元に戻す」用）
  function keepBackup(why) {
    try { localStorage.setItem('cfc-bak', JSON.stringify({ t: Date.now(), why: why, d: JSON.parse(payload()) })); } catch (e) {}
  }
  function applyImport(d, mode) {
    d = cleanImport(d);
    keepBackup(mode === 'replace' ? '記録の置き換え' : '記録の読み込み');
    if (d.p && d.p.id) { PROF.id = d.p.id; if (d.p.nick) PROF.nick = d.p.nick; sv('cfc-prof', PROF); }   // 同じ人として連携
    if (mode === 'replace') { marks = d.m || {}; ST = d.s || {}; QW = d.q || {}; RV = d.r || {}; if (d.c) CT = d.c; }
    else {
      Object.keys(d.m || {}).forEach(function (k) { if (!marks[k]) marks[k] = d.m[k]; });
      Object.keys(d.s || {}).forEach(function (k) {
        var a = ST[k], b = d.s[k]; ST[k] = a ? [Math.max(a[0], b[0]), Math.max(a[1], b[1]), Math.max(a[2], b[2])] : b;
      });
      Object.keys(d.q || {}).forEach(function (k) {
        var a = QW[k], b = d.q[k]; QW[k] = a ? [Math.max(a[0], b[0]), Math.max(a[1], b[1]), Math.max(a[2], b[2])] : b;
      });
      Object.keys(d.r || {}).forEach(function (k) { var a = RV[k], b = d.r[k]; if (!a || b[1] < a[1]) RV[k] = b; });
      if (d.c) {
        if (d.c.n > CT.n) { CT.n = d.c.n; CT.c = d.c.c; }
        Object.keys(d.c.wk || {}).forEach(function (k) { var a = CT.wk[k], b = d.c.wk[k]; if (!a || b[0] > a[0]) CT.wk[k] = b; });
      }
    }
    save(); sv('cfc-st', ST); sv('cfc-qw', QW); sv('cfc-rv', RV); sv('cfc-ct', CT); syncNick();
    return d;
  }
  $('impGo').onclick = function () {
    var mode = (cfg.querySelector('input[name="impm"]:checked') || {}).value;
    var msg = $('impMsg');
    var raw = $('impCode').value;
    if (raw.length > 3e6) { msg.className = 'msg err'; msg.textContent = '読み込めませんでした：データが大きすぎます'; return; }
    decode(raw).then(function (d) {
      if (mode === 'replace' && !confirm('この端末の記録を，読み込んだ記録で置き換えます．よろしいですか？')) return;
      var r = applyImport(d, mode);
      msg.className = 'msg'; msg.textContent = '✓ 読み込みました（問題 ' + Object.keys(r.m).length + ' 問・記述 ' + Object.keys(r.s).length + ' 個' + (r.bad ? '．使えないデータ ' + r.bad + ' 件は読み飛ばしました' : '') + '）';
      if (!ses) render(true); updRev();
    }).catch(function (e) { msg.className = 'msg err'; msg.textContent = '読み込めませんでした：' + (e && e.message || e); });
  };
  $('impFile').onchange = function (e) {
    var f = e.target.files[0]; if (!f) return;
    f.text().then(function (t) { $('impCode').value = t.trim(); $('impGo').onclick(); });
    e.target.value = '';
  };
  $('undoBtn').onclick = function () {
    var bk = null; try { bk = JSON.parse(localStorage.getItem('cfc-bak') || 'null'); } catch (e) {}
    if (!bk || !bk.d) return;
    if (!confirm('「' + bk.why + '」の前の記録に戻します．よろしいですか？')) return;
    var d = cleanImport(bk.d);
    marks = d.m; ST = d.s; QW = d.q; RV = d.r; CT = d.c || { n: 0, c: 0, wk: {} };
    save(); sv('cfc-st', ST); sv('cfc-qw', QW); sv('cfc-rv', RV); sv('cfc-ct', CT);
    try { localStorage.removeItem('cfc-bak'); } catch (e) {}
    cfg.classList.remove('on'); if (!ses) render(true); updRev(); toast('記録を元に戻しました');
  };
  $('resetAll').onclick = function () {
    if (!confirm('この端末の記録（○×・記述の成績・復習の予定）をすべて消します．元に戻せません．よろしいですか？')) return;
    keepBackup('記録の消去');
    marks = {}; ST = {}; QW = {}; RV = {}; CT = { n: 0, c: 0, wk: {} }; save(); sv('cfc-st', ST); sv('cfc-qw', QW); sv('cfc-rv', RV); sv('cfc-ct', CT);
    cfg.classList.remove('on'); render(); updRev(); toast('記録を消しました');
  };

  // ================================================================ オフライン
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () {}); });
  }

  // ---------------------------------------------------------------- 検索ボタン（章タブの下）
  $('goSearch').onclick = function () {
    var sec = document.querySelector('.srch'), q = $('qbox');
    window.scrollTo({ top: sec.getBoundingClientRect().top + window.pageYOffset - 12, behavior: 'smooth' });
    try { q.focus({ preventScroll: true }); } catch (e) { q.focus(); }
  };
  // ================================================================ コース切り替え
  (function setupCourse() {
    Array.prototype.forEach.call(document.querySelectorAll('label[data-ch]'), function (l) {
      if (!chIn(+l.dataset.ch)) { l.hidden = true; var x = l.querySelector('input'); if (x) x.checked = false; }
    });
    Array.prototype.forEach.call(document.querySelectorAll('#course button'), function (b) {
      b.classList.toggle('on', b.dataset.c === COURSE);
      b.onclick = function () {
        if (b.dataset.c === COURSE) return;
        var c = ld('cfc-cfg', {}); c.course = b.dataset.c; sv('cfc-cfg', c);
        history.replaceState(null, '', location.pathname + location.search + '#ch1');
        location.reload();
      };
    });
    document.body.classList.toggle('kiso', COURSE === 'kiso');
    var n = $('nAll'); if (n) n.textContent = D.filter(inC).length;
  })();
  // 書き出しのすすめ：記録が増えてきて，しばらく書き出していないとき
  function updBackupNote() {
    var b = $('bkNote'); if (!b) return;
    var t = today(), since = CFG.exp ? t - CFG.exp : null;
    var need = CT.n >= 30 && (since === null || since >= 14) && !(CFG.snooze && CFG.snooze > t);
    b.hidden = !need;
    if (need) $('bkText').textContent = (since === null ? 'まだ一度も記録を書き出していません．' : '最後に書き出してから ' + since + ' 日たっています．') +
      (isIOS() && !standalone() ? 'Safari ではしばらく開かないと記録が消えることがあるので，書き出しておくか，ホーム画面に追加して使うのがおすすめです．' : '端末の故障や機種変更に備えて，ときどき書き出しておくと安心です．');
  }
  $('bkGo').onclick = function () { openCfg(); $('expBtn').click(); };
  $('bkLater').onclick = function () { CFG.snooze = today() + 7; sv('cfc-cfg', CFG); updBackupNote(); };
  updBackupNote();
  fromHash();
  render();
  updRev();
  function checkImport() {
    if (!/^#import=/.test(location.hash)) return;
    var code = decodeURIComponent(location.hash.slice(8));
    history.replaceState(null, '', location.pathname + location.search);
    openCfg(); openImport(code);
  }
  checkImport();
})();
