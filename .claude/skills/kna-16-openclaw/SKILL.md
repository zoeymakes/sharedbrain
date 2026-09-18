---
name: kna-16-openclaw
description: oneagent 16단계에 쓴다. OpenClaw 에이전트를 공유 위키에 붙인다. 에이전트 하나가 registry 로우 하나이며, 역할이 좁으므로 권한을 자기 Sessions와 담당 주제로 제한한다. 은퇴 에이전트와 런타임 이사 처리 규칙을 포함한다.
---

# 16단계: OpenClaw 에이전트 연결

사용자와는 사용자가 쓰는 언어로 대화한다. 어댑터 계약: `agents/openclaw/ADAPTER.md`.

## 목표

OpenClaw의 각 에이전트가 자기 이름·권한·기록 규칙을 아는 상태. **에이전트 하나 = registry 로우 하나**이므로
붙일 에이전트마다 반복한다.

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

치환 결과를 사용자에게 **전체로 보여주고 yes를 받은 뒤** 주입한다. 주입 대상 파일은 먼저 백업한다.


## 물을 것

1. **대상 에이전트.** `ls ~/.openclaw/agents` 를 보여주고 어느 에이전트를 붙일지 묻는다.
   registry에서 `status: retired` 인 에이전트는 붙이지 않는다.
2. **담당 주제.** 역할이 좁은 경우가 많으므로 어떤 주제 문서까지 쓸 수 있는지 정한다.

## 절차

### 1. 권한 결정

기본값은 **자기 Sessions + 담당 주제 문서**다. 정본 승격은 큐레이터 역할 에이전트 한 곳에만 준다.

### 2. MCP 등록

OpenClaw 런타임의 MCP 설정에 위키를 추가한다. 상시 실행이면 API key(`openclaw-<에이전트>-<기기>`)를 쓴다.

### 3. 규칙 블록 주입

블록 파일은 1행이 start 마커, 마지막 행이 end 마커다. `managed-block.mjs` 로 렌더링하고 주입한다.

```bash
H=.claude/skills/kna-09-persona/managed-block.mjs
# 값 JSON 을 만든다(위 placeholder 표의 키를 모두 넣는다. 없으면 render 가 거부한다)
node $H render --template agents/_shared/block.md \
               --values .knowanywhere/block-values.json \
               --out .knowanywhere/openclaw-block.md
# 먼저 dry-run 으로 무엇이 바뀌는지 보여주고 yes 를 받는다
node $H apply --block .knowanywhere/openclaw-block.md --target ~/.openclaw/agents/<에이전트>/AGENTS.md --dry-run
node $H apply --block .knowanywhere/openclaw-block.md --target ~/.openclaw/agents/<에이전트>/AGENTS.md
```

`apply` 는 멱등이다. 마커 구간이 있으면 교체하고, 없으면 파일 끝에 덧붙이고, 다시 실행하면 "변경 없음"을 출력한다.
기존 내용은 보존되고 쓰기 전에 `.bak-<타임스탬프>` 백업을 만든다.

주입 위치는 런타임이 실제로 읽는 지침 경로다. `openclaw` 설정에서 확인한다.

## 은퇴와 런타임 이사

- **은퇴:** registry를 `status: retired` 로 바꾸고 규칙 블록을 제거한다. 과거 기록은 위키에 남긴다.
- **이사(예: OpenClaw → Hermes):** 콜렉션은 유지하고 규칙 주입 위치만 바꾼다.
  registry에는 이전 로우를 `status: retired`, `note: <새 위치>로 이사` 로 남겨 이력을 보존한다.

## 검증 (출력을 요약하지 말고 그대로 보여준다)

1. MCP 등록을 확인한다. 출력을 fenced code block 으로 그대로 붙인다.

```bash
openclaw mcp list
openclaw mcp probe
openclaw mcp doctor
```

`probe` 가 위키 도구(`list_collections` 등)를 보여야 한다. 설정을 바꾼 뒤에는 `openclaw mcp reload` 로 캐시를 비운다.
2. 이 런타임의 새 세션에서 `mcp__<서버이름>__list_collections` 도구를 호출하고, 받은 콜렉션 이름 목록을 붙인다.
3. 규칙대로 세션 문서 한 건을 만든다(`작성자: <이름>` 서명, `## 배경`, `## 완료 조건` 포함).
4. 다시 검색해 그 문서를 찾고, `## Update` 한 줄을 덧붙인다.
5. 3·4가 성공하면 state에 기록한다.

```bash
node $H agent-add '{"name":"<이름>","machine":"<기기>","kind":"<런타임>","sessions_collection":"<이름> Sessions"}'
node $H step <단계id> done
```

실패하면 done으로 표시하지 않는다. 에러를 읽고 원인을 설명하고 고친 뒤 다시 시도한다.
