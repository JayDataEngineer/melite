// provision-instance-managed — managed core checkout, built-in manager, manifest/boot/verify commands.
// Split from scripts/provision.ts (pure move — no logic changes).

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { COMFY_PROJECT, FAILS, REPO, RUNTIME, check, die, fail, info, warn } from "./provision-shared.ts";
import { boundModelFolders, enginePort, engineUrl } from "./provision-config.ts";
import type { EndpointConfig } from "./provision-config.ts";
import { mergeManifest } from "./provision-extensions-manifest.ts";
import { cmdPaths, probe } from "./provision-instance-layout.ts";

export function cmdSync(cfg: EndpointConfig): void {
  if (cfg.provision !== "managed") {
    die("provision=" + JSON.stringify(cfg.provision) + " — BYO " +
      "deployments never install a ComfyUI (the estate sits on top; " +
      "verify instead)");
  }
  const lock = join(COMFY_PROJECT, "uv.lock");
  if (!existsSync(lock)) {
    die("no uv.lock in infra/comfyui — run `uv lock` there first " +
      "(the lock is the pinned truth, tracked in git)");
  }
  const pinF = join(COMFY_PROJECT, "core.pin");
  if (!existsSync(pinF)) {
    die("no core.pin in infra/comfyui — the core source ref is " +
      "deployment truth, never a floating clone");
  }
  const pin = readFileSync(pinF, "utf8").split("\n")
    .map((l) => l.trim()).find((l) => l && !l.startsWith("#")) ?? "";
  cmdPaths(cfg);
  const env: Record<string, string> = {};
  for (const [k, v] of Object.entries(process.env)) {
    if (v !== undefined) env[k] = v;
  }
  env.UV_PROJECT_ENVIRONMENT = join(RUNTIME, ".venv");
  const s = spawnSync("uv",
    ["sync", "--frozen", "--project", COMFY_PROJECT],
    { cwd: REPO, env, stdio: "inherit" });
  if (s.status !== 0) process.exit(s.status ?? 1);
  const coreUrl = "https://github.com/comfyanonymous/ComfyUI.git";
  if (existsSync(join(RUNTIME, "main.py"))) {
    const have = spawnSync("git", ["-C", RUNTIME, "rev-parse", "HEAD"],
      { encoding: "utf8" });
    if ((have.stdout ?? "").trim() === pin) {
      info("core already at pin " + pin.slice(0, 12));
      vendorManager();
      return;
    }
  }
  info("fetching core at pin " + pin.slice(0, 12) + " …");
  mkdirSync(RUNTIME, { recursive: true });
  const git = (args: string[]): void => {
    const r = spawnSync("git", args, { cwd: RUNTIME, stdio: "inherit" });
    if (r.status !== 0) fail("core checkout of pin " + pin + " failed");
  };
  if (!existsSync(join(RUNTIME, ".git"))) {
    git(["init", "--quiet"]);
    git(["remote", "add", "origin", coreUrl]);
  }
  git(["fetch", "--quiet", "--depth", "1", "origin", pin]);
  git(["checkout", "--quiet", "FETCH_HEAD"]);
  info("core checked out at " + pin.slice(0, 12) + " (workspace root: " +
    RUNTIME + ")");
  vendorManager();
}

// ── the built-in manager (auto-build; no external dependency) ──────

export const MANAGER_PIN_F: string = join(COMFY_PROJECT, "manager.pin");

/** Pin text from infra/comfyui/manager.pin (comments stripped). */
export function managerPin(): string {
  if (!existsSync(MANAGER_PIN_F)) {
    die("no manager.pin in infra/comfyui — the built-in ComfyUI-Manager " +
      "is vendored at a pinned ref (same law as core.pin)");
  }
  return readFileSync(MANAGER_PIN_F, "utf8").split("\n")
    .map((l) => l.trim()).find((l) => l && !l.startsWith("#")) ?? "";
}

/** THE AUTO-BUILD (the no-external-python stroke, 2026-09-10): the
 *  vendor ComfyUI-Manager rides ComfyUI's own port as a custom node
 *  — cloned at the pinned ref into custom_nodes/, its requirements
 *  installed into the serving venv, and its config pinned under
 *  user/__manager/ (security_level=normal-, both allow flags) so
 *  the loopback-listen engine admits installs. Users start the
 *  engine; the manager is already in it (the estate never spawns a
 *  separate manager process). */
