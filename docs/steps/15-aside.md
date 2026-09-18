# 15단계: Aside 에이전트 연결

스킬: `kna-15-aside`. 선택 단계이며 Aside를 쓸 때만 돈다.

어댑터 계약: [`agents/aside/ADAPTER.md`](../../agents/aside/ADAPTER.md)

## Aside만 기록 경로가 다르다

`aside mcp` 는 Aside를 MCP **서버로 노출**하는 명령이다. 외부 MCP 서버(위키)를 소비하는 클라이언트
기능은 확인되지 않았다. 그래서 Aside는 REPL의 `fetch` 로 **Outline REST API를 직접 호출한다.**

```text
Aside (브라우저 작업)
  └─ scripts/aside-wiki.sh → Outline REST API → 위키에 바로 기록
```

다른 런타임의 "REST로 우회하지 않는다" 규칙은 MCP가 있는 런타임에만 적용된다.
Aside에서 REST는 우회가 아니라 유일한 정식 경로다.

## REPL 제약과 키 주입

실제로 확인한 제약이다.

| 항목 | 결과 |
|---|---|
| `fetch` | 사용 가능. 크로스 오리진 POST + `Authorization` 헤더가 서버에 그대로 도달 |
| 외부 모듈 `import` | 불가 |
| `process` / `require` | 없음 |
| `fs` | 있지만 세션 디렉터리에 샌드박스 |

그래서 REPL 안에서 키 파일을 읽을 수 없다. **키는 셸에서 치환해 주입한다.**
`scripts/aside-wiki.sh` 가 `~/.sharedbrain/aside.env`(mode 600)를 읽어 스니펫에 넣고 실행한다.
권한이 600이 아니면 실행을 거부하고, `print` 명령은 키를 `<KEY>` 로 마스킹한다.

## 준비

```bash
mkdir -p ~/.sharedbrain && chmod 700 ~/.sharedbrain
cat > ~/.sharedbrain/aside.env <<'EOF'
SHAREDBRAIN_WIKI_URL=https://wiki.example.com
SHAREDBRAIN_WIKI_KEY=<Outline API key>
SHAREDBRAIN_AGENT=<에이전트 이름>
SHAREDBRAIN_DEVICE=<짧은 호스트 이름>
EOF
chmod 600 ~/.sharedbrain/aside.env
```

키 이름은 위키에서 `aside-<계정>-<기기>` 로 만든다. 사고 시 그 키만 폐기한다.

## 쓰는 법

```bash
scripts/aside-wiki.sh check                    # 계정·콜렉션 확인
scripts/aside-wiki.sh print                    # 주입될 코드 확인 (키는 마스킹)
scripts/aside-wiki.sh --account u1 check       # 계정이 여러 개면

scripts/aside-wiki.sh run 'const d = await startWork({title:"2026-09-19 · 가격표 확인", collection:"<이름> Sessions"}); console.log(d.url)'
scripts/aside-wiki.sh run 'await appendUpdate("<문서id>", "- 가격표 3곳 비교했다")'
scripts/aside-wiki.sh run 'await completeWork("<문서id>", "- 결과와 검증 근거")'
scripts/aside-wiki.sh run 'console.log(await searchShared("커밋 메시지", "공유 지식"))'
```

`startWork` 는 같은 제목 문서를 **먼저 검색**하고 있으면 재개 Update를 붙인다. 중복 생성 금지 규칙의 구현이다.

## 브라우저 상태는 공유하지 않는다

탭·로그인·쿠키·브라우저 프로필·binding은 이식할 수 없다. 동기화하려 하지 않는다.
인증된 화면의 실제 조작은 그 기기에서 계속하고, 다른 기기는 정리·판단·후속 문서 작업만 이어받는다.

## 계정 분리

Aside는 계정(`u/0`, `u/1` …)마다 별도 브라우저 프로필을 갖는다. `aside account` 로 확인한다.
개인 계정과 회사 계정을 함께 쓰면 **회사 계정의 규칙 블록에는 반출 금지 문구를 반드시 넣는다.**

## 회사 계정 규칙 (필수)

- 회사 화면의 원문·고유명·내부 URL·수치·스크린샷을 위키에 넣지 않는다.
- 업무명·문제·판단·현재 상태·정본 위치 포인터만 비식별화해 남긴다.
- 판단이 서지 않으면 기록하지 않고 사용자에게 묻는다.

## handoff 는 fallback

위키가 내려갔거나 키가 없을 때만 `~/.sharedbrain/handoff/aside/<계정>/` 에 파일로 남기고,
위키가 돌아오면 같은 기기의 에이전트가 읽어 올린 뒤 `archive/` 로 옮긴다. 정상 경로는 직접 쓰기다.

## 검증

```bash
aside account
scripts/aside-wiki.sh check
scripts/aside-wiki.sh run 'const d = await startWork({title:"설치 확인", collection:"<이름> Sessions"}); console.log(d.created, d.url)'
scripts/aside-wiki.sh run 'const f = await findDoc("설치 확인", "<이름> Sessions"); console.log(f ? "재조회 OK" : "실패")'
```

문서가 만들어지고 재조회되며 위키 웹 UI에서 서명이 보이면 통과다.

## 상태

REST 호출 경로(POST + Bearer + JSON)와 래퍼 동작은 실제로 확인했다.
**실제 Outline 인스턴스를 상대로 한 문서 생성은 위키를 세운 뒤 확인해야 한다.**
