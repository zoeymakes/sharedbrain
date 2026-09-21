---
name: kna-15-aside
description: sharedbrain 15단계에 쓴다. Aside 에이전트를 공유 위키에 붙인다. Aside 는 셸이 없고 REPL fs 가 하드 샌드박스되어 API key 에 닿지 못하므로 위키에 스스로 쓰지 못한다. 대신 셸과 위키 MCP 를 가진 다른 에이전트가 Aside 세션 기록을 읽어 대신 올린다(수확). 계정별 AGENTS.md 에 "수확되기 좋게 일해라" 규칙을 넣고, 수확을 한 번 돌려 문서가 생기는지 검증한다. 회사 계정에는 기록 규칙을 필수로 넣는다.
---

# 15단계: Aside 에이전트 연결

사용자와는 사용자가 쓰는 언어로 대화한다. 명령·경로·변수명은 원문 그대로 둔다.
어댑터 계약: `agents/aside/ADAPTER.md`. 사람용 안내: `docs/steps/15-aside.md`.

## 목표

Aside 가 한 작업이 공유 위키의 `<이름> Sessions` 에 쌓이는 상태. **Aside 자신이 쓰지는 않는다.**
브라우저 탭·로그인·쿠키·binding 은 이식할 수 없으므로 기기 로컬에 그대로 둔다.

## 먼저 읽을 것: Aside 는 위키에 스스로 쓰지 못한다

이 단계를 "Aside 에게 위키 쓰기를 가르치는 단계" 로 오해하면 안 된다. 실측 결과 불가능하다.

| 항목 | 결과 |
|---|---|
| 셸 실행 | **없다.** builtin 스킬에 bash/terminal 계열이 없다 |
| `fetch` | 된다 |
| `fs` | Project·세션 루트에 **하드 샌드박스**. 키 파일을 읽으면 `Path escapes Project and session roots` |
| `--permission full-access` | **뚫리지 않는다.** 같은 에러 |
| MCP 소비 | 확인되지 않음. `aside mcp` 는 Aside 를 서버로 노출하는 명령이다 |

그래서 `scripts/aside-wiki.sh` 는 **Aside 가 실행할 수 없는 물건**이다(셸에서 쓰는 래퍼다).
대신 셸과 위키 MCP 를 모두 가진 다른 에이전트가 Aside 세션을 읽어 대신 올린다. 이것이 **수확**이다.

이 단계에는 **API key 가 필요 없다.** 수확자는 자기 MCP 로 쓴다.

## 공통 선행 조건

```bash
H=.claude/skills/kna-status/state.mjs
node $H get wiki.url
node $H get wiki.collections
node $H get language
node $H get agents
```

`steps.08` 이 `done` 이어야 한다(콜렉션 규칙이 이미 있어야 한다).
`steps.07`(Claude Code MCP)은 이 단계 자체에는 필요 없지만, **수확자가 될 에이전트는 위키에 쓸 수 있어야 한다.**
수확자 후보는 `agents[]` 중 `kind` 가 `claude` 또는 `codex` 인 항목이다. 하나도 없으면 07 또는 13 을 먼저 한다.

## 물을 것

한 번에 하나씩 묻는다.

1. **대상 계정.** `aside account list` 출력을 보여주고 어느 계정을 붙일지 묻는다. 개인·회사를 함께 쓰면
   둘 다 붙일지 묻는다. **계정 하나가 에이전트 하나이고 콜렉션도 따로다.**
2. **에이전트 이름.** 계정마다 다른 이름을 쓴다. 다른 런타임의 이름과도 겹치면 안 된다
   (이름이 정체성이고 콜렉션이 이름 단위다). 사용자에게 **반드시 묻는다.** 임의로 짓지 않는다.
3. **수확자.** 위 후보 중 누가 수확할지 묻는다. 기본값은 사용자가 더 여유 있게 쓰는 런타임이다.
4. **개인 계정인가 회사 계정인가.** 회사 계정이면 콜렉션 overview 에 기록 규칙을 필수로 넣는다.

## 절차

