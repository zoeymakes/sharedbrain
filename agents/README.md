# agents/ — registry와 런타임 어댑터

`registry.yaml` 이 "누가 있는가"를 선언하고, 각 어댑터가 "그 런타임에 규칙을 어떻게 주입하는가"를 정의한다.

## registry 쓰기

```bash
cp agents/registry.example.yaml agents/registry.yaml
node agents/registry.mjs validate   # 스키마 검증 (실패하면 exit 1)
node agents/registry.mjs list       # 요약
node agents/registry.mjs next       # 아직 위키에 안 붙인 에이전트 → 실행할 단계
node agents/registry.mjs get <이름>  # 한 에이전트 값 (JSON)
```

`registry.yaml` 은 개인 정보가 들어가므로 `.gitignore` 대상이다.
예시는 [`registry.sample-multi-runtime.yaml`](registry.sample-multi-runtime.yaml)(가상 구성).

`runtime` 값은 `claude | codex | hermes | aside | openclaw` 중 하나여야 한다.
state.mjs 의 `kind` 와 같은 어휘라서, 다르면 `agent-add` 가 실패한다.

## 어댑터 계약

모든 어댑터는 네 가지를 명시한다.

| 항목 | 뜻 |
|---|---|
| **규칙 주입 위치** | 그 런타임이 매 세션 읽는 파일·설정 |
| **MCP 연결 방법** | 위키 MCP 서버를 등록하고 인증하는 실제 명령 |
| **마커** | 재실행 시 교체할 구간 (`<!-- sharedbrain:rules:start -->` ~ `end`) |
| **검증** | 실행 가능한 명령과 기대 출력 |

13~16단계의 규칙 본문은 [`_shared/block.md`](_shared/block.md) 하나에서 온다.
어댑터는 이 파일을 복사하지 않고 placeholder만 치환한다. placeholder 목록과 주입 명령은
[`_shared/wiki-rules.ko.md`](_shared/wiki-rules.ko.md)에 있다.

**블록 파일 규칙:** 1행이 start 마커, 마지막 행이 end 마커여야 한다. `managed-block.mjs apply` 가
그렇게 검사하므로 설명 주석을 블록 파일 안에 넣지 않는다(넣으면 exit 3).

## 런타임별 현황

| 런타임 | 주입 위치 | 단계 | 자동화 수준 | 검증 |
|---|---|---|---|---|
| Claude Code | `~/.claude/CLAUDE.md` | 09 | `managed-block.mjs` 로 렌더링·주입 | 원작에서 검증 |
| Codex | `~/.codex/AGENTS.md` | 13 | 안내형 절차 + `codex mcp` 명령 | CLI 확인, 종단 미검증 |
| Hermes | 프로필별 skill | 14 | 안내형 절차 + `hermes mcp` 명령 | CLI·스키마 확인, 종단 미검증 |
| Aside | 계정별 `AGENTS.md` | 15 | `scripts/aside-wiki.sh` (REST 직접 호출) | REST 경로·래퍼 확인, 실제 위키 미검증 |
| OpenClaw | 에이전트별 지침 | 16 | 안내형 절차 + `openclaw mcp` 명령 | CLI 확인, 종단 미검증 |

"안내형 절차"는 Claude Code가 문서를 따라 명령을 실행하고 diff를 보여준 뒤 동의를 받는 방식이다.
09단계처럼 전용 주입 스크립트가 있는 것은 아니다. 마커가 통일돼 있으므로 `managed-block.mjs apply` 를
`--target` 만 바꿔 재사용할 수 있다.

```bash
MB=.claude/skills/kna-09-persona/managed-block.mjs
node $MB render --template agents/codex/block.md --values .knowanywhere/block-values.json \
               --out .knowanywhere/codex-block.md
node $MB apply --block .knowanywhere/codex-block.md --target ~/.codex/AGENTS.md --dry-run
```

이 경로는 실제로 동작함을 확인했다(render → dry-run → apply → 재적용 시 "변경 없음").

## 새 런타임 추가

1. `agents/<런타임>/ADAPTER.md` 에 위 네 항목을 적는다.
2. `_shared/wiki-rules.ko.md` 를 그 런타임의 주입 형식으로 감싸는 블록 템플릿을 둔다.
3. `.claude/skills/kna-NN-<런타임>/SKILL.md` 로 설치 단계를 만든다.
4. `registry.mjs` 의 `RUNTIMES`/`STEP_OF`, `state.mjs` 의 `KINDS`/`STEPS` 에 추가한다.
