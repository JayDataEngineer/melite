// variant-switch-parity.spec.ts — THE GESTURE WALL (operator
// 2026-10-22, attempt 11 on the tts card: "I open a fresh card. I
// change the variant to voice design. I type in the box — THE WRITE
// DID NOT LAND: field 'style_instruction' fires nothing on this
// lane"). THE LAW THIS WALL HOLDS: the OPERATOR'S GESTURES — switch
// the variant, type in a box — land on BOTH patch doors for EVERY
// card × EVERY variant transition, from a stored state the door
// itself wrote. A switch that refuses is the stuck-switch injury; a
// keystroke that refuses is the same burn at the typing seat.
//
// THE TWO-DOOR LAW (the split this wall exists to kill): bench/patch
// runs laneMigrate between merge and admission (the 2026-10-12
// stuck-switch cure); the GUI's drafts/patch — "the GUI's param
// editor rides exactly this call" — admitted WITHOUT the dropper,
// so every keystroke rode the unwired door. The client grew its own
// carry-drop at the pick (dropStaleAxisCarry, the 2026-11-10 tts
// lockout cure) but ONLY when the caller passes held — the door is
// the law's seat for every bare re-key, every old bundle, every
// non-client writer. This wall drives the MINIMAL pick (the client
// builder's own output, held omitted) so the door is judged alone.
//
// GESTURE SHAPES (never code vocabulary): the stored state is born
// through the door itself (axis skeleton via the bench birth shape,
// surface fields via a real write whose values are the spec row's
// OWN defaults — envelope-lawful by construction; a stored state the
// door refuses to write is that card's own burn, logged verbatim in
// every run, never a switch question); the pick is
// axisPickPatch(spec, row) in its WIRE FORM — the GUI's onPick
// translation (stage-drill.tsx, dated law): an axis key the pick
// stamps '' rides null, a DELETE, because the door's own
// empty-selection law refuses a stated '' (aa3a28290 — the wire
// form is what the door must hold, never the builder's internal
// spelling); the typed box is one field per write. Transitions
// derive from facts + boarded (the liveness roster) — no hand list,
// no literal count.
//
// THE CONDITIONAL-SURFACE LAW (the 36-burn skip cure, 2026-11-03):
// a DECLARED field is not always a PARAM-WRITABLE field. Two legal
// classes refuse a bare probe — the CONDITIONAL field (image-edit's
// width/height fire only when match_input_resolution is OFF; the
// refusal voice itself teaches the flip) and the FAMILY-SWITCHING
// field (h3's T4_ONLY_KEYS: stating them re-derives the window
// family t4r, which then bans them — they ride the B2 flip writer,
// never a bare params write). The wall's old bulk probe seeded every
// declared field at once, these seats refused at the SOURCE, and
// every h3-timeline and image-edit transition rode no gesture at
// all — the skip was the disease. The cure: each seat's surface is
// classified THROUGH the door (row defaults first, then every
// default-less field probed ALONE); admitted fields join the stored
// state, refused fields become the seat's CONDITIONAL roster and
// their voices must TEACH (the honest-voice rider class — a bare
// refusal of a declared field reds). Gestures ride every seat; the
// typing arm types only admissible fields (a conditional field
// refusing bare is the door's own law, walled elsewhere); the
// bulk-write safety net keeps the old burn log for any card whose
// jointly-admitted fields still refuse together.
//
// JOURNEY (§2): [1] the hands (variant menu, text box) → [2] the
// stored bench doc (door-written) → [3]/[4] the write door (both
// patch verbs — the felt refusal) → end-to-end on the real
// services, real registry seat.
//
// Run: npx vitest run tests/walls/ts/suites/variant-switch-parity.spec.ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdtempSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Context } from "@deepseek-ai/cordis";
import Storage from "@deepseek-ai/dsh-storage";
import {
  apply as jsonApply, Config as JsonConfig, inject as jsonInject, name as jsonName,
} from "@deepseek-ai/dsh-storage-json";
import {
  apply as domainApply, Config as DomainConfig, inject as domainInject, name as domainName,
} from "@deepseek-ai/dsh-storage-domain";
import type { Domain } from "@deepseek-ai/dsh-storage-domain";
import { DraftsRemoteService, BenchRemoteService, installBenchChangeSeam } from "../../../../packages/estate/drafts/src/remote.ts";
import { openDraftsDomain, DraftsDomainSeatService } from "../../../../packages/estate/drafts/src/store.ts";
import { benchBlockOf } from "../../../../packages/estate/drafts/src/bench.ts";
import type { DraftsDomainSpec } from "../../../../packages/estate/drafts/src/spec.js";
import { CardRegistryService, FAMILY_RESEAT_CARVE } from "../../../../packages/harness/estate-queue/src/cardsRegistry.ts";
import { FlowsSeatService } from "../../../../packages/harness/estate-queue/src/flowsData.ts";
import { getModel, loadCardDefs } from "@melite/comfyui-cordis";
// THE CLIENT'S OWN VARIANT-PICK BUILDER (the unforgeable half): the
// patch the axes send when the operator picks a variant row — never
// re-typed here.
import { axisPickPatch } from "../../../../packages/web/card-base/src/spec.ts";
import { formSpecArm } from "../../../../packages/harness/melite-tools/src/discovery.ts";

