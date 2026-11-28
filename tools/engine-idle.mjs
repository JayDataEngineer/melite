// tools/engine-idle.mjs — THE QUIET LAW's battery seat (B4,
// 2026-11-27: the restart-under-a-press burn).
//
// THE BURN: the pre-push battery's cold-card handoff restarted
// melite-comfyui.service unconditionally after its e2e tier — guarded
// only by the engine answering /system_stats — while the operator's
// other lane pressed a film on the same engine. The reboot landed
// under its live windows and the run died on a connection refusal.
// The manage plane's teardown doors carry the quiet law since the
// same cure (packages/harness/estate-queue/src/engineQuiet.ts — the
// engine's own queue, empty AND staying empty for a window); this
// module is the same law for the hands that ride no lane: the engine
// has ONE queue and every lane's press is a row in it, so the
// machine-wide truth is (1) /queue empty + staying empty, and (2) no
// live run sidecar under any lane's declared state root — the gap
// between two windows of one film is seconds, a lane waiting on a
// slow non-engine step between windows is not, and the sidecar
// census covers it.
//
// FAIL-CLOSED like the plane's own census (manageProbe.ts
// activeRuns): an unreadable sidecar or root counts as LIVE, named
// with its errno; a lane whose declared state root cannot be read
// from its config counts as UNKNOWN and is named — the handoff
// stands down rather than guess. Absent state (ENOENT/ENOTDIR) is
// honestly inactive — nothing exists to protect.
//
// DEAD IS POSITIVE EVIDENCE (2026-11-28, the browser-tier red): the
// first face of this handoff read "the engine went down" whenever
// /queue AND /system_stats both failed inside 4s — and on a box at
// 56/59 GB with swap in use and a four-job queue on the engine, both
// reads TIMED OUT while melite-comfyui.service had run untouched for
// twenty hours. A slow engine is not a dead one. Death is the
// transport's own word — a refused or reset connection, a dropped
// pipe, a name or route that resolves to no one (the B4b law:
// packages/engines/comfyui-cordis/src/supervisor.ts TRANSPORT_DEAD_CODES);
// a timeout, an abort or a code-less failure is UNKNOWN and rides the
// fail-closed path like any unreadable queue. The wall pins the
// parity (tests/walls/ts/suites/engine-idle-law.spec.ts).
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

/** The poll cadence under the quiet window (mirrors QUIET_POLL_MS). */
export const QUIET_POLL_MS = 1000;
/** The quiet window the handoff requires — the manage provider's own
 *  default (ManageConfig.engineQuiesceMs); the wall pins the pair. */
export const HANDOFF_QUIESCE_MS = 10_000;
/** How long the handoff waits for a quiet engine: a film's length.
 *  Past it the handoff stands down LOUD and the browser tier runs on
 *  the warm card — never a restart under a press. */
export const HANDOFF_WAIT_MS = 30 * 60_000;
/** The engine unit the estate deploys (the manage provider's default). */
export const ESTATE_ENGINE_UNIT = "melite-comfyui.service";

const STATUS_RE = /"status"\s*:\s*"([a-z]+)"/;
const LIVE_WORDS = new Set(["running", "queued", "stopping"]);

/** Read the engine's queue: the machine-wide press census.
 *  @param fetchImpl - fetch (injectable for the wall).
 *  @param baseUrl - the engine's base URL.
 *  @returns { running, pending } counts, or null when the engine did
 *  not answer a parseable queue. */
export async function readQueue(fetchImpl, baseUrl) {
  try {
    const r = await fetchImpl(new URL("/queue", baseUrl), { signal: AbortSignal.timeout(4_000) });
    if (!r.ok) return null;
    const q = await r.json();
    if (!Array.isArray(q.queue_running) || !Array.isArray(q.queue_pending)) return null;
    return { running: q.queue_running.length, pending: q.queue_pending.length };
  } catch {
    return null;
  }
}

export const GONE_CODES = new Set([
  "ECONNREFUSED",
  "ECONNRESET",
  "ENOTFOUND",
  "EAI_AGAIN",
  "EHOSTUNREACH",
  "EHOSTDOWN",
  "ENETUNREACH",
  "ENETDOWN",
  "EPIPE",
]);

