// mesh-repress.spec.ts — THE RE-PRESS WALL (the operator's live
// burn, 2026-10-28: "it only runs once. After I run it, I hit run
// again, it just gives the same result with no wait").
//
// THE MECHANISM: the family DECLs pinned seed 42, so every default
// press composed the byte-identical graph — and the engine's
// cross-prompt node cache (stock ComfyUI: CacheSet lives on the
// process's PromptQueue, keyed by input signature, RAM_PRESSURE by
// default) replays identical graphs without executing. Press 2
// returned run 1's outputs in ~0s with no ws events. The D11
// replaySuspect verdict already voices the replay when it happens;
// THIS wall cures the default press so the replay cannot happen:
// the family seed default is -1 (GATE S: random per compose), the
// same convention every image card already rides (their families
// declare no seed at all; the mesh families owned 42).
//
// THE SEAT (make-card schema law + make-model ownership): seed
// rides the MODEL — the card schema carries no .default (its own
// comment says so) — so the cure lands on the family DECLs, never
// the card. The card's tooltip names the promise instead.
//
// Arms per family (pixal3d + trellis2-native):
//   1. the family default seed IS -1 (the press randomizes);
//   2. two defaults-driven composes mint DIFFERENT sampler seeds
//      (a re-press is a fresh take — the graph differs, the engine
//      executes);
//   3. a PINNED seed composes byte-identical graphs twice (the
//      tooltip promise: same seed + image = same take; a pinned
//      re-press legitimately replays fast, exactly like the
//      official UI's cache on an unchanged queue).
//
// Depth: real DECLs, real mesh actions, the real instantiateAction
// cascade through GraphBuilder — no literals of the behavior.
//
// Run: node node_modules/vitest/vitest.mjs run tests/walls/ts/suites/mesh-repress.spec.ts
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { GraphBuilder } from "../../../../packages/engines/comfyui-card-kit/src/graph.ts";
import { instantiateAction } from "../../../../packages/engines/comfyui-card-kit/src/action.ts";
import type { ModelFacts } from "../../../../packages/engines/comfyui-card-kit/src/facts.ts";
import { DECL as PIXAL_DECL } from "../../../../packages/models/pixal3d/src/index.ts";
import { mesh as pixalMesh } from "../../../../packages/models/pixal3d/src/actions.ts";
import { DECL as TRELLIS_DECL } from "../../../../packages/models/trellis2-native/src/index.ts";
import { mesh as trellisMesh } from "../../../../packages/models/trellis2-native/src/actions.ts";

type Node = { class_type: string; inputs: Record<string, unknown> };
type Graph = Record<string, Node>;

const FAMILIES = [
  { id: "pixal3d", DECL: PIXAL_DECL, mesh: pixalMesh },
  { id: "trellis2-native", DECL: TRELLIS_DECL, mesh: trellisMesh },
] as const;

function factsOf(DECL: { id: string; lane_inputs?: Record<string, unknown> }): ModelFacts {
  return {
    id: DECL.id,
    card: "img-to-mesh",
    defaults: {},
    lane_inputs: DECL.lane_inputs ?? {},
    variants: [],
    variant_groups: [],
    outputs: [],
  };
}

/** What a fresh card press composes: the body omits seed, the
 *  cascade stamps the family default — spread here verbatim. */
function defaultsDoc(fam: (typeof FAMILIES)[number]): Record<string, unknown> {
  const defaults = (fam.DECL as { defaults?: Record<string, unknown> }).defaults ?? {};
  return { input_image: "/in/probe.png", ...defaults };
}

function compose(fam: (typeof FAMILIES)[number], doc: Record<string, unknown>): Graph {
  const g = new GraphBuilder({});
  instantiateAction(fam.mesh, doc, factsOf(fam.DECL), g, "wall-repress");
  return g.toJSON() as Graph;
}

function samplerSeeds(g: Graph): number[] {
  return Object.values(g)
    .filter((n) => n.class_type === "KSampler")
    .map((n) => n.inputs.seed as number);
}

describe("img-to-mesh re-press (the no-wait replay contract)", () => {
  for (const fam of FAMILIES) {
    describe(`${fam.id}`, () => {
      it("the family default seed is -1: a default press randomizes its take", () => {
        const defaults = (fam.DECL as { defaults?: Record<string, unknown> }).defaults ?? {};
        assert.equal(
          defaults.seed,
          -1,
          "seed 42 pins every default press to one graph and the engine cache replays run 1 forever — -1 mints a fresh take per compose (GATE S)",
        );
      });

      it("two default presses mint different takes: the re-press executes", () => {
        const a = samplerSeeds(compose(fam, defaultsDoc(fam)));
        const b = samplerSeeds(compose(fam, defaultsDoc(fam)));
        assert.ok(a.length > 0, "the mesh action samples");
        assert.ok(
          a.every((s) => s !== -1) && b.every((s) => s !== -1),
          "the sentinel minted concrete seeds",
        );
        assert.ok(
          new Set([...a, ...b]).size > 1,
          "two default presses shared one take — the second press composes the identical graph and the engine serves it from cache with no execution",
        );
      });

      it("a pinned seed reproduces byte-identical graphs: same seed + image = same take", () => {
        const doc = { ...defaultsDoc(fam), seed: 42 };
        assert.equal(
          JSON.stringify(compose(fam, doc)),
          JSON.stringify(compose(fam, doc)),
          "a pinned seed must stay deterministic — the tooltip's reproduce promise",
        );
      });
    });
  }
});
