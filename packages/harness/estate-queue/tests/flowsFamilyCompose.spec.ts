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
import { getRegistryFlow, expandRegistryFlow, plainStage } from "../src/flowsData.ts";
import type { RegistryFlow } from "../src/flowsData.ts";
import { CARD_PLANE_ENGINE } from "@melite/contracts/benchStage";
import {
  composeFamilyStages,
  liveFamilyDecls,
  liveFamilySeat,
} from "../src/flowsFamilyCompose.ts";
import { DECL as ANNY_DECL } from "../../../models/anny/src/index.ts";
import { estimate_commercial } from "../../../models/anny/src/actions.ts";

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
    action: "estimate_commercial",
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
    const row = getRegistryFlow("audio-native-tts");
    assert.notEqual(row, undefined, "audio-native-tts is a registry flow");
    const expanded = expandRegistryFlow(row!);
    assert.equal(composeFamilyStages(expanded, decls), expanded);
  });

  it("the estimate action lands the retired literal's wire, node for node", () => {
    const row = ANNY_ESTIMATE_FLOW();
    assert.notEqual(row, undefined);
    const composed = composeFamilyStages(expandRegistryFlow(row!), decls);
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
      expandRegistryFlow(getRegistryFlow("anny-hmr-commercial")!),
      decls,
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
      expandRegistryFlow(getRegistryFlow("anny-params")!),
      decls,
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
    const row = expandRegistryFlow(ANNY_ESTIMATE_FLOW()!);
    const bad = {
      ...row,
      stages: [
        { ...row.stages[0], params: { photo: "$photo", out_dir: "./output" } },
      ],
    };
    assert.throws(
      () => composeFamilyStages(bad, decls),
      /unknown param\(s\) on the anny\.estimate_commercial action: out_dir/,
    );
  });

  it("an unknown family refuses naming the seat's register", () => {
    const row = expandRegistryFlow(ANNY_ESTIMATE_FLOW()!);
    const bad = {
      ...row,
      stages: [
        { ...row.stages[0], family: "ghost" },
      ],
    };
    assert.throws(
      () => composeFamilyStages(bad, decls),
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
    const row = expandRegistryFlow(ANNY_ESTIMATE_FLOW()!);
    const bad = {
      ...row,
      stages: [
        { ...row.stages[0], action: "morph" },
      ],
    };
    assert.throws(
      () => composeFamilyStages(bad, decls),
      /flow 'anny-estimate-probe' stage 'estimate' names action 'morph' the family 'anny' does not declare \(family 'anny' declares no action 'morph'/,
    );
  });

  it("a lane-bound action refuses — only lane-independent verbs compose", () => {
    const row = expandRegistryFlow(ANNY_ESTIMATE_FLOW()!);
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
      () => composeFamilyStages(bad, bound),
      /stage 'estimate' names action 'bound\.speak' — the action is lane-bound/,
    );
  });

  it("a stage naming both card and family refuses at admission", () => {
    const row = expandRegistryFlow(ANNY_ESTIMATE_FLOW()!);
    const bad = {
      ...row,
      stages: [
        { ...row.stages[0], card: "image-gen" },
      ],
    };
    assert.throws(
      () => composeFamilyStages(bad, decls),
      /stage 'estimate' names card 'image-gen' AND family 'anny' — a stage routes through one plane, never both/,
    );
  });

  it("a hand-written output that contradicts the declaration refuses", () => {
    const row = expandRegistryFlow(ANNY_ESTIMATE_FLOW()!);
    const bad = {
      ...row,
      stages: [
        { ...row.stages[0], outputs: { body: "image" } },
      ],
    };
    assert.throws(
      () => composeFamilyStages(bad, decls),
      /hand-writes output 'body' as 'image' but the anny\.estimate_commercial action declares 'mesh'/,
    );
  });

  it("a hand-written output that AGREES with the declaration composes", () => {
    const row = expandRegistryFlow(ANNY_ESTIMATE_FLOW()!);
    const agreeing = {
      ...row,
      stages: [
        { ...row.stages[0], outputs: { body: "mesh" } },
      ],
    };
    const composed = composeFamilyStages(agreeing, decls);
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
    const expanded = expandRegistryFlow(mixed)
    const composed = composeFamilyStages(expanded, decls)
    const ride = composed.stages[1]!
    assert.equal(ride.card, "image-gen", "the plain stage kept its card")
    assert.deepEqual(ride.params, { prompt: "as authored" }, "the plain stage's params rode untouched")
    assert.notEqual((composed.stages[0]!.params as Record<string, unknown>)["workflow"], undefined, "the family stage composed its envelope")
  });

  it("a family action that declares ZERO outputs composes without a producer row", () => {
    // the derivation law's empty half: outputs derive from the
    // declaration, so an action declaring none contributes a graph
    // with no first-output producer — the merge resolves nothing.
    const quiet = [{ ...ANNY_DECL, actions: [{ ...estimate_commercial, outputs: [] }] }] as typeof decls
    const probe = ANNY_ESTIMATE_FLOW()
    const composed = composeFamilyStages(expandRegistryFlow(probe), quiet)
    const wf = (composed.stages[0]!.params as { workflow: Record<string, unknown> }).workflow
    assert.ok(Object.keys(wf).length > 0, "the quiet action still built its graph")
  });

  it("a seat mounted with ZERO families reports the bare state, each condition its own voice", () => {
    assert.deepEqual(liveFamilySeat({ allDecls: () => [] }), { decls: [], state: "bare" });
    assert.deepEqual(liveFamilySeat({ allDecls: () => decls }), { decls, state: "seated" });
  });

  it("liveFamilyDecls degrades to [] when no seat exists", () => {
    // (the singleton is unbooted in this spec's worker: no
    // boot-models import — the absent-seat law's proof)
    assert.equal(liveFamilyDecls(undefined).length, 0);
    assert.deepEqual(liveFamilyDecls({ allDecls: () => decls }), decls);
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
    assert.deepEqual(liveFamilyDecls(), []);
    // the seated half of the same line, through the same door
    seat.decls = decls;
    assert.deepEqual(liveFamilySeat().state, "seated");
    // back to the unbooted singleton: absent keeps its own voice
    seat.decls = null;
    assert.deepEqual(liveFamilySeat().state, "absent");
  });
});
