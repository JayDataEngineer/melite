#!/usr/bin/env node
// craft-drive.mjs — the CRAFT LOOP live-fire (stroke 55's owed proof).
//
// Spawns `dsh --profile estate` HEADLESS (stdio session serving —
// the estate profile mounts no webserver, so there is never a port
// fight; the melite-test profile was tried 2026-09-15 and binds
// :3080, the prod GUI's own port). The critic rides the
// operator's prod spark route (opencode-go/muse-spark-1.3-contributor)
// via MELITE_CRITIC_ROUTE — the pi-ai adapter registers on settings
// arrival AFTER early rows apply, so the estate row retries on
// llm/adapters-updated and the drive gates turn 1 on the seated
// line (never fires turns into an unseated lane). Both profiles
// symlink the SAME workspace melite-estate, so the rows under fire
// are the working tree's.
// shape mirrors test/estate-drive.mjs EXACTLY (initialize with
// provider+model, session/prompt with contentBlocks, assistant/message
// proof parse, turn/end error surfacing) — the first craft-drive
// failed SILENTLY on a guessed protocol (no provider/model, a `prompt`
// field the server never reads); this one copies the proven harness.
//
// THE LOOP UNDER FIRE (happy path, max_iterations 2):
//   act      — mcp:blender render_shot 320x320 (the REAL blender
//              binary, the REAL stdio mcp_server.py, args.out
//              RELATIVE "shot.png" — the run-dir resolution law)
//   capture  — the PNG lands in <stateRoot>/output/<runId>/
//   critique — the REAL critic route with the PNG attached
//   decide   — {"verdict":"done"} expected by iteration 2
//
// Turn 1 orders melite_flow with the AD-HOC craft stage (the {stages}
// arm — the named-flow arm rides the registry template whose stage
// params are fixed; the loop's four fields are per-run). Then the
// DRIVE polls run_status in cheap follow-up turns until terminal.
// The PNG is verified structurally (magic bytes + IHDR dims — the
// read_image law applies to the driver too: no vision claims).
// Exit 0 = completed + artifact verified.
//
// Usage: node test/craft-drive.mjs
import { spawn } from "node:child_process";
import { appendFileSync, existsSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Live-fire law: the critic spends a REAL model call (the repo's
// test:e2e convention — real-API work takes its credentials from
// the launching environment / the home's credential store, never
// from a hardcoded secret). The route is the operator's prod
// spark route (MELITE_CRITIC_ROUTE — the estate row seats it
// explicitly, verified image-capable before seating); the drive
// refuses without... nothing: a missing credential surfaces LOUD
// through the critic's failure-finish channel mid-loop.
const SPARK_ROUTE = "opencode-go/muse-spark-1.3-contributor";

const STATE_ROOT = process.env["MELITE_STATE_ROOT"] ||
  mkdtempSync(join(tmpdir(), "craft-drive-"));
mkdirSync(join(STATE_ROOT, "drafts"), { recursive: true });
console.log("craft-drive state:", STATE_ROOT);

const CRAFT_STAGE = {
  id: "loop",
  engine: "craft",
  params: {
    agent_prompt:
      "A 320x320 render of the default Blender cube scene lit by the default light. " +
      "The cube is visible, centered, and evenly lit. This is a smoke test of the " +
      "render pipeline, not an art brief: if the render shows a lit cube on a " +
      "gray-ish background, answer done.",
    inputs: {
      command: {
        engine: "mcp:blender",
        params: { tool: "render_shot", args: { out: "shot.png", width: 320, height: 320 } },
      },
    },
    max_iterations: 2,
  },
};

writeFileSync(
  join(STATE_ROOT, "drafts", "craft-drive.json"),
  JSON.stringify({ id: "craft-drive", stages: [CRAFT_STAGE] }, null, 2),
);

const child = spawn("dsh", ["--profile", "estate"], {
  stdio: ["pipe", "pipe", "pipe"],
  // NEUTRAL CWD (the estate-drive debt fix): the child boots in the
  // STATE ROOT, never the workspace — otherwise the workspace
  // AGENTS.md system-reminder drowns the probe prompt.
  cwd: STATE_ROOT,
  env: {
    ...process.env,
    MELITE_STATE_ROOT: STATE_ROOT,
    MELITE_HEADLESS: "1",
    MELITE_CRITIC_ROUTE: SPARK_ROUTE,
  },
});

let buf = "";
const frames = [];
let stderrTail = "";
const bootT0 = Date.now();
// Full host output lands in the state dir (the 2026-09-15 duplicate-seat
// kill: the 4000-char tail cut the error MESSAGE and kept only frames).
// Tails stay for inline prints; the files are the testimony.
const childOutLog = join(STATE_ROOT, "child-stdout.log");
const childErrLog = join(STATE_ROOT, "child-stderr.log");
// Boot/census console lines share the child's stdout with the
// JSON-RPC frames (they are how the live-fire reads the seats) —
// keep them so a failure can print the host's own testimony.
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

// The operator's configured default agent model — settings.yaml's
// agent-default-model (copied from estate-drive.mjs, never guessed).
const SESSION = "craft-drive-" + Date.now().toString(36);
// BOOT RACE, PROVEN 2026-09-15 (probe18): the pi-ai adapter registers
// on settings arrival mid-boot, so an initialize sent at spawn can be
// refused NO_ADAPTER while the same call at T+100s succeeds. Retry
// session-open with backoff (the refusal is instant and cheap) —
// never mistake a cold lane for a dead one, never wait silently.
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
      console.error("craft-drive: initialize timeout");
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
    console.error("craft-drive: initialize refused:", JSON.stringify(init.error));
    console.error("full host output:", childOutLog, childErrLog);
    child.kill();
    process.exit(1);
  }
  await new Promise((r) => setTimeout(r, 5000));
}

