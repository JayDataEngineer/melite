// cards-lane-law.spec.ts — THE LANE ADMISSION WALLS (2026-10-10,
// the YOU_ARE_A_LIAR fix shapes 1+3+5): the DECL's parameter
// surface + relation words, judged at the bench-write seat over the
// SAME prepared params the next run composes. THE FIRST WALL is the
// operator's exact incident A state — CustomVoice with a
// design_prompt and no voice_name — refused at bench-write, named,
// cured in the message ("pair design_prompt with voice_name").
// Before this seat the state landed silently and died at Run
// (Part III incident A of the report): the form could build what
// the run refused, because nothing anywhere carried the model's
// own words for what it accepts.
//
// THE CLAIM LAW (fix shape 4's first half) rides at the bottom:
// for every family that DECLARES a surface, the card may claim
// nothing the model did not declare — and the model may declare
// nothing the card cannot carry. The words live at
// @melite/contracts/laneRelations; these walls pin the judgment.
import { prepareCardParams } from "../src/cardsCompose.ts";
import { describe, it, expect, beforeAll } from "vitest";
import { Context } from "@deepseek-ai/cordis";
import { CardRegistryService } from "../src/cardsRegistry.ts";
import { theService } from "@melite/comfyui-cordis";
import type { LaneRelations } from "@melite/contracts/laneRelations";

let svc: CardRegistryService;

beforeAll(async () => {
  const ctx = new Context();
  svc = new CardRegistryService(ctx);
  await svc.prime();
});

/** The incident A body, verbatim in shape: the operator's state —
 *  CustomVoice synthesis, a design prompt for the persona export,
 *  no voice_name (the save mod's required name). */
const INCIDENT_A: Record<string, unknown> = {
  model: "qwen3-tts",
  variant: "customvoice",
  text: "The harbour lights at dusk.",
  design_prompt: "a warm, unhurried narrator with gravel in the low end",
};

describe("THE INCIDENT A WALL (CustomVoice + design_prompt, no voice_name)", () => {
  it("refuses AT WRITE TIME, names the pair, carries the cure", () => {
    const verdict = svc.admitStageRelations("tts", INCIDENT_A);
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) {
      // named: both halves of the export pair
      expect(verdict.error).toContain("voice_name");
      expect(verdict.error).toContain("design_prompt");
      // the lane is named (the family/variant the state built)
      expect(verdict.error).toContain("qwen3-tts/customvoice");
      // cured: the message names the cure (both halves or drop both)
      expect(verdict.error).toContain("name the voice");
      expect(verdict.error).toContain("drop both");
    }
  });

  it("the CURED state admits (design_prompt + voice_name ride together)", () => {
    const verdict = svc.admitStageRelations("tts", {
      ...INCIDENT_A,
      voice_name: "harbour_gravel",
    });
    expect(verdict).toEqual({ ok: true });
  });

  it("the same wound on the 1.7B family refuses with the same voice", () => {
    const verdict = svc.admitStageRelations("tts", {
      ...INCIDENT_A,
      model: "qwen3-tts-voicedesign",
    });
    expect(verdict.ok).toBe(false);
  });
});

describe("THE SURFACE WALL (a stated field outside the lane's declaration)", () => {
  it("a persona stated on the base clone lane refuses — the clone declares no persona", () => {
    const verdict = svc.admitStageRelations("tts", {
      model: "qwen3-tts",
      variant: "base",
      text: "clone this",
      ref_audio: "/assets/harbour.flac",
      ref_text: "clone this",
      voice: "vivian",
    });
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) {
      expect(verdict.error).toContain("'voice'");
      expect(verdict.error).toContain("fires nothing");
    }
  });

  it("a delivery style stated on the 0.6B (no instruction control there) refuses", () => {
    const verdict = svc.admitStageRelations("tts", {
      model: "qwen3-tts",
      text: "read this",
      style_instruction: "whispered",
    });
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) expect(verdict.error).toContain("style_instruction");
  });

  it("the customvoice lane carries its declared set without refusal", () => {
    const verdict = svc.admitStageRelations("tts", {
      model: "qwen3-tts",
      variant: "customvoice",
      text: "read this",
      voice: "vivian",
      temperature: 0.7,
      seed: 7,
    });
    expect(verdict).toEqual({ ok: true });
  });
});

