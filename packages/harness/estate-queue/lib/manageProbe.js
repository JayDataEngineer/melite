// manageProbe.ts — the manage plane's estate probes (extracted
// from managePlane.ts, the god-file cut): the TS-native status
// walk, the active-runs census, and the manager security probe.
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { sweepOutputRoots } from "./cardsDangling.js";
import { sdkClient } from "@melite/comfyui-cordis";
import { deadline } from "@deepseek-ai/dsh-timeout";
const execFileAsync = promisify(execFile);
// ── runs / security / probe (TS-native) ────────────────────────────
const STATUS_RE = /"status"\s*:\s*"([a-z]+)"/;
/** Sidecar scan: run dirs whose _flow.json reads running|queued.
 *  THE ROOTS UNIFICATION (2026-09-25, the handoff item): the scan
 *  walks the SAME roots manifest as every run-resolving door — own
 *  state root first, then the stateRoots config extras (§23) — so a
 *  live run under the maker's tree guards the restart exactly like
 *  one under the estate's own tree. Before, a maker-lane run was
 *  invisible to the restart guard (status said idle, restart tore
 *  a live render). Conservative as ever: a stale "running" sidecar
 *  refuses the restart (safe).
 *
 *  FAIL-CLOSED (the fallback audit's HIGH-3, 2026-09-28): an
 *  UNREADABLE sidecar or root used to `continue` — the run became
 *  invisible and the guard failed OPEN (restart tore a live render
 *  whose state file hit EACCES/EISDIR/EIO). Absent state (ENOENT,
 *  ENOTDIR) is honestly inactive — nothing exists to protect;
 *  every OTHER read failure is UNKNOWN state and counts as ACTIVE,
 *  named with its errno so the refusal and the status view say
 *  exactly what could not be read. */
export function activeRuns(stateRoots) {
    const out = [];
    for (const dir of sweepOutputRoots(stateRoots)) {
        let names;
        try {
            names = readdirSync(dir);
        }
        catch (e) {
            if (e.code === "ENOENT")
                continue; // root not created yet — normal
            out.push("(unreadable root: " + dir + " " + (e.code ?? "?") + ")");
            continue;
        }
        for (const name of names) {
            if (!name.startsWith("run-"))
                continue;
            let buf;
            try {
                buf = readFileSync(join(dir, name, "_flow.json"), "utf-8").slice(0, 8191);
            }
            catch (e) {
                const code = e.code ?? "?";
                if (code === "ENOENT" || code === "ENOTDIR")
                    continue; // no state file — nothing to protect
                out.push(name + " (state unreadable: " + code + ")"); // unknown ⇒ active (fail-closed)
                continue;
            }
            const m = STATUS_RE.exec(buf);
            // 'stopping' is LIVE (the registry's own set, runsRegistry's
            // teardown + live-age laws): a stop was REQUESTED, the run is
            // still writing — restart teardown must protect it like any
            // active render (§5's producer-side live sets, 2026-10-12).
            if (m && (m[1] === "running" || m[1] === "queued" || m[1] === "stopping"))
                out.push(name);
        }
    }
    return [...new Set(out)].sort();
}
export function settleStaleClaims(stateRoots, eligible) {
    const settled = [];
    const skipped = [];
    for (const dir of sweepOutputRoots(stateRoots)) {
        let names;
        try {
            names = readdirSync(dir);
        }
        catch {
            continue; // the census names unreadable roots; the settle only rewrites rows it can read
        }
        for (const name of names) {
            if (!name.startsWith("run-"))
                continue;
            const file = join(dir, name, "_flow.json");
            let raw;
            try {
                raw = readFileSync(file, "utf-8");
            }
            catch {
                continue; // absent file — nothing to settle (the census agrees)
            }
            const m = STATUS_RE.exec(raw.slice(0, 8191));
            if (!m || (m[1] !== "running" && m[1] !== "queued" && m[1] !== "stopping"))
                continue;
            let mtimeMs = 0;
            try {
                mtimeMs = statSync(file).mtimeMs;
            }
            catch {
                skipped.push(name + " (stat unreadable)");
                continue;
            }
            if (!eligible(name, mtimeMs))
                continue;
            let row;
            try {
                const parsed = JSON.parse(raw);
                if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed))
                    throw new Error("not a row");
                row = parsed;
            }
            catch {
                skipped.push(name + " (sidecar unparseable — left active)");
                continue;
            }
            row["status"] = "stopped";
            row["settle_stale"] = "operator settle: sidecar claimed '" + m[1] +
                "' with an empty engine queue — historical, never settled (pre-rebuild claim); retired so the lifecycle doors stop refusing";
            try {
                writeFileSync(file, JSON.stringify(row));
                settled.push(name);
            }
            catch {
                skipped.push(name + " (rewrite failed)");
            }
        }
    }
    return { settled: [...new Set(settled)].sort(), skipped: [...new Set(skipped)].sort() };
}
/** The manager's live security view (READ ONLY — the manager reads
 *  config.ini once at ComfyUI startup, so a call-time write would be
 *  a lie until restart; provision owns the pin). v3.38 layout:
 *  user/__manager/config.ini (system-user-api ComfyUI), legacy
 *  user/default/ComfyUI-Manager/config.ini otherwise. */
