// cards-lane-migration.spec.ts — THE LANE MIGRATION WALLS (operator
// 2026-10-12: "WE NEED THE BOTTOM-UP CONTRACTS SO I STOP SEEING THIS
// [REDACTED 2026-11-05 profanity ruling]. HOW IS EVERYTHING GREEN?"
// — profanity redacted per the operator's 2026-11-05 gate ruling —
// the live wedge: a CustomVoice
// draft carrying `voice`, the variant switched to VoiceDesign, and the
// bench write REFUSED "field 'voice' fires nothing on this lane — drop
// it or switch lane" while the form HIDES the voice row on the new
// lane. The named cure was unclickable and the switch itself could
// not land ("unlanded keys: variant, quant") — the studio wedged
// between "the studio shows your edit; the bench does not". Every
// static-surface wall was green because NO wall composed the JOURNEY:
// a lane-changing write over a prior lane's stated members. This
// suite pins that journey through the REAL registry seat pair the
// patch door composes — laneMigrate (the drop) THEN
// admitStageRelations (the judgment) — for every ordered lane pair
// of the tts families, the cross-family switch, the teeth of the
// refusal that must SURVIVE the cure, and the same-lane patch that
// must judge exactly as it always did.
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it, expect, afterAll, beforeAll } from "vitest";
import { installLaneStoreOverlay, restoreLaneStoreOverlay } from "../../../../tests/helpers/lane-store-overlay.ts";
import { Context } from "@deepseek-ai/cordis";
import { CardRegistryService } from "../src/cardsRegistry.ts";
import { FlowsSeatService } from "../src/flowsData.ts";

let svc: CardRegistryService;
let bootCtx: Context;

beforeAll(async () => {
  bootCtx = new Context();
  new FlowsSeatService(bootCtx);
  (bootCtx as unknown as { queue: unknown }).queue = {
    stateRoot: mkdtempSync(join(tmpdir(), "cards-migrate-")),
    stateRoots: [] as string[],
  };
  svc = new CardRegistryService(bootCtx);
  await svc.prime();
  installLaneStoreOverlay();
}, 90_000);

afterAll(() => {
  restoreLaneStoreOverlay();
});

/** The patch door's composition, verbatim: migrate the merged view
 *  (the registry's drop), then judge it (the admission). This is
 *  the exact pair bench.ts's patch seat runs — one spelling, this
 *  wall and the door. */
const landPatch = (
  card: string,
  prior: Record<string, unknown>,
  patch: Record<string, unknown>,
): { ok: boolean; error?: string; stored: Record<string, unknown> } => {
  const cur: Record<string, unknown> = { ...prior, ...patch };
  const stored = svc.laneMigrate(card, cur, prior);
  const verdict = svc.admitStageRelations(card, stored);
  return verdict.ok ? { ok: true, stored } : { ok: false, error: verdict.error, stored };
};

const LARGE = "qwen3-tts-voicedesign";
const SMALL = "qwen3-tts";

describe("THE STUCK-SWITCH WALL (the live :3088 paste, verbatim)", () => {
  it("CustomVoice draft carrying voice → switch to VoiceDesign LANDS: voice drops, text survives, the axes land", () => {
    const prior = { model: LARGE, variant: "customvoice", quant: "native", text: "Hey how is it going?", voice: "ryan", top_k: 0 };
    const landed = landPatch("tts", prior, { variant: "voicedesign" });
    expect(landed.ok).toBe(true);
    // the stale carry is GONE from the row that lands
    expect(landed.stored["voice"]).toBeUndefined();
    // the prompt and sampling survive the migration
    expect(landed.stored["text"]).toBe("Hey how is it going?");
    expect(landed.stored["top_k"]).toBe(0);
    // the switch itself landed
    expect(landed.stored["variant"]).toBe("voicedesign");
    expect(landed.stored["quant"]).toBe("native");
  });

  it("WITHOUT the cure the same write REFUSES (the injury, pinned as the red-proof arm)", () => {
    const prior = { model: LARGE, variant: "customvoice", quant: "native", text: "Hey how is it going?", voice: "ryan" };
    const merged = { ...prior, variant: "voicedesign" };
    const verdict = svc.admitStageRelations("tts", merged);
    expect(verdict.ok).toBe(false);
    expect(verdict.ok === false && verdict.error).toContain("field 'voice' fires nothing on this lane");
  });
});

