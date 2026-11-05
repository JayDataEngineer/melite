// bench-ghost-lifecycle.spec.ts — THE GHOST LIFECYCLE WALL (F46
// bench mint ghosts, operator sweep 2026-11-01 — OPEN & ESCALATED).
//
// THE MATRIX ROW (VERIFICATION.md, verbatim): "F46 bench mint ghosts
// | 🔴 OPEN & ESCALATED — ghosts survive remove_stage AND clear; cure
// found: melite_construct load (overwrite) rewrites the draft;
// add_stage birth is card-bound, load card is hint-only". The
// escalation (FAILURES.md): "ghost survives remove_stage AND clear;
// the working cure is melite_construct load overwrite:true (rewrites
// the draft; add_stage births card-bound stages, load's `card` is a
// hint only — compose-ready benches must be born via add_stage)".
//
// THE EMPIRICAL TRUTH (hermetic probes on this tree, pre-wall): the
// hypothesized filters do not exist in the current code —
// removeStageBench finds its row by `s["id"] === stageId` alone (an
// id-based match, not a card-bound birth filter; a miss refuses LOUD
// `bench/stage-not-found`) and clearBench splices the whole list
// (`stages.length = 0`). Both doors reach a ref_flow-minted ghost:
// remove by the visible id lands rev+1 with the stage gone; clear
// returns the honest `cleared` count and the read is empty. The live
// storage holds zero ghosts (the load-overwrite workaround cleaned
// them). THE REAL GAP WAS COVERAGE: no wall pinned the ghost's
// lifecycle, so a regression to the card-bound filter the matrix
// hypothesized would have landed green. This wall closes it —
//
//   GHOST-DOC → REMOVE: a marker-carrying doc in the RETIRED press's
//   landed shape (seeded straight into the domain — the write doors
//   refuse the shape since flows-bench-card-purity, 2026-11-14; the
//   live F60 bench holds exactly this doc) is removed by its VISIBLE
//   id through the agent's own tool door (melite_construct
//   remove_stage over makeEstate) — the read that follows holds no
//   s_0.
//
//   GHOST-DOC → CLEAR: the same doc, the clear verb — the honest
//   `cleared` count (1, the marker alone) and an empty read.
//
//   ABSENT-ID REFUSES LOUD: removing an id the bench never held
//   refuses `stage not found` — never a silent ok.
//
//   THE REMOVE IS ID-TARGETED: removing the ghost leaves an
//   unrelated card row intact, and removing the card row leaves the
//   ghost intact — a cure that over-reaches into a ghost purge reds
//   the second half.
//
//   THE HONEST COUNT: clear on an empty bench returns cleared: 0 —
//   the row's count matches reality.
//
// Red-proofs (§5, hands off the target files): make removeStageBench's
// row find card-bound (`s["id"] === stageId && typeof s["card"] ===
// "string"` — the matrix's hypothesized filter) → GHOST-DOC → REMOVE
// reds verbatim (`stage not found: s_0`, the read still holds the
// marker) and THE REMOVE IS ID-TARGETED reds on its marker half;
// CLEAR, ABSENT-ID, the card-row half, and THE HONEST COUNT stay
// green — each guards a different door on its own path. Restore →
// green.
//
// Run: npx vitest run tests/walls/ts/suites/bench-ghost-lifecycle.spec.ts
import { describe, expect, it, beforeAll, afterAll, vi } from "vitest";
import { Context } from "@deepseek-ai/cordis";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// THE HERMETIC ENGINE: the tool plane's discovery arms read a stub
// census — the ghost lifecycle needs no card definitions, only the
// bench doors and the marker's mint shape.
const oiFixture = vi.hoisted(() => ({
  censusFn: vi.fn(async (): Promise<Record<string, unknown>> => ({})),
}));
vi.mock("@melite/comfyui-cordis", async (importOriginal) => {
  const real = await importOriginal<typeof import("@melite/comfyui-cordis")>();
  return { ...real, liveObjectInfo: oiFixture.censusFn };
});

import { bootCtxAt, seed, sig } from "../../../../packages/estate/drafts/tests/bench-helpers.ts";
import type { Domain } from "@deepseek-ai/dsh-storage-domain";
import type { DraftsDomainSpec } from "../../../../packages/estate/drafts/src/spec.js";
import { makeEstate, type Estate } from "../../../../packages/harness/melite-tools/src/estate.ts";
import { meliteConstruct } from "../../../../packages/harness/melite-tools/src/tools/melite-construct.ts";

let ctx: Context;
let domain: Domain<DraftsDomainSpec>;
let estate: Estate;

