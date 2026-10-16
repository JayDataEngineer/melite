#!/usr/bin/env node
// drive-3d.mjs — re-run confirmations for the 3D cards on the live lane.
// Same protocol as test/estate-drive.mjs (dsh SDK JSON-RPC over the
// agent-lane profile: initialize → session/prompt → shutdown),
// parameterized by env:
//   DRIVE_PROFILE profile mounting the estate seat (default: estate;
//     override the day the lane moves — no agent-lane profile serving
//     the SDK protocol exists on this box as of 2026-10-09)
//   DRIVE_CARD   card id (rig | motion — quad-remesh died with the
//                 2026-10-13 excision)
//   DRIVE_MODEL  model id (gem-soma | kimodo — the registry's
//                 hyphen grammar; autoremesher died with the
//                 excision)
//   DRIVE_PARAMS JSON object of card params
//   DRIVE_ORDER  the verbatim order sentence for the turn
// Exit 0 = run_id observed in the committed response.
import { spawn } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const PROFILE = process.env["DRIVE_PROFILE"] ?? "estate";

const CARD = process.env["DRIVE_CARD"];
const MODEL = process.env["DRIVE_MODEL"];
const PARAMS = JSON.parse(process.env["DRIVE_PARAMS"] ?? "{}");
const ORDER = process.env["DRIVE_ORDER"];
const IDLE_MS = Number(process.env["DRIVE_IDLE_MS"] ?? "1500000");
if (!CARD || !MODEL || !ORDER) {
  console.error("drive-3d: DRIVE_CARD, DRIVE_MODEL, DRIVE_ORDER required");
  process.exit(2);
}

const STATE_ROOT = process.env["MELITE_STATE_ROOT"] ||
  mkdtempSync(join(tmpdir(), "drive-3d-"));
mkdirSync(join(STATE_ROOT, "drafts"), { recursive: true });
writeFileSync(
  join(STATE_ROOT, "drafts", "drive.json"),
  JSON.stringify({ id: "drive", card: CARD, model: MODEL, params: PARAMS }),
);

const child = spawn("dsh", ["--profile", PROFILE], {
  stdio: ["pipe", "pipe", "pipe"],
  cwd: STATE_ROOT,
  env: { ...process.env, MELITE_STATE_ROOT: STATE_ROOT, MELITE_HEADLESS: "1" },
});

let buf = "";
const frames = [];
let stderrTail = "";
child.stdout.on("data", (d) => {
  buf += d;
  let i;
  while ((i = buf.indexOf("\n")) >= 0) {
    const line = buf.slice(0, i);
    buf = buf.slice(i + 1);
    if (line.trim()) {
      try { frames.push(JSON.parse(line)); } catch { /* skip */ }
    }
  }
});
child.stderr.on("data", (d) => {
  stderrTail = (stderrTail + d).slice(-4000);
});

let nextId = 1;
function request(method, params) {
  const id = nextId++;
  child.stdin.write(JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n");
  return id;
}

const SESSION = "drive-3d-" + CARD + "-" + Date.now().toString(36);
const events = [];
let idle = false;

const initId = request("initialize", {
  cwd: process.cwd(),
  provider: process.env["ESTATE_DRIVE_PROVIDER"] ?? "opencode-go",
  model: process.env["ESTATE_DRIVE_MODEL"] ?? "muse-spark-1.3-contributor",
});

const t0 = Date.now();
while (!frames.some((f) => f.id === initId)) {
  if (Date.now() - t0 > 30000) {
    console.error("drive-3d: initialize timeout");
    console.error("stderr tail:", stderrTail.split("\n").slice(-6).join("\n"));
    child.kill();
    process.exit(1);
  }
  await new Promise((r) => setTimeout(r, 250));
}
const init = frames.find((f) => f.id === initId);
if (init.error) {
  console.error("drive-3d: initialize refused:", JSON.stringify(init.error));
  child.kill();
  process.exit(1);
}
console.log("initialize ok");

request("session/prompt", {
  sessionId: SESSION,
  contentBlocks: [{
    type: "text",
    text:
      "This is a tool-execution probe. Do NOT read files, do NOT" +
      " explore the workspace, do NOT discuss conformance. Make exactly" +
      " ONE tool call now: " + ORDER +
      " Then reply with the tool's raw answer verbatim (the run_id and" +
      " any url fields), nothing else.",
  }],
});

const t1 = Date.now();
while (Date.now() - t1 < IDLE_MS) {
  await new Promise((r) => setTimeout(r, 2000));
  for (const f of frames) {
    if (f.method === "session.status" && f.params?.sessionId === SESSION) {
      idle = f.params.status === "idle";
    }
    if (
      f.method === "session.event" && f.params?.sessionId === SESSION &&
      !events.some((e) => JSON.stringify(e) === JSON.stringify(f.params.event))
    ) {
      events.push(f.params.event);
    }
  }
  if (idle && events.length > 0) break;
}

request("shutdown", undefined);
await new Promise((r) => setTimeout(r, 1500));
child.kill();

const texts = [];
for (const e of events) {
  if (e?.type !== "assistant/message") continue;
  const blocks = e?.data?.content ?? e?.data?.message?.content ?? [];
  if (Array.isArray(blocks)) {
    for (const b of blocks) {
      if (b?.type === "text" && typeof b.text === "string") texts.push(b.text);
    }
  }
}
const turnErrors = [];
for (const e of events) {
  const reason = e?.type === "turn/end" ? e?.data?.reason : undefined;
  if (reason && reason.kind === "error") {
    turnErrors.push(String(reason.error?.message ?? "unknown turn error"));
  }
}
const all = texts.join("\n");
const runId = all.match(/run-[0-9a-f]+-\w+/)?.[0];
console.log("events:", events.length, "assistant chars:", all.length);
console.log("run_id:", runId ?? "(none)");
if (turnErrors.length > 0) {
  console.error("drive-3d: the turn died —", turnErrors.join(" | "));
  console.error("assistant text tail:", all.slice(-800) || "(none)");
  process.exit(1);
}
if (!idle) {
  console.error("drive-3d: session never reached idle");
  process.exit(1);
}
if (runId === undefined) {
  console.error("drive-3d: no run_id in the committed response");
  console.error("assistant text tail:", all.slice(-800));
  process.exit(1);
}
console.log("drive-3d: PASS —", CARD, runId);
process.exit(0);
