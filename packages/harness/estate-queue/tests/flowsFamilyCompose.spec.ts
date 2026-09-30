// flowsFamilyCompose.spec.ts — the family-action stage interpreter
// (the atom vocabulary, stroke 4): the admission contract, the wire
// parity with the retired hand literals, and the derivation law.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { getRegistryFlow, expandRegistryFlow } from "../src/flowsData.ts";
import {
  composeFamilyStages,
  liveFamilyDecls,
} from "../src/flowsFamilyCompose.ts";
import { DECL as ANNY_DECL } from "../../../models/anny/src/index.ts";

const decls = [ANNY_DECL];

describe("the family-action stage interpreter (flowsFamilyCompose)", () => {
  it("a card-only flow passes through untouched", () => {
    const row = getRegistryFlow("audio-native-tts");
    assert.notEqual(row, undefined, "audio-native-tts is a registry flow");
    const expanded = expandRegistryFlow(row!);
    assert.equal(composeFamilyStages(expanded, decls), expanded);
  });

  it("the estimate action lands the retired literal's wire, node for node", () => {
    const row = getRegistryFlow("anny-hmr");
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
      "MultiHMR2ImageToAnny.0": {
        class_type: "MultiHMR2ImageToAnny",
        inputs: {
          image: ["LoadImage.0", 0],
          conf_thresh: 0.4,
          dist_thresh_nms: 0.25,
          lowres: false,
          save_anny_params: true,
          save_mesh: true,
          render: false,
          filename_prefix: "anny/multihmr2",
        },
      },
      "AnnySelectPerson.0": {
        class_type: "AnnySelectPerson",
        inputs: { mesh_paths: ["MultiHMR2ImageToAnny.0", 2], index: 0 },
      },
      "AnnyGroundBody.0": {
        class_type: "AnnyGroundBody",
        inputs: { glb_path: ["AnnySelectPerson.0", 0] },
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
    const row = expandRegistryFlow(getRegistryFlow("anny-hmr")!);
    const bad = {
      ...row,
      stages: [
        { ...row.stages[0], params: { photo: "$photo", out_dir: "./output" } },
      ],
    };
    assert.throws(
      () => composeFamilyStages(bad, decls),
      /unknown param\(s\) on the anny\.estimate action: out_dir/,
    );
  });

  it("an unknown family refuses naming the seat's register", () => {
    const row = expandRegistryFlow(getRegistryFlow("anny-hmr")!);
    const bad = {
      ...row,
      stages: [
        { ...row.stages[0], family: "ghost" },
      ],
    };
    assert.throws(
      () => composeFamilyStages(bad, decls),
      /flow 'anny-hmr' stage 'estimate' names family 'ghost' — no such family in the models seat \(registered: anny\)/,
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
      /\[models\] no ModelsService for flow 'anny-hmr' stage 'estimate' naming family 'ghost'/,
    );
    // a genuinely unregistered family on a seated table keeps the
    // registration voice, with the table's real contents
    assert.throws(
      () => composeFamilyStages(bad, [], "seated"),
      /no such family in the models seat \(registered: none\)/,
    );
  });

  it("an undeclared action refuses with the flow's voice naming the stage", () => {
    const row = expandRegistryFlow(getRegistryFlow("anny-hmr")!);
    const bad = {
      ...row,
      stages: [
        { ...row.stages[0], action: "morph" },
      ],
    };
    assert.throws(
      () => composeFamilyStages(bad, decls),
      /flow 'anny-hmr' stage 'estimate' names action 'morph' the family 'anny' does not declare \(family 'anny' declares no action 'morph'/,
    );
  });

  it("a lane-bound action refuses — only lane-independent verbs compose", () => {
    const row = expandRegistryFlow(getRegistryFlow("anny-hmr")!);
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
    const row = expandRegistryFlow(getRegistryFlow("anny-hmr")!);
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
    const row = expandRegistryFlow(getRegistryFlow("anny-hmr")!);
    const bad = {
      ...row,
      stages: [
        { ...row.stages[0], outputs: { body: "image" } },
      ],
    };
    assert.throws(
      () => composeFamilyStages(bad, decls),
      /hand-writes output 'body' as 'image' but the anny\.estimate action declares 'mesh'/,
    );
  });

  it("a hand-written output that AGREES with the declaration composes", () => {
    const row = expandRegistryFlow(getRegistryFlow("anny-hmr")!);
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

  it("liveFamilyDecls degrades to [] when no seat exists", () => {
    // (the singleton is unbooted in this spec's worker: no
    // boot-models import — the absent-seat law's proof)
    assert.equal(liveFamilyDecls(undefined).length, 0);
    assert.deepEqual(liveFamilyDecls({ allDecls: () => decls }), decls);
  });
});
