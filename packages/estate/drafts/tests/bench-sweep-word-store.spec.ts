// bench-sweep-word-store.spec.ts — THE SWEEP-WORD STORE repro (the
// seeds reopen burn, 2026-11-25).
//
// THE BURN (operator, verbatim): a card rendered fine, but reopening
// it refused — "card_compose: field 'seeds' fires nothing on this
// lane — the served surface (moss-image) does not declare it; the
// estate admission gate refuses the same key field-named at the
// write door."
//
// THE PATH (proven in this file's arms): `seeds: [...]` is the queue
// door's seed-sweep coordinate (queueSubmit.ts expandSeedSweep —
// consumed at the press BEFORE any card composes; CARD_ENVELOPE_KEYS,
// vocab.ts — "door vocabulary consumed before any card composes,
// never a card knob"). A bench write whose params carry the word is
// judged over the LIFTED view — the write door's lane admission
// judges liftCardParams' output (cardsRegistry laneVerdictCore; the
// envelope class sheds `seeds`) — so the write JUDGES CLEAN, and the
// STORED row kept the raw bag verbatim. The stored row is the card's
// reopen truth; the client mirror (card-base composeValidate)
// refuses every doc key the resolved surface does not declare —
// moss-image declares `seed` singular. The row carried a press word
// onto a card surface, and the mirror refused it.
//
// THE CURE'S LAW (this spec pins the store half): the stored row
// sheds the door vocabulary the judges already shed — the sweep
// stays a PRESS word only (the operator re-presses the sweep at the
// queue door); the row keeps at most its last seed via the lawful
// `seed` knob, and the lawful lane words (a `model` naming a real
// family — the family-address law) ride untouched.
import { describe, expect, it } from "vitest";
import { draftIdOf } from "@melite/contracts/benchStage";
import { BenchRemoteService, DraftsRemoteService } from "../src/remote.ts";
import { bootCtx, sig, seed } from "./bench-helpers.ts";

type Row = Record<string, unknown>;

const GUI_DRAFT = draftIdOf("bench-sweep-gui");

/** A registry-less rig's seat stub (the resolver shape every
 *  registry-less drafts test provides — admission drops out, so the
 *  arm judges the STORE seam alone). */
function stubRegistry(ctx: { provide: (n: string, v: unknown) => void }): void {
  ctx.provide("cardRegistry", {
    resolveStageParams: (body: Record<string, unknown>): Record<string, unknown> | null => ({ ...body }),
    admitStageModel: (): { ok: true } => ({ ok: true }),
  });
}

function rowOf(served: { stages: unknown }, id: string): Row {
  const row = (served.stages as Row[]).find((r) => r["id"] === id);
  expect(row, `stage ${id} must be on the served bench`).toBeDefined();
  return row!;
}

function paramsOf(row: Row): Row {
  const params = row["params"];
  expect(params, "the stored row carries a params record").toBeTypeOf("object");
  return params as Row;
}

/** THE BURN BODY: the agent's add_stage whose params carry the sweep
 *  word beside the card's knobs (the AI meant the sweep; the queue
 *  door consumes it at the press — the row is not its seat). */
const burnParams = (): Row => ({
  model: "moss-image",
  prompt: "a moss-covered stone bridge",
  seeds: [11, 22],
});

