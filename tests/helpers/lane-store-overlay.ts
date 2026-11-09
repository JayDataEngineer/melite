// lane-store-overlay.ts — the hermetic STORE for compose specs (the
// lane-presence cure's seat, 2026-10-23). The declared-home arms made
// the run gate judge every lane file, so a spec that composes cards
// on a machine whose real store lacks one declared row now refuses —
// correct at Run, wrong for a spec whose subject is composition, not
// store presence. The overlay repoints MELITE_REPO_ROOT at a fixture
// root that symlinks the real tree everywhere EXCEPT the runtime
// models subtree: that subtree mirrors the real store (per-child
// symlinks) and materializes every DECLARED row the mirror lacks —
// stock-map slots and declared-home rows alike, across the family →
// variant → cell fold the compose stamps — so the gate reads "the
// store as the DECLs declare it" while every other repo-root reader
// (facts, flows, manifests) resolves through to the real files. The
// endpoint config (the compose URL + the mount leg) stays ambient.
// Hand-only trees stay missing by design (handOnlyNames below). On a
// machine whose real store is complete the materialization is a
// no-op (existsSync skips). Presence judgment itself stays owned by
// cards-lanes.spec's fixture world.
import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
// ROOT-HELPER IMPORTS (the boot-models law): this helper sits at the
// repo root, outside every package's tsconfig paths — cross-package
// imports resolve through relative src paths, never package names.
import { getModel, registryIds } from "../../packages/engines/comfyui-cordis/src/models/models.ts";
import { resolveRepoRoot } from "../../packages/engines/comfyui-cordis/src/comfyui-config.ts";
// THE ONE FOLDER MAP (cards-lanes.ts owns the stock slot → folders
// mapping; the overlay seeds it, it never re-derives it).
import { LANE_FOLDERS } from "../../packages/harness/estate-queue/src/cardsLanes.ts";

let FIX = "";
let PREV_ROOT = "";

/** The names the DECL classifies HAND-ONLY — declared lane rows with
 *  no provisions/snapshot row covering them. The overlay never
 *  materializes these: a hand-only tree is deliberately absent from
 *  every lawful store, and the walls that judge the refusal voice
 *  (weight-acquire-parity Arm A) keep their subject on every machine,
 *  not just the operator's. The same classification rule the wall
 *  re-derives; two homes on purpose — the wall judges the DECL, this
 *  seeds the fixture store. */
function handOnlyNames(decl: DeclShape): Set<string> {
  const covered = new Set<string>();
  for (const p of decl.provisions ?? []) {
    if (typeof p.name === "string") covered.add(p.name);
  }
  for (const s of decl.snapshot_provisions ?? []) {
    if (typeof s.name === "string") covered.add(s.name);
  }
  const out = new Set<string>();
  for (const w of decl.hand_placed_weights ?? []) {
    const name = typeof w?.name === "string" ? w.name : "";
    if (name !== "" && !covered.has(name)) out.add(name);
  }
  return out;
}

interface DeclShape {
  lane_inputs?: Record<string, unknown>;
  lane_homes?: Record<string, string>;
  provisions?: Array<{ name?: string; folder?: string }>;
  snapshot_provisions?: Array<{ name?: string; folder?: string }>;
  hand_placed_weights?: Array<{ name?: string }>;
  variants?: Array<{
    lane_inputs?: Record<string, unknown>;
    cells?: Array<{ lane_inputs?: Record<string, unknown> }>;
  }>;
}

/** Every lane_inputs map the gate can resolve for the family: the
 *  family rows, each variant's rows, and each variant cell's rows —
 *  the same fold the compose stamps (atom → variant → cell). */
function laneMaps(decl: DeclShape): Array<Record<string, unknown>> {
  const out: Array<Record<string, unknown>> = [decl.lane_inputs ?? {}];
  for (const v of decl.variants ?? []) {
    out.push(v.lane_inputs ?? {});
    for (const cell of v.cells ?? []) out.push(cell.lane_inputs ?? {});
  }
  return out;
}

/** Symlink every child of `real` into `into`, except `keep` (a real
 *  dir the caller creates; empty keeps all). */
function mirrorChildren(real: string, into: string, keep: string): void {
  if (!existsSync(real)) return;
  for (const child of readdirSync(real)) {
    if (child === keep) continue;
    const target = join(into, child);
    if (existsSync(target)) continue;
    try {
      symlinkSync(join(real, child), target, "dir");
    } catch {
      // a child already placed (re-run against a dirty tmp) rides
    }
  }
}

/** Build the overlay and repoint MELITE_REPO_ROOT at it. Idempotent
 *  per process: a second call without restore returns the live root.
 *  Must run AFTER the models boot — the declared-home walk reads the
 *  registry. */
