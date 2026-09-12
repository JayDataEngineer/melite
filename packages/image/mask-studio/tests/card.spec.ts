import { describe, it, beforeAll } from "vitest";
import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadCardDefs } from "@melite/comfyui-cordis";
import { GraphBuilder } from "@melite/comfyui-card-kit/graph";
import { loadFacts } from "@melite/comfyui-card-kit/facts";
import type { ModelFacts } from "@melite/comfyui-card-kit/facts";
import type { CardDefinition } from "@melite/comfyui-cordis/service";
import {
  getModel, registryIds, registryModel,
} from "../../../engines/comfyui-cordis/src/models/models.ts";

const FACTS_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  "..", "..", "..", "..",
  "packages", "engines", "comfyui-cordis", "data", "model-facts.json",
);
const facts = loadFacts(FACTS_PATH, { getModel, registryIds, registryModel });
const DUMMY: ModelFacts = { id: "x", card: "x", defaults: {}, lane_inputs: {}, card_knobs: [], variants: [], variant_groups: [], outputs: [] } as never;

let def: CardDefinition;
beforeAll(async () => {
  def = (await loadCardDefs()).get("mask-studio")!;
  assert.ok(def, "the composition root serves the mask-studio card");
});

describe("the mask-studio compose gate", () => {
  it("a missing input_image refuses (the lane selects FROM an image)", () => {
    assert.throws(
      () => def.compose(def.schema({}), DUMMY, new GraphBuilder(), "r1"),
      /required param 'input_image' missing on the mask-studio card/,
    );
    assert.throws(
      () => def.compose(def.schema({ input_image: " " }), DUMMY, new GraphBuilder(), "r1"),
      /required param 'input_image' missing on the mask-studio card/,
    );
  });

  it("the happy lane rides the studio pin stack", () => {
    const g = new GraphBuilder();
    def.compose(def.schema({ input_image: "/m/pic.png" }), DUMMY, g, "run_1");
    assert.ok(Object.keys(g.toJSON()).length > 0, "the mask lane builds its graph");
  });
});

// ── the agents bundle tools (the standalone carrier) — the lanes
// are DEAD by design (the gateway kill, 2026-09-10): every call
// refuses loud with the migration voice until they ride named
// Typert remotes. These pins hold the door shapes.
import { TOOLS, bindEstate, getFlowSpec, getRunStatus, submitMaskRun } from "../src/agents/tools.ts";

describe("the mask-studio agents tools (dead lanes, loud)", () => {
  // bind a stub ctx once: the unbound voice fires BEFORE the door
  // voices (module state — pin that order first).
  it("an UNBOUND estate refuses with the bind voice", async () => {
    await assert.rejects(getFlowSpec(), /no estate context bound \(bindEstate\)/);
    bindEstate({} as never);
  });

  it("the three-tool bundle is served", () => {
    assert.deepEqual(TOOLS.map((t) => t.name), ["get_flow_spec", "submit_mask_run", "get_run_status"]);
  });

  it("every lane names its door in the death voice", async () => {
    await assert.rejects(getFlowSpec(), /estate lane GET \/v1\/form-spec\?model=mask-studio died with the gateway/);
    await assert.rejects(getFlowSpec("other-route"), /model=other-route/);
    await assert.rejects(getRunStatus("r_9"), /estate lane GET \/v1\/flows\/status\/r_9 died/);
    // submit without a draft id MINTS first (the card-birth law) —
    // the death voice names the drafts door.
    await assert.rejects(
      submitMaskRun({ input_image: "/m/p.png" }),
      /estate lane POST \/v1\/flows\/drafts died/,
    );
  });

  it("a DECLARED draft id skips the mint (the card-birth short-circuit)", async () => {
    // draft_id present: no /v1/flows/drafts post — the start door's
    // death voice is the proof the mint never fired.
    await assert.rejects(
      submitMaskRun({ input_image: "/m/p.png", draft_id: "d_pre" }),
      /estate lane POST \/v1\/flows\/start died/,
    );
  });

  it("the submit body assembles every arm (full + minimal + forwarded)", async () => {
    // both directions of every assembly arm — observable only as the
    // death voice, but every line runs before it.
    await assert.rejects(
      submitMaskRun({
        route: "mask-studio-alt", prompt: "isolate the face",
        detect_mode: "face", detection_threshold: 0.5, sam_threshold: 0.9,
        sam_dilation: 4, export_face: true, export_hands: true,
        export_body: true, export_paint: true,
        outputs: [{ selection: "face" }], forwarded_knob: 7,
      }, new AbortController().signal),
      /estate lane POST \/v1\/flows\/drafts died/,
    );
    await assert.rejects(
      submitMaskRun({ draft_id: "d_x", extra_only: true } as never),
      /estate lane POST \/v1\/flows\/start died/,
    );
  });

  it("the bundle's own calls route the same doors", async () => {
    const byName = Object.fromEntries(TOOLS.map((t) => [t.name, t.call]));
    await assert.rejects(byName["get_flow_spec"]({}), /form-spec/);
    await assert.rejects(byName["get_run_status"]({ run_id: "z" }), /status\/z/);
    await assert.rejects(byName["submit_mask_run"]({ input_image: "x" }), /flows\/drafts/);
  });
});

describe("the dual-face law: the root is the row-mount marker", () => {
  it("apply registers NOTHING node-side (the card rides the CARD face; the studio rides the client face)", async () => {
    const { Context } = await import("@deepseek-ai/cordis");
    const marker = await import("../src/index.ts");
    const ctx = new Context();
    marker.apply(ctx);
    assert.equal(marker.name, "@melite/image-mask-studio");
    assert.deepEqual(marker.inject, []);
  });
});
