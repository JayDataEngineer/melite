// flowsFamilyCompose.spec.ts — the family-action stage interpreter
// (the atom vocabulary, stroke 4): the admission contract, the wire
// parity with the retired hand literals, and the derivation law.
import { afterEach, describe, it, vi } from "vitest";
import assert from "node:assert/strict";

// THE FAMILIES SEAT AS THE BOOTED SINGLETON ANSWERS IT (the
// coverage queue's flowsFamilyCompose batch, 2026-10-16): this spec
// deliberately runs in a worker where no models boot ever happened,
// so liveFamilySeat's try arm only ever heard the singleton REFUSE.
// The seat's empty half needs an answering singleton with a table
// that holds nothing — a lane that mounted the bare catalog provider
// without the family rows. `null` delegates to the real singleton
// (absent, the spec's standing state); an array answers as that
// table.
const seat = vi.hoisted(() => ({ decls: null as readonly { readonly id: string }[] | null }));

vi.mock("@melite/comfyui-cordis", async (importOriginal) => {
  const real = await importOriginal<typeof import("@melite/comfyui-cordis")>();
  return {
    ...real,
    modelsService: () =>
      seat.decls === null ? real.modelsService() : { allDecls: () => seat.decls },
  };
});
import { expandRegistryFlow, plainStage, seedFlowsSeat } from "../src/flowsData.ts";
import type { RegistryFlow } from "../src/flowsData.ts";
import { CARD_PLANE_ENGINE } from "@melite/contracts/benchStage";
import {
  composeFamilyStages,
  liveFamilySeat,
} from "../src/flowsFamilyCompose.ts";
import { DECL as ANNY_DECL } from "../../../models/anny/src/index.ts";
import { bake, estimate_photo } from "../../../models/anny/src/actions.ts";
const SEED = seedFlowsSeat();

const decls = [ANNY_DECL];

const ANNY_ESTIMATE_FLOW = (): RegistryFlow => ({
  // the retired anny-hmr row's shape, re-pointed at the surviving
  // action (2026-10-04, operator: "keep the commercial route and get
  // rid of the non-commercial route" — the MultiHMR2 `estimate`
  // action was deleted, composed by nothing). This probe's value is
  // the INTERPRETER on a locally-declared row; the registry rows'
  // own wires are pinned separately below.
  id: "anny-estimate-probe",
  description: "d",
  stages: [plainStage({
    id: "estimate",
    engine: CARD_PLANE_ENGINE,
    family: "anny",
    action: "estimate_photo",
    description: "SAM 3D Body → grounded anny (the commercial estimator)",
    inputs: { photo: { initial: "photo" } },
    expected: { photo: "image" },
    params: { photo: "$photo" },
  })],
  initialValidators: { photo: "photo" },
  tool: null,
  skillRefs: [],
});

