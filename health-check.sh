#!/bin/bash
# 4サービスの生存確認。死んでいれば bootstrap で復活させる
UID_NUM=$(id -u)
LOG="$HOME/pdf-site/health-check.log"
SERVICES="gdrive-sync pdf-auto-deploy reset-history rotate-logs"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] === 健康チェック ===" >> "$LOG"
for svc in $SERVICES; do
  label="com.user.$svc"
  if launchctl print "gui/$UID_NUM/$label" >/dev/null 2>&1; then
    echo "  $svc: OK" >> "$LOG"
  else
    echo "  $svc: 停止 → 再登録します" >> "$LOG"
    launchctl bootstrap "gui/$UID_NUM" "$HOME/Library/LaunchAgents/$label.plist" 2>>"$LOG"
    launchctl enable "gui/$UID_NUM/$label" 2>>"$LOG"
  fi
done

# pdf-auto-deploy は常駐型。running でなければ kickstart
if ! launchctl print "gui/$UID_NUM/com.user.pdf-auto-deploy" 2>/dev/null | grep -q "state = running"; then
  echo "  pdf-auto-deploy: 常駐停止 → 再起動" >> "$LOG"
  launchctl kickstart "gui/$UID_NUM/com.user.pdf-auto-deploy" 2>>"$LOG"
fi
