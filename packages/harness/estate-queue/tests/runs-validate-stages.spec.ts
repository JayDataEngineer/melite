// runs-validate-stages.spec.ts — the stage/flow construction
// validators' every arm: strictBody's retired-knob voices,
// buildStageRow's field gates, wiresResolve's lattice laws,
// cardGate's model+registration+schema verdicts, kindsOk's
// kind-matching passes, and the validateEngines/flowFromBody
// composition.
import { describe, it, expect } from "vitest";
import {
  strictBody,
  buildStageRow,
  wiresResolve,
  cardGate,
  kindsOk,
  validateEngines,
  flowFromBody,
} from "../src/runsValidateStages.ts";
import { FlowError } from "../src/runsValidateShared.ts";
import type { StageRow } from "../src/runsValidateStages.ts";

const stage = (over: Record<string, unknown> = {}): Record<string, unknown> => ({
  id: "s1", engine: "comfyui", inputs: {}, outputs: { out: "image" }, expected: {},
  card: "", card_io: {}, skip_when: null, params: {}, description: "d", ...over,
});
const row = (i: number, st: Record<string, unknown>): StageRow => buildStageRow(i, st);

describe("strictBody (the retired-knob voices)", () => {
  it("a clean body passes", () => {
    expect(() => strictBody({ id: "f", stages: [] })).not.toThrow();
  });
  it("retired runner knobs refuse with the silent-drop voice", () => {
    try {
      strictBody({ partial_run: true });
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(FlowError);
      expect((e as Error).message).toMatch(/retired runner knob\(s\) \["partial_run"\]/);
    }
  });
  it("retired pipe-carry keys refuse with the stowaway voice", () => {
    expect(() => strictBody({ pipe: "x" })).toThrow(/retired pipe-carry key\(s\) \["pipe"\]/);
  });
});

describe("buildStageRow (the field gates)", () => {
  it("a clean stage builds with inputs/outputs/expected/card_io/skip/params", () => {
    const r = row(0, stage({
      inputs: { img: { stage: "s0", output: "out" }, key0: { initial: "seed" } },
      expected: { img: "image" },
      skip_when: { initial: "flag", when: "present" },
    }));
    expect(r.id).toBe("s1");
    expect(r.engine).toBe("comfyui");
    expect(r.inputs[0]?.name).toBe("img");
    expect(r.inputs[0]?.edge.kind).toBe("stage");
    expect(r.expected[0]).toEqual({ name: "img", kind: "image" });
    expect(r.skipWhen).toEqual({ initial: "flag", when: "present" });
    expect(r.inputs[1]?.edge).toEqual({ kind: "initial", key: "seed" });
  });
  it("unknown stage fields refuse with the extra=forbid voice (and non-objects with extras refuse on the keys walk)", () => {
    try {
      row(0, { ...stage(), mystery: 1 });
      expect.unreachable();
    } catch (e) {
      expect((e as Error).message).toMatch(/stage\[0\] "s1": body carries unknown field\(s\) \["mystery"\]/);
    }
    // the array stage now refuses as a TYPED FlowError (the leaked
    // TypeError was the old probe vehicle; the refusal voice is the same)
    expect(() => row(0, ["x"])).toThrow(/stage\[0\]: \["x"\] is not an object/);
  });
  it("a non-object stage refuses; mistyped maps refuse through the wrap voice", () => {
    expect(() => row(0, 7)).toThrow(/stage\[0\]: 7 is not an object/);
    for (const key of ["inputs", "outputs", "expected", "card_io"] as const) {
      const bad: Record<string, unknown> = stage();
      bad[key] = [1];
      try {
        row(0, bad);
        expect.unreachable();
      } catch (e) {
        expect((e as Error).message).toMatch(new RegExp("stage\\[0\\] refuses: .* " + key + " must be an object"));
      }
    }
  });
  it("empty id/engine refuse; illegal ids refuse; mistyped params refuse", () => {
    expect(() => row(0, stage({ id: "" }))).toThrow(/refuses: Stage id must be a non-empty string/);
    expect(() => row(0, stage({ engine: "" }))).toThrow(/refuses: Stage engine must be a non-empty string/);
    expect(() => row(0, stage({ id: "NOT LEGAL" }))).toThrow(/is not a legal identifier/);
    expect(() => row(0, stage({ params: "flat" }))).toThrow(/refuses: .* must be an object/);
  });
  it("an initial input with an empty key refuses (the FromInitial fence)", () => {
    expect(() => row(0, stage({ inputs: { img: { initial: "" } } })))
      .toThrow(/refuses: FromInitial key must be a non-empty string/);
  });
  it("missing id/engine keys ride the same refusals (String() coerce path)", () => {
    const noId: Record<string, unknown> = stage();
    delete noId["id"];
    expect(() => row(0, noId)).toThrow(/refuses: Stage id must be/);
    const noEngine: Record<string, unknown> = stage();
    delete noEngine["engine"];
    expect(() => row(0, noEngine)).toThrow(/refuses: Stage engine must be/);
  });
});

