// provision-config — endpoint + root config (SSOT read) and the bound model layout.
// Split from scripts/provision.ts (pure move — no logic changes).

import { existsSync, readFileSync } from "node:fs";
import { isAbsolute, join, resolve } from "node:path";
import { REPO, ROOT_CONFIG, die } from "./provision-shared.ts";

// ── config (the root file is the SSOT; the endpoint overrides) ──

export interface EndpointConfig {
  provision?: string;
  url?: string;
  port?: number;
  boot_cmd?: string;
  model_base_path?: string;
  model_download_path?: string;
  input_dir?: string;
  input_dir_container?: string;
  output_dir?: string;
  extra_model_folders?: Record<string, string>;
  [k: string]: unknown;
}

export interface RootConfig {
  models?: { read_root?: string; download_root?: string };
  engines?: { comfyui?: Record<string, unknown> };
}

/** Merges the machine-local overlay OVER the tracked root config:
 *  object branches merge, scalars and arrays replace. The overlay
 *  shadows KEYS, never the whole file — a fresh machine pinning one
 *  port or one absolute keeps every tracked default (the
 *  fresh-clone probe's pass-4 receipt: a minimal overlay erased
 *  models.read_root and sync refused, blaming the tracked file that
 *  still carried it).
 *  @param tracked the parsed inference.config.json value
 *  @param overlay the parsed data/inference.local.json value
 *  @returns the merged configuration value */
export function mergeOverlay(tracked: unknown, overlay: unknown): unknown {
  if (typeof tracked !== "object" || tracked === null || Array.isArray(tracked) ||
      typeof overlay !== "object" || overlay === null || Array.isArray(overlay)) {
    return overlay;
  }
  const out: Record<string, unknown> = { ...(tracked as Record<string, unknown>) };
  for (const [k, v] of Object.entries(overlay as Record<string, unknown>)) {
    out[k] = mergeOverlay(out[k], v);
  }
  return out;
}

export function loadRoot(): RootConfig {
  // Machine-local overlay merged over the tracked defaults
  // (untracked, gitignored): developer estates pin absolute model
  // roots and ports here; the tracked file ships portable
  // repo-relative defaults, and an overlay that names only some
  // keys inherits the rest.
  const local = join(REPO, "data", "inference.local.json");
  const overlay = existsSync(local)
    ? JSON.parse(readFileSync(local, "utf8")) as RootConfig
    : null;
  if (!existsSync(ROOT_CONFIG)) {
    if (overlay === null) {
      die("no root config at inference.config.json — model storage is " +
        "configured from the project root (never guessed)");
    }
    return overlay;
  }
  const tracked = JSON.parse(readFileSync(ROOT_CONFIG, "utf8")) as RootConfig;
  if (overlay === null) return tracked;
  return mergeOverlay(tracked, overlay) as RootConfig;
}

export function loadConfig(path: string): EndpointConfig {
  const cfg = JSON.parse(readFileSync(path, "utf8")) as EndpointConfig;
  if (cfg.provision === undefined) cfg.provision = "byo";
  return cfg;
}

export function rootStr(v: unknown): string {
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
export function engineField(root: RootConfig, key: string,
    fallback: unknown): string {
  const eng = root.engines?.comfyui ?? {};
  const fromRoot = rootStr(eng[key]);
  if (fromRoot) return fromRoot;
  return rootStr(fallback);
}

// the fixed folder set every ComfyUI install scans on a bound base
// (stock folder keys; order is the yaml's presentation order)
export const FIXED_FOLDERS: readonly string[] = [
  "checkpoints", "clip", "clip_vision", "controlnet",
  "diffusion_models", "loras", "unet", "vae", "upscale_models",
  "background_removal",
];

export interface BoundLayout {
  base_path: string;
  download_path: string;
  folders: Record<string, string>;
}

/**
 * Anchors a configured directory: absolute values pass through,
 * relative values resolve against the repository root. Lets the
 * tracked inference.config.json ship portable ("data/models") while
 * machine-local overlays (data/inference.local.json) pin absolute
 * roots on developer estates.
 */
export function anchorDir(value: string): string {
  return isAbsolute(value) ? value : resolve(REPO, value);
}

/** Anchors a possibly-unset override: empty stays empty so the
 *  root-config fallback in the `||` chains applies. anchorDir("")
 *  collapses to the repository root — a truthy value that silently
 *  masked the models.read_root fallback and re-pointed every yaml
 *  category at the repo (the wiring-roots audit, 2026-10-13).
 *  @param v the raw config value (undefined/null = unset)
 *  @returns the anchored absolute path, or "" when unset */
function anchoredOpt(v: unknown): string {
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
export function joinBase(root: string, base: string): string {
  const b = base.trim();
  if (b === "") return root;
  if (root === "" || root === "." ) return b;
  if (root === b || root.endsWith("/" + b) || root.endsWith("\\" + b)) return root;
  return join(root, b);
}

export function boundModelFolders(cfg: EndpointConfig): BoundLayout {
  // THE ONE derivation: ROOT config + endpoint overrides
  // -> {folder: mount subdir}. Refuses an unconfigured root LOUD.
  for (const k of ["model_base_path", "model_download_path"] as const) {
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
    joinBase(anchoredOpt(root.models?.read_root),
      rootStr(root.engines?.comfyui?.base));
  const download = anchoredOpt(cfg.model_download_path) ||
    anchoredOpt(cfg.model_base_path) ||
    joinBase(anchoredOpt(root.models?.download_root),
      rootStr(root.engines?.comfyui?.base));
  if (!rootStr(root.models?.read_root)) {
    die("models.read_root is unset in inference.config.json — " +
      "configure model storage from the project root (never guessed)");
  }
  const folders: Record<string, string> = {};
  for (const f of FIXED_FOLDERS) folders[f] = f;
  // pack-declared categories — the endpoint config owns the mapping;
  // the orchestrator stays generic (no pack names in the core)
  for (const cat of Object.keys(cfg.extra_model_folders ?? {}).sort()) {
    const sub = String(cfg.extra_model_folders?.[cat] ?? "")
      .trim().replace(/^\/+|\/+$/g, "");
    if (cat.trim() && sub) folders[cat.trim()] = sub;
  }
  return { base_path: base, download_path: download, folders };
}

export function engineUrl(cfg: EndpointConfig): string {
  const root = loadRoot();
  return engineField(root, "url", cfg.url);
}

export function enginePort(cfg: EndpointConfig): number {
  const root = loadRoot();
  const raw = engineField(root, "port", cfg.port);
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n)) {
    die("engines.comfyui.port is not a number in inference.config.json " +
      "(endpoint override: " + JSON.stringify(cfg.port ?? null) + ")");
  }
  return n;
}
