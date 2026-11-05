// compose-plane-card-ports.spec.ts — THE COMPOSE-PLANE CURE WALL
// (the operator's every-add burn, 2026-11-14; the escalation's
// ghost/mask findings, pinned empirically before a line moved).
//
// THE BURN: every card-mode press through a compose-seated door
// refused with `stage "s_N" (<card>) would not compose: flow "fit-seat"
// stage "s_N" declares no outputs and names no card — add
// outputs={'<channel>': <Kind>} on the stage`. The refusal's flow id
// is the bench INTENT (the flow press set it), and the named stage is
// the CANDIDATE at its minted id — not the marker row. The poison was
// never the ghost: `trim` ALONE on a clean bench refused identically.
//
// THE MECHANISM: the bench stage contract's card-ports law
// (web-kit/contracts benchStage.ts normalizeBenchStage — "absent on a
// card stage stays ABSENT (compose fills from the ports)") stores
// every card row with outputs:{}; the flow lattice's one-table cure
// (2026-11-01) read only the ROW's own tables at kindsOk/toGraph, so
// every stored card row reached the serve tail unresolved and refused
// in the card-less voice. The run compose never saw the break: its
// composeCardStageRow resolves the same row through `cardDeclared`
// (runsRegistry.ts) — a split brain, healed by giving the lattice the
// same leg: kindsOk's card-gate pass fills a card stage's empty
// cardIo from the card's declared flowKinds.outputs (the ONE TABLE —
// row-declared outputs and card_io always win; a card declaring no
// ports stays deferred).
//
// THE INVARIANTS, arms on their OWN paths:
//
//   GHOST-DOC-THEN-ADD (the operator's doors) — a marker-carrying
//   doc in the RETIRED press's landed shape (seeded raw: the write
//   doors refuse ref_flow since flows-bench-card-purity, 2026-11-14;
//   the live F60 bench holds this doc) and the NEXT card-mode press
//   of an UNRELATED card composes CLEAN through the real add door,
//   the marker riding the projection (per-compose isolation: a
//   foreign/flow-minted row never fails an unrelated card's compose).
//
//   CLEAN-BENCH ADD — the same add on a bench with no marker lands
//   too: the cure is the fill, not a ghost-conditional exemption.
//
//   THE MISDIAGNOSIS VOICE IS DEAD — a card row the CARD refuses
//   (trim without its required clip) refuses AT THE PRESS in the
//   card door's own semantic voice (composeCardStagesAtValidate, the
//   ONE-ADMISSION walk — runsValidateArms), naming the missing knob;
//   the card-less "declares no outputs and names no card" voice never
//   fires for a row that names a card.
//
//   (F47's mask-surface arms and the card∩flow id census ride their
//   own suite — compose-plane-card-surface.spec.ts — one invariant,
//   one firing path.)
//
//   THE MINT IS DEAD — NO tool-plane site writes ref_flow (the press
//   is one runsStart, no bench touch): the marker's absence is
//   provable, so the walk's per-compose isolation needs no
//   marker-shaped special case anywhere else.
//
// Red-proofs (§5, hands off the target files): toggle the card-ports
// fill out of kindsOk (runsValidateStages.ts) → GHOST-DOC-THEN-ADD
// and CLEAN-BENCH ADD red with the verbatim `declares no outputs and
// names no card` burn; the misdiagnosis arm reds on the voice swap
// (the card door's knob voice never fires when the lattice refuses
// first). The mint arm is source-derived and stays green under that
// toggle (it guards a different invariant on its own path); a
// reintroduced `ref_flow:` writer reds it directly.
//
// Run: npx vitest run tests/walls/ts/suites/compose-plane-card-ports.spec.ts
import { describe, expect, it, beforeAll, afterAll, vi } from "vitest";
import { Context } from "@deepseek-ai/cordis";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readFileSync, readdirSync } from "node:fs";

