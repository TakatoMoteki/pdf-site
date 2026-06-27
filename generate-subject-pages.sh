#!/bin/bash
SITE_DIR="$(cd "$(dirname "$0")" && pwd)"
PDFS_DIR="$SITE_DIR/pdfs"
SITE_URL="https://takatomoteki.github.io/pdf-site"

get_hash() {
  case "$1" in
    "物理") echo "47d662997d0dde2569663e46e3346b6f71f82a297ae6507fcb525ac5112a39c7" ;;
    "化学") echo "94680fd24bf04a3e411f3772c611057d39a3f67999858aa768fb927225542300" ;;
    *) echo "" ;;
  esac
}

human_size() {
  local bytes=$1
  if [ "$bytes" -ge 1048576 ]; then echo "$(echo "scale=1; $bytes/1048576" | bc) MB"
  elif [ "$bytes" -ge 1024 ]; then echo "$(echo "scale=0; $bytes/1024" | bc) KB"
  else echo "${bytes} B"; fi
}
file_date() {
  if stat --version 2>/dev/null | grep -q 'GNU'; then date -d "@$(stat -c %Y "$1")" "+%Y/%m/%d %H:%M"
  else stat -f "%Sm" -t "%Y/%m/%d %H:%M" "$1" 2>/dev/null; fi
}
get_bytes() {
  if stat --version 2>/dev/null | grep -q 'GNU'; then stat -c%s "$1" 2>/dev/null
  else stat -f%z "$1" 2>/dev/null; fi
}

generate_filelist() {
  local json='{"updated":"'"$(date '+%Y/%m/%d %H:%M')"'","folders":['
  local first_folder=true
  for subject_dir in "$PDFS_DIR"/*/; do
    [ -d "$subject_dir" ] || continue
    local subject=$(basename "$subject_dir")
    local total_files=0
    local subs_json=""
    local first_sub=true
    for sub_dir in "$subject_dir"*/; do
      [ -d "$sub_dir" ] || continue
      local subname=$(basename "$sub_dir")
      local files_json=""
      local first_file=true
      local sub_count=0
      for f in "$sub_dir"*.pdf "$sub_dir"*.PDF; do
        [ -f "$f" ] || continue
        local name=$(basename "$f")
        local size=$(human_size "$(get_bytes "$f")")
        local mdate=$(file_date "$f")
        [ "$first_file" = true ] && first_file=false || files_json+=","
        files_json+='{"name":"'"$name"'","size":"'"$size"'","date":"'"$mdate"'"}'
        sub_count=$((sub_count + 1))
      done
      [ "$sub_count" -eq 0 ] && continue
      total_files=$((total_files + sub_count))
      [ "$first_sub" = true ] && first_sub=false || subs_json+=","
      subs_json+='{"name":"'"$subname"'","files":['"$files_json"']}'
    done
    local root_files=""
    local first_rf=true
    for f in "$subject_dir"*.pdf "$subject_dir"*.PDF; do
      [ -f "$f" ] || continue
      local name=$(basename "$f")
      local size=$(human_size "$(get_bytes "$f")")
      local mdate=$(file_date "$f")
      [ "$first_rf" = true ] && first_rf=false || root_files+=","
      root_files+='{"name":"'"$name"'","size":"'"$size"'","date":"'"$mdate"'"}'
      total_files=$((total_files + 1))
    done
    [ "$first_folder" = true ] && first_folder=false || json+=","
    json+='{"name":"'"$subject"'","totalFiles":'"$total_files"',"subs":['"$subs_json"'],"rootFiles":['"$root_files"']}'
  done
  json+=']}'
  echo "$json" > "$SITE_DIR/filelist.json"
}

generate_filelist

