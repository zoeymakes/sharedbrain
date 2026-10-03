# 15단계: Aside 에이전트 연결

스킬: `kna-15-aside`. 선택 단계이며 Aside를 쓸 때만 돈다.

어댑터 계약: [`agents/aside/ADAPTER.md`](../../agents/aside/ADAPTER.md)
수확 절차: [`agents/aside/HARVEST.md`](../../agents/aside/HARVEST.md)

## 두 모드: 직접 쓰기와 수확

Aside 는 버전에 따라 셸(bash 도구)이 있기도 하고 없기도 하다. 그래서 계정마다 먼저 셸을 검사하고 모드를 고른다.

| 모드 | 언제 | 어떻게 |
|---|---|---|
| **A. 직접 쓰기** | 셸이 있다 (2026-10 실측: 1.26.810.1915) | Aside 가 계정 전용 키 파일을 읽어 `curl` 로 Outline API 를 부른다. 블록: `agents/aside/block-direct.md` |
| **B. 수확** | 셸이 없다 (2026-09 실측: 구버전), 또는 키를 Aside 에 두기 싫다 | 다른 에이전트가 Aside 세션 기록을 읽어 대신 올린다. 블록: `agents/aside/block.md` |

셸 검사(계정마다, Aside 세션 하나와 모델 호출이 생긴다):

```bash
aside exec --account <계정번호> "bash 도구로 다음을 실행하고 출력만 그대로 답해: echo HOME=\$HOME; command -v curl python3. bash 도구가 없으면 NO_SHELL 이라고만 답해."
```

`HOME=...` 이 나오면 A, `NO_SHELL` 이면 B 다. 셸이 있을 때 Aside 셸의 홈은 진짜 홈이 아니라
`~/.aside/runtime/home` 이고 모든 계정이 공용이다. 그래서 키 파일은 계정마다 따로 둔다:
`~/.aside/runtime/home/.sharedbrain/aside-<계정>.env` (mode 600). 키는 위키에서 계정마다
`aside-<계정>-<기기>` 이름으로 만들고, 사용자 터미널에서 `read -rs` 로 넣는다.

A 는 웹페이지를 읽는 브라우저 에이전트가 키 파일에 닿는 구성이다. 계정 전용 키라 사고 시 그 키만 폐기하면
되지만, 이 위험을 받아들이지 않으면 셸이 있어도 B 를 쓴다.

**A 계정은 `~/.sharedbrain/harvest-agents.json` 에 넣지 않는다.** 수확기는 매핑에 있는 계정만 돌기 때문에,
넣으면 같은 작업이 두 번 기록된다.

아래부터 "왜 직접 못 쓰는가"까지는 B(수확)의 구조와 그 배경이다.

```text
Aside (브라우저 작업)
  └─ ~/.aside/u/<계정>/sessions/*/messages.jsonl   (Aside 가 남기는 대화 기록)
        └─ 수확자 (Claude Code 또는 Codex)
              └─ 위키 MCP → <Aside 에이전트> Sessions
                   서명: 작성자: <Aside 에이전트> · 기록: <수확자>
```

"다른 에이전트의 Sessions 콜렉션은 읽기만 한다" 규칙의 유일한 예외다. 그래서 서명에 일한 주체와
받아적은 주체를 모두 남긴다.

## 왜 직접 못 쓰는가 (셸이 없는 버전)

셸이 없는 버전에서는 두 경로가 모두 막힌다.

**MCP.** `aside mcp` 는 Aside를 MCP **서버로 노출**하는 명령이다. 외부 MCP 서버(위키)를 소비하는
클라이언트 기능은 확인되지 않았다.

**REST 직접 호출.** `fetch` 는 되지만 **API key 에 닿지 못한다.** 실측한 REPL 제약이다.

| 항목 | 결과 |
|---|---|
| `fetch` | 사용 가능. 크로스 오리진 POST + `Authorization` 헤더가 서버에 그대로 도달 |
| 셸 실행 | **없다.** builtin 스킬에 bash/terminal 계열이 없다 |
| 외부 모듈 `import` | 불가 |
| `process` / `require` | 없음. 환경변수를 읽을 수 없다 |
| `fs` | `readFile` 등이 있으나 **Project·세션 루트에 하드 샌드박스** |
| `--permission full-access` | **뚫리지 않는다** |

