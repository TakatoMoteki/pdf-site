#!/bin/bash
# ============================================================
#  gdrive-sync.sh
#  ローカルのGoogle DriveフォルダからPDFを取得 → サニタイズ → pdfs/ に配置
# ============================================================

cd "$(dirname "$0")"
SITE_DIR="$(pwd)"
GDRIVE_LOCAL="/Users/takato/Library/CloudStorage/GoogleDrive-g.lambdag.8pigt@gmail.com/マイドライブ/GoodNotes/公開フォルダ"
DEST_DIR="$SITE_DIR/pdfs"
TRACK_FILE="$SITE_DIR/gdrive-folders.txt"
LOG_FILE="$SITE_DIR/gdrive-sync.log"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

get_file_mtime() {
  if stat --version 2>/dev/null | grep -q 'GNU'; then
    stat -c%Y "$1" 2>/dev/null
  else
    stat -f%m "$1" 2>/dev/null
  fi
}

log "=== ローカル同期開始 ==="

if [ ! -d "$GDRIVE_LOCAL" ]; then
  log "エラー: 監視対象のフォルダが見つかりません: $GDRIVE_LOCAL"
  exit 1
fi

# Step 1: フォルダ構成の記録
> "$TRACK_FILE"
find "$GDRIVE_LOCAL" -mindepth 2 -maxdepth 2 -type d | while read sub_dir; do
  subject=$(basename "$(dirname "$sub_dir")")
  subname=$(basename "$sub_dir")
  echo "$subject/$subname" >> "$TRACK_FILE"
done

# Step 2: PDFのサニタイズ＆ミラーリング
log "PDFサニタイズ & コピー..."
while read rel_folder; do
  src_sub="$GDRIVE_LOCAL/$rel_folder"
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
      if [ "$src_mod" -eq "$dst_mod" ]; then
        continue
      fi
    fi
    log "処理中: $rel_folder/$clean_name (from $raw_filename)"
    cp -p "$src_pdf" "$dst_pdf"
  done

  # Google Driveから削除されたファイルをローカルからも削除
  find "$dst_sub" -maxdepth 1 \( -name "*.pdf" -o -name "*.PDF" \) | while read dst_pdf; do
    dst_filename=$(basename "$dst_pdf")
    > .found_check
    find "$src_sub" -maxdepth 1 \( -name "*.pdf" -o -name "*.PDF" \) | while read src_pdf; do
      raw_src=$(basename "$src_pdf")
      clean_src=$(echo "$raw_src" | sed 's/\.pdf\.pdf$/.pdf/i' | perl -CS -pe 's/[\x{10000}-\x{10FFFF}\x{25FB}\x{FE0F}]//g')
      if [ "$clean_src" = "$dst_filename" ]; then
        echo "1" > .found_check
        break
      fi
    done
    if [ ! -s .found_check ]; then
      log "削除: $rel_folder/$dst_filename"
      rm "$dst_pdf"
    fi
    rm -f .found_check
  done
done < "$TRACK_FILE"

# Step 3: 以前存在したが今はないフォルダを削除
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

log "=== ローカル同期完了 ==="
