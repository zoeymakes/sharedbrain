---
name: kna-15-aside
description: oneagent 15단계에 쓴다. Aside 에이전트를 공유 위키에 붙인다. 계정별 AGENTS.md에 규칙을 주입하고, MCP를 쓸 수 없으면 handoff 모드로 운영한다. 회사 계정에는 반출 금지 규칙을 필수로 넣는다. 브라우저 상태는 기기 로컬에 남긴다.
---

# 15단계: Aside 에이전트 연결

사용자와는 사용자가 쓰는 언어로 대화한다. 어댑터 계약: `agents/aside/ADAPTER.md`.

## 목표

Aside가 작업 기록을 공유 위키(또는 handoff 파일)에 규칙대로 남기는 상태.
**브라우저 탭·로그인·쿠키·binding은 이식할 수 없으므로 기기 로컬에 그대로 둔다.** 공유하는 것은 기록뿐이다.

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

1. **대상 계정.** `ls ~/.aside/u` 를 보여주고 어느 계정을 붙일지 묻는다.
2. **개인 계정인가 회사 계정인가.** 회사 계정이면 반출 금지 규칙을 필수로 넣는다.
3. **handoff를 읽어 위키에 올릴 에이전트.** 같은 기기의 Hermes 또는 Claude Code 중에서 정한다.

## 절차

### 1. handoff 경로 준비

`aside mcp` 는 Aside를 MCP **서버로 노출**하는 명령이다. 외부 MCP(위키)를 소비하는 클라이언트 기능은
확인되지 않았으므로 **handoff 모드로 운영한다**. 자세한 형식은 `agents/aside/ADAPTER.md`.

```bash
mkdir -p ~/.oneagent/handoff/aside/<계정>/archive
```

읽어서 위키에 올릴 에이전트를 정한다(같은 기기의 Hermes 또는 Claude Code). 그 에이전트의 규칙에
"`~/.oneagent/handoff/aside/` 를 확인하고, 기록한 파일은 `archive/` 로 옮긴다"를 추가한다.

인증된 화면의 실제 조작은 이 기기에서 계속하고, 다른 기기는 정리·판단·후속 문서 작업만 이어받는다.

### 2. 규칙 블록 주입

`~/.aside/u/<계정>/AGENTS.md` 를 백업한 뒤 마커 구간을 교체한다.

### 3. 회사 계정 추가 규칙 (필수)

회사 계정이면 블록에 다음을 반드시 넣는다.

- 회사 화면의 원문·고유명·내부 URL·수치·스크린샷을 위키나 handoff 파일에 넣지 않는다.
- 업무명·문제·판단·현재 상태·정본 위치 포인터만 비식별화해 남긴다.
- 판단이 서지 않으면 기록하지 않고 사용자에게 묻는다.

## 검증 (출력을 요약하지 말고 그대로 보여준다)

1. 계정과 handoff 경로를 확인한다. 출력을 그대로 붙인다.

```bash
aside account
ls -la ~/.oneagent/handoff/aside/<계정>/
```
2. Aside 세션에서 작업 한 건을 하고 handoff 파일 1건을 만든다.
3. 지정한 에이전트가 그 handoff를 읽어 위키에 규칙대로 세션 문서를 만든다(`작성자: <이름>` 서명 포함).
4. 위키에서 그 문서를 다시 검색해 찾고, handoff 파일이 `archive/` 로 옮겨졌는지 확인한다.
5. 3·4가 성공하면 state에 기록한다.

```bash
node $H agent-add '{"name":"<이름>","machine":"<기기>","kind":"<런타임>","sessions_collection":"<이름> Sessions"}'
node $H step <단계id> done
```

실패하면 done으로 표시하지 않는다. 에러를 읽고 원인을 설명하고 고친 뒤 다시 시도한다.


