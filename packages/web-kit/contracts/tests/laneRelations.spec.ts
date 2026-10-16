// laneRelations.spec.ts — the JUDGE's own laws (2026-10-10, the
// YOU_ARE_A_LIAR fix shape 1: the model becomes the author of what
// it accepts). Pure, zero-dep, at the contracts floor: the blank
// law (unstated ≠ stated), the four relation words judged with
// messages in the FIELD'S voice, the surface judgment (a stated
// field outside a lane's declaration fires nothing), and the
// cascade (family base ∪ variant additions, add-never-subtract).
import { describe, it, expect } from "vitest";
import assert from "node:assert/strict";
import {
  laneBlank,
  judgeLaneBounds,
  judgeLaneRelations,
  judgeLaneSurface,
  laneBoundsOf,
  laneContractOf,
  laneTogetherClosure,
  laneSurfaceOf,
  isPurelyUnstatedRequiredVoice,
  isUnstatedRequiredVoice,
} from "../src/laneRelations.ts";
import type { LaneRelations } from "../src/laneRelations.ts";

describe("the heal's classifier twins (the mixed-carry guard, 2026-10-18)", () => {
  it("the stem test CARRIES on any member; the pure test demands the whole text", () => {
    const pure = "this lane requires 'prompt' — 'prompt' is not stated — every image lane states WHAT the picture is — write the prompt";
    const mixed = "this lane requires 'prompt' — 'prompt' is not stated; stated cfg 3.5 is OUTSIDE the route envelope for variant \"turbo\"";
    expect(isUnstatedRequiredVoice(pure)).toBe(true);
    expect(isUnstatedRequiredVoice(mixed)).toBe(true);
    expect(isPurelyUnstatedRequiredVoice(pure)).toBe(true);
    expect(isPurelyUnstatedRequiredVoice(mixed)).toBe(false);
  });

  it("a text with no stem is neither, and a joined pair of stems stays pure", () => {
    expect(isPurelyUnstatedRequiredVoice("card_compose phase 1: unknown quant 'xq'")).toBe(false);
    expect(isPurelyUnstatedRequiredVoice(
      "this lane requires 'prompt' — 'prompt' is not stated; this lane requires 'style' — 'style' is not stated",
    )).toBe(true);
  });

  it("the stem CARRIES behind a door's own prefix (the persisted composite shape, NIT-9)", () => {
    // The judge's messages arrive EMBEDDED after a door prefix
    // ("lane refuses: …") — the carry test is substring-shaped, so
    // the stem behind any prefix still classifies. A LONE member
    // behind a prefix stays PURE: the pure test demands every
    // segment be the class, and a prefix with no ";"/newline join
    // is one segment — the heal fires on real persisted rows
    // (pinned beside the drafts seat, store.spec's heal arms). The
    // prefix only matters when a FOREIGN member joins.
    const behindDoor = "lane refuses: this lane requires 'style' — 'style' is not stated";
    expect(isUnstatedRequiredVoice(behindDoor)).toBe(true);
    expect(isPurelyUnstatedRequiredVoice(behindDoor)).toBe(true);
    const doorPlusForeign = "lane refuses: this lane requires 'style'; stated cfg 3.5 is OUTSIDE the route envelope";
    expect(isPurelyUnstatedRequiredVoice(doorPlusForeign)).toBe(false);
  });

  it("a CRLF-joined composite splits into its members (the Windows persisted row, NIT-9)", () => {
    // Persisted rows may carry \r\n joins; the segment split takes
    // the \n and the trailing \r rides INSIDE the member — the
    // substring carry is unaffected. Pinned so the split's shape
    // stays load-bearing for CRLF rows.
    const crlf = "this lane requires 'prompt' — 'prompt' is not stated\r\nthis lane requires 'style' — 'style' is not stated";
    expect(isPurelyUnstatedRequiredVoice(crlf)).toBe(true);
    const crlfMixed = "this lane requires 'prompt' — 'prompt' is not stated\r\nunknown quant 'xq'";
    expect(isUnstatedRequiredVoice(crlfMixed)).toBe(true);
    expect(isPurelyUnstatedRequiredVoice(crlfMixed)).toBe(false);
  });
});

describe("laneBlank (the unstated law)", () => {
  it("undefined, null, '' and empty containers are UNSTATED; 0 and false are STATED", () => {
    expect(laneBlank(undefined)).toBe(true);
    expect(laneBlank(null)).toBe(true);
    expect(laneBlank("")).toBe(true);
    expect(laneBlank([])).toBe(true);
    expect(laneBlank({})).toBe(true);
    expect(laneBlank(0)).toBe(false);
    expect(laneBlank(false)).toBe(false);
    expect(laneBlank("x")).toBe(false);
    expect(laneBlank(0.0)).toBe(false);
  });
});

