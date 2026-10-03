// provision-extensions-install — extension installs (vendor symlinks, registry/url git clones) + pip.
// Split from scripts/provision.ts (pure move — no logic changes).

import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, symlinkSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { DEFAULT_CONFIG, DRY, REPO, RUNTIME, die, info, venvPython, warn } from "./provision-shared.ts";
import { loadConfig } from "./provision-config.ts";
import { mergeManifest } from "./provision-extensions-manifest.ts";

// ── extensions via git (registry cache + url clones) + vendor symlinks ──

export function linkInTree(name: string, workspace: string): string {
  const target = join(workspace, "custom_nodes", name);
  if (existsSync(join(target, "__init__.py"))) return "skipped";
  const src = join(REPO, "vendor", "comfyui_extensions", name);
  if (!existsSync(join(src, "__init__.py"))) {
    warn("  [" + name + "] vendor pack missing under " +
      "vendor/comfyui_extensions (a fresh clone of this repository " +
      "carries all 14 packs as tracked files)");
    return "failed";
  }
  if (DRY) {
    console.log("[dry-run] link " + target + " <- " + src);
    return "installed";
  }
  mkdirSync(dirname(target), { recursive: true });
  try {
    symlinkSync(src, target);
    info("  [" + name + "] symlinked -> " + src);
    return "installed";
  } catch {
    cpSync(src, target, { recursive: true });
    warn("  [" + name + "] symlink unavailable — COPIED");
    return "installed";
  }
}

export function sameWorld(workspace: string, duty: string): boolean {
  // Duties touching the workspace FILESYSTEM require it WRITABLE
  // from HERE — a container/remote workspace is provisioned from
  // INSIDE its world, never by guessing.
  const cn = join(workspace, "custom_nodes");
  try {
    mkdirSync(cn, { recursive: true });
    writeFileSync(join(cn, ".provision-write-test"), "x");
    unlinkSync(join(cn, ".provision-write-test"));
    return true;
  } catch {
    warn("  workspace " + workspace + " is not writable from here " +
      "(another world: container/remote) — " + duty + " is done from " +
      "inside that world (entrypoint) or by deployment binds; " +
      "refusing to guess");
    return false;
  }
}