describe("T3 (lane-migration audit, 2026-11-06) — the NO-RESURRECT boot sweep: a defaulted together-member on a lane that drops it carries a null stamp", () => {
  // The forgotten-stamp class (the qwen3-tts 'voice: null'
  // precedent, operator 2026-09-23): a family DEFAULT bleeds onto
  // every lane's stored row unless the lane that does NOT declare
  // the member stamps it null in resolver_defaults. A resurrected
  // TOGETHER-member half-fires its group on the foreign lane — the
  // wedge this sweep kills. Scoped to together/requires members per
  // the audit's own class (a broadened every-defaulted-member sweep
  // fired on 168 resolver-path rows — florence2's checkpoint et al —
  // a DIFFERENT law: those ride the patch-time union-drop, not the
  // stamp; recorded in the verification report as follow-up).
  // Derived over the BOOTED registry — a new family reds this sweep
  // until stamped.
  it("every booted family stamps its dropped defaulted together-members null (the sweep is green at HEAD)", () => {
    const facts = svc.modelFacts();
    const offenders: string[] = [];
    for (const [fam, f] of Object.entries(facts)) {
      const rel = f.relations as { together?: { fields: string[] }[] } | undefined;
      const group = new Set<string>();
      for (const row of rel?.together ?? []) for (const m of row.fields) group.add(m);
      if (group.size === 0) continue;
      for (const [k, v] of Object.entries(f.defaults)) {
        if (v === null || v === undefined) continue; // null IS the stamp
        if (!group.has(k)) continue; // only together-members can half-fire
        for (const variant of f.variants) {
          const surface = new Set<string>([...(f.params ?? []), ...(variant.params ?? [])]);
          for (const c of variant.cells ?? []) for (const p of c.params ?? []) surface.add(p);
          const stamped = variant.resolver_defaults?.[k] === null;
          if (!surface.has(k) && !stamped) offenders.push(`${fam}/${variant.id}: defaulted together-member '${k}' rides without a null stamp`);
        }
      }
    }
    expect(offenders, `no-resurrect offenders — stamp the member null on the lanes that drop it (the voice: null precedent):\n${offenders.join("\n")}`).toEqual([]);
  });
  it("the sweep's own judge fires: a defaulted together-member on a stamp-less dropping lane reds", () => {
    // the synthetic arm (the audit's first firing): the sweep logic
    // itself must RED on the forgotten-stamp shape, so a green sweep
    // is proof the registry carries none — not proof the sweep is
    // blind. Rebuilt inline over one synthetic family.
    const synthetic = {
      card: "synthetic", defaults: { voice: "vivian" }, params: undefined,
      variants: [
        { id: "base", params: ["ref_audio"], resolver_defaults: {}, cells: [] },
      ],
      relations: { together: [{ fields: ["voice", "design_prompt"] }] },
    } as unknown as Facts[string];
    const caught: string[] = [];
    const group = new Set<string>(synthetic.relations.together![0]!.fields);
    for (const [k, v] of Object.entries(synthetic.defaults)) {
      if (v === null || v === undefined || !group.has(k)) continue;
      for (const variant of synthetic.variants) {
        const surface = new Set<string>([...(synthetic.params ?? []), ...(variant.params ?? [])]);
        for (const c of variant.cells ?? []) for (const p of c.params ?? []) surface.add(p);
        const stamped = variant.resolver_defaults?.[k] === null;
        if (!surface.has(k) && !stamped) caught.push(`${k}`);
      }
    }
    expect(caught).toEqual(["voice"]);
  });
});

