// cards-admission-matrix.spec.ts — THE ADMISSION MATRIX
// (operator 2026-11-06: "there is a matrix of set operations... ALL
// combinations").
//
// THE INCIDENT: a write carrying `loras` on image-gen refused at the
// write door — "compose-door: unknown param(s) on the image-gen
// card: loras" — and the whole write (model, steps, cfg, variant,
// quant) unlanded. The SECOND time the cure was claimed and the
// operator still saw the message.
//
// THE ROOT (not stale carry — a declaration gap): every image family
// applies LoRAs (the fired lane fires on every boarding atom), but
// the loras pack was scoped to krea-2/z-image/2511 alone —
// qwen-img-21 and qwen-img-edit-21 authored their flavor seeds but
// never composed them (no packagedFlavors row) and never declared
// them (no DECL.mods), and anima/flux-klein authored nothing at
// all. The write door judges the absorbed fold; the fold never held
// `loras` for those families; the key the studio offered and compose
// would have fired refused as unknown.
//
// THE MATRIX (finite and exhaustive): cards × boarded families × the
// key universe. Four tiers, three independent legs (the facts file's
// DECL.mods, the booted service's fold, the gate's verdict):
//   T1 every DECL.mods entry is consumed on every card × family —
//      pack ids by a scoping flavor of that pack (the mods layer),
//      other entries by a mounted verb id (verbs mount on the card,
//      never alone in the fold).
//   T2 the gate's verdict per key (admissionRefusal, the REAL gate):
//      schema ∪ admits ∪ boarded-pack fields ∪ declared mounts
//      admit; pack ids that take no key of their own refuse with
//      the flat-fields hint; everything else refuses NAMED.
//   T3 the operator's exact writes land whole (admitStageRelations).
//   T4 every boarded pack id has a lane fate (fired, refused, or
//      mounted — a surfaced knob with no lane is a silent skip).
//
// SIMPLE, no mocks: the real boot (loadCardDefs — flavors register
// LOUD), the real registry seat, the real facts file.
import { assertHermeticRode } from "../../../../tests/helpers/hermetic-engine.ts";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Context } from "@deepseek-ai/cordis";
import { CardRegistryService, CardArmError } from "../src/cardsRegistry.ts";
import { admissionRefusal } from "../src/cardsCompose.ts";
import { factsPath } from "../src/cardsFacts.ts";
import { liftCardParams } from "../src/cardsVariant.ts";
import { deriveDecls, type ModelFactsRow } from "../src/cardsFacts.ts";
import { loadCardDefs, theService, owningAtom, cardDefsNow, EngineContext, ComfyUIService, composeCards, composeModPlane, loadFacts, ComposeRefusal } from "@melite/comfyui-cordis";
import { PACK_FATE } from "@melite/comfyui-card-kit/guard";
import { installLaneStoreOverlay, restoreLaneStoreOverlay } from "../../../../tests/helpers/lane-store-overlay.ts";
import { FlowsSeatService } from "../src/flowsData.ts";

let svc: CardRegistryService;

beforeAll(async () => {
  const bootCtx = new Context();
  new FlowsSeatService(bootCtx);
  (bootCtx as unknown as { queue: unknown }).queue = {
    stateRoot: mkdtempSync(join(tmpdir(), "cards-matrix-")),
    stateRoots: [] as string[],
  };
  svc = new CardRegistryService(bootCtx);
  await svc.prime();
  // THE REAL PLANE (not the test fiber's empty fold): flavors
  // register here, LOUD on any invalid seed — an unwired table row
  // boards nothing and T1 names the family.
  await loadCardDefs();
  installLaneStoreOverlay();
}, 90_000);

afterAll(() => {
  restoreLaneStoreOverlay();
});

/** raw DECL.mods entries per family — the DECLARATION leg (the facts
 *  file, never the boot). Entries are pack ids, verb-mount names, or
 *  marriage objects carrying a pack id. */
function declEntries(): Record<string, readonly unknown[]> {
  const facts = svc.modelFacts() as Record<string, { mods?: readonly unknown[] }>;
  const out: Record<string, readonly unknown[]> = {};
  for (const [fam, row] of Object.entries(facts)) out[fam] = row.mods ?? [];
  return out;
}

