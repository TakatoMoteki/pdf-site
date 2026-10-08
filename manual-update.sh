#!/bin/bash
cd "$HOME/pdf-site"
echo "[1/3] Google Drive から同期中..."
bash "$HOME/pdf-site/gdrive-sync.sh"
echo "[2/3] ページを再生成中..."
bash "$HOME/pdf-site/generate-subject-pages.sh"
echo "[3/3] GitHub に反映中..."
git add -A
if git diff --cached --quiet; then
  echo "✅ 変更なし（既に最新です）"
else
  git commit -m "manual update: $(date '+%Y-%m-%d %H:%M')"
  if git push origin main; then
    echo "✅ デプロイ完了！1〜2分後にサイトへ反映されます"
  else
    echo "❌ push に失敗しました"
  fi
fi
