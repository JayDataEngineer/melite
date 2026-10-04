// laneRelations.spec.ts — the variant rail's shared judges, pinned at
// their one home. The door (estate-queue cardsVariant) and the client
// mirror (card-base composeValidate) both compose these voices; every
// branch here is a voice the two seats must never spell apart.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import {
  judgeLaneRelations,
  judgeLaneSurface,
  judgeSamplerEnvelope,
  laneBlank,
  samplerEnvelopeCure,
  unknownQuantVoice,
  unknownVariantVoice,
  type LaneRelations,
  type SamplerEnvelope,
} from "../src/laneRelations.ts";

describe("unknownVariantVoice (the one spelling)", () => {
  it("quotes the stated variant, the model, and the offered ids", () => {
    assert.equal(
      unknownVariantVoice("krea-2", "z-image", ["raw", "turbo"]),
      'unknown variant "krea-2" for model "z-image" (known: raw, turbo)',
    );
  });
});

describe("unknownQuantVoice (the one spelling)", () => {
  it("names the variant whose cells were searched", () => {
    assert.equal(
      unknownQuantVoice("raw__int8", "z-image", "turbo", ["fp16", "q4"]),
      'unknown quant "raw__int8" for model "z-image" variant "turbo" (known: fp16, q4)',
    );
  });

  it("an empty cell list says so — the (known:) tail never lies", () => {
    assert.equal(
      unknownQuantVoice("fp16", "z-image", "turbo", []),
      'unknown quant "fp16" for model "z-image" variant "turbo" (the variant declares no cells)',
    );
  });
});

describe("samplerEnvelopeCure (the one cure)", () => {
  it("spells the sentence both seats append after the judge's voice", () => {
    assert.equal(
      samplerEnvelopeCure(),
      "The variant rail owns its sampler marriage: state values inside the envelope, or pick a different route.",
    );
  });
});

describe("judgeSamplerEnvelope (the route envelope gate)", () => {
  const env: SamplerEnvelope = { steps: [1, 8], cfg: [1, 2] };
  const turbo = { id: "turbo", route: "krea-2" } as const;

  it("a stated value inside the closed interval is caller agency", () => {
    assert.equal(judgeSamplerEnvelope({ steps: 4, cfg: 1.5 }, env, turbo), null);
  });

  it("the bounds themselves sit inside (closed interval)", () => {
    assert.equal(judgeSamplerEnvelope({ steps: 1, cfg: 2 }, env, turbo), null);
  });

  it("a stated cfg outside refuses with the full voice, route included", () => {
    assert.deepEqual(judgeSamplerEnvelope({ cfg: 3.5 }, env, turbo), {
      knob: "cfg",
      stated: 3.5,
      lo: 1,
      hi: 2,
      voice:
        'stated cfg 3.5 is OUTSIDE the route envelope for variant "turbo" (route krea-2) — the declared envelope is [1, 2]',
    });
  });

  it("steps is judged first when both knobs offend", () => {
    const off = judgeSamplerEnvelope({ steps: 30, cfg: 9 }, env, turbo);
    assert.equal(off?.knob, "steps");
  });

  it("a routeless variant drops the route parenthetical", () => {
    const off = judgeSamplerEnvelope(
      { cfg: 9 },
      env,
      { id: "base" },
    );
    assert.equal(
      off?.voice,
      'stated cfg 9 is OUTSIDE the route envelope for variant "base" — the declared envelope is [1, 2]',
    );
  });

  it("the skips ride verbatim: null envelope, absent bound, non-numeric, non-finite", () => {
    assert.equal(judgeSamplerEnvelope({ cfg: 9 }, null, turbo), null);
    assert.equal(
      judgeSamplerEnvelope({ cfg: 9 }, { steps: [1, 8] }, turbo),
      null,
    );
    assert.equal(
      judgeSamplerEnvelope({ cfg: "later", steps: "soon" }, env, turbo),
      null,
    );
    assert.equal(
      judgeSamplerEnvelope({ cfg: Number.POSITIVE_INFINITY }, env, turbo),
      null,
    );
  });
});

