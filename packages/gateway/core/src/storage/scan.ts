// storage/scan.ts — run-dir scan + estate root resolution.
//
// STAGE 1 (DSH bundle split, 2026-09-08): moved verbatim from
// doors/assets.ts (AssetRoots, ASSET_URL_PREFIX, readSidecar,
// sha256File, scanRun) — disk truth is storage-domain; the doors
// import it from here. resolveRepoRoot is the ENGINE's (the one
// canonical resolver; the per-file copies died 2026-09-08).

import { resolveRepoRoot } from "@melite/engine-comfyui";

import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { kindFor, pyInt, pyStr } from "../core/pyValue.ts";

/** Resolved filesystem roots for the doors (see header). */
export interface AssetRoots {
  readonly stateRoot: string;
  readonly runsRoot: string;
  readonly testRunsRoot: string;
  readonly inputsRoot: string;
  readonly ledgerPath: string;
  readonly mediaKindsPath: string;
}

/** The artifact-serving URL prefix — owned by python/editor_runs
 *  (ASSET_URL_PREFIX); stamped here for the rel slice, one
 *  constant, no restated coordinates. */
export const ASSET_URL_PREFIX: string = "/v1/assets/runs";


/** The estate input stream dir — mirrors REPO / "data" / "input". */
export function resolveInputDir(): string {
  return resolve(resolveRepoRoot(), "data", "input");
}

function readSidecar(runDir: string): Record<string, unknown> {
  try {
    const v: unknown = JSON.parse(
      readFileSync(join(runDir, "_flow.json"), "utf8"),
    );
    if (typeof v === "object" && v !== null && !Array.isArray(v)) {
      return v as Record<string, unknown>;
    }
    return {};
  } catch {
    return {};
  }
}

function sha256File(full: string): string | null {
  try {
    const h = createHash("sha256");
    h.update(readFileSync(full));
    return h.digest("hex");
  } catch {
    return null;
  }
}

/** Disk truth -> typed rows (python/asset_ledger.scan_run): `_`-prefixed
 *  names skipped, non-files skipped, empty files skipped, rows carry
 *  name/run_id/kind/bytes/sha256/url. A NON-directory run path reads
 *  as an empty row set (listdir fails -> no names — mirrors py).
 *  Exported (not duplicated) for the storage seam: src/storage/store.ts
 *  converges the assets domain replica from these rows. */
export function scanRun(
  runsRoot: string,
  ent: string,
  kindsPath: string,
): {
  run_id: string;
  name: string;
  status: string;
  created_at: number;
  test: boolean;
  artifacts: Record<string, unknown>[];
} {
  const runDir: string = join(runsRoot, ent);
  const sc: Record<string, unknown> = readSidecar(runDir);
  let names: string[];
  try {
    names = readdirSync(runDir).sort();
  } catch {
    names = [];
  }
  const arts: Record<string, unknown>[] = [];
  for (const name of names) {
    if (name.startsWith("_")) continue;
    const full: string = join(runDir, name);
    let isFile = false;
    let size = 0;
    try {
      const st = statSync(full);
      isFile = st.isFile();
      size = st.size;
    } catch {
      continue;
    }
    if (!isFile || size <= 0) continue;
    const sha: string | null = sha256File(full);
    if (sha === null) continue;
    arts.push({
      name,
      run_id: ent,
      kind: kindFor(name, kindsPath),
      bytes: size,
      sha256: sha,
      url: ASSET_URL_PREFIX + "/" + ent + "/" + name,
    });
  }
  return {
    run_id: ent,
    name: pyStr(sc["model"] ?? ""),
    status: pyStr(sc["status"] ?? "unknown"),
    created_at: pyInt(sc["created_at"]),
    test: Boolean(sc["test"] ?? false),
    artifacts: arts,
  };
}
