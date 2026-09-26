// tool.spec.ts — the image-edit tool face pins (the image-gen pattern).
// The executor's gateway doors are the LIVE system's (smoke covers
// them); these pin the tool's OWN laws: the name, the presentation
// projection, and the completed-card intent.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { buildImageEditTool, TOOL_NAME } from "../src/tool.ts";

const REFUSING_CALL = async (): Promise<never> => { throw new Error("face tests never call the seam") }

const tool = buildImageEditTool(REFUSING_CALL);

describe("the image-edit tool face", () => {
  it("names itself on the tool plane (plain id, no _card suffix)", () => {
    assert.equal(TOOL_NAME, "image_edit");
    assert.equal(tool.name, "image_edit");
  });

  it("THE HIDDEN-ALIAS LAW (2026-09-26): the tool face serves ONE image-input concept — the anchor + the reference list, never the legacy aliases", () => {
    // the operator's rework: "reference images and input images are
    // the same thing" — image2/image3 are validation keys for old
    // drafts (hidden), and a hidden knob is UNSERVED on every
    // projection; before this they rode the tool params beside
    // Reference Images: one concept spelled twice.
    const props = (tool.parameters as { properties?: Record<string, unknown> }).properties ?? {};
    assert.ok("image1" in props, "the anchor serves");
    assert.ok("reference_images" in props, "the reference list serves");
    assert.ok(!("image2" in props), "the hidden alias never serves the tool face");
    assert.ok(!("image3" in props), "the hidden alias never serves the tool face");
    assert.ok(!("input_mask" in props), "the hidden mask-seat gate key never serves the tool face (the region arrives via the mask pack's row / the flow seat, never a second tool param)");
  });

  it("carries the identity prose (the ring's spelling)", () => {
    assert.ok(typeof tool.description === "string" && tool.description.length > 10);
  });

  it("presentationMeta projects the run arm, empty keys omitted", () => {
    const out = tool.output.presentationMeta?.(undefined, {
      flow: "image-edit", model: "qwen-img-edit-2511", run_id: "r1", draft_id: "d1", status: "queued",
    });
    assert.deepEqual(out, {
      flow: "image-edit", model: "qwen-img-edit-2511", run_id: "r1", draft_id: "d1", status: "queued",
    });
  });

  it("presentationMeta projects the refusal arm (error rides, no ids)", () => {
    const out = tool.output.presentationMeta?.(undefined, {
      flow: "image-edit", model: "qwen-img-edit-2511", error: "no_such_model",
    });
    assert.deepEqual(out, { flow: "image-edit", model: "qwen-img-edit-2511", error: "no_such_model" });
  });

  it("presentResult: meta-less result → undefined (the raw arm); run arm titles the label", () => {
    // (the defineTool wrapper validates args before the presenter runs —
    // invalid args → undefined, the same arm)
    const ARGS = {"prompt": "x"};
    assert.equal(tool.presentResult?.(ARGS, {} as never), undefined);
    const view = tool.presentResult?.(ARGS, {
      content: [], isError: false,
      meta: { flow: "image-edit", model: "qwen-img-edit-2511", run_id: "r9" },
    });
    assert.equal(view?.title, "Edit Image [qwen-img-edit-2511] → r9");
    assert.ok(view?.card === "generic", "the generic card view");
    assert.equal((view as { content?: unknown }).content, undefined, "content omitted — the raw result renders");
  });
});