// BOOT-GATE: the critic seat lands LATE (the pi-ai adapter registers
// on settings arrival, after early rows apply; the estate row seats
// craft on llm/adapters-updated). Never fire turns into an unseated
// lane — wait for the seating line, fail LOUD on timeout.
const gt0 = Date.now();
while (!hostLogTail.includes("engine 'craft' seated")) {
  if (Date.now() - gt0 > 180000) {
    console.error("craft-drive: engine 'craft' never seated (no adapter, no turns)");
    console.error("--- host log tail ---");
    console.error(hostLogTail.split("\n").filter((l) => /melite|seated|critic/i.test(l)).slice(-12).join("\n") || "(no seat lines captured)");
    console.error("full host output:", childOutLog, childErrLog);
    child.kill();
    process.exit(1);
  }
  await new Promise((r) => setTimeout(r, 1000));
}
console.log("craft seat confirmed");
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
/** Assistant-role text of events since `before` (ASSISTANT-ROLE TEXT
 *  ONLY — the estate-drive debt fix: harness-injected user messages
 *  never carry the proof). */
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
/** A turn that died mid-flight (route error, quota) is a NAMED
 *  failure, never a silent "no run_id": surface turn/end reasons. */
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
/** One prompt turn: send, wait for idle, return new assistant text. */
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