export function urlInstalled(url: string, workspace: string): boolean {
  // True if some custom_nodes clone's git remote IS this url (the
  // Manager renames install dirs; matching the remote is exact).
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

export function runtimePython(workspace: string): string {
  const venv = process.env.VIRTUAL_ENV ?? "";
  if (venv && existsSync(join(venv, "bin", "python"))) {
    return join(venv, "bin", "python");
  }
  const cb = process.env.COMFY_BIN ?? "";
  if (cb) {
    const py = join(dirname(cb), "python");
    if (existsSync(py)) return py;
  }
  // the MANAGED runtime's own venv (UV_PROJECT_ENVIRONMENT from
  // cmdSync) — the one extension pip pins ride. The ubuntu-desktop
  // receipt: without this leg every pip pin failed against a
  // nonexistent infra/python/.venv (the BYO-era fallback).
  const managed = venvPython(join(workspace, ".venv"));
  if (existsSync(managed)) return managed;
  return venvPython(join(workspace, "infra", "python", ".venv"));
}

export function pipInstall(pkgs: string[], workspace: string): boolean {
  // Declared pins ride the SERVING runtime venv (nodes import them
  // at load); uv is the rail; satisfied pins are no-ops.
  const py = runtimePython(workspace);
  const r = spawnSync("uv",
    ["pip", "install", "--python", py, ...pkgs],
    { encoding: "utf8", timeout: 600000 });
  if (r.status === 0) return true;
  warn("  pip install failed (" + pkgs.join(" ") + "): " +
    ((r.stderr || r.stdout) ?? "").trim().slice(0, 200));
  return false;
}

/** The vendored manager's registry cache (custom-node-list.json,
 *  shipped inside the vendored custom node) — cnr id → reference
 *  git URL. This keeps registry declarations installable at
 *  provision time (engine down, manager not answering) with zero
 *  external Python: same map the manager itself consults. */
export function registryUrl(reg: string): string {
  const f = join(RUNTIME, "custom_nodes", "comfyui-manager",
    "custom-node-list.json");
  if (!existsSync(f)) {
    return "";
  }
  try {
    const doc = JSON.parse(readFileSync(f, "utf8")) as {
      custom_nodes?: Array<{ id?: string; reference?: string }> };
    const w = reg.toLowerCase();
    const row = (doc.custom_nodes ?? []).find(
      (r) => String(r.id ?? "").toLowerCase() === w);
    return row?.reference ?? "";
  } catch {
    return "";
  }
}

/** Install one pack from git — the same mechanism the built-in
 *  manager uses for git installs, driven at provision time (engine
 *  down). Returns ok or the failure text. */
export function gitCloneInstall(url: string, workspace: string,
    ref: string): { ok: boolean; error?: string } {
  const base = url.replace(/\/+$/, "").replace(/\.git$/, "")
    .split("/").pop() ?? "";
  if (!base) return { ok: false, error: "cannot derive a pack name from " + url };
  const dest = join(workspace, "custom_nodes", base);
  const git = (args: string[]): number =>
    spawnSync("git", args, { cwd: workspace, stdio: "pipe" }).status ?? 1;
  let r = git(["clone", "--quiet", "--depth", "1", url, dest]);
  if (r !== 0) r = git(["clone", "--quiet", url, dest]);
  if (r !== 0) return { ok: false, error: "git clone failed for " + url };
  if (ref) {
    git(["-C", dest, "fetch", "--quiet", "--depth", "1", "origin", ref]);
    if (git(["-C", dest, "checkout", "--quiet", "FETCH_HEAD"]) !== 0) {
      warn("  ref " + ref + " not fetchable — left on the default head");
    }
  }
  return { ok: true };
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
  let restart = false;
  {
    const vendorWorld = sameWorld(workspace, "vendor symlinking");
    for (const e of exts) {
      const name = (e.name ?? "").trim();
      const reg = (e.registry ?? "").trim();
      const url = (e.url ?? "").trim();
      if (!name) continue;
      if (e.pip.length > 0) {
        if (DRY) {
          console.log("[dry-run] pip install [" + name + "]: " +
            e.pip.join(", "));
        } else if (!pipInstall(e.pip, workspace)) {
          counts.failed += 1;
          continue;
        }
      }
      if (!reg && !url) {
        if (!vendorWorld) { counts.failed += 1; continue; }
        const st = linkInTree(name, workspace);
        counts[st as keyof typeof counts] += 1;
        continue;
      }
      if (url && !reg) {
        if (urlInstalled(url, workspace)) {
          counts.skipped += 1;
          info("  [" + name + "] already in custom_nodes — skipping");
          continue;
        }
        if (DRY) {
          console.log("[dry-run] install [" + name + "] from url " +
            JSON.stringify(url));
          counts.installed += 1;
          continue;
        }
        const rep = gitCloneInstall(url, workspace, e.ref);
        if (!rep.ok) {
          warn("  [" + name + "] failed: " +
            (rep.error ?? "").slice(0, 160));
          counts.failed += 1;
          continue;
        }
        counts.installed += 1;
        restart = true;
        continue;
      }
      // registry form: bare id (install_node refuses @pins; the
      // declared version stays the RECORDED expectation).
      if (existsSync(join(workspace, "custom_nodes", reg.toLowerCase()))) {
        counts.skipped += 1;
        info("  [" + name + "] already in custom_nodes — skipping");
        continue;
      }
      if (DRY) {
        console.log("[dry-run] install_node [" + name + "] registry id " +
          JSON.stringify(reg));
        counts.installed += 1;
        continue;
      }
      const gitUrl = registryUrl(reg);
      if (!gitUrl) {
        warn("  [" + name + "] registry id " + JSON.stringify(reg) +
          " not in the vendored registry cache — declare a url or " +
          "install at runtime (comfy_manage install_extension)");
        counts.failed += 1;
        continue;
      }
      const rep = gitCloneInstall(gitUrl, workspace, e.ref);
      if (!rep.ok) {
        warn("  [" + name + "] failed: " +
            (rep.error ?? "").slice(0, 160));
        counts.failed += 1;
        continue;
      }
      counts.installed += 1;
      restart = true;
      if (e.version) {
        info("  [" + name + "] installed (declaration records version " +
          e.version + " — the registry head moved; audit the drift " +
          "deliberately)");
      }
    }
  }
  info("extensions: " + counts.installed + " installed, " +
    counts.skipped + " skipped, " + counts.failed + " failed, " +
    counts.blocked + " blocked");
  if (restart) {
    info("restart required for new nodes (restart_comfyui is " +
      "operator-invoked: comfy restart, or the stop/boot doors)");
  }
  return counts.failed === 0 && counts.blocked === 0;
}