// THE HERMETIC ENGINE (the walls' boot-fixture idiom): the
// one-admission walk primes object_info from the boot fixture — the
// live engine on a dev box must never decide a wall's verdict.
const oiFixture = vi.hoisted(() => ({
  censusFn: vi.fn(async (): Promise<Record<string, unknown>> => {
    return JSON.parse(
      readFileSync(new URL("../../fixtures/object_info.boot.json", import.meta.url), "utf8"),
    ) as Record<string, unknown>;
  }),
}));
vi.mock("@melite/comfyui-cordis", async (importOriginal) => {
  const real = await importOriginal<typeof import("@melite/comfyui-cordis")>();
  return { ...real, liveObjectInfo: oiFixture.censusFn };
});

import { BenchRemoteService } from "@melite/estate-drafts";
import { bootCtxAt, seed, sig } from "../../../../packages/estate/drafts/tests/bench-helpers.ts";
import type { Domain } from "@deepseek-ai/dsh-storage-domain";
import type { DraftsDomainSpec } from "../../../../packages/estate/drafts/src/spec.js";
import { CardRegistryService } from "../../../../packages/harness/estate-queue/src/cardsRegistry.ts";
import { validate as validateArm } from "../../../../packages/harness/estate-queue/src/runsValidateArms.ts";
import { FLOW_ID_RE } from "../../../../packages/harness/estate-queue/src/runsGates.ts";
import { remoteErrorOf } from "@deepseek-ai/dsh-typert-protocol";

let ctx: Context;
let domain: Domain<DraftsDomainSpec>;
let bench: BenchRemoteService;

beforeAll(async () => {
  const booted = await bootCtxAt(mkdtempSync(join(tmpdir(), "wall-compose-plane-")));
  ctx = booted.ctx;
  domain = booted.domain;
  // The real card registry, primed from the DECL census (keyless —
  // the object_info read rides the fixture mock above).
  new CardRegistryService(ctx);
  await (ctx.cardRegistry as unknown as { prime(): Promise<void> }).prime();
  // The queue seat the registry's corners read; no live engine, no
  // real state root.
  (ctx as unknown as { queue: unknown }).queue = {
    stateRoot: mkdtempSync(join(tmpdir(), "wall-compose-plane-queue-")),
    stateRoots: [] as string[],
  };
  // THE RUNS SEAT, the production delegation verbatim: the service's
  // validate arm IS this function (runsRegistry.ts RunsRuntimeService
  // validate → validateArm(doc, signal, this.ctx)) — the wall rides
  // the real judge, not a stub of it.
  ctx.provide("runs", {
    validate: (doc: unknown, signal: AbortSignal) => validateArm(doc, signal, ctx),
  });
  bench = new BenchRemoteService(ctx);
}, 120_000);

afterAll(async () => {
  await ctx.fiber.dispose();
});

/** The card's first boarded family — the model row id the board
 *  check admits (the plain family id; the same shape the probe
 *  verified for image-edit's qwen board). */
function midFor(card: string): string {
  const defs = (ctx.cardRegistry as unknown as {
    defsSync: () => Map<string, { boarded?: readonly string[] }>;
  }).defsSync();
  const boards = defs.get(card)?.boarded ?? [];
  expect(boards.length > 0, `the wall's ${card} boards a family`).toBe(true);
  return boards[0] as string;
}

/** A marker-carrying bench doc in the RETIRED press's landed shape,
 *  seeded straight into the domain — the ensure door REFUSES this
 *  shape since flows-bench-card-purity (2026-11-14; the press is one
 *  runsStart now, no bench touch), but the lattice must still fill
 *  around a doc the older door wrote (the live F60 bench holds it;
 *  serve is tolerant by design). */
async function seedFlowDoc(session: string, flow: string): Promise<void> {
  await seed(domain, session, {
    intent: flow,
    stages: [{ id: "s_0", engine: "comfyui", ref_flow: flow, params: {} }],
  });
}

