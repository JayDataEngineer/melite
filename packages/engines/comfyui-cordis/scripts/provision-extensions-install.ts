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

/** Normalize a git remote for identity comparison — case, a
 *  trailing slash and a .git suffix carry no identity.
 *  @param url a remote url in any of its spellings.
 *  @returns the comparable form. */
function normRemote(url: string): string {
  return url.replace(/\/$/, "").toLowerCase().replace(/\.git$/, "");
}

/** Every remote url declared in one clone's .git/config.
 *  @param cloneDir the custom_nodes directory to read.
 *  @returns the normalized remotes; empty when the dir is no clone. */
function remotesOf(cloneDir: string): string[] {
  const cfgF = join(cloneDir, ".git", "config");
  if (!existsSync(cfgF)) return [];
  const text = readFileSync(cfgF, "utf8");
  return [...text.matchAll(/url\s*=\s*(\S+)/g)].map((m) => normRemote(m[1]!));
}

/** The custom_nodes directory whose git remote IS this url — the only
 *  reliable identity of a Manager install. Manager renames install
 *  dirs (lrzjason/Comfyui-QwenEditUtils landed as "qweneditutils",
 *  numz/ComfyUI-SeedVR2_VideoUpscaler as "seedvr2_videoupscaler"), so
 *  a row's repo name is NOT its directory name; the remote is exact.
 *  @param url the declared git remote.
 *  @param workspace the engine workspace root.
 *  @returns the matching directory name, or "" when none is. */
export function installedDirFor(url: string, workspace: string): string {
  const want = normRemote(url);
  let kids: string[] = [];
  try {
    kids = readdirSync(join(workspace, "custom_nodes")).sort();
  } catch { return ""; }
  for (const k of kids) {
    if (remotesOf(join(workspace, "custom_nodes", k)).includes(want)) return k;
  }
  return "";
}

/** True if some custom_nodes clone's git remote IS this url (the
 *  Manager renames install dirs; matching the remote is exact).
 *  @param url the declared git remote.
 *  @param workspace the engine workspace root.
 *  @returns true when a clone with this remote is installed. */
