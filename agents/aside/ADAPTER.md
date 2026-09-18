# 어댑터: Aside

Aside는 브라우저 안에서 도는 에이전트다. **브라우저 상태(탭·로그인·쿠키·binding)는 이식할 수 없으므로 철저히 기기 로컬**로 남긴다. 공유하는 것은 작업 기록뿐이다.

| 항목 | 값 |
|---|---|
| 규칙 주입 위치 | 계정별 `~/.aside/u/<계정>/AGENTS.md` |
| 마커 | `<!-- oneagent:rules:start -->` ~ `<!-- oneagent:rules:end -->` |
| 블록 템플릿 | `agents/aside/block.md` (설명: `agents-md-block.ko.md`) |
| 기록 방식 | **handoff 모드** (아래 참조) |
| 설치 단계 | `kna-15-aside` |

## 왜 handoff 모드인가 (중요)

`aside mcp` 는 **Aside를 MCP 서버로 노출하는 명령**이다(`aside mcp --help` → "Start the MCP server over stdio").
즉 Aside는 MCP를 *제공*하는 쪽이고, 외부 MCP 서버(위키)를 *소비*하는 클라이언트 기능은 확인되지 않았다.
따라서 Aside가 위키에 직접 쓰는 경로를 전제하지 않는다.

대신 이렇게 운영한다.

```text
Aside (브라우저 작업)
  └─ 작업 끝/중단 시 handoff 파일 작성
        ~/.oneagent/handoff/aside/<계정>/<YYYY-MM-DD>-<작업슬러그>.md
             ↓ 같은 기기의 Hermes 또는 Claude Code가 읽음
        위키의 `<에이전트> Sessions` 에 규칙대로 기록
```

## handoff 파일 형식

```markdown
---
agent: <에이전트 이름>
runtime: aside
account: <계정 id>
device: <짧은 호스트 이름>
session: <Aside 세션 id>
status: 진행 중 | 완료 | 차단됨
created: <YYYY-MM-DD HH:MM TZ>
sensitivity: 개인 | 회사-비식별화필요
---

## 사용자 요청
## 한 일
## 결과
## 산출물 경로
## 남은 일과 이어받는 방법
```

- 파일 경로와 확장자를 고정한다. 읽는 쪽은 `~/.oneagent/handoff/aside/` 를 스캔하면 된다.
- 위키에 기록한 handoff는 `.done` 으로 확장자를 바꾸거나 `archive/` 로 옮겨 중복 기록을 막는다.
- 인증된 화면의 실제 조작은 이 기기에서 계속하고, 다른 기기는 정리·판단·후속 문서 작업만 이어받는다.

## 계정 분리

Aside는 계정(`u/0`, `u/1` …)마다 별도 브라우저 프로필을 갖는다(`aside account` 로 확인).
개인 계정과 회사 계정을 함께 쓰면 **회사 계정의 규칙 블록에는 반출 금지 문구를 반드시 넣는다.**

## 회사 계정 규칙 (필수)

- 회사 화면의 원문·고유명·내부 URL·수치·스크린샷을 위키나 handoff 파일에 넣지 않는다.
- 업무명·문제·판단·현재 상태·정본 위치 포인터만 비식별화해 남긴다.
- 판단이 서지 않으면 기록하지 않고 사용자에게 묻는다.

## 검증

```bash
aside account                                   # 계정 목록
ls ~/.oneagent/handoff/aside/<계정>/             # handoff 파일이 생겼는지
```

handoff 파일 1건을 만들고, 같은 기기의 Hermes 또는 Claude Code가 그것을 읽어 위키에 문서를 만든 뒤
그 문서를 다시 검색해 찾으면 통과다.