/** the pack id an entry boards (`{pack}` objects state it; strings
 *  state it when they name a pack). */
function entryPack(entry: unknown, knownPacks: Set<string>): string | null {
  if (typeof entry === "string") return knownPacks.has(entry) ? entry : null;
  if (typeof entry === "object" && entry !== null && typeof (entry as { pack?: unknown }).pack === "string") {
    return (entry as { pack: string }).pack;
  }
  return null;
}

/** pack → families the BOOTED service scopes it to, with field keys —
 *  the RUNTIME leg. */
function scopedPacks(card: string): { pack: string; families: readonly string[]; keys: string[] }[] {
  return (theService().cardModFields(card) as { pack: string; families: readonly string[]; fields: { dict?: Record<string, unknown> } }[])
    .map((a) => ({ pack: a.pack, families: a.families, keys: Object.keys(a.fields.dict ?? {}) }));
}

/** every card with a boarded family — the matrix rows (familyless
 *  utility cards ride no lane and judge no mod surface). */
function matrixRows(): { card: string; families: string[] }[] {
  const defs = cardDefsNow() ?? new Map();
  const rows: { card: string; families: string[] }[] = [];
  for (const [card, def] of defs) {
    const boarded = [...(def.boarded ?? [])];
    if (boarded.length > 0) rows.push({ card, families: boarded });
  }
  return rows;
}

/** fold keys in scope for one cell (the same fold the gate judges). */
function foldKeys(card: string, fam: string): { keys: Set<string>; packOf: Map<string, string> } {
  const keys = new Set<string>();
  const packOf = new Map<string, string>();
  const atom = owningAtom(fam);
  for (const s of scopedPacks(card)) {
    if (!s.families.includes(fam) && !s.families.includes(atom)) continue;
    for (const k of s.keys) {
      keys.add(k);
      if (!packOf.has(k)) packOf.set(k, s.pack);
    }
  }
  return { keys, packOf };
}

describe("T1 — every DECL.mods entry is consumed (the incident shape)", () => {
  it("pack ids are flavor-scoped, verb mounts are card-mounted, on every card × family", () => {
    const unconsumed: string[] = [];
    const rows = matrixRows();
    const knownPacks = new Set<string>();
    for (const { card } of rows) for (const s of scopedPacks(card)) knownPacks.add(s.pack);
    const entries = declEntries();
    for (const { card, families } of rows) {
      // VERBS MOUNT BY ID (service.ts: verbs mount on the card, never
      // the flavor fold): a non-pack entry is consumed when the card
      // mounts that verb id for the family — loras/controlnet exist
      // ONLY in the mods layer, never alone, so pack ids never take
      // this branch.
      const verbs = theService().cardVerbs(card) as { id: string; families: readonly string[] }[];
      for (const fam of families) {
        const atom = owningAtom(fam);
        for (const entry of entries[fam] ?? []) {
          const pack = entryPack(entry, knownPacks);
          if (pack !== null) {
            const hit = scopedPacks(card).some(
              (s) => s.pack === pack && (s.families.includes(fam) || s.families.includes(atom)),
            );
            if (!hit) unconsumed.push(`${card} × ${fam}: DECL boards pack '${pack}' but no flavor scopes it (its keys refuse as unknown)`);
          } else if (typeof entry === "string") {
            const mounted = verbs.some((v) => v.id === entry && (v.families.includes(fam) || v.families.includes(atom)));
            if (!mounted) unconsumed.push(`${card} × ${fam}: DECL mounts '${entry}' but the card mounts no such verb (it refuses as unknown)`);
          }
        }
      }
    }
    expect(unconsumed).toEqual([]);
  });
});

/** keys no surface declares — the foreign battery (guarded below). */
const FOREIGN = ["frobnicate", "promptt", "lorasX", "stepsX"];
function verdict(card: string, fam: string, key: string, facts: Record<string, ModelFactsRow>): { admitted: boolean; error: string } {
  const lifted = liftCardParams({ model: fam, [key]: 1 });
  try {
    admissionRefusal(svc, card, fam, lifted, "admission", facts);
    return { admitted: true, error: "" };
  } catch (e) {
    if (!(e instanceof CardArmError)) throw e;
    return { admitted: !/unknown param|admission is the declared surface/.test(e.message), error: e.message };
  }
}

