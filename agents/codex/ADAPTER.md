# 어댑터: Codex

| 항목 | 값 |
|---|---|
| 규칙 주입 위치 | `~/.codex/AGENTS.md` (전역). 프로젝트별은 작업 디렉터리의 `AGENTS.md` |
| 마커 | `<!-- oneagent:rules:start -->` ~ `<!-- oneagent:rules:end -->` |
| 블록 템플릿 | `agents/codex/agents-md-block.ko.md` |
| 설치 단계 | `kna-13-codex` |

## MCP 연결

```bash
codex mcp add <서버이름> --url https://<위키>/mcp
codex mcp login <서버이름>
codex mcp list
```

브라우저 없는 기기:

```bash
codex mcp add <서버이름> --url https://<위키>/mcp --bearer-token-env-var OUTLINE_API_KEY
```

`OUTLINE_API_KEY` 는 Codex가 도는 환경의 mode 600 파일에서만 export 한다.

## 런타임 특성

- Codex는 system prompt를 받지 않고 `AGENTS.md` 만 읽는다. **블록을 짧게 유지**한다.
- `~/.codex/AGENTS.md` 와 프로젝트 `AGENTS.md` 가 모두 읽히므로 규칙은 전역에 한 번만 둔다.
- resume 할 때마다 새 `thread_id` 를 받는다. Claude의 `session_id` 와 형식이 다르므로 세션 저장소를 공유하지 않는다.

## 검증

`codex mcp list` 에서 서버가 보이고, 새 세션에서 세션 문서 한 건을 규칙대로 만든 뒤 다시 읽는다.
