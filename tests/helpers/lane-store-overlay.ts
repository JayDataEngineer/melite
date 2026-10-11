// lane-store-overlay.ts — the hermetic STORE for compose specs (the
// lane-presence cure's seat, 2026-10-23). The declared-home arms made
// the run gate judge every lane file, so a spec that composes cards
// on a machine whose real store lacks one declared row now refuses —
// correct at Run, wrong for a spec whose subject is composition, not
// store presence. The overlay repoints MELITE_REPO_ROOT at a fixture
// root that symlinks the real tree everywhere EXCEPT the runtime
// models subtree: that subtree mirrors the real store (per-child
// symlinks) and materializes every declared-home row the mirror
// lacks, so the gate reads "the store as the DECLs declare it" while
// every other repo-root reader (facts, flows, manifests) resolves
// through to the real files. The endpoint config (the compose URL +
// the mount leg) stays ambient. Presence judgment itself stays owned
// by cards-lanes.spec's fixture world.
import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
// ROOT-HELPER IMPORTS (the boot-models law): this helper sits at the
// repo root, outside every package's tsconfig paths — cross-package
// imports resolve through relative src paths, never package names.
import { getModel, registryIds } from "../../packages/engines/comfyui-cordis/src/models/models.ts";
import { resolveRepoRoot } from "../../packages/engines/comfyui-cordis/src/comfyui-config.ts";

let FIX = "";
let PREV_ROOT = "";

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
  // models/: the mirrored store, then the declared-home overlay
  const modelsDir = join(comfyDir, "models");
  mkdirSync(modelsDir, { recursive: true });
  mirrorChildren(realModels, modelsDir, "");
  for (const fam of registryIds()) {
    const decl = getModel(fam) as {
      lane_inputs?: Record<string, unknown>;
      lane_homes?: Record<string, string>;
    };
    const homes = decl.lane_homes ?? {};
    const li = decl.lane_inputs ?? {};
    for (const [slot, home] of Object.entries(homes)) {
      const raw: unknown = li[slot];
      if (typeof raw !== "string" || raw.trim() === "") continue;
      const name: string = raw.trim();
      const cut = name.lastIndexOf("/");
      const spellings: Array<[string, string]> = cut > 0
        ? [[home, name], [home + "/" + name.slice(0, cut), name.slice(cut + 1)]]
        : [[home, name]];
      for (const [folder, fname] of spellings) {
        const target = join(modelsDir, folder, fname);
        if (existsSync(target)) continue;
        mkdirSync(dirname(target), { recursive: true });
        // a directory for a tree row (the HF-dir spelling), an empty
        // file for a file row — only existence is faked; no run ever
        // loads these bytes in a compose spec
        if (fname.includes(".")) writeFileSync(target, "");
        else mkdirSync(target, { recursive: true });
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
