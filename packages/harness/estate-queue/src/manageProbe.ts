// manageProbe.ts — the manage plane's estate probes (extracted
// from managePlane.ts, the god-file cut): the TS-native status
// walk, the active-runs census, and the manager security probe.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { Req, ManageCtx } from "./managePlane.ts";

// ── runs / security / probe (TS-native) ────────────────────────────
const STATUS_RE = /"status"\s*:\s*"([a-z]+)"/;

/** Sidecar scan: run dirs whose _flow.json reads running|queued.
 *  Anchored at the REPO data tree (inherited behavior — the scan
 *  follows the estate, not the state root). Conservative: a stale
 *  "running" sidecar refuses the restart (safe). */
export function activeRuns(repoRoot: string): string[] {
  const dir = join(repoRoot, "data", "runs", "output");
  let names: string[];
  try {
    names = readdirSync(dir);
  } catch {
    return [];
  }
  const out: string[] = [];
  for (const name of names) {
    if (!name.startsWith("run-")) continue;
    let buf: string;
    try {
      buf = readFileSync(join(dir, name, "_flow.json"), "utf-8").slice(0, 8191);
    } catch {
      continue;
    }
    const m = STATUS_RE.exec(buf);
    if (m && (m[1] === "running" || m[1] === "queued")) out.push(name);
  }
  return out.sort();
}

/** The manager's live security view (READ ONLY — the manager reads
 *  config.ini once at ComfyUI startup, so a call-time write would be
 *  a lie until restart; provision owns the pin). v3.38 layout:
 *  user/__manager/config.ini (system-user-api ComfyUI), legacy
 *  user/default/ComfyUI-Manager/config.ini otherwise. */
export function managerSecurity(repoRoot: string): string {
  const runtime = join(repoRoot, "data", "runtime", "comfyui");
  const cands = [
    join(runtime, "user", "__manager", "config.ini"),
    join(runtime, "user", "default", "ComfyUI-Manager", "config.ini"),
  ];
  for (const ini of cands) {
    let text: string;
    try {
      text = readFileSync(ini, "utf-8");
    } catch {
      continue;
    }
    const level = /^\s*security_level\s*=\s*(\S+)/m.exec(text);
    const gitUrl = /^\s*allow_git_url_install\s*=\s*true/m.test(text);
    return "security_level=" + (level ? level[1] : "normal (default)") + (gitUrl ? " +git_url" : "") + " [" + ini + "]";
  }
  return "unpinned (no manager config on disk — provision sync)";
}

interface EndpointView {
  reachable: boolean;
  url?: string;
  reason?: string;
  comfyui_version?: unknown;
  devices?: Array<{ name: string; vram_total: unknown; vram_free: unknown }>;
}

/** The endpoint config's OWN server, probed live (/system_stats).
 *  The 5s abort rides the timer service seat (ManageCtx.timeout —
 *  the cordis-plugin-timer seam): the returned disposer is both the
 *  early clear and the disposal guarantee, no bare setTimeout
 *  (deep-audit finding #7, 2026-09-10). */
export async function probeEndpoint(mctx: ManageCtx): Promise<EndpointView> {
  const cfg = mctx.endpoint();
  const url = typeof cfg["url"] === "string" ? (cfg["url"] as string).replace(/\/+$/, "") : "";
  if (url === "") return { reachable: false, reason: "no url in endpoint config" };
  const ctrl = new AbortController();
  const t = mctx.timeout((): void => ctrl.abort(), 5000);
  try {
    const r = await fetch(url + "/system_stats", { signal: ctrl.signal });
    const stats = (await r.json()) as Record<string, unknown>;
    const sysinfo = (stats["system"] ?? {}) as Record<string, unknown>;
    const devices = ((stats["devices"] ?? []) as Array<Record<string, unknown>>).slice(0, 4).map((d) => ({
      name: typeof d["name"] === "string" ? (d["name"] as string) : "?",
      vram_total: d["vram_total"],
      vram_free: d["vram_free"],
    }));
    return { reachable: true, url, comfyui_version: sysinfo["comfyui_version"], devices };
  } catch (e) {
    return { reachable: false, url, reason: String(e).slice(0, 120) };
  } finally {
    t();
  }
}