export function managerSecurity(repoRoot) {
    const runtime = join(repoRoot, "data", "runtime", "comfyui");
    const cands = [
        join(runtime, "user", "__manager", "config.ini"),
        join(runtime, "user", "default", "ComfyUI-Manager", "config.ini"),
    ];
    for (const ini of cands) {
        let text;
        try {
            text = readFileSync(ini, "utf-8");
            // an absent or unreadable candidate ini pins nothing — the loop falls through to the legacy layout and the final "unpinned" answer is the truth
        }
        catch {
            continue;
        }
        const level = /^\s*security_level\s*=\s*(\S+)/m.exec(text);
        const gitUrl = /^\s*allow_git_url_install\s*=\s*true/m.test(text);
        return "security_level=" + (level ? level[1] : "normal (default)") + (gitUrl ? " +git_url" : "") + " [" + ini + "]";
    }
    return "unpinned (no manager config on disk — provision sync)";
}
/** The engine's own queue view (/queue), corroborating live claims:
 *  ComfyUI executes prompts SERIALLY, so `queue_running` is 0 or 1 —
 *  a reachable engine reporting BOTH empty cannot be executing any
 *  claim, and every sidecar still claiming live is historical (the
 *  finding-10 status split, 2026-10-13). Malformed or refused
 *  answers return null: no corroboration, and the census stays
 *  conservative. @param mctx the manage context (endpoint + signal).
 *  @returns the running/pending counts, or null when the engine did
 *  not answer a parseable queue. */
/** The caller's abort is never a probe answer (audits N-S2/S4):
 *  rethrow the abort reason so the fold arms below stay reserved for
 *  genuine probe failures — a cancelled caller must cancel, not
 *  degrade. Both probes in this file share the arm. */
function rethrowIfCallerAborted(signal) {
    if (signal?.aborted !== true)
        return;
    const reason = signal.reason;
    throw reason instanceof Error ? reason : new DOMException("The operation was aborted", "AbortError");
}
export async function engineQueueView(mctx) {
    const cfg = mctx.endpoint();
    const url = typeof cfg["url"] === "string" ? cfg["url"].replace(/\/+$/, "") : "";
    if (url === "")
        return null;
    const dl = deadline(mctx.signal, 5000, "MANAGE_PROBE");
    try {
        // THE SDK SEAT OWNS THE WIRE (A1, the layers audit 2026-11-17):
        // engine reads ride sdkClient().fetchApi — never a parallel
        // hand-rolled fetch spelling beside the estate's declared
        // client law (comfyui-transport.ts owns fetch + endpoints).
        const r = await sdkClient(url).fetchApi("/queue", { signal: dl.signal });
        const q = (await r.json());
        const running = q["queue_running"];
        const pending = q["queue_pending"];
        if (!Array.isArray(running) || !Array.isArray(pending))
            return null;
        return { running: running.length, pending: pending.length };
    }
    catch (e) {
        // a caller abort rides (N-S2) — only genuine probe failures
        // fold to "no corroboration"
        rethrowIfCallerAborted(mctx.signal);
        void e;
        return null;
    }
    finally {
        dl[Symbol.dispose]();
    }
}
/** The endpoint config's OWN server, probed live (/system_stats).
 *  The 5s fuse is dsh-timeout's deadline — the caller signal and
 *  the timer fuse into one signal with dispose-once cleanup (the
 *  disposal guarantee the timer service seat used to carry). */
