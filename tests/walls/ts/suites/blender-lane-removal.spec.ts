/**
 * BLENDER LANE REMOVAL (2026-11-01 — the operator's order: "We want to
 * remove blender. We do not want to maintain that in melite.").
 *
 * THE LAW: melite carries ZERO blender seats — no engine node, no route,
 * no card param, no subprocess. Blender rides DSH PROFILES exclusively
 * (AGENTS.md Layer B, `mega-blender`). The 2026-10-04 ruling allowed a
 * blender capability as a Layer C graph NODE; that seat class is
 * superseded: `RayCreatureRigBridge` (the poser rig bridge) and
 * `RayRenderGLBViews` (the GLB proof-sheet renderer) are deleted from
 * `melite-poser-nodes`, the `@melite/models-anycreature` family behind
 * the bridge is deleted, and the rig/anny/gem-soma cards serve GLB-only
 * surfaces — the seated GLB is the verb's output.
 *
 * THE SWEEP (LAW 4 DEPTH — derived rosters over hand lists): the four
 * seats a blender lane can return through, each its own firing arm —
 *   1. the engine's served class plane (boot fixture + model-facts
 *      pack declarations) — the seat the graph composer actually reads;
 *   2. the TS src plane (packages/**\/src) — schemas, flows, kit arms;
 *      the seven surviving narration lines that NAME the deleted seats
 *      in their retirement prose are rostered exact (line content, not
 *      line numbers — a reflow must not trip the wall, an addition
 *      must);
 *   3. the flow/route/param plane (harness + web estate src) — the
 *      kebab/snake route and knob spellings;
 *   4. the vendored packs' executable plane — `import bpy`, a quoted
 *      `blender` executable, the deleted class/file names. Prose
 *      mentions ("no Blender", "Blender's glTF importer") are
 *      commentary and data-format facts, not seats, and must not red.
 *
 * tests/walls/ itself is OUTSIDE every sweep: walls narrate laws,
 * including this one.
 *
 * Run: npx vitest run tests/walls/ts/suites/blender-lane-removal.spec.ts
 */
import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join, dirname, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const HERE: string = dirname(fileURLToPath(import.meta.url));
const REPO: string = join(HERE, "..", "..", "..", "..");

/** The deleted engine seats + their route/spelling shadows. A blender
 *  lane can only return through one of these names (or a new one, which
 *  is a new law — this wall reds on none of them silently). */
const SEAT_CLASSES: readonly string[] = ["RayRenderGLBViews", "RayCreatureRigBridge"];
const SEAT_SPELLINGS: RegExp =
  /RayRenderGLBViews|RayCreatureRigBridge|blender_render|blender_convert|blender_retarget|creature_rig_bridge|render_glb_views|render_glb\b|bridge_creature|blender_bin/;

/** ARM 2's roster: the ONLY src-plane lines that name a deleted seat —
 *  retirement narration, pinned by exact trimmed content. A cure that
 *  rewords one of these, or any new occurrence anywhere in
 *  packages/**\/src, re-reds this arm with the drift named. */
const NARRATION_ROSTER: Readonly<Record<string, readonly string[]>> = {
  "packages/3d/rig/src/card.ts": [
    "// 2026-11-01: melite carries no blender) — RayCreatureRigBridge and",
  ],
  "packages/engines/comfyui-card-kit/src/lanes-3d.ts": [
    "// RayCreatureRigBridge). The card's mode knob names the family; every",
    "// blender lane (2026-11-01 — RayCreatureRigBridge and the",
  ],
  "packages/engines/comfyui-card-kit/src/blocks/poser-kit.ts": [
    "// RayRenderGLBViews renderer was deleted from the pack); what remains",
  ],
  "packages/models/anny/src/actions.ts": [
    "// identity sliders). The 8-view turnaround tail (RayRenderGLBViews)",
    "* 8-view turnaround sheet (RayRenderGLBViews + the per-view",
  ],
  "packages/models/skin/src/actions.ts": [
    "// (RayRenderGLBViews) died with the blender lane (2026-11-01) —",
  ],
};

/** Every TS/TSX source file under packages/**\/src (no lib, no tests —
 *  package suites carry retirement arms that name seats on purpose;
 *  tests/walls is the law plane and is outside every sweep). */
function tsSrcFiles(): string[] {
  const out: string[] = [];
  const walk = (dir: string): void => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) {
        if (e.name === "node_modules" || e.name === "lib" || e.name === "tests") continue;
        walk(p);
      } else if (/\.(ts|tsx)$/.test(e.name) && !e.name.endsWith(".d.ts") && !e.name.endsWith(".spec.ts")) {
        out.push(p);
      }
    }
  };
  walk(join(REPO, "packages"));
  return out;
}

/** Shipped python under every vendored pack (bytecode caches, dev
 *  scripts, pack-local vendor shims, and vendored third-party trees are
 *  not node seats — the vendor-estate-locations wall owns that carve). */
function shippedPackPy(): string[] {
  const packs = join(REPO, "vendor", "comfyui_extensions");
  const out: string[] = [];
  const walk = (dir: string): void => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) {
        if (["__pycache__", "_vendor", "tests", "tools", "moss_sfx_impl", "library"].includes(e.name)) continue;
        walk(p);
      } else if (e.name.endsWith(".py")) out.push(p);
    }
  };
  for (const pack of readdirSync(packs, { withFileTypes: true })) {
    if (!pack.isDirectory()) continue;
    walk(join(packs, pack.name));
  }
  return out;
}