describe("THE CLONE EITHER_OR WALL (one COMPLETE source)", () => {
  const base = {
    model: "qwen3-tts",
    variant: "base",
    text: "clone this",
  } as Record<string, unknown>;

  it("a BLANK clone lane admits — authoring-in-progress is never a write refusal", () => {
    expect(svc.admitStageRelations("tts", { ...base })).toEqual({ ok: true });
  });

  it("half the reference pair refuses with both arms named", () => {
    const verdict = svc.admitStageRelations("tts", { ...base, ref_audio: "/assets/x.flac" });
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) {
      expect(verdict.error).toContain("ref_audio");
      expect(verdict.error).toContain("ref_text");
      expect(verdict.error).toContain("qvoice");
    }
  });

  it("the full pair admits; a stated qvoice alone admits", () => {
    expect(svc.admitStageRelations("tts", {
      ...base, ref_audio: "/assets/x.flac", ref_text: "the transcript",
    })).toEqual({ ok: true });
    expect(svc.admitStageRelations("tts", {
      ...base, qvoice: "/voices/harbour.qvoice",
    })).toEqual({ ok: true });
  });

  it("a ROUTE address alone does not name the clone lane (the lane is the SELECTED variant)", () => {
    // The correction that cost one wrong law: 'qwen3-tts-base' with
    // NO body variant selects the family HEAD, so the run composes
    // the synth lane and a stated reference fires nothing. The write
    // door must say so at build time instead of admitting a state
    // the run refuses.
    const verdict = svc.admitStageRelations("tts", {
      model: "qwen3-tts-base",
      text: "clone this",
      ref_audio: "/assets/x.flac",
      ref_text: "the transcript",
    });
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) {
      expect(verdict.error).toContain("qwen3-tts/customvoice");
      expect(verdict.error).toContain("ref_audio");
    }
    // the stated variant is what reaches the clone lane
    expect(svc.admitStageRelations("tts", {
      model: "qwen3-tts-base",
      variant: "base",
      text: "clone this",
      ref_audio: "/assets/x.flac",
      ref_text: "the transcript",
    })).toEqual({ ok: true });
  });

  it("the 1.7B clone lane carries the same law (variant-stated, its own route)", () => {
    // half the pair on the 1.7B clone lane: the either_or names both arms
    const verdict = svc.admitStageRelations("tts", {
      model: "qwen3-tts-voicedesign",
      variant: "base",
      text: "clone this",
      ref_text: "the transcript",
    });
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) expect(verdict.error).toContain("qwen3-tts-voicedesign/base");
    // the full pair composes the 1.7B Base checkpoint
    expect(svc.admitStageRelations("tts", {
      model: "qwen3-tts-voicedesign",
      variant: "base",
      text: "clone this",
      ref_audio: "/assets/x.flac",
      ref_text: "the transcript",
    })).toEqual({ ok: true });
    // the route ADDRESS alone is not the lane (the corrected law)
    expect(svc.admitStageRelations("tts", {
      model: "qwen3-tts-voicedesign-base",
      text: "clone this",
      ref_audio: "/assets/x.flac",
      ref_text: "the transcript",
    }).ok).toBe(false);
  });
});

describe("THE EXPORT CONFLICT WALL (an export performs nothing)", () => {
  it("an export stated with a reference clone refuses", () => {
    const verdict = svc.admitStageRelations("tts", {
      model: "qwen3-tts",
      variant: "base",
      text: "clone this",
      ref_audio: "/assets/x.flac",
      ref_text: "the transcript",
      voice_name: "harbour_gravel",
      design_prompt: "a warm narrator",
    });
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) expect(verdict.error).toContain("clones no reference");
  });

  it("an export stated with a saved persona refuses (1.7B customvoice, style wound too)", () => {
    const verdict = svc.admitStageRelations("tts", {
      model: "qwen3-tts-voicedesign",
      text: "read this",
      style_instruction: "whispered",
      qvoice: "/voices/harbour.qvoice",
      voice_name: "harbour_gravel",
      design_prompt: "a warm narrator",
    });
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) {
      expect(verdict.error).toContain("no saved persona");
      expect(verdict.error).toContain("performs nothing");
    }
  });
});

