// provision-extensions-install — the extension install step.
//
// CHANNEL LAW (operator 2026-10-13): ComfyUI-Manager is the ONE
// vendor for extensions. Every declared row carries a git url —
// upstream packs at their upstream repos, first-party packs at
// github.com/JayDataEngineer/<pack> (the same repos this tree
// references as submodules under vendor/comfyui_extensions).
// Installs ride Manager's own node queue
// (/manager/queue/install + /manager/queue/start), which also runs
// each pack's requirements.txt pip leg; the CLI never clones, never
// pip-installs, never copies directories. Outcomes are verified on
// disk after the queue drains (the installed clone's git remote)
// because per-item results stream over websocket events, not a
// REST body.

import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { DEFAULT_CONFIG, DRY, REPO, RUNTIME, die, info, warn } from "./provision-shared.ts";
import { engineUrl, loadConfig } from "./provision-config.ts";
import { mergeManifest } from "./provision-extensions-manifest.ts";

/** The /manager/queue/install body for an unknown git-url pack —
 *  the exact form Manager's install_custom_node route resolves
 *  through its risky-level gate (allow_git_url_install + loopback
 *  listen, both pinned on this estate).
 *  @param name declaration row name — rides ui_id so queue events
 *             trace back to the row.
 *  @param url the pack's git remote.
 *  @returns the JSON body the route accepts. */
export function queueInstallPayload(name: string, url: string):
    Record<string, unknown> {
  return {
    id: "unknown",
    version: "unknown",
    selected_version: "unknown",
    files: [url],
    pip: [],
    channel: "default",
    mode: "cache",
    ui_id: name,
  };
}

/** Queue-drain predicate over GET /manager/queue/status.
 *  @param status the parsed status body.
 *  @returns true when no task is processing and every queued task
 *           has finished. */
export function queueDrained(status: {
  total_count: number; done_count: number; is_processing: boolean;
}): boolean {
  return !status.is_processing && status.total_count === status.done_count;
}

/** True if some custom_nodes clone's git remote IS this url (the
 *  Manager renames install dirs; matching the remote is exact).
 *  @param url the declared git remote.
 *  @param workspace the engine workspace root.
 *  @returns true when a clone with this remote is installed. */
export function urlInstalled(url: string, workspace: string): boolean {
  const want = url.replace(/\/$/, "").toLowerCase()
    .replace(/\.git$/, "");
  let kids: string[] = [];
  try {
    kids = readdirSync(join(workspace, "custom_nodes")).sort();
  } catch { return false; }
  for (const k of kids) {
    const cfgF = join(workspace, "custom_nodes", k, ".git", "config");
    if (!existsSync(cfgF)) continue;
    const text = readFileSync(cfgF, "utf8");
    for (const m of text.matchAll(/url\s*=\s*(\S+)/g)) {
      if (m[1].replace(/\/$/, "").toLowerCase().replace(/\.git$/, "") ===
          want) return true;
    }
  }
  return false;
}

/** The installed clone's HEAD commit, for ref-pin verification.
 *  @param workspace the engine workspace root.
 *  @param dir the custom_nodes dir name Manager installed.
 *  @returns the commit sha, or "" when the dir is not a clone. */
export function installedHead(workspace: string, dir: string): string {
  try {
    return execSync("git rev-parse HEAD",
      { cwd: join(workspace, "custom_nodes", dir), encoding: "utf8" })
      .trim();
  } catch { return ""; }
}

/** Idempotently pin allow_git_url_install = true in the manager's
 *  config.ini — the flag gate for unknown-URL queue installs
 *  (read once at engine startup; a change needs a restart).
 *  @param configPath the manager config.ini path.
 *  @returns true when the file already carried the flag. */
export function ensureManagerGitUrlAllowed(configPath: string): boolean {
  const wanted = "allow_git_url_install = true";
  if (!existsSync(configPath)) {
    mkdirSync(dirname(configPath), { recursive: true });
    writeFileSync(configPath, "[default]\n" + wanted + "\n");
    return false;
  }
  const text = readFileSync(configPath, "utf8");
  if (/^\s*allow_git_url_install\s*=/m.test(text)) {
    const line = text.split("\n").find(
      (l) => /^\s*allow_git_url_install\s*=/.test(l));
    return line?.trim() === wanted;
  }
  writeFileSync(configPath, text.replace(/\n*$/u, "\n") + wanted + "\n");
  return false;
}