// TURN 1: start the loop. The model systematically JSON-STRINGIFIES
// the stages array (the 2026-09-15 drive watched it pass
// "stages":"[{...}]" twice — arguments carry the array quoted as a
// string, the door refuses, the model repeats the same shape). So the
// prompt never pastes pre-serialized JSON: it names the trap
// explicitly and has the model CONSTRUCT the arguments object. One
// retry with the refusal fed back; then LOUD (the run never starts).
let runId;
for (let attempt = 1; attempt <= 2 && runId === undefined; attempt++) {
  const hint = attempt === 1
    ? "stages must be a REAL ARRAY — do NOT JSON.stringify it into a string (passing \"stages\":\"[{...}]\" is refused; pass \"stages\":[{...}]). "
    : "Your previous call was refused for stringifying stages; construct the arguments object natively with stages as a real array and call again. ";
  const start = await turn(
    "Start exactly ONE melite run now. " + hint + "Make exactly ONE tool call: melite_flow with " +
    `one stage: id '${CRAFT_STAGE.id}', engine '${CRAFT_STAGE.engine}', and a params object with EXACTLY ` +
    "these three keys (omit none — the stage refuses without agent_prompt): " +
    `max_iterations ${CRAFT_STAGE.params.max_iterations}, inputs.command.engine ` +
    `'${CRAFT_STAGE.params.inputs.command.engine}', inputs.command.params.tool ` +
    `'${CRAFT_STAGE.params.inputs.command.params.tool}', inputs.command.params.args ` +
    `${JSON.stringify(CRAFT_STAGE.params.inputs.command.params.args)}, ` +
    `and agent_prompt with this EXACT text: '${CRAFT_STAGE.params.agent_prompt}'. ` +
    "Then reply with the tool's raw answer verbatim (the run_id), nothing else. " +
    "Do NOT read files, do NOT explore, do NOT poll run_status.",
    240000,
  );
  if (!start.idle) {
    console.error("craft-drive: start turn never reached idle");
    process.exit(1);
  }
  const errs1 = turnErrors();
  if (errs1.length > 0) {
    console.error("craft-drive: the start turn died —", errs1.join(" | "));
    console.error("assistant text tail:", start.text.slice(-600) || "(no assistant text committed)");
    process.exit(1);
  }
  runId = start.text.match(/run-[0-9a-f]+-\w+/)?.[0];
  console.log("run_id:", runId ?? "(none — attempt " + attempt + ")", attempt < 2 && runId === undefined ? start.text.slice(-300) : "");
}
if (runId === undefined) {
  console.error("craft-drive: no run_id in the committed response");
  console.error("--- host log tail (why the door refused) ---");
  console.error(hostLogTail.split("\n").filter((l) => /melite|seated|census|critic/i.test(l)).slice(-12).join("\n") || "(no seat lines captured)");
  process.exit(1);
}

// POLL: cheap run_status turns until a terminal state — PLUS the
// durable settle record. Settle EVICTS the live registry on
// completion (runsRegistry settle → evictSettled), so a run that
// finishes between two slow poll turns is never seen terminal by
// run_status again (the 2026-09-15 drive polled `? — 0/0 stage(s)`
// 28 times over a run that had completed in 7 seconds). The settle
// record (output/<run_id>/_flow.json) is the product's own durable
// verdict — watching it is not a side channel, it is the completion
// half of the contract. Either signal ends the poll.
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
while (Date.now() - pollStart < 600000) {
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
    console.error("craft-drive: a poll turn died —", errs.join(" | "));
    break;
  }
  statusText = p.text;
  // run_status renders `run <id> <status> — ...` (or the raw JSON
  // when the agent pastes it) — the 2026-09-15 drive twice burned
  // its whole budget on terminal failures the parser couldn't see
  // (first the Error body, then the `?` status a failed run
  // renders: `run <id> ? — TypeError: ...`). Rule: an Error body is
  // terminal-failed; a `?` status with a non-progress dash line is
  // terminal-failed (success renders `N/M stage(s)` there); else
  // the status word decides.
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
console.log("--- host log tail (seats + mcp census) ---");
console.log(hostLogTail.split("\n").filter((l) => /melite|seated|census|direct-probe/i.test(l)).slice(-25).join("\n") || "(no seat lines captured)");
if (status !== "completed") {
  console.error("craft-drive: run never completed");
  console.error("last status text tail:", statusText.slice(-600));
  if (settleErr) console.error("settle error:", settleErr.slice(0, 500));
  console.error("full host output:", childOutLog, childErrLog);
  process.exit(1);
}

// THE ARTIFACT: shot.png in the run's own dir, verified by its bytes.
const shot = join(STATE_ROOT, "output", runId, "shot.png");
if (!existsSync(shot)) {
  console.error("craft-drive: completed but no shot.png at", shot);
  process.exit(1);
}
const b = readFileSync(shot);
const magic = b.length > 24 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47;
const w = (b[16] << 24) | (b[17] << 16) | (b[18] << 8) | b[19];
const h = (b[20] << 24) | (b[21] << 16) | (b[22] << 8) | b[23];
console.log("artifact:", JSON.stringify({ path: shot, bytes: b.length, width: w, height: h, magic }));
if (!(magic && w === 320 && h === 320)) {
  console.error("craft-drive: shot.png is not the 320x320 render the loop promised");
  process.exit(1);
}

request("shutdown", undefined);
await new Promise((r) => setTimeout(r, 1500));
child.kill();
console.log("CRAFT DRIVE: PASS — act → capture → critique → decide ran live on the estate");
process.exit(0);