describe("THE BLENDER LANE REMOVAL WALL (2026-11-01 — melite carries zero blender seats)", () => {
  it("the engine serves no blender node: the boot fixture's class plane and every pack's declared node roster are seat-free (the composer's real door)", () => {
    const fixture = JSON.parse(readFileSync(join(REPO, "tests/walls/fixtures/object_info.boot.json"), "utf8")) as Record<string, unknown>;
    const classes = Object.keys(fixture);
    expect(classes.length, "the boot fixture is non-empty (the sweep judges a real plane)").toBeGreaterThan(0);
    const served = classes.filter((c) => SEAT_CLASSES.includes(c));
    expect(served, `the served class plane declares deleted blender seats: ${JSON.stringify(served)}`).toEqual([]);

    const facts = JSON.parse(readFileSync(join(REPO, "packages/engines/comfyui-cordis/data/model-facts.json"), "utf8")) as {
      packs?: Array<{ id?: string; engine_node_types?: string[] }>;
    };
    const declared: string[] = [];
    for (const pack of facts.packs ?? []) {
      for (const nt of pack.engine_node_types ?? []) {
        if (SEAT_CLASSES.includes(nt)) declared.push(`${pack.id ?? "?"}:${nt}`);
      }
    }
    expect(declared, `model-facts still declares deleted blender node types: ${JSON.stringify(declared)}`).toEqual([]);
  });

  it("the TS src plane names the deleted seats ONLY in its rostered retirement narration (seven lines, pinned exact)", () => {
    const files = tsSrcFiles();
    expect(files.length, "the TS sweep derives a real corpus").toBeGreaterThan(300);
    const drift: string[] = [];
    const seen = new Map<string, string[]>();
    for (const f of files) {
      const rel = relative(REPO, f).split(sep).join("/");
      const hits = readFileSync(f, "utf8")
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => SEAT_SPELLINGS.test(l));
      if (hits.length > 0) seen.set(rel, hits);
      const allowed = NARRATION_ROSTER[rel];
      if (!allowed && hits.length > 0) drift.push(`${rel}: UNROSTERED ${JSON.stringify(hits)}`);
      if (allowed) {
        for (const h of hits) if (!allowed.includes(h)) drift.push(`${rel}: OFF-ROSTER line ${JSON.stringify(h)}`);
        for (const a of allowed) if (!hits.includes(a)) drift.push(`${rel}: ROSTERED LINE GONE ${JSON.stringify(a)}`);
      }
    }
    for (const rel of Object.keys(NARRATION_ROSTER)) {
      if (!seen.has(rel) && existsSync(join(REPO, rel))) drift.push(`${rel}: rostered file lost every line — shrink the roster by deliberate edit`);
    }
    expect(
      drift,
      `BLENDER SEAT DRIFT — a deleted seat's name appeared outside the retirement narration (or a rostered line moved): ${JSON.stringify(drift, null, 1)}`,
    ).toEqual([]);
    const rosteredLines = Object.values(NARRATION_ROSTER).flat().length;
    expect(rosteredLines, "the narration roster is non-empty (a silently emptied roster judges nothing)").toBe(7);
  });

  it("the flow/route/param plane carries zero blender spellings (harness + web estate src, the run-press's doors)", () => {
    const doors: string[] = [];
    for (const root of ["packages/harness/estate-queue/src", "packages/web"]) {
      const dir = join(REPO, root);
      if (!existsSync(dir)) continue;
      const walk = (d: string): void => {
        for (const e of readdirSync(d, { withFileTypes: true })) {
          const p = join(d, e.name);
          if (e.isDirectory()) {
            if (e.name === "node_modules" || e.name === "lib" || e.name === "tests" || e.name === "e2e") continue;
            walk(p);
          } else if (/\.(ts|tsx)$/.test(e.name) && !e.name.endsWith(".d.ts") && !e.name.endsWith(".spec.ts")) {
            const hits = readFileSync(p, "utf8").split("\n").filter((l) => SEAT_SPELLINGS.test(l));
            if (hits.length > 0) doors.push(`${relative(REPO, p)}: ${JSON.stringify(hits.map((h) => h.trim()))}`);
          }
        }
      };
      walk(dir);
    }
    expect(
      doors,
      `BLENDER ROUTE/PARAM SEAT — a run door still spells a deleted seat: ${JSON.stringify(doors, null, 1)}`,
    ).toEqual([]);
  });

  it("the vendored packs carry zero executable blender seats (no bpy, no blender subprocess, no deleted node names)", () => {
    const files = shippedPackPy();
    expect(files.length, "the pack sweep derives a real corpus").toBeGreaterThan(100);
    const seats: string[] = [];
    for (const f of files) {
      const lines = readFileSync(f, "utf8").split("\n");
      lines.forEach((line, i) => {
        const t = line.trim();
        const bpySeat = /(^|\s)(import bpy|from bpy[\s.,])/.test(line) || /bpy\.(ops|data|exe|context)/.test(line);
        const execSeat = /["']blender["']/.test(line) || /blender(-|\s?(--background|-b|\.exe))/.test(t);
        const nameSeat = SEAT_CLASSES.some((c) => line.includes(c)) || /blender_render|blender_convert/.test(line);
        if (bpySeat || execSeat || nameSeat) seats.push(`${relative(REPO, f)}:${i + 1}: ${t}`);
      });
    }
    expect(
      seats,
      `EXECUTABLE BLENDER SEAT — a pack still imports bpy, spawns a blender binary, or declares a deleted node: ${JSON.stringify(seats, null, 1)}`,
    ).toEqual([]);
  });
});