export function installLaneStoreOverlay(): string {
  if (FIX !== "") return FIX;
  PREV_ROOT = process.env["MELITE_REPO_ROOT"] ?? "";
  const realRoot = resolveRepoRoot();
  const realModels = join(realRoot, "data", "runtime", "comfyui", "models");
  FIX = mkdtempSync(join(tmpdir(), "melite-lane-store-"));
  // the repo root: everything real except data/
  mirrorChildren(realRoot, FIX, "data");
  // data/: everything real except runtime/
  const dataDir = join(FIX, "data");
  mkdirSync(dataDir, { recursive: true });
  mirrorChildren(join(realRoot, "data"), dataDir, "runtime");
  // data/runtime/: everything real except comfyui/
  const rtDir = join(FIX, "data", "runtime");
  mkdirSync(rtDir, { recursive: true });
  mirrorChildren(join(realRoot, "data", "runtime"), rtDir, "comfyui");
  // data/runtime/comfyui/: everything real except models/
  const comfyDir = join(FIX, "data", "runtime", "comfyui");
  mkdirSync(comfyDir, { recursive: true });
  mirrorChildren(join(realRoot, "data", "runtime", "comfyui"), comfyDir, "models");
  // models/: the mirrored store, then the declared-store overlay
  const modelsDir = join(comfyDir, "models");
  mkdirSync(modelsDir, { recursive: true });
  mirrorChildren(realModels, modelsDir, "");
  for (const fam of registryIds()) {
    const decl = getModel(fam) as unknown as DeclShape;
    const homes = decl.lane_homes ?? {};
    const noFetch = handOnlyNames(decl);
    // THE STOCK-MAP LEG (the 2026-11-09 CI cure): the gate's stock
    // loop probes LANE_FOLDERS folders for every declared slot, and
    // the mirrored store only carries what the REAL store carries —
    // on a fresh clone that is nothing, so every stock-map row
    // refused and the composition walls red on presence, not law.
    // Seed the same folders the gate probes (the first stock folder
    // suffices — the gate hits on `folders.some`), for every lane
    // map the fold can resolve.
    const seed = (folder: string, name: string): void => {
      const target = join(modelsDir, folder, name);
      if (existsSync(target)) return;
      mkdirSync(dirname(target), { recursive: true });
      // a directory for a tree row (the HF-dir spelling), an empty
      // file for a file row — only existence is faked; no run ever
      // loads these bytes in a compose spec
      if (name.includes(".")) writeFileSync(target, "");
      else mkdirSync(target, { recursive: true });
    };
    const handOnly = (name: string): boolean =>
      noFetch.has(name) || noFetch.has(name.split("/").pop() ?? name);
    for (const li of laneMaps(decl)) {
      for (const [slot, raw] of Object.entries(li)) {
        const name: string = typeof raw === "string" ? raw.trim() : "";
        if (name === "" || handOnly(name)) continue;
        const stock = LANE_FOLDERS[slot];
        const prov = (decl.provisions ?? []).find((p) => p.name === name || p.name === (name.split("/").pop() ?? name));
        if (stock !== undefined) {
          seed(stock[0]!, name);
          if (prov?.folder !== undefined) seed(prov.folder, name.split("/").pop() ?? name);
          continue;
        }
        // THE DECLARED-HOME LOOP: pack-specific loaders whose folders
        // the DECL names itself — the same probe spellings the gate's
        // homeProbes builds (home/name and home/subdir/basename).
        const home = homes[slot];
        const cut = name.lastIndexOf("/");
        if (home !== undefined) {
          const spellings: Array<[string, string]> = cut > 0
            ? [[home, name], [home + "/" + name.slice(0, cut), name.slice(cut + 1)]]
            : [[home, name]];
          for (const [folder, fname] of spellings) seed(folder, fname);
        }
        // THE SNAPSHOT-PLACEMENT LEG: the snapshot row owns the
        // placement truth (folder + bare name) — the same pair the
        // gate probes, never re-suffixed.
        const base = name.split("/").pop() ?? name;
        const snap = (decl.snapshot_provisions ?? []).find(
          (s) => s.name === base && typeof s.folder === "string" && s.folder !== "",
        );
        if (snap?.folder !== undefined) seed(snap.folder, snap.name ?? base);
      }
    }
  }
  process.env["MELITE_REPO_ROOT"] = FIX;
  return FIX;
}

/** Restore the real root and drop the fixture tree. */
export function restoreLaneStoreOverlay(): void {
  if (FIX === "") return;
  if (PREV_ROOT === "") delete process.env["MELITE_REPO_ROOT"];
  else process.env["MELITE_REPO_ROOT"] = PREV_ROOT;
  const dead = FIX;
  FIX = "";
  PREV_ROOT = "";
  rmSync(dead, { recursive: true, force: true });
}