describe("together (all or none)", () => {
  const rel: LaneRelations = {
    together: [{
      fields: ["voice_name", "design_prompt"],
      cure: "the persona export needs both halves — name the voice and describe it, or drop both",
    }],
  };
  it("a blank state never fires (authoring-in-progress is not a refusal)", () => {
    expect(judgeLaneRelations([rel], {})).toEqual([]);
  });
  it("both halves ride — no violation", () => {
    expect(judgeLaneRelations([rel], { voice_name: "warm_1", design_prompt: "warm" })).toEqual([]);
  });
  it("one half alone refuses, naming the stated one and carrying the cure", () => {
    const v = judgeLaneRelations([rel], { design_prompt: "warm" });
    expect(v).toHaveLength(1);
    expect(v[0]!.message).toContain("design_prompt");
    expect(v[0]!.message).toContain("voice_name");
    expect(v[0]!.message).toContain("name the voice and describe it, or drop both");
  });
});

describe("requires (a stated field needs its companions)", () => {
  const rel: LaneRelations = {
    requires: [{
      field: "ref_audio",
      needs: ["ref_text"],
      cure: "the clone needs the transcript too",
    }],
  };
  it("unstated field never fires", () => {
    expect(judgeLaneRelations([rel], { text: "x" })).toEqual([]);
  });
  // (audit-followups M4, 2026-11-06) THE REQUIRES-ROW MIGRATION LAW —
  // the division of labor between the two seats. A requires edge is
  // an ADMISSION VOICE, never a membership group: when a switch
  // drops a companion (stale seed), the closure does NOT pull the
  // surviving requirer into the stale set (laneTogetherClosure loops
  // together rows only — a together group MOVES, a requires edge
  // REFUSES); the requirer rides fresh and the judge fires its
  // refusal at the next admission. No live DECL declares requires
  // today (qwen3-tts declares together; krea-2 declares required) —
  // these arms state the law the day one boards.
  it("migration closure never extends through a requires edge — the judge owns that voice", () => {
    const stale = new Set(["ref_text"]);
    const closed = laneTogetherClosure([rel], stale, { ref_audio: "/a.flac", ref_text: "" });
    expect([...closed].sort()).toEqual(["ref_text"]);
  });
  it("a switch-dropped companion fires the judge on the surviving requirer", () => {
    const v = judgeLaneRelations([rel], { ref_audio: "/a.flac" });
    expect(v).toHaveLength(1);
    expect(v[0]!.field).toBe("ref_audio");
    expect(v[0]!.message).toContain("ref_text");
  });
  it("stated field with a missing companion refuses by NAME", () => {
    const v = judgeLaneRelations([rel], { ref_audio: "/a.flac" });
    expect(v).toHaveLength(1);
    expect(v[0]!.message).toContain("ref_audio");
    expect(v[0]!.message).toContain("ref_text");
    expect(v[0]!.message).toContain("the clone needs the transcript too");
  });
  it("stated field with companions admits", () => {
    expect(judgeLaneRelations([rel], { ref_audio: "/a.flac", ref_text: "t" })).toEqual([]);
  });
});

describe("conflicts (two at once perform nothing)", () => {
  const rel: LaneRelations = {
    conflicts: [{
      a: "voice_name",
      b: "qvoice",
      cure: "a saved persona performs the text — an export fires nothing",
    }],
  };
  it("either alone admits", () => {
    expect(judgeLaneRelations([rel], { voice_name: "warm_1" })).toEqual([]);
    expect(judgeLaneRelations([rel], { qvoice: "/v.qvoice" })).toEqual([]);
  });
  it("both at once refuses, naming both and the cure", () => {
    const v = judgeLaneRelations([rel], { voice_name: "warm_1", qvoice: "/v.qvoice" });
    expect(v).toHaveLength(1);
    expect(v[0]!.message).toContain("voice_name");
    expect(v[0]!.message).toContain("qvoice");
    expect(v[0]!.message).toContain("a saved persona performs the text");
  });
});

