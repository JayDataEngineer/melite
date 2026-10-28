// card.spec.ts — the frames card wall: the declared surface,
// the loud refusal, and the stride wiring.
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
  def = (await loadCardDefs()).get("frames")!;
  assert.ok(def, "the composition root serves the frames card");
});

type Row = Record<string, unknown>;

const nodesOf = (g: GraphBuilder): Array<{ class_type: string; inputs: Record<string, unknown> }> =>
  Object.values(g.toJSON()) as Array<{ class_type: string; inputs: Record<string, unknown> }>;

describe("the frames card declaration", () => {
  it("carries the documented identity (never a generated title)", () => {
    assert.equal(def.identity?.label, "Video Frames");
    assert.equal(def.identity?.genre, "video");
  });

  it("requires VHS at the compose door (the extension law)", () => {
    assert.ok((def.requires ?? []).includes("ComfyUI-VideoHelperSuite"));
  });

  it("refuses a missing clip LOUD", () => {
    assert.throws(
      () => def.compose({ every_nth: 48 } as never, DUMMY, new GraphBuilder(), "r_noclip"),
      /required param 'clip' missing/,
    );
  });

  it("wires the stride into the load and stages through SaveImage", () => {
    const g = new GraphBuilder();
    def.compose({ clip: "/c.mp4", every_nth: 24, frame_load_cap: 240 } as never, DUMMY, g, "r_stride");
    const load = nodesOf(g).find((n) => n.class_type === "VHS_LoadVideo")!;
    assert.ok(load, "the graph loads through VHS");
    assert.equal(load.inputs.select_every_nth, 24);
    assert.equal(load.inputs.frame_load_cap, 240);
    const save = nodesOf(g).find((n) => n.class_type === "SaveImage")!;
    assert.ok(save, "frames stage through the native SaveImage (no new output type)");
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
