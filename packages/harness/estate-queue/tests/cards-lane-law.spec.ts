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

  it("the 1.7B clone lane carries the same law (its own route)", () => {
    const verdict = svc.admitStageRelations("tts", {
      model: "qwen3-tts-voicedesign-base",
      text: "clone this",
      ref_text: "the transcript",
    });
    expect(verdict.ok).toBe(false);
    expect(svc.admitStageRelations("tts", {
      model: "qwen3-tts-voicedesign-base",
      text: "clone this",
      ref_audio: "/assets/x.flac",
      ref_text: "the transcript",
    })).toEqual({ ok: true });
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
  it("a family that declares no surface judges nothing (the legacy truth)", () => {
    const verdict = svc.admitStageRelations("image-gen", {
      model: "anny",
      prompt: "x",
      whatever_knob: "any",
    });
    expect(verdict).toEqual({ ok: true });
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
    for (const [fam, row] of Object.entries(facts)) {
      if (row.params === undefined) continue; // legacy: declares nothing
      // route rows mirror their owner's declaration (the derived
      // lens); the claim law judges each OWNER once
      const owner = svc.resolveCardFamily(fam, facts);
      if (owner !== fam) continue;
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
  });

  it("the tts card claims nothing its declaring families did not declare (the full-claim bind)", () => {
    const facts = svc.modelFacts();
    const decls = svc.cardDecls();
    const ttsDecl = decls["tts"];
    expect(ttsDecl).toBeDefined();
    // the card boards BOTH tts families; both declare — the full
    // claim law binds the whole schema
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
      const decl = decls[row.card];
      const carriable = new Set([
        ...decl.schemaNames,
        ...modFieldsOf(row.card, fam),
      ]);
      for (const name of [
        ...namesIn(row.relations),
        ...row.variants.flatMap((v) => namesIn(v.relations)),
      ]) {
        expect(
          carriable.has(name),
          `family ${fam} relates on '${name}' but nothing carries it`,
        ).toBe(true);
      }
    }
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
