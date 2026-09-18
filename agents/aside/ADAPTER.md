# 어댑터: Aside

Aside는 브라우저 안에서 도는 에이전트다. **브라우저 상태(탭·로그인·쿠키·binding)는 이식할 수 없으므로 기기 로컬**에 남기고, 작업 기록만 공유 위키에 쓴다.

| 항목 | 값 |
|---|---|
| 규칙 주입 위치 | 계정별 `~/.aside/u/<계정>/AGENTS.md` |
| 마커 | `<!-- sharedbrain:rules:start -->` ~ `<!-- sharedbrain:rules:end -->` |
| 블록 템플릿 | `agents/aside/block.md` (설명: `agents-md-block.ko.md`) |
| 기록 방식 | **Outline REST API 직접 호출** (`scripts/aside-wiki.sh`) |
| 설치 단계 | `kna-15-aside` |

## 왜 MCP 가 아니라 REST 인가

`aside mcp` 는 Aside 를 MCP **서버로 노출**하는 명령이다(`aside mcp --help` → "Start the MCP server over stdio").
Aside 는 MCP 를 *제공*하는 쪽이고, 외부 MCP 서버(위키)를 *소비*하는 클라이언트 기능은 확인되지 않았다.

대신 Aside REPL 의 `fetch` 로 Outline REST API 를 직접 호출한다. **Aside 에서는 이것이 우회가 아니라 정식 경로다.**
다른 런타임의 "REST 로 우회하지 않는다" 규칙은 MCP 가 있는 런타임에만 적용된다.

## REPL 제약 (실측)

| 항목 | 결과 |
|---|---|
| `fetch` | 사용 가능. 크로스 오리진 POST + `Authorization` 헤더가 서버에 그대로 도달 |
| 외부 모듈 `import` | **불가** ("External modules are not available in the REPL") |
| `process` / `require` | 없음. REPL 안에서 환경변수를 읽을 수 없다 |
| `fs` | 전역으로 있지만 **세션 디렉터리에 샌드박스** ("Path escapes Project and session roots") |

그래서 `~/.sharedbrain/aside.env` 의 키를 REPL 안에서 읽을 수 없다. **키는 셸에서 치환해 주입한다.**
`scripts/aside-wiki.sh` 가 그 일을 한다.

## 쓰는 법

```bash
# 준비 (한 번만)
mkdir -p ~/.sharedbrain && chmod 700 ~/.sharedbrain
cat > ~/.sharedbrain/aside.env <<'EOF'
SHAREDBRAIN_WIKI_URL=https://wiki.example.com
SHAREDBRAIN_WIKI_KEY=<Outline API key>
SHAREDBRAIN_AGENT=<에이전트 이름>
SHAREDBRAIN_DEVICE=<짧은 호스트 이름>
EOF
chmod 600 ~/.sharedbrain/aside.env

# 연결 확인
scripts/aside-wiki.sh check

# 작업 기록
scripts/aside-wiki.sh run 'const d = await startWork({title:"2026-09-19 · 가격표 확인", collection:"<에이전트> Sessions"}); console.log(d.url)'
scripts/aside-wiki.sh run 'await appendUpdate("<문서id>", "- 가격표 3곳 비교했다")'
scripts/aside-wiki.sh run 'await completeWork("<문서id>", "- 결과: A안 선택. 근거: 스크린샷 대신 수치 3건")'

# 공유 지식 검색 (묻기 전에 먼저)
scripts/aside-wiki.sh run 'console.log(await searchShared("커밋 메시지", "공유 지식"))'

# 계정이 여러 개면
scripts/aside-wiki.sh --account u1 check

# 주입될 코드 확인 (키는 <KEY> 로 마스킹된다)
scripts/aside-wiki.sh print
```

스니펫이 제공하는 함수: `wikiCheck` · `startWork` · `appendUpdate` · `completeWork` · `searchShared` · `findDoc` · `api`.
`startWork` 는 **같은 제목 문서를 먼저 검색**하고 있으면 재개 Update 를 붙인다(중복 생성 금지 규칙의 구현).

## API key

키 이름을 `aside-<계정>-<기기>` 로 만든다. 사고 시 그 키만 폐기한다.
`~/.sharedbrain/aside.env` 는 mode 600 이어야 하고, 래퍼가 권한을 검사해 아니면 거부한다.
키를 코드·대화·위키·커밋에 넣지 않는다. 경로와 변수명까지만 언급한다.

## handoff 모드 (fallback)

위키가 내려갔거나 키가 없을 때는 파일로 남기고 나중에 올린다.

```text
~/.sharedbrain/handoff/aside/<계정>/<날짜>-<작업>.md
  → 위키가 돌아오면 같은 기기의 에이전트가 읽어서 올리고 archive/ 로 옮긴다
```

정상 경로는 직접 쓰기다. handoff 는 장애 시 대비책이다.

## 브라우저 상태

탭·로그인·쿠키·프로필·binding 은 기기 로컬 상태다. 공유하지 않고 다른 기기로 옮기려 하지 않는다.
인증된 화면의 실제 조작은 그 기기에서 계속하고, 다른 기기는 정리·판단·후속 문서 작업만 이어받는다.

## 계정 분리

Aside 는 계정(`u/0`, `u/1` …)마다 별도 브라우저 프로필을 갖는다(`aside account` 로 확인).
개인 계정과 회사 계정을 함께 쓰면 **회사 계정의 규칙 블록에는 반출 금지 문구를 반드시 넣는다.**

## 회사 계정 규칙 (필수)

- 회사 화면의 원문·고유명·내부 URL·수치·스크린샷을 위키에 넣지 않는다.
- 업무명·문제·판단·현재 상태·정본 위치 포인터만 비식별화해 남긴다.
- 판단이 서지 않으면 기록하지 않고 사용자에게 묻는다.

## 검증

```bash
aside account
scripts/aside-wiki.sh check      # 계정과 콜렉션 목록이 나와야 한다
scripts/aside-wiki.sh run 'const d = await startWork({title:"설치 확인", collection:"<에이전트> Sessions"}); console.log(d.created, d.url)'
scripts/aside-wiki.sh run 'const f = await findDoc("설치 확인", "<에이전트> Sessions"); console.log(f ? "재조회 OK" : "실패")'
```

위키에서 그 문서가 보이고 재조회가 되면 통과다.
