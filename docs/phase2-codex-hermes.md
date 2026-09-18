# (구) Phase 2 메모 — 현재는 13~16단계로 대체됨

> **이 문서는 원작(kubony/knowanywhere)의 설계 메모다.** 원작 v1은 Claude Code만 설치하고
> Codex·Hermes는 수동 연결을 전제했다. 이 레포는 그 부분을 **정식 설치 단계로 대체**했으므로
> 아래 "수동으로 붙이는 순서"는 더 이상 따르지 않는다.

## 지금 따라야 할 것

| 런타임 | 단계 | 문서 |
|---|---|---|
| Codex | `kna-13-codex` | [docs/steps/13-codex.md](steps/13-codex.md) · [어댑터](../agents/codex/ADAPTER.md) |
| Hermes | `kna-14-hermes` | [docs/steps/14-hermes.md](steps/14-hermes.md) · [어댑터](../agents/hermes/ADAPTER.md) |
| Aside | `kna-15-aside` | [docs/steps/15-aside.md](steps/15-aside.md) · [어댑터](../agents/aside/ADAPTER.md) |
| OpenClaw | `kna-16-openclaw` | [docs/steps/16-openclaw.md](steps/16-openclaw.md) · [어댑터](../agents/openclaw/ADAPTER.md) |

## 원작에서 계승한 원칙 (여전히 유효)

- **위키 쪽은 런타임과 무관하게 같다.** 에이전트마다 `<이름> Sessions` 콜렉션 하나, 모두가 쓰는 공유 콜렉션 하나,
  콜렉션 설명이 원본 규정. 작업 1건당 문서 1개, 만들기 전에 검색, 서명, `## Update — <시각> · <기기>`, 비밀값 금지.
- **이름이 정체성이다.** 런타임이 다르면 다른 이름과 다른 콜렉션을 쓴다. 같은 에이전트를 여러 기기에서 돌리면
  그 기기들에서 같은 이름을 쓴다.
- **서명이 유일한 저자 표기다.** 위키의 작성자 필드에는 로그인이나 API key의 소유자가 찍힌다.

## 런타임별 차이 (요약)

| 항목 | Claude Code | Codex | Hermes | Aside | OpenClaw |
|---|---|---|---|---|---|
| 규칙이 사는 곳 | `~/.claude/CLAUDE.md` 관리 블록 | `~/.codex/AGENTS.md` | 프로필별 skill | 계정별 `AGENTS.md` | 에이전트별 지침 |
| MCP 등록 | `claude mcp add` + `/mcp` OAuth | `codex mcp add --url` + `codex mcp login` | `hermes mcp add --url` (API key) | 위키 MCP를 직접 소비하지 않음 | `openclaw mcp add` |
| 브라우저 없는 기기 | API key 헤더 | `--bearer-token-env-var` | API key | 해당 없음 | API key |
| 기록 경로 | 위키 직접 | 위키 직접 | 위키 직접 | **handoff 파일 경유** | 위키 직접 |
| 인스톨러 단계 | 09 | 13 | 14 | 15 | 16 |

Aside가 예외인 이유: `aside mcp` 는 Aside를 MCP **서버로 노출**하는 명령이고, 외부 MCP를 소비하는
클라이언트 기능은 확인되지 않았다. 그래서 handoff 파일을 거쳐 다른 에이전트가 위키에 기록한다.
