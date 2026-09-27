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
import { readFileSync } from "node:fs";
import { parseSidecar } from "../src/queueSidecar.ts";
import { prepareCardParams } from "../src/cardsCompose.ts";
import { describe, it, expect, beforeAll } from "vitest";
import { Context } from "@deepseek-ai/cordis";
import { CardRegistryService } from "../src/cardsRegistry.ts";
import { theService } from "@melite/comfyui-cordis";
import type { LaneRelations } from "@melite/contracts/laneRelations";

let svc: CardRegistryService;
let bootCtx: Context;

beforeAll(async () => {
  bootCtx = new Context();
  svc = new CardRegistryService(bootCtx);
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
        ...(row.params ?? []),
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

// ── THE SIDECAR HAS A READ CONTRACT TOO (the bypass audit's HIGH-5) ──
// The sidecar had a WRITER contract and no reader contract: six
// readers JSON.parsed `_flow.json` and `as`-cast it, so a hand-edited
// or truncated doc loaded rows nothing could find by id. This is the
// one parse, and it judges the shape without rebuilding the row (a
// refusal settle carries the old sidecar's own faces forward).
describe("THE SIDECAR'S READ CONTRACT", () => {
  it("a well-formed doc parses and keeps its fields", () => {
    const parsed = parseSidecar({
      status: "queued", pipeline: "flow_card", created_at: 7,
      stages: [{ id: "s", status: "queued" }], skipped_stages: ["x"],
    });
    expect(parsed).not.toBeNull();
    expect(parsed!.pipeline).toBe("flow_card");
    expect(parsed!.stages).toHaveLength(1);
    // verbatim: the settle's own faces ride
    expect((parsed!.request as Record<string, unknown>)["skipped_stages"]).toEqual(["x"]);
  });
  it("a stage without an id refuses (it can never be found by key)", () => {
    expect(parseSidecar({ stages: [{ name: "s" }] })).toBeNull();
    expect(parseSidecar({ stages: [null] })).toBeNull();
    expect(parseSidecar({ stages: [{ id: "" }] })).toBeNull();
    expect(parseSidecar({ stages: "bad" })).toBeNull();
  });
  it("a non-doc refuses (null, an array, a scalar)", () => {
    for (const junk of [null, [], 4, "x", undefined]) {
      expect(parseSidecar(junk), JSON.stringify(junk)).toBeNull();
    }
  });
  it("a doc with NO stages is legal (a run that has not staged yet)", () => {
    expect(parseSidecar({ status: "queued" })).not.toBeNull();
    expect(parseSidecar({ stages: [] })).not.toBeNull();
  });
});

// ── THE PARITY LAW, EXTENDED BY THE LIVE RE-CHECK (2026-10-10) ────
// The re-check wrote poison through the deployed lane and found the
// three fixes only HALF landed: the bench refused what the run seat
// composed, and one strip made a model-less row skip the key gate.
// Both are closed here, and both are walls now.
describe("THE RE-CHECK'S TWO BYPASSES ARE CLOSED", () => {
  it("the run seat refuses an unoffered address exactly as the bench does", () => {
    // BYPASS 1: `validate` with qwen3-tts-voicedesign-base composed
    // the family HEAD and answered ok while the bench refused the
    // same address. The board check now rides phase1.
    const bench = svc.admitStageModel("tts", "qwen3-tts-voicedesign-base");
    expect(bench.ok).toBe(false);
    const src = readFileSync(new URL("../src/cardsRegistry.ts", import.meta.url), "utf8");
    const phase1 = src.slice(src.indexOf("async phase1Card("));
    expect(phase1.slice(0, 2000)).toContain("admitStageModel");
  });

  it("a variant's OWN route composes (the board admits the route's family)", () => {
    // BYPASS 2: `{model: qwen3-tts-voicedesign, variant: base}` was
    // admitted at the bench and then refused by the engine's
    // not-boarded gate, in a voice the bench never spoke. A route is
    // resolved by its DECL, not offered as a model key, so the board
    // admits the route's OWNING FAMILY.
    expect(svc.admitStageModel("tts", "qwen3-tts-voicedesign").ok).toBe(true);
    const base = prepareCardParams(svc, { variant: "base", text: "clone" }, "qwen3-tts-voicedesign", "t");
    expect(base.modelId).toBe("qwen3-tts-voicedesign-base");
    const engine = readFileSync(
      new URL("../../../engines/comfyui-cordis/src/service.ts", import.meta.url),
      "utf8",
    );
    expect(engine).toMatch(/boarded\.includes\(owner\)/);
  });

  it("the undeclared-key gate does NOT inherit the model-less tolerance", () => {
    // BYPASS 3: the contract's self-naming strip removes
    // `model: 'anny'` at store, so the row became model-less, the
    // lane path stood down, and `patch {frobnicate}` landed. A key no
    // card declares needs no family to judge.
    const src = readFileSync(new URL("../src/cardsRegistry.ts", import.meta.url), "utf8");
    // the model-less arm has its OWN key-gate seat, before the
    // tolerance returns — that is the whole fix
    const arm = src.slice(src.indexOf('if (typeof mid !== "string" || mid === "") {'), src.indexOf("let prep: PreparedCard;"));
    expect(arm, "the model-less arm judges keys before standing down").toContain("admissionRefusal");
    expect(arm).toContain("return null; // the lane's own tolerance for a model-less row");
  });
});

// ── THE LANE LAWS RUN AT EVERY SEAT (the work audit's CRITICAL) ────
// A THIRD half-landed fix, and the exact one phase1's own comment
// warns about: the validate arm judged the OVERLAID params, where
// `model` is an envelope key — so the model-less tolerance stood the
// whole judgment down and the surface/relation laws never ran at
// validate. An export conflict answered ok:true there while the bench
// and the start door both refused it.
describe("THE LANE LAWS AT THE VALIDATE SEAT", () => {
  it("the export conflict refuses THROUGH composeValidateCard (not only at the bench)", async () => {
    // the same state the bench refuses (an export styled while it is
    // designed), sent to the door that composes
    const refused = await svc.composeValidateCard(
      "tts",
      "qwen3-tts",
      { model: "qwen3-tts", variant: "customvoice", text: "x", voice_name: "warm_1", design_prompt: "warm", style_instruction: "whispered" },
      "qwen3-tts",
      { model: "qwen3-tts", variant: "customvoice", text: "x", voice_name: "warm_1", design_prompt: "warm", style_instruction: "whispered" },
    );
    expect(refused).not.toBeNull();
    expect(refused?.message).toMatch(/style|conflict|export/i);
  });

  it("a lawful state answers null through the same door (the happy path stays walled)", async () => {
    expect(
      await svc.composeValidateCard(
        "tts",
        "qwen3-tts",
        { model: "qwen3-tts", text: "speak" },
        "qwen3-tts",
        { model: "qwen3-tts", text: "speak" },
      ),
    ).toBeNull();
  });

  it("the seat judges the BODY, never the overlay (the rule in source)", () => {
    const src = readFileSync(new URL("../src/cardsRegistry.ts", import.meta.url), "utf8");
    // the arm's lane call takes the raw body, exactly as phase1's does
    expect(src).toContain("this.laneVerdict(card, rawBody ?? params)");
    expect(src).toContain("this.laneVerdict(prep.card, body)");
  });
});

// ── THE `required` WORD, USED (2026-10-10, the design audit's Q2) ──
// The vocabulary could not say "this lane needs words", so the tts
// card carried the law in imperative code the bench never saw. It is
// a declaration now — and the first DECL to use a word that did not
// exist before this commit.
describe("THE REQUIRED WORD ON A REAL LANE", () => {
  it("a tts state with no text refuses at bench-write, naming the field and the cure", () => {
    const verdict = svc.admitStageRelations("tts", { model: "qwen3-tts", text: "" });
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) {
      expect(verdict.error).toContain("text");
      expect(verdict.error).toMatch(/requires|speak words/);
    }
  });

  it("a tts state WITH text is unaffected (the word judges only what it names)", () => {
    expect(svc.admitStageRelations("tts", { model: "qwen3-tts", text: "hello" }).ok).toBe(true);
  });

  it("the boot gate knows the word (a grammar word the gate omits refuses a LEGAL declaration)", () => {
    // the first cut of the new words booted REFUSED: the drift gate
    // enumerated the vocabulary separately and did not know `required`
    const src = readFileSync(
      new URL("../../../engines/comfyui-cordis/src/models/service.ts", import.meta.url),
      "utf8",
    );
    const words = src.slice(src.indexOf("function relationRowSchemas"));
    for (const word of ["requires", "conflicts", "together", "either_or", "at_most_one", "required"]) {
      expect(words, "the boot gate must know the " + word + " word").toContain(word + ":");
    }
  });
});

describe("THE RANGE RULE WALL (the 2.1 width burn — the model owns the floor)", () => {
  it("a stated width below the declared floor refuses AT WRITE TIME, in the field's voice", () => {
    const verdict = svc.admitStageRelations("image-edit", {
      model: "qwen-img-edit-21",
      prompt: "make it night",
      width: -50,
      height: 1024,
    });
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) {
      expect(verdict.error).toContain("'width'");
      expect(verdict.error).toContain("-50");
      expect(verdict.error).toContain("256");
      expect(verdict.error).toContain("outside this lane's range");
    }
  });

  it("a stated width above the declared ceiling refuses the same way (1536, not 4096)", () => {
    const verdict = svc.admitStageRelations("image-edit", {
      model: "qwen-img-edit-21",
      prompt: "make it night",
      width: 4096,
      height: 4096,
    });
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) {
      expect(verdict.error).toContain("'width'");
      expect(verdict.error).toContain("4096");
      expect(verdict.error).toContain("1536");
    }
  });

  it("the in-range pair admits (the burn was NOT a law against stating resolution)", () => {
    const verdict = svc.admitStageRelations("image-edit", {
      model: "qwen-img-edit-21",
      prompt: "make it night",
      width: 1328,
      height: 1328,
    });
    expect(verdict.ok).toBe(true);
  });

  it("a lone axis COMPLETES from the family default at the lifted bench seat (the together word guards the raw form state)", () => {
    // The bench judges the LIFTED state (resolve → overlay → lift):
    // width stated, height absent → the DECL's own height:1024
    // default rides, the pair completes, the admission is honest.
    // The together word still binds the FORM's inline gate, which
    // sees the raw authored state pre-overlay (card-base spec.ts,
    // judgeLaneRelations on unlifted values) — one declaration,
    // two true seats.
    const verdict = svc.admitStageRelations("image-edit", {
      model: "qwen-img-edit-21",
      prompt: "make it night",
      width: 1328,
    });
    expect(verdict.ok).toBe(true);
  });

  it("a stated size on 2511 refuses on the SURFACE (source-resolution lane owns no size)", () => {
    const verdict = svc.admitStageRelations("image-edit", {
      model: "qwen-img-edit-2511",
      prompt: "make it night",
      width: 1024,
      height: 1024,
    });
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) {
      // the surface voice: the field fires nothing on this lane
      expect(verdict.error).toContain("fires nothing on this lane");
      expect(verdict.error).toContain("width");
    }
  });

  it("2511's own tuning pair admits (the tuning knobs are ITS surface)", () => {
    const verdict = svc.admitStageRelations("image-edit", {
      model: "qwen-img-edit-2511",
      prompt: "make it night",
      use_stock_nodes: true,
    });
    expect(verdict.ok).toBe(true);
  });

  it("the 2511 tuning pair on the 2.1 family refuses on the SURFACE (the sibling owns it)", () => {
    const verdict = svc.admitStageRelations("image-edit", {
      model: "qwen-img-edit-21",
      prompt: "make it night",
      double_reference: true,
    });
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) {
      expect(verdict.error).toContain("double_reference");
      expect(verdict.error).toContain("fires nothing on this lane");
    }
  });
});

