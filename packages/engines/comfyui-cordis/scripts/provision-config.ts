// provision-config — endpoint + root config (SSOT read) and the bound model layout.
// Split from scripts/provision.ts (pure move — no logic changes).

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT_CONFIG, die } from "./provision-shared.ts";

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

export function loadRoot(): RootConfig {
  if (!existsSync(ROOT_CONFIG)) {
    die("no root config at inference.config.json — model storage is " +
      "configured from the project root (never guessed)");
  }
  return JSON.parse(readFileSync(ROOT_CONFIG, "utf8")) as RootConfig;
}

export function loadConfig(path: string): EndpointConfig {
  const cfg = JSON.parse(readFileSync(path, "utf8")) as EndpointConfig;
  if (cfg.provision === undefined) cfg.provision = "byo";
  return cfg;
}

export function rootStr(v: unknown): string {
  return String(v ?? "").trim();
}

export function engineField(root: RootConfig, key: string,
    override: unknown): string {
  const ov = rootStr(override);
  if (ov) return ov;
  const eng = root.engines?.comfyui ?? {};
  return rootStr(eng[key]);
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
  const base = rootStr(cfg.model_base_path) ||
    join(rootStr(root.models?.read_root), rootStr(root.engines?.comfyui?.base));
  const download = rootStr(cfg.model_download_path) ||
    rootStr(cfg.model_base_path) ||
    join(rootStr(root.models?.download_root),
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
