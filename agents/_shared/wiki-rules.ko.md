# 위키 규칙 — 단일 출처

13~16단계(Codex·Hermes·Aside·OpenClaw)의 규칙 본문은 `agents/_shared/block.md` 하나다.
각 런타임 어댑터는 이 파일을 복사하지 않고 placeholder만 치환해 주입한다.

## placeholder

| 이름 | 값 |
|---|---|
| `{{AGENT_NAME}}` | 이 에이전트 이름 |
| `{{RUNTIME}}` | 런타임 표기 (예: Codex, Hermes) |
| `{{WIKI_URL}}` | state `wiki.url` |
| `{{MCP_SERVER_NAME}}` | 이 런타임에 등록한 MCP 서버 이름 |
| `{{SESSIONS_COLLECTION}}` | `<AGENT_NAME> Sessions` |
| `{{SHARED_COLLECTION}}` | state `wiki.collections.shared.name` |

## 주입 방법

블록 파일은 **1행이 start 마커, 마지막 행이 end 마커**다. `managed-block.mjs` 의 계약이라
설명 주석을 블록 파일 안에 넣지 않는다(넣으면 apply 가 exit 3 으로 거부한다).

```bash
MB=.claude/skills/kna-09-persona/managed-block.mjs
node $MB render --template agents/codex/block.md \
               --values .knowanywhere/block-values.json \
               --out .knowanywhere/codex-block.md
node $MB apply --block .knowanywhere/codex-block.md --target ~/.codex/AGENTS.md --dry-run
node $MB apply --block .knowanywhere/codex-block.md --target ~/.codex/AGENTS.md
```

`render` 는 값이 없는 placeholder가 있으면 실패한다. 그래서 값 JSON에 위 표의 키를 모두 넣는다.
