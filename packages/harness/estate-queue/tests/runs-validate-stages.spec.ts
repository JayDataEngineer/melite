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
import type { FlowStageRow } from "../src/runsValidateStages.ts";

const stage = (over: Record<string, unknown> = {}): Record<string, unknown> => ({
  id: "s1", engine: "comfyui", inputs: {}, outputs: { out: "image" }, expected: {},
  card: "", card_io: {}, skip_when: null, params: {}, description: "d", ...over,
});
const row = (i: number, st: unknown): FlowStageRow => buildStageRow(i, st);

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
  it("unknown stage fields refuse with the extra=forbid voice (a non-object carries no keys to walk)", () => {
    try {
      row(0, { ...stage(), mystery: 1 });
      expect.unreachable();
    } catch (e) {
      expect((e as Error).message).toMatch(/stage\[0\] "s1": body carries unknown field\(s\) \["mystery"\]/);
    }
    // the array refuses at the OBJECT gate (a re-audit correction,
    // 2026-10-16): it never reaches the keys walk this arm used to
    // claim — a non-object has no keys to walk
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
  it("missing and present-but-null id/engine keys ride the same refusals (the absent arm and the ?? coerce arm)", () => {
    const noId: Record<string, unknown> = stage();
    delete noId["id"];
    expect(() => row(0, noId)).toThrow(/refuses: Stage id must be/);
    const noEngine: Record<string, unknown> = stage();
    delete noEngine["engine"];
    expect(() => row(0, noEngine)).toThrow(/refuses: Stage engine must be/);
    // PRESENT-but-null rides the `in rec` TRUE arm with the ?? ""
    // coerce (a re-audit correction, 2026-10-16: the deleted-key rows
    // above never touch the coerce — null does)
    expect(() => row(0, stage({ id: null }))).toThrow(/refuses: Stage id must be/);
    expect(() => row(0, stage({ engine: null }))).toThrow(/refuses: Stage engine must be/);
  });
});