describe("the family-action stage interpreter (flowsFamilyCompose)", () => {
  it("a card-only flow passes through untouched", () => {
    const row = SEED.get("audio-native-tts");
    assert.notEqual(row, undefined, "audio-native-tts is a registry flow");
    const expanded = expandRegistryFlow(row!, SEED);
    assert.equal(composeFamilyStages(expanded, decls, "seated"), expanded);
  });

  it("the estimate action lands the retired literal's wire, node for node", () => {
    const row = ANNY_ESTIMATE_FLOW();
    assert.notEqual(row, undefined);
    const composed = composeFamilyStages(expandRegistryFlow(row!, SEED), decls, "seated");
    const st = composed.stages[0];
    const wf = st.params as {
      workflow: Record<string, { class_type: string; inputs: Record<string, unknown> }> };

    // THE WIRE PARITY: the composed envelope is the exact graph the
    // hand literal authored (classes, calibration, edges), with the
    // $-ref riding verbatim — the merged worker resolves it exactly
    // as it resolved the literal's.
    assert.deepEqual(wf.workflow, {
      "LoadImage.0": {
        class_type: "LoadImage",
        inputs: { image: "$photo" },
      },
      "Sam3dBodyImageToAnny.0": {
        class_type: "Sam3dBodyImageToAnny",
        inputs: { image: ["LoadImage.0", 0], person_index: 0 },
      },
    });
    // outputs DERIVE from the action's declaration (the row omits
    // them — one truth, the DECL's own spelling)
    assert.deepEqual(st.outputs, { body: "mesh" });
    // the family grammar never rides the composed stage
    assert.equal((composed.stages[0] as { family: string }).family, "");
  });

  it("the commercial and bake actions land their wires", () => {
    const comm = composeFamilyStages(
      expandRegistryFlow(SEED.get("anny-hmr-estimator")!, SEED),
      decls,
      "seated",
    );
    assert.deepEqual(
      (comm.stages[0].params as { workflow: unknown }).workflow,
      {
        "LoadImage.0": { class_type: "LoadImage", inputs: { image: "$photo" } },
        "Sam3dBodyImageToAnny.0": {
          class_type: "Sam3dBodyImageToAnny",
          inputs: { image: ["LoadImage.0", 0], person_index: 0 },
        },
      },
    );
    const bake = composeFamilyStages(
      expandRegistryFlow(SEED.get("anny-params")!, SEED),
      decls,
      "seated",
    );
    assert.deepEqual(
      (bake.stages[0].params as { workflow: unknown }).workflow,
      {
        "AnnyParamsToGlb.0": {
          class_type: "AnnyParamsToGlb",
          inputs: { params_json: "$params_json" },
        },
      },
    );
  });

  it("an unadmitted param refuses with the card plane's voice", () => {
    const row = expandRegistryFlow(ANNY_ESTIMATE_FLOW()!, SEED);
    const bad = {
      ...row,
      stages: [
        { ...row.stages[0], params: { photo: "$photo", out_dir: "./output" } },
      ],
    };
    assert.throws(
      () => composeFamilyStages(bad, decls, "seated"),
      /unknown param\(s\) on the anny\.estimate_photo action: out_dir/,
    );
  });

  it("an unknown family refuses naming the seat's register", () => {
    const row = expandRegistryFlow(ANNY_ESTIMATE_FLOW()!, SEED);
    const bad = {
      ...row,
      stages: [
        { ...row.stages[0], family: "ghost" },
      ],
    };
    assert.throws(
      () => composeFamilyStages(bad, decls, "seated"),
      /flow 'anny-estimate-probe' stage 'estimate' names family 'ghost' — no such family in the models seat \(registered: anny\)/,
    );
    // THE SEAT'S THREE CONDITIONS SPEAK FOR THEMSELVES: a bare mount
    // (owner mounted, table empty) and an absent seat are environment
    // facts with their own repairs; only a seated table missing the
    // family is a registration fact. All three used to answer "no
    // such family (registered: none)".
    assert.throws(
      () => composeFamilyStages(bad, [], "bare"),
      /the models seat is mounted with ZERO families/,
    );
    assert.throws(
      () => composeFamilyStages(bad, [], "absent"),
      /\[models\] no ModelsService for flow 'anny-estimate-probe' stage 'estimate' naming family 'ghost'/,
    );
    // a genuinely unregistered family on a seated table keeps the
    // registration voice, with the table's real contents
    assert.throws(
      () => composeFamilyStages(bad, [], "seated"),
      /no such family in the models seat \(registered: none\)/,
    );
  });

  it("an undeclared action refuses with the flow's voice naming the stage", () => {
    const row = expandRegistryFlow(ANNY_ESTIMATE_FLOW()!, SEED);
    const bad = {
      ...row,
      stages: [
        { ...row.stages[0], action: "morph" },
      ],
    };
    assert.throws(
      () => composeFamilyStages(bad, decls, "seated"),
      /flow 'anny-estimate-probe' stage 'estimate' names action 'morph' the family 'anny' does not declare \(family 'anny' declares no action 'morph'/,
    );
  });

  it("a lane-bound action refuses — only lane-independent verbs compose", () => {
    const row = expandRegistryFlow(ANNY_ESTIMATE_FLOW()!, SEED);
    const bound = [
      ANNY_DECL,
      {
        id: "bound",
        actions: [{
          id: "speak",
          outputs: [{ name: "audio", kind: "audio" }],
          params: [],
          facts: (raw: Record<string, unknown>) => raw,
          build: () => ({}),
        }],
      },
    ] as unknown as typeof decls;
    const bad = {
      ...row,
      stages: [
        {
          ...row.stages[0],
          family: "bound",
          action: "speak",
          card: "",
        },
      ],
    };
    assert.throws(
      () => composeFamilyStages(bad, bound, "seated"),
      /stage 'estimate' names action 'bound\.speak' — the action is lane-bound/,
    );
  });

  it("a stage naming both card and family refuses at admission", () => {
    const row = expandRegistryFlow(ANNY_ESTIMATE_FLOW()!, SEED);
    const bad = {
      ...row,
      stages: [
        { ...row.stages[0], card: "image-gen" },
      ],
    };
    assert.throws(
      () => composeFamilyStages(bad, decls, "seated"),
      /stage 'estimate' names card 'image-gen' AND family 'anny' — a stage routes through one plane, never both/,
    );
  });

  it("a hand-written output that contradicts the declaration refuses", () => {
    const row = expandRegistryFlow(ANNY_ESTIMATE_FLOW()!, SEED);
    const bad = {
      ...row,
      stages: [
        { ...row.stages[0], outputs: { body: "image" } },
      ],
    };
    assert.throws(
      () => composeFamilyStages(bad, decls, "seated"),
      /hand-writes output 'body' as 'image' but the anny\.estimate_photo action declares 'mesh'/,
    );
  });

  it("a hand-written output that AGREES with the declaration composes", () => {
    const row = expandRegistryFlow(ANNY_ESTIMATE_FLOW()!, SEED);
    const agreeing = {
      ...row,
      stages: [
        { ...row.stages[0], outputs: { body: "mesh" } },
      ],
    };
    const composed = composeFamilyStages(agreeing, decls, "seated");
    assert.deepEqual(
      (composed.stages[0] as { outputs: Record<string, string> }).outputs,
      { body: "mesh" },
    );
  });

  it("a MIXED flow passes its plain card stage through untouched while the family stage composes", () => {
    // the template cut's wake (d7ba0c77): the retired mixed FLOW
    // ROWS were the only ones that rode a plain stage NEXT TO a
    // family stage, so composeOne's passthrough arm lost its
    // exercise. A live flow with both keeps it honest: family
    // composes, card rides as-is.
    const mixed = { ...ANNY_ESTIMATE_FLOW(), stages: [
      ...ANNY_ESTIMATE_FLOW().stages,
      plainStage({
        id: "ride",
        engine: CARD_PLANE_ENGINE,
        card: "image-gen",
        description: "the plain rider",
        inputs: {},
        params: { prompt: "as authored" },
      }),
    ] }
    const expanded = expandRegistryFlow(mixed, SEED)
    const composed = composeFamilyStages(expanded, decls, "seated")
    const ride = composed.stages[1]!
    assert.equal(ride.card, "image-gen", "the plain stage kept its card")
    assert.deepEqual(ride.params, { prompt: "as authored" }, "the plain stage's params rode untouched")
    assert.notEqual((composed.stages[0]!.params as Record<string, unknown>)["workflow"], undefined, "the family stage composed its envelope")
  });

  it("a family action that declares ZERO outputs composes without a producer row", () => {
    // the derivation law's empty half: outputs derive from the
    // declaration, so an action declaring none contributes a graph
    // with no first-output producer — the merge resolves nothing.
    const quiet = [{ ...ANNY_DECL, actions: [{ ...estimate_photo, outputs: [] }] }] as typeof decls
    const probe = ANNY_ESTIMATE_FLOW()
    const composed = composeFamilyStages(expandRegistryFlow(probe, SEED), quiet, "seated")
    const wf = (composed.stages[0]!.params as { workflow: Record<string, unknown> }).workflow
    assert.ok(Object.keys(wf).length > 0, "the quiet action still built its graph")
  });

  it("a seat mounted with ZERO families reports the bare state, each condition its own voice", () => {
    assert.deepEqual(liveFamilySeat({ allDecls: () => [] }), { decls: [], state: "bare" });
    assert.deepEqual(liveFamilySeat({ allDecls: () => decls }), { decls, state: "seated" });
  });

});

// ── THE COVERAGE QUEUE'S flowsFamilyCompose BATCH (2026-10-16) ──
// liveFamilySeat's try arm reads the booted singleton directly; this
// worker never boots models, so every call through it used to answer
// absent. The empty-table half needs a singleton that DOES answer.
describe("the booted singleton's own two answers (coverage queue batch, 2026-10-16)", () => {
  afterEach(() => {
    seat.decls = null;
  });

  it("a mounted seat holding ZERO families reports bare (not absent)", () => {
    seat.decls = [];
    assert.deepEqual(liveFamilySeat(), { decls: [], state: "bare" });
    // the explicit-undefined spelling is the same read
    assert.deepEqual(liveFamilySeat(undefined), { decls: [], state: "bare" });
    assert.deepEqual(liveFamilySeat().decls, []);
    // the seated half of the same line, through the same door
    seat.decls = decls;
    assert.deepEqual(liveFamilySeat().state, "seated");
    // back to the unbooted singleton: absent keeps its own voice
    seat.decls = null;
    assert.deepEqual(liveFamilySeat().state, "absent");
  });
});

describe("the VRAM budget declaration stamp (the prevent-oom law, 2026-10-23)", () => {
  it("estimate_photo's declared vramBudgetMb rides the composed stage's params as the vram_budget_mb raw knob — the declaration owns, the row routes", () => {
    // The burn: the estimator subprocess needs ~12.9 GiB free; the
    // engine's own cache held 10.26 GiB — the run OOM'd mid-flight.
    // The action DECL declares the headroom; the composed envelope
    // must carry it on the same channel timeout_s reads.
    assert.equal(estimate_photo.vramBudgetMb, 13500, "the anny DECL declares the budget the burn proved");
    const composed = composeFamilyStages(expandRegistryFlow(ANNY_ESTIMATE_FLOW(), SEED), decls, "seated");
    const params = composed.stages[0]!.params as Record<string, unknown>;
    assert.equal(params["vram_budget_mb"], 13500, "the envelope stamps the declared budget");
    assert.notEqual(params["workflow"], undefined, "the graph still composes");
  });
  it("an action with NO declaration stamps NO knob — the envelope stays byte-identical (no key, no gate, no traffic)", () => {
    // bake is the same family, same estimator-class shape, but its
    // graph runs in-engine (AnnyParamsToGlb): no subprocess, no
    // budget declared, no key stamped.
    assert.equal(bake.vramBudgetMb, undefined);
    const flow: RegistryFlow = {
      id: "anny-bake-probe",
      description: "d",
      stages: [plainStage({
        id: "bake",
        engine: CARD_PLANE_ENGINE,
        family: "anny",
        action: "bake",
        description: "params json → GLB",
        inputs: { params_json: { initial: "params_json" } },
        expected: { params_json: "text" },
        params: { params_json: "$params_json" },
      })],
      initialValidators: { params_json: "text" },
      tool: null,
      skillRefs: [],
    };
    const composed = composeFamilyStages(expandRegistryFlow(flow, SEED), decls, "seated");
    const params = composed.stages[0]!.params as Record<string, unknown>;
    assert.equal("vram_budget_mb" in params, false, "no declaration, no knob");
  });
});
