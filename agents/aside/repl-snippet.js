// agents/aside/repl-snippet.js
//
// Aside REPL 에서 Outline REST API 로 위키에 직접 쓰는 스니펫.
// REPL 은 외부 모듈 import 를 허용하지 않으므로(External modules are not available in the REPL)
// 이 파일을 import 하지 않고 **본문을 그대로 붙여 넣어** 쓴다.
//
// 실행 방법
//   aside repl "$(cat agents/aside/repl-snippet.js | sed 's|__WIKI__|https://wiki.example.com|; s|__KEY__|'"$SHAREDBRAIN_WIKI_KEY"'|; s|__AGENT__|브라우저작업자|; s|__DEVICE__|laptop|')"
//
// 또는 kna-15-aside 가 만들어 주는 래퍼를 쓴다: scripts/aside-wiki.sh
//
// REPL 제약 (실측)
//   - fetch: 사용 가능. 크로스 오리진 POST + Authorization 헤더 정상 전달.
//   - process / require: 없음. 환경변수를 REPL 안에서 읽을 수 없다.
//   - fs: 있지만 세션 디렉터리에 샌드박스됨("Path escapes Project and session roots").
//         따라서 ~/.sharedbrain 의 키 파일을 REPL 안에서 읽을 수 없다.
//   - 결론: 키는 **셸에서 치환해 주입**한다. 키를 코드 파일에 커밋하지 않는다.

const WIKI = "__WIKI__".replace(/\/$/, "");
const KEY = "__KEY__";
const AGENT = "__AGENT__";
const DEVICE = "__DEVICE__";

function nowStamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  const tz = -d.getTimezoneOffset() / 60;
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())} UTC${tz >= 0 ? "+" : ""}${tz}`;
}

async function api(path, body = {}) {
  const r = await fetch(`${WIKI}/api/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${KEY}` },
    body: JSON.stringify(body),
  });
  const text = await r.text();
  let j;
  try { j = JSON.parse(text); } catch { throw new Error(`${path}: 응답이 JSON 이 아니다 (HTTP ${r.status})`); }
  if (!r.ok || j.ok === false) throw new Error(`${path}: HTTP ${r.status} ${j.error || j.message || ""}`.trim());
  return j;
}

async function collectionId(name) {
  const { data } = await api("collections.list", { limit: 100 });
  const hit = (data || []).find((c) => c.name === name);
  if (!hit) throw new Error(`콜렉션 "${name}" 이 없다. kna-08-collections 를 이 이름으로 실행한다`);
  return hit.id;
}

// 만들기 전에 검색한다. 중복 생성 금지 규칙의 구현이다.
async function findDoc(title, collection) {
  const body = { query: title, limit: 10 };
  if (collection) body.collectionId = await collectionId(collection);
  const { data } = await api("documents.search", body);
  const rows = (data || []).map((r) => r.document || r);
  return rows.find((doc) => doc.title === title) || null;
}

async function startWork({ title, collection, background = "", doneWhen = "" }) {
  const found = await findDoc(title, collection);
  if (found) {
    await appendUpdate(found.id, "재개했다.");
    return { id: found.id, url: found.url, created: false };
  }
  const now = nowStamp();
  const text = [
    `작성자: ${AGENT} · 상태: 🟡 진행 중`,
    `시작: ${now} · 최종 갱신: ${now}`,
    "", "## 배경", background || "(채운다)",
    "", "## 완료 조건", doneWhen || "(무엇이 확인되면 끝인지 적는다)",
    "", `최종 갱신: ${AGENT} · ${now}`,
  ].join("\n");
  const { data } = await api("documents.create", {
    title, text, publish: true, collectionId: await collectionId(collection),
  });
  return { id: data.id, url: data.url, created: true };
}

// 이미 쓴 Update 는 고치지 않고 덧붙인다.
async function appendUpdate(documentId, body, env) {
  const now = nowStamp();
  const where = env ? `${DEVICE} · ${env}` : DEVICE;
  await api("documents.update", {
    id: documentId, append: true,
    text: `\n\n## Update — ${now} · ${where}\n${body}\n\n최종 갱신: ${AGENT} · ${now}`,
  });
  return now;
}

async function completeWork(documentId, evidence) {
  const now = nowStamp();
  await api("documents.update", {
    id: documentId, append: true,
    text: `\n\n## 완료 기록\n${evidence}\n\n최종 갱신: ${AGENT} · ${now}`,
  });
  return now;
}

// 공유 지식은 검색만 한다. 정본 수정은 wiki_access 가 read-write 인 에이전트가 한다.
async function searchShared(query, sharedCollection) {
  const body = { query, limit: 10, collectionId: await collectionId(sharedCollection) };
  const { data } = await api("documents.search", body);
  return (data || []).map((r) => r.document || r).map((d) => ({ title: d.title, url: d.url }));
}

// 연결 확인용. 이 스니펫을 붙여 넣은 뒤 가장 먼저 실행한다.
async function wikiCheck() {
  const me = await api("auth.info");
  const { data } = await api("collections.list", { limit: 100 });
  console.log("계정:", me.data?.user?.name || "(확인 불가)");
  console.log("콜렉션:", (data || []).map((c) => c.name).join(", ") || "(없음)");
  return true;
}
