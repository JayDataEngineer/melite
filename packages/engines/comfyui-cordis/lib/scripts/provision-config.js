// provision-config — endpoint + root config (SSOT read) and the bound model layout.
// Split from scripts/provision.ts (pure move — no logic changes).
import { existsSync, readFileSync } from "node:fs";
import { isAbsolute, join, resolve } from "node:path";
import { repo, rootConfig, die } from "./provision-shared.js";
import { mergeOverlay } from "../src/configOverlay.js";
// mergeOverlay lives in ../src/configOverlay.ts (the plugin-law N2
// SSOT, 2026-10-20) — imported below; the script copy was deleted.
export function loadRoot() {
    // Machine-local overlay merged over the tracked defaults
    // (untracked, gitignored): developer estates pin absolute model
    // roots and ports here; the tracked file ships portable
    // repo-relative defaults, and an overlay that names only some
    // keys inherits the rest.
    const local = join(repo(), "data", "inference.local.json");
    const overlay = existsSync(local)
        ? JSON.parse(readFileSync(local, "utf8"))
        : null;
    if (!existsSync(rootConfig())) {
        if (overlay === null) {
            die("no root config at inference.config.json — model storage is " +
                "configured from the project root (never guessed)");
        }
        return overlay;
    }
    const tracked = JSON.parse(readFileSync(rootConfig(), "utf8"));
    if (overlay === null)
        return tracked;
    return mergeOverlay(tracked, overlay);
}
export function loadConfig(path) {
    const cfg = JSON.parse(readFileSync(path, "utf8"));
    if (cfg.provision === undefined)
        cfg.provision = "byo";
    return cfg;
}
export function rootStr(v) {
    return String(v ?? "").trim();
}
/** The merged root (tracked inference.config.json + machine
 *  overlay) is the authority for an engine field; the tracked
 *  endpoint file's value is the fallback when the root names
 *  none. Override-order flipped 2026-10-04: the tracked
 *  comfyui_endpoint.json ships url 127.0.0.1:8188, so override-
 *  first made every fresh clone talk to whatever runs at 8188 —
 *  on the developer estate, the LIVE engine (its Manager answered
 *  every git-url install with an empty-body 400 "Already exists");
 *  on a stranger's machine, nothing. The machine overlay's pin is
 *  the truth (the merge law, batch 33).
 *  @param root the merged root config.
 *  @param key the engines.comfyui field name.
 *  @param fallback the tracked endpoint file's value for the key.
 *  @returns the effective field value; "" when both name none. */
export function engineField(root, key, fallback) {
    const eng = root.engines?.comfyui ?? {};
    const fromRoot = rootStr(eng[key]);
    if (fromRoot)
        return fromRoot;
    return rootStr(fallback);
}
// the fixed folder set every ComfyUI install scans on a bound base
// (stock folder keys; order is the yaml's presentation order)
export const FIXED_FOLDERS = [
    "checkpoints", "clip", "clip_vision", "controlnet",
    "diffusion_models", "loras", "unet", "vae", "upscale_models",
    "background_removal",
];
/**
 * Anchors a configured directory: absolute values pass through,
 * relative values resolve against the repository root. Lets the
 * tracked inference.config.json ship portable ("data/models") while
 * machine-local overlays (data/inference.local.json) pin absolute
 * roots on developer estates.
 */
export function anchorDir(value) {
    return isAbsolute(value) ? value : resolve(repo(), value);
}
/** Anchors a possibly-unset override: empty stays empty so the
 *  root-config fallback in the `||` chains applies. anchorDir("")
 *  collapses to the repository root — a truthy value that silently
 *  masked the models.read_root fallback and re-pointed every yaml
 *  category at the repo (the wiring-roots audit, 2026-10-13).
 *  @param v the raw config value (undefined/null = unset)
 *  @returns the anchored absolute path, or "" when unset */