describe("T2 — the gate's verdict per key (the real admissionRefusal)", () => {
  it("boarded fields admit; pack ids refuse with the hint; strangers refuse named", () => {
    const facts = svc.modelFacts();
    const decls = deriveDecls(cardDefsNow() ?? new Map(), facts);
    const rows = matrixRows();
    const knownPacks = new Set<string>();
    for (const { card } of rows) for (const s of scopedPacks(card)) knownPacks.add(s.pack);
    const entries = declEntries();
    // THE UNIVERSE per card: fold keys across every family (a key
    // refused here is refused because its pack boards nothing
    // in scope — the family-scoping pin), plus pack ids (the
    // flat-fields hint), plus the foreign battery.
    const failures: string[] = [];
    for (const { card, families } of rows) {
      const decl = decls[card];
      if (decl === undefined) continue;
      const universe = new Map<string, string | null>();
      for (const s of scopedPacks(card)) for (const k of s.keys) if (!universe.has(k)) universe.set(k, s.pack);
      for (const fam of families) {
        const fold = foldKeys(card, fam);
        const famEntries = entries[fam] ?? [];
        const boardedPacks = new Set<string>();
        const mounts = new Set<string>();
        for (const e of famEntries) {
          const p = entryPack(e, knownPacks);
          if (p !== null) boardedPacks.add(p);
          else if (typeof e === "string") mounts.add(e);
        }
        for (const [key, pack] of universe) {
          const inScope = fold.keys.has(key);
          const boarded = pack !== null && boardedPacks.has(pack);
          const mounted = mounts.has(key) && inScope;
          const surface = decl.schemaNames.includes(key) || decl.admits.some((a) => a === key);
          const v = verdict(card, fam, key, facts);
          if (surface || (inScope && (boarded || mounted))) {
            if (!v.admitted) failures.push(`${card} × ${fam}: '${key}' refused at admission (${v.error})`);
          } else {
            if (v.admitted) failures.push(`${card} × ${fam}: '${key}' ADMITTED but no surface declares it`);
            else if (!v.error.includes(key)) failures.push(`${card} × ${fam}: refusal for '${key}' does not name it (${v.error})`);
          }
        }
        // pack ids take no key of their own — the flat-fields hint
        for (const pack of boardedPacks) {
          if (fold.keys.has(pack)) continue;
          const v = verdict(card, fam, pack, facts);
          if (v.admitted) failures.push(`${card} × ${fam}: pack id '${pack}' ADMITTED as a key (fields ride flat)`);
          else if (!/unknown param|admission is the declared surface/.test(v.error)) {
            failures.push(`${card} × ${fam}: pack id '${pack}' refused in the wrong voice (${v.error})`);
          }
        }
        for (const key of FOREIGN) {
          const v = verdict(card, fam, key, facts);
          if (v.admitted) failures.push(`${card} × ${fam}: foreign key '${key}' ADMITTED`);
          else if (!v.error.includes(key)) failures.push(`${card} × ${fam}: refusal for '${key}' does not name it (${v.error})`);
        }
      }
    }
    expect(failures).toEqual([]);
  });
});