process.env["MELITE_REPO_ROOT"] = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "..", "..", "..", "..",
);

const sig = new AbortController().signal;
const AXIS_KEYS = ["model", "variant", "quant"] as const;

/** A probe value for one stated field of a lane's surface (used only
 *  when the spec row declares no default — the row's own defaults
 *  ride first, so value-refusals surface only for undeclared knobs
 *  and are logged verbatim). */
function probeFor(name: string): unknown {
  if (/^(seed|steps|width|height|num|count|max|min|batch|frames|dur|quality|strength|denoise|shift|cfg|top_k|top_p|temperature|speed|repetition_penalty)$/.test(name)) return 1;
  if (/^(is|has|use|enable|show|allow|double|crop|mask_invert)$/i.test(name)) return false;
  return "variant-switch probe " + name;
}

/** One offered seat on a family's variant ladder (the liveness
 *  roster's derivations — never a hand list). The MODEL is the
 *  family id itself (the facts row's own key — a cell's `route` is
 *  a fetch detail, never a model id). */
interface Seat {
  variantId: string;
  quant: string;
  surface: readonly string[];
}

let drafts: Domain<DraftsDomainSpec>;
let gui: DraftsRemoteService;
let bench: BenchRemoteService;
let facts: Record<string, import("../../../../packages/harness/estate-queue/src/cardsFacts.ts").ModelFactsRow>;
let specs: Map<string, Awaited<ReturnType<typeof formSpecArm>>>;
let root: string;
let reg: CardRegistryService;

beforeAll(async () => {
  root = mkdtempSync(join(tmpdir(), "variant-switch-"));
  mkdirSync(join(root, "storage"), { recursive: true });
  const ctx = new Context();
  await ctx.plugin(Storage as never, undefined as never);
  await ctx.plugin({ name: jsonName, inject: jsonInject, apply: jsonApply, Config: JsonConfig } as never, { root: join(root, "storage") } as never);
  await ctx.plugin({ name: domainName, inject: domainInject, apply: domainApply, Config: DomainConfig } as never, { backend: "json" } as never);
  new DraftsDomainSeatService(ctx);
  installBenchChangeSeam(ctx);
  // THE REAL REGISTRY as the doors' seat (the dropper + admission)
  new FlowsSeatService(ctx);
  (ctx as unknown as { queue: unknown }).queue = { stateRoot: mkdtempSync(join(tmpdir(), "variant-switch-q-")), stateRoots: [] };
  reg = new CardRegistryService(ctx);
  await reg.prime();
  drafts = await openDraftsDomain(ctx);
  gui = new DraftsRemoteService(ctx);
  bench = new BenchRemoteService(ctx);
  facts = reg.modelFacts();
  specs = new Map();
}, 120_000);

afterAll(() => {
  rmSync(root, { recursive: true, force: true });
});

/** The family's offered seats + each seat's declared lane surface
 *  (family ∪ variant ∪ cell — the same cascade the door judges). */
