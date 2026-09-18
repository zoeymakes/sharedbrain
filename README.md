# oneagent

> [kubony/knowanywhere](https://github.com/kubony/knowanywhere)(MIT)의 설치기와 위키 운영 규칙을 기반으로 한 **파생 프로젝트**입니다(GitHub 포크가 아닌 독립 저장소). 원작이 다루지 않는 멀티 런타임 registry와 어댑터를 더했습니다. 자세한 관계는 [출처와 관계](#출처와-관계).

**두 대의 컴퓨터, 다섯 종류의 에이전트. 그런데 하나의 에이전트처럼 쓰고 싶다.**

집 맥미니에는 상시 실행 에이전트(Hermes)가 있어 자동화와 Slack 응답을 처리하고, 필요할 때 CLI로 Claude Code나
Codex를 띄워 작업한다. 맥북에서는 Claude Code나 Codex와 직접 대화하며 일한다. 실제 작업의 맥락과 흔적은
맥북에, 상시 자동화와 정리는 맥미니에 쌓인다.

그러면 이런 일이 생긴다.

- 맥북에서 하던 작업을 맥미니에서 이어받으려면, 어제 내가 무엇을 했는지 그 기기만 알고 있다.
- 에이전트가 각 기기에서 만든 스킬·메모리·세션 중 **무엇을 공유하고 무엇을 로컬에 둬야 하는지**가 불명확하다.
- 에이전트 종류가 늘어날수록(Hermes, Claude Code, Codex, Aside, OpenClaw…) 각자 다른 규칙으로 돌아 **공통 기억이 없다**.
- Wiki와 공용 스킬은 Git으로, 기기 접근은 Tailscale·SSH로 이어붙여 봤지만 매달 운영 방식을 고치게 된다.

`oneagent`의 답은 **self-hosted 위키 하나 + 모든 에이전트가 따르는 짧은 규칙 + 에이전트군을 선언하는 registry**다.

- 내 Google Cloud VM 위에 **[Outline](https://www.getoutline.com) 위키 하나**를 HTTPS와 Google 로그인으로 띄운다.
- **에이전트마다 콜렉션 하나**(`<에이전트> Sessions`). 그 에이전트만 쓰고, 작업 1건당 문서 1개를 세션과 기기를 넘어
  이어 쓴다. 에이전트는 새 문서를 만들기 전에 먼저 검색하므로, 화요일 맥미니 세션이 월요일 맥북 작업을 이어받는다.
- **공유 콜렉션 하나**(`공유 지식`). 모든 에이전트가 읽고 쓴다. 나에 대한 사실, 프로젝트, 컨벤션, 결정처럼
  오래 갈 지식을 둔다. 세션 로그는 여기 쓰지 않고, 거기서 걸러낸 지식만 옮긴다.
- **모든 에이전트는 MCP로 접속한다.** `https://<내 위키>/mcp` 에 OAuth 또는 API key로 로그인한다.
- **규칙은 위키 안에 있다.** 각 콜렉션의 설명(overview)에 적고, 에이전트는 쓰기 전에 그것을 읽는다. 규칙을 한 번
  고치면 모든 기기의 모든 에이전트가 따른다.
- **registry로 전체를 선언한다.** 런타임이 5종이어도 `agents/registry.yaml` 한 파일에 정의되고,
  `agents/<런타임>/ADAPTER.md` 가 각 런타임에 규칙을 주입하는 방법을 정한다.

이 레포는 인스톨러다. Claude Code로 열면 전체 설치를 한 단계씩 안내하고, 돈이 들거나 전역 설정을 건드리는
일은 하기 전에 먼저 묻는다.

```
  비서에이전트      기록에이전트      코드작업자        검증작업자        브라우저작업자
  Hermes           Hermes           Claude Code      Codex            Aside
  상시호스트        상시호스트        상시호스트·노트북  상시호스트·노트북  노트북
  (default)        (secondary)
     |                |                |                |                |
     +----------------+--------+-------+----------------+----------------+
                               |  MCP over HTTPS (OAuth 또는 API key)
                               |  Aside는 handoff 파일 경유
                               v
     +--------------------------------------------------------
     |  Outline 위키   https://wiki.example.com
     |  내 GCP VM 위에서 돈다. Google 로그인만 허용
     |
     |  비서에이전트 Sessions     그 에이전트만 쓴다
     |  기록에이전트 Sessions     그 에이전트만 쓴다
     |  코드작업자 Sessions       그 에이전트만 쓴다
     |  검증작업자 Sessions       그 에이전트만 쓴다
     |  브라우저작업자 Sessions   그 에이전트만 쓴다
     |  공유 지식                 모든 에이전트가 읽고 쓴다
     +--------------------------------------------------------
```

실제 운영 구성의 예다. 같은 이름의 에이전트는 여러 기기에서 돌아도 **하나의 에이전트**이고 같은 콜렉션에 쓴다.
런타임이 같아도 프로필이 다르면 다른 에이전트다 — 위 그림의 Hermes `default` 와 `secondary` 는
역할·권한·기록 위치가 다르므로 registry 로우도 둘이다. 새 에이전트를 붙일 때는 registry에 한 줄 더하고
`kna-12-add-agent` 로 `<이름> Sessions` 를 하나 만든다.

## 지금 상태 (먼저 읽어 주세요)

| 범위 | 상태 |
|---|---|
| 00~04단계 (GCP 계정·VM·DNS) | 실제 GCP에서 실행해 통과 |
| 05~11단계 (OAuth·Outline·백업) | 로컬 Docker 스모크만 확인. 실제 GCP 실행 미검증 |
| 13~16단계 (Codex·Hermes·Aside·OpenClaw) | 명령·스키마는 실제 CLI로 확인. 종단 실행 미검증 |
| Discord 브리지 | mock 테스트 통과(4/4, 14/14, 5/5) |

즉 **위키를 세우는 앞부분은 검증됐고, 멀티 런타임 연결은 아직 실사용 검증 전**입니다.
따라 하시다 막히면 이슈로 알려 주시면 고치겠습니다.

## 빠른 시작

```bash
git clone https://github.com/zoeymakes/oneagent.git
cd oneagent
claude
```

설치가 끝난 뒤(또는 먼저 계획을 세우고 싶다면) 에이전트군을 선언한다.

```bash
cp agents/registry.example.yaml agents/registry.yaml
node agents/registry.mjs validate   # 스키마 검증
node agents/registry.mjs list       # 요약
node agents/registry.mjs next       # 아직 위키에 안 붙인 에이전트와 실행할 단계
```

Claude가 [`CLAUDE.md`](CLAUDE.md)를 읽고 무엇을 만드는지, 비용이 얼마인지 설명한 뒤 "설치를 시작할까요?"라고 묻는다.
언제든 멈출 수 있고, 레포를 다시 열면 멈춘 곳부터 이어간다.
진행 상황은 `node .claude/skills/kna-status/state.mjs status` 로 본다(Claude Code 안에서는 `kna-status` 스킬).

필요한 것: Google 계정과 결제 수단, [Claude Code](https://claude.com/claude-code), Node.js 20 이상, git.
Google Cloud CLI(`gcloud`) 설치는 인스톨러가 도와준다. 도메인은 없어도 된다.

## 설치되는 것

**Google Cloud**(`fresh` 모드): 예산 알림이 걸린 프로젝트, 고정 IP를 단 e2-small(또는 e2-medium) Debian 12 VM,
Docker, Caddy(자동 HTTPS), Outline, Postgres, Redis, 비공개 Cloud Storage 버킷 두 개(첨부 파일, 백업),
매일 디스크 스냅샷과 매일 밤 DB 덤프.

**각 기기**: 런타임별 MCP 서버 등록과, 에이전트 이름·규칙을 담은 관리 블록 하나. 주입 위치는 런타임마다 다르다
(Claude Code는 `~/.claude/CLAUDE.md`, Codex는 `~/.codex/AGENTS.md`, Hermes는 프로필 skill, Aside는 계정별 `AGENTS.md`).
둘 다 쓰기 전에 diff로 보여준다.

**위키**: 규칙이 적힌 `<에이전트> Sessions` 와 `공유 지식` 콜렉션, 그리고 에이전트가 이번 설치에 대해 쓴 첫 문서.

자세한 구조: [docs/architecture.md](docs/architecture.md). 에이전트 정의: [agents/README.md](agents/README.md).

## 공유 경계 — 어디까지 공유하고 어디까지 로컬에 두는가

몇 달간 운영 방식을 고치게 되는 이유는 대개 **공유 경계가 정해지지 않았기 때문**이다. 이 레포의 기준은 다음과 같다.

| 대상 | 위치 | 이유 |
|---|---|---|
| 작업 기록, 결정, 정제된 지식 | **공유 위키** | 다른 기기의 에이전트가 이어받는 유일한 통로 |
| 운영 규칙, 공용 스킬, registry | **Git** | 리뷰 가능하고 되돌릴 수 있어야 한다 |
| 세션 id, resume 상태 | **로컬 고정** | 런타임마다 형식이 달라 섞으면 resume이 깨진다 |
| 실행 프로세스, PTY, tmux | **로컬 고정** | 파일 복제로 이식되지 않는다 |
| 인증 토큰, 쿠키, 브라우저 프로필 | **로컬 고정** | 동기화하면 사고가 난다 |
| 공용 스킬 | **Git + 심링크** | 사람이 읽고 리뷰할 텍스트. 런타임별 경로에 심링크한다 |
| 에이전트 메모리 | **로컬 + 선별 승격** | 자동 누적이라 동기화하면 중복·모순이 쌓인다 |
| 캐시, 인덱스, 로그 | **로컬 고정** | 경로 종속이고 동시 쓰기 충돌을 만든다 |

즉 **기억은 공유하고, 실행 상태는 각 기기에 둔다.** 세션 파일을 동기화해 "같은 대화를 그대로 이어가려는" 시도는
런타임끼리 형식이 다르고 동시 쓰기에서 깨지므로 채택하지 않는다. 대신 작업 문서를 이어 씀으로써 연속성을 만든다.

애매한 항목을 판정하는 기준, 공용 스킬을 심링크로 공유하는 절차, 메모리를 승격 후보로 다루는 방법은
[docs/sharing-boundary.md](docs/sharing-boundary.md)에 정리했다.

## 작업 연속성 프로토콜

- **작업 1건당 문서 1개.** 세션이 바뀌어도, 기기가 바뀌어도 같은 작업이면 같은 문서에 이어 쓴다.
- **만들기 전에 검색한다.** 같은 작업의 문서를 먼저 찾는다. 중복 생성 금지.
- **`## Update — <시각> · <기기>[ · <환경>]`** 을 의미 있는 진행마다 덧붙인다.
- **병렬 환경은 worktree까지 적는다.** [Orca](https://www.onorca.dev/)처럼 한 프롬프트를 여러 에이전트에게
  fan-out 하는 환경에서는 기기만으로 부족하고 `orca:<worktree>` 까지 있어야 어느 시도의 결과인지 추적된다.
  그런 환경을 쓰지 않으면 이 필드는 비워도 된다.
- **완료는 근거로 증명한다.** 명령이 exit 0인 것과 목표가 달성된 것은 다른 상태다.
- **본문 서명이 저자 기록이다.** 여러 에이전트가 같은 계정으로 쓰므로 위키의 작성자 필드로는 구분되지 않는다.
- **세션 로그와 정제된 지식을 분리한다.** 오래 갈 사실만 공유 지식으로 옮긴다.

13~16단계(Codex·Hermes·Aside·OpenClaw)의 규칙 원문은 [`agents/_shared/wiki-rules.ko.md`](agents/_shared/wiki-rules.ko.md)
하나다. Claude Code(09단계)는 페르소나 질문 흐름 때문에 아직 `templates/claude-md-block.ko.md` 를 쓰고,
Discord 브리지도 자체 요약본을 갖고 있다. 마커는 전부 `<!-- oneagent:rules:start/end -->` 로 통일했으므로
어느 경로로 주입하든 재실행 시 같은 구간이 교체된다. 규칙 본문 통합은 남은 과제다.

## registry — 에이전트군 선언

registry는 세 층을 구분한다.

| 층 | 무엇 | 예 |
|---|---|---|
| `agents` | 정체성을 가진 실행 주체 | Hermes 프로필별 에이전트, Claude Code, Codex, Aside, OpenClaw 에이전트 |
| `environments` | 에이전트를 실행하는 환경 | Orca(병렬 worktree ADE), 터미널/tmux, 브라우저 |
| `daemons` | 상시 자동화 프로세스 | 대시보드, 브리지, 스케줄 작업 |

```yaml
agents:
  - name: 비서에이전트
    runtime: hermes
    profile: default
    devices: [always-on-host]
    role: 자동화·일정·지식 승격
    wiki_access: read-write        # 정본 승격 권한
  - name: 기록에이전트
    runtime: hermes
    profile: secondary
    devices: [always-on-host]
    role: 정기 리포트
    wiki_access: 자기 영역만        # 정본 승격 금지
```

양식은 [`agents/registry.example.yaml`](agents/registry.example.yaml),
종합 예시는 [`agents/registry.sample-multi-runtime.yaml`](agents/registry.sample-multi-runtime.yaml).
`agents/registry.yaml` 은 개인 정보가 들어가므로 `.gitignore` 대상이다.

## 단계

| id | 스킬 | 하는 일 | fresh | join |
|---|---|---|---|---|
| 00 | `kna-00-start` | [동의, 모드, 에이전트 이름, 템플릿 언어, 도메인, 필수 도구 확인](docs/steps/00-start.md) | 실행 | 실행 |
| 01 | `kna-01-gcp-account` | [GCP 계정과 무료 크레딧, 프로젝트, 결제, API](docs/steps/01-gcp-account.md) | 실행 | |
| 02 | `kna-02-budget` | [월 예산과 이메일 알림](docs/steps/02-budget.md) | 권장 | |
| 03 | `kna-03-vm` | [고정 IP, VM, 방화벽, swap, Docker](docs/steps/03-vm.md) | 실행 | |
| 04 | `kna-04-dns` | [`wiki.<도메인>` A 레코드, 또는 sslip.io 이름](docs/steps/04-dns.md) | 실행 | |
| 05 | `kna-05-google-oauth` | [위키용 Google 로그인](docs/steps/05-google-oauth.md) | 실행 | |
| 06 | `kna-06-outline-deploy` | [버킷, 비밀값 생성, Outline + Caddy, 첫 관리자 로그인](docs/steps/06-outline-deploy.md) | 실행 | |
| 07 | `kna-07-mcp-connect` | [Claude Code를 MCP로 위키에 연결](docs/steps/07-mcp-connect.md) | 실행 | 실행 |
| 08 | `kna-08-collections` | [규칙이 적힌 Sessions와 공유 지식 콜렉션](docs/steps/08-collections.md) | 실행 | 실행 |
| 09 | `kna-09-persona` | [에이전트 페르소나와 규칙 블록, 첫 세션 문서](docs/steps/09-persona.md) | 실행 | 실행 |
| 10 | `kna-10-discord` | [같은 위키를 쓰는 Discord 봇(선택)](docs/steps/10-discord.md) | 선택 | 선택 |
| 11 | `kna-11-backups` | [매일 스냅샷, 매일 밤 DB 덤프, 복구 연습](docs/steps/11-backups.md) | 실행 | |
| 12 | `kna-12-add-agent` | [에이전트나 기기 추가](docs/steps/12-add-agent.md) | 나중에 | 나중에 |
| 13 | `kna-13-codex` | Codex 에이전트 연결 (`~/.codex/AGENTS.md`, `codex mcp`) | 선택 | 선택 |
| 14 | `kna-14-hermes` | Hermes 프로필별 에이전트 연결 (skill 주입, API key) | 선택 | 선택 |
| 15 | `kna-15-aside` | Aside 에이전트 연결 (계정별 규칙, 회사 계정 반출 금지) | 선택 | 선택 |
| 16 | `kna-16-openclaw` | OpenClaw 에이전트 연결 | 선택 | 선택 |

00~11은 위키를 만들고 첫 Claude Code 에이전트를 붙이는 단계다(원작에서 계승).
13~16은 이 레포에서 더한 단계로, 런타임이 여러 개일 때 각 런타임을 같은 위키·같은 규칙에 붙인다.
`node agents/registry.mjs next` 가 아직 안 붙인 에이전트와 실행할 단계를 알려준다.

## 다른 기기, 다른 에이전트 합류

위키는 한 번만 만든다. 그다음 기기는 연결만 한다.

1. 새 기기에서 `git clone`, `cd oneagent`, `claude` 를 실행하고 모드를 물으면 `join` 이라고 답한다.
2. 위키 주소를 알려준다. 예: `https://wiki.example.com`.
3. 같은 에이전트로 이어가려면 **같은 이름**을 쓴다(노트북의 `코드작업자` 도 상시호스트의 `코드작업자` 와 같은 콜렉션에 쓴다).
   다른 에이전트를 추가하려면 **새 이름**을 주고, 그 에이전트는 자기 콜렉션을 새로 받는다.
4. 인스톨러가 그 기기에서 07, 08, 09 단계를 돌린다. Codex·Hermes·Aside·OpenClaw는 13~16단계로 붙인다.
5. registry에 해당 로우를 추가하거나 `devices` 에 기기를 더한다.

## 비용

공유 위키는 상시 가동 VM 한 대에 올라간다. 신규 Google Cloud 계정은 90일 $300 크레딧을 받아 초기 몇 달이 무료다.
크레딧이 없는 경우 다음을 참고한다.

| 구성 | 월 USD |
|---|---|
| e2-small + asia-northeast3(서울) | 약 23 |
| e2-small + us-central1 | 약 20 |
| e2-medium + 서울 | 약 40 |
| 도메인(선택) | 연 $10~15. 없으면 무료 `sslip.io` 주소 |

03단계가 머신 타입을 묻는다(기본값 `e2-medium`). 개인 1인과 에이전트 몇 개 규모에서는 `e2-small` 로도 평시
동작에 충분하고, Outline 업그레이드 때만 일시적으로 올렸다 되돌린다(VM 중지 → 머신 타입 변경 → 시작).
가격은 리전마다 다르고 바뀐다.
자세한 표는 [비용표](docs/architecture.md#비용).

## 하지 않는 것

Kubernetes, 멀티 테넌트 위키, 이메일(SMTP) 초대, 기존 노트 일괄 이전, 에이전트 세션·인증·브라우저 상태의 기기간 동기화.
Obsidian vault나 Markdown으로 노트를 쌓아 두었다면 Outline의 Markdown 가져오기를 쓸 수 있다.
설치를 마친 뒤 사본으로 먼저 해 본다.

"실행 중인 세션 자체"를 다른 기기에서 그대로 이어받는 구조(중앙 실행 런타임)는 이 레포 범위가 아니다.
필요하다면 세션 파일을 복제하는 대신 원래 호스트에 원격 접속(SSH + tmux 등)하는 방식을 쓴다.

## 보안 요약

로그인은 Google OAuth만 쓰고 SMTP는 없다. 방화벽은 위키용으로 TCP 80, 443만 연다(SSH는 기본 규칙과 gcloud가
관리하는 키를 쓴다). 비밀값은 모두 VM에서 만들어 한 파일 `/opt/outline/.env`(mode 600)에 둔다. 인스톨러는 비밀값을
되풀이해 출력하지 않고, state 파일·이 레포·위키에 쓰지 않으며, 변수명과 끝 4자리로만 가리킨다.

에이전트별 API key는 이름을 에이전트·기기 단위로 만든다(`hermes-macmini` 등). 사고 시 그 키만 폐기한다.
회사 기기에서 도는 에이전트는 원문·고유명·내부 URL·수치·스크린샷을 공유 위키에 올리지 않고, 비식별화한 판단과
상태·정본 위치 포인터만 남긴다. 자세한 내용은 [docs/architecture.md](docs/architecture.md#보안-메모).

## 검증 이력

- 원본 인스톨러로 새 GCP 프로젝트(Workspace 계정, 서울 리전, sslip.io)에서 00~04단계를 실제 실행해 통과.
  05~11단계는 로컬 Docker 스모크(Outline 1.10.1 기동, `/_health` 200)만 확인.
- Discord 브리지 mock 테스트 통과(스레드 4/4, 컨텍스트 14/14, Codex 백엔드 5/5).
- 13~16단계: 각 런타임 CLI의 실제 명령·옵션과 설정 스키마를 설치본에서 확인해 문서에 반영
  (`codex mcp add --url`, `hermes mcp add/list/test` 와 최상위 `mcp_servers:` 스키마, `openclaw mcp list/probe/doctor`,
  `aside account`). Aside는 MCP 서버를 *제공*하는 쪽이라 위키를 직접 소비하지 않음을 확인하고 handoff 모드로 설계.
- `agents/registry.mjs` 는 validate/list/next/get 이 실제로 동작함을 확인.
- 종단 실행(위키 생성 → 5개 런타임 연결 → 기기 간 이어받기)은 아직 수행하지 않았다.

## 출처와 관계

이 레포는 [kubony/knowanywhere](https://github.com/kubony/knowanywhere)의 설치기와 위키 운영 규칙을 기반으로 한다.
원저작자의 설계(에이전트별 Sessions 콜렉션, 공유 지식 분리, 작업 1건당 문서 1개, 콜렉션 설명이 규정인 구조,
안내형 인스톨러와 동의 우선 원칙)를 그대로 계승하며, 여기에 다음을 더한다.

- 여러 런타임·여러 프로필을 하나의 registry로 선언하는 층 구조(`agents` / `environments` / `daemons`)
- 런타임별 어댑터 계약과 규칙 단일 출처(`agents/_shared/wiki-rules.ko.md`)
- Codex·Hermes·Aside·OpenClaw 설치 단계(13~16)
- 병렬 실행 환경(ADE)을 에이전트와 분리하고 기록에 worktree를 추가
- 공유/로컬 경계를 명문화한 운영 기준

라이선스는 [MIT](LICENSE)이며 원저작권 표기를 유지한다.