describe("T5 — every family's studio writes admit (the bg-brick class)", () => {
  // THE INCIDENT (journey wave-2, motion audit): the motion studio
  // persists motion_bg_image into stage.params through its own
  // onSave merge-patch, and the compose door refused every
  // bg-carrying stage — "unknown param(s) on the motion card:
  // motion_bg_image" — because NO surface declared it. The code's
  // own comment cited a strip law (compile.ts
  // _KNOWN_NON_SIG_PARAMS) purged with the Python estate. This
  // tier holds the CLASS: whatever a family's DECL declares in
  // studio.writes admits on every card that boards the family
  // (the emit side persists it; the admit side must take it).
  it("the incident cell: kimodo declares the bg write and it admits on the motion card", () => {
    const facts = svc.modelFacts();
    const writes = facts["kimodo"]?.studio?.writes;
    expect(Array.isArray(writes) && writes.includes("motion_bg_image"),
      "the kimodo DECL must declare the studio's persisted UI-only write (the bg brick)").toBe(true);
  });

  it("every declared write admits on every boarding card (derived universe, no frozen keys)", () => {
    const facts = svc.modelFacts();
    const decls = deriveDecls(cardDefsNow() ?? new Map(), facts);
    const failures: string[] = [];
    let cells = 0;
    for (const { card, families } of matrixRows()) {
      for (const fam of families) {
        const writes = facts[fam]?.studio?.writes;
        if (!Array.isArray(writes)) continue;
        for (const w of writes) {
          if (typeof w !== "string") continue;
          cells += 1;
          const v = verdict(card, fam, w, facts);
          if (!v.admitted) failures.push(`${card} × ${fam}: declared write '${w}' refused at admission (${v.error})`);
        }
      }
    }
    expect(cells, "no family declares studio writes — the tier went vacuous").toBeGreaterThan(0);
    expect(failures).toEqual([]);
    // and the write is not a knob: the derivation must have unioned
    // it into admits (cardsFacts), never the schema plane
    const motionDecl = decls["motion"];
    expect(motionDecl?.admits.includes("motion_bg_image"),
      "the cardsFacts projection unions studio.writes into admits").toBe(true);
  });
});

describe("T3 — the operator's writes land whole", () => {
  const LORAS = [{ name: "seed.safetensors", strength: 1 }];
  it("image-gen × qwen-img-21 + loras lands (the incident cell)", () => {
    expect(svc.admitStageRelations("image-gen", {
      model: "qwen-img-21", variant: "base", steps: 8, cfg: 1, prompt: "a cat", loras: LORAS,
    })).toEqual({ ok: true });
  });
  it("image-gen × krea-2 + THE MASK MOD BAG lands (E2-11: the mod's bag is declared surface at the write door — the burn's verbatim voice lives in the ERRORS_2 ledger)", () => {
    expect(svc.admitStageRelations("image-gen", {
      model: "krea-2", variant: "turbo", prompt: "a cat",
      mask: [{ input_mask: "/v1/assets/region.png", mask_mode: "crop_stitch" }],
    })).toEqual({ ok: true });
  });
  it("image-gen × anima + loras lands", () => {
    expect(svc.admitStageRelations("image-gen", {
      model: "anima", prompt: "a cat", loras: LORAS,
    })).toEqual({ ok: true });
  });
  it("image-gen × flux-klein + loras lands", () => {
    expect(svc.admitStageRelations("image-gen", {
      model: "flux-klein", prompt: "a cat", loras: LORAS,
    })).toEqual({ ok: true });
  });
  it("image-edit × qwen-img-edit-21 + loras lands", () => {
    expect(svc.admitStageRelations("image-edit", {
      model: "qwen-img-edit-21", prompt: "make it warmer", image1: "x.png", loras: LORAS,
    })).toEqual({ ok: true });
  });
  it("the krea-2 reference seat still lands (no regression on the working lane)", () => {
    expect(svc.admitStageRelations("image-gen", {
      model: "krea-2", variant: "turbo", prompt: "a cat", loras: LORAS,
    })).toEqual({ ok: true });
  });
  it("a carried switch keeps its loras (prior krea-2 → next qwen-img-21)", () => {
    const cleaned = svc.laneMigrate("image-gen",
      { model: "qwen-img-21", variant: "base", prompt: "a cat", loras: LORAS },
      { model: "krea-2", variant: "turbo", prompt: "a cat", loras: LORAS },
    );
    expect(cleaned).toMatchObject({ loras: LORAS });
    expect(svc.admitStageRelations("image-gen", cleaned as Record<string, unknown>)).toEqual({ ok: true });
  });
});

describe("T4 — every boarded pack id has a lane fate", () => {
  it("no surfaced knob fires into a fateless lane", () => {
    const rows = matrixRows();
    const knownPacks = new Set<string>();
    for (const { card } of rows) for (const s of scopedPacks(card)) knownPacks.add(s.pack);
    const entries = declEntries();
    const fateless = new Set<string>();
    for (const mods of Object.values(entries)) {
      for (const e of mods) {
        const pack = entryPack(e, knownPacks);
        if (pack !== null && PACK_FATE[pack] === undefined) fateless.add(pack);
      }
    }
    expect([...fateless]).toEqual([]);
  });
});