describe("wiresResolve (the lattice laws)", () => {
  const s = (id: string, wire: string | null): StageRow =>
    row(1, stage({ id, engine: "comfyui", inputs: wire === null ? {} : { img: { stage: wire.split(".")[0] as string, output: wire.split(".")[1] ?? "" } }, expected: wire === null ? {} : { img: "image" } }));
  it("a legal id with earlier-stage wires passes", () => {
    expect(() => wiresResolve("f1", [s("a", null), s("b", "a.out")])).not.toThrow();
  });
  it("an illegal flow id refuses", () => {
    expect(() => wiresResolve("NOT LEGAL", [])).toThrow(/flow id "NOT LEGAL" is not a legal identifier/);
  });
  it("duplicate stage ids refuse", () => {
    expect(() => wiresResolve("f1", [s("a", null), s("a", null)])).toThrow(/duplicate stage id "a"/);
  });
  it("a forward wire refuses with the EARLIER-stage voice (empty and populated known lists)", () => {
    try {
      wiresResolve("f1", [s("a", "b.out")]);
      expect.unreachable();
    } catch (e) {
      expect((e as Error).message).toMatch(/wires to "b.out" — not an EARLIER stage \(known earlier: none\)/);
    }
    try {
      wiresResolve("f1", [s("a", null), s("b", "c.out")]);
      expect.unreachable();
    } catch (e) {
      expect((e as Error).message).toMatch(/known earlier: \["a"\]/);
    }
  });
});

describe("cardGate (the model+registration+schema verdicts)", () => {
  const fakeCards = (over: Record<string, unknown> = {}) => ({
    defsSync: () => new Map(Object.entries({
      "pure-tool": { requiresModel: false, schema: (): void => undefined },
      "model-card": { schema: (): void => undefined },
      "refusing": { schema: (p: unknown): void => { if ((p as { boom?: boolean }).boom) throw new Error("bad knob"); } },
      ...over,
    })),
  });
  const cstage = (card: string, params: Record<string, unknown> = { model: "fam" }): StageRow =>
    row(0, stage({ id: "s1", card, params, outputs: { out: "image" } }));
  it("a model card with params.model passes the gate", () => {
    expect(() => cardGate("f1", cstage("model-card"), fakeCards() as never)).not.toThrow();
  });
  it("a missing registry throws LOUD; an unregistered card refuses with the registration voice", () => {
    expect(() => cardGate("f1", cstage("model-card"), null)).toThrow(/no CardRegistryService for cardGate/);
    expect(() => cardGate("f1", cstage("ghost-card"), fakeCards() as never))
      .toThrow(/"ghost-card" is not a registered card/);
  });
  it("a model card without params.model refuses with the model voice; a pure-tool card skips it", () => {
    expect(() => cardGate("f1", cstage("model-card", {}), fakeCards() as never))
      .toThrow(/requires params\.model/);
    expect(() => cardGate("f1", cstage("pure-tool", {}), fakeCards() as never)).not.toThrow();
  });
  it("a schema refusal maps through the flow voice", () => {
    expect(() => cardGate("f1", cstage("refusing", { model: "fam", boom: true }), fakeCards() as never))
      .toThrow(/schema refused body — bad knob/);
  });
});