/** The gone-code of a failed read — on the error or on undici's cause
 *  hop (fetch wraps the socket error) — or null when the failure says
 *  nothing about death (a timeout, an abort, anything code-less).
 *  @param error - the rejected read's error.
 *  @returns the transport code, or null. */
export function goneCode(error) {
  for (const e of [error, error?.cause]) {
    const code = typeof e === "object" && e !== null ? e.code : undefined;
    if (typeof code === "string" && GONE_CODES.has(code)) return code;
  }
  return null;
}

/** The engine's liveness (/system_stats) — read only when the queue
 *  did not answer, to tell a GONE engine (the transport says nobody
 *  listens: nothing to protect, nothing to restart) from an unreadable
 *  one (unknown ⇒ busy). ANY answer — ok or not — is a server that
 *  listens: alive.
 *  @param fetchImpl - fetch (injectable for the wall).
 *  @param baseUrl - the engine's base URL.
 *  @returns { state: "alive" | "gone" | "unknown", code } — the
 *  transport's word when gone, else a null code. */
export async function engineLiveness(fetchImpl, baseUrl) {
  try {
    await fetchImpl(new URL("/system_stats", baseUrl), { signal: AbortSignal.timeout(4_000) });
    return { state: "alive", code: null };
  } catch (error) {
    const code = goneCode(error);
    return code === null ? { state: "unknown", code: null } : { state: "gone", code };
  }
}

/** Every lane's DECLARED state root on this box: each DSH home's
 *  profiles' cordis.patch.yml `stateRoot:` (a literal, or the estate's
 *  profileContext expression `<profile dir> + "<suffix>"`), falling
 *  back to `<repoRoot>/data/runs` exactly as the queue seat's
 *  resolveStateRoot does. An expression the parser cannot resolve is
 *  returned as an `unknown` row — never silently skipped.
 *  @param home - the home directory holding the `.dsh*` homes.
 *  @returns the declared roots plus any unknown declarations. */
export function laneStateRoots(home = homedir()) {
  const roots = [];
  const unknown = [];
  let homes = [];
  try {
    homes = readdirSync(home).filter((n) => n.startsWith(".dsh")).map((n) => join(home, n));
  } catch {
    return { roots, unknown: ["(unreadable home: " + home + ")"] };
  }
  const seen = new Set();
  for (const dshHome of homes) {
    const profilesDir = join(dshHome, "profiles");
    let profiles = [];
    try {
      profiles = readdirSync(profilesDir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => join(profilesDir, d.name));
    } catch {
      continue; // a home without profiles declares no runs root
    }
    for (const profile of profiles) {
      const yml = join(profile, "cordis.patch.yml");
      if (!existsSync(yml)) continue;
      let text = "";
      try {
        text = readFileSync(yml, "utf8");
      } catch (e) {
        unknown.push(profile + " (config unreadable: " + (e.code ?? "?") + ")");
        continue;
      }
      const m = /^[ \t]*stateRoot:[ \t]*(.+)$/m.exec(text);
      if (m === null) {
        const repo = /^[ \t]*repoRoot:[ \t]*"?([^"\n]+)"?[ \t]*$/m.exec(text);
        if (repo !== null) {
          const root = join(repo[1].trim(), "data", "runs");
          if (!seen.has(root)) { seen.add(root); roots.push(root); }
        }
        continue; // a profile that declares neither pins no runs tree
      }
      const value = m[1].trim();
      const literal = /^"([^"]+)"$/.exec(value) ?? /^'([^']+)'$/.exec(value);
      if (literal !== null) {
        if (!seen.has(literal[1])) { seen.add(literal[1]); roots.push(literal[1]); }
        continue;
      }
      const expr = /profileContext"\)\.dir\s*\+\s*"([^"]+)"/.exec(value);
      if (expr !== null) {
        const root = join(profile, expr[1]);
        if (!seen.has(root)) { seen.add(root); roots.push(root); }
        continue;
      }
      unknown.push(profile + " (stateRoot expression unresolved: " + value.slice(0, 80) + ")");
    }
  }
  return { roots, unknown };
}

/** The sidecar census over the declared roots — the plane's own
 *  activeRuns law (manageProbe.ts) in the battery's spelling: run
 *  dirs under <root>/output and <root>/test-output whose _flow.json
 *  claims running|queued|stopping; unreadable state counts as live.
 *  @param stateRoots - the declared state roots.
 *  @returns the live claims, named. */
