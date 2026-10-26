// cards-resource-pure.spec.ts — the cards protocol's pure half
// (2026-09-16 burn-down): address builders, the address grammar,
// readBench's defensive readers (the card-birth re-attach, the
// malformed-row filters, the zero defaults), emptyBench, the
// terminal vocabulary, and mergeRunFrame's upsert law. Pure
// functions, deep-equal — no fetch, no DOM.
import { describe, expect, test } from "vitest";
import {
  benchSessionOfAddress,
  cardsDraftStageAddress,
  cardsRunAddress,
  emptyBench,
  isTerminal,
  mergeRunFrame,
  parseCardsAddress,
  readBench,
  readDraft,
} from "../src/client/cards-resource.ts";
import type { CardsRunValue } from "../src/client/cards-resource.ts";
import { draftIdOf } from "@melite/contracts/benchStage";

describe("the address builders — encoding rides along", () => {
  test("the run address encodes its id", () => {
    expect(cardsRunAddress("r/1")).toBe("dsh-resource://cards/run/r%2F1");
  });
  test("the draft-stage address encodes both segments", () => {
    expect(cardsDraftStageAddress(draftIdOf("d 1"), "s/0")).toBe(
      "dsh-resource://cards/draft/d%201/s%2F0",
    );
  });
  test("the run address round-trips through the parser", () => {
    expect(parseCardsAddress(cardsRunAddress("run-9"))).toEqual({ run: "run-9" });
  });
});

describe("the address grammar — refusals are null, never throws", () => {
  test("a foreign scheme is not ours", () => {
    expect(parseCardsAddress("dsh-resource://flows/bench")).toBeNull();
  });
  test("a run arm without an id is not ours", () => {
    expect(parseCardsAddress("dsh-resource://cards/run/")).toBeNull();
  });
  test("a draft arm without a stage is not ours", () => {
    expect(parseCardsAddress("dsh-resource://cards/draft/only-one")).toBeNull();
  });
  test("a draft arm with empty segments is not ours", () => {
    expect(parseCardsAddress("dsh-resource://cards/draft//s_0")).toBeNull();
    expect(parseCardsAddress("dsh-resource://cards/draft/draft-1/")).toBeNull();
    expect(parseCardsAddress("dsh-resource://cards/draft/")).toBeNull();
  });
  test("an unknown arm is not ours", () => {
    expect(parseCardsAddress("dsh-resource://cards/bench-extra")).toBeNull();
  });
  test("the session rides the bench tail (bare benches serve main)", () => {
    expect(benchSessionOfAddress("dsh-resource://cards/bench")).toBe("main");
    expect(benchSessionOfAddress("dsh-resource://cards/bench/conv-9")).toBe("conv-9");
    expect(benchSessionOfAddress("dsh-resource://cards/run/run-1")).toBe("main");
  });
});

describe("readBench — the door's wire is untyped at this seam", () => {
  test("a missing stages list reads as no stages (never a throw)", () => {
    expect(readBench({}, 'main').stages).toEqual([]);
  });
  test("malformed rows filter out (the view never breaks on one bad row)", () => {
    const bench = readBench({
      draft_id: "d", rev: 1,
      stages: [null, 42, { title: "no id" }, { id: "s_0", card: "image-gen" }],
      log: [null, { rev: "x" }, { rev: 3 }],
    }, 'main');
    expect(bench.stages).toEqual([{ id: "s_0", card: "image-gen" }]);
    expect(bench.log).toEqual([{ rev: 3 }]);
  });
  test("a missing log reads as no log", () => {
    expect(readBench({}, 'main').log).toEqual([]);
  });
  test("the zero defaults (no draft_id, no rev)", () => {
    expect(readBench({}, 'main')).toMatchObject({ draftId: "bench-main", rev: 0 });
  });
  test("CARD BIRTH: a single cardless stage re-attaches the draft intent", () => {
    const bench = readBench({ intent: "h3-timeline", stages: [{ id: "s_0", params: {} }] }, 'main');
    expect(bench.stages).toEqual([{ id: "s_0", params: {}, card: "h3-timeline" }]);
  });
  test("no birth law without an intent, with a card, or across stages", () => {
    const noIntent = readBench({ stages: [{ id: "s_0" }] }, 'main');
    expect(noIntent.stages).toEqual([{ id: "s_0" }]);
    const carded = readBench({ intent: "x", stages: [{ id: "s_0", card: "image-gen" }] }, 'main');
    expect(carded.stages).toEqual([{ id: "s_0", card: "image-gen" }]);
    const blankCarded = readBench({ intent: "x", stages: [{ id: "s_0", card: "" }] }, 'main');
    expect(blankCarded.stages).toEqual([{ id: "s_0", card: "x" }]);
    const multi = readBench({ intent: "x", stages: [{ id: "s_0" }, { id: "s_1" }] }, 'main');
    expect(multi.stages).toEqual([{ id: "s_0" }, { id: "s_1" }]);
  });
  test("emptyBench is the fresh conversation's zero state (rev 0)", () => {
    expect(emptyBench("conv-9")).toEqual({
      kind: "bench", draftId: "bench-conv-9", rev: 0, stages: [], log: [], sessionKey: "conv-9",
    });
  });
  test("emptyBench sanitizes its key (never a forged draft id)", () => {
    expect(emptyBench("no spaces").draftId).toBe("bench-main");
  });
});