describe("T1 (lane-migration audit, 2026-11-06) — the QUANT-ONLY reshape: a same-variant quant switch lands, group members ride", () => {
  // The journey matrix rides the MODEL/VARIANT axes; the cellOf
  // RESHAPE (a quant change re-seats the cell's group members) had
  // no arm — a regression to "quant change with a stale group
  // member refuses" would redden nothing.
  it("customvoice + quant 1_7b → 0_6b lands: voice rides, style_instruction drops, quant lands", () => {
    const prior = { model: "qwen3-tts", variant: "customvoice", quant: "1_7b", text: "w", voice: "vivian", style_instruction: "warm and slow" };
    const landed = landPatch("tts", prior, { quant: "0_6b" });
    expect(landed.ok).toBe(true);
    // the reshape drops the stale group member that 0_6b's cell
    // does not carry (style_instruction rides the 1_7b cell only)
    expect(landed.stored["style_instruction"]).toBeUndefined();
    // the surviving group member rides
    expect(landed.stored["voice"]).toBe("vivian");
    // the quant itself landed
    expect(landed.stored["quant"]).toBe("0_6b");
  });
});

describe("THE FULL JOURNEY MATRIX (every ordered lane pair, the prior lane's own members stated)", () => {
  it("THE MATRIX CENSUS (T4, 2026-11-06): the ordered lane-pair count equals the facts-derived count — a new tts lane reds until its arms land", () => {
    // Derived roster over hand-maintained count (the canon's DEPTH
    // axis): the matrix's arm count is a literal below; the FACTS
    // derive the offered lanes (variants not hidden from the
    // picker). A new tts variant changes the derived count and reds
    // this census until the pair arms + the literal re-pin land.
    const tts = Object.values(svc.modelFacts()).find((f) => f.card === "tts");
    expect(tts).toBeDefined();
    // the LANES are the "Variant" group's rows (the Recipe/Quant
    // groups are wire stamps, not lanes — tts's own shape)
    const lanes = (tts!.variants).filter((v) => v.group === "Variant" && v.hide_from_dropdown !== true);
    const derived = lanes.length * (lanes.length - 1);
    expect(derived).toBe(6);
    expect(lanes.map((v) => v.id).sort()).toEqual(["base", "customvoice", "voicedesign"]);
    // the judge's own firing shape (so a green census is proof the
    // facts match, not proof the walk is frozen): a synthetic tts
    // row with a FOURTH Variant-group lane derives 12 ≠ 6 — the
    // count a new lane produces before its pair arms land.
    const synthetic = { ...tts!, variants: [...lanes, { id: "newlane", group: "Variant" }] };
    const syntheticLanes = synthetic.variants.filter((v) => v.group === "Variant" && v.hide_from_dropdown !== true);
    expect(syntheticLanes.length * (syntheticLanes.length - 1)).not.toBe(6);
  });

  it("voicedesign → customvoice: the export pair drops, the switch lands", () => {
    const prior = { model: LARGE, variant: "voicedesign", text: "words", design_prompt: "a gravel narrator", voice_name: "radio-host" };
    const landed = landPatch("tts", prior, { variant: "customvoice" });
    expect(landed.ok).toBe(true);
    expect(landed.stored["design_prompt"]).toBeUndefined();
    expect(landed.stored["voice_name"]).toBeUndefined();
    expect(landed.stored["text"]).toBe("words");
  });

  it("base(clone) → customvoice: the reference pair drops", () => {
    const prior = { model: LARGE, variant: "base", text: "words", ref_audio: "/assets/ref.flac", ref_text: "the reference words" };
    const landed = landPatch("tts", prior, { variant: "customvoice" });
    expect(landed.ok).toBe(true);
    expect(landed.stored["ref_audio"]).toBeUndefined();
    expect(landed.stored["ref_text"]).toBeUndefined();
  });

  it("customvoice → base(clone): the speaker + delivery style drop, the clone lane admits", () => {
    const prior = { model: LARGE, variant: "customvoice", text: "words", voice: "chelsie", style_instruction: "warm and slow" };
    const landed = landPatch("tts", prior, { variant: "base", ref_audio: "/assets/ref.flac", ref_text: "the reference words" });
    expect(landed.ok).toBe(true);
    expect(landed.stored["voice"]).toBeUndefined();
    expect(landed.stored["style_instruction"]).toBeUndefined();
    expect(landed.stored["ref_audio"]).toBe("/assets/ref.flac");
  });

  it("voicedesign → base(clone): the export pair drops beside the arriving reference", () => {
    const prior = { model: LARGE, variant: "voicedesign", text: "words", design_prompt: "persona", voice_name: "name" };
    const landed = landPatch("tts", prior, { variant: "base", ref_audio: "/assets/r.flac", ref_text: "ref words" });
    expect(landed.ok).toBe(true);
    expect(landed.stored["design_prompt"]).toBeUndefined();
    expect(landed.stored["voice_name"]).toBeUndefined();
  });

  it("base(clone) → voicedesign: the reference pair drops, the design lane demands its own pair (incomplete, admitted)", () => {
    const prior = { model: LARGE, variant: "base", text: "words", ref_audio: "/assets/ref.flac", ref_text: "ref" };
    const landed = landPatch("tts", prior, { variant: "voicedesign" });
    // the write door admits the incomplete draft (the required word
    // is the run door's voice) — the SWITCH lands, un-wedged
    expect(landed.ok).toBe(true);
    expect(landed.stored["ref_audio"]).toBeUndefined();
    expect(landed.stored["ref_text"]).toBeUndefined();
  });
});

