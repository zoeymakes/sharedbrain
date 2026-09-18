# 16단계: OpenClaw 에이전트 연결

스킬: `kna-16-openclaw`. 선택 단계이며 OpenClaw를 쓸 때만 돈다.

어댑터 계약: [`agents/openclaw/ADAPTER.md`](../../agents/openclaw/ADAPTER.md)

## 에이전트 하나가 registry 로우 하나다

OpenClaw는 에이전트별 작업 디렉터리와 지침 파일을 갖는 멀티 에이전트 런타임이다.
붙일 에이전트마다 이 단계를 반복한다. `status: retired` 인 에이전트는 붙이지 않는다.

## 권한

OpenClaw 에이전트는 보통 역할이 좁다(특정 주제 글쓰기, 특정 영역 콘텐츠 등). 기본값은
**자기 Sessions + 담당 주제 문서**로 제한한다. 정본 승격은 큐레이터 역할 에이전트 한 곳에만 준다.

## MCP 등록

```bash
openclaw mcp add <서버이름> --url https://<위키>/mcp
openclaw mcp list
openclaw mcp probe
openclaw mcp doctor
```

설정을 바꾼 뒤에는 `openclaw mcp reload` 로 캐시된 런타임을 비운다.
상시 실행이면 API key(`openclaw-<에이전트>-<기기>`)를 쓴다.

## 은퇴와 런타임 이사

- **은퇴:** registry를 `status: retired` 로 바꾸고 규칙 블록을 제거한다. 과거 기록은 위키에 남긴다.
- **이사(예: OpenClaw → Hermes):** 콜렉션은 유지하고 규칙 주입 위치만 바꾼다.
  registry에는 이전 로우를 `status: retired`, `note: <새 위치>로 이사` 로 남겨 이력을 보존한다.
  기록의 출처를 추적할 수 있어야 하므로 로우를 지우지 않는다.

## 검증

이 단계는 다음이 모두 확인돼야 `done` 이다.

1. MCP 등록 확인 명령이 위키 서버를 보여준다.
2. 그 런타임의 새 세션에서 `list_collections` 가 콜렉션 목록을 반환한다.
3. 규칙대로 세션 문서 한 건이 만들어진다.
4. 다시 검색해 그 문서를 찾고 `## Update` 를 덧붙일 수 있다.

실패하면 `done` 으로 표시하지 않는다. 상세 절차는 스킬 파일에 있다.

## 상태

명령·설정 스키마는 실제 설치본에서 확인했지만, **종단 실행(위키 생성 → 연결 → 기기 간 이어받기)은
아직 검증되지 않았다.** 따라 하다 막히면 이슈로 알려 주면 고친다.
