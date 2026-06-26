#!/bin/bash
# pdf-auto-deploy.sh（v3: サブフォルダ階層対応 + 更新日時）

PDF_SOURCE_DIR="$HOME/授業プリントpdf"
SITE_REPO_DIR="$HOME/pdf-site"
DEBOUNCE_SEC=5

PDFS_DIR="$SITE_REPO_DIR/pdfs"
LOG_FILE="$SITE_REPO_DIR/deploy.log"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

human_size() {
  local bytes=$1
  if [ "$bytes" -ge 1048576 ]; then
    echo "$(echo "scale=1; $bytes/1048576" | bc) MB"
  elif [ "$bytes" -ge 1024 ]; then
    echo "$(echo "scale=0; $bytes/1024" | bc) KB"
  else
    echo "${bytes} B"
  fi
}

file_date() {
  stat -f "%Sm" -t "%Y/%m/%d %H:%M" "$1" 2>/dev/null
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
        local bytes=$(stat -f%z "$f" 2>/dev/null || stat --printf="%s" "$f" 2>/dev/null)
        local size=$(human_size "$bytes")
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
      local bytes=$(stat -f%z "$f" 2>/dev/null || stat --printf="%s" "$f" 2>/dev/null)
      local size=$(human_size "$bytes")
      local mdate=$(file_date "$f")
      [ "$first_rf" = true ] && first_rf=false || root_files+=","
      root_files+='{"name":"'"$name"'","size":"'"$size"'","date":"'"$mdate"'"}'
      total_files=$((total_files + 1))
    done

    [ "$first_folder" = true ] && first_folder=false || json+=","
    json+='{"name":"'"$subject"'","totalFiles":'"$total_files"',"subs":['"$subs_json"'],"rootFiles":['"$root_files"']}'
  done

  json+=']}'
  echo "$json" > "$SITE_REPO_DIR/filelist.json"
}

sync_and_deploy() {
  log "変更を検出。同期を開始..."
  mkdir -p "$PDFS_DIR"
  rsync -av --delete --include='*/' --include='*.pdf' --include='*.PDF' --exclude='*' \
    "$PDF_SOURCE_DIR/" "$PDFS_DIR/"
  generate_filelist
  if [ -f "$SITE_REPO_DIR/generate-subject-pages.sh" ]; then
    bash "$SITE_REPO_DIR/generate-subject-pages.sh"
  fi
  log "filelist.json を更新"
  cd "$SITE_REPO_DIR"
  git add -A
  if git diff --cached --quiet; then
    log "変更なし（スキップ）"
    return
  fi
  git commit -m "auto-update: $(date '+%Y-%m-%d %H:%M:%S')"
  if git push origin main; then
    log "✅ デプロイ成功"
  else
    log "❌ デプロイ失敗"
  fi
}

log "=== pdf-auto-deploy v3 起動 ==="
log "監視対象: $PDF_SOURCE_DIR"
sync_and_deploy

log "ファイル監視を開始..."
fswatch -r -o "$PDF_SOURCE_DIR" | while read -r _count; do
  sleep "$DEBOUNCE_SEC"
  while read -r -t 1 _extra; do :; done
  sync_and_deploy
done