export function liveRunClaims(stateRoots) {
  const out = [];
  const seen = new Set();
  for (const root of stateRoots) {
    for (const tree of [join(root, "output"), join(root, "test-output")]) {
      let names;
      try {
        names = readdirSync(tree);
      } catch (e) {
        if ((e.code ?? "") === "ENOENT") continue; // root not created yet — normal
        out.push("(unreadable root: " + tree + " " + (e.code ?? "?") + ")");
        continue;
      }
      for (const name of names) {
        if (!name.startsWith("run-")) continue;
        let buf;
        try {
          buf = readFileSync(join(tree, name, "_flow.json"), "utf8").slice(0, 8191);
        } catch (e) {
          const code = e.code ?? "?";
          if (code === "ENOENT" || code === "ENOTDIR") continue; // no state file — nothing to protect
          out.push(name + " (state unreadable: " + code + ")"); // unknown ⇒ live (fail-closed)
          continue;
        }
        const m = STATUS_RE.exec(buf);
        if (m !== null && LIVE_WORDS.has(m[1]) && !seen.has(name)) {
          seen.add(name);
          out.push(name);
        }
      }
    }
  }
  return out.sort();
}

const defaultSleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Wait for a QUIET engine inside the budget: the queue empty AND
 *  staying empty for the window, with no live lane claim at the first
 *  empty reading and again at the verdict. A press landing inside the
 *  window re-arms the clock.
 *  @param opts - fetchImpl, baseUrl, stateRoots, quiesceMs, budgetMs,
 *  sleep (injectable), onWait (progress, injectable).
 *  @returns the verdict: idle, or the busy truth it waited on —
 *  `{ idle, reason, goneCode?, running, pending, claims, busyReads,
 *  waitedMs }`; goneCode rides only an engine-down verdict. */
export async function awaitEngineIdle(opts) {
  const fetchImpl = opts.fetchImpl;
  const baseUrl = opts.baseUrl;
  const stateRoots = opts.stateRoots;
  const quiesceMs = opts.quiesceMs ?? HANDOFF_QUIESCE_MS;
  const budgetMs = opts.budgetMs ?? HANDOFF_WAIT_MS;
  const sleep = opts.sleep ?? defaultSleep;
  const now = opts.now ?? Date.now;
  const onWait = opts.onWait ?? (() => {});
  const started = now();
  const deadline = started + budgetMs;
  let emptySince = null;
  let last = { running: 0, pending: 0 };
  let claims = [];
  let busyReads = 0;
  let lastNote = 0;
  for (;;) {
    const answer = await readQueue(fetchImpl, baseUrl);
    if (answer !== null) last = answer;
    // an unanswerable queue: a GONE engine — the transport's own word,
    // never a timeout — has nothing left to protect and nothing to
    // restart (stand down at once, never a 30-minute stall); an engine
    // that answers, or whose reads merely time out, with an unreadable
    // queue is UNKNOWN — busy, fail-closed (the last answerable
    // reading is what the verdict reports)
    const unknown = answer === null;
    if (unknown) {
      const liveness = await engineLiveness(fetchImpl, baseUrl);
      if (liveness.state === "gone") {
        return { idle: false, reason: "engine-down", goneCode: liveness.code, running: last.running, pending: last.pending, claims, busyReads, waitedMs: now() - started };
      }
    }
    const busy = unknown || answer.running > 0 || answer.pending > 0;
    const tick = now();
    if (busy) {
      emptySince = null;
      busyReads += 1;
      if (tick - lastNote >= 30_000) {
        lastNote = tick;
        onWait(unknown
          ? "engine queue unreadable — the engine answers nothing in time (slow, or gone unproven); unknown counts as busy (" + Math.round((tick - started) / 1000) + "s waited)"
          : "engine queue busy — " + answer.running + " running, " + answer.pending + " pending (" + Math.round((tick - started) / 1000) + "s waited)");
      }
    } else if (emptySince === null) {
      emptySince = tick;
      // the census rides the FIRST empty reading: a lane mid-film
      // between windows reads empty here while its sidecar still
      // claims live — the claim is the busy signal
      claims = liveRunClaims(stateRoots);
      if (claims.length > 0) {
        emptySince = null;
        busyReads += 1;
        if (tick - lastNote >= 30_000) {
          lastNote = tick;
          onWait("live lane runs — " + claims.slice(0, 4).join(", ") + (claims.length > 4 ? ", …" : "") + " (" + Math.round((tick - started) / 1000) + "s waited)");
        }
      }
    }
    const elapsedEmpty = emptySince === null ? -1 : now() - emptySince;
    if (!busy && elapsedEmpty >= quiesceMs) {
      claims = liveRunClaims(stateRoots);
      if (claims.length === 0) return { idle: true, running: last.running, pending: last.pending, busyReads, waitedMs: now() - started };
      emptySince = null;
      busyReads += 1;
      onWait("live lane runs at the verdict — " + claims.slice(0, 4).join(", ") + "; the clock re-arms");
    }
    if (now() >= deadline) {
      return { idle: false, reason: "busy", running: last.running, pending: last.pending, claims, busyReads, waitedMs: now() - started };
    }
    await sleep(Math.min(QUIET_POLL_MS, Math.max(1, deadline - now())));
  }
}