describe("THE TOLERANCE SEAMS (what this door does NOT own)", () => {
  it("a family that declares no surface is judged by NO lane law (the legacy truth)", () => {
    // the LANE seam: a legacy family declares no surface, so no
    // surface/relation law speaks for it...
    const verdict = svc.admitStageRelations("image-gen", {
      model: "anny",
    });
    expect(verdict).toEqual({ ok: true });
  });

  it("but an UNDECLARED key refuses HERE too (2026-10-10, the behavioural audit's BROKEN-B)", () => {
    // ...while the UNDECLARED-KEY gate is universal and now runs on
    // this seat: `frobnicate` used to be ADMITTED at the bench and
    // refused only at the run door, so a write the door accepted
    // produced a run the bench could not. The bench and the run speak
    // ONE voice about a key no card declares.
    const verdict = svc.admitStageRelations("image-gen", {
      model: "anny",
      whatever_knob: "any",
    });
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) {
      expect(verdict.error).toContain("whatever_knob");
      expect(verdict.error).toMatch(/unknown param|admission is the declared surface/);
    }
  });

  it("an unknown variant passes THIS door — the run door owns that voice", () => {
    const verdict = svc.admitStageRelations("tts", {
      model: "qwen3-tts",
      variant: "not-a-variant",
      text: "x",
    });
    expect(verdict).toEqual({ ok: true });
  });

  it("a model-less row and an unknown card pass (not this seat's law)", () => {
    expect(svc.admitStageRelations("tts", { text: "x" })).toEqual({ ok: true });
    expect(svc.admitStageRelations("no-such-card", { model: "qwen3-tts" })).toEqual({ ok: true });
  });
});

