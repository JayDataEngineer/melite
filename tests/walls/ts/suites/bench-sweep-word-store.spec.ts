// bench-sweep-word-store.spec.ts — THE SWEEP-WORD STORE WALL (the
// seeds reopen burn, 2026-11-25).
//
// THE INVARIANT: a stored bench row's params hold the card's knobs
// and the lawful lane words only — the queue door's vocabulary (the
// seed sweep and its sibling press coordinates) is consumed at the
// press, before any card composes, and never lands on a row. The
// stored row is the card's reopen truth: the client mirror
// (card-base composeValidate) refuses every doc key the resolved
// surface does not declare, so a press word on a row is a card the
// operator cannot reopen — the burn ("field 'seeds' fires nothing on
// this lane ... the estate admission gate refuses the same key
// field-named at the write door").
//
// THE FALSE CLAIM THE ASYMMETRY ARM PINS: the write door never
// refused `seeds` — its lane admission judges the LIFTED view
// (liftCardParams sheds the envelope class), so a sweep-word write
// judged CLEAN while the store kept the raw bag. The arm runs the
// REAL CardRegistryService and pins that verdict, so the mirror's
// message can never again name a refusal that does not exist.
//
// RED-PROOF (2026-11-25): toggle the store shed out
// (bench.ts shedPressWords → pass-through) → arms 1–8 red with
// `expected [ 11, 22 ] to be undefined` (the word rides the stored
// row); restore → green. The mirror arm and the asymmetry arm are
// cure-independent truths (the false claim and the DECL surface).
import "../../../helpers/boot-models.ts";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeAll, describe, expect, it, afterAll } from "vitest";
import { Context } from "@deepseek-ai/cordis";
import { BenchRemoteService, DraftsRemoteService } from "@melite/estate-drafts";
import { draftIdOf } from "@melite/contracts/benchStage";
import { getModel } from "../../../../packages/engines/comfyui-cordis/src/models/models.ts";
import { loadCardDefs } from "../../../../packages/engines/comfyui-cordis/src/cardDefs.ts";
import { CardRegistryService } from "../../../../packages/harness/estate-queue/src/cardsRegistry.ts";
import { FlowsSeatService } from "../../../../packages/harness/estate-queue/src/flowsData.ts";
import { LifecycleLatch } from "../../../../packages/harness/estate-queue/src/lifecycleLatch.ts";
import { installLaneStoreOverlay, restoreLaneStoreOverlay } from "../../../helpers/lane-store-overlay.ts";
import { isolateOperatorModState } from "../../../helpers/operator-modstate-isolation.ts";
import { bootCtx, sig, seed } from "../../../../packages/estate/drafts/tests/bench-helpers.ts";
import { shedPressWords } from "@melite/estate-drafts";

isolateOperatorModState();

type Row = Record<string, unknown>;

const GUI_DRAFT = draftIdOf("bench-sweep-gui");

/** THE BURN BODY: the agent's add_stage whose params carry the sweep
 *  word beside the card's knobs — tonight's doc, verbatim. */
const burnParams = (): Row => ({
  model: "moss-image",
  prompt: "a moss-covered stone bridge",
  seeds: [11, 22],
});

/** A registry-less drafts rig (the store seam alone — the write
 *  door's judge drops out, so an arm cannot pass by the judge
 *  refusing first). */
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

let realGate: CardRegistryService;

beforeAll(async () => {
  // THE REAL REGISTRY (the asymmetry arm's judge — no mocks): the
  // same boot the admission matrix rides.
  const boot = new Context();
  new FlowsSeatService(boot);
  (boot as unknown as { queue: unknown }).queue = {
    lifecycleLatch: new LifecycleLatch(),
    stateRoot: mkdtempSync(join(tmpdir(), "sweep-wall-")),
    stateRoots: [] as string[],
  };
  realGate = new CardRegistryService(boot);
  await realGate.prime();
  await loadCardDefs();
  installLaneStoreOverlay();
}, 90_000);

afterAll(() => {
  restoreLaneStoreOverlay();
});