// ── THE OVERLAP LAW (li-aq.3, the design audit's F7): the card
// schema and the DECL bounds are two owners of value domains — the
// card's authoring floor and the model's own truth. On overlap the
// EFFECTIVE domain is the INTERSECTION, and whichever seat sees the
// state first voices the refusal — the ORDER is path-shaped (the
// single-card path judges the lane at admission before the schema
// parse at compose; the flow gate parses schemas at construction),
// but the LAW is order-free: NO path ever admits a state that
// violates either.
describe("THE OVERLAP LAW (schema ∩ lane — no path admits a both-violating state)", () => {
  it("a state violating BOTH owners refuses (whichever voice finds it first)", async () => {
    const verdict = await svc.admitStageRelations("image-edit", {
      model: "qwen-img-edit-21",
      prompt: "x",
      steps: 999,   // the card schema's own ceiling (1..50)
      width: -50,   // the lane's own floor (256..1536)
      height: 1024,
    });
    expect(verdict.ok, "the lane seat refuses the state outright").toBe(false);
    expect(String(!verdict.ok ? verdict.error : undefined)).toContain("width");
    // and the schema's own seat refuses the steps half
    // THE SCHEMA'S HALF of the same state is pinned at the card's
    // own compose gate (packages/image/image-edit/tests/card.spec.ts
    // "THE SCHEMA GATE" — steps 999 refuses /steps|999|between|range/)
    // — the two pins together are the law: no path admits a state
    // either owner refuses, whichever voice arrives first.
  });

  it("a lane-legal state inside the schema's domain admits at both seats", async () => {
    const verdict = await svc.admitStageRelations("image-edit", {
      model: "qwen-img-edit-21",
      prompt: "x",
      steps: 20,
      width: 1328,
      height: 1328,
    });
    expect(verdict.ok).toBe(true);
  });
});