describe("the sweep-word store (the seeds reopen burn)", () => {
  it("arm 1 — THE ADD DOOR: a sweep word in a stored row's params sheds at the write door's store seam", async () => {
    const { ctx } = await bootCtx();
    stubRegistry(ctx);
    const bench = new BenchRemoteService(ctx);
    await bench.ensure({ session: "sweep-add" }, sig);
    await bench.addStage("sweep-add", { card: "image-gen", params: burnParams(), expect_rev: 0 }, sig);
    const served = await bench.get("sweep-add", sig);
    const params = paramsOf(rowOf(served, "s_0"));
    // THE CURE'S WORD: the sweep coordinate never lands on the row.
    expect(params["seeds"], "the sweep word must not ride the stored row").toBeUndefined();
    // THE LAWFUL NEIGHBORS RIDE: the knobs and the family address.
    expect(params["prompt"]).toBe("a moss-covered stone bridge");
    expect(params["model"]).toBe("moss-image");
  });

  it("arm 2 — THE PATCH DOOR (the agent's bench/patch): a sweep-word patch sheds at the store", async () => {
    const { ctx } = await bootCtx();
    stubRegistry(ctx);
    const bench = new BenchRemoteService(ctx);
    await bench.ensure({ session: "sweep-patch", stages: [{ id: "s_0", card: "image-gen", params: { model: "moss-image", prompt: "x" } }] }, sig);
    await bench.patch("sweep-patch", { stage: "s_0", params: { seeds: [33] }, expect_rev: 0 }, sig);
    const served = await bench.get("sweep-patch", sig);
    const params = paramsOf(rowOf(served, "s_0"));
    expect(params["seeds"], "a sweep-word patch must not land the word on the row").toBeUndefined();
    expect(params["prompt"]).toBe("x");
  });

  it("arm 3 — THE GUI KEYSTROKE DOOR (drafts/patch): the same shed, one law both transports", async () => {
    const { ctx, domain } = await bootCtx();
    stubRegistry(ctx);
    await seed(domain, "sweep-gui", { stages: [{ id: "s_0", card: "image-gen", params: { model: "moss-image", prompt: "x" } }] });
    const drafts = new DraftsRemoteService(ctx);
    // the GUI keystroke rides the row's current rev (the CAS law —
    // the door refuses a null expect_rev, as the client's own send does)
    await drafts.patch(GUI_DRAFT, "s_0", { params: { seeds: [7, 8] } }, 0, sig);
    const bench = new BenchRemoteService(ctx);
    const served = await bench.get("sweep-gui", sig);
    const params = paramsOf(rowOf(served, "s_0"));
    expect(params["seeds"], "the keystroke door must not land the sweep word").toBeUndefined();
    expect(params["prompt"]).toBe("x");
  });

  it("arm 4 — THE BATCH DOOR (bench/add-stages, the restore arm): every row sheds", async () => {
    const { ctx } = await bootCtx();
    stubRegistry(ctx);
    const bench = new BenchRemoteService(ctx);
    await bench.ensure({ session: "sweep-batch" }, sig);
    await bench.addStages("sweep-batch", {
      stages: [
        { id: "s_0", card: "image-gen", params: burnParams() },
        { id: "s_1", card: "image-gen", params: { model: "moss-image", prompt: "y", seeds: [44] } },
      ],
      expect_rev: 0,
    }, sig);
    const served = await bench.get("sweep-batch", sig);
    expect(paramsOf(rowOf(served, "s_0"))["seeds"]).toBeUndefined();
    expect(paramsOf(rowOf(served, "s_1"))["seeds"]).toBeUndefined();
    expect(paramsOf(rowOf(served, "s_1"))["prompt"]).toBe("y");
  });

  it("arm 5 — THE BIRTH DOOR (bench/ensure with stages): born rows shed", async () => {
    const { ctx } = await bootCtx();
    stubRegistry(ctx);
    const bench = new BenchRemoteService(ctx);
    await bench.ensure({
      session: "sweep-birth",
      stages: [{ id: "s_0", card: "image-gen", params: burnParams() }],
    }, sig);
    const served = await bench.get("sweep-birth", sig);
    expect(paramsOf(rowOf(served, "s_0"))["seeds"]).toBeUndefined();
    expect(paramsOf(rowOf(served, "s_0"))["prompt"]).toBe("a moss-covered stone bridge");
  });

  it("arm 6 — THE LOAD DOOR (bench/ensure overwrite): reloaded rows shed", async () => {
    const { ctx } = await bootCtx();
    stubRegistry(ctx);
    const bench = new BenchRemoteService(ctx);
    await bench.ensure({
      session: "sweep-load",
      overwrite: true,
      stages: [{ id: "s_0", card: "image-gen", params: burnParams() }],
    }, sig);
    const served = await bench.get("sweep-load", sig);
    expect(paramsOf(rowOf(served, "s_0"))["seeds"]).toBeUndefined();
  });

  it("arm 7 — THE SERVE HEALS THE PRE-EXISTING ROW: a stored doc that predates the cure serves clean (the stored-rows law's reader heal)", async () => {
    const { ctx, domain } = await bootCtx();
    stubRegistry(ctx);
    // Plant the poison straight into the domain — the exact doc shape
    // the pre-cure doors wrote (the operator's live bench tonight).
    await seed(domain, "sweep-legacy", {
      stages: [{ id: "s_0", card: "image-gen", params: { model: "moss-image", prompt: "x", seeds: [11, 22] } }],
    });
    const bench = new BenchRemoteService(ctx);
    const served = await bench.get("sweep-legacy", sig);
    // THE MIRROR'S WORLD: the doc the card view opens cannot carry
    // the sweep word — the reopen refusal is dead, not argued with.
    expect(paramsOf(rowOf(served, "s_0"))["seeds"]).toBeUndefined();
    expect(paramsOf(rowOf(served, "s_0"))["prompt"]).toBe("x");
  });

  it("arm 8 — THE LAWFUL WORDS SURVIVE: the sweep stays a press word, the row keeps its lawful knob and lane words", async () => {
    const { ctx } = await bootCtx();
    stubRegistry(ctx);
    const bench = new BenchRemoteService(ctx);
    await bench.ensure({ session: "sweep-lawful" }, sig);
    // The write RESOLVES (never a refusal — the sweep is re-pressed at
    // the queue door, not argued with at the bench) and lands the
    // lawful bag: the last seed via the `seed` knob, the family
    // address, the axis picks.
    await bench.addStage("sweep-lawful", {
      card: "image-gen",
      params: { model: "moss-image", prompt: "x", seed: 46601, variant: "sft", quant: "int8" },
      expect_rev: 0,
    }, sig);
    const served = await bench.get("sweep-lawful", sig);
    const params = paramsOf(rowOf(served, "s_0"));
    expect(params["seed"]).toBe(46601);
    expect(params["model"]).toBe("moss-image");
    expect(params["variant"]).toBe("sft");
    expect(params["quant"]).toBe("int8");
  });
});
