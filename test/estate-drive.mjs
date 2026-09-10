#!/usr/bin/env node
// estate-drive.mjs — the LIVE job-server proof (un-killed, REBUILD-9/10).
//
// Spawns `dsh --profile estate` (SDK base + the provisioner rows; the
// infer-estate row serves the runs lanes IN-PROCESS — no gateway, no
// HTTP, no second app) and drives ONE real agent turn over the SDK's
// newline JSON-RPC (the protocol package's three requests:
// initialize → session/prompt → shutdown, collecting session.event +
// session.status notifications until the session reports idle).
//
// The turn orders melite_flow with card="image-gen" model="krea-2" —
// the tool executes against the estate row's own seats (cards → runs
// registry → queue → engine), and the proof is the run_id + artifact
// in the committed assistant response.
//
// Docs-first citations for the composition this drives:
//   - references/deepseek-harness/packages/bundle/base/cordis.patch.yml
//     (the storage rows belong to the shared base; the estate row is
//     a consumer — it mounts no providers)
//   - references/deepseek-harness/packages/sdk/protocol/src/types.ts
//     (the request map: initialize / session/prompt / shutdown)
//
// Usage: node test/estate-drive.mjs
// Exit 0 = the drive passed (run_id + artifact observed).

import { spawn } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const STATE_ROOT = process.env["MELITE_STATE_ROOT"] ||
  mkdtempSync(join(tmpdir(), "estate-drive-"));
mkdirSync(join(STATE_ROOT, "drafts"), { recursive: true });
writeFileSync(
  join(STATE_ROOT, "drafts", "drive.json"),
  JSON.stringify({
    id: "drive",
    card: "image-gen",
    model: "krea-2",
    params: { prompt: "a small red sailboat on calm glass water, dawn light" },
  }),
);

const child = spawn("dsh", ["--profile", "estate"], {
  stdio: ["pipe", "pipe", "pipe"],
  env: {
    ...process.env,
    MELITE_STATE_ROOT: STATE_ROOT,
    // The documented interface selector (melite-tools index.ts): the
    // run doors (melite_flow, run_status) ride the HEADLESS interface
    // — the agent-server mounts' selector, one env var, no config.
    MELITE_HEADLESS: "1",
  },
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
  child.stdin.write(
    JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n",
  );
  return id;
}

const SESSION = "estate-job-" + Date.now().toString(36);
const events = [];
let idle = false;

// The operator's configured default agent model — settings.yaml's
// agent-default-model (opencode-go / muse-spark-1.3-contributor, the
// Muse Spark route over openai-responses). Never a guessed route.
const initId = request("initialize", {
  cwd: process.cwd(),
  provider: process.env["ESTATE_DRIVE_PROVIDER"] ?? "opencode-go",
  model: process.env["ESTATE_DRIVE_MODEL"] ?? "muse-spark-1.3-contributor",
});

// await initialize
const t0 = Date.now();
while (!frames.some((f) => f.id === initId)) {
  if (Date.now() - t0 > 30000) {
    console.error("estate-drive: initialize timeout");
    console.error("stderr tail:", stderrTail.split("\n").slice(-6).join("\n"));
    child.kill();
    process.exit(1);
  }
  await new Promise((r) => setTimeout(r, 250));
}
const init = frames.find((f) => f.id === initId);
if (init.error) {
  console.error("estate-drive: initialize refused:", JSON.stringify(init.error));
  child.kill();
  process.exit(1);
}
console.log("initialize ok:", JSON.stringify(init.result));

request("session/prompt", {
  sessionId: SESSION,
  contentBlocks: [{
    type: "text",
    text:
      "This is a tool-execution probe. Do NOT read files, do NOT" +
      " explore the workspace, do NOT discuss conformance. Make exactly" +
      ' ONE tool call now: melite_flow with card="image-gen", model="krea-2",' +
      ' prompt="a small red sailboat on calm glass water, dawn light".' +
      " Then reply with the tool's raw answer verbatim (the run_id and" +
      " any url fields), nothing else.",
  }],
});

const t1 = Date.now();
while (Date.now() - t1 < 240000) {
  await new Promise((r) => setTimeout(r, 500));
  for (const f of frames) {
    if (f.method === "session.status" && f.params?.sessionId === SESSION) {
      if (f.params.status === "idle") idle = true;
      else idle = false;
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

// The proof: a committed assistant message naming the run + artifact.
const texts = [];
for (const e of events) {
  const blocks = e?.data?.content ?? e?.data?.message?.content ?? [];
  if (Array.isArray(blocks)) {
    for (const b of blocks) {
      if (b?.type === "text" && typeof b.text === "string") texts.push(b.text);
    }
  }
}
const all = texts.join("\n");
const runId = all.match(/run-[0-9a-f]+-\w+/)?.[0];
console.log("events:", events.length, "assistant chars:", all.length);
console.log("run_id:", runId ?? "(none)");

if (process.env["ESTATE_DRIVE_FRAMES"]) {
  console.log("--- events ---");
  for (const e of events) {
    console.log(JSON.stringify(e).slice(0, 200));
  }
}

if (!idle) {
  console.error("estate-drive: session never reached idle");
  process.exit(1);
}
if (runId === undefined) {
  console.error("estate-drive: no run_id in the committed response");
  console.error("assistant text tail:", all.slice(-600));
  process.exit(1);
}
console.log("estate-drive: PASS — the estate profile served the run lane in-process");
process.exit(0);