async function addCard(
  session: string,
  doc: Record<string, unknown>,
): Promise<{ ok: true; row: Record<string, unknown> } | { ok: false; message: string }> {
  try {
    const current = (await bench.get(session, sig)) as unknown as { rev: number };
    const row = await (bench as unknown as {
      addStage: (session: string, doc: unknown, signal: AbortSignal) => Promise<unknown>;
    }).addStage(session, { ...doc, expect_rev: current.rev }, sig);
    return { ok: true, row: row as Record<string, unknown> };
  } catch (e) {
    const re = remoteErrorOf(e);
    return { ok: false, message: re !== null && re !== undefined ? re.message : (e instanceof Error ? e.message : String(e)) };
  }
}

async function stagesOf(session: string): Promise<Array<Record<string, unknown>>> {
  const doc = (await bench.get(session, sig)) as unknown as { stages: Array<Record<string, unknown>> };
  return doc.stages;
}

describe("the compose plane: the card-ports fill at the lattice (the every-add burn)", () => {
  it("GHOST-DOC-THEN-ADD — the fit-seat marker rides, the unrelated trim add composes clean", async () => {
    const session = "session-compose-press-add";
    await seedFlowDoc(session, "fit-seat");
    const landed = await addCard(session, { card: "image-gen", params: { model: midFor("image-gen"), prompt: "a seated figure" } });
    expect(landed.ok, landed.ok ? "" : "the unrelated add refused: " + landed.message).toBe(true);
    if (!landed.ok) return;
    const rows = await stagesOf(session);
    // The legacy marker stays intact (serve is tolerant; the cure is
    // the remove door) and the candidate landed at its own mint.
    expect(rows.map((r) => String(r["id"]))).toEqual(["s_0", "s_1"]);
    expect(rows[0]?.["ref_flow"]).toBe("fit-seat");
    expect(rows[1]?.["card"]).toBe("image-gen");
  });

  it("CLEAN-BENCH ADD — the fill is the mechanism, not a ghost exemption", async () => {
    const session = "session-compose-clean";
    await bench.ensure({ session, intent: "bench", stages: [] }, sig);
    const landed = await addCard(session, { card: "image-gen", params: { model: midFor("image-gen"), prompt: "a seated figure" } });
    expect(landed.ok, landed.ok ? "" : "the clean-bench add refused: " + landed.message).toBe(true);
  });

  it("THE MISDIAGNOSIS VOICE IS DEAD — a card refusal speaks the card door's voice", async () => {
    const session = "session-compose-voice";
    await seedFlowDoc(session, "fit-seat");
    const refused = await addCard(session, { card: "trim", params: {} });
    expect(refused.ok).toBe(false);
    if (refused.ok) return;
    // The card door's own gate names the missing knob at the press.
    expect(refused.message).toContain("clip");
    // The card-less voice never fires for a row that names a card.
    expect(refused.message).not.toContain("declares no outputs and names no card");
    // Nothing landed (the premint law: no mint on refusal).
    const rows = await stagesOf(session);
    expect(rows.map((r) => String(r["id"]))).toEqual(["s_0"]);
  });

  it("THE MINT IS DEAD — no tool-plane site writes ref_flow", async () => {
    // The marker's foreign identity must stay provable — now by its
    // ABSENCE: the press is one runsStart (flows-bench-card-purity,
    // 2026-11-14), so ZERO writers mint ref_flow. A reintroduced
    // writer (`ref_flow:` object-literal key) reds this arm — the
    // walk's isolation reasoning stays provable. melite-flow.ts and
    // melite-construct.ts may still MENTION ref_flow (the retired
    // press's voices: the bench pass names the shape it refuses,
    // slice E's read names the legacy marker and its cures) — a
    // mention is not a mint.
    const toolsDir = new URL("../../../../packages/harness/melite-tools/src/tools/", import.meta.url);
    const hits: string[] = [];
    for (const f of readdirSync(toolsDir)) {
      if (!f.endsWith(".ts")) continue;
      const src = readFileSync(new URL(`../../../../packages/harness/melite-tools/src/tools/${f}`, import.meta.url), "utf8");
      if (src.includes("ref_flow")) hits.push(f);
      expect(src.includes("ref_flow:"), `${f} writes a ref_flow row`).toBe(false);
    }
    expect(hits, "ref_flow mentions (voice only, never a writer)").toEqual(["melite-construct.ts", "melite-flow.ts"]);
  });
});