// ── T6 — THE FAMILY ADMISSION (journey-closure B5, 2026-10-17):
// the registry's admitStageFamily seat against the REAL h3 def —
// the clause the bench write doors (familyAdmissionOf) serve. The
// verdict voice is the run door's own (def.schema's t4r gate), so
// this matrix cell and the compose walk share one truth (the
// mirror discipline; the family-side walls live in h3-timeline's
// card.spec.ts, the door-side in drafts' bench-family-admission).
describe("T6 — the family admission against the REAL defs (B5)", () => {
  const KEYFRAME_DOC = {
    keyframes: [{ image: "webp/run1/pin-0.png", frame: 0 }],
    steps: 20,
  };

  it("a Final-Cut stamp on a keyframe doc refuses with the run door's own voice", () => {
    const verdict = svc.admitStageFamily("h3-timeline", {
      ...KEYFRAME_DOC, second_pass_enabled: true, sr_switch: true,
    });
    expect(verdict.ok).toBe(false);
    expect(verdict.ok ? "" : verdict.error).toBe(
      "card 'h3-timeline' refused params: h3_window(t4r): unsanctioned inject keys: second_pass_enabled, sr_switch",
    );
  });

  it("a clean keyframe doc and a t4_open stamped doc pass; a non-family card is a no-op", () => {
    expect(svc.admitStageFamily("h3-timeline", KEYFRAME_DOC)).toEqual({ ok: true });
    expect(svc.admitStageFamily("h3-timeline", { steps: 20, sr_switch: true })).toEqual({ ok: true });
    expect(svc.admitStageFamily("image-gen", { whatever: "unjudged" })).toEqual({ ok: true });
  });
});

// ── T7 — THE VALUE PLANE (journey-closure D5, 2026-10-17): T1-T6
// judge the bag KEY (the tile: card-wide legal — the loras-boarding
// cure). The VALUE is family truth. The burn (anima-turbo-quant-burn
// F5): a krea-2-era pick carried on an anima run rode
// modCatalogForCompose's boarded-families fallback — image-gen
// boards krea-2 FIRST, and the run family's own row-less catalog
// fell through to krea-2's rows — and stacked silently ("silently
// absorbed by composeModPlane or unjudged — poison either way").
// ONE OWNER, the DOOR: the engine compose refuses a bag value
// registered outside the run's active family, named (value +
// registered family + run family); the client's modelSwitchPatch
// MOD-CURRENCY clause stays the gesture-hop mirror (B5/D3 pattern:
// the door refuses loud, the client nulls one hop earlier), never
// this law's judge — it does not see the re-point path or a
// hand-authored payload. Both cells ride the REAL engine door
// (hop 4 — the compose every Run press ends at: fresh service, the
// real card set, the real mod plane, the real facts), never a hand
// catalog; object_info stays unarmed so the wiring wall stands down
// (the hermetic doc carries no lora-loader class) — the value plane
// is judged BEFORE any graph walk.
async function d5Door(): Promise<ComfyUIService> {
  const ctx = new EngineContext();
  await ctx.plugin({ apply(c: EngineContext): void { new ComfyUIService(c); } });
  await composeCards(ctx);
  await composeModPlane(ctx);
  ctx.comfyui.setFacts(loadFacts(factsPath(), svc.readsSync()));
  return ctx.comfyui as ComfyUIService;
}