describe("kindsOk (the kind-matching passes)", () => {
  const cards = {
    defsSync: () => new Map([["pure-tool", { requiresModel: false, schema: (): void => undefined }]]),
  };
  const kstage = (id: string, over: Record<string, unknown> = {}): StageRow =>
    row(0, stage({ id, ...over }));
  it("THE NAMING LAW's lattice half: a legacyAliases edge derives its kind — old graphs keep validating, no face offers the alias", () => {
    // the operator's catch (2026-10-09): the numbered image2/image3
    // spellings left the card's SEAT list (one concept, one visible
    // name) — a graph that still wires the old spelling must derive
    // its kind from legacyAliases, never refuse as "wired but
    // untyped".
    const namedCards = {
      defsSync: () => new Map([["edit-card", {
        requiresModel: false,
        schema: (): void => undefined,
        flowKinds: {
          inputs: { image1: "image", reference_images: "image_list" },
          outputs: { default: "image" },
          requiresModel: false,
          legacyAliases: { image2: "image", image3: "image" },
        },
      }]]),
    };
    const gen = kstage("gen", { outputs: { default: "image" } });
    const oldGraph = kstage("edit", {
      card: "edit-card",
      inputs: {
        image1: { stage: "gen", output: "default" },
        image2: { stage: "gen", output: "default" },
      },
      // NO expected for image2 — the derivation must supply it
      expected: { image1: "image" },
    });
    expect(() => kindsOk("f1", [gen, oldGraph], { comfyui: "image" }, namedCards as never)).not.toThrow();
    // a CONTRADICTED alias kind still refuses loud (the alias is a
    // kind source, not a silence)
    const liar = kstage("edit", {
      card: "edit-card",
      inputs: { image2: { stage: "gen", output: "default" } },
      expected: { image2: "text" },
    });
    expect(() => kindsOk("f1", [gen, liar], { comfyui: "image" }, namedCards as never))
      .toThrow(/input "image2".*contradicts card/);
  });
  it("THE LIST LAW (the naming law's lattice half): a _list seat accepts its singular producer — video feeds video_list, image feeds image_list — and the wrong singular still refuses loud", () => {
    // "fix it all" (2026-10-09): the picker's edge law finally
    // generalized, the lattice refused the exact wire it offered —
    // h3's ref_videos could never be fed by a video stage. The
    // receiving kind `X_list` accepts producer kind `X`.
    const namedCards = {
      defsSync: () => new Map([["film-card", {
        requiresModel: false,
        schema: (): void => undefined,
        flowKinds: {
          inputs: { image: "image", ref_images: "image_list", ref_videos: "video_list", ref_audios: "audio_list" },
          outputs: { default: "video" },
          requiresModel: false,
        },
      }]]),
    };
    const filmInputs = (over: Record<string, { stage: string; output: string }>): StageRow =>
      kstage("film", { card: "film-card", inputs: over });
    const img = kstage("img", { outputs: { default: "image" } });
    const vid = kstage("vid", { outputs: { default: "video" } });
    const aud = kstage("aud", { outputs: { default: "audio" } });
    // every list seat accepts its singular producer
    expect(() => kindsOk("f1", [img, vid, aud, filmInputs({
      ref_images: { stage: "img", output: "default" },
      ref_videos: { stage: "vid", output: "default" },
      ref_audios: { stage: "aud", output: "default" },
    })], { comfyui: "image" }, namedCards as never)).not.toThrow();
    // the WRONG singular refuses loud (an image is not a motion guide)
    expect(() => kindsOk("f1", [img, filmInputs({
      ref_videos: { stage: "img", output: "default" },
    })], { comfyui: "image" }, namedCards as never))
      .toThrow(/expected video_list, got image.*must be video_list/);
  });
  it("matched kinds pass; mismatched kinds refuse with the must-be voice", () => {
    const a = kstage("a", { outputs: { out: "image" } });
    const b = kstage("b", { inputs: { img: { stage: "a", output: "out" } }, expected: { img: "image" } });
    expect(() => kindsOk("f1", [a, b], { comfyui: "image" }, cards as never)).not.toThrow();
    const c = kstage("c", { inputs: { img: { stage: "a", output: "out" } }, expected: { img: "text" } });
    expect(() => kindsOk("f1", [a, c], { comfyui: "image" }, cards as never))
      .toThrow(/expected text, got image from stage "a" output "out" — must be text/);
  });
  it("inputs/expected mismatch refuses with both voices", () => {
    try {
      kindsOk("f1", [kstage("a", { inputs: { x: { initial: "seed" } }, expected: { z: "text" } })], {}, cards as never);
      expect.unreachable();
    } catch (e) {
      expect((e as Error).message).toMatch(/wired but untyped: \["x"\]/);
      expect((e as Error).message).toMatch(/typed but unwired: \["z"\]/);
    }
  });
  it("an upstream output miss refuses with the declared-outputs voice; forward refs defer (skipped)", () => {
    const a = kstage("a", { outputs: { out: "image" } });
    const b = kstage("b", { inputs: { img: { stage: "a", output: "nope" } }, expected: { img: "image" } });
    expect(() => kindsOk("f1", [a, b], {}, cards as never))
      .toThrow(/stage "a" has no output named "nope" \(declared outputs: \["out"\]\)/);
    // a forward stage edge defers: upstream unknown, never refused
    const fwd = kstage("z", { inputs: { img: { stage: "later", output: "out" } }, expected: { img: "image" } });
    expect(() => kindsOk("f1", [fwd], {}, cards as never)).not.toThrow();
  });
  it("an output-less, card-less stage with a known engine takes the engine default; an unknown engine defers at construction and refuses at the full pass", () => {
    const bare = kstage("a", { outputs: {} });
    expect(() => kindsOk("f1", [bare], { comfyui: "image" }, cards as never)).not.toThrow();
    expect(() => kindsOk("f1", [bare], {}, cards as never)).not.toThrow();
    const flow = { id: "f1", description: "", stages: [kstage("a", { engine: "nosuch" })] };
    expect(() => validateEngines(flow as never, null)).toThrow(/no engine plugin for type "nosuch"/);
  });
});

