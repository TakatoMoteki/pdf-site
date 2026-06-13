#!/bin/bash
# ============================================================
#  gdrive-sync.sh
#  Google DriveからPDFを取得 → 軽量化 → 授業プリントpdfに配置
# ============================================================

GDRIVE_PATH="gdrive:GoodNotes/公開フォルダ"
SYNC_DIR="$HOME/pdf-site/gdrive-raw"
DEST_DIR="$HOME/授業プリントpdf"
TRACK_FILE="$HOME/pdf-site/gdrive-folders.txt"
LOG_FILE="$HOME/pdf-site/gdrive-sync.log"
COMPRESS_THRESHOLD=10485760  # 5MB未満は圧縮しない（文字消え防止）

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

compress_pdf() {
  local src="$1"
  local dst="$2"
  local orig_size=$(stat -f%z "$src" 2>/dev/null)

  # 小さいファイルは圧縮しない（文字消え防止）
  if [ "$orig_size" -lt "$COMPRESS_THRESHOLD" ]; then
    cp "$src" "$dst"
    log "  コピー（圧縮スキップ）: $(basename "$src") ${orig_size} bytes"
    return
  fi

  # /printer品質で圧縮（文字を保持しつつ画像を圧縮）
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
    local new_size=$(stat -f%z "$dst" 2>/dev/null)
    # 圧縮後の方が大きい場合は元ファイルを使う
    if [ "$new_size" -ge "$orig_size" ]; then
      cp "$src" "$dst"
      log "  コピー（圧縮効果なし）: $(basename "$src")"
    else
      local pct=$((new_size * 100 / orig_size))
      log "  圧縮: $(basename "$src") ${orig_size} → ${new_size} bytes (${pct}%)"
    fi
  else
    cp "$src" "$dst"
    log "  圧縮失敗、元ファイルをコピー: $(basename "$src")"
  fi
}

log "=== Google Drive 同期開始 ==="

# Step 1: rclone sync
log "rclone sync 開始..."
mkdir -p "$SYNC_DIR"
rclone sync "$GDRIVE_PATH" "$SYNC_DIR" \
  --include "*.pdf" --include "*.PDF" \
  --create-empty-src-dirs \
  -v 2>&1 | tail -5 | while read line; do log "  rclone: $line"; done

# Step 2: Google Drive由来のフォルダを記録
> "$TRACK_FILE"
find "$SYNC_DIR" -mindepth 2 -maxdepth 2 -type d | while read sub_dir; do
  subject=$(basename "$(dirname "$sub_dir")")
  subname=$(basename "$sub_dir")
  echo "$subject/$subname" >> "$TRACK_FILE"
done

# Step 3: Google Drive由来フォルダのPDFを軽量化＆ミラーリング
log "PDF軽量化 & ミラーリング..."
while read rel_folder; do
  src_sub="$SYNC_DIR/$rel_folder"
  dst_sub="$DEST_DIR/$rel_folder"
  mkdir -p "$dst_sub"

  # 新規・更新ファイルを処理
  find "$src_sub" \( -name "*.pdf" -o -name "*.PDF" \) | while read src_pdf; do
    filename=$(basename "$src_pdf")
    dst_pdf="$dst_sub/$filename"
    if [ -f "$dst_pdf" ]; then
      src_mod=$(stat -f%m "$src_pdf" 2>/dev/null)
      dst_mod=$(stat -f%m "$dst_pdf" 2>/dev/null)
      if [ "$src_mod" -le "$dst_mod" ]; then
        continue
      fi
    fi
    log "処理中: $rel_folder/$filename"
    compress_pdf "$src_pdf" "$dst_pdf"
  done

  # Google Driveから削除されたファイルをローカルからも削除
  find "$dst_sub" \( -name "*.pdf" -o -name "*.PDF" \) | while read dst_pdf; do
    filename=$(basename "$dst_pdf")
    if [ ! -f "$src_sub/$filename" ]; then
      log "削除: $rel_folder/$filename"
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
