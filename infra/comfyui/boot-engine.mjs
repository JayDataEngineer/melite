#!/usr/bin/env node
// boot-engine.mjs — the ONE engine boot launcher, cross-platform
// (node, zero bash). What the old entrypoint.sh hardcoded as POSIX
// is now this file: provision the managed engine, then serve it.
// Same commands the container runs, natively runnable on Windows,
// macOS, and Linux (operator law, 2026-10-12: no POSIX-only paths):
//
//     node infra/comfyui/boot-engine.mjs
//
// Environment (all optional; defaults are the managed native seat):
//   COMFYUI_DIR    the ComfyUI workspace (default: the repo's managed
//                  runtime, data/runtime/comfyui)
//   COMFYUI_LISTEN bind address      (default: 127.0.0.1; the
//                  container sets 0.0.0.0)
//   COMFYUI_PORT   serve port        (default: 8188; the container
//                  sets 18465)
// The provisioning leg is the SAME TypeScript provisioner every
// platform runs (`pnpm run provision -- all`); the serving leg
// resolves the workspace venv's python per platform. Signals forward
// to the engine and its exit code is this process's exit code.

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** @param from a file path inside the repo
 * @returns the repo root (this file lives at <repo>/infra/comfyui) */
export function repoRootFrom(from) {
  return resolve(dirname(from), "..", "..");
}

/** Python executable inside a uv venv, per platform: Windows spells
 * it Scripts/python.exe, everywhere else bin/python. Mirrors the
 * provisioner's own venvPython (provision-shared.ts) — one law, two
 * seats, no third spelling.
 * @param venvRoot absolute path to the venv directory
 * @param platform a process.platform value (injectable for the wall)
 * @returns absolute path to the venv's python executable */
export function resolveVenvPython(venvRoot, platform) {
  return platform === "win32"
    ? join(venvRoot, "Scripts", "python.exe")
    : join(venvRoot, "bin", "python");
}

/** The full boot plan: where the workspace is, which python serves,
 * and the engine's argv. Pure — the wall drives every field.
 * @param opts { repo, env, platform } (env/platform injectable)
 * @returns the plan record */
export function bootPlan({ repo, env = process.env, platform = process.platform }) {
  const workspace = env["COMFYUI_DIR"] && env["COMFYUI_DIR"] !== ""
    ? env["COMFYUI_DIR"]
    : join(repo, "data", "runtime", "comfyui");
  const listen = env["COMFYUI_LISTEN"] && env["COMFYUI_LISTEN"] !== ""
    ? env["COMFYUI_LISTEN"]
    : "127.0.0.1";
  const port = env["COMFYUI_PORT"] && env["COMFYUI_PORT"] !== ""
    ? env["COMFYUI_PORT"]
    : "8188";
  return {
    workspace,
    python: resolveVenvPython(join(workspace, ".venv"), platform),
    argv: [join(workspace, "main.py"), "--listen", listen, "--port", port],
  };
}

/** Run one child to term, stdio inherited, signals forwarded.
 * @param command executable
 * @param args argv
 * @param opts spawn options
 * @returns the child's exit code (or 1 on signal) */
function run(command, args, opts) {
  return new Promise((res) => {
    const child = spawn(command, args, {
      ...opts,
      shell: process.platform === "win32",
      stdio: "inherit",
    });
    // shell:true is win32-only: pnpm arrives as pnpm.cmd there and
    // needs the shell; POSIX keeps the direct exec (no shell parsing
    // of workspace paths).
    for (const sig of ["SIGINT", "SIGTERM"]) {
      process.on(sig, () => child.kill(sig));
    }
    child.on("close", (code) => res(code ?? 1));
    child.on("error", (err) => {
      console.error("[boot] spawn failed:", err.message);
      res(1);
    });
  });
}

async function main() {
  const repo = repoRootFrom(fileURLToPath(import.meta.url));
  const plan = bootPlan({ repo });
  if (!existsSync(join(plan.workspace, "main.py"))) {
    console.error("[boot] no ComfyUI workspace at " + plan.workspace +
      " — set COMFYUI_DIR or run `pnpm run provision -- instance` first");
    process.exit(1);
  }
  console.log("[boot] provisioning: extensions + models (" + plan.workspace + ")");
  const prov = await run("pnpm", ["run", "provision", "--", "all"], { cwd: repo });
  if (prov !== 0) process.exit(prov);
  // argv = [main.py, --listen, <addr>, --port, <port>]
  console.log("[boot] launching ComfyUI on " + plan.argv[2] + ":" + plan.argv[4]);
  const served = await run(plan.python, plan.argv, {
    env: { ...process.env, COMFYUI_PATH: plan.workspace },
  });
  process.exit(served);
}

const invokedDirectly = process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) await main();