describe("validateEngines + flowFromBody (the composition)", () => {
  it("an mcp: engine with a legal id rides the grammar arm; a malformed mcp id refuses", () => {
    const flow = {
      id: "f1", description: "",
      stages: [row(0, stage({ id: "s1", engine: "mcp:blender", outputs: { out: "image" } }))],
    };
    expect(validateEngines(flow as never, null)).toBe(flow);
    const bad = {
      id: "f1", description: "",
      stages: [row(0, stage({ id: "s1", engine: "mcp:not legal!" }))],
    };
    expect(() => validateEngines(bad as never, null)).toThrow(/no engine plugin for type/);
  });
  it("flowFromBody refuses non-objects, unknown keys, missing id/stages, empty stages, empty id", () => {
    expect(() => flowFromBody("flat")).toThrow(/flow body must be a JSON object/);
    expect(() => flowFromBody({ id: "f", stages: [], mystery: 1 })).toThrow(/unknown keys \["mystery"\]/);
    expect(() => flowFromBody({ id: "f" })).toThrow(/needs at least id and stages/);
    expect(() => flowFromBody({ id: "f", stages: [] })).toThrow(/non-empty list/);
    expect(() => flowFromBody({ id: "", stages: [stage()] })).toThrow(/Flow id must be a non-empty string/);
  });
  it("a clean inline flow rides end to end", () => {
    const flow = flowFromBody({
      id: "f1", description: "x",
      stages: [
        stage({ id: "a", outputs: { out: "image" } }),
        stage({ id: "b", inputs: { img: { stage: "a", output: "out" } }, expected: { img: "image" }, outputs: { res: "image" } }),
      ],
    }, null);
    expect(flow.id).toBe("f1");
    expect(flow.stages.length).toBe(2);
  });
  it("null keys toll their defaults (id null, stages without description)", () => {
    expect(() => flowFromBody({ id: null, stages: [stage()] })).toThrow(/Flow id must be a non-empty string/);
    const noDesc = flowFromBody({ id: "f1", stages: [stage({ id: "a", outputs: { out: "image" } })] }, null);
    expect(noDesc.description).toBe("");
  });
});

