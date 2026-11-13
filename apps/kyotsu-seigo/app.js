/* 化学ファイナルチェックお試し：過去問 正誤問題（記述ごとの○×判定・演習モード） */
(function () {
  'use strict';
  var CH = ['物質の状態と構造', '物質の変化と平衡', '無機物質', '有機化合物', '天然有機化合物と高分子化合物', '化学基礎'];
  var D = window.CFC_DATA;
  var BYID = {};
  D.forEach(function (it) { BYID[it.id] = it; });

  // ---------------------------------------------------------------- 保存
  var marks = {};
  try { marks = JSON.parse(localStorage.getItem('cfc-marks') || '{}') || {}; } catch (e) { marks = {}; }
  function save() { try { localStorage.setItem('cfc-marks', JSON.stringify(marks)); } catch (e) {} }
  function setMark(id, v) { if (v) marks[id] = v; else delete marks[id]; save(); }

  // ---------------------------------------------------------------- 数式
  function typeset(root) {
    if (!window.katex) return;
    var els = root.querySelectorAll('span.m:not(.done)');
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      var tex = el.textContent;
      try {
        katex.render(tex, el, { displayMode: el.classList.contains('d'), throwOnError: false, strict: 'ignore' });
      } catch (e) { el.textContent = tex; }
      el.classList.add('done');
    }
  }

  // ---------------------------------------------------------------- ブロック → HTML
  function fig(b) {
    var ar = (1 / b.ar).toFixed(4);
    if (b.inline) return '<img class="ifig" loading="lazy" src="' + b.src + '" style="width:' + b.w + '%;aspect-ratio:' + ar + '" alt="図">';
    return '<div class="figw"><img class="fig" loading="lazy" src="' + b.src + '" style="width:' + b.w + '%;aspect-ratio:' + ar + '" alt="図"></div>';
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
    var hint = it.ns ? '<div class="hint">各記述が正しければ ○，誤りを含めば × をタップしてから答え合わせ（省略して解答を見ることもできます）</div>' : '';
    el.innerHTML =
      '<div class="meta">' + metaHTML(it) + markHTML(it.id) + '</div>' +
      hint +
      '<div class="pb">' + blocks(it.P) + panel + '</div>' +
      '<div class="orig"><button type="button" class="ob">' + (it.perm ? '紙面で見る（元の番号）' : '紙面で見る') + '</button><img class="img" alt="紙面（問題）" data-src="' + it.pi + '" style="aspect-ratio:' + (1 / it.par).toFixed(4) + '"></div>' +
      '<button type="button" class="reveal">' + (it.ns ? '答え合わせ' : '解答を見る') + '</button>' +
      '<div class="ansbox">' +
      '<div class="res"></div>' +
      '<div class="ansline"><span class="lbl">正解</span><span class="v">' + it.a + '</span></div>' +
      '<div class="kb">' + blocks(it.K) + '</div>' +
      '<div class="orig k"><button type="button" class="ob">' + (it.perm ? '解説を紙面で見る（元の番号）' : '解説を紙面で見る') + '</button><img class="img" alt="紙面（解説）" data-src="' + it.ki + '" style="aspect-ratio:' + (1 / it.kar).toFixed(4) + '"></div>' +
      '<div class="self"><button type="button" class="y">○ できた</button><button type="button" class="n">× まちがえた</button></div>' +
      '<div class="after"></div>' +
      '</div>';
    typeset(el);

    var pick = {};          // 記述番号 → 0/1
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
    y.onclick = function () { setMark(it.id, marks[it.id] === 'y' ? null : 'y'); syncMark(); };
    n.onclick = function () { setMark(it.id, marks[it.id] === 'n' ? null : 'n'); syncMark(); };
    syncMark();

    function open() {
      opened = true;
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
        }
      });
      var res = el.querySelector('.res');
      var mark = null;
      if (judged) {
        res.innerHTML = '記述の判定：<b>' + right + '</b> / ' + total + ' 正解' + (judged < total ? '（' + (total - judged) + ' 個は未判定）' : '');
        res.className = 'res ' + (right === total ? 'ok' : 'ng');
        if (judged === total) {
          mark = right === total ? 'y' : 'n';
          setMark(it.id, mark);
          syncMark();
          res.innerHTML += '<span class="auto">　→ ' + (mark === 'y' ? '○' : '×') + ' で記録しました</span>';
        }
      } else {
        res.innerHTML = ''; res.className = 'res';
      }
      rb.textContent = 'もう一度解く';
      if (opts.onDone) opts.onDone({ id: it.id, judged: judged, right: right, total: total, mark: mark });
    }
    function reset() {
      opened = false;
      el.classList.remove('open');
      pick = {};
      Array.prototype.forEach.call(jgs, function (g) {
        g.classList.remove('shown', 'ok', 'ng');
        Array.prototype.forEach.call(g.querySelectorAll('.jb'), function (x) { x.classList.remove('on'); });
      });
      rb.textContent = it.ns ? '答え合わせ' : '解答を見る';
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
  var ch = 1, flt = 'all';
  var M = document.getElementById('main');
  var tabs = document.getElementById('tabs');
  CH.forEach(function (t, i) {
    var b = document.createElement('button');
    b.className = 'tab'; b.textContent = (i + 1) + '. ' + t;
    b.onclick = function () { location.hash = 'ch' + (i + 1); };
    tabs.appendChild(b);
  });
  Array.prototype.forEach.call(document.querySelectorAll('.chip'), function (c) {
    c.onclick = function () {
      flt = c.dataset.f;
      Array.prototype.forEach.call(document.querySelectorAll('.chip'), function (x) { x.classList.toggle('on', x === c); });
      render();
    };
  });
  function pass(it, f) {
    return f === 'all' || (f === 'kyotsu' && !it.c) || (f === 'center' && it.c) || (f === 'ng' && marks[it.id] === 'n') ||
      (f === 'un' && !marks[it.id]) || (f === 'ngun' && marks[it.id] !== 'y');
  }
  function stat() {
    var all = D.filter(function (it) { return it.ch === ch; });
    var ok = all.filter(function (it) { return marks[it.id] === 'y'; }).length;
    var ng = all.filter(function (it) { return marks[it.id] === 'n'; }).length;
    document.getElementById('stat').textContent = '○' + ok + '　×' + ng + '　／' + all.length + '問';
  }
  function fromHash() { var m = (location.hash || '').match(/^#ch([1-6])$/); ch = m ? +m[1] : 1; }
  function render() {
    document.body.classList.remove('running');
    Array.prototype.forEach.call(document.querySelectorAll('.tab'), function (t, i) { t.classList.toggle('on', i + 1 === ch); });
    M.innerHTML = '';
    var h = document.createElement('div'); h.className = 'chtitle'; h.textContent = '第' + ch + '章　' + CH[ch - 1]; M.appendChild(h);
    var L = D.filter(function (it) { return it.ch === ch && pass(it, flt); });
    if (!L.length) { var e = document.createElement('div'); e.className = 'empty'; e.textContent = '該当する問題はありません'; M.appendChild(e); }
    var g = null;
    L.forEach(function (it) {
      var gg = it.c ? 'センター試験' : '共通テスト';
      if (gg !== g) { g = gg; var d = document.createElement('div'); d.className = 'grp'; d.textContent = gg; M.appendChild(d); }
      M.appendChild(card(it, { onMark: stat }));
    });
    stat();
  }
  window.addEventListener('hashchange', function () { if (run) return; fromHash(); render(); window.scrollTo(0, 0); });
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
    run = { ids: ids, k: 0, res: {}, per: per, left: per ? per * ids.length : 0, over: false, sh: val('chs') !== 'keep' };
    document.body.classList.add('running');
    clearInterval(timerId);
    if (per) timerId = setInterval(tick, 1000);
    showRun();
  }
  function fmt(s) { var m = Math.floor(s / 60), x = s % 60; return m + ':' + (x < 10 ? '0' : '') + x; }
  function tick() {
    if (!run) return;
    run.left--;
    var t = document.getElementById('rtime');
    if (t) { t.textContent = '⏱ ' + fmt(Math.max(0, run.left)); t.classList.toggle('warn', run.left <= 60); }
    if (run.left <= 0) { clearInterval(timerId); run.over = true; showResult(); }
  }
  function runBar() {
    return '<div class="rbar"><span class="rpos">' + (run.k + 1) + ' / ' + run.ids.length + '</span>' +
      '<span class="rprog"><i style="width:' + (100 * run.k / run.ids.length) + '%"></i></span>' +
      (run.per ? '<span class="rtime" id="rtime">⏱ ' + fmt(run.left) + '</span>' : '') +
      '<button type="button" class="rquit" id="rquit">終了</button></div>';
  }
  function showRun() {
    var id = run.ids[run.k], it = run.sh ? permItem(BYID[id]) : BYID[id];
    M.innerHTML = runBar();
    var c = card(it, {
      onDone: function (r) { run.res[id] = r; nextBtn(c); },
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
    var ids = run.ids, ok = 0, ng = 0, un = 0, sr = 0, st = 0;
    var rows = ids.map(function (id, i) {
      var it = BYID[id], r = run.res[id];
      var m = r ? (r.mark || marks[id] || null) : null;
      if (r && r.judged) { sr += r.right; st += r.total; }
      if (!r) un++; else if (m === 'y') ok++; else if (m === 'n') ng++; else un++;
      var ic = !r ? '<span class="ri un">－</span>' : m === 'y' ? '<span class="ri ok">○</span>' : m === 'n' ? '<span class="ri ng">×</span>' : '<span class="ri un">？</span>';
      var det = r && r.judged ? '<span class="rd">記述 ' + r.right + '/' + r.total + '</span>' : '';
      return '<li data-id="' + id + '">' + ic + '<span class="rm">' + metaHTML(it) + '</span>' + det + '</li>';
    }).join('');
    var wrong = ids.filter(function (id) { var r = run.res[id]; return !r || (r.mark || marks[id]) !== 'y'; });
    M.innerHTML = '<div class="result"><h2>結果' + (run.over ? '（時間切れ）' : '') + '</h2>' +
      '<div class="score"><b>' + ok + '</b> / ' + ids.length + ' 問 正解</div>' +
      (st ? '<div class="sub">記述ごとの判定：' + sr + ' / ' + st + '（' + Math.round(100 * sr / st) + '%）</div>' : '') +
      '<div class="sub">○ ' + ok + '　× ' + ng + '　未解答・未記録 ' + un + '</div>' +
      '<ul class="rlist">' + rows + '</ul>' +
      '<div class="rbtns">' + (wrong.length ? '<button type="button" id="again">○以外の ' + wrong.length + ' 問をもう一度</button>' : '') +
      '<button type="button" id="back" class="sec">一覧に戻る</button></div></div>';
    typeset(M);
    var per = run.per;
    if (wrong.length) document.getElementById('again').onclick = function () { startRun(wrong.slice(), per); };
    document.getElementById('back').onclick = function () { run = null; fromHash(); render(); window.scrollTo(0, 0); };
    Array.prototype.forEach.call(M.querySelectorAll('.rlist li'), function (li) {
      li.onclick = function () {
        var id = li.dataset.id, it = BYID[id];
        run = null; ch = it.ch;
        if (location.hash !== '#ch' + ch) history.replaceState(null, '', '#ch' + ch);
        flt = 'all';
        Array.prototype.forEach.call(document.querySelectorAll('.chip'), function (x) { x.classList.toggle('on', x.dataset.f === 'all'); });
        render();
        var el = document.getElementById('q-' + id); if (el) el.scrollIntoView();
      };
    });
    window.scrollTo(0, 0);
  }

  fromHash();
  render();
})();