describe("isTerminal — the runs seat's own vocabulary", () => {
  test.each(["completed", "failed", "stopped"])("%s ends the stream", (s) => {
    expect(isTerminal(s)).toBe(true);
  });
  test("live words never end it", () => {
    expect(isTerminal("running")).toBe(false);
    expect(isTerminal("queued")).toBe(false);
    expect(isTerminal("")).toBe(false);
  });
});

function runValue(over: Partial<CardsRunValue> = {}): CardsRunValue {
  return {
    kind: "run", runId: "r_1", status: "running", draftId: draftIdOf("d_1"),
    stages: [{ id: "s_0", status: "running" }], lastFrame: undefined, ...over,
  };
}

describe("mergeRunFrame — the events fold (upsert by id, kept frame)", () => {
  test("a run-status frame replaces the status and is kept", () => {
    const next = mergeRunFrame(runValue(), { type: "run", status: "completed" } as never);
    expect(next.status).toBe("completed");
    expect(next.lastFrame).toEqual({ type: "run", status: "completed" });
  });
  test("a run frame without a status string keeps the status (keeps the frame)", () => {
    const next = mergeRunFrame(runValue(), { type: "run" } as never);
    expect(next.status).toBe("running");
    expect(next.lastFrame).toEqual({ type: "run" });
  });
  test("a foreign frame type keeps everything but the frame", () => {
    const next = mergeRunFrame(runValue(), { type: "progress", pct: 3 } as never);
    expect(next.status).toBe("running");
    expect(next.stages).toHaveLength(1);
    expect(next.lastFrame).toEqual({ type: "progress", pct: 3 });
  });
  test("a stage frame for an unknown id appends a running row", () => {
    const next = mergeRunFrame(runValue(), { type: "stage", stage: "s_9" } as never);
    expect(next.stages).toEqual([
      { id: "s_0", status: "running" },
      { id: "s_9", status: "running" },
    ]);
  });
  test("a stage frame for a known id flips that row (siblings untouched)", () => {
    const v = runValue({ stages: [
      { id: "s_0", status: "queued" },
      { id: "s_1", status: "failed" },
    ] });
    const next = mergeRunFrame(v, { type: "stage", stage: "s_0" } as never);
    expect(next.stages).toEqual([
      { id: "s_0", status: "running" },
      { id: "s_1", status: "failed" },
    ]);
  });
  test("a stage frame without a string id changes no rows", () => {
    const next = mergeRunFrame(runValue(), { type: "stage" } as never);
    expect(next.stages).toEqual([{ id: "s_0", status: "running" }]);
  });
});

describe("readDraft — the missing halves default", () => {
  test("a stageless doc reads an empty row list (never undefined)", () => {
    expect(readDraft(draftIdOf("d"), "s_0", { intent: "the film" }).stages).toEqual([]);
  });

  test("a non-string intent reads empty (never a lying intent)", () => {
    expect(readDraft(draftIdOf("d"), "s_0", { intent: 42, stages: [] }).intent).toBe("");
  });
});
