---
name: kna-13-codex
description: oneagent 13단계에 쓴다. Codex 에이전트를 공유 위키에 붙인다. codex mcp add/login 으로 MCP를 등록하고, ~/.codex/AGENTS.md 의 oneagent 마커 구간에 규칙 블록을 넣고, 세션 문서 한 건으로 검증한다. 선택 단계이며 사용자가 Codex를 쓸 때만 돈다.
---

# 13단계: Codex 에이전트 연결

사용자와는 사용자가 쓰는 언어로 대화한다. 명령·경로·변수명은 원문 그대로 둔다.
어댑터 계약: `agents/codex/ADAPTER.md`.

## 목표

Codex가 어느 디렉터리에서 열려도 자기 이름과 위키 기록 규칙을 아는 상태. 돈은 들지 않지만
`~/.codex/AGENTS.md` 와 `~/.codex/config.toml` 을 고치므로 diff를 보여주고 yes를 받는다.

## 공통 선행 조건

```bash
H=.claude/skills/kna-status/state.mjs
node $H get wiki.url
node $H get mcp.server_name
node $H get wiki.collections
node $H get language
```

`steps.07`·`steps.08` 이 `done` 이어야 한다(위키와 콜렉션 규칙이 이미 있어야 한다). 없으면 그 단계로 돌려보낸다.

## 규칙 블록 만드는 법 (모든 런타임 공통)

규칙 본문의 단일 출처는 `agents/_shared/wiki-rules.ko.md` 다. 복사해서 고치지 않고 placeholder만 치환한다.

| placeholder | 값 |
|---|---|
| `{{AGENT_NAME}}` | 이 에이전트 이름 |
| `{{RUNTIME}}` | 런타임 표기 |
| `{{WIKI_URL}}` | state `wiki.url` |
| `{{MCP_SERVER_NAME}}` | 이 런타임에 등록한 MCP 서버 이름 |
| `{{SESSIONS_COLLECTION}}` | `<AGENT_NAME> Sessions` |
| `{{SHARED_COLLECTION}}` | state `wiki.collections.shared.name` |
| `{{PERSONA}}` | 09단계에서 만든 페르소나 줄. 없으면 `.knowanywhere/persona-lines.md` 를 참고해 새로 만든다 |

치환 결과를 사용자에게 **전체로 보여주고 yes를 받은 뒤** 주입한다. 주입 대상 파일은 먼저 백업한다.


## 물을 것

1. **에이전트 이름.** registry의 `runtime: codex-cli` 로우 이름을 기본값으로 제안한다.
   Claude Code 에이전트와 같은 이름을 쓰면 기록이 섞이므로 **다른 이름**을 쓴다.
2. **기기 이름.** `hostname -s` 를 기본값으로.
3. **브라우저 사용 가능 여부.** 불가하면 API key 경로로 간다.

## 절차

### 1. MCP 등록

```bash
codex mcp add <서버이름> --url <WIKI_URL>/mcp
codex mcp login <서버이름>
codex mcp list
```

브라우저가 없는 기기:

```bash
# 위키 Settings > API & Access 에서 키 생성. 이름은 codex-<기기>.
# 키는 대화에 붙여 넣지 않는다. mode 600 파일에 두고 export 한다.
codex mcp add <서버이름> --url <WIKI_URL>/mcp --bearer-token-env-var OUTLINE_API_KEY
```

### 2. 콜렉션 확인

`<이름> Sessions` 콜렉션이 없으면 `kna-08-collections` 를 이 이름으로 다시 돌려 만든다.

### 3. 규칙 블록 주입

블록 파일은 1행이 start 마커, 마지막 행이 end 마커다. `managed-block.mjs` 로 렌더링하고 주입한다.

```bash
H=.claude/skills/kna-09-persona/managed-block.mjs
# 값 JSON 을 만든다(위 placeholder 표의 키를 모두 넣는다. 없으면 render 가 거부한다)
node $H render --template agents/codex/block.md \
               --values .knowanywhere/block-values.json \
               --out .knowanywhere/codex-block.md
# 먼저 dry-run 으로 무엇이 바뀌는지 보여주고 yes 를 받는다
node $H apply --block .knowanywhere/codex-block.md --target ~/.codex/AGENTS.md --dry-run
node $H apply --block .knowanywhere/codex-block.md --target ~/.codex/AGENTS.md
```

`apply` 는 멱등이다. 마커 구간이 있으면 교체하고, 없으면 파일 끝에 덧붙이고, 다시 실행하면 "변경 없음"을 출력한다.
기존 내용은 보존되고 쓰기 전에 `.bak-<타임스탬프>` 백업을 만든다.

## 검증 (출력을 요약하지 말고 그대로 보여준다)

1. MCP 등록을 확인한다. 출력을 fenced code block 으로 그대로 붙인다.

```bash
codex mcp list
codex mcp get <서버이름>
```

`codex mcp get <서버이름>` 출력에 `url` 이 `<WIKI_URL>/mcp` 로 보여야 한다.
2. 이 런타임의 새 세션에서 `mcp__<서버이름>__list_collections` 도구를 호출하고, 받은 콜렉션 이름 목록을 붙인다.
3. 규칙대로 세션 문서 한 건을 만든다(`작성자: <이름>` 서명, `## 배경`, `## 완료 조건` 포함).
4. 다시 검색해 그 문서를 찾고, `## Update` 한 줄을 덧붙인다.
5. 3·4가 성공하면 state에 기록한다.

```bash
node $H agent-add '{"name":"<이름>","machine":"<기기>","kind":"<런타임>","sessions_collection":"<이름> Sessions"}'
node $H step <단계id> done
```

실패하면 done으로 표시하지 않는다. 에러를 읽고 원인을 설명하고 고친 뒤 다시 시도한다.


Codex는 system prompt를 받지 않고 `AGENTS.md` 만 읽으므로 블록을 짧게 유지한다.