키 파일을 읽으려 하면 이렇게 끝난다.

```text
Path escapes Project and session roots: /Users/me/.sharedbrain/aside.env
```

권한 설정 문제가 아니라 하드 제한이라 `--permission full-access` 로도 같은 에러가 난다.

검토했지만 쓰지 않은 우회 두 가지:

- **Aside Project 를 만들어 그 루트에 키를 둔다.** 읽기는 열리지만 **그 Project 안에서 한 작업만**
  기록된다. Gmail·Slack 을 오가는 평소 작업은 Project 밖이라 빠진다.
- **`AGENTS.md` 에 키를 직접 적는다.** 어디서든 되지만, 임의의 웹페이지를 읽는 브라우저 에이전트의
  컨텍스트에 상시 비밀값을 두는 셈이다. 프롬프트 인젝션 표면이 생긴다.

## B 모드에는 API key 가 필요 없다

수확자는 자기 MCP 로 쓴다. B 계정용 Outline API key 를 만들 필요가 없다.

`scripts/aside-wiki.sh` 는 사람이나 다른 에이전트가 **자기 셸에서** Aside 이름으로 쓰고 싶을 때만 쓰는
선택 도구다. Aside 셸(A 모드)에서는 레포 경로에 접근하지 못해 돌지 않는다. A 의 Aside 는 블록의 인라인
`curl` 을 쓴다.
쓰지 않기로 했으면 키를 만들지 않는다. 이미 만들었으면 위키 Settings → API & Access 에서 폐기하고
`~/.sharedbrain/*.env` 를 지운다.

## Aside 쪽 규칙이 하는 일

A 블록(`block-direct.md`)은 다른 런타임과 같은 위키 규칙이다. 세션 문서 골격, `## 공유 지식 반영`, 공유 지식
계층을 그대로 따르고, 키를 출력·복사하지 말라는 규칙이 더 붙는다.

B 블록에서는 수확자가 Aside 의 **대화 기록만** 보고 문서를 쓴다. 그래서 `~/.aside/u/<계정>/AGENTS.md` 에 넣는 블록은
"위키에 써라" 가 아니라 **"수확되기 좋게 일해라"** 를 지시한다.

- 작업을 시작할 때 목표를 한 줄로 밝힌다.
- "A 로 했다" 가 아니라 "B 도 봤지만 A 로 했다, 이유는 …" 으로 판단과 근거를 남긴다.
- 끝낼 때 무엇이 달성됐고 무엇이 남았는지 확정한다.
- "여러 개" 대신 실제 개수, "그 시트" 대신 문서 이름. 수치와 경로를 그대로 말한다.

말하지 않은 것은 기록되지 않는다.

`공유 지식` 검색도 Aside 는 못 한다. 필요하면 사용자에게 묻게 한다.

## 계정 분리

Aside 는 계정마다 별도 브라우저 프로필을 갖는다(`aside account list`). **계정 하나가 에이전트 하나이고
콜렉션도 따로다.** 세션 폴더가 계정별로 나뉘므로 수확 시 섞일 여지가 없다.

```text
~/.aside/u/0/sessions/  →  <개인 에이전트> Sessions
~/.aside/u/1/sessions/  →  <회사 에이전트> Sessions
```

매핑은 `~/.sharedbrain/harvest-agents.json` 에 둔다: `{ "u0": "<개인 에이전트 이름>", "u1": "<회사 에이전트 이름>" }`

## 회사 계정 기록 규칙

회사 계정을 붙이면 그 콜렉션 overview 에 기록 규칙을 넣는다. 기본 문안은 이렇다.

- 업무 내용은 자세히 쓰되, 사내 문서·티켓·메일·채팅의 본문을 그대로 옮기지 않는다. 읽고 이해한 것을
  정리해 쓰고, 원문 위치는 시스템 이름과 문서 제목 수준의 포인터로 남긴다.
- 스크린샷·화면 캡처 원본을 넣지 않는다.
- 비밀값과 사내 시스템 접속 정보는 어디에도 쓰지 않는다.
- 판단이 서지 않으면 건너뛰고 사용자에게 묻는다.

