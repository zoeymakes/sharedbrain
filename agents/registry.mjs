#!/usr/bin/env node
// agents/registry.mjs — registry.yaml 을 읽고 검증한다 (Node >= 20, 의존성 없음).
//
//   node agents/registry.mjs list            에이전트/환경/데몬 요약
//   node agents/registry.mjs validate        스키마 검증 (문제 있으면 exit 1)
//   node agents/registry.mjs next            아직 위키에 붙이지 않은 런타임과 실행할 단계
//   node agents/registry.mjs get <이름>       한 에이전트의 값 (JSON)
//
// registry.yaml 이 없으면 registry.example.yaml 을 복사하라고 안내한다.
// 의존성을 피하려고 이 레포가 쓰는 범위(2단계 들여쓰기 매핑 + 인라인 목록/맵)만 파싱한다.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FILE = path.join(REPO, 'agents', 'registry.yaml');
const EXAMPLE = path.join(REPO, 'agents', 'registry.example.yaml');

const RUNTIMES = ['claude', 'codex', 'hermes', 'aside', 'openclaw'];
const STEP_OF = { claude: '09', codex: '13', hermes: '14', aside: '15', openclaw: '16' };
const STATUSES = ['active', 'retired', 'migrating'];

const die = (m, c = 1) => { process.stderr.write(`registry: ${m}\n`); process.exit(c); };

function stripComment(raw) {
  // 인라인 주석 제거. 따옴표 안이나 인라인 맵/목록 안의 # 는 남긴다.
  let q = null; let depth = 0;
  for (let i = 0; i < raw.length; i++) {
    const c = raw[i];
    if (q) { if (c === q) q = null; continue; }
    if (c === '"' || c === "'") { q = c; continue; }
    if (c === '[' || c === '{') depth++;
    else if (c === ']' || c === '}') depth--;
    else if (c === '#' && depth === 0 && (i === 0 || /\s/.test(raw[i - 1]))) return raw.slice(0, i);
  }
  return raw;
}

function scalar(raw) {
  let s = stripComment(raw).trim();
  if (s === '') return '';
  if (s.startsWith('[') && s.endsWith(']')) {
    return s.slice(1, -1).split(',').map((x) => x.trim()).filter(Boolean).map(scalar);
  }
  if (s.startsWith('{') && s.endsWith('}')) {
    const o = {};
    for (const part of s.slice(1, -1).split(',')) {
      const i = part.indexOf(':');
      if (i > 0) o[part.slice(0, i).trim()] = scalar(part.slice(i + 1));
    }
    return o;
  }
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) s = s.slice(1, -1);
  return s;
}

// 최상위 키 -> 값. 목록이면 항목(객체)의 배열.
function parse(text) {
  const out = {};
  let key = null;
  let item = null;
  let itemKey = null;
  for (const rawLine of text.split('\n')) {
    const line = rawLine.replace(/\t/g, '  ');
    if (!line.trim() || line.trim().startsWith('#')) continue;
    const indent = line.length - line.trimStart().length;
    const body = line.trim();

    if (indent === 0 && body.endsWith(':')) { key = body.slice(0, -1); out[key] = []; item = null; continue; }
    if (indent === 0 && body.includes(':')) {
      const i = body.indexOf(':');
      out[body.slice(0, i)] = scalar(body.slice(i + 1)); key = null; item = null; continue;
    }
    if (!key) continue;

    if (body.startsWith('- ')) {
      const rest = body.slice(2);
      if (rest.startsWith('{')) { out[key].push(scalar(rest)); item = null; continue; }
      item = {}; out[key].push(item); itemKey = null;
      const i = rest.indexOf(':');
      if (i > 0) { itemKey = rest.slice(0, i).trim(); item[itemKey] = scalar(rest.slice(i + 1)); }
      else if (rest) out[key][out[key].length - 1] = scalar(rest);
      continue;
    }
    if (item) {
      const i = body.indexOf(':');
      if (i > 0) { itemKey = body.slice(0, i).trim(); item[itemKey] = scalar(body.slice(i + 1)); }
      else if (itemKey) item[itemKey] = `${item[itemKey]} ${body}`.trim();
    }
  }
  return out;
}

function load() {
  if (!fs.existsSync(FILE)) {
    die(`agents/registry.yaml 이 없다. 먼저 만든다:\n  cp agents/registry.example.yaml agents/registry.yaml`);
  }
  return parse(fs.readFileSync(FILE, 'utf8'));
}

