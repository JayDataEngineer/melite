// benchSnapshot.spec.ts — THE SNAPSHOT CONTRACT's own walls (the
// operator's order, 2026-09-26: "the saving should 100% be a
// schemamaster contract, that way we know 100% if it will load
// again"). Pure module: every law of both faces — what parse
// accepts and refuses, what save strips, drops, and stamps — plus
// the round-trip guarantee itself: save(x) then parse(save(x))
// NEVER fails, and save is idempotent.
import { describe, it } from "vitest";
import assert from "node:assert/strict";

import {
  parseBenchSnapshot,
  parseBenchSnapshotStages,
  parseCardSnapshot,
  saveBenchSnapshotStages,
} from "../src/benchSnapshot.ts";

describe("parseBenchSnapshotStages — the load-critical row law", () => {
  it("accepts the shapes the bench domain writes (plain card stage, group row with children, wired stage)", () => {
    const ok = parseBenchSnapshotStages([
      { id: "s_0", card: "image-gen", engine: "comfyui", params: { prompt: "a boat" } },
      { id: "g", children: [{ id: "s_1" }] },
      { id: "s_2", params: { model: "h3" }, inputs: { image1: { stage: "s_0", output: "default" } } },
    ]);
    assert.equal(ok.ok, true);
    if (ok.ok) assert.equal(ok.value.length, 3);
  });

  it("refuses non-list bodies and junk rows with the row named", () => {
    const notList = parseBenchSnapshotStages("nope");
    assert.deepEqual(notList, { ok: false, problems: ["stages: must be an array"] });

    const junk = parseBenchSnapshotStages([{ id: "ok" }, null, { id: "" }, { id: 7 }, { id: "p", params: "x" }]);
    assert.equal(junk.ok, false);
    if (!junk.ok) {
      assert.deepEqual(junk.problems, [
        "stages[1]: not an object",
        "stages[2]: id must be a non-empty string",
        "stages[3]: id must be a non-empty string",
        "stages[4]: params must be an object",
      ]);
    }
  });

  it("refuses mistyped seam fields (inputs/engine/card/children)", () => {
    const bad = parseBenchSnapshotStages([
      { id: "a", inputs: [] },
      { id: "b", engine: 3 },
      { id: "c", card: {} },
      { id: "d", children: "x" },
    ]);
    assert.equal(bad.ok, false);
    if (!bad.ok) assert.equal(bad.problems.length, 4);
  });
});

describe("parseBenchSnapshot / parseCardSnapshot — the top-level law", () => {
  it("accepts the persisted shape (stages + intent + optional head) and defaults intent", () => {
    const ok = parseBenchSnapshot({
      stages: [{ id: "s" }],
      bench_head: { rev: 1, author: "tool" },
    });
    assert.equal(ok.ok, true);
    if (ok.ok) {
      assert.equal(ok.value.intent, "");
      assert.deepEqual(ok.value.bench_head, { rev: 1, author: "tool" });
    }
  });

  it("refuses non-objects, non-string intent, and a bad head — problems carry the bench_snapshot prefix", () => {
    assert.deepEqual(parseBenchSnapshot(undefined), { ok: false, problems: ["bench_snapshot: not an object"] });
    const badIntent = parseBenchSnapshot({ stages: [], intent: 7 });
    assert.deepEqual(badIntent, { ok: false, problems: ["bench_snapshot.intent: must be a string"] });
    const badHead = parseBenchSnapshot({ stages: [], bench_head: "x" });
    assert.deepEqual(badHead, { ok: false, problems: ["bench_snapshot.bench_head: must be an object"] });
    // ONE bad row refuses the WHOLE snapshot — the loader posts the
    // list whole; a silent partial restore is the fabrication this
    // contract exists to kill.
    const oneBadRow = parseBenchSnapshot({ stages: [{ id: "a" }, null] });
    assert.equal(oneBadRow.ok, false);
    if (!oneBadRow.ok) assert.deepEqual(oneBadRow.problems, ["bench_snapshot.stages[1]: not an object"]);
  });

  it("parseCardSnapshot accepts {card, params} and defaults params; refuses the rest by name", () => {
    const ok = parseCardSnapshot({ card: "image-gen", params: { prompt: "x" } });
    assert.deepEqual(ok, { ok: true, value: { card: "image-gen", params: { prompt: "x" } } });
    assert.deepEqual(parseCardSnapshot({ card: "image-gen" }), {
      ok: true,
      value: { card: "image-gen", params: {} },
    });
    assert.deepEqual(parseCardSnapshot({ params: {} }), {
      ok: false,
      problems: ["card_snapshot.card: must be a non-empty string"],
    });
    assert.deepEqual(parseCardSnapshot({ card: "c", params: "x" }), {
      ok: false,
      problems: ["card_snapshot.params: must be an object"],
    });
  });
});