export function vendorManager(): void {
  const pin = managerPin();
  const mgrDir = join(RUNTIME, "custom_nodes", "comfyui-manager");
  const url = "https://github.com/Comfy-Org/ComfyUI-Manager.git";
  const gitm = (args: string[]): number => {
    const r = spawnSync("git", args, { cwd: RUNTIME, stdio: "inherit" });
    return r.status ?? 1;
  };
  if (existsSync(join(mgrDir, "__init__.py"))) {
    const have = spawnSync("git", ["-C", mgrDir, "rev-parse", "HEAD"],
      { encoding: "utf8" });
    if ((have.stdout ?? "").trim() === pin) {
      info("manager already vendored at pin " + pin.slice(0, 12));
    } else {
      info("moving manager to pin " + pin.slice(0, 12) + " …");
      gitm(["-C", mgrDir, "fetch", "--quiet", "--depth", "1", "origin", pin]);
      gitm(["-C", mgrDir, "checkout", "--quiet", "FETCH_HEAD"]);
    }
  } else {
    info("vendoring the built-in manager at pin " + pin.slice(0, 12) + " …");
    mkdirSync(join(RUNTIME, "custom_nodes"), { recursive: true });
    if (gitm(["clone", "--quiet", "--depth", "1", url, mgrDir]) !== 0) {
      gitm(["clone", "--quiet", url, mgrDir]);
    }
    gitm(["-C", mgrDir, "fetch", "--quiet", "--depth", "1", "origin", pin]);
    gitm(["-C", mgrDir, "checkout", "--quiet", "FETCH_HEAD"]);
  }
  const env: Record<string, string> = {};
  for (const [k, v] of Object.entries(process.env)) {
    if (v !== undefined) env[k] = v;
  }
  env.UV_PROJECT_ENVIRONMENT = join(RUNTIME, ".venv");
  const r = spawnSync("uv",
    ["pip", "install", "--python", join(RUNTIME, ".venv", "bin", "python"),
      "-r", join(mgrDir, "requirements.txt")],
    { cwd: REPO, env, stdio: "inherit" });
  if (r.status !== 0) fail("manager requirements install failed");
  pinManagerConfig();
  info("built-in manager vendored (rides the engine port; config " +
    "pinned at user/__manager/config.ini)");
}

/** Write/verify the manager config pins. The vendor reads this file
 *  ONCE at ComfyUI startup — drift is warned, never silently
 *  rewritten (a running engine would not see the write). */
export function pinManagerConfig(): void {
  const f = join(RUNTIME, "user", "__manager", "config.ini");
  const pins =
    "security_level = normal-\nallow_git_url_install = true\n" +
    "allow_pip_install = true\n";
  if (!existsSync(f)) {
    mkdirSync(dirname(f), { recursive: true });
    writeFileSync(f, "[default]\n" + pins +
      "channel_url = https://raw.githubusercontent.com/ltdrdata/ComfyUI-Manager/main\n");
    info("manager config pinned (" + f + ")");
    return;
  }
  const text = readFileSync(f, "utf8");
  for (const key of ["security_level = normal-",
    "allow_git_url_install = true", "allow_pip_install = true"]) {
    if (!text.includes(key)) {
      warn("manager config drift: '" + key +
        "' missing in " + f + " — fix deliberately (the running engine " +
        "read this file at startup)");
    }
  }
}

export function cmdManifest(): void {
  // The extension_lane --format json equivalent: print the merged
  // manifest (declaration validation without touching the instance).
  const rows = mergeManifest(REPO);
  console.log(JSON.stringify(rows, null, 1));
}

export function cmdBootCmd(cfg: EndpointConfig): void {
  if (cfg.provision === "managed") {
    const port = enginePort(cfg);
    console.log("# managed launch (cwd resolves custom_nodes; weights via " +
      "extra_model_paths; estate streams for input/output):");
    console.log("cd " + RUNTIME + " && " + join(RUNTIME, ".venv", "bin",
      "python") + " main.py \\\n" +
      "  --listen 127.0.0.1 --port " + port + " \\\n" +
      "  --extra-model-paths-config extra_model_paths.yaml \\\n" +
      "  --input-directory " + join(REPO, "data", "input") + " \\\n" +
      "  --output-directory " + join(REPO, "data", "temp") + " \\\n" +
      "  --user-directory user");
  } else {
    const boot = (cfg.boot_cmd ?? "").trim();
    if (!boot) {
      die("byo mode with no boot_cmd in the endpoint config — the " +
        "user's instance is theirs; we only point at it");
    }
    console.log("# byo launch (the user's own instance):");
    console.log(boot);
  }
}