export function urlInstalled(url: string, workspace: string): boolean {
  return installedDirFor(url, workspace) !== "";
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

/** The landed-HEAD verdict for one row, in the runtime provider's
 *  law (manager-provider.ts:415-432): a declared pin is verified
 *  against the commit on disk, and a row that cannot report one is
 *  unverifiable — its own refusal, not a pass. A row with no pin is
 *  a registry install (the impact packs) and carries no commit by
 *  design. The head is read from the directory whose git remote IS
 *  the declared url (installedDirFor), never from a name derived
 *  from the url — Manager renames install dirs, so a name-derived
 *  lookup verified a directory that does not exist and failed seven
 *  rows that had landed exactly at their pins (2026-10-15).
 *  @returns "" when the row's landed state is the declared one. */
export function landedVerdict(
  name: string,
  url: string,
  ref: string,
  workspace: string,
): string {
  if (ref === undefined || ref === "") return "";
  const dir = installedDirFor(url, workspace);
  const head = dir === "" ? "" : installedHead(workspace, dir);
  if (head === "") {
    return "reports no landed commit — the declared ref " + ref +
      " cannot be verified (no custom_nodes clone carries remote " + url + ")";
  }
  if (!head.startsWith(ref) && !ref.startsWith(head)) {
    return "landed at " + head.slice(0, 10) + " but the declaration pins " +
      ref.slice(0, 10) + " (the pin is the truth)";
  }
  return "";
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
 *  is a declaration conflict — the declaration is the truth. The
 *  derived name is only the FIRST place to look: Manager renames
 *  install dirs, so a squatter can sit at any other casing of the
 *  repo name with a foreign remote (the impact packs' live shape —
 *  a clone of comfyanonymous/ComfyUI.git under "comfyui-impact-pack"
 *  — over which Manager answers "Already exists" and installs
 *  nothing).
 *  @param url the declared git remote.
 *  @param workspace the engine workspace root.
 *  @returns "" when nothing was removed, else the removed shape
 *           ("symlink" | "file" | "directory" | "stale clone"). */
export function clearStaleInstall(url: string, workspace: string): string {
  const dir = url.replace(/\/+$/, "").replace(/\.git$/, "")
    .split("/").pop() ?? "";
  const target = join(workspace, "custom_nodes", dir);
  let removed = "";
  try {
    const st = lstatSync(target);
    if (st.isSymbolicLink()) {
      rmSync(target, { force: true });
      removed = "symlink";
    } else if (!st.isDirectory()) {
      rmSync(target, { force: true });
      removed = "file";
    } else {
      if (urlInstalled(url, workspace)) return "";
      removed = existsSync(join(target, ".git")) ? "stale clone" : "directory";
      rmSync(target, { recursive: true, force: true });
    }
  } catch {
    // the derived name is absent — the squatter, if any, is renamed.
  }
  // Manager's name for the row may be ANY casing of the repo name,
  // so the renamed scan runs after every removal too: a squatter left
  // behind makes Manager answer "Already exists" and install nothing
  // (the impact packs' live failure — the exact-name dir came off,
  // the lowercase junk clone stayed, and the install never landed).
  const squatter = clearRenamedSquatter(url, dir, workspace);
  return squatter !== "" ? squatter : removed;
}

/** Remove a directory whose name collides with the row's repo name
 *  case-insensitively while carrying a different git remote (or no
 *  git at all) — the shape Manager refuses to install over because
 *  its own name for the row is already occupied. A dir that carries
 *  the row's own remote is Manager's install and stays.
 *  @param url the declared git remote.
 *  @param dir the repo name derived from the url.
 *  @param workspace the engine workspace root.
 *  @returns "" when no squatter was found, else the removed shape
 *           ("stale clone" | "directory"). */
function clearRenamedSquatter(url: string, dir: string, workspace: string): string {
  let kids: string[] = [];
  try {
    kids = readdirSync(join(workspace, "custom_nodes"));
  } catch { return ""; }
  const want = normRemote(url);
  for (const k of kids) {
    if (k.toLowerCase() !== dir.toLowerCase()) continue;
    const squatter = join(workspace, "custom_nodes", k);
    const wasClone = existsSync(join(squatter, ".git", "config"));
    if (wasClone && remotesOf(squatter).includes(want)) continue;
    rmSync(squatter, { recursive: true, force: true });
    return wasClone ? "stale clone" : "directory";
  }
  return "";
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
      // AN ALREADY-PRESENT ROW IS STILL A DECLARED ROW: the law is
      // that every pinned row's LANDED HEAD is verified, not only the
      // ones this run installed.
      const drift = landedVerdict(name, url, ref, workspace);
      if (drift !== "") {
        // THE PIN IS THE TRUTH, SO THE ESTATE CONVERGES (the IaC
        // law, operator 2026-10-15): a drifted head is re-queued
        // through Manager's git-url door at the declared ref — the
        // run ends either at the pin or red, never at a silent
        // acceptance of the drift.
        warn("  [" + name + "] " + drift + " — converging to the declared ref");
        if (DRY) {
          planned += 1;
          continue;
        }
        const drifted = installedDirFor(url, workspace);
        if (drifted !== "") {
          rmSync(join(workspace, "custom_nodes", drifted),
            { recursive: true, force: true });
        }
        pending.push({ name, url, ref });
        continue;
      }
      counts.skipped += 1;
      info("  [" + name + "] already in custom_nodes at the declared ref — skipping");
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
      // THE PIN RIDES THE DOOR (the same spelling the estate's
      // runtime provider uses, manager-provider.ts:402): Manager
      // checks the @suffix out, so a URL without it installs whatever
      // the branch points at today and floats.
      const target = row.ref === undefined || row.ref === ""
        ? row.url
        : row.url + "@" + row.ref;
      info("  [" + row.name + "] manager git_url install — " + target);
      const res = await fetch(endpoint + "/customnode/install/git_url", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: target }),
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
      const drift = landedVerdict(row.name, row.url, row.ref, workspace);
      if (drift !== "") {
        warn("  [" + row.name + "] " + drift);
        counts.failed += 1;
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
