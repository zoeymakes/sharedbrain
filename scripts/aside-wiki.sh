#!/usr/bin/env bash
# scripts/aside-wiki.sh — Aside REPL 에 위키 스니펫을 주입해 실행한다.
#
# REPL 은 외부 모듈 import 와 process.env 를 허용하지 않고, fs 는 세션 디렉터리에 샌드박스된다.
# 그래서 키를 셸에서 치환해 넣는다. 키는 인자로 받지 않고 mode 600 파일에서 읽는다.
#
# 준비 (한 번만)
#   mkdir -p ~/.sharedbrain && chmod 700 ~/.sharedbrain
#   cat > ~/.sharedbrain/aside.env <<'EOF'
#   SHAREDBRAIN_WIKI_URL=https://wiki.example.com
#   SHAREDBRAIN_WIKI_KEY=<Outline API key>
#   SHAREDBRAIN_AGENT=브라우저작업자
#   SHAREDBRAIN_DEVICE=laptop
#   EOF
#   chmod 600 ~/.sharedbrain/aside.env
#
# 사용
#   scripts/aside-wiki.sh check
#   scripts/aside-wiki.sh run 'const d = await startWork({title:"2026-09-19 · 가격표 확인", collection:"브라우저작업자 Sessions"}); console.log(d.url)'
#   scripts/aside-wiki.sh --account u1 check
set -euo pipefail

ENV_FILE="${SHAREDBRAIN_ENV:-$HOME/.sharedbrain/aside.env}"
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SNIPPET="$REPO/agents/aside/repl-snippet.js"

ACCOUNT_ARGS=()
if [[ "${1:-}" == "--account" ]]; then ACCOUNT_ARGS=(--account "$2"); shift 2; fi

CMD="${1:-check}"; shift || true

[[ -f "$ENV_FILE" ]] || { echo "설정 파일이 없다: $ENV_FILE (파일 머리 주석의 준비 절차를 따른다)" >&2; exit 1; }
PERM="$(stat -f '%Lp' "$ENV_FILE" 2>/dev/null || stat -c '%a' "$ENV_FILE")"
[[ "$PERM" == "600" ]] || { echo "$ENV_FILE 의 권한이 $PERM 이다. chmod 600 으로 바꾼다" >&2; exit 1; }
[[ -f "$SNIPPET" ]] || { echo "스니펫이 없다: $SNIPPET" >&2; exit 1; }

# shellcheck disable=SC1090
set -a; . "$ENV_FILE"; set +a
: "${SHAREDBRAIN_WIKI_URL:?$ENV_FILE 에 SHAREDBRAIN_WIKI_URL 이 필요하다}"
: "${SHAREDBRAIN_WIKI_KEY:?$ENV_FILE 에 SHAREDBRAIN_WIKI_KEY 가 필요하다}"
: "${SHAREDBRAIN_AGENT:?$ENV_FILE 에 SHAREDBRAIN_AGENT 가 필요하다}"
DEVICE="${SHAREDBRAIN_DEVICE:-$(hostname -s)}"
export DEVICE

# 주석 줄을 지우고 placeholder 를 치환한다. 키는 화면에 출력하지 않는다.
body="$(python3 - "$SNIPPET" <<'PY'
import sys, os
src = open(sys.argv[1], encoding='utf-8').read()
out = "\n".join(l for l in src.split("\n") if not l.lstrip().startswith("//"))
for k, v in (("__WIKI__", os.environ["SHAREDBRAIN_WIKI_URL"]),
             ("__KEY__", os.environ["SHAREDBRAIN_WIKI_KEY"]),
             ("__AGENT__", os.environ["SHAREDBRAIN_AGENT"]),
             ("__DEVICE__", os.environ["DEVICE"])):
    out = out.replace(k, v)
sys.stdout.write(out)
PY
)"
export DEVICE

case "$CMD" in
  check) tail='await wikiCheck();' ;;
  run)   tail="${1:?실행할 코드를 인자로 준다}" ;;
  print) printf '%s\n' "$body" | sed "s|${SHAREDBRAIN_WIKI_KEY}|<KEY>|g"; exit 0 ;;
  *)     echo "사용법: aside-wiki.sh [--account <id>] check|run '<코드>'|print" >&2; exit 2 ;;
esac

aside repl ${ACCOUNT_ARGS[@]+"${ACCOUNT_ARGS[@]}"} "$body
$tail"
