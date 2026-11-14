// lane-store-overlay-cold.spec.ts — THE COLD-STORE CONTRACT (the
// 2026-11-14 CI split cure). The burn: the overlay seeded declared
// lane rows as ZERO-BYTE files while presentWeight (the gate's
// presence core) counts size-0 as absent — partial-download
// semantics — so every cold runner (empty real store, seeds all
// firing) refused compositions that were green on the operator's
// full store. This wall forces the cold condition DETERMINISTICALLY
// on every machine: it points MELITE_REPO_ROOT at an EMPTY root
// before the overlay installs, so the mirror contributes nothing
// and every declared row must be satisfied by the overlay's own
// seeds — judged through the GATE's own probe, never a re-derivation.
//
// The contract, two arms:
//  1. THE SEED-BYTES ARM: no file the overlay materialized under
//     the fixture models tree is zero bytes (presentWeight would
//     count it absent — the exact bug class).
//  2. THE FETCHABLE-ROW ARM: for every registry family, the gate's
//     whole miss list (laneMisses, the same walk the refusal
//     collects) is empty OR contains only HAND-ONLY names (the
//     deliberate absence the overlay's contract keeps — the
//     refusal-voice walls keep their subject on every machine).
import { afterAll, beforeAll, test } from "vitest";
import { readdirSync, statSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// module-level env set BEFORE any melite import resolves a root:
// the overlay mirrors `resolveRepoRoot()`'s answer, so this is what
// makes the mirror empty — the cold-runner condition, forced.
const COLD_ROOT = mkdtempSync(join(tmpdir(), "melite-cold-root-"));
process.env["MELITE_REPO_ROOT"] = COLD_ROOT;

const { bootModels } = await import("../../../../packages/engines/comfyui-cordis/src/models/service.ts");
const { getModel, registryIds } = await import("../../../../packages/engines/comfyui-cordis/src/models/models.ts");
const { installLaneStoreOverlay, restoreLaneStoreOverlay } = await import("../../../helpers/lane-store-overlay.ts");
const { laneMisses } = await import("../../../../packages/harness/estate-queue/src/cardsLanes.ts");
const { checkModelPresent } = await import("../../../../packages/engines/comfyui-cordis/src/catalog.ts");

let FIX = "";

beforeAll(async () => {
  await bootModels();
  FIX = installLaneStoreOverlay();
});

afterAll(() => {
  restoreLaneStoreOverlay();
});

/** The hand-only names the overlay deliberately leaves unseeded —
 * the same classification rule the helper applies (declared
 * hand_placed_weights with no provisions/snapshot row). */
function handOnlyOf(decl: unknown): Set<string> {
  const d = decl as {
    provisions?: Array<{ name?: string }>;
    snapshot_provisions?: Array<{ name?: string }>;
    hand_placed_weights?: Array<{ name?: string }>;
  };
  const covered = new Set<string>();
  for (const p of d.provisions ?? []) if (typeof p.name === "string") covered.add(p.name);
  for (const s of d.snapshot_provisions ?? []) if (typeof s.name === "string") covered.add(s.name);
  const out = new Set<string>();
  for (const w of d.hand_placed_weights ?? []) {
    const name = typeof w?.name === "string" ? w.name : "";
    if (name !== "" && !covered.has(name)) out.add(name);
  }
  return out;
}

test("the overlay's seeds are bytes the presence core counts (no zero-byte store file)", () => {
  const zero: string[] = [];
  const walk = (dir: string): void => {
    for (const ent of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, ent.name);
      if (ent.isDirectory()) walk(p);
      else if (ent.isFile() && ent.name.includes(".")) {
        const st = statSync(p);
        // symlinked REAL weights always carry bytes; a seed carries
        // the 1-byte sentinel — zero means the bug is back
        if (st.size === 0) zero.push(p);
      }
    }
  };
  walk(join(FIX, "data", "runtime", "comfyui", "models"));
  if (zero.length > 0) {
    throw new Error(
      "zero-byte files under the overlay store (presentWeight counts them ABSENT — the cold-runner refusal class): " +
        zero.slice(0, 5).join(", "),
    );
  }
});

test("a cold store satisfies the lane gate for every fetchable declared row, every family", () => {
  const offenders: string[] = [];
  for (const fam of registryIds()) {
    const decl = getModel(fam) as unknown as Parameters<typeof laneMisses>[0];
    const check = (folder: string, name: string): string | null =>
      checkModelPresent("models/" + folder, name);
    const misses = laneMisses(decl, check);
    const handOnly = handOnlyOf(decl);
    for (const m of misses) {
      if (handOnly.has(m.name) || handOnly.has(m.name.split("/").pop() ?? m.name)) continue;
      offenders.push(fam + " " + m.key + " " + m.name);
    }
  }
  if (offenders.length > 0) {
    throw new Error(
      "cold-store lane misses beyond the hand-only class (the overlay failed to materialize a fetchable row the gate probes): " +
        offenders.join("; "),
    );
  }
});

// the cold root must itself be empty of a models tree — otherwise
// the wall silently stops testing the cold condition on machines
// that reuse a temp dir
test("the cold root contributes no mirrored store (the wall's own premise)", () => {
  const modelsDir = join(COLD_ROOT, "data", "runtime", "comfyui", "models");
  let threw = false;
  try { readdirSync(modelsDir); } catch { threw = true; }
  if (!threw) throw new Error("COLD_ROOT unexpectedly carries a models tree");
});