function seatsOf(family: string): Seat[] {
  const row = facts[family];
  if (row === undefined) return [];
  const out: Seat[] = [];
  for (const v of row.variants ?? []) {
    if (v.hide_from_dropdown === true || v.group === "Recipe") continue;
    const vSurface = [...(row.params ?? []), ...(v.params ?? [])];
    const cells = (v.cells ?? []).filter((c) => c.hide_from_dropdown !== true);
    if (cells.length === 0) {
      out.push({ variantId: v.id, quant: "", surface: vSurface });
      continue;
    }
    for (const c of cells) {
      out.push({
        variantId: v.id,
        quant: typeof c.quant === "string" ? c.quant : "",
        surface: [...vSurface, ...(c.params ?? [])],
      });
    }
  }
  return out;
}

interface SeededDoc {
  docId: string;
  session: string;
  rev: number;
  burned: string | null;
}

async function revOf(docId: string): Promise<number> {
  const row = await drafts.table("docs").get(docId);
  return benchBlockOf((row?.doc ?? {}) as Record<string, unknown>).rev;
}

/** One seat's door-classified surface: the fields whose probe
 *  ADMITS (they join every stored state) and the CONDITIONAL roster
 *  (field → the door's own refusal voice — must teach, never bare).
 *  Derived once per seat THROUGH the GUI door itself; the gestures
 *  never re-derive it. */
interface SeatClass {
  admissible: string[];
  conditional: Map<string, string>;
}

const seatClasses = new Map<string, SeatClass>();

/** A typed probe literal when the door's own voice names the kind it
 * wants (the refusal voice IS the teacher: `$.f expected number but
 * got string` — a wrong-typed probe is the wall's guess, never a
 * door law, so it is solved, not classified). */
function probeOfKind(kind: string): unknown {
  switch (kind) {
    case "number": case "integer": return 0;
    case "boolean": return true;
    case "array": return [];
    case "object": return {};
    default: return "variant-switch probe";
  }
}

/** Classify one seat's surface through the door: the row's own
 *  defaults write first (the operator's real fresh-card state), then
 *  every default-less field probes ALONE on top — a probe that
 *  admits is a stored-state field; a probe that refuses is the
 *  conditional class and its voice rides verbatim. */
async function classifySeat(
  card: string, family: string, seat: Seat, tag: string,
): Promise<SeatClass> {
  const key = `${card}\u0000${family}\u0000${seat.variantId}\u0000${seat.quant}`;
  const cached = seatClasses.get(key);
  if (cached !== undefined) return cached;
  const docId = `bench-${tag}`;
  const axis: Record<string, unknown> = { model: family, variant: seat.variantId };
  if (seat.quant !== "") axis["quant"] = seat.quant;
  await drafts.table("docs").put(docId, {
    updated_at: 1,
    doc: {
      draft_id: docId, intent: "gesture", status: "ready", createdAt: 1, completedAt: null,
      stages: [{ id: "s_0", card, params: axis }],
      bench: { rev: 0, log: [] },
    } as never,
  });
  const spec = await formSpecArm(family, undefined, []);
  if (!specs.has(family)) specs.set(family, spec);
  const rowDefaults = ((spec?.variants ?? []).find((r) => r.id === seat.variantId)?.defaults ?? {}) as Record<string, unknown>;
  let rev = 0;
  // the defaults write — the real fresh card (never a burn class)
  const defaultsPatch: Record<string, unknown> = {};
  for (const f of seat.surface) {
    if (Object.prototype.hasOwnProperty.call(rowDefaults, f)) defaultsPatch[f] = rowDefaults[f];
  }
  if (Object.keys(defaultsPatch).length > 0) {
    await gui.patch(docId, "s_0", { params: defaultsPatch }, rev, sig);
    rev = await revOf(docId);
  }
  // the per-field probes — ALONE, on top of the defaults state; a
  // typed refusal (the voice names the wanted kind) is retried with
  // the typed literal before any classification
  const admissible: string[] = [];
  const conditional = new Map<string, string>();
  for (const f of seat.surface) {
    if ((AXIS_KEYS as readonly string[]).includes(f)) continue;
    if (Object.prototype.hasOwnProperty.call(rowDefaults, f)) { admissible.push(f); continue; }
    let value: unknown = probeFor(f);
    let voice: string | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await gui.patch(docId, "s_0", { params: { [f]: value } }, rev, sig);
        rev = await revOf(docId);
        voice = null;
        break;
      } catch (err) {
        voice = err instanceof Error ? err.message : String(err);
        const m = voice.match(/expected (\w+) but got/);
        if (m === null) break;
        value = probeOfKind(m[1] === undefined ? "" : m[1]);
      }
    }
    if (voice === null) admissible.push(f);
    else conditional.set(f, voice);
  }
  const out = { admissible, conditional };
  seatClasses.set(key, out);
  return out;
}

