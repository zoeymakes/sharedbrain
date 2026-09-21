# 어댑터: Aside

Aside 는 브라우저 안에서 도는 에이전트다. **브라우저 상태(탭·로그인·쿠키·binding)는 이식할 수 없으므로 기기 로컬**에 남기고, 작업 기록만 공유 위키에 쌓인다.

다른 런타임과 달리 **Aside 는 자기 기록을 스스로 쓰지 않는다.** 아래 "왜 수확인가" 참고.

| 항목 | 값 |
|---|---|
| 규칙 주입 위치 | 계정별 `~/.aside/u/<계정>/AGENTS.md` |
| 마커 | `<!-- sharedbrain:rules:start -->` ~ `<!-- sharedbrain:rules:end -->` |
| 블록 템플릿 | `agents/aside/block.md` |
| 기록 방식 | **수확** — 다른 에이전트가 Aside 세션을 읽어 대신 올린다 (`agents/aside/HARVEST.md`) |
| 수확 도구 | `agents/aside/harvest.mjs`, 자동 실행 `agents/aside/harvest-run.sh` |
| 설치 단계 | `kna-15-aside` |

## 왜 수확인가

먼저 MCP 가 안 된다. `aside mcp` 는 Aside 를 MCP **서버로 노출**하는 명령이다(`aside mcp --help` → "Start the MCP server over stdio"). Aside 는 MCP 를 *제공*하는 쪽이고, 외부 MCP 서버(위키)를 *소비*하는 클라이언트 기능은 확인되지 않았다.

그러면 REST 직접 호출이 남는데, **Aside 는 API key 에 닿지 못한다.** REPL 제약(실측):

| 항목 | 결과 |
|---|---|
| `fetch` | 사용 가능. 크로스 오리진 POST + `Authorization` 헤더가 서버에 그대로 도달 |
| 셸 실행 | **없다.** builtin 스킬에 bash/terminal 계열이 없다 |
| 외부 모듈 `import` | 불가 ("External modules are not available in the REPL") |
| `process` / `require` | 없다. 환경변수를 읽을 수 없다 |
| `fs` | `readFile`·`writeFile` 등이 있으나 **Project·세션 루트에 하드 샌드박스**. `~/.sharedbrain/aside.env` 를 읽으면 `Path escapes Project and session roots` |
| `--permission full-access` | **뚫리지 않는다.** 같은 에러. 권한 설정이 아니라 하드 제한이다 |

`aside.projects.list()` 로 보이는 Project 를 만들면 그 루트 안은 읽을 수 있지만, 그러면 **그 Project 안에서 한 작업만** 기록된다. Gmail·Slack 을 오가는 평소 작업은 Project 밖이라 빠진다.

키를 `AGENTS.md` 에 직접 적으면 어디서든 되지만, 임의의 웹페이지를 읽는 브라우저 에이전트의 컨텍스트에 상시 비밀값을 두는 셈이라 프롬프트 인젝션 표면이 생긴다. 채택하지 않는다.

그래서 **셸과 위키 접근을 모두 가진 다른 에이전트가 Aside 세션 기록(`~/.aside/u/<n>/sessions/*/messages.jsonl`)을 읽어 대신 올린다.** 절차는 `agents/aside/HARVEST.md`.

## 서명

문서에는 `작성자: <Aside 에이전트> · 기록: <수확자>` 로 둘 다 남긴다. 일한 주체와 받아적은 주체가 다르기 때문이다. 이것이 "다른 에이전트의 Sessions 콜렉션은 읽기만 한다" 규칙의 유일한 예외다.

## Aside 쪽 규칙이 하는 일

수확자는 Aside 의 대화 기록만 보고 문서를 쓴다. 그래서 `block.md` 는 "위키에 써라" 가 아니라 **"수확되기 좋게 일해라"** 를 지시한다: 목표를 먼저 밝히고, 판단과 근거를 남기고, 결과를 확정하고, 수치와 경로를 그대로 말한다. 말하지 않은 것은 기록되지 않는다.

`{{SHARED_COLLECTION}}` 검색도 Aside 는 못 한다. 필요하면 사용자에게 묻게 한다.

## 계정 분리

Aside 는 계정(`u/0`, `u/1` …)마다 별도 브라우저 프로필을 갖는다(`aside account list`). 계정 하나가 에이전트 하나이고 콜렉션도 따로다. 세션 폴더가 계정별로 나뉘므로 수확 시 섞일 여지가 없다. 매핑은 `harvest.mjs` 의 `AGENTS` 상수가 갖는다.

개인 계정과 회사 계정을 함께 쓰면 **회사 계정 콜렉션의 overview 에 기록 규칙을 반드시 넣는다.** 개인 계정 세션이라도 회사 자료를 다뤘으면 같은 규칙을 적용한다(회사 계정으로 로그인한 구글 시트 등).

## 선택: 셸에서 Aside 이름으로 직접 쓰기

`scripts/aside-wiki.sh` 는 Outline REST 를 Aside REPL 의 `fetch` 로 호출하는 래퍼다. **Aside 자신은 이것을 실행할 수 없다**(셸이 없다). 사람이나 다른 에이전트가 셸에서 쓰는 물건이다.

수확 경로를 쓰면 이 래퍼도, 그 API key 도 필요 없다. 수확자는 자기 MCP 로 쓴다. 굳이 셸에서 Aside 이름으로 직접 쓰고 싶을 때만 설정한다.

```bash
mkdir -p ~/.sharedbrain && chmod 700 ~/.sharedbrain
# ~/.sharedbrain/aside.env (mode 600)
#   SHAREDBRAIN_WIKI_URL / SHAREDBRAIN_WIKI_KEY / SHAREDBRAIN_AGENT / SHAREDBRAIN_DEVICE
scripts/aside-wiki.sh check
scripts/aside-wiki.sh run 'const d = await startWork({title:"...", collection:"<에이전트> Sessions"}); console.log(d.url)'
scripts/aside-wiki.sh --account u1 check          # 계정이 여러 개면
SHAREDBRAIN_ENV=~/.sharedbrain/aside-work.env scripts/aside-wiki.sh --account u1 check
```

계정마다 `.env` 를 따로 두고 `SHAREDBRAIN_ENV` 로 지정한다. 한 파일을 공유하면 회사 기록이 개인 키로 올라간다.

키 이름은 `aside-<계정>-<기기>` 로 만들어 사고 시 그 키만 폐기한다. `.env` 는 mode 600 이어야 하고 래퍼가 검사해 아니면 거부한다. 키를 코드·대화·위키·커밋에 넣지 않는다.

쓰지 않기로 했으면 위키 Settings → API & Access 에서 해당 키를 폐기하고 `.env` 를 지운다.

## 브라우저 상태

탭·로그인·쿠키·프로필·binding 은 기기 로컬 상태다. 공유하지 않고 다른 기기로 옮기려 하지 않는다. 인증된 화면의 실제 조작은 그 기기에서 계속하고, 다른 기기는 정리·판단·후속 문서 작업만 이어받는다.

## 검증

```bash
aside account list                                   # 계정 목록
node agents/aside/harvest.mjs status                 # 대기 세션 수
node agents/aside/harvest.mjs list --limit 3         # 후보
# 수확자를 한 번 돌린다
agents/aside/harvest-run.sh
```

위키의 `<에이전트> Sessions` 에 문서가 생기고 서명이 `작성자: <에이전트> · 기록: <수확자>` 면 통과다.