beforeAll(async () => {
  const booted = await bootCtxAt(mkdtempSync(join(tmpdir(), "wall-ghost-lifecycle-")));
  ctx = booted.ctx;
  domain = booted.domain;
  new (await import("@melite/estate-drafts")).BenchRemoteService(ctx);
  estate = makeEstate({
    get: (name: string) => (name === "benchRemote" ? ctx.get("benchRemote") : undefined),
  } as never);
}, 120_000);

afterAll(async () => {
  await ctx.fiber.dispose();
});

/** The agent's own door: melite_construct over the real estate. */
async function drive(agentId: string, args: Record<string, unknown>): Promise<Record<string, unknown>> {
  const tool = meliteConstruct(estate);
  return (await tool.execute(args as never, {
    agent: { id: agentId },
    signal: sig,
  } as never)) as Record<string, unknown>;
}

/** A marker-carrying bench doc in the RETIRED press's landed shape
 *  (pre-law runTemplate's verbatim row), seeded straight into the
 *  domain — the write doors refuse this shape since
 *  flows-bench-card-purity (2026-11-14); the live F60 bench holds
 *  exactly this doc, and serve is tolerant by design so the remove
 *  door stays the operator's cure. */
async function seedGhostDoc(session: string, flow: string): Promise<void> {
  await seed(domain, session, {
    intent: flow,
    stages: [{ id: "s_0", engine: "comfyui", ref_flow: flow, params: {} }],
  });
}

async function stagesOf(agentId: string): Promise<Array<Record<string, unknown>>> {
  const read = await drive(agentId, { verb: "read" });
  return (read["stages"] ?? []) as Array<Record<string, unknown>>;
}

async function revOf(agentId: string): Promise<number> {
  const read = await drive(agentId, { verb: "read" });
  return Number(read["rev"] ?? 0);
}

function idsOf(rows: Array<Record<string, unknown>>): string[] {
  return rows.map((r) => String(r["id"]));
}