describe("T7 — no bag value registered outside the run's active family composes (D5)", () => {
  it("the burn cell: a krea-2 realism lora on an anima run refuses at the door, named", async () => {
    const comfy = await d5Door();
    let verdict = "composed GREEN (no refusal) — the foreign value silently absorbed";
    let code = "";
    try {
      comfy.compose("image-gen", "anima", {
        prompt: "a cat",
        loras: [{ id: "krea2_realism_lora", strength: 0.7 }],
      }, "d5_value_plane_burn");
    } catch (e) {
      verdict = e instanceof Error ? e.message : String(e);
      code = e instanceof ComposeRefusal ? e.code : "";
    }
    expect(code, "the door's own value-plane code, not an incidental wall").toBe("foreign-family-value");
    expect(verdict).toContain("krea2_realism_lora");
    expect(verdict).toContain("'krea-2'");
    expect(verdict).toContain("'anima'");
  });

  it("the satisfied cell: an anima-family value on an anima run composes green", async () => {
    const comfy = await d5Door();
    // THE ANIMA VALUE registers through the same door every family's
    // mods/loras.ts uses (registerFlavor — the DECL mods matrix's
    // runtime seam; the family seeds carry no first-party rows, user
    // files and first-party adapters land here alike)
    const dispose = comfy.registerFlavor({
      pack: "loras", families: ["anima"],
      rows: [{ id: "anima_d5_green", filename: "anima/d5-green-probe.safetensors", source_url: "https://example.invalid/d5-green", label: "D5 green probe", default_strength: 0.6 }],
    });
    try {
      const graph = comfy.compose("image-gen", "anima", {
        prompt: "a cat",
        loras: [{ id: "anima_d5_green", strength: 0.6 }],
      }, "d5_value_plane_green") as Record<string, { class_type: string; inputs: Record<string, unknown> }>;
      // THE WIRE RECEIPT: the anima value's own filename stacked —
      // the compose is not merely unrefused, the right weights ride
      const stacks = Object.values(graph).filter((n) => n.class_type === "LoraLoaderModelOnly");
      expect(stacks.length).toBeGreaterThan(0);
      expect(stacks.some((n) => n.inputs["lora_name"] === "anima/d5-green-probe.safetensors")).toBe(true);
    } finally {
      dispose();
    }
  });
});

// ── T8 — THE CENSUS GROUP-SCOPE (journey-closure C5, 2026-10-17:
// the operator's motion_npz ruling, encoded): the census states its
// group scope as an ASSERTION, never a silent skip. THE JUDGED SET —
// the hand-typed param groups whose keys the admission door judges
// as typed knobs. THE NOT-JUDGED SET — NAMED with its seam:
//   chain — the DOCUMENT seam: motion_npz (kimodo) chains from the
//     previous motion's last frame as a graph-wired data channel the
//     flow wiring carries (flowKinds + flowOutputBindings, motion
//     card.ts:88-93); the compose gate does not judge it as an
//     admission;
//   output — the INPUT SUBCARD seam (preview_glb seats through the
//     estate input-selection square, not a panel row).
// The non-judgment is CONDITIONED, not blanket: it holds only while
// the group stays graph-wired — a named-not-judged key that gains a
// hand-typed admission seat (the card's `admits` extras — the compose
// door's BEYOND-the-schema hand surface — or the DECL's
// studio-persisted write plane) reds. The rail seat census's panel
// sub-scope (motion-rail-seat-census.spec.tsx) rides this statement.
const C5_JUDGED_GROUPS = ["prompt", "general", "generation", "guidance"];
const C5_NOT_JUDGED_SEAMS: Record<string, string> = {
  chain: "the document seam — the flow wiring (motion card.ts:88-93)",
  output: "the input subcard seat",
};

/** knob → DECL group, derived from the REGISTERED schema (the real
 *  registry — never a hand list). */
function schemaGroups(card: string): Map<string, string> {
  const def = (cardDefsNow() ?? new Map()).get(card);
  if (def === undefined) throw new Error(`the registry serves no '${card}' def`);
  const json = def.schema.toJSON?.() as {
    refs: Record<number, { type?: string; dict?: Record<string, number>; meta?: { extra?: { group?: string } } }>;
  } | undefined;
  const root = Object.values(json?.refs ?? {}).find((n) => n.type === "object" && n.dict !== undefined);
  if (root?.dict === undefined) throw new Error(`the registered '${card}' schema serves no object root`);
  const groups = new Map<string, string>();
  for (const [knob, refId] of Object.entries(root.dict)) {
    const group = json!.refs[refId]?.meta?.extra?.group;
    if (typeof group === "string") groups.set(knob, group);
  }
  return groups;
}

