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
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseSidecar } from "../src/queueSidecar.ts";
import { prepareCardParams } from "../src/cardsCompose.ts";
import { describe, it, expect, afterAll, beforeAll, vi } from "vitest";
import { installLaneStoreOverlay, restoreLaneStoreOverlay } from "../../../../tests/helpers/lane-store-overlay.ts";
import { Context } from "@deepseek-ai/cordis";
import { CardRegistryService, CardArmError, resolveCardOutputsOrThrow } from "../src/cardsRegistry.ts";
import * as composeSeat from "../src/cardsCompose.ts";
import { RUNS_ERROR_CODES } from "../src/runsErrorCodes.ts";
import { theService } from "@melite/comfyui-cordis";
import type { LaneRelations } from "@melite/contracts/laneRelations";
import { RELATION_WORDS } from "@melite/contracts/laneRelations";
import { FlowsSeatService } from "../src/flowsData.ts";

let svc: CardRegistryService;
let bootCtx: Context;

// the boot budget is sized for the FULL battery's oversubscription
// (the 10k-test fleet's transform/import load starved a 30s boot;
// idle it settles in a fraction — the budget holds the runner, not
// the hang)
beforeAll(async () => {
  bootCtx = new Context();

  new FlowsSeatService(bootCtx);
  // J12: the registry's dangling sweep reads the queue seat's
  // stateRoots manifest (config-named call data — no env seam); the
  // boot stub pins a temp tree so the sweep never touches real runs.
  (bootCtx as unknown as { queue: unknown }).queue = {
    stateRoot: mkdtempSync(join(tmpdir(), "cards-boot-")),
    stateRoots: [] as string[],
  };
  svc = new CardRegistryService(bootCtx);
  await svc.prime();

  // THE HERMETIC STORE (the lane-presence cure's seat): the gate's
  // declared arms now judge every lane file, and a compose spec's
  // subject is the card, not this machine's store. The overlay
  // mirrors the runtime store and materializes the declared-home
  // rows the real store lacks; the endpoint config (the compose
  // URL + the mount leg) stays ambient. Presence judgment itself
  // stays owned by cards-lanes.spec's fixture world.
  installLaneStoreOverlay();
}, 90_000);

/** The incident A body, verbatim in shape: the operator's state —
 *  CustomVoice synthesis, a design prompt for the persona export,
 *  no voice_name (the save mod's required name). */
const INCIDENT_A: Record<string, unknown> = {
  model: "qwen3-tts",
  variant: "customvoice",
  text: "The harbour lights at dusk.",
  design_prompt: "a warm, unhurried narrator with gravel in the low end",
};