### 1. 콜렉션

계정마다 `<이름> Sessions` 콜렉션이 필요하다. 없으면 `kna-08-collections` 를 그 이름으로 돌려 만든다.
회사 계정 콜렉션의 overview 에는 절차 4의 기록 규칙을 함께 넣는다.

### 2. 규칙 블록 주입

```bash
MB=.claude/skills/kna-09-persona/managed-block.mjs
AGENT=<이름> node -e '
const fs = require("fs");
const base = fs.existsSync(".knowanywhere/block-values.json")
  ? JSON.parse(fs.readFileSync(".knowanywhere/block-values.json", "utf8")) : {};
const s = JSON.parse(fs.readFileSync(".knowanywhere/state.json", "utf8"));
const name = process.env.AGENT;
const sess = (s.wiki?.collections?.sessions || []).find((c) => c.name === `${name} Sessions`);
if (!sess) { console.error(`state 에 "${name} Sessions" 콜렉션이 없다. kna-08-collections 를 먼저 한다.`); process.exit(1); }
const v = { ...base, AGENT_NAME: name, RUNTIME: "Aside", WIKI_URL: s.wiki.url,
  SESSIONS_COLLECTION: sess.name, SHARED_COLLECTION: s.wiki.collections.shared.name };
if (!v.PERSONA) v.PERSONA = "- 역할: (한 줄로)\n- 말투: (한 줄로)";
fs.writeFileSync(`.knowanywhere/aside-values-${name}.json`, JSON.stringify(v, null, 2) + "\n");
console.log(JSON.stringify(v, null, 2));
'
node $MB render --template agents/aside/block.md \
                --values .knowanywhere/aside-values-<이름>.json \
                --out .knowanywhere/aside-block-<이름>.md
# dry-run 으로 무엇이 바뀌는지 보여주고 yes 를 받는다
node $MB apply --block .knowanywhere/aside-block-<이름>.md --target ~/.aside/u/<계정번호>/AGENTS.md --dry-run
node $MB apply --block .knowanywhere/aside-block-<이름>.md --target ~/.aside/u/<계정번호>/AGENTS.md
```

계정이 여러 개면 계정마다 반복한다. 렌더링한 블록에 **다른 계정의 이름이 섞이지 않았는지** 확인한다.
`apply` 는 멱등이고 쓰기 전에 `.bak-<타임스탬프>` 백업을 만든다.

블록이 Aside 에게 시키는 것은 "위키에 써라" 가 아니라 **"수확되기 좋게 일해라"** 다. 목표를 먼저 밝히고,
판단과 근거를 남기고, 결과를 확정하고, 수치와 경로를 그대로 말하게 한다. 말하지 않은 것은 기록되지 않는다.

### 3. 수확자 설정

계정 → 에이전트 이름 매핑을 만든다. 파일이 없으면 `harvest.mjs` 가 예시와 함께 exit 2 로 거부한다.

```bash
mkdir -p ~/.sharedbrain && chmod 700 ~/.sharedbrain
cat > ~/.sharedbrain/harvest-agents.json <<'JSON'
{ "u0": "<개인 에이전트 이름>", "u1": "<회사 에이전트 이름>" }
JSON
node agents/aside/harvest.mjs status     # 대기 세션 수가 보이면 경로와 매핑이 맞다
```

수확자가 Codex 면 `--approve-for-me` 로 승인 없이 MCP 쓰기가 되는지 먼저 확인한다(`codex exec --approve-for-me`).
되지 않으면 수확자를 Claude Code 로 바꾼다.

### 4. 회사 계정 기록 규칙 (회사 계정일 때 필수)

콜렉션 overview 와 `agents/aside/HARVEST.md` 양쪽에 있어야 한다. 기본 문안:

- 업무 내용은 자세히 쓰되, **사내 문서·티켓·메일·채팅의 본문을 그대로 옮기지 않는다.** 읽고 이해한 것을
  정리해 쓰고, 원문 위치는 시스템 이름과 문서 제목 수준의 포인터로 남긴다.