# 共通CSS（テーマ変数＋方眼背景＋元素カラー）
read -r -d '' COMMON_CSS << 'CSS_END'
:root {
  --paper: #fafaf7; --surface: #ffffff; --ink: #16171f; --ink-soft: #6b6d7c;
  --grid: rgba(20,22,40,0.09); --line: #e8e6df;
  --shadow: 0 2px 12px rgba(20,22,40,0.05); --shadow-lift: 0 18px 48px rgba(20,22,40,0.14);
}
[data-theme="dark"] {
  --paper: #0d0e14; --surface: #161824; --ink: #ECECF2; --ink-soft: #8b8da3;
  --grid: rgba(180,190,255,0.085); --line: #262838;
  --shadow: 0 2px 12px rgba(0,0,0,0.3); --shadow-lift: 0 18px 48px rgba(0,0,0,0.55);
}
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  font-family: "Zen Kaku Gothic New", -apple-system, sans-serif;
  background: var(--paper); color: var(--ink); min-height: 100vh;
  background-image: linear-gradient(var(--grid) 1px, transparent 1px), linear-gradient(90deg, var(--grid) 1px, transparent 1px);
  background-size: 26px 26px; transition: background-color 0.4s, color 0.4s;
}
header {
  padding: 22px 40px; border-bottom: 1px solid var(--line); position: sticky; top: 0; z-index: 100;
  background: color-mix(in srgb, var(--paper) 80%, transparent); backdrop-filter: blur(12px);
  display: flex; align-items: flex-start; justify-content: space-between;
}
.nav { font-family: "JetBrains Mono", monospace; font-size: 12px; color: var(--ink-soft); margin-bottom: 10px; display: flex; gap: 8px; align-items: center; }
.nav a { color: var(--accent); text-decoration: none; }
.nav a:hover { text-decoration: underline; }
.title-row { display: flex; align-items: center; gap: 14px; }
.title-symbol { font-family: "Space Grotesk", sans-serif; font-size: 34px; font-weight: 700; color: var(--accent); line-height: 1; letter-spacing: -0.03em; }
header h1 { font-family: "Space Grotesk", "Zen Kaku Gothic New", sans-serif; font-size: 24px; font-weight: 700; letter-spacing: -0.01em; }
header .meta { font-family: "JetBrains Mono", monospace; font-size: 11px; color: var(--ink-soft); margin-top: 6px; }
.theme-toggle { width: 44px; height: 44px; border-radius: 13px; border: 1px solid var(--line); background: var(--surface); cursor: pointer; font-size: 18px; display: flex; align-items: center; justify-content: center; transition: transform 0.2s; flex-shrink: 0; }
.theme-toggle:hover { transform: rotate(-12deg) scale(1.06); }
.container { max-width: 860px; margin: 0 auto; padding: 48px 32px 80px; }
.empty { padding: 80px; text-align: center; color: var(--ink-soft); }
@media (prefers-reduced-motion: reduce) { * { transition: none !important; } }
/* ── effects ── */
@keyframes fadeUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeDown{from{opacity:0;transform:translateY(-12px)}to{opacity:1;transform:translateY(0)}}
@keyframes symPulse{0%,100%{opacity:1}50%{opacity:.78}}
@keyframes spin{to{transform:rotate(360deg)}}
header{animation:fadeDown .9s cubic-bezier(.2,.8,.2,1) both}
.cat-card,.pdf-item{animation:fadeUp .9s cubic-bezier(.2,.8,.2,1) both}
.cat-card:nth-child(1),.pdf-item:nth-child(1){animation-delay:.12s}
.cat-card:nth-child(2),.pdf-item:nth-child(2){animation-delay:.24s}
.cat-card:nth-child(3),.pdf-item:nth-child(3){animation-delay:.36s}
.cat-card:nth-child(4),.pdf-item:nth-child(4){animation-delay:.48s}
.cat-card:nth-child(5),.pdf-item:nth-child(5){animation-delay:.6s}
.cat-card:nth-child(6),.pdf-item:nth-child(6){animation-delay:.72s}
.cat-card:nth-child(7),.pdf-item:nth-child(7){animation-delay:.84s}
.cat-card:nth-child(n+8),.pdf-item:nth-child(n+8){animation-delay:.96s}
.cat-card:hover,.pdf-item:hover{box-shadow:var(--shadow-lift),0 0 0 1px var(--accent),0 0 30px -6px var(--accent)}
.title-symbol{text-shadow:0 0 22px var(--accent),0 0 3px var(--accent);animation:symPulse 4.5s ease-in-out infinite}
.spinner{display:inline-block;width:32px;height:32px;border:3px solid var(--line);border-top-color:var(--accent);border-radius:50%;animation:spin .8s linear infinite}
@media (prefers-reduced-motion: reduce){header,.cat-card,.pdf-item,.title-symbol,.spinner{animation:none!important}}
CSS_END

