#!/bin/bash
cd "$HOME/pdf-site" || exit 1
LOG="$HOME/pdf-site/reset-history.log"
echo "[$(date '+%Y-%m-%d %H:%M:%S')] 履歴リセット開始" >> "$LOG"

rm -rf .git
git init -q
git branch -M main
git remote add origin git@github.com:TakatoMoteki/pdf-site.git
git add -A
git commit -q -m "reset history (auto monthly)"
if git push -f origin main 2>>"$LOG"; then
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] ✅ リセット成功 (.git: $(du -sh .git | cut -f1))" >> "$LOG"
else
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] ❌ リセット失敗" >> "$LOG"
fi
