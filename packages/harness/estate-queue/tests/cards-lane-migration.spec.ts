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
import { assertHermeticRode } from "../../../../tests/helpers/hermetic-engine.ts";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it, expect, afterAll, beforeAll } from "vitest";
import { installLaneStoreOverlay, restoreLaneStoreOverlay } from "../../../../tests/helpers/lane-store-overlay.ts";
import { Context } from "@deepseek-ai/cordis";
import { CardRegistryService } from "../src/cardsRegistry.ts";
import { FlowsSeatService } from "../src/flowsData.ts";
import { selectCardVariant, stampCardOverlay, liftCardParams } from "../src/cardsVariant.ts";
import { theService, owningAtom } from "@melite/comfyui-cordis";
import type { ModelFactsRow, ResolvedVariantRow } from "../src/cardsFacts.ts";

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

/** THE DESIGNED FLOOR census (the T3 follow-up's resolver-path
 *  close, 2026-11-06): the 168-row broadened sweep was the wrong
 *  law for the MIGRATION seat, but the RESOLVER path still owed an
 *  answer — does a family default the lane's variant surface drops
 *  compose? The real-overlay census (real decls via svc.cardDecls,
 *  the real select→stamp→lift pipeline over every booted lane)
 *  found 25 riders, every one card-admitted (the card schema names
 *  it) and none a together-member on its dropping lane — the
 *  DESIGNED family floor, not resurrect debt. The null stamp is
 *  the opt-out, taken where the together wedge exists (the T3
 *  sweep above). The roster is PINNED: a new un-stamped rider REDS
 *  until it is stamped null or seated here with its dated why —
 *  the count is a ratchet, and the existing firing walls own the
 *  two refusal edges (off-surface keys never ride, at
 *  cards-variant.spec "off-surface keys never ride"; contract keys
 *  never ride, at "envelope keys never stamp" + "envelope +
 *  variant/quant ride OUT"). */
const DESIGNED_FLOOR_ROSTER: readonly string[] = [
  // joycaption: the standard caption lane's own engine graph wires
  // the checkpoint knob the family floor carries (admitted by the
  // form schema; the variant surface simply omits what it inherits)
  "joycaption/standard:checkpoint",
  // qwen3-tts families: mode ("tts") is the form's routing knob on
  // every lane. THE VOICE RIDERS ARE GONE (the no-default-voice
  // ruling, 2026-11-10 — operator: "Make sure it DEFAULTS to no
  // voice, instead of VIVIAN"): the recipe lanes' voice riders
  // (steady-read/expressive-read/default) existed only because the
  // family defaults seeded vivian onto every stamp; the seed is dead,
  // so the pin shrinks with the riders it pinned.
  ...[
    "customvoice:mode", "voicedesign:mode", "base:mode",
    "steady-read:mode", "expressive-read:mode", "default:mode",
  ].map((lane) => "qwen3-tts/" + lane),
  ...["steady-read:mode", "expressive-read:mode", "default:mode"].map((lane) => "qwen3-tts-base/" + lane),
  ...[
    "steady-read:mode", "expressive-read:mode", "default:mode",
  ].map((lane) => "qwen3-tts-voicedesign/" + lane),
  ...["steady-read:mode", "expressive-read:mode", "default:mode"].map((lane) => "qwen3-tts-voicedesign-design/" + lane),
  ...["steady-read:mode", "expressive-read:mode", "default:mode"].map((lane) => "qwen3-tts-voicedesign-base/" + lane),
];

/** The census skip roster (audit-followups W4, 2026-11-06): variants
 *  whose selection throws during census composition — hidden or
 *  dropdown-less routes that never compose. Pinned beside the rider
 *  roster: a newly unselectable variant reds, a newly selectable one
 *  shrinks the pin. */