describe("wiresResolve (the lattice laws)", () => {
  const s = (id: string, wire: string | null): FlowStageRow =>
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
  const cstage = (card: string, params: Record<string, unknown> = { model: "fam" }): FlowStageRow =>
    row(0, stage({ id: "s1", card, params, outputs: { out: "image" } }));
  it("a model card with params.model passes the gate", () => {
    expect(() => cardGate("f1", cstage("model-card"), fakeCards() as never)).not.toThrow();
  });
  it("a missing registry throws LOUD; an unregistered card refuses with the registration voice", () => {
    expect(() => cardGate("f1", cstage("model-card"), null)).toThrow(/no CardRegistryService for cardGate/);
    expect(() => cardGate("f1", cstage("ghost-card"), fakeCards() as never))
      .toThrow(/"ghost-card" is not a registered card/);
  });
  // THE REGISTRATION-FIRST LAW (F56 voice cure, 2026-11-14): an
  // unknown card with NO model used to hear "requires params.model"
  // — a param the ghost could never take; the operator's agent then
  // stated a model to satisfy the nonsense demand and landed in a
  // stranger's lane. The registration voice fires first for unknown
  // cards (live receipt: 'image-upscale' at the estate door).
  it("an unknown card with NO model hears the registration voice, never the model demand (F56)", () => {
    let msg = "";
    try {
      cardGate("f1", cstage("ghost-card", {}), fakeCards() as never);
      expect.unreachable();
    } catch (e) {
      msg = (e as Error).message;
    }
    expect(msg).toMatch(/"ghost-card" is not a registered card/);
    expect(msg).not.toMatch(/requires params\.model/);
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
  const kstage = (id: string, over: Record<string, unknown> = {}): FlowStageRow =>
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
    expect(() => kindsOk("f1", [gen, oldGraph], namedCards as never)).not.toThrow();
    // a CONTRADICTED alias kind still refuses loud (the alias is a
    // kind source, not a silence)
    const liar = kstage("edit", {
      card: "edit-card",
      inputs: { image2: { stage: "gen", output: "default" } },
      expected: { image2: "text" },
    });
    expect(() => kindsOk("f1", [gen, liar], namedCards as never))
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
    const filmInputs = (over: Record<string, { stage: string; output: string }>): FlowStageRow =>
      kstage("film", { card: "film-card", inputs: over });
    const img = kstage("img", { outputs: { default: "image" } });
    const vid = kstage("vid", { outputs: { default: "video" } });
    const aud = kstage("aud", { outputs: { default: "audio" } });
    // every list seat accepts its singular producer
    expect(() => kindsOk("f1", [img, vid, aud, filmInputs({
      ref_images: { stage: "img", output: "default" },
      ref_videos: { stage: "vid", output: "default" },
      ref_audios: { stage: "aud", output: "default" },
    })], namedCards as never)).not.toThrow();
    // the WRONG singular refuses loud (an image is not a motion guide)
    expect(() => kindsOk("f1", [img, filmInputs({
      ref_videos: { stage: "img", output: "default" },
    })], namedCards as never))
      .toThrow(/expected video_list, got image.*must be video_list/);
  });
  it("matched kinds pass; mismatched kinds refuse with the must-be voice", () => {
    const a = kstage("a", { outputs: { out: "image" } });
    const b = kstage("b", { inputs: { img: { stage: "a", output: "out" } }, expected: { img: "image" } });
    expect(() => kindsOk("f1", [a, b], cards as never)).not.toThrow();
    const c = kstage("c", { inputs: { img: { stage: "a", output: "out" } }, expected: { img: "text" } });
    expect(() => kindsOk("f1", [a, c], cards as never))
      .toThrow(/expected text, got image from stage "a" output "out" — must be text/);
  });
  it("inputs/expected mismatch refuses with both voices", () => {
    try {
      kindsOk("f1", [kstage("a", { inputs: { x: { initial: "seed" } }, expected: { z: "text" } })], cards as never);
      expect.unreachable();
    } catch (e) {
      expect((e as Error).message).toMatch(/wired but untyped: \["x"\]/);
      expect((e as Error).message).toMatch(/typed but unwired: \["z"\]/);
    }
  });
  it("an upstream output miss refuses with the declared-outputs voice; forward refs defer (skipped)", () => {
    const a = kstage("a", { outputs: { out: "image" } });
    const b = kstage("b", { inputs: { img: { stage: "a", output: "nope" } }, expected: { img: "image" } });
    expect(() => kindsOk("f1", [a, b], cards as never))
      .toThrow(/stage "a" has no output named "nope" \(declared outputs: \["out"\]\)/);
    // a forward stage edge defers: upstream unknown, never refused
    const fwd = kstage("z", { inputs: { img: { stage: "later", output: "out" } }, expected: { img: "image" } });
    expect(() => kindsOk("f1", [fwd], cards as never)).not.toThrow();
  });
  it("an output-less, card-less stage refuses at construction (no engine table to fill from); an unknown engine refuses at the full pass", () => {
    const bare = kstage("a", { outputs: {} });
    expect(() => kindsOk("f1", [bare], cards as never))
      .toThrow(/stage "a" declares no outputs and names no card/);
    const flow = { id: "f1", description: "", stages: [kstage("a", { engine: "nosuch" })] };
    expect(() => validateEngines(flow as never, null)).toThrow(/no engine plugin for type "nosuch"/);
  });
  it("THE CARD'S OWN TABLE (the one-table cure): a card stage with no declared outputs derives them from the card's declared output kinds", () => {
    // the music card's wrapper-row shape (music-native, retired
    // 2026-11-14): the row declares nothing, the card
    // declares {default: "audio"} — the lattice judges the card's
    // kinds, never a fabricated engine kind. Downstream wires to
    // the derived channel resolve; wires to a channel the card
    // never declares refuse against the DERIVED set.
    const deriving = {
      defsSync: () => new Map([["music-card", {
        requiresModel: false,
        schema: (): void => undefined,
        flowKinds: { inputs: {}, outputs: { default: "audio" }, requiresModel: false },
      }]]),
    };
    const silent = kstage("s", { card: "music-card", params: {}, outputs: {}, card_io: {} });
    const down = kstage("d", {
      inputs: { track: { stage: "s", output: "default" } },
      expected: { track: "audio" },
      outputs: { out: "audio" },
    });
    expect(() => kindsOk("f1", [silent, down], deriving as never)).not.toThrow();
    const liar = kstage("d", {
      inputs: { track: { stage: "s", output: "nope" } },
      expected: { track: "audio" },
      outputs: { out: "audio" },
    });
    expect(() => kindsOk("f1", [silent, liar], deriving as never))
      .toThrow(/stage "s" has no output named "nope" \(declared outputs: \["default"\]\)/);
  });
  // NOTE (the initial-grammar law, 2026-11-14): kindsOk holds NO
  // arm for the initial-bound $spell on a tensor seat — the seat a
  // spell lands in (Load* file slot vs tensor slot) is only visible
  // in the COMPOSED graph, so the law lives solely at the compose
  // door (runsRegistry composeCardStageRow, post-phase2 census
  // gate) with its wall at flows-producer-agreement ARM 6. A
  // media-kind judgment here false-fired on live rows (rig's
  // mesh_glb "mesh" port legally takes an initial $glb — a LoadGLB
  // path seat).
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
  const ks = (id: string, over: Record<string, unknown> = {}): FlowStageRow =>
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
    expect(() => kindsOk("f1", [src], cards as never)).not.toThrow();
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
      kindsOk("f1", [ks("a", { inputs: { x: { initial: "seed" } }, expected: {} })], cards as never);
      expect.unreachable();
    } catch (e) {
      expect((e as Error).message).toMatch(/wired but untyped: \["x"\]/);
      expect((e as Error).message).not.toMatch(/typed but unwired/);
    }
    // typed but unwired ALONE
    try {
      kindsOk("f1", [ks("a", { expected: { z: "text" } })], cards as never);
      expect.unreachable();
    } catch (e) {
      expect((e as Error).message).toMatch(/typed but unwired: \["z"\]/);
      expect((e as Error).message).not.toMatch(/wired but untyped/);
    }
  });
  it("initial edges skip both lattice passes; card stages gate inside kindsOk; non-Error schema throws map through String()", () => {
    const initRow = ks("a", { inputs: { seed: { initial: "7" } }, expected: { seed: "num" }, outputs: { out: "image" } });
    expect(() => wiresResolve("f1", [initRow])).not.toThrow();
    expect(() => kindsOk("f1", [initRow], cards as never)).not.toThrow();
    const tool = ks("t", { card: "pure-tool", params: {} });
    expect(() => kindsOk("f1", [tool], cards as never)).not.toThrow();
    const strThrow = ks("u", { card: "string-thrower", params: {} });
    expect(() => kindsOk("f1", [strThrow], cards as never))
      .toThrow(/schema refused body — flat string refusal/);
  });
});