/** Birth a bench doc holding one stage SEATED at `seat`, then write
 *  the seat's DOOR-ADMISSIBLE surface (defaults + probe-admitted
 *  fields, classified once through the door itself) — a stored state
 *  is only ever what the door admits (a bulk refusal is that card's
 *  own burn, returned verbatim; the conditional roster is judged by
 *  the teaching-voice arm below). */
async function seedThroughDoor(
  card: string, family: string, seat: Seat, tag: string,
): Promise<SeededDoc> {
  const cls = await classifySeat(card, family, seat, `vs-c${tag}`);
  const docId = `bench-${tag}`;
  const axis: Record<string, unknown> = { model: family, variant: seat.variantId };
  if (seat.quant !== "") axis["quant"] = seat.quant;
  await drafts.table("docs").put(docId, {
    updated_at: 1,
    doc: {
      draft_id: docId, intent: "gesture", status: "ready", createdAt: 1, completedAt: null,
      stages: [{ id: "s_0", card, params: axis }],
      bench: { rev: 0, log: [] },
    } as never,
  });
  const spec = specs.get(family);
  const rowDefaults = ((spec?.variants ?? []).find((r) => r.id === seat.variantId)?.defaults ?? {}) as Record<string, unknown>;
  const surface: Record<string, unknown> = {};
  for (const f of cls.admissible) surface[f] = rowDefaults[f] ?? probeFor(f);
  try {
    await gui.patch(docId, "s_0", { params: surface }, 0, sig);
  } catch (err) {
    return { docId, session: tag, rev: 0, burned: `${card} / ${family} / ${seat.variantId}${seat.quant}: THE SOURCE STATE ITSELF IS UNWRITABLE — ${err instanceof Error ? err.message : String(err)}` };
  }
  return { docId, session: tag, rev: await revOf(docId), burned: null };
}

/** THE CLIENT'S VARIANT PICK in its WIRE FORM (the real builder,
 *  held omitted — the minimal re-key: "ALL I DID WAS CHANGE THE
 *  VARIANT"), then the GUI's own onPick translation: an axis key
 *  the pick stamps '' rides null — a DELETE — because the door's
 *  empty-selection law refuses a stated '' (one law, two doors). */
async function clientVariantPatch(family: string, target: Seat): Promise<Record<string, unknown>> {
  const spec = await formSpecArm(family, undefined, []);
  if (!specs.has(family)) specs.set(family, spec);
  const fallback: Record<string, unknown> = { variant: target.variantId };
  if (target.quant !== "") fallback["quant"] = target.quant;
  let patch: Record<string, unknown>;
  const row = (spec?.variants ?? []).find((r) => r.id === target.variantId);
  if (spec === null || row === undefined) patch = fallback;
  else patch = axisPickPatch(spec, row, undefined) as Record<string, unknown>;
  for (const k of AXIS_KEYS) if (patch[k] === "") patch[k] = null;
  return patch;
}