# 共通テーマJS
read -r -d '' THEME_JS << 'JS_END'
function applyTheme(t){document.documentElement.setAttribute('data-theme',t);var b=document.getElementById('theme-toggle');if(b)b.textContent=t==='dark'?'☀️':'🌙';localStorage.setItem('pdf-site-theme',t);}
applyTheme(localStorage.getItem('pdf-site-theme')||(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'));
var _tt=document.getElementById('theme-toggle');if(_tt)_tt.addEventListener('click',function(){applyTheme(document.documentElement.getAttribute('data-theme')==='dark'?'light':'dark');});
JS_END

for subject_dir in "$PDFS_DIR"/*/; do
  [ -d "$subject_dir" ] || continue
  subject="$(basename "$subject_dir")"
  hash="$(get_hash "$subject")"
  mkdir -p "$SITE_DIR/$subject"

  # 科目別カラー＆シンボル
  if [ "$subject" = "物理" ]; then
    accent_l="#2d5fd6"; accent_d="#6f9bff"; soft_l="rgba(45,95,214,0.08)"; soft_d="rgba(111,155,255,0.12)"; symbol="Phys"
  else
    accent_l="#d6452f"; accent_d="#ff7a64"; soft_l="rgba(214,69,47,0.08)"; soft_d="rgba(255,122,100,0.12)"; symbol="Chem"
  fi

  # 科目別の外部リンク（カテゴリ一覧の先頭にカードとして表示）
  # 化学のお試しアプリ（静的Webエクスポート）。同一オリジン /pdf-site/apps/<id>/ に配置。
  if [ "$subject" = "化学" ]; then
    EXTRA_LINKS_JS='[{name:"お試しむき",desc:"アプリ体験版",url:"../apps/muki/"},{name:"お試しゆーき",desc:"アプリ体験版",url:"../apps/yuuki/"}]'
  else
    EXTRA_LINKS_JS='[]'
  fi

  ACCENT_CSS=":root{--accent:${accent_l};--accent-soft:${soft_l};}[data-theme=\"dark\"]{--accent:${accent_d};--accent-soft:${soft_d};}"
  if [ "$subject" = "物理" ]; then slug="phys"; else slug="chem"; fi
  BG_CSS="body{background:transparent !important;}body::before{content:'';position:fixed;inset:0;z-index:-2;background-position:center;background-size:cover;background-repeat:no-repeat;}html[data-theme=\"light\"] body::before{background-image:url('${SITE_URL}/assets/${slug}-bg-l.jpg');}html[data-theme=\"dark\"] body::before{background-image:url('${SITE_URL}/assets/${slug}-bg-d.jpg');}body::after{content:'';position:fixed;inset:0;z-index:-1;}html[data-theme=\"light\"] body::after{background:rgba(255,255,255,0.38);}html[data-theme=\"dark\"] body::after{background:rgba(7,8,18,0.74);}html[data-theme=\"light\"]{--surface:rgba(255,255,255,0.78);}html[data-theme=\"dark\"]{--surface:rgba(22,24,42,0.10);--line:rgba(255,255,255,0.14);}header{-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);}.pdf-item,.cat-card{-webkit-backdrop-filter:blur(30px);backdrop-filter:blur(30px);}html[data-theme=\"light\"] .pdf-item,html[data-theme=\"light\"] .cat-card{border:1px solid rgba(20,22,40,0.18);box-shadow:0 4px 16px rgba(20,22,40,0.14);}html[data-theme=\"dark\"] .pdf-item,html[data-theme=\"dark\"] .cat-card{border:1px solid rgba(255,255,255,0.16);box-shadow:0 6px 20px rgba(0,0,0,0.45);}"

  PW_CHECK='var PW_KEY="pw_'"$subject"'";function checkAuth(){if(sessionStorage.getItem(PW_KEY)!=="ok"){location.href="../";return false;}return true;}'

  # ── サブカテゴリページ（PDF一覧）──
  for sub_dir in "$subject_dir"*/; do
    [ -d "$sub_dir" ] || continue
    subname="$(basename "$sub_dir")"
    pdf_count=0
    for f in "$sub_dir"*.pdf "$sub_dir"*.PDF; do
      [ -f "$f" ] && pdf_count=$((pdf_count + 1))
    done
    [ "$pdf_count" -eq 0 ] && continue
    mkdir -p "$SITE_DIR/$subject/$subname"

    cat > "$SITE_DIR/$subject/$subname/index.html" << SUBEOF
<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="theme-color" content="#fafaf7" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0d0e14" media="(prefers-color-scheme: dark)">
<title>${subname} — ${subject}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Zen+Kaku+Gothic+New:wght@400;500;700;900&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
<style>
${COMMON_CSS}
${ACCENT_CSS}
${BG_CSS}
${BG_CSS}
.pdf-list{display:flex;flex-direction:column;gap:12px}
.pdf-item{background:var(--surface);border:1px solid var(--line);border-radius:16px;padding:18px 22px;display:flex;align-items:center;justify-content:space-between;gap:16px;box-shadow:var(--shadow);transition:transform 0.2s,box-shadow 0.2s,border-color 0.2s}
.pdf-item:hover{transform:translateY(-2px);box-shadow:var(--shadow-lift);border-color:var(--accent)}
.pdf-info{display:flex;align-items:center;gap:16px;min-width:0;flex:1}
.pdf-mark{width:44px;height:44px;border-radius:11px;background:var(--accent-soft);color:var(--accent);display:flex;align-items:center;justify-content:center;font-family:"Space Grotesk",monospace;font-weight:700;font-size:12px;flex-shrink:0;letter-spacing:0.02em}
.pdf-name{font-size:15px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pdf-meta{font-family:"JetBrains Mono",monospace;font-size:11px;color:var(--ink-soft);margin-top:3px}
.pdf-actions{display:flex;gap:8px;flex-shrink:0}
.btn{padding:9px 16px;border-radius:10px;border:none;font-size:13px;font-weight:600;cursor:pointer;text-decoration:none;display:inline-block;text-align:center;font-family:inherit;transition:opacity 0.2s,transform 0.1s}
.btn:active{transform:scale(0.96)}
.btn-view{background:var(--accent);color:#fff}
.btn-view:hover{opacity:0.9}
.btn-dl{background:transparent;color:var(--ink-soft);border:1px solid var(--line)}
.btn-dl:hover{border-color:var(--accent);color:var(--accent)}
.viewer-overlay{display:none;position:fixed;inset:0;background:rgba(8,9,14,0.6);z-index:200;justify-content:center;align-items:center;backdrop-filter:blur(8px)}
.viewer-overlay.active{display:flex}
.viewer{background:var(--surface);border-radius:18px;width:95vw;height:93vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:var(--shadow-lift)}
.viewer-header{display:flex;align-items:center;justify-content:space-between;padding:14px 20px;border-bottom:1px solid var(--line);flex-shrink:0}
.viewer-header h2{font-size:15px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1;margin-right:12px}
.viewer-close{padding:8px 18px;border-radius:10px;border:1px solid var(--line);background:transparent;color:var(--ink);font-size:14px;cursor:pointer;font-family:inherit}
.viewer-body{flex:1;overflow:hidden;background:#525659}
.viewer-body iframe{width:100%;height:100%;border:none}
@media(max-width:600px){header{padding:18px 24px}.container{padding:32px 24px 60px}.pdf-item{flex-direction:column;align-items:stretch;gap:8px}.pdf-actions{width:100%;gap:6px}.btn{flex:1;padding:6px 8px;font-size:11px}.viewer{width:100vw;height:100vh;border-radius:0}.pdf-name{white-space:normal;overflow:visible;text-overflow:clip;font-size:14px;line-height:1.4;word-break:break-word}.pdf-info{width:100%}body::before{background-size:auto 100%;background-position:center center;}.container{padding:24px 16px 60px;max-width:100%}.cat-list,.pdf-list{max-width:300px;margin-left:auto;margin-right:auto}.cat-card{padding:9px 12px;border-radius:11px;gap:9px}.cat-name{font-size:13px}.cat-idx{font-size:11px;width:20px}.cat-count{font-size:9px}.pdf-item{padding:8px 11px;border-radius:11px}.pdf-mark{width:26px;height:26px;font-size:8px;border-radius:7px}.pdf-name{font-size:12px}.pdf-meta{font-size:9px}.btn{padding:6px 10px;font-size:11px}.pdf-list,.cat-list{gap:7px}.pdf-info{gap:10px}}
</style>
</head>
<body>
<header>
<div>
<div class="nav"><a href="../../">トップ</a><span>/</span><a href="../">${subject}</a><span>/</span><span>${subname}</span></div>
<div class="title-row"><span class="title-symbol">${symbol}</span><div><h1>${subname}</h1><div class="meta" id="update-time"></div></div></div>
</div>
<button class="theme-toggle" id="theme-toggle">🌙</button>
</header>
<div class="container">

<div class="pdf-list" id="pdf-list"><div class="empty"><span class="spinner"></span></div></div></div>
<script>
${THEME_JS}
var SITE_URL='${SITE_URL}';
${PW_CHECK}
if(!checkAuth())throw new Error('auth');
var allFiles = [];
async function load(){try{var res=await fetch('../../filelist.json?'+Date.now());var data=await res.json();document.getElementById('update-time').textContent='updated '+data.updated;var folder=data.folders.find(function(f){return f.name==='${subject}';});if(!folder)return;var sub=folder.subs.find(function(s){return s.name==='${subname}';});var el=document.getElementById('pdf-list');if(!sub||sub.files.length===0){el.innerHTML='<div class="empty">PDFがありません</div>';return;}allFiles=sub.files;renderList(allFiles);}catch(e){document.getElementById('pdf-list').innerHTML='<div class="empty">読み込み失敗</div>';}}
function renderList(files){var el=document.getElementById('pdf-list');if(files.length===0){el.innerHTML='<div class="empty">見つかりませんでした</div>';return;}el.innerHTML=files.map(function(f){var relPath='pdfs/${subject}/${subname}/'+encodeURIComponent(f.name);var directPath='../../'+relPath;var viewerPath='../../viewer.html?file='+encodeURIComponent(relPath)+'&name='+encodeURIComponent(f.name);var dateText=f.date?f.size+' · '+f.date:f.size;return'<div class="pdf-item"><div class="pdf-info"><div class="pdf-mark">PDF</div><div style="min-width:0"><div class="pdf-name">'+f.name+'</div><div class="pdf-meta">'+dateText+'</div></div></div><div class="pdf-actions"><a class="btn btn-view" href="'+viewerPath+'">閲覧</a><a class="btn btn-dl" href="'+directPath+'" download>DL</a></div></div>';}).join('');}

load();
</script>
</body>
</html>
SUBEOF
  done

  # ── 教科トップページ（カテゴリ一覧）──
  cat > "$SITE_DIR/$subject/index.html" << CATEOF
<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="theme-color" content="#fafaf7" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0d0e14" media="(prefers-color-scheme: dark)">
<title>${subject} — PDF ライブラリ</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Zen+Kaku+Gothic+New:wght@400;500;700;900&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
<style>
${COMMON_CSS}
${ACCENT_CSS}
${BG_CSS}
${BG_CSS}
.cat-list{display:flex;flex-direction:column;gap:14px}
.cat-card{background:var(--surface);border:1px solid var(--line);border-radius:18px;padding:24px 26px;text-decoration:none;color:var(--ink);display:flex;align-items:center;gap:20px;box-shadow:var(--shadow);transition:transform 0.25s cubic-bezier(0.2,0.8,0.2,1),box-shadow 0.25s,border-color 0.25s;position:relative;overflow:hidden}
.cat-card::after{content:"";position:absolute;inset:0;background:var(--accent-soft);opacity:0;transition:opacity 0.25s;pointer-events:none}
.cat-card:hover{transform:translateY(-3px);box-shadow:var(--shadow-lift);border-color:var(--accent)}
.cat-card:hover::after{opacity:1}
.cat-idx{font-family:"Space Grotesk",monospace;font-size:15px;font-weight:700;color:var(--accent);width:34px;flex-shrink:0;position:relative;z-index:1}
.cat-info{flex:1;position:relative;z-index:1}
.cat-name{font-size:18px;font-weight:700;letter-spacing:0.01em}
.cat-count{font-family:"JetBrains Mono",monospace;font-size:11px;color:var(--ink-soft);margin-top:4px}
.cat-arrow{color:var(--ink-soft);font-size:20px;position:relative;z-index:1;transition:transform 0.2s,color 0.2s}
.cat-card:hover .cat-arrow{transform:translateX(4px);color:var(--accent)}
@media(max-width:600px){header{padding:18px 24px}.container{padding:32px 24px 60px}}
</style>
</head>
<body>
<header>
<div>
<div class="nav"><a href="../">トップ</a><span>/</span><span>${subject}</span></div>
<div class="title-row"><span class="title-symbol">${symbol}</span><h1>${subject}</h1></div>
</div>
<button class="theme-toggle" id="theme-toggle">🌙</button>
</header>
<div class="container">

<div class="cat-list" id="cats"><div class="empty"><span class="spinner"></span></div></div></div>
<script>
${THEME_JS}
${PW_CHECK}
if(!checkAuth())throw new Error('auth');
var EXTRA_LINKS=${EXTRA_LINKS_JS};
function extraCards(){return EXTRA_LINKS.map(function(l){return'<a class="cat-card" href="'+l.url+'"><div class="cat-idx">★</div><div class="cat-info"><div class="cat-name">'+l.name+'</div><div class="cat-count">'+l.desc+'</div></div><div class="cat-arrow">→</div></a>';}).join('');}
var allSubs = [];
async function load(){var el=document.getElementById('cats');var extra=extraCards();try{var res=await fetch('../filelist.json?'+Date.now());var data=await res.json();var folder=data.folders.find(function(f){return f.name==='${subject}';});if(!folder||!folder.subs||folder.subs.length===0){el.innerHTML=extra||'<div class="empty">カテゴリがありません</div>';return;}allSubs=folder.subs;renderCats(allSubs, extra);}catch(e){el.innerHTML=extra+'<div class="empty">読み込み失敗</div>';}}
function renderCats(subs, extra) {
  var el = document.getElementById('cats');
  var html = extra || '';
  if(subs.length===0){
    el.innerHTML = html + '<div class="empty">見つかりませんでした</div>';
    return;
  }
  html += subs.map(function(s,i){var num=String(i+1).padStart(2,'0');return'<a class="cat-card" href="'+encodeURIComponent(s.name)+'/"><div class="cat-idx">'+num+'</div><div class="cat-info"><div class="cat-name">'+s.name+'</div><div class="cat-count">'+s.files.length+' files</div></div><div class="cat-arrow">→</div></a>';}).join('');
  el.innerHTML = html;
}

load();
</script>
</body>
</html>
CATEOF
done
