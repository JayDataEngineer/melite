// flows-data.spec.ts — the flow registry: names/getter, from_flow
// expansion (happy + three LOUD dangles), the inline projection, the
// compile-time initials gate, and the skill-body render.
import { describe, it, afterEach } from "vitest";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  expandRegistryFlow,
  getRegistryFlow,
  registryFlowNames,
  registryFlowToInline,
  registryInitialsError,
  registrySkillBody,
} from "../src/flowsData.ts";
import type { RegistryFlow } from "../src/flowsData.ts";

let ROOT = "";
afterEach(() => {
  if (ROOT !== "") {
    rmSync(ROOT, { recursive: true, force: true });
    ROOT = "";
  }
});

const roots = (): { repoRoot: string; stateRoot: string } => {
  ROOT = mkdtempSync(join(tmpdir(), "flows-"));
  const state = mkdtempSync(join(tmpdir(), "flows-state-"));
  const olds = ROOT;
  ROOT = olds + ":" + state;
  return { repoRoot: olds, stateRoot: state };
};
const dropRoots = (): void => {
  for (const d of ROOT.split(":")) rmSync(d, { recursive: true, force: true });
  ROOT = "";
};

describe("registry", () => {
  it("names eleven flows; the getter answers unknowns with undefined", () => {
    const names = registryFlowNames();
    assert.equal(names.length, 11);
    assert.deepEqual([...names].sort(), names);
    assert.ok(getRegistryFlow("character") !== undefined);
    assert.equal(getRegistryFlow("ghost"), undefined);
  });

  it("expansion resolves from_flow links (single-hop) and copies rows", () => {
    const flow = getRegistryFlow("character")!;
    assert.equal(flow.stages.filter((s) => s.fromFlow !== null).length, 4);
    const expanded = expandRegistryFlow(flow);
    // copies ride the base (engine/card/outputs) under the link id.
    for (const st of expanded.stages) {
      assert.equal(st.fromFlow, null);
      assert.equal(st.engine, "comfyui");
    }
    const body = expanded.stages.find((s) => s.id === "body")!;
    assert.ok(Object.keys(body.inputs).length > 0);
  });

  it("dangling links throw LOUD (flow / stage / chained)", () => {
    const flesh = (stages: RegistryFlow["stages"]): RegistryFlow => ({
      id: "fake",
      description: "d",
      stages,
      initialValidators: {},
      tool: null,
      skillRefs: [],
    });
    const link = (flow: string, stage: string, id: string): RegistryFlow["stages"][number] => ({
      id,
      engine: "",
      card: "",
      description: "",
      inputs: {},
      expected: {},
      outputs: {},
      cardIo: {},
      params: {},
      skipWhen: null,
      fromFlow: { flow, stage },
    });
    assert.throws(
      () => expandRegistryFlow(flesh([link("ghost-flow", "s", "a")])),
      /links unknown flow ghost-flow/,
    );
    assert.throws(
      () => expandRegistryFlow(flesh([link("character", "ghost-stage", "a")])),
      /links unknown stage character\/ghost-stage/,
    );
    // character's coat is itself a link — linking it chains (refused).
    const coat = getRegistryFlow("character")!.stages.find((s) => s.fromFlow !== null)!;
    assert.throws(
      () =>
        expandRegistryFlow(
          flesh([link("character", coat.id, "a")]),
        ),
      /single-hop only/,
    );
  });
});

describe("registryFlowToInline", () => {
  it("projects edges, cards, card_io and skip_when", () => {
    const inline = registryFlowToInline(expandRegistryFlow(getRegistryFlow("character")!)) as {
      stages: Array<Record<string, unknown>>;
    };
    assert.ok(inline.stages.length > 0);
    const linked = inline.stages.find((s) => (s["id"] as string).includes("coat"));
    assert.ok(linked !== undefined && linked["engine"] === "comfyui");
    const skipped = inline.stages.filter((s) => "skip_when" in s);
    assert.equal(skipped.length, 2);
    assert.deepEqual(skipped[0]!["skip_when"], { initial: "starter_image", when: "present" });
    const tts = registryFlowToInline(getRegistryFlow("audio-native-tts")!) as {
      stages: Array<Record<string, unknown>>;
    };
    assert.deepEqual(tts.stages[0]!["card_io"], { wav: "audio" });
    assert.equal(tts.stages[0]!["card"], "tts");
    const annyInline = registryFlowToInline(getRegistryFlow("anny-hmr")!) as {
      stages: Array<Record<string, unknown>>;
    };
    assert.ok(!("card" in annyInline.stages[0]!));
    assert.ok(!("skip_when" in tts.stages[0]!));
  });
});