더 느슨하거나 엄격하게 해도 되지만, **무엇을 정했는지 콜렉션 overview 에 남긴다.** 개인 계정 세션이라도
회사 자료를 다뤘으면 같은 규칙을 적용한다.

## 수확 실행

```bash
node agents/aside/harvest.mjs status                 # 남은 세션 수
node agents/aside/harvest.mjs list --limit 10        # 아직 안 올린 세션
node agents/aside/harvest.mjs read <account> <id>    # 추려낸 대화
node agents/aside/harvest.mjs mark <account> <id> --doc <URL>
agents/aside/harvest-run.sh                          # 수확자를 한 번 돌린다
```

무엇을 남기고 무엇을 버릴지는 수확자가 판단한다. 잡담·단순 조회·같은 내용의 반복 확인은 건너뛰고
사유를 `~/.sharedbrain/harvest-state.json` 에 남긴다. 도구는 읽기·추려내기·중복 방지만 한다.

## 자동 실행 (선택)

매일 한 번 돌리려면 `agents/aside/harvest-run.sh` 를 스케줄러에 건다. macOS 는 launchd 예시가
`agents/aside/launchd/` 에 있다.

```bash
cp agents/aside/launchd/com.example.sharedbrain.harvest.plist ~/Library/LaunchAgents/
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.example.sharedbrain.harvest.plist
```

plist 안의 경로(레포 위치, `PATH` 의 node·codex 경로)를 자기 환경에 맞게 고친다.
`StartCalendarInterval` 은 그 시각에 기기가 자고 있으면 깨어날 때, 꺼져 있었으면 다음 부팅 뒤에 한 번
돈다. **밀린 날을 따로 처리할 필요가 없다.** `harvest-state.json` 이 올린 세션을 기억하므로 며칠 만에
돌면 그 사이 세션이 한꺼번에 후보가 된다.

한 번에 처리할 세션 수는 `SHAREDBRAIN_HARVEST_LIMIT`(기본 12)로 조정한다. 로그는
`~/.sharedbrain/harvest.log`.

## 검증

A 계정:

1. `AGENTS.md` 에 마커가 1쌍이고 그 계정의 이름과 키 파일 경로만 들어 있다.
2. 키 파일이 `-rw-------` 다.
3. `aside exec --account <n>` 으로 테스트 세션 문서를 만들고 Update 한 줄을 붙이게 한다. 다른 에이전트의 MCP 로
   그 문서가 `<이름> Sessions` 에 있고 첫 줄이 `작성자: <이름>` 인지 확인한다.
4. 그 계정이 `harvest-agents.json` 에 없다.

B 계정:

1. 계정마다 `AGENTS.md` 에 마커가 1쌍이고, 그 계정의 이름만 들어 있다.
2. `harvest.mjs list` 가 세션을 보여준다.
3. 수확 실행 후 위키의 `<이름> Sessions` 에 문서가 생긴다.
4. 서명이 `작성자: <이름> · 기록: <수확자>` 다.
5. 계정이 여러 개면 각 계정 세션이 자기 콜렉션에만 들어갔다.

## 잘 안 될 때

| 증상 | 원인과 조치 |
|---|---|
| `harvest.mjs list` 가 비어 있다 | 계정 번호나 경로가 다르다. `ls ~/.aside/u/` 확인 |
| 수확자가 MCP 쓰기에서 멈춘다 | 비대화형 승인이 막혔다. Codex 는 `--approve-for-me` |
| 문서가 엉뚱한 콜렉션에 갔다 | `~/.sharedbrain/harvest-agents.json` 의 매핑 확인 |
| 문서에 `\n` 이 문자 그대로 보인다 | 수확자가 이스케이프를 넣었다. `HARVEST.md` 의 "흔한 실수" 참고 |
| A: Aside 가 키 파일을 못 찾는다 | 셸 홈이 다르다. 셸 검사 때 나온 `HOME` 기준으로 경로를 다시 잡는다 |
| 같은 작업이 두 번 기록된다 | A 계정이 수확 매핑에 들어 있다. 매핑에서 뺀다 |
| launchd 가 안 돈다 | `launchctl print gui/$(id -u)/<label>` 로 상태와 경로 확인. plist 의 `PATH` 에 node·codex 경로가 있는지 본다 |