const CENSUS_SKIP_ROSTER: readonly string[] = [
  // pixal3d + trellis2 (the 3D mesh families): every lane's route is
  // hidden from the dropdown ("not offered") — variant selection
  // throws before composition, so these lanes never compose and can
  // carry no riders. A newly offered 3D lane reds here.
  ...[
    "pixal3d-bf16", "pixal3d-int8",
    "trellis2-native-bf16", "trellis2-native-int8",
  ].flatMap((fam) => ["1024", "fast", "quality", "standard"].map((lane) => fam + "/" + lane)),
  // qwen-img-edit-2511 (the soft-retire, 2026-11-08): all five
  // variants carry hide_from_dropdown, so every lane's selection
  // throws and no 2511 lane composes — same never-compose posture
  // as the 3D families above. Un-retiring a variant (re-offering a
  // lane) reds here until the pin shrinks.
  ...["qwen-img-edit-2511-int8", "qwen-img-edit-2511-lightning4"].flatMap((fam) =>
    ["default", "standard", "strong-identity", "upstream-solvers"].map((lane) => fam + "/" + lane),
  ),
  ...["default", "lightning", "standard", "strong-identity", "upstream-solvers"].map(
    (lane) => "qwen-img-edit-2511/" + lane,
  ),
];

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
/** Pack-defaulted fields in scope for one family (audit-followups M5,
 *  2026-11-06): cardModFields dict entries carrying a schema default
 *  (meta.default — voice_strength defaults 1 in the qvoice pack),
 *  scoped by the same route→atom fold the seats judge (stampCardOverlay,
 *  compose, the migration seat — one spelling). A pack default on a
 *  together-member resurrects through the pack's own application when
 *  the seat drops the member, the same wedge as a family default, so
 *  the no-resurrect sweep unions both sources. */
function packDefaultedFields(card: string, fam: string): Map<string, unknown> {
  const out = new Map<string, unknown>();
  try {
    const atom = owningAtom(fam);
    const packs = theService().cardModFields(card) as {
      families: readonly string[];
      fields: { dict?: Record<string, unknown> };
    }[];
    for (const p of packs) {
      if (!p.families.includes(atom)) continue;
      for (const [k, schema] of Object.entries(p.fields.dict ?? {})) {
        const d = (schema as { meta?: { default?: unknown } } | null | undefined)?.meta?.default;
        if (d === undefined || d === null) continue;
        if (!out.has(k)) out.set(k, d);
      }
    }
  } catch {
    // card defs not booted in this fiber — no pack defaults to union
  }
  return out;
}

/** THE judge (audit-followups W2, 2026-11-06): the no-resurrect
 *  predicate, one spelling — the real sweep AND the synthetic firing
 *  arm both call it, so the firing proof is the fired code (never a
 *  twin that can drift). packDefaults injects the pack source: the
 *  real sweep reads it live per family; the synthetic arm supplies
 *  its literal shape (an unregistered card has no dicts to read). */