// ── THE TEACHING VOICE (session 90a0b920's worst loop, 2026-10-21:
// the identical refusal three times taught nothing; the agent
// guessed kinds and abandoned wiring) ─────────────────────────────
describe("the untyped-wire refusal teaches the whole cure", () => {
  const noPortCards = { defsSync: (): Map<string, unknown> => new Map() }
  const ks = (id: string, over: Record<string, unknown> = {}): FlowStageRow =>
    row(0, stage({ id, ...over }))
  it("the voice names the Kind vocabulary, the expected {} fix, and the card-schema route", () => {
    try {
      kindsOk("f1", [ks("a", { inputs: { x: { initial: "seed" } }, expected: {} })], noPortCards as never);
      expect.unreachable();
    } catch (e) {
      const message = (e as Error).message;
      expect(message).toMatch(/wired but untyped: \["x"\]/);
      expect(message).toContain('expected {"x": "image"}');
      expect(message).toContain('"text"');
      expect(message).toContain('"mesh"');
      expect(message).toContain('"lora"');
    }
  });
});

// ── THE DEFERRED CARD STAGE (the F46 compose-plane cure's tail,
// 2026-11-14: the card-ports fill + the card's-own-table derivation
// added branches no arm drove — a card stage with no row channels,
// on a card declaring no ports, must DEFER through both tables, and
// the live seat's empty engine list must refuse naming itself) ────
describe("the deferred card stage (the fill's empty fallback + the own-table derivation)", () => {
  const ks = (id: string, over: Record<string, unknown> = {}): FlowStageRow =>
    row(0, stage({ id, ...over }));
  it("a card stage declaring nothing, on a card declaring nothing, defers — the fill's ?? {} fallback rides and downstream skips it as upstream-unknown", () => {
    // bare-card carries NO flowKinds at all: def?.flowKinds?.outputs
    // is undefined, so the fill's `?? {}` fallback rides (no push)
    // and the derivation's chain + fallback ride the same way below.
    const portless = {
      defsSync: () => new Map([["bare-card", {
        requiresModel: false,
        schema: (): void => undefined,
      }]]),
    };
    const silent = ks("s", { card: "bare-card", params: {}, outputs: {}, card_io: {} });
    expect(() => kindsOk("f1", [silent], portless as never)).not.toThrow();
    // a downstream wire to the deferred stage skips (no entry in the
    // outputs table — upstream-unknown), never refuses against the
    // empty table
    const down = ks("d", {
      inputs: { img: { stage: "s", output: "default" } },
      expected: { img: "image" },
      outputs: { out: "image" },
    });
    expect(() => kindsOk("f1", [silent, down], portless as never)).not.toThrow();
  });
  it("a non-string declared kind is skipped by BOTH tables — the registry seam's unknown value invents no channel", () => {
    // loose-card's declared outputs carry an unknown (non-string)
    // value: the fill's typeof guard skips it (no cardIo push) and
    // the own-table derivation skips it too — the row still defers,
    // and no phantom channel enters the resolved table.
    const loose = {
      defsSync: () => new Map([["loose-card", {
        requiresModel: false,
        schema: (): void => undefined,
        flowKinds: { inputs: {}, outputs: { weird: 42 }, requiresModel: false },
      }]]),
    };
    const silent = ks("s", { card: "loose-card", params: {}, outputs: {}, card_io: {} });
    expect(() => kindsOk("f1", [silent], loose as never)).not.toThrow();
  });
  it("the live seat's empty engine list refuses naming itself (the none-registered voice)", () => {
    const flow = {
      id: "f1", description: "",
      stages: [ks("s1", { outputs: { out: "image" } })],
    };
    try {
      validateEngines(flow as never, null, []);
      expect.unreachable();
    } catch (e) {
      expect((e as Error).message).toMatch(/serves registered engines only \(none registered\)/);
    }
  });
});