describe("the toll arms (falsy maps, nullish scalars, initial-edge skips)", () => {
  const cards = {
    defsSync: () => new Map([
      ["pure-tool", { requiresModel: false, schema: (): void => undefined }],
      ["string-thrower", { requiresModel: false, schema: (): void => { throw "flat string refusal"; } }],
    ]),
  };
  const ks = (id: string, over: Record<string, unknown> = {}): StageRow =>
    row(0, stage({ id, ...over }));
  it("falsy inputs/outputs/expected/card_io/params maps ride {}", () => {
    const r = ks("a", { inputs: null, outputs: null, expected: null, card_io: null, params: null });
    expect(r.inputs).toEqual([]);
    expect(r.params).toEqual({});
  });
  it("a card_io entry projects; nullish id/engine/description toll their fallbacks", () => {
    const r = ks("a", { card_io: { thumb: "image" }, description: null });
    expect(r.cardIo).toEqual([{ name: "thumb", kind: "image" }]);
    expect(r.description).toBe("");
    // a card_io row rides kindsOk's resolved map (the upstream-known voice)
    const src = ks("src", { outputs: { out: "image" }, card_io: { thumb: "image" }, expected: {} });
    expect(() => kindsOk("f1", [src], {}, cards as never)).not.toThrow();
    // description key ABSENT tolls "" (the in-missing arm)
    const noDesc: Record<string, unknown> = stage({ card_io: { thumb: "image" } });
    delete noDesc["description"];
    expect(row(0, noDesc).description).toBe("");
    const withNulls: Record<string, unknown> = stage({ engine: null, description: null, outputs: { out: "image" } });
    withNulls["id"] = null;
    expect(() => row(0, withNulls)).toThrow(/refuses: Stage id must be a non-empty string/);
    const nullEngine: Record<string, unknown> = stage({ description: null, outputs: { out: "image" } });
    nullEngine["engine"] = null;
    expect(() => row(0, nullEngine)).toThrow(/refuses: Stage engine must be a non-empty string/);
  });
  it("an extras refusal without an id key names <no id>", () => {
    const noId: Record<string, unknown> = stage();
    delete noId["id"];
    (noId as Record<string, unknown>)["mystery"] = 1;
    try {
      row(0, noId);
      expect.unreachable();
    } catch (e) {
      expect((e as Error).message).toMatch(/"<no id>": body carries unknown field\(s\) \["mystery"\]/);
    }
  });
  it("one-sided mismatches name only their side", () => {
    // wired but untyped ALONE
    try {
      kindsOk("f1", [ks("a", { inputs: { x: { initial: "seed" } }, expected: {} })], {}, cards as never);
      expect.unreachable();
    } catch (e) {
      expect((e as Error).message).toMatch(/wired but untyped: \["x"\]/);
      expect((e as Error).message).not.toMatch(/typed but unwired/);
    }
    // typed but unwired ALONE
    try {
      kindsOk("f1", [ks("a", { expected: { z: "text" } })], {}, cards as never);
      expect.unreachable();
    } catch (e) {
      expect((e as Error).message).toMatch(/typed but unwired: \["z"\]/);
      expect((e as Error).message).not.toMatch(/wired but untyped/);
    }
  });
  it("initial edges skip both lattice passes; card stages gate inside kindsOk; non-Error schema throws map through String()", () => {
    const initRow = ks("a", { inputs: { seed: { initial: "7" } }, expected: { seed: "num" }, outputs: { out: "image" } });
    expect(() => wiresResolve("f1", [initRow])).not.toThrow();
    expect(() => kindsOk("f1", [initRow], {}, cards as never)).not.toThrow();
    const tool = ks("t", { card: "pure-tool", params: {} });
    expect(() => kindsOk("f1", [tool], {}, cards as never)).not.toThrow();
    const strThrow = ks("u", { card: "string-thrower", params: {} });
    expect(() => kindsOk("f1", [strThrow], {}, cards as never))
      .toThrow(/schema refused body — flat string refusal/);
  });
});
