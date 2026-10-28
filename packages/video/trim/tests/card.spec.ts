// card.spec.ts — the trim card wall: the declared surface,
// the loud refusals, and the load-window math.
import "../../../../tests/helpers/boot-models.ts";
import { describe, it, beforeAll } from "vitest";
import assert from "node:assert/strict";
import { loadCardDefs } from "@melite/comfyui-cordis";
import { GraphBuilder } from "@melite/comfyui-card-kit/graph";
import type { ModelFacts } from "@melite/comfyui-card-kit/facts";
import { CardDefinition } from '@melite/comfyui-card-kit/card-definition'

const DUMMY: ModelFacts = { id: "x", card: "x", defaults: {}, lane_inputs: {}, card_knobs: [], variants: [], variant_groups: [], outputs: [] } as never;

let def: CardDefinition;
beforeAll(async () => {
  def = (await loadCardDefs()).get("trim")!;
  assert.ok(def, "the composition root serves the trim card");
});

type Row = Record<string, unknown>;

const nodesOf = (g: GraphBuilder): Array<{ class_type: string; inputs: Record<string, unknown> }> =>
  Object.values(g.toJSON()) as Array<{ class_type: string; inputs: Record<string, unknown> }>;

describe("the trim card declaration", () => {
  it("carries the documented identity (never a generated title)", () => {
    assert.equal(def.identity?.label, "Trim Video");
    assert.equal(def.identity?.genre, "video");
  });

  it("requires VHS at the compose door (the extension law)", () => {
    assert.ok((def.requires ?? []).includes("ComfyUI-VideoHelperSuite"));
  });

  it("refuses a missing clip LOUD", () => {
    assert.throws(
      () => def.compose({ start_seconds: 0, end_seconds: 1 } as never, DUMMY, new GraphBuilder(), "r_noclip"),
      /required param 'clip' missing/,
    );
  });

  it("refuses an empty window LOUD (end at or before start)", () => {
    assert.throws(
      () => def.compose({ clip: "/c.mp4", start_seconds: 2, end_seconds: 2 } as never, DUMMY, new GraphBuilder(), "r_empty"),
      /empty trim window/,
    );
  });

  it("lands the load window frame-exact at 24 fps (round, never floor)", () => {
    const g = new GraphBuilder();
    def.compose({ clip: "/c.mp4", start_seconds: 0.5, end_seconds: 2.0 } as never, DUMMY, g, "r_win");
    const load = nodesOf(g).find((n) => n.class_type === "VHS_LoadVideo")!;
    assert.ok(load, "the graph loads through VHS");
    // 0.5s * 24 = 12 skipped; (2.0-0.5) * 24 = 36 capped.
    assert.equal(load.inputs.skip_first_frames, 12);
    assert.equal(load.inputs.frame_load_cap, 36);
    const combine = nodesOf(g).find((n) => n.class_type === "VHS_VideoCombine")!;
    assert.ok(combine, "the graph re-combines to video");
    assert.equal(combine.inputs.frame_rate, 24);
  });

  it("leaves the tail open on end_seconds -1 (cap 0 = all)", () => {
    const g = new GraphBuilder();
    def.compose({ clip: "/c.mp4", start_seconds: 1.0, end_seconds: -1 } as never, DUMMY, g, "r_tail");
    const load = nodesOf(g).find((n) => n.class_type === "VHS_LoadVideo")!;
    assert.equal(load.inputs.skip_first_frames, 24);
    assert.equal(load.inputs.frame_load_cap, 0);
  });

  it("THE VIDEO SEAT LAW (2026-11-12 picker burn): the clip knob carries media 'video' — the OS accept, the From-media kind, and the square's preview all key on it", () => {
    const env = (def.schema as unknown as { toJSON: () => { uid: number; refs: Record<number, Record<string, unknown>> } }).toJSON();
    const root = env.refs[env.uid] as { dict: Record<string, number> };
    const id = root.dict["clip"];
    assert.ok(id !== undefined, "the clip knob rides the schema envelope");
    const node = env.refs[id] as { meta?: { extra?: { media?: string } } };
    assert.equal(node.meta?.extra?.media, "video",
      "clip.media must be 'video' — an unhinted video seat serves the image triad (the operator burn: pure image files that don't work, no video previews)");
  });
});