function validate(reg, { quiet = false } = {}) {
  const errors = [];
  const warn = [];
  const agents = reg.agents || [];
  if (!agents.length) errors.push('agents 가 비어 있다');
  const seen = new Map();
  for (const a of agents) {
    const where = `agents[${a.name || '이름 없음'}]`;
    if (!a.name) errors.push(`${where}: name 이 없다`);
    if (!a.runtime) errors.push(`${where}: runtime 이 없다`);
    else if (!RUNTIMES.includes(a.runtime)) {
      errors.push(`${where}: runtime "${a.runtime}" 은 ${RUNTIMES.join('|')} 중 하나여야 한다`);
    }
    const status = a.status || 'active';
    if (!STATUSES.includes(status)) errors.push(`${where}: status "${status}" 은 ${STATUSES.join('|')} 중 하나여야 한다`);
    if (status === 'active') {
      if (!a.devices || !a.devices.length) warn.push(`${where}: devices 가 없다`);
      if (!a.role) warn.push(`${where}: role 이 없다`);
      if (!a.wiki_access) warn.push(`${where}: wiki_access 가 없다`);
    }
    const key = `${a.name}`;
    if (seen.has(key) && seen.get(key) !== a.runtime) {
      errors.push(`${where}: 같은 이름이 다른 런타임(${seen.get(key)}, ${a.runtime})에 쓰였다. 이름은 정체성이므로 하나의 런타임에만 둔다`);
    }
    seen.set(key, a.runtime);
    for (const k of Object.keys(a)) {
      if (/secret|token|passw|api_?key|credential/i.test(k)) errors.push(`${where}: "${k}" 처럼 비밀값으로 보이는 키를 registry 에 두지 않는다`);
    }
  }
  const envNames = new Set((reg.environments || []).map((e) => e.name));
  for (const a of agents) {
    for (const e of a.environments || []) {
      if (!envNames.has(e)) warn.push(`agents[${a.name}]: environments "${e}" 가 environments 섹션에 없다`);
    }
  }
  if (!quiet) {
    for (const w of warn) console.log(`경고: ${w}`);
    for (const e of errors) console.log(`오류: ${e}`);
    console.log(errors.length ? `검증 실패: 오류 ${errors.length}건, 경고 ${warn.length}건`
                              : `검증 통과: 에이전트 ${agents.length}개, 경고 ${warn.length}건`);
  }
  return errors;
}

function list(reg) {
  const agents = reg.agents || [];
  const active = agents.filter((a) => (a.status || 'active') === 'active');
  console.log(`owner: ${reg.owner || '(없음)'}   에이전트 ${active.length}개 활성 / 전체 ${agents.length}개\n`);
  console.log('이름'.padEnd(16) + 'runtime'.padEnd(10) + 'profile'.padEnd(12) + 'devices'.padEnd(28) + 'wiki_access');
  for (const a of agents) {
    const mark = (a.status || 'active') === 'active' ? '' : `  [${a.status}]`;
    console.log(
      String(a.name || '').padEnd(16) + String(a.runtime || '').padEnd(10) +
      String(a.profile || '-').padEnd(12) + String((a.devices || []).join(',') || '-').padEnd(28) +
      String(a.wiki_access || '-') + mark
    );
  }
  if ((reg.environments || []).length) console.log('\n환경: ' + reg.environments.map((e) => e.name).join(', '));
  if ((reg.daemons || []).length) console.log('데몬: ' + reg.daemons.map((x) => (typeof x === 'string' ? x : x.name)).join(', '));
}

// 아직 위키에 붙이지 않은 런타임과 실행할 단계
function next(reg) {
  let done = new Set();
  const statePath = path.join(REPO, '.knowanywhere', 'state.json');
  if (fs.existsSync(statePath)) {
    try {
      const s = JSON.parse(fs.readFileSync(statePath, 'utf8'));
      for (const a of s.agents || []) done.add(`${a.kind}:${a.name}`);
    } catch { /* state 가 깨졌으면 무시하고 전부 미연결로 본다 */ }
  }
  const pending = (reg.agents || [])
    .filter((a) => (a.status || 'active') === 'active')
    .filter((a) => !done.has(`${a.runtime}:${a.name}`));
  if (!pending.length) { console.log('registry 의 활성 에이전트가 모두 연결됐다.'); return; }
  console.log('아직 위키에 붙이지 않은 에이전트:\n');
  for (const a of pending) {
    console.log(`  ${String(a.name).padEnd(16)} ${String(a.runtime).padEnd(10)} → 단계 ${STEP_OF[a.runtime] || '?'}`);
  }
  console.log('\n해당 단계 스킬을 실행한다. 예: kna-14-hermes');
}

const reg = load();
const cmd = process.argv[2];
switch (cmd) {
  case 'list': list(reg); break;
  case 'validate': process.exit(validate(reg).length ? 1 : 0); break;
  case 'next': if (validate(reg, { quiet: true }).length) die('먼저 validate 를 통과시킨다'); next(reg); break;
  case 'get': {
    const name = process.argv[3];
    if (!name) die('사용법: registry.mjs get <이름>');
    const a = (reg.agents || []).find((x) => x.name === name);
    if (!a) die(`"${name}" 을(를) registry 에서 찾지 못했다`);
    console.log(JSON.stringify(a, null, 2));
    break;
  }
  default: die('사용법: registry.mjs list|validate|next|get <이름>');
}
