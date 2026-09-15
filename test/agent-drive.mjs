#!/usr/bin/env node
// agent-drive.mjs — THE AGENT ENGINE live-fire (stroke 62's owed
// proof; the craft-drive copy, shape mirrored EXACTLY).
//
// Spawns `dsh --profile estate` HEADLESS (stdio session serving —
// no port fight). The brain rides MELITE_AGENT_ROUTE (the same
// operator prod spark route the critic rode — explicit > implicit).
//
// THE LOOP UNDER FIRE (happy path, max_turns 6):
//   turn 1..n — the AGENT ITSELF drives mcp__blender__render_shot
//               (the REAL blender binary, the REAL stdio
//               mcp_server.py, the tool SCHEMA served from the host
//               ToolRuntime's census, the call through
//               tools.execute — every policy applies)
//   final      — the agent answers in text; artifacts = the run
//               dir's new files; shot.png verified by its bytes
//
// Turn 1 orders melite_flow with the AD-HOC agent stage (the
// {stages} arm). Then the drive polls run_status / the settle
// record until terminal (the settle-evicts-registry law — the
// craft-drive's lesson, copied).
//
// Exit 0 = completed + artifact verified.
//
// Usage: node test/agent-drive.mjs
import { spawn } from "node:child_process";
import { appendFileSync, existsSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Live-fire law: the brain spends REAL model calls (the repo's
// test:e2e convention — credentials ride the launching environment
// / the home's credential store, never a hardcoded secret).
const AGENT_ROUTE = "opencode-go/muse-spark-1.3-contributor";

const STATE_ROOT = process.env["MELITE_STATE_ROOT"] ||
  mkdtempSync(join(tmpdir(), "agent-drive-"));
mkdirSync(join(STATE_ROOT, "drafts"), { recursive: true });
console.log("agent-drive state:", STATE_ROOT);

const TASK =
  "Render a 320x320 PNG of the default Blender cube scene into the " +
  "run directory. Use the render_shot tool with out 'shot.png', width " +
  "320, height 320. When the render is done, reply with a one-line " +
  "confirmation naming the file you wrote.";

const AGENT_STAGE = {
  id: "agent",
  engine: "agent",
  params: {
    task: TASK,
    mcps: ["blender"],
    max_turns: 6,
  },
};

writeFileSync(
  join(STATE_ROOT, "drafts", "agent-drive.json"),
  JSON.stringify({ id: "agent-drive", stages: [AGENT_STAGE] }, null, 2),
);

const child = spawn("dsh", ["--profile", "estate"], {
  stdio: ["pipe", "pipe", "pipe"],
  // NEUTRAL CWD (the estate-drive debt fix): the child boots in the
  // STATE ROOT — the workspace AGENTS.md reminder drowns prompts.
  cwd: STATE_ROOT,
  env: {
    ...process.env,
    MELITE_STATE_ROOT: STATE_ROOT,
    MELITE_HEADLESS: "1",
    MELITE_AGENT_ROUTE: AGENT_ROUTE,
  },
});

let buf = "";
const frames = [];
let stderrTail = "";
const bootT0 = Date.now();
// Full host output lands in the state dir (tails cut testimony;
// files keep it — the craft-drive law).
const childOutLog = join(STATE_ROOT, "child-stdout.log");
const childErrLog = join(STATE_ROOT, "child-stderr.log");
let hostLogTail = "";
child.stdout.on("data", (d) => {
  appendFileSync(childOutLog, d);
  buf += d;
  let i;
  while ((i = buf.indexOf("\n")) >= 0) {
    const line = buf.slice(0, i);
    buf = buf.slice(i + 1);
    if (line.trim()) {
      try { frames.push(JSON.parse(line)); } catch { hostLogTail = (hostLogTail + line + "\n").slice(-6000); }
    }
  }
});
child.stderr.on("data", (d) => { appendFileSync(childErrLog, d); stderrTail = (stderrTail + d).slice(-4000); });

let nextId = 1;
function request(method, params) {
  const id = nextId++;
  child.stdin.write(JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n");
  return id;
}

const SESSION = "agent-drive-" + Date.now().toString(36);
// BOOT RACE (probe18 law): the pi-ai adapter registers on settings
// arrival mid-boot — retry session-open on the instant cheap
// refusal, never mistake a cold lane for a dead one.
let init;
for (let attempt = 1; ; attempt++) {
  const initId = request("initialize", {
    cwd: STATE_ROOT,
    provider: process.env["ESTATE_DRIVE_PROVIDER"] ?? "opencode-go",
    model: process.env["ESTATE_DRIVE_MODEL"] ?? "muse-spark-1.3-contributor",
  });
  const t0 = Date.now();
  while (!frames.some((f) => f.id === initId)) {
    if (Date.now() - t0 > 60000) {
      console.error("agent-drive: initialize timeout");
      console.error("stderr tail:", stderrTail.split("\n").slice(-6).join("\n"));
      console.error("full host output:", childOutLog, childErrLog);
      child.kill();
      process.exit(1);
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  init = frames.find((f) => f.id === initId);
  if (!init.error) {
    if (attempt > 1) console.log(`initialize ok (attempt ${attempt} — the adapter arrived mid-boot)`);
    break;
  }
  const transient = JSON.stringify(init.error).includes("no adapter registered");
  if (!transient || Date.now() - bootT0 > 240000) {
    console.error("agent-drive: initialize refused:", JSON.stringify(init.error));
    console.error("full host output:", childOutLog, childErrLog);
    child.kill();
    process.exit(1);
  }
  await new Promise((r) => setTimeout(r, 5000));
}

// BOOT-GATE: the agent row seats SYNCHRONOUSLY (no boot-time route
// enumeration — prepareCall happens per run), so the seated line is
// a hard gate, not a race. Never fire turns into an unseated lane.
const gt0 = Date.now();
while (!hostLogTail.includes("engine 'agent' seated")) {
  if (Date.now() - gt0 > 60000) {
    console.error("agent-drive: engine 'agent' never seated (MELITE_AGENT_ROUTE unset or a seat refused)");
    console.error("--- host log tail ---");
    console.error(hostLogTail.split("\n").filter((l) => /melite|seated|agent/i.test(l)).slice(-12).join("\n") || "(no seat lines captured)");
    console.error("full host output:", childOutLog, childErrLog);
    child.kill();
    process.exit(1);
  }
  await new Promise((r) => setTimeout(r, 1000));
}
console.log("agent seat confirmed");
console.log("initialize ok");

/** Drain session events into the shared list. */
const events = [];
let idleSeen = false;
function drain() {
  for (const f of frames) {
    if (f.method === "session.status" && f.params?.sessionId === SESSION) {
      idleSeen = f.params.status === "idle";
    }
    if (
      f.method === "session.event" && f.params?.sessionId === SESSION &&
      !events.some((e) => JSON.stringify(e) === JSON.stringify(f.params.event))
    ) {
      events.push(f.params.event);
    }
  }
}
function assistantTextSince(before) {
  const texts = [];
  for (const e of events.slice(before)) {
    if (e?.type !== "assistant/message") continue;
    const blocks = e?.data?.content ?? e?.data?.message?.content ?? [];
    if (Array.isArray(blocks)) {
      for (const b of blocks) {
        if (b?.type === "text" && typeof b.text === "string") texts.push(b.text);
      }
    }
  }
  return texts.join("\n");
}
function turnErrors() {
  const out = [];
  for (const e of events) {
    const reason = e?.type === "turn/end" ? e?.data?.reason : undefined;
    if (reason && reason.kind === "error") {
      out.push(String(reason.error?.message ?? "unknown turn error"));
    }
  }
  return out;
}
async function turn(text, timeoutMs) {
  const before = events.length;
  idleSeen = false;
  request("session/prompt", {
    sessionId: SESSION,
    contentBlocks: [{ type: "text", text }],
  });
  const t1 = Date.now();
  let sawIdle = false;
  while (Date.now() - t1 < timeoutMs) {
    await new Promise((r) => setTimeout(r, 500));
    drain();
    if (idleSeen) { sawIdle = true; break; }
  }
  drain();
  return { text: assistantTextSince(before), idle: sawIdle };
}

// TURN 1: start the agent run (the stringify trap named — the
// craft-drive law; construct, never paste).
let runId;
for (let attempt = 1; attempt <= 2 && runId === undefined; attempt++) {
  const hint = attempt === 1
    ? "stages must be a REAL ARRAY — do NOT JSON.stringify it into a string (passing \"stages\":\"[{...}]\" is refused; pass \"stages\":[{...}]). "
    : "Your previous call was refused for stringifying stages; construct the arguments object natively with stages as a real array and call again. ";
  const start = await turn(
    "Start exactly ONE melite run now. " + hint + "Make exactly ONE tool call: melite_flow with " +
    `one stage: id '${AGENT_STAGE.id}', engine '${AGENT_STAGE.engine}', and a params object with EXACTLY ` +
    "these three keys: " +
    `mcps ${JSON.stringify(AGENT_STAGE.params.mcps)}, max_turns ${AGENT_STAGE.params.max_turns}, ` +
    `and task with this EXACT text: '${TASK}'. ` +
    "Then reply with the tool's raw answer verbatim (the run_id), nothing else. " +
    "Do NOT read files, do NOT explore, do NOT poll run_status.",
    240000,
  );
  if (!start.idle) {
    console.error("agent-drive: start turn never reached idle");
    process.exit(1);
  }
  const errs1 = turnErrors();
  if (errs1.length > 0) {
    console.error("agent-drive: the start turn died —", errs1.join(" | "));
    console.error("assistant text tail:", start.text.slice(-600) || "(no assistant text committed)");
    process.exit(1);
  }
  runId = start.text.match(/run-[0-9a-f]+-\w+/)?.[0];
  console.log("run_id:", runId ?? "(none — attempt " + attempt + ")", attempt < 2 && runId === undefined ? start.text.slice(-300) : "");
}
if (runId === undefined) {
  console.error("agent-drive: no run_id in the committed response");
  console.error("--- host log tail (why the door refused) ---");
  console.error(hostLogTail.split("\n").filter((l) => /melite|seated|agent/i.test(l)).slice(-12).join("\n") || "(no seat lines captured)");
  process.exit(1);
}

// POLL: run_status turns + the durable settle record (settle evicts
// the live registry — the craft-drive lesson, copied verbatim).
const TERMINAL = new Set(["completed", "error", "stopped", "failed"]);
const readSettle = () => {
  try {
    const flow = JSON.parse(readFileSync(join(STATE_ROOT, "output", runId, "_flow.json"), "utf8"));
    if (typeof flow.status === "string" && TERMINAL.has(flow.status)) {
      return { status: flow.status, error: typeof flow.error === "string" ? flow.error : "" };
    }
  } catch { /* not settled yet — keep polling */ }
  return null;
};
let status = null;
let statusText = "";
let settleErr = "";
const pollStart = Date.now();
while (Date.now() - pollStart < 900000) {
  const settled = readSettle();
  if (settled !== null) {
    status = settled.status;
    settleErr = settled.error;
    console.log("polled status:", status, "(settle record)");
    break;
  }
  await new Promise((r) => setTimeout(r, 20000));
  const p = await turn(
    "Make exactly ONE tool call: run_status with run_id=" + runId + ". " +
    "Then reply with the tool's raw answer verbatim, nothing else.",
    120000,
  );
  const errs = turnErrors();
  if (errs.length > 0) {
    console.error("agent-drive: a poll turn died —", errs.join(" | "));
    break;
  }
  statusText = p.text;
  // The craft-drive parser law: an Error body is terminal-failed;
  // a `?` status with a non-progress dash line is terminal-failed;
  // else the status word decides.
  const m = /^run \S+ ([a-z?]+)(?: — (.*))?/m.exec(p.text) ?? /"status"\s*:\s*"([a-z]+)"/.exec(p.text);
  if (m) {
    const errBody = /— Error:/.test(p.text) || /"error"\s*:\s*"/.test(p.text);
    const dashFail = m[1] === "?" && m[2] !== undefined && !/^\d+\/\d+ stage/.test(m[2]);
    status = errBody || dashFail ? "failed" : m[1];
    console.log("polled status:", status);
    if (TERMINAL.has(status)) break;
  } else {
    console.log("poll: no status parsed; tail:", p.text.slice(-200));
  }
}
console.log("terminal status:", status ?? "(none)");
console.log("--- host log tail (seats + census) ---");
console.log(hostLogTail.split("\n").filter((l) => /melite|seated|census|agent/i.test(l)).slice(-25).join("\n") || "(no seat lines captured)");
if (status !== "completed") {
  console.error("agent-drive: run never completed");
  console.error("last status text tail:", statusText.slice(-600));
  if (settleErr) console.error("settle error:", settleErr.slice(0, 500));
  console.error("full host output:", childOutLog, childErrLog);
  process.exit(1);
}

// THE ARTIFACT: shot.png in the run's own dir, verified by its bytes.
const shot = join(STATE_ROOT, "output", runId, "shot.png");
if (!existsSync(shot)) {
  console.error("agent-drive: completed but no shot.png at", shot);
  process.exit(1);
}
const b = readFileSync(shot);
const magic = b.length > 24 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47;
const w = (b[16] << 24) | (b[17] << 16) | (b[18] << 8) | b[19];
const h = (b[20] << 24) | (b[21] << 16) | (b[22] << 8) | b[23];
console.log("artifact:", JSON.stringify({ path: shot, bytes: b.length, width: w, height: h, magic }));
if (!(magic && w === 320 && h === 320)) {
  console.error("agent-drive: shot.png is not the 320x320 render the agent promised");
  process.exit(1);
}

request("shutdown", undefined);
await new Promise((r) => setTimeout(r, 1500));
child.kill();
console.log("AGENT DRIVE: PASS — task → mcp tool calls → answer ran live on the estate");
process.exit(0);