describe("registryInitialsError", () => {
  it("absent initials ride; photo files stage from every root", () => {
    const r = roots();
    try {
      const anny = getRegistryFlow("anny-hmr")!;
      assert.equal(registryInitialsError(anny, {}, r), null);
      assert.equal(registryInitialsError(anny, { photo: null }, r), null);
      // relative (repo-anchored) hit.
      writeFileSync(join(r.repoRoot, "pic.png"), "png");
      assert.equal(registryInitialsError(anny, { photo: "pic.png" }, r), null);
      // {path:} object hit.
      assert.equal(registryInitialsError(anny, { photo: { path: "pic.png" } }, r), null);
      // absolute hit.
      assert.equal(registryInitialsError(anny, { photo: join(r.repoRoot, "pic.png") }, r), null);
      // artifact-URL hit (state output root).
      mkdirSync(join(r.stateRoot, "output", "run1"), { recursive: true });
      writeFileSync(join(r.stateRoot, "output", "run1", "a.png"), "png");
      assert.equal(
        registryInitialsError(anny, { photo: "/v1/assets/runs/run1/a.png" }, r),
        null,
      );
    } finally {
      dropRoots();
    }
  });

  it("refusals name the fault (type / browser-local / ext / traversal / disk / URL)", () => {
    const r = roots();
    try {
      const anny = getRegistryFlow("anny-hmr")!;
      assert.match(registryInitialsError(anny, { photo: 42 }, r)!, /must be a file path string/);
      assert.match(
        registryInitialsError(anny, { photo: "data:image/png;base64,x" }, r)!,
        /browser-local/,
      );
      assert.match(
        registryInitialsError(anny, { photo: "blob:abc" }, r)!,
        /browser-local/,
      );
      assert.match(registryInitialsError(anny, { photo: "pic.txt" }, r)!, /not a stageable image/);
      assert.match(registryInitialsError(anny, { photo: "nodot" }, r)!, /got extension ""/);
      assert.match(
        registryInitialsError(anny, { photo: "../../pic.png" }, r)!,
        /refuses traversal/,
      );
      assert.match(registryInitialsError(anny, { photo: "missing.png" }, r)!, /not on disk/);
      assert.match(
        registryInitialsError(anny, { photo: "/v1/assets/runs/onlyrun.png" }, r)!,
        /malformed artifact URL/,
      );
      const fit = getRegistryFlow("fit-seat")!;
      assert.match(registryInitialsError(fit, { body: "b.txt" }, r)!, /not a stageable mesh/);
    } finally {
      dropRoots();
    }
  });

  it("bake_params rides the belt (valid passes, the rest refuse)", () => {
    const r = roots();
    try {
      const ap = getRegistryFlow("anny-params")!;
      const good = JSON.stringify({
        dialect: "authored",
        phenotype: [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5],
      });
      assert.equal(registryInitialsError(ap, { params_json: good }, r), null);
      assert.equal(
        registryInitialsError(ap, { params_json: JSON.parse(good) }, r),
        null,
      );
      assert.match(registryInitialsError(ap, { params_json: "nope" }, r)!, /refuses the preset dialect/);
      assert.match(
        registryInitialsError(ap, { params_json: (() => {}) as unknown as string }, r)!,
        /must be a params_json string or object/,
      );
    } finally {
      dropRoots();
    }
  });
});

describe("registrySkillBody dangling links", () => {
  it("renders unknown stages without kinds (resolveLink null arms)", () => {
    const plain = (
      id: string,
      description: string,
    ): RegistryFlow["stages"][number] => ({
      id,
      engine: "comfyui",
      card: "",
      description,
      inputs: {},
      expected: {},
      outputs: {},
      cardIo: {},
      params: {},
      skipWhen: null,
      fromFlow: null,
    });
    const fake: RegistryFlow = {
      id: "fake",
      description: "d",
      stages: [
        plain("z", ""),
        {
          ...plain("b", "bee"),
          inputs: {
            inp: { stage: "ghost-stage", output: "o" },
            vanishing: { stage: "z", output: "gone" },
          },
          fromFlow: { flow: "ghost-flow", stage: "x" },
        },
        {
          ...plain("c", "cee"),
          fromFlow: { flow: "character", stage: "ghost-stage" },
        },
      ],
      initialValidators: {},
      tool: null,
      skillRefs: [],
    };
    const text = registrySkillBody(fake);
    assert.ok(text.includes("- z (comfyui)\n"));
    assert.ok(text.includes("input inp: stage ghost-stage.o"));
    assert.ok(text.includes("input vanishing: stage z.gone"));
    assert.ok(text.includes("from ghost-flow/x"));
  });
});

describe("registrySkillBody", () => {
  it("renders heads, edges, outputs, card_io and skip_when", () => {
    const expandedText = registrySkillBody(expandRegistryFlow(getRegistryFlow("character")!));
    assert.ok(expandedText.startsWith("# flow character\n"));
    assert.ok(expandedText.includes("## stages"));
    assert.ok(expandedText.includes("- coat (comfyui):"));
    assert.ok(expandedText.includes("skip when initial 'starter_image' is present"));
    const text = registrySkillBody(getRegistryFlow("character")!);
    assert.ok(text.includes("from skin-apply/coat"));
    const tts = registrySkillBody(getRegistryFlow("audio-native-tts")!);
    assert.ok(tts.includes("card_io wav: audio"));
    assert.ok(tts.includes("initial 'prompt'"));
    const up = registrySkillBody(expandRegistryFlow(getRegistryFlow("image-upscale")!));
    assert.ok(up.includes("stage "));
  });
});
