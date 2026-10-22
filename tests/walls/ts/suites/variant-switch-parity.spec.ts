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
import { CardRegistryService } from "../../../../packages/harness/estate-queue/src/cardsRegistry.ts";
import { FlowsSeatService } from "../../../../packages/harness/estate-queue/src/flowsData.ts";
import { loadCardDefs } from "@melite/comfyui-cordis";
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
  if (/^(is|has|use|enable|show|allow|double|crop|mask_invert|lanpaint_enabled)$/i.test(name)) return false;
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

beforeAll(async () => {
  root = mkdtempSync(join(tmpdir(), "variant-switch-"));
  mkdirSync(join(root, "storage"), { recursive: true });
  const ctx = new Context();
  await ctx.plugin(Storage as never, undefined as never);
  await ctx.plugin({ name: jsonName, inject: jsonInject, apply: jsonApply, Config: JsonConfig } as never, { root: join(root, "storage") } as never);
  await ctx.plugin({ name: domainName, inject: domainInject, apply: domainApply, Config: DomainConfig } as never, { backend: "json" } as never);
  new DraftsDomainSeatService(ctx, { storageRoot: join(root, "storage") });
  installBenchChangeSeam(ctx);
  // THE REAL REGISTRY as the doors' seat (the dropper + admission)
  new FlowsSeatService(ctx);
  (ctx as unknown as { queue: unknown }).queue = { stateRoot: mkdtempSync(join(tmpdir(), "variant-switch-q-")), stateRoots: [] };
  const reg = new CardRegistryService(ctx);
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

/** Birth a bench doc holding one stage SEATED at `seat`, then write
 *  the seat's surface through the GUI door itself — a stored state
 *  is only ever what the door admits, with values the spec row
 *  itself declares (a refusal is that card's own burn, returned
 *  verbatim; the pair has no legal stored state to switch from). */
async function seedThroughDoor(
  card: string, family: string, seat: Seat, tag: string,
): Promise<SeededDoc> {
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
  for (const f of seat.surface) surface[f] = rowDefaults[f] ?? probeFor(f);
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
  const pinnedDeadBoxes = new Set<string>();

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
  });

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
  });

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
      // then the boxes: each target-surface field typed ALONE (the
      // mid-edit state the studio actually holds between keystrokes)
      const spec = specs.get(t.family);
      const rowDefaults = ((spec?.variants ?? []).find((r) => r.id === t.to.variantId)?.defaults ?? {}) as Record<string, unknown>;
      for (const f of t.to.surface) {
        if ((AXIS_KEYS as readonly string[]).includes(f)) continue;
        try {
          await gui.patch(seeded.docId, "s_0", { params: { [f]: rowDefaults[f] ?? probeFor(f) } }, rev, sig);
          rev = await revOf(seeded.docId);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          if (/ride together on this lane|completes none of them/.test(msg)) {
            // THE PINNED DEBT (surfaced 2026-11-11, NOT cured in the
            // switch wire's increment — the operator's sequencing
            // order): a mid-authoring half-pair refuses AT THE WRITE
            // DOOR. The 2026-11-10 frictionless-authoring ruling
            // ("half-pair writes unlanded and the pair could never
            // complete" — the voice_name brick) ruled these LAND and
            // the Run press refuses; the door never got the ruling.
            // Pinned here verbatim: the exact dead-box set, named in
            // every run, red on ANY drift — growth, wording change,
            // or a silent heal that bypasses this wall's flip.
            pinnedDeadBoxes.add(`${t.family} / ${t.to.variantId}${t.to.quant} / ${f}`);
          } else {
            bad.push(`${t.card} / ${t.family} / ${t.to.variantId}${t.to.quant} / typing '${f}': THE BOX DID NOT LAND — ${msg}`);
          }
        }
      }
    }
    if (pinnedDeadBoxes.size > 0) {
      console.log(`[variant-switch-parity] ${pinnedDeadBoxes.size} PINNED dead boxes (the together-half write-door debt — ruling owed, not cured in this increment):`);
      for (const b of pinnedDeadBoxes) console.log("  - " + b);
    }
    expect(bad, "dead boxes — the operator switched the variant and the very next keystroke refused").toEqual([]);
    // THE PIN: exactly this set, no growth, no silent heal. When the
    // together ruling lands at the door, this arm goes RED (the set
    // empties) and forces the wall's flip — the pin is
    // self-destructing by design.
    expect([...pinnedDeadBoxes].sort(), "the pinned together-half debt — drift in either direction is a red").toEqual([
      "qwen3-tts / base0_6b / ref_audio",
      "qwen3-tts / base0_6b / ref_text",
      "qwen3-tts / base1_7b / ref_audio",
      "qwen3-tts / base1_7b / ref_text",
      "qwen3-tts / voicedesign1_7b / design_prompt",
      "qwen3-tts / voicedesign1_7b / voice_name",
    ]);
  });
});
