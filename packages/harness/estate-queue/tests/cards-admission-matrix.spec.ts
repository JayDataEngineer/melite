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
import { liftCardParams } from "../src/cardsVariant.ts";
import { deriveDecls, type ModelFactsRow } from "../src/cardsFacts.ts";
import { loadCardDefs, theService, owningAtom, cardDefsNow } from "@melite/comfyui-cordis";
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

describe("T2 — the gate's verdict per key (the real admissionRefusal)", () => {
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

describe("T3 — the operator's writes land whole", () => {
  const LORAS = [{ name: "seed.safetensors", strength: 1 }];
  it("image-gen × qwen-img-21 + loras lands (the incident cell)", () => {
    expect(svc.admitStageRelations("image-gen", {
      model: "qwen-img-21", variant: "base", steps: 8, cfg: 1, prompt: "a cat", loras: LORAS,
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

describe("the hermetic engine (the gate-37 flake cure: no live socket on the boot path)", () => {
  it("every prime rode the mock", () => {
    assertHermeticRode();
  });
});
