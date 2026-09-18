# 13단계: Codex 에이전트 연결

스킬: `kna-13-codex`. 선택 단계이며 Codex를 쓸 때만 돈다. 07·08단계가 끝난 뒤 실행한다.

어댑터 계약: [`agents/codex/ADAPTER.md`](../../agents/codex/ADAPTER.md)

## 무엇을 하는가

Codex가 어느 디렉터리에서 열려도 자기 이름과 위키 기록 규칙을 알게 만든다. 돈은 들지 않지만
`~/.codex/AGENTS.md` 와 `~/.codex/config.toml` 을 고치므로 diff를 보여주고 동의를 받는다.

## 에이전트 이름을 따로 쓰는 이유

Claude Code 에이전트와 **다른 이름**을 쓴다. 이름이 정체성이고 콜렉션이 이름 단위라서, 같은 이름을 쓰면
두 런타임의 기록이 한 콜렉션에 섞인다. 나중에 "어느 런타임이 무엇을 했는지" 구분할 수 없다.

같은 Codex를 여러 기기에서 돌릴 때는 그 기기들에서 **같은 이름**을 쓴다. 그때는 하나의 에이전트다.

## MCP 등록

```bash
codex mcp add <서버이름> --url https://<위키>/mcp
codex mcp login <서버이름>
codex mcp list
```

브라우저를 열 수 없는 기기에서는 위키 Settings > API & Access 에서 키를 만들고
(이름은 `codex-<기기>`), 환경변수로 넘긴다.

```bash
codex mcp add <서버이름> --url https://<위키>/mcp --bearer-token-env-var OUTLINE_API_KEY
```

키는 대화에 붙여 넣지 않는다. mode 600 파일에 두고 export 한다.

## 규칙 블록

`agents/codex/block.md` 를 렌더링해 `~/.codex/AGENTS.md` 의 마커 구간에 넣는다.

```bash
H=.claude/skills/kna-09-persona/managed-block.mjs
node $H render --template agents/codex/block.md --values .knowanywhere/block-values.json \
               --out .knowanywhere/codex-block.md
node $H apply --block .knowanywhere/codex-block.md --target ~/.codex/AGENTS.md --dry-run
node $H apply --block .knowanywhere/codex-block.md --target ~/.codex/AGENTS.md
```

`apply` 는 멱등이고 쓰기 전에 백업을 만든다. Codex는 system prompt를 받지 않고 `AGENTS.md` 만 읽으므로
블록을 짧게 유지한다.

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
