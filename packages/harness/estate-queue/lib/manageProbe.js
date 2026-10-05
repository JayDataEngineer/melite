// manageProbe.ts — the manage plane's estate probes (extracted
// from managePlane.ts, the god-file cut): the TS-native status
// walk, the active-runs census, and the manager security probe.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { sweepOutputRoots } from "./cardsDangling.js";
import { deadline } from "@deepseek-ai/dsh-timeout";
// ── runs / security / probe (TS-native) ────────────────────────────
const STATUS_RE = /"status"\s*:\s*"([a-z]+)"/;
/** Sidecar scan: run dirs whose _flow.json reads running|queued.
 *  THE ROOTS UNIFICATION (2026-09-25, the handoff item): the scan
 *  walks the SAME roots manifest as every run-resolving door — own
 *  state root first, then MELITE_STATE_ROOTS extras (§23) — so a
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
export function activeRuns() {
    const out = [];
    for (const dir of sweepOutputRoots()) {
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
        const r = await fetch(url + "/system_stats", { signal: dl.signal });
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
        if (mctx.signal?.aborted === true) {
            const reason = mctx.signal.reason;
            throw reason instanceof Error ? reason : new DOMException("The operation was aborted", "AbortError");
        }
        return { reachable: false, url, reason: String(e).slice(0, 120) };
    }
    finally {
        dl[Symbol.dispose]();
    }
}
//# sourceMappingURL=manageProbe.js.map
