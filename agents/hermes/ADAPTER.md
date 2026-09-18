# 어댑터: Hermes

Hermes는 상시 실행형 에이전트 런타임이다. **프로필 하나가 에이전트 하나**이므로 프로필마다 별도 이름·콜렉션·권한을 갖는다.

| 항목 | 값 |
|---|---|
| 규칙 주입 위치 | 기본 프로필은 `~/.hermes/skills/`, 그 외 프로필은 `~/.hermes/profiles/<프로필>/skills/` |
| 마커 | skill 파일 전체를 관리 (`oneagent-wiki-<에이전트>` 이름) |
| 블록 템플릿 | `agents/hermes/skill-template.md` |
| MCP 설정 | `hermes mcp add` (또는 `~/.hermes/config.yaml` 최상위 `mcp_servers:`) |
| 설치 단계 | `kna-14-hermes` |

## 왜 skill로 주입하는가

Hermes는 매 턴 system prompt에 skill 목록을 노출하고, 조건이 맞으면 본문을 로드한다. 규칙을 skill로 두면:

- 위키에 쓸 일이 있을 때만 규칙 본문이 로드되어 평상시 토큰을 낭비하지 않는다.
- 프로필별로 다른 권한(정본 승격 가능 / 자기 영역만)을 다른 skill로 분리할 수 있다.
- `skill_manage` 로 갱신 이력이 남는다.

## MCP 연결

`~/.hermes/config.yaml` 의 MCP 서버 목록에 위키를 추가한다. 상시 실행 서버에는 브라우저가 없으므로 **Outline API key** 를 쓴다.

권장: 수작업 YAML 편집 대신 CLI를 쓴다.

```bash
hermes mcp add <서버이름> --url https://<위키>/mcp
hermes mcp list
hermes mcp test <서버이름>
```

직접 편집해야 하면 `~/.hermes/config.yaml` 의 **최상위** `mcp_servers:` 아래에 넣는다.
(`mcp:` 는 보조 모델 설정이라 다른 키다. 거기에 넣으면 서버가 등록되지 않는다.)

```yaml
mcp_servers:
  <서버이름>:
    url: https://<위키>/mcp
    headers:
      Authorization: "Bearer ${OUTLINE_API_KEY}"
```

HTTP 여부는 `url:` 키 존재로 결정된다. `transport:` 는 `sse` 를 쓸 때만 지정한다.
`${VAR}` 환경변수 치환은 Hermes가 지원한다.

- 키 이름은 에이전트별로 만든다(`hermes-<프로필>-<기기>`). 사고 시 그 키만 폐기한다.
- 키 값은 config에 직접 쓰지 않고 mode 600 환경 파일에서 주입한다.

## 프로필별 권한

registry의 `wiki_access` 를 그대로 반영한다.

| 권한 | skill에 넣는 문장 |
|---|---|
| `read-write` | 공유 지식 정본을 고칠 수 있다. 승격 전 사용자 확인 규칙은 유지한다. |
| `자기 영역만` | 자기 Sessions 콜렉션과 지정된 주제 문서만 쓴다. 정본 승격을 하지 않는다. |
| `read-only` | 검색·인용만 한다. |

## 검증

Hermes 세션에서 MCP 도구로 `list_collections` 를 호출하고, 세션 문서 한 건을 규칙대로 만든 뒤 다시 읽는다. cron으로 도는 프로필은 수동 실행 1회로 확인한다.
