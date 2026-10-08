// comfyui-config.ts — the endpoint SSOT: the ONLY spelling of the
// endpoint resolution (split from comfyui.ts 2026-09-18).

import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ComfyError } from "./comfyui-types.ts";
import type { EngineJson } from "./comfyui-types.ts";

// before, so the source-file-relative repo-root hops are unchanged.

// ── config: the endpoint SSOT (this module is the single spelling) ──

/** No-endpoint refusal — the exact string the queue lane throws. */
export const NO_ENDPOINT_MESSAGE: string =
  "no ComfyUI endpoint: the endpoint config carries no 'url' " +
  "and COMFYUI_URL is unset (no defaults — QUEUE LANE LAW)";

/** Repo root: MELITE_REPO_ROOT override (the wall seam — default
 *  resolution is the source-file-relative root). Serves ESTATE-root
 *  reads (runtime trees, stores); package-owned data uses
 *  {@link packageRoot} — design/repo-root-anchor-2026-10-18.md. */
export function resolveRepoRoot(): string {
  const override: string = process.env["MELITE_REPO_ROOT"] ?? "";
  if (override !== "") return override;
  const here: string = dirname(fileURLToPath(import.meta.url));
  // src→comfyui→engines→packages→repo (4 hops).
  return resolve(here, "..", "..", "..", "..");
}

/** Walk up from {@link startDir} to the nearest ancestor whose
 *  package.json names THIS package — the pure core of the package
 *  anchor (test seats pass a shaped start dir; the live seat is
 *  packageRoot). A fixed hop count cannot serve both planes
 *  (src/ in the checkout sits one segment shallower than lib/src/
 *  in an install, since lib mirrors src), but the package root
 *  carries its package.json on every plane. */
export function packageRootFrom(startDir: string): string {
  let dir: string = startDir;
  for (;;) {
    const marker = join(dir, "package.json");
    if (existsSync(marker)) {
      const read = readFileSync(marker, "utf8");
      const name = (JSON.parse(read) as { name?: unknown })["name"];
      if (name === "@melite/comfyui-cordis") return dir;
    }
    const parent: string = dirname(dir);
    if (parent === dir) {
      throw new Error(
        "packageRoot: no ancestor carries @melite/comfyui-cordis's package.json — the package tree is malformed",
      );
    }
    dir = parent;
  }
}

/** This package's root — the anchor for the data/ the published
 *  files set ships (`data/**`). No env pin needed: an install
 *  finds its own shipped data by construction. */
export function packageRoot(): string {
  return packageRootFrom(dirname(fileURLToPath(import.meta.url)));
}

/** The endpoint config dict — the single spelling of the law:
 *  COMFYUI_ENDPOINT_CONFIG env path first, else the plugin's
 *  data/comfyui_endpoint.json; INFERENCE_TEST_SANDBOX without the
 *  env path resolves to {} (the test-sandbox leak gate); a
 *  present-but-unparseable file raises LOUD (never silent {}). */
/** The endpoint config's write target: the first EXISTING candidate,
 *  else the plugin's own data path (a fresh write). The same
 *  resolution loadEndpointConfig reads — one spelling for read and
 *  write (the endpoint_set manage action rewrites only `url`). */
export function endpointConfigPath(): string {
  const envPath: string = process.env["COMFYUI_ENDPOINT_CONFIG"] ?? "";
  if (envPath !== "") return envPath;
  // Package-anchored (not resolveRepoRoot): the endpoint default
  // candidate is data the published package itself ships — an
  // install with no MELITE_REPO_ROOT must still find it (the
  // consumer receipt wall pins this).
  return join(packageRoot(), "data", "comfyui_endpoint.json");
}

export function loadEndpointConfig(): Record<string, EngineJson> {
  const envPath: string = process.env["COMFYUI_ENDPOINT_CONFIG"] ?? "";
  const sandbox: string = process.env["INFERENCE_TEST_SANDBOX"] ?? "";
  if (sandbox !== "" && envPath === "") return {};
  const cands: string[] =
    envPath !== ""
      ? [envPath]
      : [
          // Package-anchored (deep-audit engine finding #1's cure,
          // 2026-09-10, re-anchored 2026-10-18): the PLUGIN's own
          // data dir is what the published files set ships, so the
          // default candidate follows packageRoot(), not the repo
          // root — an install with no MELITE_REPO_ROOT still reads
          // it, and the stale-segment silent skip stays dead.
          join(packageRoot(), "data", "comfyui_endpoint.json"),
        ];
  for (const cand of cands) {
    if (!existsSync(cand)) continue;
    try {
      const text: string = readFileSync(cand, "utf8");
      return JSON.parse(text) as Record<string, EngineJson>;
    } catch (exc: unknown) {
      // readFileSync/JSON.parse throw Error by contract — the read
      // casts (the unknown halves are the type toll, never runtime
      // arms; 2026-09-12).
      const err = exc as Error;
      throw new Error(
        "endpoint config " +
          cand +
          " exists but will not parse (" +
          err.constructor.name +
          ": " +
          err.message +
          ") — fix the file; no silent fallback",
      );
    }
  }
  return {};
}

/** The engine base URL — env seam for the hermetic walls (live env
 *  read, no caching; this function is the only spelling). */
export function resolveEngineBaseUrl(): string {
  const env: string = process.env["COMFYUI_URL"] ?? "";
  if (env !== "") return env.replace(/\/+$/, "");
  const cfg: Record<string, EngineJson> = loadEndpointConfig();
  const url: string = String(cfg["url"] ?? "").replace(/\/+$/, "");
  if (url === "") throw new ComfyError(NO_ENDPOINT_MESSAGE);
  return url;
}
