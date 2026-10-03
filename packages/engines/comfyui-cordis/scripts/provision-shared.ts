// provision-shared — repo paths, dry-run flag, failure ledger, output helpers.
// Split from scripts/provision.ts (pure move — no logic changes).

import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const HERE: string = dirname(fileURLToPath(import.meta.url));
export const REPO: string = resolve(HERE, "..", "..", "..", "..");
// The engine package's own data/ (comfyui-cordis since the models-
// plane reversal, 91532243 — the old engines/comfyui anchor was a
// stale name that left every config-less CLI call fatal).
export const DEFAULT_CONFIG: string = join(REPO, "packages", "engines",
  "comfyui-cordis", "data", "comfyui_endpoint.json");
export const ROOT_CONFIG: string = join(REPO, "inference.config.json");
export const RUNTIME: string = join(REPO, "data", "runtime", "comfyui");
export const COMFY_PROJECT: string = join(REPO, "infra", "comfyui");

/** Python executable inside a uv venv: `Scripts/python.exe` on
 * Windows, `bin/python` everywhere else. Every venv spawn and every
 * printed launch command resolves through this — the provisioning
 * CLI runs on Windows, macOS, and Linux unchanged (operator law,
 * 2026-10-12: the product is pnpm + ComfyUI, no POSIX-only paths).
 * @param venvRoot absolute path to the venv directory
 * @returns absolute path to the venv's python executable */
export function venvPython(venvRoot: string): string {
  return process.platform === "win32"
    ? join(venvRoot, "Scripts", "python.exe")
    : join(venvRoot, "bin", "python");
}

export let DRY = false;
export const FAILS: string[] = [];

/** Set the dry-run flag (assigned once by the entry CLI parse). */
export function setDry(v: boolean): void {
  DRY = v;
}

// ── output helpers ──────────────────────────────────────────────

export function info(msg: string): void {
  console.log("[provision] " + msg);
}

export function warn(msg: string): void {
  console.log("[provision] WARN: " + msg);
}

export function fail(msg: string): never {
  console.error("[provision] FATAL: " + msg);
  process.exit(1);
}

export function die(msg: string): never {
  console.log("REFUSED: " + msg);
  process.exit(2);
}

export function check(name: string, ok: boolean, note = ""): boolean {
  console.log("  " + (ok ? "ok  " : "FAIL") + " " + name +
    (note && !ok ? " — " + note : ""));
  if (!ok) FAILS.push(name);
  return ok;
}
