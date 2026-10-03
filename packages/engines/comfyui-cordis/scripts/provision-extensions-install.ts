// provision-extensions-install — the extension install step.
//
// CHANNEL LAW (operator 2026-10-13): ComfyUI-Manager is the ONE
// vendor for extensions. Every declared row carries a git url —
// upstream packs at their upstream repos, first-party packs at
// github.com/JayDataEngineer/<pack> (the same repos this tree
// references as submodules under vendor/comfyui_extensions).
// Installs ride Manager's own git-url door
// (POST /customnode/install/git_url — the same endpoint the estate
// provider and Manager's UI use), which also runs each pack's
// requirements.txt pip leg; the CLI never clones, never
// pip-installs, never copies directories. Outcomes are verified on
// disk after each call (the installed clone's git remote).

import { execSync } from "node:child_process";
import { existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { DEFAULT_CONFIG, DRY, REPO, RUNTIME, die, info, warn } from "./provision-shared.ts";
import { engineUrl, loadConfig } from "./provision-config.ts";
import { mergeManifest } from "./provision-extensions-manifest.ts";

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

/** Clear a stale install shape at a url row's custom_nodes path —
 *  a Manager install of THIS remote is the only shape that may
 *  stay (urlInstalled decides); the dev-symlink era and real-copy
 *  era left links and plain directories that Manager correctly
 *  refuses to install over ("Already exists"). A symlink unlinks
 *  without touching its target; a git dir with a different remote
 *  is a declaration conflict — the declaration is the truth.
 *  @param url the declared git remote.
 *  @param workspace the engine workspace root.
 *  @returns "" when nothing was removed, else the removed shape
 *           ("symlink" | "file" | "directory" | "stale clone"). */
export function clearStaleInstall(url: string, workspace: string): string {
  const dir = url.replace(/\/+$/, "").replace(/\.git$/, "")
    .split("/").pop() ?? "";
  const target = join(workspace, "custom_nodes", dir);
  let st;
  try {
    st = lstatSync(target);
  } catch { return ""; }
  if (st.isSymbolicLink()) {
    rmSync(target, { force: true });
    return "symlink";
  }
  if (!st.isDirectory()) {
    rmSync(target, { force: true });
    return "file";
  }
  if (urlInstalled(url, workspace)) return "";
  const shape = existsSync(join(target, ".git")) ? "stale clone" : "directory";
  rmSync(target, { recursive: true, force: true });
  return shape;
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
      console.log("[dry-run] manager git_url install [" + name + "] " + url);
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
        "extensions install through Manager's git-url door: " +
        (error instanceof Error ? error.message : String(error)));
    }
    const flagStable = ensureManagerGitUrlAllowed(
      join(RUNTIME, "user", "__manager", "config.ini"));
    if (!flagStable) {
      die("allow_git_url_install written to the manager config — the " +
        "engine reads it once at startup: restart the engine, then " +
        "rerun this step");
    }
    // Install each row through Manager's own git-url door — the
    // same endpoint the estate provider and Manager's UI use. The
    // call is synchronous: Manager clones the repo and runs its
    // requirements.txt inside the request (a cold pip leg can take
    // minutes; the timeout is 15 minutes per row). The node QUEUE
    // (queue/install) resolves names through Manager's channel
    // registry — first-party pack names are not in it and the
    // worker refuses them ("not found in [default, cache]");
    // git_url is the door for arbitrary remotes.
    for (const row of pending) {
      const stale = clearStaleInstall(row.url, workspace);
      if (stale !== "") {
        warn("  [" + row.name + "] removed a stale " + stale +
          " at custom_nodes/" + row.url.split("/").pop() +
          " — Manager owns this path now");
      }
      info("  [" + row.name + "] manager git_url install — " + row.url);
      const res = await fetch(endpoint + "/customnode/install/git_url", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: row.url }),
        signal: AbortSignal.timeout(900_000),
      });
      if (!res.ok) {
        warn("  [" + row.name + "] install refused (status " + res.status +
          ") — the engine log has the failure");
        counts.failed += 1;
        continue;
      }
      // Verify the outcome on disk: the clone's git remote IS the
      // row (a 200 with action=skip means it was already there).
      if (!urlInstalled(row.url, workspace)) {
        warn("  [" + row.name + "] not present after a 200 — the " +
          "engine log has the failure");
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