- 스크린샷·화면 캡처 원본을 넣지 않는다. 필요한 구조는 말이나 표로 옮긴다.
- 비밀값과 사내 시스템 접속 정보는 어디에도 쓰지 않는다.
- 판단이 서지 않으면 `mark --skip` 하고 사용자에게 묻는다.

사용자가 더 느슨하거나 엄격한 기준을 원하면 그대로 따르되, **무엇을 정했는지 콜렉션 overview 에 남긴다.**
개인 계정 세션이라도 회사 자료를 다뤘으면 같은 규칙을 적용한다.

### 5. 자동 실행 (선택)

매일 한 번 수확하게 하려면 `agents/aside/harvest-run.sh` 를 스케줄러에 건다. macOS 는 launchd 예시가
`agents/aside/launchd/` 에 있다. `StartCalendarInterval` 은 그 시각에 기기가 자고 있으면 깨어날 때,
꺼져 있었으면 다음 부팅 뒤에 한 번 돈다. 밀린 날을 따로 처리할 필요가 없다.
`harvest-state.json` 이 올린 세션을 기억하므로 며칠 만에 돌면 그 사이 세션이 한꺼번에 후보가 된다.

`~/Library/LaunchAgents/` 등 레포 밖을 건드리므로 plist 전문과 명령을 보여주고 yes 를 받는다.

## 검증 (출력을 요약하지 말고 그대로 보여준다)

```bash
aside account list
grep -c '^<!-- sharedbrain:rules:start -->$' ~/.aside/u/<계정번호>/AGENTS.md   # 계정마다 1
node agents/aside/harvest.mjs status
node agents/aside/harvest.mjs list --limit 3
agents/aside/harvest-run.sh          # 또는 수확자에게 1건만 수확시킨다
```

1. 계정마다 마커가 1쌍이고, 블록에 그 계정의 이름만 들어 있다.
2. `harvest.mjs list` 가 세션을 보여준다(경로와 파싱이 맞다).
3. 수확 실행 후 위키의 `<이름> Sessions` 에 문서가 생긴다.
4. 그 문서를 열어 서명이 `작성자: <이름> · 기록: <수확자>` 인지, 콜렉션이 맞는지 확인한다.
5. 계정이 여러 개면 **각 계정 세션이 자기 콜렉션에만 들어갔는지** 확인한다.

모두 통과하면 state 에 기록한다. 계정마다 한 줄씩 넣는다.

```bash
H=.claude/skills/kna-status/state.mjs
node $H agent-add '{"name":"<이름>","machine":"<기기>","kind":"aside","sessions_collection":"<이름> Sessions"}'
node $H step 15 done
```

실패하면 `done` 으로 표시하지 않는다. 에러를 읽고 원인을 설명하고 고친 뒤 다시 시도한다.

| 증상 | 원인과 조치 |
|---|---|
| `harvest.mjs list` 가 비어 있다 | 계정 번호나 경로가 다르다. `ls ~/.aside/u/` 확인 |
| 수확자가 MCP 쓰기에서 멈춘다 | 비대화형 승인이 막혔다. Codex 는 `--approve-for-me` |
| 문서가 엉뚱한 콜렉션에 갔다 | `~/.sharedbrain/harvest-agents.json` 의 매핑 확인 |
| 문서에 `\n` 이 문자 그대로 보인다 | 수확자가 이스케이프를 넣었다. `HARVEST.md` 의 "흔한 실수" 참고 |

## 선택: 셸에서 Aside 이름으로 직접 쓰기

수확 경로를 쓰면 API key 가 필요 없다. 굳이 셸에서 Aside 이름으로 직접 쓰고 싶을 때만
`scripts/aside-wiki.sh` 와 `~/.sharedbrain/aside.env` 를 설정한다. 절차는 `agents/aside/ADAPTER.md`.
**Aside 자신은 이 래퍼를 실행할 수 없다.** 계정마다 `.env` 를 따로 두고 `SHAREDBRAIN_ENV` 로 지정한다.
한 파일을 공유하면 회사 기록이 개인 키로 올라간다.