export async function probeEndpoint(mctx) {
    const cfg = mctx.endpoint();
    const url = typeof cfg["url"] === "string" ? cfg["url"].replace(/\/+$/, "") : "";
    if (url === "")
        return { reachable: false, reason: "no url in endpoint config" };
    const dl = deadline(mctx.signal, 5000, "MANAGE_PROBE");
    try {
        // THE SDK SEAT OWNS THE WIRE (A1): the /system_stats health read
        // rides the same fetchApi spelling the execute seat's health
        // gate uses — ONE wire spelling for engine reads tree-wide.
        const r = await sdkClient(url).fetchApi("/system_stats", { signal: dl.signal });
        const stats = (await r.json());
        const sysinfo = (stats["system"] ?? {});
        const devices = (stats["devices"] ?? []).slice(0, 4).map((d) => ({
            name: typeof d["name"] === "string" ? d["name"] : "?",
            vram_total: d["vram_total"],
            vram_free: d["vram_free"],
        }));
        return { reachable: true, url, comfyui_version: sysinfo["comfyui_version"], devices };
    }
    catch (e) {
        rethrowIfCallerAborted(mctx.signal);
        return { reachable: false, url, reason: String(e).slice(0, 120) };
    }
    finally {
        dl[Symbol.dispose]();
    }
}
// ── the engine-unit census (D3-02 / R-2, 2026-11-05) ────────────────
// THE BURN (FRICTION_3 W-P2-3a / F3-09): the audio pack's env assert
// self-killed the engine at boot in a systemd restart loop (restart
// counter 270) while `comfy_manage status` read `state: up / endpoint:
// reachable` — reachability is the WHOLE truth the status stamp knew,
// and a monotonic self-kill loop answers it green. The census reads
// the truth the deployment already keeps: `systemctl --user show`
// (restart count, last exit code) plus the same journal the logs door
// reads (oom-kill lines). Keyless execs, the manageOps class.
/** One line of journal output counted as an oom kill. systemd's own
 *  result word (`oom-kill`), the cgroup event (`oom_kill`), and the
 *  kernel's killer line (`Out of memory:`) — the burn's evidence all
 *  reached the tool face through this exact read, uninterpreted. */
const OOM_LINE_RE = /oom-kill|oom_kill|Out of memory:/i;
/** @param lines - journal output lines (already split, non-empty).
 *  @returns how many lines carry an oom-kill marker. */
export function countOomLines(lines) {
    return lines.filter((ln) => OOM_LINE_RE.test(ln)).length;
}
/** The census bound: the status face answers inside the plane's 5s
 *  wall (STATUS_RECONCILE_MS's own comment) — both execs ride 1.5s
 *  fuses so a hung bus can never eat the status answer; a census that
 *  cannot answer in time is an honest `unknown`, never a lie. */
const CENSUS_EXEC_MS = 1_500;
/** THE DEGRADED LAW: two unplanned restarts, a SIGKILL last exit (the
 *  burn's `status=9/KILL` — signal 9 never arrives from a clean
 *  stop), or oom evidence in the recent journal. One of these alone
 *  degrades; a reachable /system_stats cannot clear them. */
const DEGRADE_RESTART_FLOOR = 2;
const KILL_SIGNAL = 9;
/** @param mctx - the manage context (unit + signal).
 *  @returns the unit census; `known:false` + note when systemd or the
 *  journal cannot answer (BYO lane, bus-less box) — never invented
 *  zeros dressed as data. @throws the caller's own abort (N-S2). */