describe("either_or (one COMPLETE source, armed only when a member is stated)", () => {
  const rel: LaneRelations = {
    either_or: [{
      groups: [["ref_audio", "ref_text"], ["qvoice"]],
      cure: "state one complete source: the reference PAIR or a .qvoice embedding",
    }],
  };
  it("a blank lane admits (nothing stated, nothing to choose)", () => {
    expect(judgeLaneRelations([rel], { text: "x" })).toEqual([]);
  });
  it("a complete group admits; the other group admits", () => {
    expect(judgeLaneRelations([rel], { ref_audio: "/a.flac", ref_text: "t" })).toEqual([]);
    expect(judgeLaneRelations([rel], { qvoice: "/v.qvoice" })).toEqual([]);
  });
  it("half a pair refuses, naming the halves and the arms", () => {
    const v = judgeLaneRelations([rel], { ref_audio: "/a.flac" });
    expect(v).toHaveLength(1);
    expect(v[0]!.message).toContain("ref_audio");
    expect(v[0]!.message).toContain("ref_text");
    expect(v[0]!.message).toContain("state one complete source");
  });
  it("a COMPLETE group plus a stray half admits (one complete source is the law — the stray fires nothing)", () => {
    expect(judgeLaneRelations([rel], { qvoice: "/v.qvoice", ref_text: "t" })).toEqual([]);
  });
});

describe("judgeLaneSurface (a stated field outside the lane's declaration)", () => {
  const schemaNames = ["text", "temperature", "voice", "style_instruction"];
  it("a field on the surface admits; a field off it refuses with the field's name and the cure to switch", () => {
    expect(judgeLaneSurface(schemaNames, schemaNames, { text: "x", voice: "vivian" })).toEqual([]);
    const v = judgeLaneSurface(["text", "voice", "temperature"], schemaNames, { text: "x", style_instruction: "warm" });
    expect(v).toHaveLength(1);
    expect(v[0]!.message).toContain("style_instruction");
    expect(v[0]!.message).toMatch(/fires nothing/);
  });
  it("unstated fields never fire (a null stamp rides nothing)", () => {
    expect(judgeLaneSurface(["text"], ["text"], { text: "x", voice: undefined, style_instruction: null })).toEqual([]);
  });
  it("a null surface (a family that declares none) judges nothing — the legacy truth", () => {
    expect(judgeLaneSurface(null, schemaNames, { anything: 1, ghost: "x" })).toEqual([]);
  });
});

describe("laneSurfaceOf (the cascade: family base ∪ variant additions, add-never-subtract)", () => {
  it("family base + variant additions", () => {
    const surface = laneSurfaceOf(["text", "seed"], ["voice"]);
    expect([...surface!].sort()).toEqual(["seed", "text", "voice"]);
  });
  it("a null family surface stays null (the legacy lane judges nothing)", () => {
    expect(laneSurfaceOf(null, ["ref_audio"])).toBeNull();
    expect(laneSurfaceOf(undefined, undefined)).toBeNull();
  });
  it("a family with a surface and a variant with none = the family base", () => {
    const surface = laneSurfaceOf(["text"], undefined);
    expect([...surface!]).toEqual(["text"]);
  });
  it("duplicates collapse (a variant may restate a family base field)", () => {
    const surface = laneSurfaceOf(["text"], ["text", "voice"]);
    expect([...surface!].sort()).toEqual(["text", "voice"]);
  });
});

// ── THE AUDIT HARDENING (2026-10-10): a judge that CRASHES on a
// declaration that lost a member in transit is an estate crash, not a
// refusal. Every one of these is a shape the frozen facts path and a
// hand-edited model-facts.json can actually produce.
describe("the judge refuses, it never throws", () => {
  it("a requires row without its needs names nothing (no throw)", () => {
    const rel = { requires: [{ field: 'ref_audio' }] } as never
    expect(judgeLaneRelations([rel], { ref_audio: '/a.flac' })).toEqual([])
  })
  it("a together row without fields, and an either_or without groups", () => {
    expect(judgeLaneRelations([{ together: [{}] } as never], { a: 1 })).toEqual([])
    expect(judgeLaneRelations([{ either_or: [{}] } as never], { a: 1 })).toEqual([])
  })
  it("a null layer inside the relations array is skipped, not dereferenced", () => {
    expect(judgeLaneRelations([null as never], { a: 1 })).toEqual([])
  })
  it("judgeLaneSurface(undefined) judges nothing (a served doc with no lanes block)", () => {
    expect(judgeLaneSurface(undefined, ['text'], { text: 'x', ghost: 1 })).toEqual([])
  })
})

