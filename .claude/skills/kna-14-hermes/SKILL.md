---
name: kna-14-hermes
description: oneagent 14단계에 쓴다. Hermes 프로필별 에이전트를 공유 위키에 붙인다. 프로필 하나가 에이전트 하나이므로 프로필마다 이름·콜렉션·권한을 따로 둔다. config.yaml에 MCP 서버를 API key로 등록하고, 규칙을 프로필 skill로 주입하고, 세션 문서 한 건으로 검증한다.
---

# 14단계: Hermes 에이전트 연결

사용자와는 사용자가 쓰는 언어로 대화한다. 어댑터 계약: `agents/hermes/ADAPTER.md`.

## 목표

Hermes의 각 프로필이 자기 이름·권한·기록 규칙을 아는 상태. **프로필 하나 = 에이전트 하나**이므로
프로필마다 이 단계를 반복한다. 돈은 들지 않지만 `~/.hermes/config.yaml` 과 skill 디렉터리를 고치므로
diff를 보여주고 yes를 받는다.

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
| `{{PERSONA}}` | 페르소나 줄 |
| `{{AGENT_SLUG}}` | skill 이름에 쓸 슬러그(영문 소문자·하이픈) |
| `{{WIKI_ACCESS_RULE}}` | 아래 권한 표에서 고른 문장 |
| `{{WIKI_RULES}}` | `_shared/wiki-rules.ko.md` 치환 결과 |

치환 결과를 사용자에게 **전체로 보여주고 yes를 받은 뒤** 주입한다. 주입 대상 파일은 먼저 백업한다.


## 물을 것

1. **대상 프로필.** `ls ~/.hermes/profiles` 와 기본 프로필을 보여주고 어느 프로필을 붙일지 묻는다.
2. **에이전트 이름.** registry에서 그 프로필의 이름을 기본값으로.
3. **위키 권한.** registry의 `wiki_access` 를 보여주고 확인받는다.
   - `read-write`: 공유 지식 정본 수정 가능(승격 전 사용자 확인 유지)
   - `자기 영역만`: 자기 Sessions와 지정 주제만. 정본 승격 금지
   - `read-only`: 검색·인용만

## 절차

### 1. MCP 등록 (API key)

상시 실행 서버에는 브라우저가 없으므로 Outline API key를 쓴다. 키 이름은 `hermes-<프로필>-<기기>` 로
에이전트별로 만든다. 사고 시 그 키만 폐기한다.

`~/.hermes/config.yaml` 에 추가할 내용을 diff로 보여준다.

권장: 수작업 YAML 편집 대신 CLI를 쓴다.

```bash
hermes mcp add <서버이름> --url <WIKI_URL>/mcp
hermes mcp list
hermes mcp test <서버이름>
```

직접 편집해야 하면 `~/.hermes/config.yaml` 의 **최상위** `mcp_servers:` 아래에 넣는다.
(`mcp:` 는 보조 모델 설정이라 다른 키다. 거기에 넣으면 서버가 등록되지 않는다.)

```yaml
mcp_servers:
  <서버이름>:
    url: <WIKI_URL>/mcp
    headers:
      Authorization: "Bearer ${OUTLINE_API_KEY}"
```

HTTP 여부는 `url:` 키 존재로 결정된다. `transport:` 는 `sse` 를 쓸 때만 지정한다.
`${VAR}` 환경변수 치환은 Hermes가 지원한다.

키 값은 config에 직접 쓰지 않는다. mode 600 환경 파일에 두고 환경변수로 주입한다.
등록 후 확인한다.

```bash
hermes mcp list                 # 서버가 보이는지
hermes mcp test <서버이름>       # 연결과 도구 목록
```

`hermes mcp test` 가 설정을 못 읽는다는 뜻의 오류를 내면 게이트웨이 재시작이 필요할 수 있다. 재시작은 실행 중 에이전트를 끊으므로 **사용자에게 맡기고 명령만 알려준다**(Hermes 문서의 gateway 수명주기 명령).

### 2. 콜렉션 확인

`<이름> Sessions` 가 없으면 `kna-08-collections` 를 이 이름으로 돌려 만든다.

### 3. 규칙을 skill로 주입

`agents/hermes/skill-template.md` 를 치환해 skill 하나를 만든다.

- skill 이름: `oneagent-wiki-<에이전트-slug>`
- 위치: 기본 프로필이면 `~/.hermes/skills/`, 그 외는 `~/.hermes/profiles/<프로필>/skills/`
- `{{WIKI_ACCESS_RULE}}` 에는 위에서 확인한 권한 문장을 넣는다
- `{{WIKI_RULES}}` 에는 `agents/_shared/block.md` 를 치환한 결과를 넣는다

```bash
H=.claude/skills/kna-09-persona/managed-block.mjs
node $H render --template agents/_shared/block.md \
               --values .knowanywhere/block-values.json \
               --out .knowanywhere/hermes-rules.md
# 그 결과를 skill-template.md 의 {{WIKI_RULES}} 자리에 넣어 최종 skill 파일을 만든다
```

skill 파일은 마커 구간이 아니라 파일 전체를 관리하므로 `apply` 대신 파일을 새로 쓴다.
기존 같은 이름의 skill 이 있으면 먼저 백업한다.

skill로 두는 이유: 위키에 쓸 일이 있을 때만 본문이 로드되어 평상시 토큰을 낭비하지 않고,
프로필별로 다른 권한을 다른 skill로 분리할 수 있다.

## 검증 (출력을 요약하지 말고 그대로 보여준다)

1. MCP 등록을 확인한다. 출력을 fenced code block 으로 그대로 붙인다.

```bash
hermes mcp list
hermes mcp test <서버이름>
```

`hermes mcp test` 가 도구 목록을 반환해야 한다.
2. 이 런타임의 새 세션에서 `mcp__<서버이름>__list_collections` 도구를 호출하고, 받은 콜렉션 이름 목록을 붙인다.
3. 규칙대로 세션 문서 한 건을 만든다(`작성자: <이름>` 서명, `## 배경`, `## 완료 조건` 포함).
4. 다시 검색해 그 문서를 찾고, `## Update` 한 줄을 덧붙인다.
5. 3·4가 성공하면 state에 기록한다.

```bash
node $H agent-add '{"name":"<이름>","machine":"<기기>","kind":"<런타임>","sessions_collection":"<이름> Sessions"}'
node $H step <단계id> done
```

실패하면 done으로 표시하지 않는다. 에러를 읽고 원인을 설명하고 고친 뒤 다시 시도한다.


cron으로만 도는 프로필은 수동 실행 1회로 검증한다.