describe("THE VARIANT-SWITCH GESTURE — every card, every transition, both doors (operator 2026-10-22)", () => {
  interface TransitionArm {
    card: string;
    family: string;
    from: Seat;
    to: Seat;
    pick: Record<string, unknown>;
  }
  const transitions: TransitionArm[] = [];
  const sourceBurns: string[] = [];

  beforeAll(async () => {
    const pairs = new Set<string>();
    for (const [cardId, def] of await loadCardDefs()) {
      for (const family of def.boarded ?? []) {
        const key = cardId + "\u0000" + family;
        if (pairs.has(key)) continue;
        pairs.add(key);
        const seats = seatsOf(family);
        if (seats.length < 2) continue;
        for (const from of seats) {
          for (const to of seats) {
            if (from.variantId === to.variantId && from.quant === to.quant) continue;
            transitions.push({ card: cardId, family, from, to, pick: await clientVariantPatch(family, to) });
          }
        }
      }
    }
  });

  it("the roster is not silent (a gesture census with no transitions judges nothing)", () => {
    expect(transitions.length, "variant transitions across the fleet").toBeGreaterThan(4);
    // THE BURN'S OWN TRANSITION must be IN the derived roster — the
    // census reaches it by derivation, never by hand-listing it
    expect(transitions.some((t) => t.card === "tts" && t.from.variantId !== t.to.variantId && t.to.variantId === "voicedesign"),
      "the tts → voicedesign gesture (the operator's burn) must be in the roster").toBe(true);
  });

  it("THE SKIP IS DEAD (the 36-burn cure, 2026-11-03): every previously-burned seat class — h3-timeline's inject vocabulary, image-edit's match-gated pair — seeds through the door and its transitions RIDE", async () => {
    // The old wall bulk-probed every declared field at once; the
    // h3 seats refused (the probe itself derives t4r, which bans
    // the probed keys) and the image-edit seats refused (width
    // fires only when match_input_resolution is OFF) — 36 source
    // burns, every one of those transitions skipped, the gestures
    // judged nothing for two whole cards. The classified seed must
    // land both classes clean; a regression to the bulk probe reds
    // here on the first h3 seat.
    const bad: string[] = [];
    let ridden = { h3: 0, edit: 0 };
    for (const [cardId, def] of await loadCardDefs()) {
      const wants = cardId === "h3-timeline" ? "h3" : cardId === "image-edit" ? "edit" : null;
      if (wants === null) continue;
      for (const family of def.boarded ?? []) {
        for (const seat of seatsOf(family)) {
          const seeded = await seedThroughDoor(cardId, family, seat, `vs-skip-${wants}-${seat.variantId}-${seat.quant || "none"}`);
          if (seeded.burned !== null) {
            bad.push(seeded.burned);
          } else {
            ridden = wants === "h3" ? { ...ridden, h3: ridden.h3 + 1 } : { ...ridden, edit: ridden.edit + 1 };
          }
        }
      }
    }
    expect(bad, "the skip-class seats — each must seed clean through the classified door (the burn log below is the regression)").toEqual([]);
    expect(ridden.h3, "h3-timeline seats ride (the inject-vocabulary class)").toBeGreaterThan(0);
    expect(ridden.edit, "image-edit seats ride (the match-gated class)").toBeGreaterThan(0);
  }, 180000);
  it("THE CONDITIONAL ROSTER TEACHES (the honest-voice rider class): every door-refused declared field names its repair door — a bare refusal of a declared field reds", async () => {
    // Fleet-wide census: classify EVERY seat of EVERY boarded family
    // through the door, then judge the voices. The one surviving
    // legal conditional class teaches by design — image-edit's width
    // names the match_input_resolution flip. h3's old inject class
    // (the t4r dead letter) is RETIRED: its refusal voice must appear
    // ZERO times fleet-wide, and its seats must classify clean (the
    // retirement's own receipt). Any NEW conditional field must teach
    // like the flip class (name the flip, the restate, the null, or
    // the door) — "refused: X" is the dead-box bug wearing a
    // classification badge.
    const bare: string[] = [];
    const stale: string[] = [];
    let taught = { flip: 0 };
    for (const [cardId, def] of await loadCardDefs()) {
      for (const family of def.boarded ?? []) {
        for (const seat of seatsOf(family)) {
          const cls = await classifySeat(cardId, family, seat, `vs-voice-${cardId}-${family}-${seat.variantId}-${seat.quant || "none"}`);
          for (const [field, voice] of cls.conditional) {
            const where = `${cardId} / ${family} / ${seat.variantId}${seat.quant} / '${field}'`;
            if (/match_input_resolution/.test(voice)) taught.flip++;
            else if (/unsanctioned inject keys/.test(voice)) stale.push(`${where}: ${voice}`);
            if (!/(flip|restate|null|switch|delete|remove|turn off|patch door|through the studio)/i.test(voice)) {
              bare.push(`${where}: BARE REFUSAL — ${voice}`);
            }
          }
        }
      }
    }
    expect(bare, "conditional fields whose refusal teaches no repair — the honest-voice rider class").toEqual([]);
    expect(taught.flip, "the match-gated conditional class is present and teaching").toBeGreaterThan(0);
    expect(stale, "the retired inject vocabulary never refuses a declared field again (the retirement's receipt)").toEqual([]);
  }, 600000);
  it("GESTURE A — THE SWITCH through the GUI's door (drafts/patch, the keystroke door): the variant pick lands with the source lane's state stored", async () => {
    const bad: string[] = [];
    let n = 0;
    for (const t of transitions) {
      const seeded = await seedThroughDoor(t.card, t.family, t.from, `vs-a-${n++}`);
      if (seeded.burned !== null) { sourceBurns.push(seeded.burned); continue; }
      try {
        await gui.patch(seeded.docId, "s_0", { params: { ...t.pick } }, seeded.rev, sig);
      } catch (err) {
        bad.push(`${t.card} / ${t.family} / ${t.from.variantId}${t.from.quant} → ${t.to.variantId}${t.to.quant}: THE SWITCH DID NOT LAND — ${err instanceof Error ? err.message : String(err)}`);
      }
    }
    // Source states the door itself refuses to write are that
    // card's own burn — logged verbatim every run, owned by the
    // card's tier (h3-timeline's surface), never silently green.
    if (sourceBurns.length > 0) {
      console.log(`[variant-switch-parity] ${sourceBurns.length} unwritable source states (the door refuses the card's own declared surface — that card's tier owns the cure):`);
      for (const b of sourceBurns) console.log("  - " + b);
    }
    expect(bad, "stuck switches — the operator changed the variant and the write refused (the attempt-11 class)").toEqual([]);
  }, 300000);
  it("GESTURE B — the same switch through the agent's door (bench/patch): the wired control lands", async () => {
    const bad: string[] = [];
    let n = 0;
    for (const t of transitions) {
      const seeded = await seedThroughDoor(t.card, t.family, t.from, `vs-b-${n++}`);
      if (seeded.burned !== null) continue;
      try {
        await bench.patch(seeded.session, { stage: "s_0", params: { ...t.pick }, expect_rev: seeded.rev }, sig);
      } catch (err) {
        bad.push(`${t.card} / ${t.family} / ${t.from.variantId}${t.from.quant} → ${t.to.variantId}${t.to.quant}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
    expect(bad, "the same gesture on the wired door — parity control (a roster only the unwired door refuses is the split)").toEqual([]);
  }, 300000);
  it("GESTURE C — THE OPERATOR'S SEQUENCE: fresh card on the source lane, switch the variant, then type in each of the target lane's own boxes — every write lands", async () => {
    const bad: string[] = [];
    let n = 0;
    for (const t of transitions) {
      const seeded = await seedThroughDoor(t.card, t.family, t.from, `vs-c-${n++}`);
      if (seeded.burned !== null) continue;
      // the switch itself (same door, same pick — the gesture's
      // first write; a refusal here is the attempt-11 class)
      let rev = seeded.rev;
      try {
        await gui.patch(seeded.docId, "s_0", { params: { ...t.pick } }, rev, sig);
        rev = await revOf(seeded.docId);
      } catch (err) {
        bad.push(`${t.card} / ${t.family} / ${t.from.variantId}${t.from.quant} → ${t.to.variantId}${t.to.quant}: THE SWITCH DID NOT LAND — ${err instanceof Error ? err.message : String(err)}`);
        continue;
      }
      // then the boxes: each target-ADMISSIBLE field typed ALONE (the
      // mid-edit state the studio actually holds between keystrokes);
      // a conditional field (classified refusing at the probe —
      // width-under-match-on, the t4-only inject vocabulary) legally
      // refuses bare and rides the teaching-voice arm instead
      const spec = specs.get(t.family);
      const rowDefaults = ((spec?.variants ?? []).find((r) => r.id === t.to.variantId)?.defaults ?? {}) as Record<string, unknown>;
      const cls = await classifySeat(t.card, t.family, t.to, `vs-c-box${n}`);
      for (const f of cls.admissible) {
        try {
          await gui.patch(seeded.docId, "s_0", { params: { [f]: rowDefaults[f] ?? probeFor(f) } }, rev, sig);
          rev = await revOf(seeded.docId);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          // THE FRICTIONLESS-AUTHORING RULING (operator 2026-11-11:
          // "The refusal is never one keystroke at a time … you are
          // submitting a form, not hacking the mainframe" —
          // reaffirming the 2026-11-10 order): a mid-authoring half —
          // a together group or an either_or alternative stated but
          // not complete — SAVES. The write door drops the
          // authoring-half class exactly as it drops the
          // unstated-required word; THE RUN PRESS owns the complete
          // pair (the run-gate arm below fires its refusal). Any
          // refusal here, in any voice, is the dead-box bug again.
          bad.push(`${t.card} / ${t.family} / ${t.to.variantId}${t.to.quant} / typing '${f}': THE BOX DID NOT LAND — ${msg}`);
        }
      }
    }
    expect(bad, "dead boxes — the operator switched the variant and the very next keystroke refused (the save accepts a form being filled)").toEqual([]);
  }, 600000);
  it("THE RUN GATE (the same ruling's other half): a landed together-half pair SAVES at the write door and the RUN PRESS refuses it — the pair completes at the press, never mid-form", async () => {
    // the burn's own pair: qwen3-tts's ref lane declares ref_audio +
    // ref_text together. Seed on the source seat, SWITCH to the seat
    // whose surface fires ref_text (the operator's gesture — the
    // switch must land first), then state the half EXPLICITLY
    // (ref_text stated, ref_audio deleted) through the GUI door —
    // the ruling says this saves.
    const tts = transitions.find(
      (t) => t.family === "qwen3-tts" && t.to.surface.includes("ref_text"));
    expect(tts, "the estate boards a qwen3-tts lane that fires ref_text").toBeDefined();
    if (tts === undefined) return;
    const seeded = await seedThroughDoor(tts.card, tts.family, tts.from, "vs-run-gate");
    expect(seeded.burned, "the source seat seeds clean").toBeNull();
    if (seeded.burned !== null) return;
    let rev = seeded.rev;
    await gui.patch(seeded.docId, "s_0", { params: { ...tts.pick } }, rev, sig);
    rev = await revOf(seeded.docId);
    await gui.patch(seeded.docId, "s_0",
      { params: { ref_audio: null, ref_text: "a mid-form anchor text" } }, rev, sig);
    rev = await revOf(seeded.docId);
    // the stored row holds exactly the half
    const stored = (await drafts.table("docs").get(seeded.docId))?.doc as
      | { stages: Array<{ id: string, params: Record<string, unknown> }> }
      | undefined;
    const stage = stored?.stages.find((s) => s.id === "s_0");
    expect(stage, "the half-pair row is stored").toBeDefined();
    if (stage === undefined) return;
    expect(stage.params, "ref_text stated").toHaveProperty("ref_text", "a mid-form anchor text");
    expect(stage.params, "ref_audio absent — the pair is half").not.toHaveProperty("ref_audio");
    // THE PRESS: the run seat judges the stored row strict (the
    // write door's authoring filter never rides here) — the together
    // voice refuses the half, naming the pair.
    const runMsg = await reg.phase1Card(
      { ...stage.params, card: tts.card, model: tts.family } as Record<string, unknown>,
      tts.family,
    ).then(() => null, (e: unknown) => (e instanceof Error ? e.message : String(e)));
    expect(runMsg, "the run press refuses the half pair").toMatch(
      /(ride together on this lane|completes none of them)/);
  });

  it("THE FAMILY-RESEAT CARVE, EMPTIED (the one-seat migration, 2026-11-12 — the carve landed 2026-11-11 as the operator's bridge: 'just make a carve for H3 as an exception, then do the ONE seat for the rest'): NO card declares a per-card reseat face, the carve is empty, and the derived family rides the MODEL DECL — the door arms below judge doors, this arm judges the seat's own shape", async () => {
    // the REAL defs, the same load the registry primes; the face is
    // deleted from the CardDefinition type, so the judge reads the
    // runtime extra property through the cast — a def that silently
    // grows one back reds HERE and at prime() (the boot judge's own
    // spelling).
    const implementing: string[] = [];
    let h3Declares = false;
    for (const [id, def] of await loadCardDefs()) {
      if ((def as { reseatFamily?: unknown }).reseatFamily !== undefined) implementing.push(id);
      for (const family of def.boarded) {
        if (getModel(family).familyLaw !== undefined) {
          if (id === "h3-timeline") h3Declares = true;
        }
      }
    }
    expect([...implementing].sort(),
      "the per-card reseat faces — the face is DEAD (the one-seat migration): any def declaring one reds here and at prime() boot").toEqual([]);
    expect([...FAMILY_RESEAT_CARVE].sort(),
      "the carve stays EMPTY — it can never silently refill").toEqual([]);
    expect(h3Declares,
      "h3's derived family (deriveWindowFamily — an axis no DECL variant row can name) rides the MODEL DECL (ModelDecl.familyLaw), the declaration the registry's ONE seat resolves").toBe(true);
  });

  it("BOTH SEATS, ONE STATE (attempt 12, 2026-11-11): the rendered form's inline gate and the registry's write door pass the SAME authoring halves — drift between the two seats IS the red", async () => {
    // THE ATTEMPT-12 LESSON, WALLED: the door filtered the
    // authoring-half class while the form's own copy of the
    // judgment refused it, and every wall stayed green because the
    // walls drove the door, never the form. This arm drives BOTH
    // seats with the SAME state — the burn's own family and pairs —
    // and reds the instant their verdicts diverge.
    const { laneViolations } = await import("../../../../packages/web/card-base/src/spec.ts");
    const tts2 = transitions.filter((t) => t.family === "qwen3-tts");
    expect(tts2.length, "the roster derives qwen3-tts transitions").toBeGreaterThan(0);
    const bad: string[] = [];
    const seen = new Set<string>();
    for (const t of tts2) {
      const spec = specs.get(t.family);
      if (spec == null) continue;
      const fields: Array<{ name: string }> = [];
      for (const f of t.to.surface) {
        if ((AXIS_KEYS as readonly string[]).includes(f)) continue;
        const key = `${t.to.variantId}/${f}`;
        if (seen.has(key)) continue;
        seen.add(key);
        fields.push({ name: f });
        // the HALF state: the pick + ONE box stated, the pair's other
        // half absent — the operator mid-form
        const user: Record<string, unknown> = { ...t.pick, model: t.family, [f]: probeFor(f) };
        // seat 1 — THE RENDERED FORM'S GATE (hop [1]): no
        // authoring-half voice may render
        const formGate = laneViolations(spec, fields as never, user);
        const formHalfVoices = formGate.filter((v) =>
          /ride together on this lane|completes none of them|this lane requires/.test(v.message));
        if (formHalfVoices.length > 0) {
          bad.push(`FORM seat refuses the half (${key}): ${formHalfVoices.map((v) => v.message).join("; ")}`);
        }
        // seat 2 — THE REGISTRY'S WRITE DOOR: the same state admits
        const door = reg.admitStageRelations(t.card, user);
        if (!door.ok) {
          bad.push(`DOOR refuses the same half (${key}): ${door.error}`);
        }
        // THE DRIFT RED: a pass at one seat and a refusal at the
        // other is the multiple-seat disease, whatever its direction
        if (formHalfVoices.length === 0 !== (door.ok === true)) {
          bad.push(`DRIFT (${key}): form ${formHalfVoices.length === 0 ? "passes" : "refuses"} while door ${door.ok === true ? "passes" : "refuses"}`);
        }
      }
    }
    expect(bad, "both seats, one state — the attempt-12 drift is red in both directions").toEqual([]);
  });
});
