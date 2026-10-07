// provision-shared — repo paths, dry-run flag, failure ledger, output helpers.
// Split from scripts/provision.ts (pure move — no logic changes).
import { dirname, join } from "node:path";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
export const HERE = dirname(fileURLToPath(import.meta.url));
// The repo root is a LAZY MEMOIZED function, never a top-level const:
// this module is a library door (the provision scripts and the
// release probe import it), and import-time path discovery throws
// outside the workspace checkout — the executability gate caught the
// top-level `export const REPO = workspaceRoot(HERE)` dying in the
// packed tarball ("no pnpm-workspace.yaml above ..." at import).
// The derivation still runs from the marker by caller demand:
// REPO is the WORKSPACE ROOT by marker, never by a fixed hop count:
// this module executes from two layouts — src/scripts (source) and
// lib/scripts (the built artifact a plain-`node` config subprocess
// runs) — one directory apart in depth, so a counted `resolve`
// mis-derived the built plane to <repo>/packages and every
// data/runtime path died in ENOENT. The marker (pnpm-workspace.yaml)
// exists at exactly one ancestor; refuse loud if it does not.
function workspaceRoot(from) {
    for (let dir = from;; dir = dirname(dir)) {
        if (existsSync(join(dir, "pnpm-workspace.yaml")))
            return dir;
        const parent = dirname(dir);
        if (parent === dir) {
            throw new Error("provision: no pnpm-workspace.yaml above " + from +
                " — the CLI must run from inside the melite workspace checkout");
        }
    }
}
let repoCached = null;
/** The melite workspace root, derived from the pnpm-workspace.yaml
 * marker at first call (memoized). Throws when called outside the
 * checkout — a CLI entry error, never an import error.
 * @returns absolute path to the workspace root */
export function repo() {
    if (repoCached === null)
        repoCached = workspaceRoot(HERE);
    return repoCached;
}
/** The engine package's own data/ (comfyui-cordis since the models-
 * plane reversal, 91532243 — the old engines/comfyui anchor was a
 * stale name that left every config-less CLI call fatal).
 * @returns absolute path to the default endpoint config */
export function defaultConfig() {
    return join(repo(), "packages", "engines", "comfyui-cordis", "data", "comfyui_endpoint.json");
}
/** @returns absolute path to the repo's inference.config.json */
export function rootConfig() {
    return join(repo(), "inference.config.json");
}
/** @returns absolute path to the comfyui runtime tree
 * (data/runtime/comfyui) */
export function runtime() {
    return join(repo(), "data", "runtime", "comfyui");
}
/** @returns absolute path to the comfyui project (infra/comfyui) */
export function comfyProject() {
    return join(repo(), "infra", "comfyui");
}
/** Python executable inside a uv venv: `Scripts/python.exe` on
 * Windows, `bin/python` everywhere else. Every venv spawn and every
 * printed launch command resolves through this — the provisioning
 * CLI runs on Windows, macOS, and Linux unchanged (operator law,
 * 2026-10-12: the product is pnpm + ComfyUI, no POSIX-only paths).
 * @param venvRoot absolute path to the venv directory
 * @returns absolute path to the venv's python executable */
export function venvPython(venvRoot) {
    return process.platform === "win32"
        ? join(venvRoot, "Scripts", "python.exe")
        : join(venvRoot, "bin", "python");
}
export let DRY = false;
export const FAILS = [];
/** Set the dry-run flag (assigned once by the entry CLI parse). */
export function setDry(v) {
    DRY = v;
}
// ── output helpers ──────────────────────────────────────────────
export function info(msg) {
    console.log("[provision] " + msg);
}
export function warn(msg) {
    console.log("[provision] WARN: " + msg);
}
export function fail(msg) {
    console.error("[provision] FATAL: " + msg);
    process.exit(1);
}
export function die(msg) {
    console.log("REFUSED: " + msg);
    process.exit(2);
}
export function check(name, ok, note = "") {
    console.log("  " + (ok ? "ok  " : "FAIL") + " " + name +
        (note && !ok ? " — " + note : ""));
    if (!ok)
        FAILS.push(name);
    return ok;
}
//# sourceMappingURL=provision-shared.js.map