// THE SIX RELATION WORDS + THE SURFACE — the judge's own walls. Every
// valid arm is CONSTRUCTED (mutation-proof: a word whose title names a
// voice must fire that voice in the test body), and the malformed
// table pins the law the file declares: A MALFORMED ROW JUDGES
// NOTHING — the judge refuses, never throws, on a declaration that
// lost a member in transit.
describe("judgeLaneRelations (the six relation words)", () => {
  it("requires fires on the stated field with a blank need — both cure arms spelled", () => {
    const plain = judgeLaneRelations(
      [{ requires: [{ field: "design_prompt", needs: ["voice_name"] }] }],
      { design_prompt: "a film voice" },
    );
    assert.equal(plain.length, 1);
    assert.equal(plain[0]?.field, "design_prompt");
    assert.equal(
      plain[0]?.message,
      "field 'design_prompt' requires 'voice_name' on this lane — state 'voice_name' too, or drop 'design_prompt'",
    );
    const cured = judgeLaneRelations(
      [{ requires: [{ field: "design_prompt", needs: ["voice_name"], cure: "pick a voice first" }] }],
      { design_prompt: "a film voice" },
    );
    assert.equal(
      cured[0]?.message,
      "field 'design_prompt' requires 'voice_name' on this lane — pick a voice first",
    );
  });

  it("requires stays inert when the field is blank or every need is stated", () => {
    assert.deepEqual(
      judgeLaneRelations(
        [{ requires: [{ field: "design_prompt", needs: ["voice_name"] }] }],
        { voice_name: "v" },
      ),
      [],
    );
    assert.deepEqual(
      judgeLaneRelations(
        [{ requires: [{ field: "design_prompt", needs: ["voice_name"] }] }],
        { design_prompt: "x", voice_name: "v" },
      ),
      [],
    );
    // a stated field with NO needs key (needs ?? [] — nothing to
    // miss; the row type requires needs, so the arm rides a cast,
    // the same transit-loss law the malformed table below pins)
    assert.deepEqual(
      judgeLaneRelations(
        [{ requires: [{ field: "cfg" } as unknown as { field: string; needs: readonly string[] }] }],
        { cfg: 3 },
      ),
      [],
    );
  });

  it("conflicts refuses both stated fields together and stays inert on one", () => {
    const both = judgeLaneRelations(
      [{ conflicts: [{ a: "style_instruction", b: "ref_audio" }] }],
      { style_instruction: "neo", ref_audio: "a.wav" },
    );
    assert.equal(both.length, 1);
    assert.equal(both[0]?.field, "style_instruction");
    assert.equal(
      both[0]?.message,
      "fields 'style_instruction' + 'ref_audio' conflict on this lane — drop one of them",
    );
    assert.deepEqual(
      judgeLaneRelations(
        [{ conflicts: [{ a: "style_instruction", b: "ref_audio" }] }],
        { style_instruction: "neo" },
      ),
      [],
    );
  });

  it("together rides all-or-nothing: one stated member demands the pair", () => {
    const half = judgeLaneRelations(
      [{ together: [{ fields: ["voice_name", "design_prompt"] }] }],
      { voice_name: "v" },
    );
    assert.equal(half.length, 1);
    assert.equal(half[0]?.field, "voice_name");
    assert.equal(
      half[0]?.message,
      "fields 'voice_name' + 'design_prompt' ride together on this lane (state all or none) — state 'voice_name' + 'design_prompt' together, or drop 'voice_name' + 'design_prompt'",
    );
    assert.deepEqual(
      judgeLaneRelations(
        [{ together: [{ fields: ["voice_name", "design_prompt"] }] }],
        { voice_name: "v", design_prompt: "d" },
      ),
      [],
    );
    // a fully blank state is authoring-in-progress, never a refusal
    assert.deepEqual(
      judgeLaneRelations(
        [{ together: [{ fields: ["voice_name", "design_prompt"] }] }],
        {},
      ),
      [],
    );
  });

  it("either_or refuses a half-stated group and admits a complete one — the clone lane", () => {
    const row = { groups: [["ref_audio", "ref_text"], ["qvoice"]] };
    const half = judgeLaneRelations([{ either_or: [row] }], { ref_audio: "a.wav" });
    assert.equal(half.length, 1);
    assert.equal(half[0]?.field, "ref_audio");
    assert.equal(
      half[0]?.message,
      "this lane takes one of ('ref_audio' + 'ref_text') or ('qvoice') — the stated combination completes none of them — state one complete source, or drop the stated half",
    );
    assert.deepEqual(
      judgeLaneRelations([{ either_or: [row] }], { ref_audio: "a.wav", ref_text: "hi" }),
      [],
    );
    assert.deepEqual(judgeLaneRelations([{ either_or: [row] }], { qvoice: "x.qvoice" }), []);
    assert.deepEqual(judgeLaneRelations([{ either_or: [row] }], {}), []);
  });

  it("at_most_one refuses the second slot value and names the count it carries", () => {
    const two = judgeLaneRelations(
      [{ at_most_one: [{ fields: ["v1", "v2", "v3"] }] }],
      { v1: 1, v2: 2 },
    );
    assert.equal(two.length, 1);
    assert.equal(two[0]?.field, "v2");
    assert.equal(
      two[0]?.message,
      "this lane takes at most one of 'v1' + 'v2' + 'v3' — the state carries 2 ('v1' + 'v2') — one slot, one value",
    );
    assert.deepEqual(
      judgeLaneRelations([{ at_most_one: [{ fields: ["v1", "v2", "v3"] }] }], { v3: 3 }),
      [],
    );
  });

  it("required demands the whole list; any_of demands one of it", () => {
    const plain = judgeLaneRelations(
      [{ required: [{ fields: ["ref_audio", "ref_text"] }] }],
      { ref_audio: "a.wav" },
    );
    assert.equal(plain.length, 1);
    assert.equal(plain[0]?.field, "ref_text");
    assert.equal(
      plain[0]?.message,
      "this lane requires 'ref_audio' + 'ref_text' — 'ref_text' is not stated — state it, or use a lane that does not need it",
    );
    const any = judgeLaneRelations(
      [{ required: [{ fields: ["voice_name", "design_prompt"], any_of: true }] }],
      {},
    );
    assert.equal(any.length, 1);
    assert.equal(any[0]?.field, "voice_name");
    assert.equal(
      any[0]?.message,
      "this lane requires one of 'voice_name' + 'design_prompt' — none is stated — state one of them",
    );
    // any member satisfies the one-of
    assert.deepEqual(
      judgeLaneRelations(
        [{ required: [{ fields: ["voice_name", "design_prompt"], any_of: true }] }],
        { design_prompt: "d" },
      ),
      [],
    );
    // the whole list satisfied
    assert.deepEqual(
      judgeLaneRelations(
        [{ required: [{ fields: ["ref_audio", "ref_text"] }] }],
        { ref_audio: "a.wav", ref_text: "hi" },
      ),
      [],
    );
  });

  it("A MALFORMED ROW JUDGES NOTHING: every guard row is skipped and the valid row still fires", () => {
    const malformed: LaneRelations[] = [
      // the rel entry itself lost its shape in transit
      null as unknown as LaneRelations,
      "nope" as unknown as LaneRelations,
      {
        requires: [42, null, {}, { field: "cfg" }] as unknown as LaneRelations["requires"],
        conflicts: [42, {}, { a: "x" }] as unknown as LaneRelations["conflicts"],
        together: [42, {}, { fields: "nope" }, { fields: [] }] as unknown as LaneRelations["together"],
        either_or: [42, {}, { groups: "x" }, { groups: [] }, { groups: [42, "y"] }] as unknown as LaneRelations["either_or"],
        at_most_one: [42, {}, { fields: ["a"] }, { fields: [42, "a"] }] as unknown as LaneRelations["at_most_one"],
        required: [42, {}, { fields: [] }, { fields: [], any_of: true }] as unknown as LaneRelations["required"],
        // the ONE valid row: must survive its malformed siblings
        ...[],
      },
      {
        requires: [{ field: "design_prompt", needs: ["voice_name"] }],
      },
    ];
    const out = judgeLaneRelations(malformed, { design_prompt: "x", cfg: 3, a: 1 });
    assert.equal(out.length, 1);
    assert.equal(out[0]?.field, "design_prompt");
  });

  it("THE DUPLICATE-FOLD: the same row declared at two layers says its sentence once", () => {
    const row = { field: "design_prompt", needs: ["voice_name"] };
    const out = judgeLaneRelations(
      [{ requires: [row] }, { requires: [row] }],
      { design_prompt: "x" },
    );
    assert.equal(out.length, 1);
  });
});

