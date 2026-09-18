# 어댑터: OpenClaw

OpenClaw는 에이전트별 작업 디렉터리와 지침 파일을 갖는 멀티 에이전트 런타임이다. **에이전트 하나가 registry 로우 하나**다.

| 항목 | 값 |
|---|---|
| 규칙 주입 위치 | 에이전트별 지침 파일 (`~/.openclaw/agents/<에이전트>/AGENTS.md` 또는 런타임이 읽는 지침 경로) |
| 마커 | `<!-- oneagent:rules:start -->` ~ `<!-- oneagent:rules:end -->` |
| 블록 템플릿 | `agents/_shared/block.md` (설명: `wiki-rules.ko.md`) |
| 설치 단계 | `kna-16-openclaw` |

## 역할 분리

OpenClaw 에이전트는 보통 역할이 좁다(블로그 글쓰기, 아카데미 콘텐츠 등). 그래서:

- 위키 권한은 기본 **자기 Sessions + 담당 주제 문서**로 제한한다.
- 정본 승격은 큐레이터 역할 에이전트 한 곳에만 준다.
- 은퇴한 에이전트는 registry에서 `status: retired` 로 두고 규칙 블록을 제거한다. 과거 기록은 위키에 남긴다.

## 런타임 간 이사

같은 정체성이 런타임을 옮기면(예: OpenClaw → Hermes) **콜렉션은 유지하고 규칙 주입 위치만 바꾼다.** registry에는 이전 로우를 `status: retired`, `note: <새 위치>로 이사` 로 남겨 이력을 보존한다.

## 검증

에이전트 세션에서 세션 문서 한 건을 규칙대로 만들고 다시 읽는다.