export async function stepExtensions(): Promise<boolean> {
  const exts = mergeManifest(REPO);
  info(exts.length + " extensions declared");
  const cfg = loadConfig(DEFAULT_CONFIG);
  if (cfg.provision !== "managed") {
    die("provision=" + JSON.stringify(cfg.provision) + " — BYO " +
      "deployments own their custom_nodes; the estate never " +
      "installs into a user workspace");
  }
  const workspace = RUNTIME;
  const counts = { installed: 0, skipped: 0, failed: 0, blocked: 0 };
  let planned = 0;
  const pending: Array<{ name: string; url: string; ref: string }> = [];
  for (const e of exts) {
    const name = (e.name ?? "").trim();
    const url = (e.url ?? "").trim();
    const ref = (e.ref ?? "").trim();
    if (!name) continue;
    if (!url && (e.registry ?? "").trim()) {
      warn("  [" + name + "] registry rows ride the runtime door " +
        "(comfy_manage install_extension) — declare a url for the " +
        "provision step");
      counts.failed += 1;
      continue;
    }
    if (!url) {
      warn("  [" + name + "] has no url — every extension declares " +
        "its source (first-party packs: github.com/JayDataEngineer/" +
        name + ")");
      counts.failed += 1;
      continue;
    }
    if (urlInstalled(url, workspace)) {
      counts.skipped += 1;
      info("  [" + name + "] already in custom_nodes — skipping");
      continue;
    }
    if (DRY) {
      console.log("[dry-run] manager queue install [" + name + "] " + url);
      planned += 1;
      continue;
    }
    pending.push({ name, url, ref });
  }
  if (!DRY && pending.length > 0) {
    const endpoint = engineUrl(cfg);
    if (endpoint === "") {
      die("ComfyUI endpoint URL is not configured — the extension " +
        "queue rides the running engine's manager");
    }
    // The engine must be UP: the queue lives inside it.
    try {
      const probe = await fetch(endpoint + "/manager/version",
        { signal: AbortSignal.timeout(10_000) });
      if (!probe.ok) throw new Error("status " + probe.status);
    } catch (error: unknown) {
      die("ComfyUI-Manager is not answering at " + endpoint + " — " +
        "start the engine first (pnpm run provision -- boot-cmd); " +
        "extensions install through the manager queue: " +
        (error instanceof Error ? error.message : String(error)));
    }
    const flagStable = ensureManagerGitUrlAllowed(
      join(RUNTIME, "user", "__manager", "config.ini"));
    if (!flagStable) {
      die("allow_git_url_install written to the manager config — the " +
        "engine reads it once at startup: restart the engine, then " +
        "rerun this step");
    }
    // Enqueue every row, then start the queue once.
    for (const row of pending) {
      const res = await fetch(endpoint + "/manager/queue/install", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(queueInstallPayload(row.name, row.url)),
        signal: AbortSignal.timeout(30_000),
      });
      if (!res.ok) {
        warn("  [" + row.name + "] queue install refused (status " +
          res.status + ")");
        counts.failed += 1;
        row.url = "";
      }
    }
    const startable = pending.filter((r) => r.url !== "");
    if (startable.length > 0) {
      const res = await fetch(endpoint + "/manager/queue/start", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}",
        signal: AbortSignal.timeout(30_000),
      });
      if (!res.ok) {
        die("/manager/queue/start refused (status " + res.status + ")");
      }
      // Drain: Manager works the queue serially (clones + pip legs
      // can take minutes on a cold machine).
      const deadline = Date.now() + 900_000;
      for (;;) {
        await new Promise((r) => setTimeout(r, 1_000));
        const st = await fetch(endpoint + "/manager/queue/status",
          { signal: AbortSignal.timeout(10_000) });
        if (!st.ok) continue;
        const body = await st.json() as {
          total_count: number; done_count: number;
          is_processing: boolean; in_progress_count: number;
        };
        info("  queue: " + body.done_count + "/" + body.total_count +
          " done" + (body.in_progress_count > 0 ? ", working" : ""));
        if (queueDrained(body)) break;
        if (Date.now() > deadline) {
          die("manager queue did not drain within 15 minutes — the " +
            "engine log has the failing row; rerun this step");
        }
      }
    }
    // Verify outcomes on disk: the clone's git remote IS the row.
    for (const row of pending) {
      if (row.url === "") continue;
      if (!urlInstalled(row.url, workspace)) {
        warn("  [" + row.name + "] not installed after the queue " +
          "drained — the engine log has the failure");
        counts.failed += 1;
        continue;
      }
      counts.installed += 1;
      if (row.ref) {
        const dir = row.url.replace(/\/+$/, "").replace(/\.git$/, "")
          .split("/").pop() ?? "";
        const head = installedHead(workspace, dir);
        if (head !== "" && head !== row.ref) {
          warn("  [" + row.name + "] installed at " + head.slice(0, 10) +
            " but the declaration pins " + row.ref.slice(0, 10) +
            " — audit the drift deliberately (the pin is the truth)");
        }
      }
    }
  }
  info("extensions: " + counts.installed + " installed" +
    (planned > 0 ? ", " + planned + " planned" : "") + ", " +
    counts.skipped + " skipped, " + counts.failed + " failed, " +
    counts.blocked + " blocked");
  if (!DRY && counts.installed > 0) {
    info("restart required for new nodes (restart_comfyui is " +
      "operator-invoked: comfy restart, or the stop/boot doors)");
  }
  return counts.failed === 0 && counts.blocked === 0;
}
