# 어댑터: Claude Code

| 항목 | 값 |
|---|---|
| 규칙 주입 위치 | `~/.claude/CLAUDE.md` (user scope, 모든 디렉터리에서 읽힌다) |
| 마커 | `<!-- oneagent:rules:start -->` ~ `<!-- oneagent:rules:end -->` |
| 블록 템플릿 | `templates/claude-md-block.ko.md` |
| 설치 단계 | `kna-09-persona` (`managed-block.mjs` 가 백업 후 마커 구간 교체) |

## MCP 연결

```bash
claude mcp add --transport http --scope user <서버이름> https://<위키>/mcp
# Claude Code 안에서 /mcp → Authenticate (브라우저 OAuth)
```

브라우저가 없는 기기는 Outline API key를 `--header "Authorization: Bearer $KEY"` 로 등록한다.

## 검증

`mcp__<서버>__list_collections` 로 콜렉션 목록을 받고, 세션 문서를 규칙대로 한 건 만든 뒤 다시 읽는다.

## 주의

한 OS 사용자에게 `~/.claude/CLAUDE.md` 는 하나이므로 **한 기기·한 계정에 Claude Code 에이전트는 하나**다. 같은 기기에 두 번째 Claude 에이전트가 필요하면 다른 OS 계정을 쓴다.

## 환경

Orca 같은 병렬 worktree 환경에서 돌 때는 Update 줄에 `orca:<worktree>` 를 함께 적는다. `~/.claude/CLAUDE.md` 는 user scope라 worktree와 무관하게 같은 규칙이 적용된다.
