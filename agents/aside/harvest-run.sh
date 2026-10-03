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
TIMEOUT="${SHAREDBRAIN_HARVEST_TIMEOUT:-2700}"  # 수확자 상한 45분. 아래 "매달림" 참고

mkdir -p "$(dirname "$LOG")"
exec >>"$LOG" 2>&1

echo "=== $(date '+%Y-%m-%d %H:%M:%S %Z') 수확 시작 (limit=$LIMIT) ==="

cd "$REPO"

# 게이트는 status 의 pending 이 아니라 list 의 실제 후보 수로 본다.
# list 는 사용자 메시지가 없는 세션(Aside cron 루틴 세션 등)을 거르므로 pending 은
# 0까지 내려가지 않는다. pending 으로 게이트하면 후보가 없는 날에도 수확자를 띄워 헛돈다.
candidates="$(node agents/aside/harvest.mjs list --limit "$LIMIT" \
  | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s).length))')"
if [[ "$candidates" == "0" ]]; then
  echo "올릴 세션이 없다. 끝."
  exit 0
fi
echo "이번 회차 후보: $candidates"

# 수확자에 상한을 둔다. 수확자 런타임은 네트워크가 끊기면 재연결을 무한 반복하고
# 복구된 뒤에도 스스로 회복하지 못하는 경우가 있다(실측: 처리를 다 끝낸 뒤 3시간 41분 매달림).
# 상한이 없으면 그 상태로 하루 회차가 통째로 날아간다.
codex exec \
  --skip-git-repo-check \
  --approve-for-me \
  --cd "$REPO" \
  "agents/aside/HARVEST.md 를 읽고 그 절차대로 Aside 세션을 수확하라. 이번 실행에서는 최대 ${LIMIT}건만 처리한다(node agents/aside/harvest.mjs list --limit ${LIMIT}). 각 세션마다 남길지 판단하고, 남길 것은 위키에 쓰고, 처리한 것은 반드시 mark 하라. 문서를 쓴 세션마다 HARVEST.md 의 "공유 지식 반영" 절대로 공유 지식을 고치고 세션 문서에 ## 공유 지식 반영 을 남겨라. 사람이 지켜보지 않는 자동 실행이므로 사용자에게 되묻지 말고, 판단이 서지 않는 세션은 mark --skip 으로 사유를 남기고 넘어가라. 끝나면 올린 문서 수, 건너뛴 수, 공유 지식에 반영한 문서 수, 보류 목록(제안 위치와 이유), 실패한 세션 id 를 요약하라." &
harvester=$!

# macOS 에 coreutils 의 timeout 이 없으므로 직접 센다.
# 폴링 누적이라 맥이 자는 동안은 세지 않는다. 깨어 있는 시간만 상한에 들어가는 쪽이 맞다.
elapsed=0
while kill -0 "$harvester" 2>/dev/null; do
  sleep 20
  elapsed=$((elapsed + 20))
  if (( elapsed >= TIMEOUT )); then
    echo "수확자가 ${TIMEOUT}초를 넘겼다. 강제 종료한다(mark 된 세션은 남고 나머지는 다음 회차 후보로 돌아온다)."
    kill "$harvester" 2>/dev/null || true
    sleep 3
    kill -9 "$harvester" 2>/dev/null || true
    break
  fi
done
wait "$harvester" 2>/dev/null || true

echo "=== $(date '+%Y-%m-%d %H:%M:%S %Z') 수확 끝 ==="
