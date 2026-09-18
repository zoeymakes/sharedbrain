---
name: kna-15-aside
description: sharedbrain 15단계에 쓴다. Aside 에이전트를 공유 위키에 붙인다. Aside는 MCP를 제공하는 쪽이라 위키 MCP를 소비하지 못하므로 Outline REST API를 REPL fetch로 직접 호출한다. API key를 mode 600 파일에 두고 scripts/aside-wiki.sh 로 주입하며, 계정별 AGENTS.md에 규칙 블록을 넣고 실제 문서 생성·재조회로 검증한다. 회사 계정에는 반출 금지 규칙을 필수로 넣는다.
---

# 15단계: Aside 에이전트 연결

사용자와는 사용자가 쓰는 언어로 대화한다. 명령·경로·변수명은 원문 그대로 둔다.
어댑터 계약: `agents/aside/ADAPTER.md`. 사람용 안내: `docs/steps/15-aside.md`.

## 목표

Aside가 작업 기록을 공유 위키에 **직접** 쓰는 상태. 중계자 없이 동작한다.
브라우저 탭·로그인·쿠키·binding은 이식할 수 없으므로 기기 로컬에 그대로 둔다.

## 공통 선행 조건

```bash
H=.claude/skills/kna-status/state.mjs
node $H get wiki.url
node $H get wiki.collections
node $H get language
```

`steps.08` 이 `done` 이어야 한다(콜렉션 규칙이 이미 있어야 한다).
`steps.07`(Claude Code MCP)은 이 단계에 필요하지 않다. Aside는 MCP를 쓰지 않는다.

## 왜 REST 인가

`aside mcp` 는 Aside를 MCP **서버로 노출**하는 명령이다. 위키 MCP를 소비하는 클라이언트 기능은 확인되지 않았다.
그래서 REPL의 `fetch` 로 Outline REST API를 직접 호출한다. Aside에서는 이것이 정식 경로다.

REPL 제약(실측): 외부 모듈 `import` 불가, `process`·`require` 없음, `fs` 는 세션 디렉터리에 샌드박스.
따라서 키를 REPL 안에서 읽을 수 없고 **셸에서 치환해 주입**한다. `scripts/aside-wiki.sh` 가 그 일을 한다.

## 물을 것

한 번에 하나씩 묻는다.

1. **대상 계정.** `aside account` 출력을 보여주고 어느 계정을 붙일지 묻는다.
2. **에이전트 이름.** registry의 `runtime: aside` 로우 이름을 기본값으로 제안한다.
   다른 런타임과 **다른 이름**을 쓴다(이름이 정체성이고 콜렉션이 이름 단위다).
3. **개인 계정인가 회사 계정인가.** 회사 계정이면 반출 금지 규칙을 필수로 넣는다.

## 절차

### 1. 콜렉션 확인

`<이름> Sessions` 콜렉션이 없으면 `kna-08-collections` 를 이 이름으로 다시 돌려 만든다.

### 2. API key 발급과 저장

위키 **Settings > API & Access** 에서 키를 만든다. 이름은 `aside-<계정>-<기기>` 로 에이전트별로 만든다.
사고 시 그 키만 폐기할 수 있다. 키는 만든 직후 한 번만 보인다.

**Claude Code 밖의 사용자 터미널에서** 실행하게 안내한다. 키를 대화에 붙여 넣지 않는다.

```bash
mkdir -p ~/.sharedbrain && chmod 700 ~/.sharedbrain
cat > ~/.sharedbrain/aside.env <<'EOF'
SHAREDBRAIN_WIKI_URL=<wiki.url>
SHAREDBRAIN_WIKI_KEY=<여기에 키를 직접 붙여 넣는다>
SHAREDBRAIN_AGENT=<에이전트 이름>
SHAREDBRAIN_DEVICE=<hostname -s 결과>
EOF
chmod 600 ~/.sharedbrain/aside.env
```

래퍼가 권한을 검사한다. mode 600이 아니면 실행을 거부한다.

### 3. 연결 확인

```bash
scripts/aside-wiki.sh check
```

계정 이름과 콜렉션 목록이 나와야 한다. 출력을 fenced code block으로 그대로 보여준다.

| 증상 | 원인 | 조치 |
|---|---|---|
| `설정 파일이 없다` | 2번을 안 했다 | 2번으로 돌아간다 |
| `권한이 644 이다` | mode 600이 아니다 | `chmod 600 ~/.sharedbrain/aside.env` |
| `auth.info: HTTP 401` | 키가 틀렸거나 폐기됐다 | 위키에서 키를 다시 만든다 |
| `collections.list: HTTP 404` | 위키 주소가 틀렸다 | `SHAREDBRAIN_WIKI_URL` 확인 |

