// card.spec.ts — the track card wall: the declared surface,
// the loud refusal, and the reference-faithful arm wiring.
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
  def = (await loadCardDefs()).get("track")!;
  assert.ok(def, "the composition root serves the track card");
});

type Row = Record<string, unknown>;

const nodesOf = (g: GraphBuilder): Array<{ class_type: string; inputs: Record<string, unknown> }> =>
  Object.values(g.toJSON()) as Array<{ class_type: string; inputs: Record<string, unknown> }>;

const base: Row = { clip: "/c.mp4" };

describe("the track card declaration", () => {
  it("carries the documented identity (never a generated title)", () => {
    assert.equal(def.identity?.label, "Video Mask");
    assert.equal(def.identity?.genre, "video");
  });

  it("requires VHS + the oneclick-swap pack at the compose door (the extension law)", () => {
    assert.ok((def.requires ?? []).includes("ComfyUI-VideoHelperSuite"));
    assert.ok((def.requires ?? []).includes("comfyui-h3-oneclick-swap"));
  });

  it("refuses a missing clip LOUD", () => {
    assert.throws(
      () => def.compose({ prompt: "person" } as never, DUMMY, new GraphBuilder(), "r_noclip"),
      /required param 'clip' missing/,
    );
  });

  it("tracks once per arm and shares the person track (reference nodes 38/70)", () => {
    const g = new GraphBuilder();
    def.compose(base, DUMMY, g, "r_tracks");
    const tracks = nodesOf(g).filter((n) => n.class_type === "SAM3_VideoTrack");
    assert.equal(tracks.length, 2, "one person track + one face track — the mannequin arm shares the person track");
  });

  it("wires the three mask arms reference-faithful (39 edit tunable, 40 + 71 fixed)", () => {
    const g = new GraphBuilder();
    def.compose({ ...base, headroom: 0.2, hold_frames: 3, max_people: 2 } as never, DUMMY, g, "r_arms");
    const masks = nodesOf(g).filter((n) => n.class_type === "H3PeopleMask");
    assert.equal(masks.length, 3);
    const edit = masks.find((m) => m.inputs.headroom === 0.2)!;
    assert.equal(edit.inputs.hold_frames, 3);
    assert.equal(edit.inputs.max_people, 2);
    assert.ok(masks.some((m) => m.inputs.headroom === 0 && m.inputs.hold_frames === 1), "the mannequin arm stays reference-fixed");
  });

  it("stages the mannequin video + the grown mask (combine, SaveImage, preview)", () => {
    const g = new GraphBuilder();
    def.compose({ ...base, mask_expand: 40 } as never, DUMMY, g, "r_stage");
    const combine = nodesOf(g).find((n) => n.class_type === "VHS_VideoCombine")!;
    assert.ok(combine, "the mannequin video leads");
    const grow = nodesOf(g).find((n) => n.class_type === "GrowMaskWithBlur")!;
    assert.equal(grow.inputs.expand, 40);
    assert.ok(nodesOf(g).some((n) => n.class_type === "SaveImage"), "the staged mask frames land in the run tree");
    assert.ok(nodesOf(g).some((n) => n.class_type === "PreviewImage"), "the mask is review-visible");
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
