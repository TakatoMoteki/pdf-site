#!/bin/bash
# update-all-apps.sh
# 有機化学(yuuki)・無機化学(muki)アプリの更新をビルドし、pdf-siteに反映・デプロイする自動化スクリプト

set -euo pipefail

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

log "=== アプリ更新・デプロイを開始します ==="

# 1. 有機化学アプリ (yuuki) のビルド
if [ -d "$HOME/OrganicChemApp" ]; then
  log "OrganicChemApp (yuuki) をビルドしています..."
  ( cd "$HOME/OrganicChemApp" && bash build-apps.sh )
else
  log "エラー: OrganicChemApp ディレクトリが見つかりません"
fi

# 2. 無機化学アプリ (muki) のビルド
if [ -d "$HOME/InorganicChemApp" ]; then
  log "InorganicChemApp (muki) をビルドしています..."
  ( cd "$HOME/InorganicChemApp" && bash build-apps.sh )
else
  log "エラー: InorganicChemApp ディレクトリが見つかりません"
fi

# 理論化学アプリなどが増えた場合は、ここに追記できます
# if [ -d "$HOME/TheoreticalChemApp" ]; then
#   log "TheoreticalChemApp (riron) をビルドしています..."
#   ( cd "$HOME/TheoreticalChemApp" && bash build-apps.sh )
# fi

# 3. pdf-site リポジトリへコミット＆プッシュ
log "pdf-site に変更をコミットし、プッシュしています..."
cd "$HOME/pdf-site"
git add -A

if git diff --cached --quiet; then
  log "アプリの変更はありませんでした（スキップ）"
else
  git commit -m "Update apps (auto-deploy): $(date '+%Y-%m-%d %H:%M:%S')"
  if git push origin main; then
    log "✅ アプリのデプロイ（GitHub Pagesへの反映）に成功しました！"
  else
    log "❌ デプロイ（プッシュ）に失敗しました。ネットワークや権限を確認してください。"
  fi
fi

log "=== 処理が完了しました ==="