/** THE COLD-CARD HANDOFF: wait for a quiet engine, then restart it
 *  cold. Never a restart under a press: an engine that never goes
 *  quiet inside the budget is left running and the verdict says so.
 *  An unknown lane declaration stands the handoff down the same way.
 *  @param opts - fetchImpl, spawn (async (cmd, args) => { status }),
 *  stateRoots + unknown (laneStateRoots), unit, log, sleep, quiesceMs,
 *  budgetMs, bootProbeMs.
 *  @returns what the handoff did and why. */
export async function coldCardHandoff(opts) {
  const log = opts.log ?? console.warn;
  const unit = opts.unit ?? ESTATE_ENGINE_UNIT;
  if (opts.unknown.length > 0) {
    const note = "SKIP-LOUD: a lane's declared state root is unreadable (" + opts.unknown.join("; ") + ") — the handoff cannot judge the engine idle; NOT restarted, the browser tier runs on the WARM card";
    log(note);
    return { restarted: false, reason: "unknown-lane", note };
  }
  const verdict = await awaitEngineIdle({
    fetchImpl: opts.fetchImpl,
    baseUrl: opts.baseUrl,
    stateRoots: opts.stateRoots,
    quiesceMs: opts.quiesceMs,
    budgetMs: opts.budgetMs,
    sleep: opts.sleep,
    now: opts.now,
    onWait: (line) => log("HANDOFF WAIT: " + line),
  });
  if (!verdict.idle && verdict.reason === "engine-down") {
    const note = "SKIP-LOUD: the engine is GONE at " + opts.baseUrl + " (" + verdict.goneCode + ") — nobody listens, nothing to restart; the browser tier runs against whatever answers (its own boot grace covers a re-spawn)";
    log(note);
    return { restarted: false, reason: "engine-down", note, verdict };
  }
  if (!verdict.idle) {
    const note = "SKIP-LOUD: engine busy for " + Math.round(verdict.waitedMs / 1000) + "s (" + verdict.running + " running, " + verdict.pending +
      " pending; live lane runs: " + (verdict.claims.length === 0 ? "none" : verdict.claims.slice(0, 4).join(", ")) + ") — NOT restarted; the browser tier runs on the WARM card the e2e tier left (journeys may refuse at the VRAM door)";
    log(note);
    return { restarted: false, reason: "busy", note, verdict };
  }
  const restart = await opts.spawn("systemctl", ["--user", "restart", unit]);
  if (restart.status !== 0) {
    const note = "SKIP-LOUD: " + unit + " absent — the browser tier runs on the WARM card the e2e tier left (journeys may refuse at the VRAM door)";
    log(note);
    return { restarted: false, reason: "unit-absent", note, verdict };
  }
  const sleep = opts.sleep ?? defaultSleep;
  await sleep(opts.bootProbeMs ?? 12_000);
  const cold = await opts.fetchImpl(new URL("/system_stats", opts.baseUrl), { signal: AbortSignal.timeout(20_000) }).then((r) => r.ok).catch(() => false);
  const note = "HANDOFF: engine restarted cold for the browser tier after " + Math.round(verdict.waitedMs / 1000) + "s of quiet-wait (boot probe " +
    (cold ? "ok" : "still settling — the lane's own boot grace covers it") + ")";
  log(note);
  return { restarted: true, reason: "quiet", note, verdict };
}