describe("the ghost lifecycle (F46: remove_stage and clear reach a flow-minted stage)", () => {
  it("GHOST-DOC → REMOVE — the marker is removed by its visible id through the agent's door", async () => {
    const agent = "session-ghost-remove";
    await seedGhostDoc(agent, "fit-seat");
    const before = await stagesOf(agent);
    expect(idsOf(before), "the legacy doc holds its marker").toEqual(["s_0"]);
    const rev = await revOf(agent);
    const rm = await drive(agent, { verb: "remove_stage", stage: "s_0", expect_rev: rev });
    expect(rm["ok"] !== false, "the removal lands: " + JSON.stringify(rm)).toBe(true);
    const after = await stagesOf(agent);
    expect(idsOf(after), "the ghost is GONE from state").toEqual([]);
  });

  it("GHOST-DOC → CLEAR — the honest count and an empty read", async () => {
    const agent = "session-ghost-clear";
    await seedGhostDoc(agent, "fit-seat");
    expect(idsOf(await stagesOf(agent))).toEqual(["s_0"]);
    const rev = await revOf(agent);
    const clr = await drive(agent, { verb: "clear", expect_rev: rev });
    expect(Number(clr["cleared"] ?? -1), "clear counts the marker alone: " + JSON.stringify(clr)).toBe(1);
    expect(idsOf(await stagesOf(agent))).toEqual([]);
  });

  it("ABSENT-ID REFUSES LOUD — a removal of a stage the bench never held refuses, never silent", async () => {
    const agent = "session-ghost-absent";
    await seedGhostDoc(agent, "fit-seat");
    const rev = await revOf(agent);
    // THE TOOL DOOR FOLDS refusals into the row (ok: false + the
    // message) — a thrown error would refuse too; both carry the voice.
    let message = "";
    try {
      const out = await drive(agent, { verb: "remove_stage", stage: "s_9", expect_rev: rev });
      message = String(out["error"] ?? (out["ok"] === false ? JSON.stringify(out) : ""));
    } catch (e) {
      message = e instanceof Error ? e.message : String(e);
    }
    expect(message).toContain("stage not found");
    expect(message).toContain("s_9");
    // the bench is untouched by the refused removal
    expect(idsOf(await stagesOf(agent))).toEqual(["s_0"]);
  });

  it("THE REMOVE IS ID-TARGETED — the ghost goes, the unrelated card row stays; the reverse too", async () => {
    const agent = "session-ghost-targeted";
    // the legacy marker PLUS an unrelated card row on one bench (the
    // mixed doc seeded raw — the write door refuses a marker row, the
    // doc is the retired press's landed shape)
    await seed(domain, agent, {
      intent: "fit-seat",
      stages: [
        { id: "s_0", engine: "comfyui", ref_flow: "fit-seat", params: {} },
        { id: "s_1", card: "trim", engine: "comfyui", params: {} },
      ],
    });
    expect(idsOf(await stagesOf(agent))).toEqual(["s_0", "s_1"]);
    // the ghost's removal leaves the card row intact
    let rev = await revOf(agent);
    await drive(agent, { verb: "remove_stage", stage: "s_0", expect_rev: rev });
    expect(idsOf(await stagesOf(agent)), "the card row survives the ghost's removal").toEqual(["s_1"]);
    // and the card row's removal would leave a ghost intact (no purge)
    await seedGhostDoc(agent + "-reverse", "fit-seat");
    // re-seed the mixed doc on the LIVE bench (a raw put — the write
    // door refuses the marker row now; the seed is the domain's own
    // table write, same as the retired press's landed output)
    await seed(domain, agent, {
      intent: "fit-seat",
      stages: [
        { id: "s_0", engine: "comfyui", ref_flow: "fit-seat", params: {} },
        { id: "s_1", card: "trim", engine: "comfyui", params: {} },
      ],
    });
    rev = await revOf(agent);
    await drive(agent, { verb: "remove_stage", stage: "s_1", expect_rev: rev });
    expect(idsOf(await stagesOf(agent)), "the ghost survives the card row's removal").toEqual(["s_0"]);
  });

  it("THE HONEST COUNT — clear on an empty bench reports zero, never a phantom", async () => {
    const agent = "session-ghost-empty";
    await estate.benchEnsure({ session: agent, intent: "bench", overwrite: true, stages: [] } as never, sig, 5000);
    const rev = await revOf(agent);
    const clr = await drive(agent, { verb: "clear", expect_rev: rev });
    expect(Number(clr["cleared"] ?? -1), "clear counts nothing: " + JSON.stringify(clr)).toBe(0);
    expect(idsOf(await stagesOf(agent))).toEqual([]);
  });

  // SLICE E (F60b, the flows-are-compositions audit): the '?'-row read
  // voice NAMES the legacy marker and its cures — undo first when the
  // history holds the load that landed it (the stronger cure: it
  // rewinds to the bench the retired press replaced), remove_stage
  // always. The voice never promises a door that does not work: the
  // undo arm below rides the SAME agent door the cure names.
  it("THE RESTORE VOICE — the read names the marker and both cures, and the undo cure WORKS", async () => {
    const agent = "session-ghost-voice";
    // the retired press's landed doc WITH its history entry: the load
    // that landed the marker carries the pre-press stages_before
    await seed(domain, agent, {
      intent: "fit-seat",
      stages: [{ id: "s_0", engine: "comfyui", ref_flow: "fit-seat", params: {} }],
      bench: {
        rev: 1,
        log: [
          {
            rev: 1, at: 1, author: "agent", kind: "load",
            inverse: { stages_before: [{ id: "keep", card: "trim", engine: "comfyui", params: {} }] },
          },
        ],
      },
    });
    const read = await drive(agent, { verb: "read" });
    const marker = read["legacy_flow_marker"] as Record<string, unknown> | undefined;
    expect(marker, "the read names the legacy marker — never a silent '?'").toBeDefined();
    expect(marker!["stage"]).toBe("s_0");
    expect(marker!["flow"]).toBe("fit-seat");
    expect(String(marker!["cure"]), "undo rides first when restorable").toContain(
      "melite_construct undo restores the bench the press replaced",
    );
    expect(String(marker!["cure"]), "remove_stage always rides").toContain(
      "melite_construct remove_stage s_0",
    );
    // the cure the voice promises WORKS through the same agent door
    const undo = await drive(agent, { verb: "undo", n: 1, expect_rev: 1 });
    expect(undo["ok"] !== false, "the undo lands: " + JSON.stringify(undo)).toBe(true);
    expect(idsOf(await stagesOf(agent)), "the pre-press bench is back").toEqual(["keep"]);
    // and a marker doc with NO restorable history names the row cure
    // alone — the voice never promises an undo there is nothing to
    // restore to
    const bare = "session-ghost-voice-bare";
    await seedGhostDoc(bare, "fit-seat");
    const bareRead = await drive(bare, { verb: "read" });
    const bareMarker = bareRead["legacy_flow_marker"] as Record<string, unknown> | undefined;
    expect(bareMarker, "the bare marker still names itself").toBeDefined();
    expect(String(bareMarker!["cure"]), "no undo promise without history").not.toContain("undo");
    expect(String(bareMarker!["cure"])).toContain("melite_construct remove_stage s_0");
  });
});