function anchoredOpt(v) {
    const s = rootStr(v);
    return s === "" ? "" : anchorDir(s);
}
/** Joins the engine base under a models root, never twice: overlays
 *  written under the old replacement semantics bake the base into
 *  read_root/download_root (an absolute already pointing INSIDE the
 *  engine dir), and the merge law must not re-append it. The base
 *  names a subdirectory, never a repeatable suffix.
 *  @param root the models root (already anchored)
 *  @param base the engines.comfyui.base subdirectory ("" = no base)
 *  @returns the joined store root, unchanged when it already ends
 *           with the base */
export function joinBase(root, base) {
    const b = base.trim();
    if (b === "")
        return root;
    if (root === "" || root === ".")
        return b;
    if (root === b || root.endsWith("/" + b) || root.endsWith("\\" + b))
        return root;
    return join(root, b);
}
export function boundModelFolders(cfg) {
    // THE ONE derivation: ROOT config + endpoint overrides
    // -> {folder: mount subdir}. Refuses an unconfigured root LOUD.
    for (const k of ["model_base_path", "model_download_path"]) {
        const raw = cfg[k];
        if (raw !== undefined && raw !== null && !String(raw).trim()) {
            die(k + " is EMPTY in the endpoint config — unset the key to " +
                "inherit the root config (inference.config.json), or name it " +
                "explicitly (never guessed)");
        }
    }
    const root = loadRoot();
    // explicit endpoint overrides anchor EXACTLY like the root config
    // (ledger li-paths-idempotence: raw rootStr left a relative
    // override relative — a pointer dangling from whatever CWD ran the
    // provisioner — and endpointWritable's under-repo rewrite then
    // re-broke it on the next paths run; anchoring makes the round
    // trip stable)
    const base = anchoredOpt(cfg.model_base_path) ||
        joinBase(anchoredOpt(root.models?.read_root), rootStr(root.engines?.comfyui?.base));
    const download = anchoredOpt(cfg.model_download_path) ||
        anchoredOpt(cfg.model_base_path) ||
        joinBase(anchoredOpt(root.models?.download_root), rootStr(root.engines?.comfyui?.base));
    if (!rootStr(root.models?.read_root)) {
        die("models.read_root is unset in inference.config.json — " +
            "configure model storage from the project root (never guessed)");
    }
    const folders = {};
    for (const f of FIXED_FOLDERS)
        folders[f] = f;
    // pack-declared categories — the endpoint config owns the mapping;
    // the orchestrator stays generic (no pack names in the core)
    for (const cat of Object.keys(cfg.extra_model_folders ?? {}).sort()) {
        const sub = String(cfg.extra_model_folders?.[cat] ?? "")
            .trim().replace(/^\/+|\/+$/g, "");
        if (cat.trim() && sub)
            folders[cat.trim()] = sub;
    }
    return { base_path: base, download_path: download, folders };
}
export function engineUrl(cfg) {
    const root = loadRoot();
    return engineField(root, "url", cfg.url);
}
/** The live engine's tree root when the overlay names one ("" when
 *  the estate runs the single-tree shape — every box but the
 *  developer estate). The install loop verifies every row against
 *  this tree TOO: Manager's door installs into the tree its engine
 *  runs from, not into the repo's data/runtime.
 *  @param cfg the tracked endpoint config (fallback value holder).
 *  @returns the absolute live tree root, or "" when none declared. */
export function engineLiveRoot(cfg) {
    const root = loadRoot();
    return engineField(root, "live_root", cfg.live_root);
}
export function enginePort(cfg) {
    const root = loadRoot();
    const raw = engineField(root, "port", cfg.port);
    const n = parseInt(raw, 10);
    if (!Number.isFinite(n)) {
        die("engines.comfyui.port is not a number in inference.config.json " +
            "(endpoint override: " + JSON.stringify(cfg.port ?? null) + ")");
    }
    return n;
}
//# sourceMappingURL=provision-config.js.map
