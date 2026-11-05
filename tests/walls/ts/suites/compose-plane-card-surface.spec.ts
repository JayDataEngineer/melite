// compose-plane-card-surface.spec.ts — THE CARD SURFACE AT THE PRESS
// (F47, the image-edit collision finding — pinned empirically
// 2026-11-14 BEFORE any line moved).
//
// THE PREMISE, CORRECTED BY THE CENSUS: the escalation held that
// image-edit exists as BOTH a card id and a flow name, so every
// card-mode press routed into the flow compiler. The live id spaces
// say otherwise: the flows REGISTRY seats 11 kebab ids, the flows/
// leaves name 7 snake `_flow` ids, and NEITHER contains image-edit —
// the literal card∩flow intersection is EMPTY (the census arm below
// derives both rosters live and pins the class dead). There is no
// resolution-order bug to fix at the ids.
//
// THE REAL MECHANISM (proven on the real doors): a card-mode press's
// compose verdict rides the flow lattice, whose card-stage judge was
// a bare schema parse — LOOSER than the card door. A mask-mode body
// without its region sailed the press and died at the run press in
// the card door's voice ("crop_stitch needs a region") days later —
// the long-standing "unrideable mask knobs" read. The card-ports
// fill (the compose-plane cure, runsValidateStages kindsOk) lets the
// lattice 200 a stored card row, and the validate door's
// ONE-ADMISSION walk (composeCardStagesAtValidate → the card door's
// own admission) then judges every card stage AT THE PRESS:
//
//   THE MASK REGION CURE IS REACHABLE — the F7 region body
//   (input_images + input_mask + mask_mode crop_stitch) LANDS through
//   the real add door, judged by the card door's absorbed mod
//   surface at authoring time.
//
//   THE SEMANTIC GATE FIRES AT THE PRESS — mask_mode crop_stitch
//   without a region refuses AT THE ADD DOOR in the card door's own
//   voice, never at run time, never in the lattice's stranger's
//   voice ("declares no outputs and names no card").
//
// Red-proofs (§5): toggle the card-ports fill out of kindsOk
// (runsValidateStages.ts) → both arms red: the LAND arm with the
// verbatim burn, the GATE arm because the lattice refuses before the
// card door's voice can fire.
//
// Run: npx vitest run tests/walls/ts/suites/compose-plane-card-surface.spec.ts
import { describe, expect, it, beforeAll, afterAll, vi } from "vitest";
import { installLaneStoreOverlay, restoreLaneStoreOverlay } from "../../../helpers/lane-store-overlay.ts";
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
import { FlowsSeatService } from "../../../../packages/harness/estate-queue/src/flowsData.ts";
import { FLOW_ID_RE } from "../../../../packages/harness/estate-queue/src/runsGates.ts";
import { validate as validateArm } from "../../../../packages/harness/estate-queue/src/runsValidateArms.ts";
import { remoteErrorOf } from "@deepseek-ai/dsh-typert-protocol";

let ctx: Context;
let domain: Domain<DraftsDomainSpec>;
let bench: BenchRemoteService;

beforeAll(async () => {
  const booted = await bootCtxAt(mkdtempSync(join(tmpdir(), "wall-compose-surface-")));
  ctx = booted.ctx;
  domain = booted.domain;
  new CardRegistryService(ctx);
  await (ctx.cardRegistry as unknown as { prime(): Promise<void> }).prime();
  // The live flow seat (the census's flow roster rides the same
  // mount production reads).
  new FlowsSeatService(ctx);
  (ctx as unknown as { queue: unknown }).queue = {
    stateRoot: mkdtempSync(join(tmpdir(), "wall-compose-surface-queue-")),
    stateRoots: [] as string[],
  };
  // THE RUNS SEAT, the production delegation verbatim (runsRegistry
  // RunsRuntimeService.validate → validateArm(doc, signal, this.ctx)).
  ctx.provide("runs", {
    validate: (doc: unknown, signal: AbortSignal) => validateArm(doc, signal, ctx),
  });
  bench = new BenchRemoteService(ctx);
  // THE HERMETIC STORE (lane-store-overlay): the arms press real
  // cards through the presence walk — the subject is the card
  // SURFACE, not the machine's download state. Seed the declared
  // rows a fresh-clone store lacks.
  installLaneStoreOverlay();
}, 120_000);