describe("THE CLAIM LAW (the card claims nothing the model did not declare)", () => {
  /** Every pack field name the family's mods carry (the serialized
   *  mod contracts — schemastery toJSON: the root object node rides
   *  under its own uid key and names its fields in `dict`; the same
   *  read the form plane serves). */
  const modFieldsOf = (card: string, fam: string): Set<string> => {
    const schemas = theService().formSchemas(card, fam);
    const names = new Set<string>();
    for (const env of Object.values(schemas?.mods ?? {})) {
      const e = env as { uid?: number; refs?: Record<string, unknown> };
      const root = e.uid !== undefined
        ? (e.refs?.[String(e.uid)] as { dict?: Record<string, unknown> } | undefined)
        : undefined;
      for (const k of Object.keys(root?.dict ?? {})) names.add(k);
    }
    return names;
  };

  it("every DECLARING family's surface is carried by the card (no dead declaration)", () => {
    const facts = svc.modelFacts();
    const decls = svc.cardDecls();
    let declaringOwners = 0;
    for (const [fam, row] of Object.entries(facts)) {
      if (row.params === undefined) continue; // legacy: declares nothing
      // route rows mirror their owner's declaration (the derived
      // lens); the claim law judges each OWNER once
      const owner = svc.resolveCardFamily(fam, facts);
      if (owner !== fam) continue;
      declaringOwners += 1;
      const decl = decls[row.card];
      expect(decl, `family ${fam} names card ${row.card} — the def must exist`).toBeDefined();
      const carriable = new Set([
        ...decl.schemaNames,
        ...modFieldsOf(row.card, fam),
      ]);
      const declared = new Set<string>([
        ...row.params,
        ...row.variants.flatMap((v) => [...(v.params ?? [])]),
      ]);
      for (const name of declared) {
        expect(
          carriable.has(name),
          `family ${fam} declares '${name}' but card ${row.card} carries no such field`,
        ).toBe(true);
      }
    }
    // THE SELF-CHECK (the laws audit's MEDIUM-5e): with the feature
    // removed this loop iterates zero times and passes. The law is
    // only a law while something declares.
    expect(declaringOwners, "at least one family declares a surface (else this wall is vacuous)").toBeGreaterThan(0);
  });

  it("the tts card claims nothing its declaring families did not declare (the full-claim bind)", () => {
    const facts = svc.modelFacts();
    const decls = svc.cardDecls();
    const ttsDecl = decls["tts"];
    expect(ttsDecl).toBeDefined();
    // THE BOARDING IS ASSERTED, NOT ASSUMED (2026-10-10, the laws
    // audit's MEDIUM-5b): the law below binds the WHOLE schema only
    // while every family the card boards declares. Hardcoding the two
    // families made a THIRD (legacy) boarding keep the test green
    // while the comment became false — the exact "schema validation"
    // claim the report names. So: derive the family atoms off the
    // board, assert the set, and require each to declare.
    const boardedAtoms = (ttsDecl as { boarded: readonly string[] }).boarded
      .map((id) => (svc.resolveCardFamily(id, facts) === id ? id : svc.resolveCardFamily(id, facts)))
    expect([...new Set(boardedAtoms)].sort(), "the card's board is the two declaring families").toEqual([
      "qwen3-tts", "qwen3-tts-voicedesign",
    ]);
    const union = new Set<string>();
    for (const fam of ["qwen3-tts", "qwen3-tts-voicedesign"]) {
      const row = facts[fam];
      expect(row, `family ${fam} in facts`).toBeDefined();
      expect(row.params, `family ${fam} declares a base surface`).toBeDefined();
      for (const name of [
        ...row.params,
        ...row.variants.flatMap((v) => [...(v.params ?? [])]),
      ]) union.add(name);
      for (const name of modFieldsOf("tts", fam)) union.add(name);
    }
    for (const name of ttsDecl.schemaNames) {
      expect(
        union.has(name),
        `card tts claims '${name}' but no boarded family declares it`,
      ).toBe(true);
    }
  });

  it("relation words name only carriable fields (no dead grammar)", () => {
    const facts = svc.modelFacts();
    const decls = svc.cardDecls();
    let declaringOwners = 0;
    const namesIn = (rel: LaneRelations | undefined): string[] => {
      if (rel === undefined) return [];
      const out: string[] = [];
      for (const r of rel.requires ?? []) out.push(r.field, ...r.needs);
      for (const r of rel.conflicts ?? []) out.push(r.a, r.b);
      for (const r of rel.together ?? []) out.push(...r.fields);
      for (const r of rel.either_or ?? []) for (const g of r.groups) out.push(...g);
      return out;
    };
    for (const [fam, row] of Object.entries(facts)) {
      if (row.params === undefined) continue;
      const owner = svc.resolveCardFamily(fam, facts);
      if (owner !== fam) continue; // route lens mirrors the owner
      declaringOwners += 1;
      const decl = decls[row.card];
      // THE LANE-SURFACE ARM (the laws audit's MEDIUM-6): a relation
      // name must be a field the lane CAN carry — its declared
      // surface (family base ∪ the variant that declares it) or a
      // mod-pack field, which ride by design and are not
      // surface-judged. Merely being carriable is not enough: a
      // relation blessing a name no lane declares is a law that
      // contradicts the surfaces beside it.
      const laneNames = new Set<string>([
        ...(row.params ?? []),
        ...modFieldsOf(row.card, fam),
      ]);
      for (const v of row.variants) for (const n of v.params ?? []) laneNames.add(n);
      const carriable = new Set([...decl.schemaNames, ...modFieldsOf(row.card, fam)]);
      for (const name of [
        ...namesIn(row.relations),
        ...row.variants.flatMap((v) => namesIn(v.relations)),
      ]) {
        expect(
          carriable.has(name),
          `family ${fam} relates on '${name}' but nothing carries it`,
        ).toBe(true);
        // A relation may name a field the family's own surface does
        // NOT carry — that is often its POINT: the 0.6B declares
        // voice_name × style_instruction, and style_instruction is a
        // 1.7B-only field, so the row refuses at the DOOR a state
        // that would have died at compose ("fires nothing on this
        // lane"). What it may not name is a field NOTHING carries —
        // so the check is: the name is in some lane surface, or it is
        // a field the CARD carries, or a mod field.
        expect(
          laneNames.has(name) || decl.schemaNames.includes(name) || modFieldsOf(row.card, fam).has(name),
          `family ${fam} relates on '${name}', which no lane surface, card field, or mod pack carries — dead grammar`,
        ).toBe(true);
      }
    }
    expect(declaringOwners, "at least one family declares (else this wall is vacuous)").toBeGreaterThan(0);
  });

  it("the tts surfaces judge the run's own states (spot: the design lane)", () => {
    // the 1.7B design lane: neither export half stated = in progress
    expect(svc.admitStageRelations("tts", {
      model: "qwen3-tts-voicedesign-design", text: "read this",
    })).toEqual({ ok: true });
    // the pair stated = the export the lane exists for
    expect(svc.admitStageRelations("tts", {
      model: "qwen3-tts-voicedesign-design",
      text: "read this",
      voice_name: "harbour_gravel",
      design_prompt: "a warm narrator",
    })).toEqual({ ok: true });
    // half the pair = the wound, refused
    expect(svc.admitStageRelations("tts", {
      model: "qwen3-tts-voicedesign-design",
      text: "read this",
      voice_name: "harbour_gravel",
    }).ok).toBe(false);
  });
});

