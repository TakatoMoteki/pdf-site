#!/bin/bash
# pdf-auto-deploy.sh（v5: ローカルGoogle Drive監視 + 即時デプロイ）

SITE_REPO_DIR="$HOME/pdf-site"
LOG_FILE="$SITE_REPO_DIR/deploy.log"
GDRIVE_LOCAL="/Users/takato/Library/CloudStorage/GoogleDrive-g.lambdag.8pigt@gmail.com/マイドライブ/GoodNotes/公開フォルダ"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

sync_and_deploy() {
  log "同期処理を開始します..."
  
  # ネット接続チェック
  for i in $(seq 1 10); do
    if ping -c 1 -t 3 8.8.8.8 >/dev/null 2>&1; then break; fi
    if [ "$i" -eq 10 ]; then
      log "ネット未接続のためスキップ"
      return
    fi
    sleep 5
  done

  cd "$SITE_REPO_DIR"

  log "GitHubの最新状態を確認・同期..."
  git fetch origin >/dev/null 2>&1
  git reset --hard origin/main >/dev/null 2>&1

  log "ローカルGoogle DriveからPDFを同期..."
  bash "$SITE_REPO_DIR/gdrive-sync.sh"

  log "HTMLページを再生成..."
  bash "$SITE_REPO_DIR/generate-subject-pages.sh"

  log "GitHubへ反映処理..."
  git add -A

  if git diff --cached --quiet; then
    log "変更なし（スキップ）"
  else
    if [ -f .git/index.lock ] && [ -z "$(find .git/index.lock -mmin -5 2>/dev/null)" ]; then
      log "古い index.lock を削除"
      rm -f .git/index.lock
    fi

    git commit -m "auto-deploy: $(date '+%Y-%m-%d %H:%M:%S')"
    
    push_ok=0
    for attempt in 1 2 3; do
      if git push origin main >/dev/null 2>&1; then
        log "✅ デプロイ成功"
        push_ok=1
        break
      else
        log "push 失敗（試行 $attempt/3）、10秒後に再試行"
        sleep 10
      fi
    done
    
    if [ "$push_ok" -ne 1 ]; then
      log "❌ デプロイ失敗（3回試行）"
    fi
  fi
  log "同期処理が完了しました。"
}

log "=== pdf-auto-deploy v5 起動 ==="
log "監視対象: $GDRIVE_LOCAL"

# 起動時に1回実行しておく
sync_and_deploy

log "ファイル監視（即時反映モード）を開始します..."
# fswatchで変更を監視。変更があれば5秒待って実行（連続保存による複数回実行を防ぐ）
fswatch -r -o "$GDRIVE_LOCAL" | while read -r _count; do
  log "変更を検出しました。5秒後にデプロイを開始します..."
  sleep 5
  # 溜まった余分なイベントを読み捨てる
  while read -r -t 1 _extra; do :; done
  sync_and_deploy
done