afterAll(async () => {
  await ctx.fiber.dispose();
  restoreLaneStoreOverlay();
});

/** A marker-carrying bench doc in the RETIRED press's landed shape,
 *  seeded straight into the domain (the ensure door REFUSES the shape
 *  since flows-bench-card-purity, 2026-11-14). The F47 arms press
 *  under the operator's own context: the marker rides the projection
 *  the mask body is judged in. */
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

describe("the card surface at the press (F47: the mask cure rides the card-mode press)", () => {
  it("F47 LAND — the mask region body rides the card-mode press", async () => {
    const session = "session-compose-mask";
    await seedFlowDoc(session, "fit-seat");
    const landed = await addCard(session, {
      card: "image-edit",
      params: {
        model: "qwen-img-edit-21",
        prompt: "restore the scratched corner",
        input_images: ["/infer-gallery/in.png"],
        input_mask: "/infer-gallery/mask.png",
        mask_mode: "crop_stitch",
        mask_denoise: 0.5,
        mask_detail_size: 512,
        mask_detector: "off",
      },
    });
    expect(landed.ok, landed.ok ? "" : "the mask region add refused: " + landed.message).toBe(true);
    if (!landed.ok) return;
    const rows = await stagesOf(session);
    expect(rows[1]?.["card"]).toBe("image-edit");
  });

  it("F47 GATE — mask_mode without a region refuses AT THE PRESS in the card's voice", async () => {
    const session = "session-compose-mask-gate";
    await seedFlowDoc(session, "fit-seat");
    const refused = await addCard(session, {
      card: "image-edit",
      params: {
        model: "qwen-img-edit-21",
        prompt: "restore the scratched corner",
        input_images: ["/infer-gallery/in.png"],
        mask_mode: "crop_stitch",
      },
    });
    expect(refused.ok).toBe(false);
    if (refused.ok) return;
    // The card door's own region gate, at authoring time.
    expect(refused.message).toContain("crop_stitch needs a region");
    // Never the stranger's voice, never a landed row.
    expect(refused.message).not.toContain("declares no outputs and names no card");
    const rows = await stagesOf(session);
    expect(rows.map((r) => String(r["id"]))).toEqual(["s_0"]);
  });
});

describe("the card∩flow id census (the resolution-order class stays dead)", () => {
  it("card ids and flow ids never collide; every flow id is FLOW_ID_RE-clean", async () => {
    const defs = (ctx.cardRegistry as unknown as {
      defsSync: () => Map<string, unknown>;
    }).defsSync();
    const cardIds = [...defs.keys()].sort();
    expect(cardIds.length, "the primed registry booted a real card set").toBeGreaterThan(0);
    // The flow ids: the REGISTRY rows plus the flows/ leaves' tool
    // names — derived, never a hand list.
    const flowIds = new Set<string>(
      (ctx.get("meliteFlows") as unknown as { names(): string[] }).names(),
    );
    const leavesDir = new URL("../../../../flows/", import.meta.url);
    for (const leaf of readdirSync(leavesDir)) {
      const tool = JSON.parse(
        readFileSync(new URL(`../../../../flows/${leaf}/tool.json`, import.meta.url), "utf8"),
      ) as { name?: string };
      if (typeof tool.name === "string" && tool.name !== "") flowIds.add(tool.name);
    }
    expect(flowIds.size, "the flow id space is non-empty").toBeGreaterThan(0);
    const collision = cardIds.filter((c) => flowIds.has(c));
    expect(collision, "a card id that is also a flow id owes the resolution-order disposition in its registry row").toEqual([]);
    for (const id of flowIds) {
      expect(FLOW_ID_RE.test(id), `flow id ${JSON.stringify(id)} is not FLOW_ID_RE-clean`).toBe(true);
    }
  });

  it("THE MINT IS DEAD — no tool-plane site writes ref_flow", async () => {
    // The marker's foreign identity must stay provable — now by its
    // ABSENCE: the press is one runsStart (flows-bench-card-purity,
    // 2026-11-14), so ZERO writers mint ref_flow. A reintroduced
    // writer (`ref_flow:` object-literal key) reds this arm. Voice
    // mentions (melite-flow.ts naming the retired shape it refuses;
    // melite-construct.ts naming the legacy marker and its cures,
    // slice E) are not mints.
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
