#!/bin/bash
# pdf-auto-deploy.sh（v4: Google Drive 同期 + 定期実行）

SITE_REPO_DIR="$HOME/pdf-site"
LOG_FILE="$SITE_REPO_DIR/deploy.log"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "=== pdf-auto-deploy v4 実行開始 ==="

# ネット接続チェック
for i in $(seq 1 10); do
  if ping -c 1 -t 3 8.8.8.8 >/dev/null 2>&1; then break; fi
  if [ "$i" -eq 10 ]; then
    log "ネット未接続のためスキップ"
    exit 0
  fi
  sleep 5
done

cd "$SITE_REPO_DIR"

log "GitHubの最新状態を確認・同期..."
git fetch origin >/dev/null 2>&1
git reset --hard origin/main >/dev/null 2>&1

log "Google DriveからPDFを同期..."
bash "$SITE_REPO_DIR/gdrive-sync.sh"

log "HTMLページを再生成..."
bash "$SITE_REPO_DIR/generate-subject-pages.sh"

log "GitHubへ反映処理..."
git add -A

if git diff --cached --quiet; then
  log "変更なし（スキップ）"
else
  # 5分以上前から残る古いロックだけ掃除
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

log "=== 実行完了 ==="
