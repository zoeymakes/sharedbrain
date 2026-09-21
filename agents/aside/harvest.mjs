#!/usr/bin/env node
// agents/aside/harvest.mjs — Aside 세션을 수확 에이전트에게 읽히는 도구.
//
// Aside 는 REPL 만 있고 셸이 없다. REPL 의 fs 는 Project·세션 루트에 하드 샌드박스되어
// 키 파일을 읽지 못한다(`--permission full-access` 로도 뚫리지 않는다. 실측).
// 그래서 Aside 는 자기 작업을 위키에 스스로 쓸 수 없다.
//
// 대신 셸과 위키 MCP 를 모두 가진 다른 에이전트(수확자)가 Aside 의 세션 기록을 읽어
// 대신 올린다. 이 파일은 그 수확자가 쓰는 도구다. 판단(무엇을 남길지, 어떻게 요약할지)은
// 수확자가 하고, 이 도구는 읽기·추려내기·중복 방지만 한다.
//
// 사용법은 agents/aside/HARVEST.md 에 있다.

import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const ASIDE = path.join(os.homedir(), ".aside", "u");
const STATE = path.join(os.homedir(), ".sharedbrain", "harvest-state.json");

// 계정 → 에이전트 이름. 계정이 늘면 여기에 더한다.
const AGENTS = { u0: "맥사이드", u1: "업사이드" };

function readState() {
  try {
    return JSON.parse(fs.readFileSync(STATE, "utf8"));
  } catch {
    return { harvested: {} };
  }
}

function writeState(s) {
  fs.mkdirSync(path.dirname(STATE), { recursive: true });
  const tmp = `${STATE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(s, null, 2) + "\n", { mode: 0o600 });
  fs.renameSync(tmp, STATE);
}

function sessionsDir(acct) {
  return path.join(ASIDE, acct.replace(/^u/, ""), "sessions");
}

function listSessions(acct) {
  const dir = sessionsDir(acct);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((n) => fs.existsSync(path.join(dir, n, "messages.jsonl")))
    .sort()
    .reverse();
}

function parse(acct, id) {
  const f = path.join(sessionsDir(acct), id, "messages.jsonl");
  return fs
    .readFileSync(f, "utf8")
    .trim()
    .split("\n")
    .map((l) => {
      try {
        return JSON.parse(l);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

function textOf(content) {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .filter((p) => p && p.type === "text" && p.text) // thinking 은 버린다
    .map((p) => p.text)
    .join("\n")
    .trim();
}

function summarize(rows) {
  const users = rows.filter((r) => r.role === "user");
  const first = users.length ? textOf(users[0].content).replace(/\s+/g, " ").trim() : "";
  const ts = rows.find((r) => r.timestamp)?.timestamp || null;
  return {
    turns: users.length,
    tools: rows.filter((r) => r.role === "toolResult").length,
    startedAt: ts,
    firstMessage: first.slice(0, 200),
  };
}

const [, , cmd, ...rest] = process.argv;

function flag(name, def = null) {
  const i = rest.indexOf(`--${name}`);
  return i === -1 ? def : rest[i + 1];
}

if (cmd === "list") {
  const state = readState();
  const only = flag("account");
  const limit = Number(flag("limit", "30"));
  const accounts = only ? [only] : Object.keys(AGENTS);
  const out = [];
  for (const acct of accounts) {
    for (const id of listSessions(acct)) {
      const key = `${acct}/${id}`;
      if (state.harvested[key]) continue;
      const s = summarize(parse(acct, id));
      if (s.turns === 0) continue; // 사용자가 아무것도 안 시킨 빈 세션
      out.push({ account: acct, agent: AGENTS[acct], id, ...s });
      if (out.length >= limit) break;
    }
    if (out.length >= limit) break;
  }
  console.log(JSON.stringify(out, null, 2));
} else if (cmd === "read") {
  const acct = rest[0];
  const id = rest[1];
  if (!acct || !id) {
    console.error("사용법: harvest.mjs read <account> <sessionId> [--max <chars>]");
    process.exit(2);
  }
  const max = Number(flag("max", "40000"));
  const rows = parse(acct, id);
  const lines = [];
  for (const r of rows) {
    if (r.role === "user") {
      const t = textOf(r.content);
      if (t) lines.push(`[사용자] ${t}`);
    } else if (r.role === "assistant") {
      const t = textOf(r.content);
      if (t) lines.push(`[에이전트] ${t}`);
      const calls = Array.isArray(r.content)
        ? r.content.filter((p) => p && p.type === "toolUse" && p.name)
        : [];
      for (const c of calls) lines.push(`  ↳ 도구: ${c.name}`);
    } else if (r.role === "toolResult") {
      const t = textOf(r.content).replace(/\s+/g, " ").trim();
      lines.push(`  ↳ 결과(${r.toolName}${r.isError ? ", 실패" : ""}): ${t.slice(0, 300)}`);
    }
  }
  let body = lines.join("\n");
  if (body.length > max) body = body.slice(0, max) + `\n… (${body.length - max}자 생략)`;
  console.log(`# ${AGENTS[acct]} · ${acct}/${id}\n`);
  console.log(body);
} else if (cmd === "mark") {
  const acct = rest[0];
  const id = rest[1];
  if (!acct || !id) {
    console.error("사용법: harvest.mjs mark <account> <sessionId> [--doc <url>] [--skip <이유>]");
    process.exit(2);
  }
  const state = readState();
  state.harvested[`${acct}/${id}`] = {
    at: new Date().toISOString(),
    doc: flag("doc", null),
    skip: flag("skip", null),
  };
  writeState(state);
  console.log(`기록함: ${acct}/${id}`);
} else if (cmd === "status") {
  const state = readState();
  const done = Object.keys(state.harvested).length;
  const pending = Object.keys(AGENTS).flatMap((a) =>
    listSessions(a).filter((id) => !state.harvested[`${a}/${id}`]).map((id) => `${a}/${id}`),
  );
  console.log(JSON.stringify({ harvested: done, pending: pending.length, state: STATE }, null, 2));
} else {
  console.error("사용법: harvest.mjs list|read|mark|status");
  process.exit(2);
}