function noResurrectOffenders(
  fam: string,
  f: ModelFactsRow,
  packDefaults: Map<string, unknown>,
): string[] {
  const out: string[] = [];
  const rel = f.relations as { together?: { fields: string[] }[] } | undefined;
  const group = new Set<string>();
  for (const row of rel?.together ?? []) for (const m of row.fields) group.add(m);
  if (group.size === 0) return out;
  // the default source is family defaults UNION pack defaults —
  // either one resurrects a dropped member
  const defaulted = new Map<string, unknown>();
  for (const [k, v] of Object.entries(f.defaults ?? {})) {
    if (v === null || v === undefined) continue; // null IS the stamp
    defaulted.set(k, v);
  }
  for (const [k, v] of packDefaults) {
    if (!defaulted.has(k)) defaulted.set(k, v);
  }
  for (const [k, v] of defaulted) {
    if (v === null || v === undefined) continue;
    if (!group.has(k)) continue; // only together-members can half-fire
    for (const variant of f.variants) {
      const surface = new Set<string>([...(f.params ?? []), ...(variant.params ?? [])]);
      for (const c of variant.cells ?? []) for (const p of c.params ?? []) surface.add(p);
      const stamped = variant.resolver_defaults?.[k] === null;
      if (!surface.has(k) && !stamped) out.push(`${fam}/${variant.id}: defaulted together-member '${k}' rides without a null stamp`);
    }
  }
  return out;
}

  it("every booted family stamps its dropped defaulted together-members null (the sweep is green at HEAD)", () => {
    const facts = svc.modelFacts();
    const offenders: string[] = [];
    for (const [fam, f] of Object.entries(facts)) {
      offenders.push(...noResurrectOffenders(fam, f, packDefaultedFields(f.card, fam)));
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
      relations: { together: [{ fields: ["voice", "design_prompt", "voice_pack"] }] },
    } as unknown as ModelFactsRow;
    // M5: the pack-default half rides the same check — a pack dict
    // default on a dropped together-member (the voice_strength
    // shape: default 1, no lane surface, no stamp)
    const syntheticPackDefaults = new Map<string, unknown>([["voice_pack", 1]]);
    // W2: the synthetic family proves the REAL judge — the
    // pack half rides as the injected source, the family half as
    // the row's own defaults
    expect(noResurrectOffenders("synthetic", synthetic, syntheticPackDefaults)).toEqual([
      "synthetic/base: defaulted together-member 'voice' rides without a null stamp",
      "synthetic/base: defaulted together-member 'voice_pack' rides without a null stamp",
    ]);
  });

  it("the pack-default reader rides the live precedent (qvoice voice_strength defaults 1, outside every together group)", () => {
    // M5's reader fires on real dicts, not just the synthetic map:
    // the audit's named precedent must resolve through the helper
    // with its live value — a broken meta.default read empties
    // every family's pack source and this arm reds.
    const facts = svc.modelFacts();
    let found = "";
    for (const [fam, f] of Object.entries(facts)) {
      const packDefs = packDefaultedFields(f.card, fam);
      if (!packDefs.has("voice_strength")) continue;
      found = fam;
      expect(packDefs.get("voice_strength")).toBe(1);
      const rel = f.relations as { together?: { fields: string[] }[] } | undefined;
      const group = new Set<string>();
      for (const row of rel?.together ?? []) for (const m of row.fields) group.add(m);
      expect(group.has("voice_strength")).toBe(false);
    }
    expect(found).not.toBe("");
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
    const synthetic = { ...tts!, variants: [...lanes, { id: "newlane", group: "Variant" } as ResolvedVariantRow] };
    const syntheticLanes = synthetic.variants.filter((v) => v.group === "Variant" && v.hide_from_dropdown !== true);
    expect(syntheticLanes.length * (syntheticLanes.length - 1)).not.toBe(6);
    // (audit-followups W1, 2026-11-06) THE OFFERED-CELLS WALK: the
    // quant axis T1 proves matters — a new cell re-seats its lane's
    // group members, so the census pins the per-lane cell roster
    // beside the lane count. A new cell reds here until its pin +
    // its T1-pattern reshape arm land; Recipe rows stay out (wire
    // stamps, not lanes — the narrowed law, seated, not overlooked).
    const cellWalk = lanes
      .map((v) => v.id + ":" + [...(v.cells ?? [])].map((c) => c.quant).sort().join(","))
      .sort();
    expect(cellWalk).toEqual([
      "base:0_6b,1_7b",
      "customvoice:0_6b,1_7b",
      "voicedesign:1_7b",
    ]);
    const syntheticCells = [...lanes.slice(0, -1), {
      ...lanes[lanes.length - 1]!,
      cells: [...(lanes[lanes.length - 1]!.cells ?? []), { quant: "newcell", route: "x" }],
    }];
    const syntheticWalk = syntheticCells
      .map((v) => v.id + ":" + [...(v.cells ?? [])].map((c) => (c as { quant: string }).quant).sort().join(","))
      .sort();
    expect(syntheticWalk).not.toEqual(cellWalk);
  });

  it("voicedesign → customvoice: the persona drops, the switch lands", () => {
    // THE BOOLEAN RECUT (operator 2026-10-22): no name — the prior
    // is the persona alone, off-lane on the arriving CustomVoice.
    const prior = { model: LARGE, variant: "voicedesign", text: "words", design_prompt: "a gravel narrator" };
    const landed = landPatch("tts", prior, { variant: "customvoice" });
    expect(landed.ok).toBe(true);
    expect(landed.stored["design_prompt"]).toBeUndefined();
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

  it("voicedesign → base(clone): the persona drops beside the arriving reference", () => {
    const prior = { model: LARGE, variant: "voicedesign", text: "words", design_prompt: "persona" };
    const landed = landPatch("tts", prior, { variant: "base", ref_audio: "/assets/r.flac", ref_text: "ref words" });
    expect(landed.ok).toBe(true);
    expect(landed.stored["design_prompt"]).toBeUndefined();
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

describe("THE DESIGNED FLOOR census (the T3 follow-up, 2026-11-06) — the resolver path's un-stamped riders are pinned, every one card-admitted", () => {
  it("the real-overlay census matches the pinned roster exactly (a new un-stamped rider reds until stamped or seated)", () => {
    const facts = svc.modelFacts();
    const decls = svc.cardDecls(facts);
    const riding: string[] = [];
    // (audit-followups W4, 2026-11-06) the skip set: variants whose
    // selection throws (hidden/dropdown-less routes) escape the
    // census — collected and judged below, never silently skipped
    const skipped: string[] = [];
    for (const [fam, f] of Object.entries(facts)) {
      const decl = decls[f.card];
      if (decl === undefined) continue;
      for (const variant of f.variants) {
        const surface = new Set<string>([...(f.params ?? []), ...(variant.params ?? [])]);
        for (const c of variant.cells ?? []) for (const p of c.params ?? []) surface.add(p);
        let sel;
        try {
          sel = selectCardVariant(fam, f, { variant: variant.id }, "census");
        } catch {
          skipped.push(`${fam}/${variant.id}`); // hidden/dropdown-less routes never compose
          continue;
        }
        const params = liftCardParams(stampCardOverlay({}, f, decl, sel, "census", fam));
        // (audit-followups M5, 2026-11-06) the key set is family
        // defaults ONLY, by construction: the overlay this census
        // judges injects famRow.defaults + resolver stamps and
        // nothing else (stampCardOverlay — pack defaults enter at
        // the pack's own application, never this path), so a pack
        // key could never appear in `params` here. The pack half of
        // the no-resurrect law is the sweep's above, not this census's.
        for (const k of Object.keys(f.defaults)) {
          if (surface.has(k)) continue;
          if (variant.resolver_defaults?.[k] !== undefined) continue; // stamped (null or override)
          if (k in params) riding.push(`${fam}/${variant.id}:${k}`);
        }
      }
    }
    const unpinned = riding.filter((r) => !DESIGNED_FLOOR_ROSTER.includes(r));
    const stale = DESIGNED_FLOOR_ROSTER.filter((r) => !riding.includes(r));
    expect(
      `unpinned riders (stamp the member null or seat it with a dated why):\n${unpinned.join("\n")}\nstale roster rows (the rider is gone — shrink the pin):\n${stale.join("\n")}`,
    ).toBe(`unpinned riders (stamp the member null or seat it with a dated why):\n\nstale roster rows (the rider is gone — shrink the pin):\n`);
    expect(riding.sort()).toEqual([...DESIGNED_FLOOR_ROSTER].sort());
    // W4: the skip set rides beside the roster — a newly
    // unselectable variant reds here instead of escaping silently
    expect(skipped.sort()).toEqual([...CENSUS_SKIP_ROSTER].sort());
  });

  it("the census's own judge fires: an un-stamped dropped default that composes is caught", () => {
    // synthetic firing arm — self-contained (the real cardDecls
    // derives from the booted card definitions, so the synthetic
    // card carries its own minimal decl): the census logic must
    // catch a fresh rider, so a green census is proof the registry
    // carries none unpinned — not proof the census is blind.
    const synthetic = {
      card: "synthetic", defaults: { tone: "warm" }, params: undefined,
      variants: [{ id: "base", params: ["text"], resolver_defaults: {}, cells: [] }],
    } as never as ModelFactsRow;
    const decl = {
      schemaNames: ["text", "tone"], admits: [], spells: [],
    } as never as Parameters<typeof stampCardOverlay>[2];
    const sel = selectCardVariant("synthetic", synthetic, { variant: "base" }, "census");
    const params = liftCardParams(stampCardOverlay({}, synthetic, decl, sel, "census", "synthetic"));
    expect("tone" in params).toBe(true); // the rider rides — the census would name it unpinned
    expect("text" in params).toBe(false); // unstated + no default — the floor stamps nothing
  });
});

describe("the hermetic engine (the gate-37 flake cure: no live socket on the boot path)", () => {
  it("every prime rode the mock", () => {
    assertHermeticRode();
  });
});