describe("laneBlank (the blank law's value table)", () => {
  it("undefined, null, blank strings, empty bags — and bags of blanks — are NOT statements", () => {
    for (const v of [undefined, null, "", "   ", [], [null, ""], [[]], {}, { a: null }, { a: { b: "" } }]) {
      assert.equal(laneBlank(v), true, `expected blank: ${JSON.stringify(v) ?? String(v)}`);
    }
  });

  it("zero, false, non-empty scalars and bags, and non-plain objects ARE statements", () => {
    for (const v of [0, false, "x", [0], { a: 1 }, new Date(), new Map()]) {
      assert.equal(laneBlank(v), false, `expected stated: ${String(v)}`);
    }
  });
});

describe("judgeLaneSurface (the surface half)", () => {
  it("a null or undefined surface judges nothing (the legacy card-authored truth)", () => {
    assert.deepEqual(judgeLaneSurface(null, ["cfg"], { cfg: 3 }), []);
    assert.deepEqual(judgeLaneSurface(undefined, ["cfg"], { cfg: 3 }), []);
  });

  it("a stated schema field outside the declared surface refuses naming the surface", () => {
    const out = judgeLaneSurface(["prompt", "steps"], ["prompt", "cfg", "seed"], { cfg: 3 });
    assert.equal(out.length, 1);
    assert.equal(out[0]?.field, "cfg");
    assert.equal(
      out[0]?.message,
      "field 'cfg' fires nothing on this lane (the variant's declared surface is prompt, steps) — drop it or switch lane",
    );
  });

  it("absent and blank values never fire, and an EMPTY surface names itself empty", () => {
    assert.deepEqual(judgeLaneSurface(["prompt"], ["cfg"], {}), []);
    assert.deepEqual(judgeLaneSurface(["prompt"], ["cfg"], { cfg: "" }), []);
    const out = judgeLaneSurface([], ["cfg"], { cfg: 3 });
    assert.equal(
      out[0]?.message,
      "field 'cfg' fires nothing on this lane (the variant's declared surface is empty) — drop it or switch lane",
    );
  });
});