describe("THE RUN SEAT RIDES THE SAME DECLARATION (li-o's second voice)", () => {
  it("phase1Card refuses the incident A state the write door would have refused", async () => {
    // The restored-archive path (and any writer that predates the
    // door) reaches phase1Card unjudged: the bench door is exempt
    // for restored rows because the archive must load. The RUN seat
    // is where the declaration teaches — ONE spelling (laneVerdict),
    // so the card needs no hand-written copy of the law.
    // THE LANE VOICE, not the card's hand-written one: the tts card
    // has its own belt that refuses this state too, and an assertion
    // on /voice_name/ alone cannot tell the two apart (the audit's
    // receipt — the run seat's gate was dead and this test stayed
    // green). The DECL's voice names the lane and the law.
    await expect(
      svc.phase1Card(
        { ...INCIDENT_A },
        "qwen3-tts",
      ),
    ).rejects.toThrow(/lane 'qwen3-tts\/customvoice' refuses the state/);
  });

  it("the cured state composes phase 1 (the door and the run agree)", async () => {
    const phase1 = await svc.phase1Card(
      { ...INCIDENT_A, voice_name: "harbour_gravel" },
      "qwen3-tts",
    );
    expect(phase1.fam).toBe("qwen3-tts");
  });

  it("a legacy family composes phase 1 untouched (the run gate judges only declared lanes)", async () => {
    const phase1 = await svc.phase1Card(
      { model: "z-image", prompt: "x" },
      "z-image",
    );
    expect(phase1.fam).toBe("z-image");
  });
});

describe("THE PARITY LAW (the write door and the run must agree, BOTH ways)", () => {
  // The one wall that matters above all: a state the door admits and
  // the run refuses is a broken promise in the one direction the
  // operator meets first (the form looked fine, the run said no); a
  // state the door refuses and the run composes is a locked door on a
  // working lane. Both are the same bug class, so both are pinned
  // from ONE table — the lane judge and the run seat, per state.
  const CASES: Array<{ name: string; params: Record<string, unknown> }> = [
    { name: "incident A (export half a pair)", params: { ...INCIDENT_A } },
    { name: "incident A cured", params: { ...INCIDENT_A, voice_name: "warm_1" } },
    { name: "0.6B customvoice synthesis", params: { model: "qwen3-tts", variant: "customvoice", text: "x", voice: "vivian", temperature: 0.7 } },
    { name: "0.6B base clone (variant stated)", params: { model: "qwen3-tts", variant: "base", text: "x", ref_audio: "/a.flac", ref_text: "t" } },
    { name: "0.6B base clone half a pair", params: { model: "qwen3-tts", variant: "base", text: "x", ref_audio: "/a.flac" } },
    { name: "base ADDRESS without a variant (synth lane, reference fires nothing)", params: { model: "qwen3-tts-base", text: "x", ref_audio: "/a.flac", ref_text: "t" } },
    { name: "1.7B customvoice with instruction", params: { model: "qwen3-tts-voicedesign", variant: "customvoice", text: "x", voice: "vivian", style_instruction: "whispered" } },
    { name: "1.7B base clone (variant stated)", params: { model: "qwen3-tts-voicedesign", variant: "base", text: "x", ref_audio: "/a.flac", ref_text: "t" } },
    { name: "a recipe variant (inherits the family base)", params: { model: "qwen3-tts", variant: "steady_read", text: "x" } },
    { name: "export beside a .qvoice", params: { model: "qwen3-tts", variant: "customvoice", text: "x", voice: "vivian", qvoice: "/v.qvoice", voice_name: "warm_1", design_prompt: "warm" } },
    { name: "a legacy family is untouched", params: { model: "z-image", prompt: "x" } },
  ];

  for (const c of CASES) {
    it(c.name + ": the door's verdict IS the run's verdict", async () => {
      const door = svc.admitStageRelations("tts", c.params);
      let runRefused: string | null = null;
      try {
        await svc.phase1Card(c.params, String(c.params["model"] ?? ""));
      } catch (e) {
        runRefused = (e as Error).message;
      }
      // The run seat judges the DECL first (li-s), so a lane law
      // refusal is IDENTICAL in both places — that is the promise.
      if (!door.ok) {
        expect(runRefused, "the door refused; the run must refuse the same state").not.toBeNull();
        expect(runRefused).toContain(door.error.split(" refuses the state: ")[1] ?? "IMPOSSIBLE");
        return;
      }
      // The door admitted: the run may still refuse for a reason the
      // DECL does not own (a missing reference, a lane file) — but
      // it must NEVER refuse with THIS lane's surface/relation voice.
      if (runRefused !== null) {
        expect(runRefused, "the door admitted a state the run refused on lane grounds").not.toContain("declared surface is");
        expect(runRefused).not.toContain("ride together on this lane");
        expect(runRefused).not.toContain("refuses the state:");
      }
    });
  }
});

