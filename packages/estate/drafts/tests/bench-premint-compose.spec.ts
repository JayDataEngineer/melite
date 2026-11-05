// bench-premint-compose.spec.ts — THE ESTATE HALF OF NO MINT ON
// REFUSAL (qa8 F14 one hop upstream, 2026-10-31). The agent tool's
// add_stage door took the law first (melite-construct verdictOfStages,
// registry row melite-add-no-mint-on-refusal); the GUI card-press
// door — the typed bench/add-stage remote straight into this
// package — still minted before compose, so a client press could
// land the exact landed-ghost class the tool door now refuses (a
// row that composes alone but breaks the bench, poisoning every
// later whole-bench compile until a manual remove).
//
// THE LAW: the add-stage door composes the projection — LIVE rows
// plus the candidate, through the runs validate seat — BEFORE the
// row lands. A refusal refuses the WRITE (no stage, no rev, no
// landing, nothing to roll back). The restore batch door
// (addStagesBench) is EXEMPT by law: era archives repair at
// admission, never refuse at compile (the restore law, 2026-10-21).
// An absent seat admits (the registry-less law every optional
// cross-service judge here rides).
//
// Registry row: estate-add-no-mint-on-refusal (gates tier).
import { describe, test } from "vitest";
import assert from "node:assert/strict";
import { Service, type Context } from "@deepseek-ai/cordis";
import { RemoteError } from "@deepseek-ai/dsh-typert-protocol";
import {
  ensureBench,
  getBench,
  addStageBench,
  addStagesBench,
  type PremintCompose,
} from "../src/bench.ts";
import { composeVerdictOf } from "../src/remote.ts";
import { sig, boot, bootCtx, seed, failureOf } from "./bench-helpers.ts";

/** A compose seat that always refuses — the wall's fired arm. */
const refusingSeat: PremintCompose = async () => ({ ok: false, error: "the wall's refusal voice" });