describe("the blank law, tightened (an all-blank bag is not a statement)", () => {
  it("a bag of blanks is blank: [null], [''], [undefined], {a: undefined}", () => {
    for (const v of [[null], [''], [undefined], { a: undefined }, { a: null, b: '' }]) {
      expect(laneBlank(v), JSON.stringify(v)).toBe(true)
    }
  })
  it("a bag with a real member is stated", () => {
    expect(laneBlank([null, 'x'])).toBe(false)
    expect(laneBlank({ a: null, b: 'x' })).toBe(false)
    expect(laneBlank([{ qvoice: '' }]), 'a bag whose only member is empty is still empty').toBe(true)
    expect(laneBlank([{ qvoice: '/v.qvoice' }])).toBe(false)
  })
  it("a non-plain object is a VALUE, not a bag (a Date is never a statement about a field)", () => {
    expect(laneBlank(new Date())).toBe(false)
    expect(laneBlank(new Map([['a', 1]]))).toBe(false)
  })
  it("the junk bag cannot satisfy an either_or arm", () => {
    const rel = { either_or: [{ groups: [['qvoice']], cure: 'state a persona' }] } as never
    expect(judgeLaneRelations([rel], { qvoice: [null] })).toEqual([])
  })
})

describe("the cures and the fold", () => {
  it("together and either_or carry a cure even when the row declares none", () => {
    const together = judgeLaneRelations([{ together: [{ fields: ['a', 'b'] }] } as never], { a: 1 })
    expect(together[0]!.message).toMatch(/state 'a' \+ 'b' together, or drop/)
    const either = judgeLaneRelations([{ either_or: [{ groups: [['a', 'b'], ['c']] }] } as never], { a: 1 })
    expect(either[0]!.message).toMatch(/state one complete source/)
  })
  it("a family and its variant declaring the SAME row speak once", () => {
    const row = { together: [{ fields: ['a', 'b'], cure: 'both or none' }] } as never
    expect(judgeLaneRelations([row, row], { a: 1 })).toHaveLength(1)
  })
  it("laneSurfaceOf returns a COPY (a 'pure' judge never holds live state)", () => {
    const base = ['text']
    const surface = laneSurfaceOf(base, undefined)
    expect(surface).not.toBe(base)
    ;(surface as unknown as string[] | null | undefined)?.push?.('mutated')
    expect(base).toEqual(['text'])
  })
})

// ── THE RANGE RULE (the 2.1 width burn, 2026-10-10): the model's
// own numeric domains, judged with the same voice as the words.
describe('judgeLaneBounds (the RANGE RULE)', () => {
  const bounds = {
    width: { min: 256, max: 1536 },
    steps: { max: 50 },
    cfg: { min: 0.1 },
  } as const

  it('a stated number below its floor refuses, naming the row and the field', () => {
    const v = judgeLaneBounds(bounds, { width: -50 })
    assert.equal(v.length, 1)
    assert.ok(v[0]!.message.includes("'width'"))
    assert.ok(v[0]!.message.includes('-50'))
    assert.ok(v[0]!.message.includes('256'))
  })

  it('a stated number above its ceiling refuses (a max-only row names its span)', () => {
    const v = judgeLaneBounds(bounds, { steps: 999 })
    assert.equal(v.length, 1)
    assert.ok(v[0]!.message.includes('at most 50'))
  })

  it('a min-only row refuses under (a floor-only span)', () => {
    const v = judgeLaneBounds(bounds, { cfg: 0 })
    assert.equal(v.length, 1)
    assert.ok(v[0]!.message.includes('at least 0.1'))
  })

  it('in-range values, blanks, non-numbers and unbounded fields never fire', () => {
    assert.equal(judgeLaneBounds(bounds, { width: 1328, steps: 20, cfg: 1 }).length, 0)
    assert.equal(judgeLaneBounds(bounds, { width: undefined, steps: null }).length, 0)
    assert.equal(judgeLaneBounds(bounds, { width: '1024' }).length, 0) // the schema's own refusal
    assert.equal(judgeLaneBounds(bounds, { seed: -9999 }).length, 0) // no row, no law
    assert.equal(judgeLaneBounds(null, { width: -50 }).length, 0) // no declaration, no judgment
  })

  it('laneBoundsOf: the variant REPLACES the family row per-field, keeps the rest', () => {
    const merged = laneBoundsOf(
      { steps: { max: 50 }, width: { min: 256, max: 1536 } },
      { steps: { max: 12 } },
    )
    assert.deepEqual(merged, { steps: { max: 12 }, width: { min: 256, max: 1536 } })
    assert.deepEqual(laneBoundsOf(null, { steps: { max: 12 } }), { steps: { max: 12 } })
    assert.equal(laneBoundsOf(null, null), null)
    // a variant naming a field the FAMILY declares no row for: the
    // variant's row is whole — there is no family endpoint to hold
    assert.deepEqual(
      laneBoundsOf({ steps: { min: 1, max: 50 } }, { cfg: { max: 2 } }),
      { steps: { min: 1, max: 50 }, cfg: { max: 2 } },
    )
  })

  it('per-ENDPOINT merge: a variant tightening only the ceiling holds the family floor (F9)', () => {
    // a whole-row replace would silently drop min:1 — the trap the
    // design audit flagged; the merge holds every unstated endpoint
    const merged = laneBoundsOf(
      { steps: { min: 1, max: 50 } },
      { steps: { max: 12 } },
    )
    assert.deepEqual(merged, { steps: { min: 1, max: 12 } })
    // to REMOVE an endpoint, state the row whole (max only, no floor)
    assert.deepEqual(
      laneBoundsOf({ steps: { min: 1, max: 50 } }, { steps: { max: 12, min: 2 } }),
      { steps: { min: 2, max: 12 } },
    )
  })
})

