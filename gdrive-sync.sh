#!/bin/bash
# ============================================================
#  gdrive-sync.sh
#  Google DriveからPDFを取得 → 軽量化 → pdfs/ に配置
# ============================================================

cd "$(dirname "$0")"
SITE_DIR="$(pwd)"
GDRIVE_PATH="gdrive:GoodNotes/公開フォルダ"
SYNC_DIR="$SITE_DIR/gdrive-raw"
DEST_DIR="$SITE_DIR/pdfs"
TRACK_FILE="$SITE_DIR/gdrive-folders.txt"
LOG_FILE="$SITE_DIR/gdrive-sync.log"
COMPRESS_THRESHOLD=10485760  # 10MB未満は圧縮しない

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# stat のクロスプラットフォームラッパー
get_file_size() {
  if stat --version 2>/dev/null | grep -q 'GNU'; then
    stat -c%s "$1" 2>/dev/null
  else
    stat -f%z "$1" 2>/dev/null
  fi
}

get_file_mtime() {
  if stat --version 2>/dev/null | grep -q 'GNU'; then
    stat -c%Y "$1" 2>/dev/null
  else
    stat -f%m "$1" 2>/dev/null
  fi
}

# ネット接続を最大10回（5秒間隔）待つ
wait_for_network() {
  if [ -n "$CI" ] || [ -n "$GITHUB_ACTIONS" ]; then return 0; fi
  for i in $(seq 1 10); do
    if ping -c 1 -t 3 8.8.8.8 >/dev/null 2>&1; then
      return 0
    fi
    log "ネット未接続、待機中... ($i/10)"
    sleep 5
  done
  log "ネット接続できず、今回はスキップ"
  return 1
}

compress_pdf() {
  local src="$1"
  local dst="$2"
  local orig_size=$(get_file_size "$src")

  # 小さいファイルは圧縮しない（文字消え防止）
  if [ "$orig_size" -lt "$COMPRESS_THRESHOLD" ]; then
    cp "$src" "$dst"
    log "  コピー（圧縮スキップ）: $(basename "$dst") ${orig_size} bytes"
    return
  fi

  # /printer品質で圧縮
  gs -sDEVICE=pdfwrite \
     -dCompatibilityLevel=1.4 \
     -dPDFSETTINGS=/printer \
     -dAutoRotatePages=/None \
     -dColorImageResolution=150 \
     -dGrayImageResolution=150 \
     -dEmbedAllFonts=true \
     -dSubsetFonts=true \
     -dNOPAUSE -dBATCH -dQUIET \
     -sOutputFile="$dst" \
     "$src" 2>/dev/null

  if [ $? -eq 0 ] && [ -f "$dst" ]; then
    local new_size=$(get_file_size "$dst")
    if [ "$new_size" -ge "$orig_size" ]; then
      cp "$src" "$dst"
      log "  コピー（圧縮効果なし）: $(basename "$dst")"
    else
      local pct=$((new_size * 100 / orig_size))
      log "  圧縮: $(basename "$dst") ${orig_size} → ${new_size} bytes (${pct}%)"
    fi
  else
    cp "$src" "$dst"
    log "  圧縮失敗、元ファイルをコピー: $(basename "$dst")"
  fi
}

log "=== Google Drive 同期開始 ==="

# Step 1: rclone sync
log "rclone sync 開始..."
mkdir -p "$SYNC_DIR"

if ! wait_for_network; then
  exit 0
fi

rclone_ok=0
for attempt in 1 2 3; do
  if rclone sync "$GDRIVE_PATH" "$SYNC_DIR" \
    --include "*.pdf" --include "*.PDF" \
    --create-empty-src-dirs \
    -v 2>&1 | tail -5 | while read line; do log "  rclone: $line"; done
  then
    rclone_ok=1
    break
  fi
done

if [ "$rclone_ok" -ne 1 ]; then
  log "rclone 同期に失敗しました。"
  if [ -n "$CI" ] || [ -n "$GITHUB_ACTIONS" ]; then
    log "CI環境のため、これ以上の処理を中止しエラー終了します。"
    exit 1
  else
    log "ローカル環境のため処理を継続（ミラーリングへ進む）"
  fi
fi

# Step 2: Google Drive由来のフォルダを記録
> "$TRACK_FILE"
find "$SYNC_DIR" -mindepth 2 -maxdepth 2 -type d | while read sub_dir; do
  subject=$(basename "$(dirname "$sub_dir")")
  subname=$(basename "$sub_dir")
  echo "$subject/$subname" >> "$TRACK_FILE"
done

# Step 3: Google Drive由来フォルダのPDFを軽量化＆ミラーリング
log "PDFサニタイズ & 軽量化..."
while read rel_folder; do
  src_sub="$SYNC_DIR/$rel_folder"
  dst_sub="$DEST_DIR/$rel_folder"
  mkdir -p "$dst_sub"

  # 新規・更新ファイルを処理
  find "$src_sub" -maxdepth 1 \( -name "*.pdf" -o -name "*.PDF" \) | while read src_pdf; do
    raw_filename=$(basename "$src_pdf")
    # サニタイズ: .pdf.pdf を .pdf にし、絵文字や一部の特殊記号を削除
    clean_name=$(echo "$raw_filename" | sed 's/\.pdf\.pdf$/.pdf/i' | perl -CS -pe 's/[\x{10000}-\x{10FFFF}\x{25FB}\x{FE0F}]//g')
    
    dst_pdf="$dst_sub/$clean_name"
    if [ -f "$dst_pdf" ]; then
      src_mod=$(get_file_mtime "$src_pdf")
      dst_mod=$(get_file_mtime "$dst_pdf")
      if [ "$src_mod" -le "$dst_mod" ]; then
        continue
      fi
    fi
    log "処理中: $rel_folder/$clean_name (from $raw_filename)"
    compress_pdf "$src_pdf" "$dst_pdf"
  done

  # Google Driveから削除されたファイルをローカルからも削除
  find "$dst_sub" -maxdepth 1 \( -name "*.pdf" -o -name "*.PDF" \) | while read dst_pdf; do
    dst_filename=$(basename "$dst_pdf")
    found=0
    find "$src_sub" -maxdepth 1 \( -name "*.pdf" -o -name "*.PDF" \) | while read src_pdf; do
      raw_src=$(basename "$src_pdf")
      clean_src=$(echo "$raw_src" | sed 's/\.pdf\.pdf$/.pdf/i' | perl -CS -pe 's/[\x{10000}-\x{10FFFF}\x{25FB}\x{FE0F}]//g')
      if [ "$clean_src" = "$dst_filename" ]; then
        found=1
        break
      fi
    done
    if [ "$found" -eq 0 ]; then
      log "削除: $rel_folder/$dst_filename"
      rm "$dst_pdf"
    fi
  done
done < "$TRACK_FILE"

# Step 4: 以前存在したが今はないフォルダを削除
if [ -f "$TRACK_FILE.prev" ]; then
  while read old_folder; do
    if ! grep -qxF "$old_folder" "$TRACK_FILE"; then
      if [ -d "$DEST_DIR/$old_folder" ]; then
        log "フォルダ削除: $old_folder"
        rm -rf "$DEST_DIR/$old_folder"
      fi
    fi
  done < "$TRACK_FILE.prev"
fi
cp "$TRACK_FILE" "$TRACK_FILE.prev"

log "=== Google Drive 同期完了 ==="
