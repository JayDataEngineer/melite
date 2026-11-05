// @contract flows-floor-walk-atomicity
// bench-floor-atomicity.spec.ts — THE FLOOR WALK'S ATOMICITY (the
// U5 residual: the floor verb walked stage-by-stage, one patch per
// stage, so a LATER stage's refusal left the EARLIER stages' floors
// already landed — a refusal that edits the bench it refuses to
// finish).
//
// The law: a mid-walk refusal leaves the bench byte-identical —
// rev, rows and log unchanged. The arm rides the REAL doors end to
// end (the journey law): melite_construct's floor verb → the estate
// bench lanes → the drafts BenchRemoteService → ensureBench's load
// arm → the mounted admission seat's family clause. The clause is
// the family-admission rig's precedent spelling (the REAL clause is
// walled family-side; the DOOR arm is walled here). The floors
// themselves derive from the REAL image-gen declaration (the
// resolution group's minimums) — no hand-baked numbers.
import "../../../../tests/helpers/boot-models.ts";
import { describe, test } from "vitest";
import assert from "node:assert/strict";
import type { Context } from "@deepseek-ai/cordis";
import { bootCtx } from "./bench-helpers.ts";
import { BenchRemoteService } from "../src/remote.ts";
import { meliteConstruct } from "../../../../packages/harness/melite-tools/src/tools/melite-construct.ts";
import type { Estate } from "../../../../packages/harness/melite-tools/src/estate.ts";

const SESSION = "floor-atomicity";
const sig: AbortSignal = new AbortController().signal;
const exec = { signal: sig } as never;

/** The estate face over the in-process bench service. patch rides
 *  the real door so the per-stage walk's partial land is observable;
 *  every other verb is unseated — the cured walk rides get + ensure
 *  only, and any other bench verb names itself here. */
function estateOver(svc: BenchRemoteService): Estate {
  return {
    // Explicit door faces: the `as unknown as Estate` cast removes
    // contextual typing, so the lambdas carry the real parameters
    // themselves (Estate's bench plane, estate.ts).
    benchGet: (session: string, signal: AbortSignal) => svc.get(session, signal),
    benchEnsure: (doc: Record<string, unknown>, signal: AbortSignal) => svc.ensure(doc as never, signal),
    benchVerb: (session: string, verb: string, doc: Record<string, unknown>, signal: AbortSignal) => {
      if (verb === "patch") return svc.patch(session, doc as never, signal);
      throw new Error(
        "benchVerb " + verb + " is not seated in this rig — the floor walk must land through one whole-bench write",
      );
    },
  } as unknown as Estate;
}

/** The family clause seat: refuses exactly the row whose prompt
 *  names the marker (the stage-B refusal), admits everything else. */
function seatRefusingOn(marker: string): Record<string, unknown> {
  return {
    resolveStageParams: (): null => null,
    admitStageFamily: (card: string, params: Record<string, unknown>): { ok: true } | { ok: false; error: string } =>
      params["prompt"] === marker
        ? { ok: false, error: "card '" + card + "' refused params: the " + marker + " clause refuses this state" }
        : { ok: true },
  };
}

const TWO_GEN_STAGES = [
  { id: "keep-a", card: "image-gen", params: { prompt: "keep-me" } },
  { id: "burn-b", card: "image-gen", params: { prompt: "refuse-me" } },
];

async function rig(marker: string): Promise<BenchRemoteService> {
  const { ctx, domain } = await bootCtx();
  ctx.provide("cardRegistry", seatRefusingOn(marker));
  const svc = new BenchRemoteService(ctx);
  await domain.table("docs").put("bench-" + SESSION, {
    updated_at: 1,
    doc: {
      draft_id: "bench-" + SESSION,
      intent: "seeded",
      status: "ready",
      createdAt: 1,
      completedAt: null,
      stages: TWO_GEN_STAGES.map((r) => ({ provenance: "agent", ...r })),
    } as never,
  });
  return svc;
}

describe("the floor walk's atomicity — a mid-walk refusal edits nothing", () => {
  test("stage B's door refusal leaves stage A unfloored: rev, rows and log byte-identical", async () => {
    const svc = await rig("refuse-me");
    const before = JSON.stringify(await svc.get(SESSION, sig));
    const answer = await meliteConstruct(estateOver(svc)).execute(
      { verb: "floor", bench: SESSION }, exec,
    ) as { ok?: boolean; error?: string; error_kind?: string };
    assert.equal(answer.ok, false, "the walk must refuse on stage B");
    assert.equal(answer.error_kind, "bench/family-refusal");
    assert.match(answer.error ?? "", /refuse-me/);
    const after = JSON.stringify(await svc.get(SESSION, sig));
    assert.equal(after, before, "a mid-walk refusal must leave the bench byte-identical — rev, rows and log");
  });

  test("a lawful bench floors in ONE write: rev bumps exactly once, both stages land their declared minimums", async () => {
    const svc = await rig("never-matches");
    const revBefore = ((await svc.get(SESSION, sig)) as { rev: number }).rev;
    const answer = await meliteConstruct(estateOver(svc)).execute(
      { verb: "floor", bench: SESSION }, exec,
    ) as { ok?: boolean; error?: string; rev?: number; stages?: Array<Record<string, unknown>> };
    assert.equal(answer.ok, true, "the lawful walk must land: " + (answer.error ?? ""));
    const revAfter = ((await svc.get(SESSION, sig)) as { rev: number }).rev;
    assert.equal(revAfter, revBefore + 1, "the whole walk lands as ONE write — one rev, not one per stage");
    const stages = (await svc.get(SESSION, sig) as { stages: Array<Record<string, unknown>> }).stages;
    for (const row of stages) {
      const params = row["params"] as Record<string, number>;
      assert.equal(params["width"], 256, row["id"] + " must ride the declared width floor");
      assert.equal(params["height"], 256, row["id"] + " must ride the declared height floor");
    }
    assert.equal(answer.rev, revAfter, "the answer names the landed rev");
    assert.equal(answer.stages?.length, 2, "the answer voices every walked stage");
  });
});