// ── THE ROUTE ENVELOPE IS BOUNDS (2026-10-11, the operator's wall:
// "the entire point of the schema rework was so this was impossible
// by design") — a variant's sampler_envelope is the SAME closed
// interval the bench's stamp gate refuses with; the contract
// projects it into the variant's bounds rows so the form's inline
// gate, the run gate, and the compose door judge ONE truth. The
// live proof it was broken: krea-2 declares ONLY envelopes — the
// served bounds read null, the form judged NOTHING, and a stated
// cfg 3.5 rode the wire to a door that refused it 300ms later.
describe('laneContractOf projects the route envelope into bounds', () => {
  const decl = {
    params: ['prompt'],
    variants: [
      {
        id: 'turbo',
        params: ['prompt'],
        sampler_envelope: { steps: [4, 8], cfg: [1, 2] },
      },
      {
        id: 'capped',
        bounds: { steps: { min: 2, max: 30 }, width: { min: 256 } },
        sampler_envelope: { steps: [5, 10] },
      },
      { id: 'bare' },
    ],
  }

  it('an envelope-only variant serves bounds the form can judge (the krea-2 shape)', () => {
    const row = laneContractOf(decl as never).variants.turbo!
    assert.deepEqual(row.bounds, { steps: { min: 4, max: 8 }, cfg: { min: 1, max: 2 } })
    assert.deepEqual(row.sampler_envelope, { steps: [4, 8], cfg: [1, 2] })
  })

  it('the envelope OWNS steps/cfg endpoints; untouched bound rows ride verbatim', () => {
    const row = laneContractOf(decl as never).variants.capped!
    assert.deepEqual(row.bounds, {
      steps: { min: 5, max: 10 },
      width: { min: 256 },
    })
  })

  it('a variant with neither is not served at all (the absent-equals-empty law)', () => {
    const served = laneContractOf(decl as never).variants
    assert.equal(served.bare, undefined)
  })

  it('the projected bounds judge the door\'s own refusal — stated cfg 3.5 over turbo [1,2] fires', () => {
    const bounds = laneBoundsOf(null, laneContractOf(decl as never).variants.turbo!.bounds ?? null)
    const violations = judgeLaneBounds(bounds, { cfg: 3.5, steps: 6 })
    assert.equal(violations.length, 1)
    assert.match(violations[0]!.message, /'cfg': 3.5 is outside this lane's range \(1–2\)/)
  })

  it('a steps envelope that is not a [min,max] pair projects nothing — the DECLARED rows keep judging, loud', () => {
    // The DECL schema accepts any-length steps arrays
    // (models/families/contract.ts:434-437), so a three-element
    // envelope reaches the projection. A pair is the only shape the
    // projection may read endpoints from; a longer one leaves the
    // variant's own row verbatim (a malformed envelope cannot own an
    // endpoint) while the well-formed cfg sibling still projects.
    const contract = laneContractOf({
      params: ['prompt'],
      bounds: { steps: { min: 1, max: 50 } },
      variants: [
        {
          id: 'wide',
          bounds: { steps: { min: 4, max: 30 } },
          sampler_envelope: { steps: [1, 8, 12], cfg: [1, 2] },
        },
      ],
    } as never)
    const row = contract.variants.wide!
    assert.deepEqual(row.bounds, { steps: { min: 4, max: 30 }, cfg: { min: 1, max: 2 } })
    assert.deepEqual(row.sampler_envelope, { steps: [1, 8, 12], cfg: [1, 2] })
    // the family ⨯ variant merge a seat takes still refuses: the
    // malformed envelope opened no door
    const bounds = laneBoundsOf(contract.bounds ?? null, row.bounds ?? null)
    const violations = judgeLaneBounds(bounds, { steps: 40, cfg: 1.5 })
    assert.equal(violations.length, 1)
    assert.match(violations[0]!.message, /'steps': 40 is outside this lane's range \(4–30\)/)
  })
})