### 4. 규칙 블록 주입

```bash
MB=.claude/skills/kna-09-persona/managed-block.mjs
# 값 JSON: 09단계 파일을 재사용하되 이 에이전트 이름·런타임·콜렉션으로 덮어쓴다
node -e '
const fs = require("fs");
const base = fs.existsSync(".knowanywhere/block-values.json")
  ? JSON.parse(fs.readFileSync(".knowanywhere/block-values.json", "utf8")) : {};
const s = JSON.parse(fs.readFileSync(".knowanywhere/state.json", "utf8"));
const name = process.env.AGENT;
const sess = (s.wiki?.collections?.sessions || []).find((c) => c.name === `${name} Sessions`);
if (!sess) { console.error(`state 에 "${name} Sessions" 콜렉션이 없다. kna-08-collections 를 먼저 한다.`); process.exit(1); }
const v = { ...base, AGENT_NAME: name, RUNTIME: "Aside", WIKI_URL: s.wiki.url,
  MCP_SERVER_NAME: "(사용하지 않음. REST 직접 호출)",
  SESSIONS_COLLECTION: sess.name, SHARED_COLLECTION: s.wiki.collections.shared.name };
if (!v.PERSONA) v.PERSONA = "- 역할: (한 줄로)\n- 말투: (한 줄로)";
fs.writeFileSync(".knowanywhere/aside-values.json", JSON.stringify(v, null, 2) + "\n");
console.log(JSON.stringify(v, null, 2));
'
node $MB render --template agents/aside/block.md \
                --values .knowanywhere/aside-values.json \
                --out .knowanywhere/aside-block.md
# dry-run 으로 무엇이 바뀌는지 보여주고 yes 를 받는다
node $MB apply --block .knowanywhere/aside-block.md --target ~/.aside/u/<계정>/AGENTS.md --dry-run
node $MB apply --block .knowanywhere/aside-block.md --target ~/.aside/u/<계정>/AGENTS.md
```

`apply` 는 멱등이고 쓰기 전에 `.bak-<타임스탬프>` 백업을 만든다.

### 5. 회사 계정 추가 규칙 (회사 계정일 때 필수)

블록에 다음을 반드시 넣는다.

- 회사 화면의 원문·고유명·내부 URL·수치·스크린샷을 위키에 넣지 않는다.
- 업무명·문제·판단·현재 상태·정본 위치 포인터만 비식별화해 남긴다.
- 판단이 서지 않으면 기록하지 않고 사용자에게 묻는다.

## 검증 (출력을 요약하지 말고 그대로 보여준다)

```bash
aside account
scripts/aside-wiki.sh check
scripts/aside-wiki.sh run 'const d = await startWork({title:"설치 확인", collection:"<이름> Sessions", background:"15단계 검증", doneWhen:"문서가 위키에 보이고 재조회된다"}); console.log(d.created, d.url)'
scripts/aside-wiki.sh run 'const f = await findDoc("설치 확인", "<이름> Sessions"); console.log(f ? "재조회 OK " + f.url : "실패")'
scripts/aside-wiki.sh run 'await appendUpdate("<위 문서 id>", "- 15단계 검증 완료")'
```

1. `check` 가 계정과 콜렉션을 보여준다.
2. `startWork` 가 `true <url>` 을 출력한다(문서 생성).
3. `findDoc` 이 그 문서를 다시 찾는다(검색 동작 = 중복 생성 방지가 작동함).
4. `appendUpdate` 가 성공한다.
5. 위키 웹 UI에서 그 문서를 열어 서명과 `## Update` 가 보이는지 확인한다.

모두 통과하면 state에 기록한다.

```bash
H=.claude/skills/kna-status/state.mjs
node $H agent-add '{"name":"<이름>","machine":"<기기>","kind":"aside","sessions_collection":"<이름> Sessions"}'
node $H step 15 done
```

실패하면 `done` 으로 표시하지 않는다. 에러를 읽고 원인을 설명하고 고친 뒤 다시 시도한다.

## handoff 는 fallback 이다

위키가 내려갔거나 키가 없을 때만 파일로 남긴다.

```bash
mkdir -p ~/.sharedbrain/handoff/aside/<계정>/archive
```

위키가 돌아오면 같은 기기의 에이전트가 읽어 올리고 `archive/` 로 옮긴다. 정상 경로는 직접 쓰기다.