describe("the add-stage pre-mint compose gate (F14's estate half)", () => {
  test("ARM 1 — a refused compose refuses the WRITE: no stage, no rev, nothing landed", async () => {
    const drafts = await boot();
    await ensureBench(drafts, { session: "pm1", stages: [{ id: "a", card: "hero" }] });
    const before = getBench(drafts, "pm1");
    const failure = await failureOf(addStageBench(
      drafts, "pm1",
      { card: "hero", params: { steps: 4 }, expect_rev: 0 },
      undefined, undefined, refusingSeat,
    ));
    assert.equal(failure.code, "bench/compile-refused");
    assert.match(failure.message, /would not compose: the wall's refusal voice/);
    assert.match(failure.message, /nothing landed/, "the refusal names the no-mint law");
    assert.deepEqual(
      failure.details,
      { session: "pm1", stage: "s_0", card: "hero" },
    );
    // NOTHING LANDED (the refusal-that-lies law): the stored doc is
    // byte-the-bench it was — same rows, same rev.
    const after = getBench(drafts, "pm1");
    assert.equal(
      (after.stages as unknown[]).length,
      (before.stages as unknown[]).length,
      "no row minted",
    );
    assert.equal(after.rev, before.rev, "no rev consumed");
  });

  test("ARM 2 — the candidate rides the projection WITH the live rows (the ghost class)", async () => {
    const drafts = await boot();
    await ensureBench(drafts, { session: "pm2", stages: [{ id: "s_0", card: "hero" }] });
    // The seat refuses ONLY multi-stage projections: a row that
    // composes alone but breaks the bench — the exact landed-ghost
    // class the gate exists to kill.
    const seen: Array<Array<Record<string, unknown>>> = [];
    const ghostCatcher: PremintCompose = async (_intent, stages) => {
      seen.push(stages);
      return stages.length > 1
        ? { ok: false, error: "the projection as a whole does not compose" }
        : { ok: true };
    };
    await failureOf(addStageBench(
      drafts, "pm2",
      { card: "hero", params: { steps: 4 }, expect_rev: 0 },
      undefined, undefined, ghostCatcher,
    ));
    // the judged view is the WHOLE bench: the live row and the
    // candidate (the door's own mint s_1), in bench order.
    assert.equal(seen.length, 1, "the seat judged exactly one projection");
    assert.deepEqual(
      seen[0]!.map((s) => s["id"]),
      ["s_0", "s_1"],
      "the candidate rides inside the projection at its minted id",
    );
    // the wire view, not the stored row: bookkeeping keys never
    // compile; the card RIDES (the phantom-refusal cure — the kinds
    // pass derives input kinds from it).
    const candidateKeys = Object.keys(seen[0]![1]!);
    assert.ok(candidateKeys.includes("card"), "the card rides the projection");
    for (const bookkeeping of ["provenance", "runStatus", "result", "title"]) {
      assert.ok(!candidateKeys.includes(bookkeeping), `the projection strips ${bookkeeping}`);
    }
  });

  test("ARM 3 — archived rows never judge the projection (GAPS-9 rides through the gate)", async () => {
    const drafts = await boot();
    await seed(drafts, "pm3", {
      stages: [
        { id: "s_0", card: "hero", archived: true },
      ],
    });
    const seen: Array<Array<Record<string, unknown>>> = [];
    const seat: PremintCompose = async (_i, stages) => {
      seen.push(stages);
      return { ok: true };
    };
    await addStageBench(
      drafts, "pm3",
      { card: "hero", expect_rev: 0 },
      undefined, undefined, seat,
    );
    assert.deepEqual(
      seen[0]!.map((s) => s["id"]),
      ["s_1"],
      "the archived row's stale params never reach the compose",
    );
  });

  test("ARM 4 — an absent seat admits (the registry-less law)", async () => {
    const drafts = await boot();
    await ensureBench(drafts, { session: "pm4", stages: [{ id: "a", card: "hero" }] });
    // compose === undefined: an app that mounts no runs service (an
    // isolated drafts rig) judges nothing it cannot compose — the
    // same law the admission trio rides.
    const row = await addStageBench(
      drafts, "pm4",
      { card: "hero", params: { steps: 4 }, expect_rev: 0 },
      undefined, undefined, undefined,
    );
    assert.equal(row.stage, "s_0");
    assert.equal(row.rev, 1, "the write landed");
  });

  test("ARM 5 — a green verdict lands: the row, the rev, the provenance", async () => {
    const drafts = await boot();
    // seed (not ensure): the doc's intent is the known 'seeded' —
    // the bench's own intent is what the projection composes under.
    await seed(drafts, "pm5", {
      stages: [{ id: "a", card: "hero" }],
    });
    const intents: unknown[] = [];
    const seat: PremintCompose = async (intent, _stages) => {
      intents.push(intent);
      return { ok: true };
    };
    const row = await addStageBench(
      drafts, "pm5",
      { card: "hero", params: { steps: 4 }, author: "user", expect_rev: 0 },
      undefined, undefined, seat,
    );
    assert.equal(row.stage, "s_0");
    assert.equal(row.rev, 1);
    assert.deepEqual(intents, ["seeded"], "the bench's own intent rides the projection");
    const landed = (getBench(drafts, "pm5").stages as Array<Record<string, unknown>>)
      .find((s) => s["id"] === "s_0")!;
    assert.equal(landed["provenance"], "user", "the author stamp survives the gate");
  });

  test("ARM 6 — the wiring gate still fires first: a phantom wire never reaches the compose", async () => {
    const drafts = await boot();
    await ensureBench(drafts, { session: "pm6", stages: [{ id: "a", card: "hero" }] });
    let judged = 0;
    const seat: PremintCompose = async () => {
      judged += 1;
      return { ok: true };
    };
    const failure = await failureOf(addStageBench(
      drafts, "pm6",
      { card: "hero", inputs: { source: { stage: "ghost", output: "image" } }, expect_rev: 0 },
      undefined, undefined, seat,
    ));
    assert.equal(failure.code, "bench/wire-stage-not-found", "the structural gate owns its refusal");
    assert.equal(judged, 0, "the compose never paid for a row the wire door refused");
  });

  test("ARM 7 — the restore batch door NEVER composes (the era law: repair at admission, teach at the run)", async () => {
    const drafts = await boot();
    await ensureBench(drafts, { session: "pm7", stages: [] });
    // THE EXEMPTION IS STRUCTURAL: addStagesBench takes no compose
    // seat at all — the gate exists only on the interactive single
    // add. Era archives predate today's schema by design; the
    // restore law (2026-10-21) repairs rows at admission and lets
    // the run door teach, and a compose-refusing restore door would
    // brick the archive (the 2026-09-24 operator law the repair arm
    // exists for). Era-shaped rows land through the batch door:
    const row = await addStagesBench(drafts, "pm7", {
      stages: [{ card: "era-card", params: { model: "era-model" } }],
      expect_rev: 0,
    });
    assert.ok(row.rev >= 1, "the restore batch lands untouched by the gate");
    const stages = getBench(drafts, "pm7").stages as Array<Record<string, unknown>>;
    assert.equal(stages.length, 1, "the era row landed");
  });

  test("ARM 22 — THE INCOMPLETE-DRAFT EXCEPTION (the GUI-add burn, 2026-11-01): a flagged verdict LANDS the write", async () => {
    const drafts = await boot();
    await seed(drafts, "pm11", { intent: "seeded", stages: [] });
    // the burn's exact shape: the tts candidate rides axis seeds only
    // (the GUI add door seeds a card's axes — the words are typed in
    // the form the LANDED stage opens), and the projection's compose
    // refuses with the authoring-incomplete class — flagged. The
    // frictionless-authoring ruling (operator 2026-11-11) drops the
    // class at every write seat: refusing here made the tts card
    // UN-ADDABLE from the cards tab (F14's gate re-voicing the run
    // door's required word at the write seat).
    const seat: PremintCompose = async () => ({
      ok: false,
      error: "stage \"s_0\": lane 'qwen3-tts/customvoice' refuses the state: this lane requires 'text' — 'text' is not stated — every tts lane speaks words — state the text to synthesize",
      incomplete: true,
    });
    const row = await addStageBench(
      drafts, "pm11",
      { card: "tts", params: { model: "qwen3-tts", variant: "customvoice" }, expect_rev: 0 },
      undefined, undefined, seat,
    );
    assert.equal(row.stage, "s_0", "the textless tts row LANDED — the words are typed after");
    assert.equal(row.rev, 1, "the write consumed its rev");
    const landed = (getBench(drafts, "pm11").stages as Array<Record<string, unknown>>)
      .find((s) => s["id"] === "s_0")!;
    assert.equal(landed["card"], "tts", "the stage is aboard for the form to open");
  });

  test("ARM 23 — the flag is the ONLY admit: the same refusal UNFLAGGED still refuses (the class never swallows a real one)", async () => {
    const drafts = await boot();
    await seed(drafts, "pm12", { intent: "seeded", stages: [] });
    const before = getBench(drafts, "pm12");
    const unflagged: PremintCompose = async () => ({
      ok: false,
      error: "stage \"s_0\": lane 'qwen3-tts/customvoice' refuses the state: this lane requires 'text' — 'text' is not stated — every tts lane speaks words — state the text to synthesize",
    });
    const failure = await failureOf(addStageBench(
      drafts, "pm12",
      { card: "tts", params: { model: "qwen3-tts", variant: "customvoice" }, expect_rev: 0 },
      undefined, undefined, unflagged,
    ));
    assert.equal(failure.code, "bench/compile-refused", "an unflagged refusal keeps F14's law verbatim");
    const after = getBench(drafts, "pm12");
    assert.equal(after.rev, before.rev, "no rev consumed");
    assert.equal((after.stages as unknown[]).length, (before.stages as unknown[]).length, "nothing landed");
  });

  test("ARM 20 — the BATCH door refuses an unreadable wire body row at its own door (bench/bad-body names the row's position)", async () => {
    const drafts = await boot();
    await ensureBench(drafts, { session: "pm10", stages: [] });
    const before = getBench(drafts, "pm10");
    const failure = await failureOf(addStagesBench(drafts, "pm10", {
      // one good row, one unreadable wire map: the refusal names
      // stage 1 of the batch; the era repair door drops NOTHING —
      // a wire that cannot be read is refused, not silently lost.
      stages: [
        { card: "era-card", params: { model: "era-model" } },
        { card: "era-card", inputs: "not-a-wire-map" },
      ],
      expect_rev: 0,
    }));
    assert.equal(failure.code, "bench/bad-body");
    assert.match(failure.message, /stage 1 of the batch: inputs must be an object of channel/);
    const after = getBench(drafts, "pm10");
    assert.equal(after.rev, before.rev, "the whole batch refused — no rev, no partial landing");
    assert.equal((after.stages as unknown[]).length, (before.stages as unknown[]).length, "even the good row never landed");
  });
});

  test("ARM 19 — a wire body that cannot be read refuses at the door, before any compose (bench/bad-body, nothing lands)", async () => {
    const drafts = await boot();
    await ensureBench(drafts, { session: "pm9", stages: [] });
    const before = getBench(drafts, "pm9");
    const failure = await failureOf(addStageBench(
      drafts, "pm9",
      // a string inputs body is not a wire map — the door refuses it
      // in its own voice; a seat that DROPPED it would compose a row
      // whose wiring silently vanished.
      { card: "hero", params: { steps: 4 }, inputs: "not-a-wire-map", expect_rev: 0 },
      undefined, undefined, refusingSeat,
    ));
    assert.equal(failure.code, "bench/bad-body");
    assert.match(failure.message, /inputs must be an object of channel/);
    const after = getBench(drafts, "pm9");
    assert.equal(after.rev, before.rev, "no rev consumed");
    assert.equal((after.stages as unknown[]).length, (before.stages as unknown[]).length, "nothing landed");
  });

  test("ARM 15 — a doc written behind the domain's back (non-array stages) judges the candidate ALONE — the raw-view parity with the tool door", async () => {
    const drafts = await boot();
    // THE STAGESOF SCENARIO, LIVE (bench.ts's own header names it): a
    // doc written by an older door or a hand edit can carry stages as
    // anything; the read projection coerces to [] for the row-level
    // gates, but the compose gate judges the RAW stored view — the
    // tool door's own read (melite-construct :1604) — so the
    // projection is the candidate by itself, never a crash, never a
    // silently-unjudged write.
    await seed(drafts, "pm8", { rev: 0, intent: "seeded", stages: "not-an-array" });
    const seen: Array<Array<Record<string, unknown>>> = [];
    const seat: PremintCompose = async (_intent, stages) => {
      seen.push(stages);
      return { ok: true };
    };
    const row = await addStageBench(
      drafts, "pm8",
      { card: "hero", params: { steps: 4 }, expect_rev: 0 },
      undefined, undefined, seat,
    );
    assert.equal(seen.length, 1, "the gate judged exactly once");
    assert.deepEqual(
      seen[0]!.map((r) => r["id"]),
      [row.stage],
      "the projection carries the candidate ALONE (the raw view's non-array else)",
    );
    assert.equal(row.rev, 1, "the write lands once judged");
  });

describe("composeVerdictOf — the seat resolution and the verdict mapping", () => {
  /** A minimal real cordis service under the 'runs' name (the
   *  pumping-field law: public members cross the proxy). */
  class FakeRunsSeat extends Service {
    judged: Array<Record<string, unknown>> = [];
    constructor(ctx: Context, private behavior: (doc: unknown) => unknown) {
      super(ctx, "runs");
    }
    validate(doc: unknown, _signal: AbortSignal): Promise<unknown> {
      this.judged.push(doc as Record<string, unknown>);
      return Promise.resolve(this.behavior(doc));
    }
  }

  test("ARM 8 — no runs service mounted: the seat is absent and admits", async () => {
    const { ctx } = await bootCtx();
    assert.equal(composeVerdictOf(ctx, sig), undefined, "the registry-less law");
  });

  test("ARM 9 — the verdict maps the validate door's answer, clause for clause", async () => {
    const stages = [{ id: "s_0", card: "hero" }];
    // One seat per TREE (cordis refuses a second provide of the same
    // name on one ctx): each case boots its own.
    const under = async (behavior: (doc: unknown) => unknown, intent = "seeded") => {
      const { ctx } = await bootCtx();
      new FakeRunsSeat(ctx, behavior);
      return await composeVerdictOf(ctx, sig)!(intent, stages);
    };
    assert.deepEqual(await under(() => ({ ok: true })), { ok: true });
    assert.deepEqual(await under(() => ({ valid: true })), { ok: true });
    assert.deepEqual(
      await under(() => ({ error: "stage s_1: the teaching refusal" })),
      { ok: false, error: "stage s_1: the teaching refusal" },
    );
    assert.deepEqual(
      await under(() => ({ weird: "shape" })),
      { ok: false, error: '{"weird":"shape"}' },
    );
    // a throwing seat folds into the refusal — never a throw past
    // the gate, never a silent admit (the estate cannot certify the
    // projection, so it does not write it).
    assert.deepEqual(
      await under(() => {
        throw new Error("the door's own throw voice");
      }),
      { ok: false, error: "the door's own throw voice" },
    );
  });

  test("ARM 24 — THE CODED CLASS MAPS WITH ITS FLAG (the GUI-add burn): RemoteError code runs/card-compose-incomplete, never a bare refusal", async () => {
    // The validate door throws the incomplete class under its tabled
    // wire code (gate-tails' own wall pins the door side). The seat's
    // fold must hand the class to the pre-mint gate as `incomplete` —
    // discrimination is by code, never instanceof. The construction
    // casts the code the same way the fold reads it: the runs/* rows
    // are declared in estate-queue's module augmentation, which this
    // package cannot import without inverting the dependency — the
    // WIRE VALUE is the contract.
    const { ctx } = await bootCtx();
    // the runs/* code union lives estate-queue-side; drafts cannot
    // name it (the dependency-direction law), so the CONSTRUCTOR is
    // cast at this boundary to take the wire string — the thrown
    // value is a real RemoteError (remoteErrorOf reads it)
    const RunsRefusal = RemoteError as new (
      code: "runs/card-compose-incomplete",
      message: string,
      details: { loc: string },
    ) => Error;
    new FakeRunsSeat(ctx, () => {
      throw new RunsRefusal(
        "runs/card-compose-incomplete",
        "stage \"s_0\": lane 'qwen3-tts/customvoice' refuses the state: this lane requires 'text' — 'text' is not stated",
        { loc: "stages" },
      );
    });
    const verdict = composeVerdictOf(ctx, sig)!;
    assert.deepEqual(
      await verdict("seeded", [{ id: "s_0", card: "tts" }]),
      {
        ok: false,
        error: "stage \"s_0\": lane 'qwen3-tts/customvoice' refuses the state: this lane requires 'text' — 'text' is not stated",
        incomplete: true,
      },
      "the class rides the flag — the write gate admits it",
    );
    // a coded refusal of any OTHER class stays flagless (the flag is
    // the incomplete class alone, never a general admit)
    const { ctx: ctx2 } = await bootCtx();
    new FakeRunsSeat(ctx2, () => {
      throw new RemoteError("draft/not-found", "a real refusal's voice", {} as never);
    });
    const bare = composeVerdictOf(ctx2, sig)!;
    assert.deepEqual(
      await bare("seeded", [{ id: "s_0", card: "tts" }]),
      { ok: false, error: "a real refusal's voice" },
      "no flag outside the class — F14's law keeps its voice",
    );
  });

  test("ARM 10 — the flow id: grammar-legal intents ride, free text falls back to 'bench'", async () => {
    const { ctx } = await bootCtx();
    const seat = new FakeRunsSeat(ctx, () => ({ ok: true }));
    const verdict = composeVerdictOf(ctx, sig)!;
    await verdict("seeded", [{ id: "s_0", card: "hero" }]);
    await verdict("My Free Text!", [{ id: "s_0", card: "hero" }]);
    // the flow_inline body the seat received: FLOW_ID_RE grammar →
    // the intent rides; anything else composes as 'bench' (the tool
    // door's exact fallback, one spelling in the contract).
    const first = seat.judged[0]!["flow_inline"] as Record<string, unknown>;
    const second = seat.judged[1]!["flow_inline"] as Record<string, unknown>;
    assert.equal(first["id"], "seeded");
    assert.equal(second["id"], "bench");
    assert.ok(Array.isArray(first["stages"]), "the stages ride the flow_inline body");
  });

  test("ARM 11 — an empty projection admits without touching the seat", async () => {
    const { ctx } = await bootCtx();
    const seat = new FakeRunsSeat(ctx, () => ({ ok: true }));
    const verdict = composeVerdictOf(ctx, sig)!;
    assert.deepEqual(await verdict("seeded", []), { ok: true });
    assert.equal(seat.judged.length, 0, "nothing to judge, no call paid");
  });

  // THE RESOLUTION FOLDS (the coverage gate's demand, 2026-10-31:
  // every branch of the seat resolution is a real scenario, not dead
  // symmetry — a seat that resolves to nothing ADMITS, in the same
  // registry-less voice as ARM 8).
  test("ARM 12 — a get that THROWS folds to absent (the registry itself is broken — the door still serves)", async () => {
    const { ctx } = await bootCtx();
    const poisoned = new Proxy(ctx, {
      get(target, prop, receiver) {
        if (prop === "get") return () => { throw new Error("registry unreadable"); };
        return Reflect.get(target, prop, receiver);
      },
    });
    assert.equal(composeVerdictOf(poisoned, sig), undefined, "the throw never escapes the resolution");
  });

  test("ARM 13 — a null seat and a non-object seat are absent (never an admit-by-crash)", async () => {
    const { ctx } = await bootCtx();
    const nullSeat = new Proxy(ctx, {
      get(target, prop, receiver) {
        if (prop === "get") return (name: string) => (name === "runs" ? null : Reflect.get(target, name));
        return Reflect.get(target, prop, receiver);
      },
    });
    assert.equal(composeVerdictOf(nullSeat, sig), undefined, "null seat admits");
    const primitiveSeat = new Proxy(ctx, {
      get(target, prop, receiver) {
        if (prop === "get") return (name: string) => (name === "runs" ? "runs-but-a-string" : Reflect.get(target, name));
        return Reflect.get(target, prop, receiver);
      },
    });
    assert.equal(composeVerdictOf(primitiveSeat, sig), undefined, "a non-object seat admits");
  });

  test("ARM 21 — a seat throwing a NON-Error folds its String() voice (the refusal is honest whatever the seat throws)", async () => {
    const { ctx } = await bootCtx();
    new FakeRunsSeat(ctx, () => {
      // a primitive throw: no Error shape, no message field — the
      // fold still names it, never crashes past the gate.
      throw "the seat's primitive voice";
    });
    const verdict = composeVerdictOf(ctx, sig)!;
    assert.deepEqual(
      await verdict("seeded", [{ id: "s_0", card: "hero" }]),
      { ok: false, error: "the seat's primitive voice" },
      "String(e) carries a primitive throw as faithfully as e.message carries an Error",
    );
  });

  test("ARM 16 — an OBJECT seat without a validate function is absent (a mis-shaped service never admits-by-crash)", async () => {
    const { ctx } = await bootCtx();
    const shapedSeat = new Proxy(ctx, {
      get(target, prop, receiver) {
        if (prop === "get") return (name: string) => (name === "runs" ? { name: "runs", no: "validate" } : Reflect.get(target, name));
        return Reflect.get(target, prop, receiver);
      },
    });
    assert.equal(composeVerdictOf(shapedSeat, sig), undefined, "an object seat with no validate door admits — the structural check, not the shape, decides");
  });

  test("ARM 17 — a NON-STRING intent composes as 'bench' (the grammar judges the value, never the type's promise)", async () => {
    const { ctx } = await bootCtx();
    const seat = new FakeRunsSeat(ctx, () => ({ ok: true }));
    const verdict = composeVerdictOf(ctx, sig)!;
    await verdict(42 as never, [{ id: "s_0", card: "hero" }]);
    const body = seat.judged[0]!["flow_inline"] as Record<string, unknown>;
    assert.equal(body["id"], "bench", "a number intent falls back exactly like free text");
  });

  test("ARM 18 — a seat that answers NOTHING folds to a refusal with the empty row's own voice (never a silent admit)", async () => {
    const { ctx } = await bootCtx();
    const seat = new FakeRunsSeat(ctx, () => undefined);
    const verdict = composeVerdictOf(ctx, sig)!;
    assert.deepEqual(
      await verdict("seeded", [{ id: "s_0", card: "hero" }]),
      { ok: false, error: "{}" },
      "the null answer stringifies — the gate cannot certify, so it does not write",
    );
  });

  test("ARM 14 — an EMPTY-STRING intent falls back to 'bench' (a string is not a flow id until the grammar says so)", async () => {
    const { ctx } = await bootCtx();
    const seat = new FakeRunsSeat(ctx, () => ({ ok: true }));
    const verdict = composeVerdictOf(ctx, sig)!;
    await verdict("", [{ id: "s_0", card: "hero" }]);
    const body = seat.judged[0]!["flow_inline"] as Record<string, unknown>;
    assert.equal(body["id"], "bench", "the empty intent composes as the bench flow, ARM 10's law at its edge");
  });
});
