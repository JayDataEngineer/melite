// @melite/models-qwen-img-edit-2511 — THE 2511 LANE'S CROSS-LANE LAWS
// (the kit-arm retirement, 2026-09-30). The 2.1 family's wall carried
// two cases that are really about THIS lane, and the lane they pinned
// now belongs here: the never-lie guard (a stated width/height wires
// to nothing on this lane and refuses field-named) and the lanpaint
// region arm (a stated mask fires the sampler; the refusal stays
// lane-scoped, never global). The graph itself is pinned to committed
// goldens in action.spec.ts; the 2.1 lane's own laws live in
// packages/models/qwen-img-edit-21/tests/lane-laws.spec.ts.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { instantiateAction, orderedInputImages, refuseImageEditFiring } from "@melite/comfyui-card-kit";
import { GraphBuilder } from "@melite/comfyui-card-kit/graph";
import type { ModelFacts } from "@melite/comfyui-card-kit/facts";
import { edit } from "../src/actions.ts";
import { DECL } from "../src/index.ts";

const packs = (m: Array<string | { pack: string }>): string[] => m.map((x) => (typeof x === "string" ? x : x.pack));
const FACTS = {
  id: DECL.id,
  card: "image-edit",
  defaults: {},
  variants: [],
  variant_groups: [],
  outputs: [],
  mods: DECL.mods === undefined ? undefined : packs(DECL.mods),
  lane_inputs: (DECL as { lane_inputs: Record<string, unknown> }).lane_inputs,
} as unknown as ModelFacts;

const graphOf = (g: GraphBuilder): Record<string, { class_type: string; inputs: Record<string, unknown> }> =>
  g.toJSON() as never;

describe("the 2511 edit lane — the never-lie guard and the lanpaint arm", () => {
  // the lane's own solver spelling (the 2.1 wall's constant, restored at
  // the lane's new home so the case states a complete doc)
  const SOLVER2511 = { seed: 3, steps: 20, cfg: 2.5, sampler: "euler", scheduler: "simple" };
  it("THE NEVER-LIE GUARD: width/height stated on the 2511 lane refuses field-named (they wire to nothing there)", () => {
    const g = new GraphBuilder({});
    assert.throws(
      () => instantiateAction(edit,
        { prompt: "x", negative_prompt: "", image1: "in.png", width: 1024, height: 768, seed: 1, steps: 20, cfg: 2.5, sampler: "euler", scheduler: "simple" },
        FACTS, g, "probe-never-lie",
      ),
      (err: unknown): boolean =>
        err instanceof Error && err.message.includes("'width'/'height' fire on the image-edit card only on the Qwen Image 2.1 lane"),
    );
  });
  it("the same mask on the 2511 lane still fires the lanpaint arm (the refusal is lane-scoped, never global)", () => {
    const g = new GraphBuilder({});
    instantiateAction(edit,
      { prompt: "fix the badge", image1: "in.png", input_mask: "mask.png", ...SOLVER2511 },
      FACTS, g, "probe-mask-2511",
    );
    const nodes: Array<{ class_type: string }> = Object.values(graphOf(g));
    assert.ok(nodes.some((n) => n.class_type.startsWith("LanPaint")), "the 2511 lane builds the lanpaint sampler");
  });
// THE CANONICAL LIST'S OWN REFUSAL (the reader the card's firing gate
  // and both edit actions share): a stated input_images that is not a
  // list of paths is a malformed draft, not a legacy spelling — it
  // refuses instead of folding into the legacy keys.
  it("a malformed canonical input_images refuses (never a silent fold)", () => {
    const refuse = (input_images: unknown): void => {
      orderedInputImages({ image1: "in.png", input_images } as Record<string, unknown>);
    };
    assert.throws(() => refuse("not-a-list"), /'input_images' fires on the image-edit card/);
    assert.throws(() => refuse([42]), /'input_images' fires on the image-edit card/);
    assert.throws(() => refuse({ qvoice: 1 }), /'input_images' fires on the image-edit card/);
  });
// THE LANPAINT SPELL ARM (the kit-arm retirement, 2026-09-30 — the
  // case moved here with the lane): a stated mask spelled as a wired
  // tensor is already mask-shaped upstream, so the spell rides the mask
  // consumers and NO LoadImageMask is built; a path keeps the disk
  // handoff.
  it("THE SPELL ARM (lanpaint): a spelled region mask builds no loader", () => {
    const params = { prompt: "fix the badge", image1: "in.png", seed: 3, steps: 20, cfg: 2.5, sampler: "euler", scheduler: "simple" };
    const spelled = new GraphBuilder();
    instantiateAction(edit, { ...params, input_mask: "$mask.stage" }, FACTS, spelled, "probe-mask-spell");
    const spelledRow = spelled.toJSON() as Record<string, { class_type: string; inputs: Record<string, unknown> }>;
    assert.ok(!Object.values(spelledRow).some((n) => n.class_type === "LoadImageMask"),
      "a spelled mask is already a tensor — no loader builds");
    assert.ok(Object.values(spelledRow).some((n) => n.class_type.startsWith("LanPaint")),
      "the lanpaint arm still fires");

    const path = new GraphBuilder();
    instantiateAction(edit, { ...params, input_mask: "/m/mask.png" }, FACTS, path, "probe-mask-path");
    const pathRow = path.toJSON() as Record<string, { class_type: string; inputs: Record<string, unknown> }>;
    assert.ok(Object.values(pathRow).some((n) => n.class_type === "LoadImageMask"),
      "a path keeps the LoadImageMask disk handoff");
  });
// THE REGION DETAILER'S SPELL ARM (the shared regionSegs helper the
  // family reads): a crop_stitch region whose mask is a wired tensor
  // builds no loader — the spell rides GrowMask/MaskToSEGS verbatim,
  // while a path keeps the LoadImageMask handoff.
  it("THE SPELL ARM (crop_stitch): a spelled region mask builds no loader", () => {
    const params = {
      prompt: "retouch the badge", image1: "in.png", seed: 3, steps: 20, cfg: 2.5,
      sampler: "euler", scheduler: "simple", mask_mode: "crop_stitch",
    };
    const region = { x: 0, y: 0, width: 256, height: 256 };
    const spelled = new GraphBuilder();
    instantiateAction(edit, { ...params, region, input_mask: "$mask.stage" }, FACTS, spelled, "probe-region-spell");
    const row = spelled.toJSON() as Record<string, { class_type: string; inputs: Record<string, unknown> }>;
    assert.ok(!Object.values(row).some((n) => n.class_type === "LoadImageMask"),
      "a spelled region mask is already a tensor — no loader builds");
    assert.ok(Object.values(row).some((n) => n.class_type === "MaskToSEGS"),
      "the region detailer still fires on the wired mask");
  });
});
