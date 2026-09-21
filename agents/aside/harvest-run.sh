#!/usr/bin/env bash
# agents/aside/harvest-run.sh — 수확자를 한 번 돌린다. launchd 가 매일 부른다.
#
# 밀린 날이 있어도 따로 처리할 것이 없다. ~/.sharedbrain/harvest-state.json 이
# 이미 올린 세션을 기억하므로, 며칠 만에 돌면 그 사이 세션이 한꺼번에 후보로 나온다.
#
# 설치: agents/aside/launchd/com.example.sharedbrain.harvest.plist
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
LOG="${SHAREDBRAIN_HARVEST_LOG:-$HOME/.sharedbrain/harvest.log}"
LIMIT="${SHAREDBRAIN_HARVEST_LIMIT:-12}"   # 한 번에 처리할 최대 세션 수

mkdir -p "$(dirname "$LOG")"
exec >>"$LOG" 2>&1

echo "=== $(date '+%Y-%m-%d %H:%M:%S %Z') 수확 시작 (limit=$LIMIT) ==="

cd "$REPO"

pending="$(node agents/aside/harvest.mjs status | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s).pending))')"
if [[ "$pending" == "0" ]]; then
  echo "올릴 세션이 없다. 끝."
  exit 0
fi
echo "대기 중인 세션: $pending"

codex exec \
  --skip-git-repo-check \
  --approve-for-me \
  --cd "$REPO" \
  "agents/aside/HARVEST.md 를 읽고 그 절차대로 Aside 세션을 수확하라. 이번 실행에서는 최대 ${LIMIT}건만 처리한다(node agents/aside/harvest.mjs list --limit ${LIMIT}). 각 세션마다 남길지 판단하고, 남길 것은 위키에 쓰고, 처리한 것은 반드시 mark 하라. 사람이 지켜보지 않는 자동 실행이므로 사용자에게 되묻지 말고, 판단이 서지 않는 세션은 mark --skip 으로 사유를 남기고 넘어가라. 끝나면 올린 문서 수, 건너뛴 수, 실패한 세션 id 만 한 줄로 요약하라."

echo "=== $(date '+%Y-%m-%d %H:%M:%S %Z') 수확 끝 ==="
