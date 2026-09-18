// linked.ts — the linked-input spelling (2026-09-10).
//
// The editor injects an upstream card's output as its asset URL in
// TWO spellings: absolute (http://host/v1/assets/runs/…) and
// root-relative (/v1/assets/runs/…). A root-relative value can ONLY
// be a gateway asset URL (estate absolutes carry their mount
// prefix), so rewrite it to the runs-root mount path — same estate,
// no HTTP round-trip, and the compose-time existence check stays
// meaningful (a missing producer file refuses at compose, not deep
// in the engine). Absolute URLs ride verbatim — the submit-time
// uploader fetches and stages them.

import { join, sep } from "node:path";

/** The asset-URL mount served by GET /v1/assets/runs/*. */
export const ASSET_RUNS_PREFIX = "/v1/assets/runs/";

/** The runs output root (assets.ts defaultAssetRoots semantics:
 *  MELITE_STATE_ROOT first, else the estate's data tree). */
export function runsRoot(): string {
  const state: string =
    process.env["MELITE_STATE_ROOT"] ?? join(process.cwd(), "data", "runs");
  return join(state, "output");
}

/** Rewrite a root-relative asset URL to its estate mount path;
 *  every other spelling rides verbatim. A rewritten path that
 *  escapes the runs root refuses LOUD (never a smuggled read). */
export function resolveLinkedInput(ref: string): string {
  const s: string = ref.trim();
  if (!s.startsWith(ASSET_RUNS_PREFIX)) return s;
  const root: string = runsRoot();
  const abs: string = join(root, s.slice(ASSET_RUNS_PREFIX.length));
  if (abs !== root && !abs.startsWith(root + sep)) {
    throw new Error(
      `linked input '${s}' escapes the runs root — upstream outputs only, never hand-spelled paths`,
    );
  }
  return abs;
}