// ── THE PARITY LAW, PROVEN END TO END (2026-10-10, the behavioural
// audit's BROKEN-A/B/C — three holes found by writing poison through
// the LIVE lane, not by reading code) ──────────────────────────────
//
// A. AN ADDRESS THE CARD DOES NOT OFFER IS NOT OFFERED. The model
//    admission folded any declared route onto its owning family, so
//    `qwen3-tts-voicedesign-base` (a variant route the card's board
//    does not name) was admitted — and then composed the family
//    HEAD's lane: the stored id said base while the run spoke.
describe("an unoffered address is refused (the board IS the offer)", () => {
  it("a variant route the card does not board refuses, naming the offer", () => {
    const verdict = svc.admitStageModel("tts", "qwen3-tts-voicedesign-base");
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) {
      expect(verdict.error).toContain("qwen3-tts-voicedesign-base");
      expect(verdict.offered).toContain("qwen3-tts");
      expect(verdict.offered).not.toContain("qwen3-tts-voicedesign-base");
    }
  });
  it("an address the card DOES board still admits (the fix is precise)", () => {
    for (const id of ["qwen3-tts", "qwen3-tts-base", "qwen3-tts-voicedesign-design"]) {
      expect(svc.admitStageModel("tts", id).ok, id).toBe(true);
    }
  });
});

describe("THE RUN SEAT COMPOSES THE RESOLVED ADDRESS (BROKEN-C)", () => {
  it("a base variant resolves to the CLONE route, not the family head", () => {
    // the defect: the variant coordinate is CONSUMED at the lift
    // (`model` is an envelope key), so composeOnce was handed the
    // family ATOM and the engine composed the head lane's facts row —
    // a bench-ADMITTED clone state then refused at Run with "fires
    // nothing outside the Base variant". The prepared card now
    // carries the address the engine must compose.
    const base = prepareCardParams(
      svc,
      { variant: "base", text: "clone this", ref_audio: "/a.flac", ref_text: "t" },
      "qwen3-tts",
      "test",
    );
    expect(base.modelId, "the base variant re-points the engine at the clone route").toBe("qwen3-tts-base");
    // a head-lane pick composes the head's own address
    const head = prepareCardParams(svc, { variant: "customvoice", text: "speak" }, "qwen3-tts", "test");
    expect(head.modelId).toBe("qwen3-tts");
    // a route ADDRESS with no variant composes the HEAD (the VARIANT
    // selects the lane, not the address — the documented direction:
    // a bare route address judges the family head, which is why the
    // card re-points by variant, not by address)
    const addressed = prepareCardParams(svc, { text: "speak" }, "qwen3-tts-base", "test");
    expect(addressed.modelId).toBe("qwen3-tts");
  });
});

// ── THE EXPORT CONFLICTS ARE COMPLETE (the bypass audit's HIGH-4) ──
// The 0.6B family declared `together(voice_name, design_prompt)` and
// two conflicts but NOT the voice_name × style_instruction export
// conflict its 1.7B SIBLING carries. So an export + delivery-style
// state passed the judge and refused at compose: the form builds what
// the run refuses — the exact failure the whole shape exists to kill.
describe("an export is styled on its performances, not while it is designed", () => {
  it("the 0.6B lane refuses voice_name + style_instruction (the 1.7B law, at last)", () => {
    const verdict = svc.admitStageRelations("tts", {
      model: "qwen3-tts",
      variant: "customvoice",
      text: "x",
      voice_name: "warm_1",
      design_prompt: "a warm narrator",
      style_instruction: "whispered",
    });
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) {
      expect(verdict.error).toContain("voice_name");
      expect(verdict.error).toContain("style_instruction");
      expect(verdict.error).toMatch(/styled on its performances|drop the style/);
    }
  });
  it("a style on its own composes (the conflict is the EXPORT's, not the style's)", () => {
    expect(svc.admitStageRelations("tts", {
      model: "qwen3-tts",
      variant: "customvoice",
      text: "x",
      voice: "vivian",
    }).ok).toBe(true);
  });
});