describe("the sweep-word store wall (the seeds reopen burn)", () => {
  it("arm 1 — THE ADD DOOR: the sweep word never lands on the stored row", async () => {
    const { ctx } = await bootCtx();
    stubRegistry(ctx);
    const bench = new BenchRemoteService(ctx);
    await bench.ensure({ session: "wall-add" }, sig);
    await bench.addStage("wall-add", { card: "image-gen", params: burnParams(), expect_rev: 0 }, sig);
    const params = paramsOf(rowOf(await bench.get("wall-add", sig), "s_0"));
    expect(params["seeds"], "the sweep word must not ride the stored row").toBeUndefined();
    expect(params["prompt"]).toBe("a moss-covered stone bridge");
    expect(params["model"]).toBe("moss-image");
  });

  it("arm 2 — THE PATCH DOOR: a sweep-word patch sheds at the store", async () => {
    const { ctx } = await bootCtx();
    stubRegistry(ctx);
    const bench = new BenchRemoteService(ctx);
    await bench.ensure({ session: "wall-patch", stages: [{ id: "s_0", card: "image-gen", params: { model: "moss-image", prompt: "x" } }] }, sig);
    await bench.patch("wall-patch", { stage: "s_0", params: { seeds: [33] }, expect_rev: 0 }, sig);
    const params = paramsOf(rowOf(await bench.get("wall-patch", sig), "s_0"));
    expect(params["seeds"], "a sweep-word patch must not land the word on the row").toBeUndefined();
    expect(params["prompt"]).toBe("x");
  });

  it("arm 3 — THE GUI KEYSTROKE DOOR (drafts/patch): the same shed, one law both transports", async () => {
    const { ctx, domain } = await bootCtx();
    stubRegistry(ctx);
    await seed(domain, "sweep-gui", { stages: [{ id: "s_0", card: "image-gen", params: { model: "moss-image", prompt: "x" } }] });
    const drafts = new DraftsRemoteService(ctx);
    await drafts.patch(GUI_DRAFT, "s_0", { params: { seeds: [7, 8] } }, 0, sig);
    const bench = new BenchRemoteService(ctx);
    const params = paramsOf(rowOf(await bench.get("sweep-gui", sig), "s_0"));
    expect(params["seeds"], "the keystroke door must not land the sweep word").toBeUndefined();
  });

  it("arm 4 — THE BATCH DOOR (bench/add-stages, the restore arm): every row sheds", async () => {
    const { ctx } = await bootCtx();
    stubRegistry(ctx);
    const bench = new BenchRemoteService(ctx);
    await bench.ensure({ session: "wall-batch" }, sig);
    await bench.addStages("wall-batch", {
      stages: [
        { id: "s_0", card: "image-gen", params: burnParams() },
        { id: "s_1", card: "image-gen", params: { model: "moss-image", prompt: "y", seeds: [44] } },
      ],
      expect_rev: 0,
    }, sig);
    const served = await bench.get("wall-batch", sig);
    expect(paramsOf(rowOf(served, "s_0"))["seeds"]).toBeUndefined();
    expect(paramsOf(rowOf(served, "s_1"))["seeds"]).toBeUndefined();
    expect(paramsOf(rowOf(served, "s_1"))["prompt"]).toBe("y");
  });

  it("arm 5 — THE BIRTH DOOR (bench/ensure with stages): born rows shed", async () => {
    const { ctx } = await bootCtx();
    stubRegistry(ctx);
    const bench = new BenchRemoteService(ctx);
    await bench.ensure({ session: "wall-birth", stages: [{ id: "s_0", card: "image-gen", params: burnParams() }] }, sig);
    const params = paramsOf(rowOf(await bench.get("wall-birth", sig), "s_0"));
    expect(params["seeds"]).toBeUndefined();
    expect(params["prompt"]).toBe("a moss-covered stone bridge");
  });

  it("arm 6 — THE LOAD DOOR (bench/ensure overwrite): reloaded rows shed", async () => {
    const { ctx } = await bootCtx();
    stubRegistry(ctx);
    const bench = new BenchRemoteService(ctx);
    await bench.ensure({ session: "wall-load", overwrite: true, stages: [{ id: "s_0", card: "image-gen", params: burnParams() }] }, sig);
    expect(paramsOf(rowOf(await bench.get("wall-load", sig), "s_0"))["seeds"]).toBeUndefined();
  });

  it("arm 7 — THE UNDO TRAIL: a pre-cure trail's press word never rides its inverse back onto the bench", async () => {
    const { ctx, domain } = await bootCtx();
    stubRegistry(ctx);
    // A crafted-log doc (the undo door's own tolerance law): the
    // LIVE row still carries the pre-cure bag (the word rode the
    // pre-cure store), and the trail entry is the operator's later
    // prompt edit — the inverse touches only the key the patch
    // wrote, so the landing walk is the seat that must shed the
    // word the row already holds.
    await seed(domain, "wall-undo", {
      stages: [{ id: "s_0", card: "image-gen", params: { model: "moss-image", prompt: "patched", seeds: [11, 22] } }],
      bench: {
        rev: 5,
        log: [{
          author: "agent",
          kind: "patch",
          stage: "s_0",
          summary: "patch prompt",
          inverse: { stage: "s_0", params_before: { prompt: "original" }, params_added: [] },
        }],
      },
    });
    const bench = new BenchRemoteService(ctx);
    await bench.undo("wall-undo", { expect_rev: 5 }, sig);
    const params = paramsOf(rowOf(await bench.get("wall-undo", sig), "s_0"));
    expect(params["seeds"], "the undo trail must not resurrect the sweep word").toBeUndefined();
    expect(params["prompt"], "the lawful inverse still lands").toBe("original");
  });

  it("arm 8 — THE SERVE HEALS THE PRE-EXISTING ROW: tonight's doc serves clean", async () => {
    const { ctx, domain } = await bootCtx();
    stubRegistry(ctx);
    await seed(domain, "wall-legacy", {
      stages: [{ id: "s_0", card: "image-gen", params: { model: "moss-image", prompt: "x", seeds: [11, 22] } }],
    });
    const bench = new BenchRemoteService(ctx);
    const params = paramsOf(rowOf(await bench.get("wall-legacy", sig), "s_0"));
    expect(params["seeds"], "a bench persisted before the cure serves shed").toBeUndefined();
    expect(params["prompt"]).toBe("x");
  });

  it("arm 9 — THE LAWFUL WORDS SURVIVE: the row keeps its knob, family address, and axis picks", async () => {
    const { ctx } = await bootCtx();
    stubRegistry(ctx);
    const bench = new BenchRemoteService(ctx);
    await bench.ensure({ session: "wall-lawful" }, sig);
    await bench.addStage("wall-lawful", {
      card: "image-gen",
      params: { model: "moss-image", prompt: "x", seed: 46601, variant: "sft", quant: "int8" },
      expect_rev: 0,
    }, sig);
    const params = paramsOf(rowOf(await bench.get("wall-lawful", sig), "s_0"));
    expect(params["seed"]).toBe(46601);
    expect(params["model"]).toBe("moss-image");
    expect(params["variant"]).toBe("sft");
    expect(params["quant"]).toBe("int8");
  });

  it("arm 10 — THE ASYMMETRY (the false claim pinned): the REAL write-door judge ADMITS the sweep-word row — the refusal the mirror names never existed", async () => {
    // The compose gate's message claimed "the estate admission gate
    // refuses the same key field-named at the write door". The real
    // judge, the real card defs, the real fold: the lane admission
    // judges the LIFTED view, so the sweep-word write ADMITS — the
    // store seam is the only seat that ever held the word. If this
    // verdict ever flips to a refusal, the mirror message becomes
    // true and this wall says so.
    const verdict = realGate.admitStageRelations("image-gen", burnParams());
    expect(verdict).toEqual({ ok: true });
  });

  it("arm 11 — THE MIRROR TRUTH: a stored row's every key is one the served surface can declare, and no shed word is a served knob", async () => {
    // The surface is DERIVED (the live route view), never a hand
    // list — the axis picks and the family address ride beside it
    // (the lawful lane words).
    const moss = getModel("moss-image");
    const surface = new Set<string>([...(moss.params ?? []), "model", "variant", "quant"]);
    // The shed's words, DERIVED from the live helper (no duplicated
    // list here to drift): the keys a bag loses when the shed rides.
    const bag: Record<string, unknown> = {};
    for (const word of ["seeds", "press_key", "bench_stage_id", "draft_id", "test", "service", "yaml", "flow", "flow_inline"]) {
      bag[word] = 1;
    }
    bag["model"] = 1;
    const kept = shedPressWords(bag);
    const shedWords = Object.keys(bag).filter((k) => kept[k] === undefined);
    expect(shedWords, "the shed names the sweep word").toContain("seeds");
    for (const word of shedWords) {
      expect(surface.has(word), `press word '${word}' must never be a served knob (the shed's premise)`).toBe(false);
    }
    // The rows a cured write door lands — the burn body and the
    // lawful body — carry only surface words.
    const { ctx } = await bootCtx();
    stubRegistry(ctx);
    const bench = new BenchRemoteService(ctx);
    await bench.ensure({ session: "wall-mirror" }, sig);
    await bench.addStage("wall-mirror", { card: "image-gen", params: burnParams(), expect_rev: 0 }, sig);
    await bench.addStage("wall-mirror", { card: "image-gen", params: { model: "moss-image", prompt: "y", seed: 46601, variant: "sft", quant: "int8" }, expect_rev: 1 }, sig);
    const served = await bench.get("wall-mirror", sig);
    for (const id of ["s_0", "s_1"]) {
      for (const key of Object.keys(paramsOf(rowOf(served, id)))) {
        expect(surface.has(key), `stored key '${key}' must be one the moss-image surface declares`).toBe(true);
      }
    }
  });
});
