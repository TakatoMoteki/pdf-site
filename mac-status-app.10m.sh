#!/bin/bash
# <xbar.title>PDF Site Status</xbar.title>
# <xbar.version>1.0</xbar.version>
# <xbar.author>Takato</xbar.author>
# <xbar.desc>Shows GitHub Actions deployment status for pdf-site.</xbar.desc>

export PATH="/usr/local/bin:/usr/bin:/bin:$PATH"

REPO="TakatoMoteki/pdf-site"
API_URL="https://api.github.com/repos/$REPO/actions/runs?per_page=1"

# APIリクエスト (パブリックリポジトリなら認証不要)
RESPONSE=$(curl -s "$API_URL")

# Python3でパース
STATUS=$(echo "$RESPONSE" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    if 'workflow_runs' in data and len(data['workflow_runs']) > 0:
        run = data['workflow_runs'][0]
        status = run.get('status')
        conclusion = run.get('conclusion')
        url = run.get('html_url')
        print(f'{status},{conclusion},{url}')
    else:
        print('none,none,none')
except Exception:
    print('error,error,none')
" 2>/dev/null)

IFS=',' read -r RUN_STATUS CONCLUSION URL <<< "$STATUS"

ICON="❓"
MSG="PDF Site"

if [ "$RUN_STATUS" == "in_progress" ] || [ "$RUN_STATUS" == "queued" ]; then
    ICON="🔄"
    MSG="同期中"
elif [ "$RUN_STATUS" == "completed" ]; then
    if [ "$CONCLUSION" == "success" ]; then
        ICON="🟢"
        MSG="最新"
    else
        ICON="🔴"
        MSG="エラー"
    fi
elif [ "$RUN_STATUS" == "error" ]; then
    ICON="⚠️"
    MSG="取得失敗"
fi

echo "$ICON $MSG"
echo "---"
if [ "$URL" != "none" ]; then
    echo "Actionsのログを見る | href=$URL"
fi
echo "サイトを開く | href=https://takatomoteki.github.io/pdf-site/"
echo "GitHubリポジトリ | href=https://github.com/$REPO"
echo "---"
echo "🚀 手動で同期を実行する (ブラウザから) | href=https://github.com/$REPO/actions/workflows/deploy.yml"
