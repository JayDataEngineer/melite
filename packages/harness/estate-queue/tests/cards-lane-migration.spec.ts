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