afterAll(() => {
  restoreLaneStoreOverlay();
});

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

  it("the CURED state admits — ON THE DESIGN LANE (the signature canon recut, 2026-10-12: design_prompt + voice_name are the VoiceDesign lane's own inputs, never CustomVoice's)", () => {
    // the pair rides the lane upstream declares it on:
    // generate_voice_design(text, instruct, language)
    const verdict = svc.admitStageRelations("tts", {
      ...INCIDENT_A,
      variant: "voicedesign",
      voice_name: "harbour_gravel",
    });
    expect(verdict).toEqual({ ok: true });
    // ...and on CustomVoice the pair is now the GUI injury itself
    // (Voice Persona & Timbre rendered where upstream takes no such
    // input) — refused in the surface's own voice
    const cvVerdict = svc.admitStageRelations("tts", {
      ...INCIDENT_A,
      voice_name: "harbour_gravel",
    });
    expect(cvVerdict.ok).toBe(false);
    if (cvVerdict.ok === false) {
      expect(cvVerdict.error).toContain("field 'design_prompt' fires nothing on this lane");
    }
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

  it("THE LEGACY LANES DECLARE THEIR REQUIRED FIELD (the GAP-7 shape on seven cards — the RUN refuses what compose refused)", async () => {
    // 2026-10-10, the DECL audit's gap 4: image-gen, music, sfx,
    // motion, tagger, upscale-tools and input-prep each refused
    // their core field IMPERATIVELY at compose while the bench
    // admitted the same draft. Every boarded family now declares it,
    // so the bench refuses in the field's voice first — the model-
    // less rows meet it through the intersection, the named models
    // through their own family.
    const cases: Array<[string, string]> = [
      ["image-gen", "prompt"],
      ["music", "prompt"],
      ["sfx", "prompt"],
      ["motion", "prompt"],
      ["tagger", "input_image"],
      ["upscale-tools", "input_image"],
      ["input-prep", "source"],
    ];
    for (const [card, field] of cases) {
      const board = ((svc as unknown as { defsSync?: () => Map<string, { boarded?: readonly string[] }> }).defsSync?.() ?? new Map()).get(card);
      const fams = board?.boarded ?? [];
      expect(fams.length, `${card} boards families`).toBeGreaterThan(0);
      // THE NAMED HALF (the kill): a draft that names its family
      // meets the family's own word — the run's lane now refuses
      // BEFORE compose, in the field's voice.
      // THE INCOMPLETE-DRAFT LAW (2026-10-10): the ${field}-less
      // draft is bench state at the WRITE seat (adding a card must
      // land — the operator types the field next), and the RUN seat
      // refuses it in the declared word.
      for (const fam of fams) {
        const named = svc.admitStageRelations(card, { model: fam });
        expect(named.ok, `${card}/${fam}: a ${field}-less draft is bench state`).toBe(true);
        await expect(
          svc.phase1Card({ model: fam, [field]: "" }, fam),
        ).rejects.toThrow(new RegExp(field));
        const withField = svc.admitStageRelations(card, { model: fam, [field]: "x" } as Record<string, unknown>);
        expect(withField.ok, `${card}/${fam} admits its ${field}`).toBe(true);
      }
    }
    // THE MODEL-LESS STAND-DOWN IS THE DOCUMENTED LEGACY LAW (stated
    // here so the gap is not mistaken for a hole): a family that
    // declares no params SURFACE takes no part in the model-less
    // intersection (the card's own union table authors those fields),
    // so a model-less row on these legacy cards still admits — the
    // lane it will compose is decided by the run's selection, and the
    // named half above is where the refusal lands. The families that
    // DO declare a surface (the tts and edit pair) meet their rows
    // model-lessly, as cards-lane-law pins elsewhere.
  });

  it("the design lane's export pair is REQUIRED (the GAP-7 shape one lane over — the RUN refuses what compose refused)", async () => {
    // 2026-10-10, the DECL audit's gap 3: the compose seat refused a
    // design-lane row with NEITHER half, but the family's together
    // word fires only when a member is STATED — so that state was
    // bench-ADMITTED and run-refused. The design lane now declares the
    // pair as required (it exists to export).
    const neither = svc.admitStageRelations("tts", {
      model: "qwen3-tts-voicedesign",
      variant: "voicedesign",
      text: "the sample",
    });
    // THE INCOMPLETE-DRAFT LAW (2026-10-10): the write seat admits
    // the half-stated draft — a card under construction is bench
    // state — and the RUN seat refuses it in the declared word.
    expect(neither.ok).toBe(true);
    await expect(
      svc.phase1Card({
        model: "qwen3-tts-voicedesign", variant: "voicedesign", text: "the sample",
      }, "qwen3-tts-voicedesign"),
    ).rejects.toThrow(/design lane exports a voice|voice_name/);
    // the pair stated composes (the cure stands)
    const both = svc.admitStageRelations("tts", {
      model: "qwen3-tts-voicedesign",
      variant: "voicedesign",
      text: "the sample",
      voice_name: "warm_1",
      design_prompt: "a warm narrator",
    });
    expect(both.ok).toBe(true);
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
      // ONE LAW, ONE LAYER (2026-10-10, the DECL audit's gap 8): the
      // 1.7B family carried this row at BOTH the family and the
      // customvoice-variant level (the 0.6B sibling states it at
      // family level only) — the duplicate is gone, and the voice is
      // the family's own row.
      expect(verdict.error).toContain("performs no saved persona");
      expect(verdict.error).toContain("an export creates the voice");
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

  // THE EMPTY-SELECTION LAW (2026-10-10, the operator's live bench:
  // 'bench stage "s_0": card_compose phase 1: unknown quant "" for
  // model "z-image" variant "turbo" (known: int8)') — a stated EMPTY
  // variant/quant/model is not a selection, it is a form's unchosen
  // control written as a value. The run door refuses it, so admitting
  // it is the parity law's false admit. The write seat refuses HERE
  // in the run door's own voice. A stated WRONG value still passes
  // (the tolerance above: repairable, the run names it).
  it("a stated EMPTY selection refuses at the write door, in the run door's voice", () => {
    const verdict = svc.admitStageRelations("tts", {
      model: "qwen3-tts",
      variant: "",
      text: "x",
    });
    expect(verdict.ok).toBe(false);
    expect((verdict as { error: string }).error).toMatch(/variant/i);
  });

  it("an empty quant on a real variant refuses too (the operator's exact face)", () => {
    const verdict = svc.admitStageRelations("image-gen", {
      model: "z-image",
      variant: "turbo",
      quant: "",
      prompt: "a cat",
    });
    expect(verdict.ok).toBe(false);
    expect((verdict as { error: string }).error).toMatch(/quant/);
  });

  it("an ABSENT selection still passes (authoring tolerance — compose defaults it)", () => {
    expect(svc.admitStageRelations("tts", { model: "qwen3-tts", text: "x" })).toEqual({ ok: true });
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

  it("EVERY card claims nothing its declaring families did not declare (the full-claim bind, all cards)", () => {
    // THE AUDIT'S GAP 9b: the reverse bind existed for tts alone —
    // every other card's schemaNames were trusted on faith, so a
    // card claiming a field no boarded family declares stayed green
    // through every wall. Same law, every declaring card: skip only
    // cards whose board carries no surface-declaring family (a
    // model-less card unit has no declaring family to bind).
    const facts = svc.modelFacts();
    const decls = svc.cardDecls();
    let judged = 0;
    for (const [card, declRow] of Object.entries(decls)) {
      const boarded: readonly string[] =
        (declRow as { boarded?: readonly string[] }).boarded ?? [];
      const declaring = [
        ...new Set(boarded.map((id) => svc.resolveCardFamily(id, facts))),
      ].filter((fam) => facts[fam]?.params !== undefined);
      if (declaring.length === 0) continue;
      judged += 1;
      const union = new Set<string>();
      for (const fam of declaring) {
        const row = facts[fam]!;
        for (const name of [
          ...(row.params ?? []),
          ...row.variants.flatMap((v) => [...(v.params ?? [])]),
        ]) union.add(name);
        for (const name of modFieldsOf(card, fam)) union.add(name);
      }
      for (const name of declRow.schemaNames) {
        expect(
          union.has(name),
          `card ${card} claims '${name}' but no boarded family declares it`,
        ).toBe(true);
      }
    }
    expect(judged, "at least one card binds against declaring families (else this wall is vacuous)").toBeGreaterThan(0);
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
      // EVERY WORD (the audit's GAP 9: `at_most_one` members and
      // `required` fields were never collected — a dead
      // `required: ["nonsense"]` sailed through this wall while the
      // same typo in `requires` refused. A grammar word the wall
      // cannot see is a word nothing judges. Both words carry
      // {fields} rows, like every other word in the grammar.)
      for (const r of rel.at_most_one ?? []) out.push(...r.fields);
      for (const r of rel.required ?? []) out.push(...r.fields);
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
    // THE LANE ADDRESS (the signature canon recut, 2026-10-12): the
    // design lane is the family atom + variant 'voicedesign' — the
    // old arm addressed it by the route id, which selects the HEAD
    // lane and only admitted under the pre-canon base-surface leak.
    // neither export half stated = in progress
    expect(svc.admitStageRelations("tts", {
      model: "qwen3-tts-voicedesign", variant: "voicedesign", text: "read this",
    })).toEqual({ ok: true });
    // the pair stated = the export the lane exists for
    expect(svc.admitStageRelations("tts", {
      model: "qwen3-tts-voicedesign", variant: "voicedesign",
      text: "read this",
      voice_name: "harbour_gravel",
      design_prompt: "a warm narrator",
    })).toEqual({ ok: true });
    // half the pair = the wound, refused
    expect(svc.admitStageRelations("tts", {
      model: "qwen3-tts-voicedesign", variant: "voicedesign",
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

  it("the cured state composes phase 1 (the door and the run agree — on the lane the canon gives the pair)", async () => {
    const phase1 = await svc.phase1Card(
      { ...INCIDENT_A, model: "qwen3-tts-voicedesign", variant: "voicedesign", voice_name: "harbour_gravel" },
      "qwen3-tts-voicedesign",
    );
    expect(phase1.fam).toBe("qwen3-tts-voicedesign");
  });

  it("a legacy family composes phase 1 untouched (the run gate judges only declared lanes)", async () => {
    const phase1 = await svc.phase1Card(
      { model: "z-image", prompt: "x" },
      "z-image",
    );
    expect(phase1.fam).toBe("z-image");
  });
});

describe("THE OPERATOR'S FACE (the 2026-09-29 outage, pinned 2026-09-29)", () => {
  // The reported surface read "Generate Image: lane 'krea-2/turbo'
  // refuses the state: this lane requires 'prompt' — 'prompt' is not
  // stated — every image lane states WHAT the picture is — write the
  // prompt" AT THE RUN DOOR. The doors themselves were never the bug
  // (the typed prompt died upstream in the studio's silent bench
  // write), but the refusal arriving at the RUN door means the write
  // door's same-voice refusal was never met — because the write never
  // happened. This pins BOTH doors on the exact state the operator
  // saw: the bench-write door refuses the promptless krea-2/turbo
  // draft FIRST, in the field's voice; the run seat refuses the same
  // state with the SAME lane voice; the cured draft composes. If the
  // two doors ever diverge on this face again, this wall is red.
  const PROMPTLESS = { model: "krea-2", variant: "turbo" } as Record<string, unknown>;

  // THE INCOMPLETE-DRAFT LAW (2026-10-10, the operator's second
  // face, which OVERTURNED this arm): "I CAN'T ADD CARDS" — the add
  // door seeds the axes with no content, so a write-door
  // required-word refusal made adding an image IMPOSSIBLE ("THERE
  // SHOULD HAVE BEEN A CONTRACT, SO USERS CAN ADD CARDS"). An
  // unstated required word is the RUN door's voice; the write door
  // judges only states that can never compose. The run seat below
  // still refuses the promptless draft in the field's own voice —
  // the contract is complete, the operator hears it at the press.
  it("the write door ADMITS the promptless draft (a card under construction is bench state)", () => {
    const verdict = svc.admitStageRelations("image-gen", PROMPTLESS);
    expect(verdict, "adding an image card must land: the prompt comes next, in the drill").toEqual({ ok: true });
  });

  it("a STATED-but-wrong state still refuses at the write door (the incomplete-draft law is narrow)", () => {
    const undeclared = svc.admitStageRelations("image-gen", { ...PROMPTLESS, frobnicate: 1 });
    expect(undeclared.ok).toBe(false);
    const outOfEnvelope = svc.admitStageRelations("image-gen", { ...PROMPTLESS, steps: 5000 });
    expect(outOfEnvelope.ok, "a number outside the declared envelope can never compose — it refuses HERE").toBe(false);
  });

  it("the run seat refuses the same state in the DECL's own voice (the law's run door)", async () => {
    // THE FOUR-AGENT LAW AUDIT'S ONE VIOLATION, restored (2026-10-10):
    // the incomplete-draft filter had crept into the SHARED judge, so
    // the run seat stopped hearing the required word and the DECL
    // went decorative — enforcement survived only as the card's
    // imperative belt ('required param prompt missing or empty',
    // image-gen's own copy of the law). The filter is SEAT-SCOPED
    // now: the WRITE door admits the unstated word (the pin above),
    // the RUN seat judges the declaration — li-o's own law, "no card
    // needs a hand-written copy of the law to be safe at Run". The
    // belt stays as backstop for families that declare nothing; the
    // DECL's sentence is the voice the press meets, and it names the
    // field and the cure in one line.
    await expect(
      svc.phase1Card({ ...PROMPTLESS }, "krea-2"),
    ).rejects.toThrow(/this lane requires 'prompt'.*write the prompt/);
  });

  // THE REFUSAL CLASS CODE (2026-10-18, the replayed-refusal bug):
  // the operator opened image-gen and met the error at once — a
  // past refused press had written its refusal onto the row as a
  // terminal failure, and every later open replayed it. The run
  // seat now CODES the incomplete class distinctly, so the client
  // can keep an UNSTATED required word off the run face (bench
  // state under construction — the same class the write door's
  // incomplete-draft law admits) while a stated-wrong verdict
  // still carries as a failure. Pinned on both classes.
  it("the run seat CODES the unstated-required class (never a run face, never a replay)", async () => {
    const thrown = await svc.phase1Card({ ...PROMPTLESS }, "krea-2").then(
      () => null,
      (e: unknown) => e as CardArmError,
    );
    expect(thrown, "the promptless draft must refuse at the press").toBeInstanceOf(CardArmError);
    expect((thrown as CardArmError).code).toBe("card_compose_incomplete");
  });

  it("a stated-wrong verdict keeps the compose code (it carries as a failure)", async () => {
    const thrown = await svc.phase1Card(
      { ...PROMPTLESS, prompt: "x", frobnicate: 1 },
      "krea-2",
    ).then(
      () => null,
      (e: unknown) => e as CardArmError,
    );
    expect(thrown).toBeInstanceOf(CardArmError);
    expect((thrown as CardArmError).code).toBe("card_compose");
    expect((thrown as CardArmError).message).not.toContain("this lane requires");
  });

  it("the cured draft (prompt stated) composes phase 1 — the door and the run agree", async () => {
    const phase1 = await svc.phase1Card(
      { ...PROMPTLESS, prompt: "a red bicycle against a white wall" },
      "krea-2",
    );
    expect(phase1.fam).toBe("krea-2");
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

  // THE ONE SANCTIONED DIVERGENCE (the law audit's F4 — the parity
  // table could not see the incomplete-draft filter at all): an
  // UNSTATED required word is the single state class where the two
  // seats DELIBERATELY disagree — the write door admits (a card
  // under construction is bench state; the operator types the
  // prompt next), the run door refuses in the lane's own sentence.
  // It is pinned HERE, beside the table, as law — so it can never
  // ride the table itself (a door-admitted lane refusal there would
  // be red, correctly), and so the divergence can never silently
  // widen: any OTHER write-admits/run-refuses lane state is the
  // parity bug the table above exists to catch.
  it("the one sanctioned divergence: an unstated required word (the write door admits, the run refuses)", async () => {
    const PROMPTLESS = { model: "krea-2", variant: "turbo" } as Record<string, unknown>;
    expect(svc.admitStageRelations("image-gen", PROMPTLESS).ok).toBe(true);
    await expect(
      svc.phase1Card({ ...PROMPTLESS }, "krea-2"),
    ).rejects.toThrow(/this lane requires 'prompt'.*write the prompt/);
  });
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
  // THE MINTED-MODEL REGRESSION KILL (2026-10-12, the operator's
  // live refusal): a card that boards nothing is its own ROUTING
  // key (the GUI's Run press names the card id; the compose seam
  // lanes it on modelId==='' — cardsCompose's familyless arm), but
  // this check refused the very id that arm requires — "model
  // 'mask' is not offered by card 'mask' (boards: none)" — every
  // model-less card's Run died at the press. The roster is DERIVED
  // from the live defs (a future model-less card rides unasked).
  it("a model-less card admits its OWN id (the card-unit arm) — the Run press's routing key", async () => {
    const { loadCardDefs } = await import("../../../../packages/engines/comfyui-cordis/src/cardDefs.ts");
    const defs = await loadCardDefs();
    const roster = [...defs.entries()].filter(([, d]) => (d.boarded ?? []).length === 0);
    expect(roster.length > 0, "the census found model-less cards (mask, rig) — a judge over zero rows is a vacuous pass").toBe(true);
    for (const [id] of roster) {
      expect(svc.admitStageModel(id, id).ok, `card-unit alias '${id}' admits`).toBe(true);
    }
  });
  it("any OTHER id on a model-less card still refuses — the alias is the card arm, never a model offer", () => {
    const verdict = svc.admitStageModel("mask", "sam2.1_hiera_large.pt");
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) {
      expect(verdict.error).toContain("sam2.1_hiera_large.pt");
      expect(verdict.offered).toEqual([]);
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
  it("CONTENT typing: present-but-non-string pipeline/status quarantines (strictness fix 7)", () => {
    expect(parseSidecar({ pipeline: 42 })).toBeNull();
    expect(parseSidecar({ status: 42 })).toBeNull();
    // absent keys stay legal (found-ness is the file-era convention)
    expect(parseSidecar({ stages: [{ id: "s" }] })).not.toBeNull();
  });
  it("a nested request record is what request returns (the check is live, not theater)", () => {
    const parsed = parseSidecar({ request: { card: "x" }, stages: [] });
    expect(parsed!.request).toEqual({ card: "x" });
    expect(parseSidecar({ request: 42 })).toBeNull();
    expect(parseSidecar({ request: "x" })).toBeNull();
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
    // THE TOLERANCE IS GONE (the audit's GAP 7): the model-less arm
    // used to bare-return null, so a draft tts row without `text`
    // (required by every family the card boards) was bench-admitted
    // while the form refused it. The arm now returns the DRAFT
    // INTERSECTION verdict — the words every boarded declaring
    // family agrees on — so the pin holds the call, not a blanket
    // tolerance. (The familyless card still stands down: the
    // verdict returns null when nothing declares.) The call carries
    // the SEAT param (the law audit's fix): only the write door's
    // caller passes admitIncomplete=true — every other seat judges
    // the declaration strict.
    // ONE-FACTS-READ threads the door's table through the draft
    // verdict too (round-22 audit Q3b) — the pin holds the call
    // with the facts seat riding last.
    expect(arm).toContain("return this.modellessDraftVerdict(card, params, admitIncomplete, factsArg);");
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

  it("a missing facts file degrades through the whole arm — one table, no raw escape (round-22 audit Q3b)", async () => {
    // ONE-FACTS-READ: the door degrades its one read to {} by
    // policy and threads it here — the internal prepare, the
    // admission gates and the lane verdict all judge the SAME
    // degraded table. Before the thread, the internal prepare
    // re-read strict and the missing file escaped raw past the
    // door (a 500 where the door's own first prepare had already
    // answered degraded). The wall pins the one-table property
    // directly: the seat's answer EQUALS the door-side degraded
    // prepare's refusal, word for word — two judges, one table,
    // one voice, never a second strict read beside the degraded
    // first.
    const body = { model: "qwen3-tts", text: "speak" };
    let doorVoice = "";
    try {
      prepareCardParams(svc, { ...body }, "qwen3-tts", "1", {});
    } catch (e) {
      doorVoice = (e as Error).message;
    }
    expect(doorVoice).toMatch(/outside the cordis plane/);
    const strict = svc.modelFacts.bind(svc);
    (svc as unknown as { modelFacts: unknown }).modelFacts = (): Record<string, unknown> => {
      throw new Error("ENOENT: no such file or directory, open 'model-facts.json'");
    };
    try {
      const refused = await svc.composeValidateCard(
        "tts",
        "qwen3-tts",
        { ...body },
        "qwen3-tts",
        { ...body },
        {},
      );
      expect(refused?.message).toBe(doorVoice);
    } finally {
      (svc as unknown as { modelFacts: unknown }).modelFacts = strict;
    }
  });

  it("an UNSTATED required word refuses at the validate seat too — the DECL is not decorative here (the law audit's F3)", async () => {
    // The incomplete-draft filter is seat-scoped: it admits at the
    // WRITE door only. Validate composes — it judges the declaration
    // strict, in the lane's own sentence, exactly like the run seat.
    const refused = await svc.composeValidateCard(
      "image-gen",
      "krea-2",
      { model: "krea-2", variant: "turbo" },
      "krea-2",
      { model: "krea-2", variant: "turbo" },
    );
    expect(refused).not.toBeNull();
    // ONE CODE SET, BOTH SEATS (wire-chain F1, 2026-10-20): the
    // validate seat once answered its own `lane_refusal` spelling —
    // a code RUNS_ERROR_CODES never tabled, so the runs validate
    // door's unmapped-code guard LOUD-threw and crashed on the very
    // refusal it existed to answer. The verdict now rides the same
    // incomplete-distinct code the run seat throws; the door maps
    // it to runs/card-compose-incomplete and the client heals.
    expect(refused?.code).toBe("card_compose_incomplete");
    expect(refused?.message).toMatch(/this lane requires 'prompt'/);
  });

  it("the table walks the union — the validate seat's answer codes are RUNS_ERROR_CODES keys (wire-chain F1's wall)", async () => {
    // The compile-time wall: the seat's return type IS the table's
    // key union (cardsRegistry's signature), so an untabled code
    // fails typecheck at the producer. This arm pins that the
    // runtime answers stay inside the table — the wall cannot be
    // unwired without failing here first.
    const refused = await svc.composeValidateCard(
      "image-gen",
      "krea-2",
      { model: "krea-2", variant: "turbo" },
      "krea-2",
      { model: "krea-2", variant: "turbo" },
    );
    const tabled: readonly string[] = Object.keys(RUNS_ERROR_CODES);
    expect(tabled).toContain(refused?.code as string);
    expect(tabled).not.toContain("lane_refusal");
  });

  it("the seat judges the BODY, never the overlay (the rule in source)", () => {
    const src = readFileSync(new URL("../src/cardsRegistry.ts", import.meta.url), "utf8");
    // the arm's lane call takes the raw body, exactly as phase1's
    // does — the DETAILED verdict since F1 (the incomplete class
    // codes distinctly here too)
    // ONE-FACTS-READ (round-22 audit Q3b): the lane call
    // threads the door's one facts read last — the BODY rule is
    // unchanged (rawBody ?? params still rides, never the overlay).
    expect(src).toContain("this.laneVerdictDetailed(card, rawBody ?? params, false, factsArg)");
    expect(src).toContain("this.laneVerdictDetailed(prep.card, body)");
  });
});

// ── THE `required` WORD, USED (2026-10-10, the design audit's Q2) ──
// The vocabulary could not say "this lane needs words", so the tts
// card carried the law in imperative code the bench never saw. It is
// a declaration now — and the first DECL to use a word that did not
// exist before this commit.
describe("THE REQUIRED WORD ON A REAL LANE", () => {
  it("a tts state with no text is bench state; the RUN seat refuses it, naming the field", async () => {
    // THE INCOMPLETE-DRAFT LAW (2026-10-10): an unstated required
    // word is the run door's voice; the write door judges only
    // states that can never compose.
    const verdict = svc.admitStageRelations("tts", { model: "qwen3-tts", text: "" });
    expect(verdict.ok).toBe(true);
    await expect(
      svc.phase1Card({ model: "qwen3-tts", text: "" }, "qwen3-tts"),
    ).rejects.toThrow(/text/);
  });

  it("a tts state WITH text is unaffected (the word judges only what it names)", () => {
    expect(svc.admitStageRelations("tts", { model: "qwen3-tts", text: "hello" }).ok).toBe(true);
  });

  it("the MODEL-LESS draft row meets the same word AT THE RUN SEAT (the audit's GAP 7: the form, the run, and now the bench in one voice)", async () => {
    // no model at all — the draft intersection judges the words
    // every boarded declaring family states; `required: text` is
    // one on both tts families, so the draft refuses exactly the
    // state the form refuses.
    // THE INCOMPLETE-DRAFT LAW (2026-10-10): the model-less row with
    // no text is bench state too — the words ride the run door, which
    // composes the card's own default family and refuses the same
    // state the form refuses.
    const no = svc.admitStageRelations("tts", { text: "" });
    expect(no.ok).toBe(true);
    await expect(
      svc.phase1Card({ text: "" }, "qwen3-tts"),
    ).rejects.toThrow(/text/);
    const yes = svc.admitStageRelations("tts", { text: "hello" });
    expect(yes.ok).toBe(true);
    // a family whose families agree on nothing extra stays tolerant:
    // an unknown key on a model-less row still hits the key gate's
    // voice, not a family word
    const famless = svc.admitStageRelations("mask-studio", {});
    expect(famless.ok).toBe(true);
  });

  it("the intersection AGREES BY MEMBERS, not by prose — differing CURE text does not empty a word (the audit, 2026-09-28)", () => {
    // The row key deliberately drops `cure` (a family may word its
    // cure differently and the words must still agree), and that
    // exclusion was UNPINNED: the audit removed `delete row["cure"]`
    // and 69/69 stayed green, because the only cure-divergent row in
    // the estate is unreachable behind the undeclared-key gate. So
    // the law is driven over the KEY ITSELF, on the real function,
    // with the one input that distinguishes it: two families
    // stating the same word with different cure prose.
    //
    // The law: the key is the row MINUS cure (with arrays sorted),
    // so differing prose cannot empty a word two families declared.
    const src = readFileSync(
      new URL("../src/cardsRegistry.ts", import.meta.url),
      "utf8",
    );
    // the exclusion is IN the source (the row key is private, so the
    // honest pin is: it is there, it deletes the cure, and it is the
    // ONLY thing it deletes)
    const keyBody = src.match(/const rowKey = \(r: unknown\): string => \{([\s\S]*?)\n {4}\};/);
    expect(keyBody, "the row key exists where this arm reads it").not.toBeNull();
    const body = keyBody![1] as string;
    const deletes = [...body.matchAll(/delete row\["([^"]+)"\]/g)].map((m) => m[1]!);
    expect(deletes, `the row key excludes exactly the cure prose (saw ${JSON.stringify(deletes)})`)
      .toEqual(["cure"]);
    // and the members are what bind: the row's own verbatim JSON is
    // NEVER the key (that is the bug the exclusion fixed — a
    // verbatim key empties the intersection the moment two families
    // word their cures differently). The only stringify of the raw
    // value left is the non-object branch, which has no members.
    const rawKey = body.replace(/if \(r === null \|\| typeof r !== "object"\) return JSON\.stringify\(r\);/, "");
    expect(rawKey, "the row key is never the row's verbatim JSON").not.toMatch(/JSON\.stringify\(r\)/);
    // the sort is there too (a family's array order is not a
    // disagreement)
    expect(body).toMatch(/\.sort\(\)/);
  });

  it("a DESIGNED sibling disagreement empties the word — the intersection is never a union (image-edit, pinned 2026-10-10)", () => {
    // qwen-img-edit-21 declares together: [width, height] (its lane
    // carries the pair); qwen-img-edit-2511's surface carries NEITHER
    // field (it edits at source resolution — the fields are not a
    // slower path there, they are a lane the family does not have).
    // The member-keyed intersection of the together rows is therefore
    // EMPTY BY DESIGN, and a model-less image-edit row holding
    // width-without-height ADMITS — as long as the AGREEING words
    // (prompt, the anchor) are satisfied. A union would false-refuse
    // the width state in a voice no boarded family speaks — the pin
    // holds the intersection, not the louder law.
    const base = { prompt: "make it warmer", image1: "x.png" };
    const row = svc.admitStageRelations("image-edit", { ...base, width: 1024 });
    expect(row.ok).toBe(true);
    // The FAMILY row admits for a different, pinned reason: the
    // family's declared defaults complete the pair at the stamp
    // (width AND height default 1024), so `together` is SATISFIED,
    // not skipped — the word and the defaults are one concert. If
    // the defaults ever leave the DECL, this admit flips to the
    // word's refusal; if the intersection ever becomes a union, the
    // row above flips. Both directions are deliberate edits, and
    // this pin makes them touch a test.
    const fam = svc.admitStageRelations("image-edit", { ...base, model: "qwen-img-edit-21", width: 1024 });
    expect(fam.ok).toBe(true);
  });

  it("the edit compose law is a DECL now — prompt-less and anchor-less drafts refuse at the RUN seat (the GAP-7 shape, killed)", async () => {
    // 2026-10-10, the DECL audit's row 2: compose has refused a
    // prompt-less or anchor-less edit imperatively since the merge,
    // while the bench admitted the same drafts — a state the form
    // could build and the run refused. Both edit families now state
    // the rows verbatim (member-wise agreement), so the MODEL-LESS
    // draft meets them through the intersection, and a NAMED model
    // meets its own family's words — the same voice compose speaks,
    // before the run.
    // THE INCOMPLETE-DRAFT LAW (2026-10-10): both drafts are bench
    // state; the RUN seat refuses each in the declared word — the
    // same voice compose has always spoken, at the press.
    // the family comes from the card's OWN boarding (a hardcoded id
    // rots the moment the edit families are re-slotted — the run
    // seat answered 'no facts row' for a retired id)
    const editFam = ((svc as unknown as { defsSync?: () => Map<string, { boarded?: readonly string[] }> }).defsSync?.() ?? new Map())
      .get("image-edit")?.boarded?.[0] ?? "";
    expect(editFam, "image-edit boards a family").not.toBe("");
    const bare = svc.admitStageRelations("image-edit", {});
    expect(bare.ok).toBe(true);
    await expect(svc.phase1Card({}, editFam)).rejects.toThrow(/prompt/);
    const anchorless = svc.admitStageRelations("image-edit", { prompt: "make it warmer" });
    expect(anchorless.ok).toBe(true);
    await expect(
      svc.phase1Card({ prompt: "make it warmer" }, editFam),
    ).rejects.toThrow(/input_images|image1|anchor/i);
    // the legacy vocabulary is a legal anchor (the merge's own law)
    const legacy = svc.admitStageRelations("image-edit", { prompt: "make it warmer", image1: "x.png" });
    expect(legacy.ok).toBe(true);
    // the named model meets its own family's words — at the run
    const fam = svc.admitStageRelations("image-edit", { model: editFam, prompt: "warm" });
    expect(fam.ok).toBe(true);
    await expect(
      svc.phase1Card({ model: editFam, prompt: "warm" }, editFam),
    ).rejects.toThrow(/input_images|image1|anchor/i);
  });

  it("tts siblings AGREE on the voice_name x style_instruction row — the model-less intersection holds it (the DECL audit's row 5)", () => {
    // 2026-10-10: the 0.6B family stated the row at FAMILY level
    // while voicedesign carried it only on its customvoice VARIANT —
    // the member-keyed intersection emptied, so a model-less draft
    // held voice_name+style_instruction while every boarded lane
    // refused it (surface or variant word). The row now rides the
    // FAMILY layer on both siblings, and the model-less draft meets
    // it through the intersection — the same voice every lane
    // speaks.
    const held = svc.admitStageRelations("tts", {
      voice_name: "warm_1",
      style_instruction: "speak warmly",
      text: "hello",
    });
    expect(held.ok).toBe(false);
    if (!held.ok) expect(held.error).toMatch(/voice_name|style_instruction/);
    // the export pair alone stays legal (the style is the conflict,
    // not the export) — ON THE DESIGN LANE, the only surface the
    // signature canon gives the pair (a bare family atom selects the
    // head/customvoice lane, where the pair now refuses).
    const exportOnly = svc.admitStageRelations("tts", {
      model: "qwen3-tts-voicedesign",
      variant: "voicedesign",
      voice_name: "warm_1",
      design_prompt: "a warm narrator",
      text: "hello",
    });
    expect(exportOnly.ok).toBe(true);
    // and each named family still refuses it in its own voice
    const fam = svc.admitStageRelations("tts", {
      model: "qwen3-tts-voicedesign",
      voice_name: "warm_1",
      style_instruction: "speak warmly",
      text: "hello",
    });
    expect(fam.ok).toBe(false);
  });

  it("the boot gate READS the vocabulary (a hand list is how a legal declaration used to refuse)", () => {
    // The first cut of the new words booted REFUSED: the drift gate
    // enumerated the vocabulary separately and did not know `required`.
    // The second cut listed all six — and was still a SECOND list, so
    // a seventh word would land in the grammar and bind in no gate.
    // The gate now READS the declared wrapper's own dict, and the
    // seats that enumerate the words derive one key list. This pin
    // holds the derivation (the old one held the list's existence).
    const src = readFileSync(
      new URL("../../../engines/comfyui-cordis/src/models/service.ts", import.meta.url),
      "utf8",
    );
    const gate = src.slice(src.indexOf("function relationRowSchemas"));
    expect(gate, "the gate reads the grammar's own dict").toContain(".dict");
    expect(gate, "the gate takes each word's ROW schema (the array's element)").toContain(".inner");
    expect(gate, "and no longer retypes the words").not.toMatch(/requires:\s*Param/);
    // the derived list covers every word the floor declares, and the
    // floor's list is the only enumeration left
    expect(Object.keys(RELATION_WORDS).sort()).toEqual(
      ["at_most_one", "conflicts", "either_or", "required", "requires", "together"],
    );
    const registry = readFileSync(
      new URL("../src/cardsRegistry.ts", import.meta.url),
      "utf8",
    );
    expect(registry, "the model-less intersection derives its words too").toContain("RELATION_WORDS");
    expect(registry, "and no longer names them").not.toMatch(/"requires",\s*"conflicts"/);
  });
});

describe("THE RANGE RULE WALL (the 2.1 width burn — the model owns the floor)", () => {
  it("a stated width below the declared floor refuses AT WRITE TIME, in the field's voice", () => {
    const verdict = svc.admitStageRelations("image-edit", {
      model: "qwen-img-edit-21",
      prompt: "make it night",
      image1: "x.png",
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
      image1: "x.png",
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
      image1: "x.png",
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
      image1: "x.png",
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
      image1: "x.png",
      use_stock_nodes: true,
    });
    expect(verdict.ok).toBe(true);
  });

  it("the 2511 tuning pair on the 2.1 family refuses on the SURFACE (the sibling owns it)", () => {
    const verdict = svc.admitStageRelations("image-edit", {
      model: "qwen-img-edit-21",
      prompt: "make it night",
      image1: "x.png",
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
      image1: "x.png",
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
      image1: "x.png",
      steps: 20,
      width: 1328,
      height: 1328,
    });
    expect(verdict.ok).toBe(true);
  });
});

// ── THE OUTPUT-RESOLUTION SEAM (round-22 compose audit Q4a) ────
// VALIDATE-RESOLVES-OUTPUTS: validate composed the phase-1 graph
// and discarded it, so every phase-2 output refusal answered
// validate-green/start-refuse on the binding cards (4 of 10 seed
// flows reachable). The seat resolves over its graph through the
// shared seam now — same params, same graph, same refusal. These
// arms drive the seam directly (synthetic defs + hand graphs, no
// engine): the four refusal classes the audit's probe proved,
// the two Q5a catch-all shapes, the happy path, and the unknown
// card. The seat's wiring rides the same fold its compose arm
// does — a CardArmError becomes this seat's verdict.
describe("THE OUTPUT-RESOLUTION SEAM AT BOTH SEATS", () => {
  const oneBinding = (over?: {
    channel?: string;
    node?: string;
    nodeClass?: string;
    when?: (params: Record<string, unknown>) => boolean;
  }) => ({
    id: "probe",
    flowKinds: { inputs: {}, outputs: { wav: "audio" }, requiresModel: false },
    flowOutputBindings: [
      {
        channel: over?.channel ?? "wav",
        node: over?.node ?? "SaveAudio.0",
        nodeClass: over?.nodeClass ?? "SaveAudio",
        ...(over?.when !== undefined ? { when: over.when } : {}),
      },
    ],
  });
  const defsOf = (
    def: Pick<
      { id: string; flowKinds: { inputs: Record<string, string>; outputs: Record<string, string>; requiresModel: boolean }; flowOutputBindings?: readonly { channel: string; node: string; nodeClass: string; when?: (params: Record<string, unknown>) => boolean }[] },
      "id" | "flowKinds" | "flowOutputBindings"
    >,
  ) => new Map([["probe", def]]);

  it("a missing selected node refuses with the run seat's voice", () => {
    let refusal: CardArmError | null = null;
    try {
      resolveCardOutputsOrThrow(defsOf(oneBinding()), "probe", {}, {});
    } catch (e) {
      refusal = e as CardArmError;
    }
    expect(refusal?.code).toBe("card_compose");
    expect(refusal?.message).toBe(
      "flow-output: card 'probe' output 'wav' expects SaveAudio.0 as SaveAudio, got missing",
    );
  });

  it("a class-mismatched node refuses naming the found class", () => {
    let refusal: CardArmError | null = null;
    try {
      resolveCardOutputsOrThrow(
        defsOf(oneBinding()),
        "probe",
        {},
        { "SaveAudio.0": { class_type: "Wrong" } },
      );
    } catch (e) {
      refusal = e as CardArmError;
    }
    expect(refusal?.code).toBe("card_compose");
    expect(refusal?.message).toContain("got Wrong");
  });

  it("a binding on an undeclared channel refuses", () => {
    let refusal: CardArmError | null = null;
    try {
      resolveCardOutputsOrThrow(defsOf(oneBinding({ channel: "ghost" })), "probe", {}, {});
    } catch (e) {
      refusal = e as CardArmError;
    }
    expect(refusal?.code).toBe("card_compose");
    expect(refusal?.message).toContain("binds undeclared output 'ghost'");
  });

  it("two producers on one channel refuse", () => {
    const def = oneBinding();
    let refusal: CardArmError | null = null;
    try {
      resolveCardOutputsOrThrow(
        defsOf({ ...def, flowOutputBindings: [...def.flowOutputBindings, ...def.flowOutputBindings] }),
        "probe",
        {},
        { "SaveAudio.0": { class_type: "SaveAudio" } },
      );
    } catch (e) {
      refusal = e as CardArmError;
    }
    expect(refusal?.code).toBe("card_compose");
    expect(refusal?.message).toContain("more than one producer");
  });

  it("a throwing when maps to the flow-output voice (the Q5a shape)", () => {
    let refusal: CardArmError | null = null;
    try {
      resolveCardOutputsOrThrow(
        defsOf(
          oneBinding({
            when: () => {
              throw new Error("predicate blew up");
            },
          }),
        ),
        "probe",
        {},
        {},
      );
    } catch (e) {
      refusal = e as CardArmError;
    }
    expect(refusal?.code).toBe("card_compose");
    expect(refusal?.message).toBe("flow-output: probe: predicate blew up");
  });

  it("a flowKinds-less def maps through the catch-all (the Q5a shape)", () => {
    // The `as never` is the wall's POINT (cards-facts.spec.ts:50
    // precedent): registerCard pre-refuses kindless defs, so this
    // input is outside the type's domain BY DESIGN — the wall pins
    // the seam's catch-all mapping for the theoretically-
    // unreachable shape, not a reachable voice. The contract voice
    // (`declares no flowKinds contract`) lives in the engine's
    // assertFlowContract; the seam speaks the seam's voice.
    let refusal: CardArmError | null = null;
    try {
      resolveCardOutputsOrThrow(
        defsOf({ id: "probe", flowKinds: undefined as never, flowOutputBindings: oneBinding().flowOutputBindings }),
        "probe",
        {},
        {},
      );
    } catch (e) {
      refusal = e as CardArmError;
    }
    expect(refusal?.code).toBe("card_compose");
    expect(refusal?.message?.startsWith("flow-output: probe:")).toBe(true);
  });

  it("the bound graph resolves silent with the outputs", () => {
    const flow = resolveCardOutputsOrThrow(
      defsOf(oneBinding()),
      "probe",
      {},
      { "SaveAudio.0": { class_type: "SaveAudio" } },
    );
    expect(flow).toEqual({ outputs: { wav: "audio" }, outputNodes: { wav: "SaveAudio.0" } });
  });

  it("an unknown card refuses the unknown-card voice", () => {
    let refusal: CardArmError | null = null;
    try {
      resolveCardOutputsOrThrow(new Map(), "nope", {}, {});
    } catch (e) {
      refusal = e as CardArmError;
    }
    expect(refusal?.code).toBe("card_compose");
    expect(refusal?.message).toBe("unknown card nope");
  });

  it("the seat resolves through the seam (the rule in source)", () => {
    const src = readFileSync(new URL("../src/cardsRegistry.ts", import.meta.url), "utf8");
    expect(src).toContain("resolveCardOutputsOrThrow(this.defsSync(), prep.card, prep.params, graph);");
    expect(src).toContain("const flow = resolveCardOutputsOrThrow(this.defsSync(), p1.card, p1.params, graph);");
  });
});

// F2 — VALIDATE PREDICTS START ON OUTPUT RESOLUTION (flows-registry
// audit F2, closed by Q4a's seam): validate walked phase1Card only
// while start walked phase1+phase2, so a phase-2 output refusal
// answered validate-green/start-refuse on the binding cards. The
// validate seat now resolves its phase-1 graph through the shared
// seam — same params, same graph, same refusal. This arm drives
// BOTH doors on one lawful body over the tts card (its
// default-channel binding selects SaveAudio.0, absent from the
// mocked phase-1 graph) and pins the voices identical: the
// validate verdict EQUALS the start throw, word for word — two
// doors, one refusal. Neuter the validate seat's seam call and
// this arm reds (validate answers null while start still throws).
describe("F2 — THE DOORS AGREE ON OUTPUT RESOLUTION", () => {
  const body = { model: "qwen3-tts", text: "speak" };

  it("validate's verdict is start's throw, verbatim", async () => {
    // the real engine graph satisfies the tts binding, so the
    // refusal needs a node-less graph: pin the compose seat's
    // graph per-test (the spy rides vitest's proxied import —
    // the seats read the same stub) and restore after.
    const graph = vi.spyOn(composeSeat, "composeOnce").mockResolvedValue({ graph: true } as never);
    try {
      const verdict = await svc.composeValidateCard(
        "tts",
        "qwen3-tts",
        { ...body },
        "qwen3-tts",
        { ...body },
      );
      expect(verdict).not.toBeNull();
      expect(verdict?.message).toMatch(/expects SaveAudio\.0 as SaveAudio, got missing/);
      const p1 = await svc.phase1Card({ ...body }, "qwen3-tts");
      let thrown = "";
      try {
        await svc.phase2Card(p1, "run-aaaa1111-bb22cc33");
      } catch (e) {
        thrown = (e as Error).message;
      }
      expect(thrown).toBe(verdict?.message);
    } finally {
      graph.mockRestore();
    }
  });
});
