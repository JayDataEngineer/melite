// cards-tab-rows.spec.ts — benchRow's distillation arms (2026-09-16
// burn-down, installment 2): the group face, the title fallbacks,
// the activity/progress carries, the upstream badge's resolution,
// and the junk-params default. Pure function, deep-equal — no
// fetch, no DOM.
import { describe, expect, test } from "vitest";
import { benchRow } from "../src/client/CardsTab.tsx";
import type { BenchStageRow, CardsBenchValue } from "../src/client/cards-resource.ts";

function stage(over: Partial<BenchStageRow> & { id: string }): BenchStageRow {
  return { engine: "comfyui", ...over };
}

function bench(stages: BenchStageRow[]): CardsBenchValue {
  return { kind: "bench", draftId: "bench-main", rev: 1, log: [], stages };
}

describe("benchRow — the group face", () => {
  test("a group stage reads Group (n), kind group (never a card face)", () => {
    const row = benchRow(stage({
      id: "g_0", card: "group",
      children: [stage({ id: "s_0", card: "a" }), stage({ id: "s_1", card: "b" })],
    }) as BenchStageRow);
    expect(row.kind).toBe("group");
    expect(row.title).toBe("Group (2)");
  });
});

describe("benchRow — the title fallbacks (never an empty caption)", () => {
  test("no title and no card: the id captions", () => {
    expect(benchRow(stage({ id: "s_0" })).title).toBe("s_0");
  });

  test("no title: the card captions", () => {
    expect(benchRow(stage({ id: "s_0", card: "tts" })).title).toBe("tts");
  });
});

describe("benchRow — the live carries", () => {
  test("a result-carried activity rides (the drill shows it live)", () => {
    expect(benchRow(stage({ id: "s_0", result: { activity: "sampling 7/20" } })).activity)
      .toBe("sampling 7/20");
  });

  test("a zero-max progress still carries (never a divide-by-zero face)", () => {
    const row = benchRow(stage({ id: "s_0", result: { progress: { value: 5, max: 0 } } }));
    expect(row.progress).toEqual({ value: 5, max: 0 });
  });

  test("non-object params default empty (never a throw on the prompt read)", () => {
    const row = benchRow(stage({ id: "s_0", params: ["junk"] }));
    expect(row.prompt).toBeNull();
  });
});

describe("benchRow — the upstream badge's resolution", () => {
  const parent = stage({ id: "s_0", card: "image-gen" });

  test("a named edge resolves through the bench (the source's own card)", () => {
    const row = benchRow(
      stage({ id: "s_1", inputs: { source: { stage: "s_0" } } }),
      bench([parent, stage({ id: "s_1" })]),
    );
    expect(row.upstream).toBe("image-gen");
  });

  test("an edge to a missing stage badges nothing (never a throw)", () => {
    const row = benchRow(
      stage({ id: "s_1", inputs: { source: { stage: "s_9" } } }),
      bench([parent]),
    );
    expect(row.upstream).toBeNull();
  });

  test("a non-object source badges nothing (the old index era is over)", () => {
    const row = benchRow(
      stage({ id: "s_1", inputs: { source: "s_0" } }),
      bench([parent]),
    );
    expect(row.upstream).toBeNull();
  });
});