describe("THE CROSS-FAMILY SWITCH (the model axis, same variant id)", () => {
  it("1.7B customvoice (style_instruction) → 0.6B customvoice: the instruction drops — the 0.6B has no instruction control", () => {
    const prior = { model: LARGE, variant: "customvoice", text: "words", voice: "ryan", style_instruction: "warm and slow" };
    const landed = landPatch("tts", prior, { model: SMALL });
    expect(landed.ok).toBe(true);
    expect(landed.stored["style_instruction"]).toBeUndefined();
    // voice rides BOTH customvoice surfaces — it survives the family switch
    expect(landed.stored["voice"]).toBe("ryan");
  });

  it("0.6B → 1.7B customvoice: the switch lands clean", () => {
    const prior = { model: SMALL, variant: "customvoice", text: "words", voice: "ryan" };
    const landed = landPatch("tts", prior, { model: LARGE });
    expect(landed.ok).toBe(true);
    expect(landed.stored["voice"]).toBe("ryan");
  });
});

describe("THE TEETH (the refusal law SURVIVES the cure — no bypass door opened)", () => {
  it("authored state the prior lane never declared still refuses after the migration", () => {
    // ref_audio stated while ON the customvoice lane (never on its
    // surface): not stale carry — authored state, refused a priori
    const prior = { model: LARGE, variant: "customvoice", text: "words" };
    const landed = landPatch("tts", prior, { variant: "voicedesign", ref_audio: "/assets/x.flac" });
    expect(landed.ok).toBe(false);
    expect(landed.error).toContain("field 'ref_audio' fires nothing on this lane");
  });

  it("a SAME-LANE patch judges exactly as before — no member drops, an off-surface member still refuses", () => {
    const prior = { model: LARGE, variant: "voicedesign", text: "words" };
    const cur = { ...prior, ref_audio: "/assets/x.flac" };
    const migrated = svc.laneMigrate("tts", cur, prior);
    expect(migrated).toBe(cur); // same reference — nothing dropped on a same-lane patch
    const verdict = svc.admitStageRelations("tts", migrated);
    expect(verdict.ok).toBe(false);
  });

  it("a same-lane VALID patch passes untouched (the migration is invisible when no lane changes)", () => {
    const prior = { model: LARGE, variant: "customvoice", text: "words", voice: "ryan" };
    const landed = landPatch("tts", prior, { text: "new words" });
    expect(landed.ok).toBe(true);
    expect(landed.stored["voice"]).toBe("ryan");
    expect(landed.stored["text"]).toBe("new words");
  });
});