describe("saveBenchSnapshotStages — the writer's law", () => {
  it("strips run memory, strips the era's self-naming model, stamps provenance restored", () => {
    const saved = saveBenchSnapshotStages([
      {
        id: "s_0",
        card: "image-gen",
        params: { prompt: "a boat", model: "image-gen" },
        result: { url: "/x.png" },
        runStatus: "done",
        history: [{ at: 1 }],
        resultParams: { seed: 3 },
        resolved: true,
      },
      {
        id: "s_1",
        card: "h3-timeline",
        // a model naming a REAL family RIDES (the repair law's arm)
        params: { model: "h3", length: 56 },
      },
    ]);
    assert.deepEqual(saved.warnings, []);
    assert.deepEqual(saved.stages, [
      { id: "s_0", card: "image-gen", params: { prompt: "a boat" }, provenance: "restored" },
      { id: "s_1", card: "h3-timeline", params: { model: "h3", length: 56 }, provenance: "restored" },
    ]);
  });

  it("drops unloadable rows with a named warning and never throws", () => {
    const saved = saveBenchSnapshotStages([null, "scalar", { id: "s", params: { a: 1 } }, { nope: true }]);
    assert.deepEqual(saved.warnings, [
      "dropped unloadable stage (stages[0]: not an object)",
      "dropped unloadable stage (stages[1]: not an object)",
      "dropped unloadable stage (stages[3]: id must be a non-empty string)",
    ]);
    assert.deepEqual(saved.stages, [{ id: "s", params: { a: 1 }, provenance: "restored" }]);
    // a non-array body is not a crash — it contracts to empty
    assert.deepEqual(saveBenchSnapshotStages(undefined), { stages: [], warnings: [] });
  });

  it("is idempotent (save(save(x)) === save(x)) and never mutates the source rows", () => {
    const src = [
      { id: "s", params: { model: "c" }, card: "c", result: { url: "/x" } },
    ];
    const once = saveBenchSnapshotStages(src);
    const twice = saveBenchSnapshotStages(once.stages);
    assert.deepEqual(once.stages, twice.stages);
    assert.deepEqual(twice.warnings, []);
    assert.deepEqual(src[0]!.result, { url: "/x" }, "the source row keeps its run memory");
    assert.equal("result" in (once.stages[0] as Record<string, unknown>), false);
  });
});

describe("THE ROUND-TRIP GUARANTEE (the operator's words: 'we know 100% if it will load again')", () => {
  it("everything save produces parses on the load side — including hostile source bodies", () => {
    const hostile: unknown[] = [
      { id: "a", params: { model: "a" }, card: "a", result: { url: "x" } },
      null,
      7,
      [Array.of("nested")],
      { id: "", params: null },
      { id: "b", inputs: { i: { stage: "a" } }, engine: "comfyui" },
    ];
    const saved = saveBenchSnapshotStages(hostile);
    const parsed = parseBenchSnapshot({ stages: saved.stages, intent: "round trip" });
    assert.equal(parsed.ok, true, "the persisted shape always parses");
    if (parsed.ok) {
      assert.equal(parsed.value.stages.length, saved.stages.length);
      assert.equal(parsed.value.intent, "round trip");
    }
  });
});