describe("T8 — the census group-scope statement (C5: the motion_npz non-seat ruling)", () => {
  it("every registry group is accounted for — judged, or named not-judged with its seam (no silent skip)", () => {
    const knobGroups = schemaGroups("motion");
    const groups = new Set(knobGroups.values());
    const named = [...C5_JUDGED_GROUPS, ...Object.keys(C5_NOT_JUDGED_SEAMS)];
    // BOTH directions: the registry never grew an unaccounted group,
    // and the naming never rotted past a group the schema dropped.
    expect(
      [...groups].filter((g) => !named.includes(g)),
      "a registry group the scope statement does not account for — rule it judged or name its seam (the silent-skip class)",
    ).toEqual([]);
    expect(
      named.filter((g) => !groups.has(g)),
      "the scope statement names a group the registered motion schema no longer declares — the naming rotted",
    ).toEqual([]);
    // the judged set is DERIVED, never vacuous: every judged group
    // carries at least one declared knob
    for (const g of C5_JUDGED_GROUPS) {
      expect(
        [...knobGroups.values()].includes(g),
        `judged group '${g}' carries no declared knob — the judged set went vacuous`,
      ).toBe(true);
    }
  });

  it("the not-judged naming is truthful — the named channel sits in its named group and the graph wiring carries it", () => {
    const knobGroups = schemaGroups("motion");
    const def = (cardDefsNow() ?? new Map()).get("motion")!;
    expect(def.boarded, "the group-scope statement rides the kimodo card").toContain("kimodo");
    // THE KIMODO ENTRY: motion_npz is the named channel, in the named
    // chain group
    expect(
      knobGroups.get("motion_npz"),
      "motion_npz must stay in the chain group — the not-judged naming names it there",
    ).toBe("chain");
    // THE SEAM IS REAL: the graph wiring carries the channel both
    // ways — the non-seat's basis, not an assumption
    expect(
      def.flowKinds.inputs["motion_npz"],
      "the chain group's motion_npz loses its graph INPUT wiring — the document-seam basis is gone",
    ).toBe("data");
    expect(
      def.flowKinds.outputs["motion_npz"],
      "the chain group's motion_npz loses its graph OUTPUT wiring — the document-seam basis is gone",
    ).toBe("data");
    expect(
      (def.flowOutputBindings ?? []).some((b: { channel: string }) => b.channel === "motion_npz"),
      "the motion_npz channel loses its flowOutputBindings row — the graph no longer carries it",
    ).toBe(true);
  });

  it("a named-not-judged channel never gains a hand-typed admission seat (the non-seat is conditioned)", () => {
    const knobGroups = schemaGroups("motion");
    const channels = [...knobGroups.entries()].filter(([, g]) => g in C5_NOT_JUDGED_SEAMS).map(([k]) => k);
    const chainKeys = [...knobGroups.entries()].filter(([, g]) => g === "chain").map(([k]) => k);
    expect(channels, "the not-judged groups carry knobs to judge").toContain("motion_npz");
    const failures: string[] = [];
    // (1) the CARD's hand surface: admits extras admit BEYOND the
    // schema — a not-judged channel must never ride them
    for (const [card, def] of cardDefsNow() ?? new Map()) {
      if (!def.boarded.includes("kimodo")) continue;
      for (const key of channels) {
        if ((def.admits ?? []).includes(key)) {
          failures.push(
            `${card}: '${key}' appears in the hand-typed admits surface — a named-not-judged channel gained a hand-typed admission seat (the compose gate does not judge it; the C5 non-seat ruling is violated)`,
          );
        }
      }
    }
    // (2) the DECL's persisted-write plane: the chain stays
    // graph-wired, never a studio-persisted hand value (preview_glb's
    // writes row is the output group's own lawful truth-telling — the
    // DECL documents it; T5 walls it)
    const writes = svc.modelFacts()["kimodo"]?.studio?.writes;
    if (Array.isArray(writes)) {
      for (const key of chainKeys) {
        if (writes.includes(key)) {
          failures.push(
            `kimodo DECL: studio.writes carries '${key}' — a graph-wired chain channel declared as a persisted hand value (the chain rides the document seam; the C5 non-seat ruling is violated)`,
          );
        }
      }
    }
    expect(failures).toEqual([]);
  });
});

describe("the hermetic engine (the gate-37 flake cure: no live socket on the boot path)", () => {
  it("every prime rode the mock", () => {
    assertHermeticRode();
  });
});