export async function cmdVerify(cfg: EndpointConfig): Promise<void> {
  console.log("config: comfyui_endpoint.json");
  check("provision mode declared",
    cfg.provision === "byo" || cfg.provision === "managed",
    JSON.stringify(cfg.provision));
  for (const k of ["model_base_path", "model_download_path"] as const) {
    const raw = cfg[k];
    check(k + " valid (unset → root config; never empty)",
      raw === undefined || raw === null || !!String(raw).trim(),
      JSON.stringify(raw));
  }
  try {
    const b = boundModelFolders(cfg);
    check("model roots resolve (root config + overrides)", true,
      "read=" + b.base_path + " download=" + b.download_path);
  } catch (e) {
    check("model roots resolve (root config + overrides)", false,
      String(e).slice(0, 120));
  }
  try {
    const url = engineUrl(cfg);
    check("url resolves (endpoint → root engines.comfyui.url)",
      !!url, JSON.stringify(url));
  } catch (e) {
    check("url resolves (endpoint → root engines.comfyui.url)", false,
      String(e).slice(0, 120));
  }
  if (cfg.provision === "managed") {
    check("managed lock present", existsSync(join(COMFY_PROJECT, "uv.lock")));
    const r = spawnSync("uv",
      ["lock", "--check", "--project", COMFY_PROJECT],
      { encoding: "utf8" });
    check("managed lock fresh (uv lock --check)", r.status === 0,
      ((r.stdout ?? "").trim().slice(0, 120)));
  }
  const url = (cfg.url ?? "").trim() || engineUrl(cfg);
  if (url) {
    try {
      const got = probe(url, "/system_stats");
      const body = JSON.parse(got.text) as {
        system?: { comfyui_version?: string } };
      const ver = body?.system?.comfyui_version ?? "?";
      check("instance live (/system_stats)", got.status === 200,
        got.text.slice(0, 80));
      console.log("       comfyui_version:", ver);
    } catch (e) {
      check("instance live (/system_stats)", false,
        String(e).slice(0, 120));
    }
    try {
      const got = probe(url, "/object_info", 20000);
      check("object_info served",
        got.status === 200 && got.text.length > 100,
        "status " + got.status);
    } catch (e) {
      check("object_info served", false, String(e).slice(0, 120));
    }
  }
  // project requirement: the ffmpeg binary on PATH (VHS_VideoCombine
  // + AudioConcat shell out to it; concat is extension-mediated).
  const ff = spawnSync("which", ["ffmpeg"], { encoding: "utf8" });
  const ffmpeg = (ff.stdout ?? "").trim();
  check("ffmpeg on PATH (project requirement for VHS / AudioConcat)",
    !!ffmpeg,
    ffmpeg || "install: apt install ffmpeg / brew install ffmpeg");
  // management plane: the BUILT-IN ComfyUI-Manager (vendored custom
  // node riding the engine port — no external Python anywhere).
  if (cfg.provision === "managed") {
    const mgrDir = join(RUNTIME, "custom_nodes", "comfyui-manager");
    const pin = managerPin();
    const have = existsSync(join(mgrDir, "__init__.py"))
      ? (spawnSync("git", ["-C", mgrDir, "rev-parse", "HEAD"],
          { encoding: "utf8" }).stdout ?? "").trim()
      : "";
    check("built-in manager vendored (custom_nodes/comfyui-manager)",
      have === pin,
      have === "" ? "run provision sync (the auto-build)" :
        "at " + have.slice(0, 12) + ", pin " + pin.slice(0, 12));
    check("manager config pinned (user/__manager/config.ini)",
      existsSync(join(RUNTIME, "user", "__manager", "config.ini")),
      "run provision sync");
    if (url) {
      try {
        const got = probe(url, "/manager/version");
        check("built-in manager live (/manager/version)",
          got.status === 200, got.text.slice(0, 60));
      } catch (e) {
        check("built-in manager live (/manager/version)", false,
          String(e).slice(0, 100));
      }
    }
  }
  console.log();
  if (FAILS.length > 0) {
    console.log("VERIFY REFUSED: " + FAILS.length + " failure(s): " +
      FAILS.join(", "));
    process.exit(1);
  }
  console.log("verify: healthy (compose-time requires gate enforces " +
    "extensions per the EXTENSION LAW — this probe does not duplicate it)");
}
