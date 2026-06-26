#!/bin/bash
# 各ログを最新N行に保ち肥大化を防ぐ
cd "$HOME/pdf-site" || exit 1
for f in deploy.log gdrive-sync.log gdrive-sync-out.log gdrive-sync-err.log launchd-out.log launchd-err.log reset-history.log; do
  LOG="$HOME/pdf-site/$f"
  if [ -f "$LOG" ] && [ "$(wc -l < "$LOG" 2>/dev/null || echo 0)" -gt 500 ]; then
    tail -300 "$LOG" > "$LOG.tmp" 2>/dev/null && mv "$LOG.tmp" "$LOG"
  fi
done