export async function engineUnitCensus(mctx) {
    const unit = mctx.comfyUnit;
    const execOpts = { timeout: CENSUS_EXEC_MS, encoding: "utf8", signal: mctx.signal };
    const [propsResult, journalResult] = await Promise.allSettled([
        execFileAsync("systemctl", [
            "--user", "show", unit,
            "--property=NRestarts",
            "--property=ExecMainStatus",
            "--property=ExecMainCode",
            "--property=ExecMainExitTimestamp",
        ], execOpts),
        execFileAsync("journalctl", ["--user", "-u", unit, "-n", "200", "--no-pager", "-o", "cat"], execOpts),
    ]);
    rethrowIfCallerAborted(mctx.signal);
    const props = {};
    if (propsResult.status === "fulfilled") {
        for (const line of propsResult.value.stdout.split("\n")) {
            const m = /^([A-Za-z]+)=(.*)$/.exec(line);
            if (m)
                props[m[1]] = m[2];
        }
    }
    if (props["NRestarts"] === undefined && props["ExecMainCode"] === undefined) {
        const why = propsResult.status === "rejected"
            ? String(propsResult.reason.stderr ?? propsResult.reason.message).trim().slice(0, 120)
            : "systemd answered nothing parseable";
        return { known: false, unit, verdict: "unknown", note: "the unit census cannot answer on this lane: " + why };
    }
    let oomKills;
    let journalNote;
    if (journalResult.status === "fulfilled") {
        const lines = journalResult.value.stdout.split("\n").filter((ln) => ln !== "");
        oomKills = countOomLines(lines);
    }
    else {
        journalNote = "the journal tail could not be read for oom lines (" +
            String(journalResult.reason.message).trim().slice(0, 80) + ")";
    }
    const restarts = Number.parseInt(props["NRestarts"] ?? "", 10);
    // THE UNSET-ENUM LAW: systemd prints an unset enum as its numeric
    // encoding (`ExecMainCode=0`, `ExecMainStatus=0` — the live-box
    // census answered exactly that, restarts 3 + oom kills on the
    // journal). A bare number is "nothing recorded", not an exit code —
    // carrying `last exit 0/0` would be noise dressed as data. Only a
    // word-form code (killed / exited) carries its status with it.
    const codeWord = props["ExecMainCode"] ?? "";
    const exitCode = /^[A-Za-z]+$/.test(codeWord) ? codeWord : undefined;
    const exitStatus = exitCode === undefined ? Number.NaN : Number.parseInt(props["ExecMainStatus"] ?? "", 10);
    const row = {
        known: true,
        unit,
        verdict: "settled",
    };
    if (Number.isFinite(restarts))
        row.restarts = restarts;
    if (exitCode !== undefined)
        row.last_exit_code = exitCode;
    if (Number.isFinite(exitStatus))
        row.last_exit_status = exitStatus;
    const exitAt = props["ExecMainExitTimestamp"];
    if (exitAt !== undefined && exitAt !== "" && exitAt !== "n/a")
        row.last_exit_at = exitAt;
    if (oomKills !== undefined)
        row.oom_kills = oomKills;
    const degraded = (Number.isFinite(restarts) && restarts >= DEGRADE_RESTART_FLOOR)
        || (Number.isFinite(exitStatus) && exitStatus === KILL_SIGNAL)
        || (oomKills !== undefined && oomKills > 0);
    if (degraded) {
        row.verdict = "degraded";
        // W-4 (2026-11-15, degraded-with-cause): the verdict names the
        // laws that fired and what they mean — a bare "degraded" left
        // the reader to cross-join restarts/exit/oom themselves (the
        // burn: "still degraded: restarts 3, oom-kill 4 while serving").
        // Kernel oom evidence adds the memory-pressure reading and the
        // maker's lever: smaller windows (the refine design window is
        // 2.33 s = 56 f — the operator's OOM ruling).
        const causes = [];
        if (Number.isFinite(restarts) && restarts >= DEGRADE_RESTART_FLOOR)
            causes.push("the restart loop (>= " + DEGRADE_RESTART_FLOOR + ")");
        if (Number.isFinite(exitStatus) && exitStatus === KILL_SIGNAL)
            causes.push("a SIGKILL last exit");
        const oom = oomKills !== undefined && oomKills > 0;
        if (oom)
            causes.push("kernel oom evidence");
        row.note = "degraded by " + causes.join(" and ")
            + (oom
                ? " — the engine died under memory pressure and systemd restarted it; the maker's lever is smaller windows (the refine design window is 2.33 s = 56 f)"
                : " — systemd restarted the engine; read the journal tail for the death cause");
    }
    if (journalNote !== undefined)
        row.note = row.note === undefined ? journalNote : row.note + " (" + journalNote + ")";
    return row;
}
//# sourceMappingURL=manageProbe.js.map
