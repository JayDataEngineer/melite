// queue-resurrect.spec.ts — the resurrection planner's every arm:
// the strict JSON coherces, the row gates, the durable-record
// check, and planResurrect's order/orphan split (real temp state
// root; injected readers for the crafted arms).
import { describe, it, expect } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  refList,
  recordEntries,
  nodeRowUsable,
  graphRowsUsable,
  sidecarList,
  artifactStrings,
  coerceCreatedAt,
  durableRecordUsable,
  planResurrect,
} from "../src/queueResurrect.ts";

describe("refList", () => {
  it("falsy rides [], arrays ride copied, truthy non-arrays are the raise road", () => {
    expect(refList(undefined)).toEqual([]);
    expect(refList(null)).toEqual([]);
    expect(refList("")).toEqual([]);
    expect(refList(["a", 1])).toEqual(["a", 1]);
    expect(refList("flat")).toBeNull();
    expect(refList({ a: 1 })).toBeNull();
  });
});

describe("recordEntries", () => {
  it("falsy rides {}, plain objects ride entries, arrays and scalars are the raise road", () => {
    expect(recordEntries(undefined)).toEqual([]);
    expect(recordEntries(0)).toEqual([]);
    expect(recordEntries({ a: 1, b: "x" })).toEqual([["a", 1], ["b", "x"]]);
    expect(recordEntries([1])).toBeNull();
    expect(recordEntries("str")).toBeNull();
  });
});

describe("nodeRowUsable", () => {
  const ok = (over: Record<string, unknown> = {}): Record<string, unknown> => ({
    id: "n1", type: "KSampler", input_from: [], input_names: {}, outputs: {}, params: {}, ...over,
  });
  it("accepts a well-formed row and registers its id in seen", () => {
    const seen = new Set<string>();
    expect(nodeRowUsable(ok(), seen)).toBe(true);
    expect(seen.has("n1")).toBe(true);
  });
  it("refuses non-object rows (scalar, array, null)", () => {
    for (const bad of [7, "x", [1], null]) {
      expect(nodeRowUsable(bad, new Set())).toBe(false);
    }
  });
  it("refuses mistyped or empty id/type, and duplicate ids", () => {
    expect(nodeRowUsable(ok({ id: 7 }), new Set())).toBe(false);
    expect(nodeRowUsable(ok({ id: "" }), new Set())).toBe(false);
    expect(nodeRowUsable(ok({ type: 7 }), new Set())).toBe(false);
    expect(nodeRowUsable(ok({ type: "" }), new Set())).toBe(false);
    expect(nodeRowUsable(ok(), new Set(["n1"]))).toBe(false);
  });
  it("refuses a non-list input_from and blank refs", () => {
    expect(nodeRowUsable(ok({ input_from: "flat" }), new Set())).toBe(false);
    expect(nodeRowUsable(ok({ input_from: [7] }), new Set())).toBe(false);
    expect(nodeRowUsable(ok({ input_from: ["  "] }), new Set())).toBe(false);
    expect(nodeRowUsable(ok({ input_from: ["n0"] }), new Set())).toBe(true);
  });
  it("refuses mistyped input_names/outputs and non-string entry values", () => {
    expect(nodeRowUsable(ok({ input_names: "flat" }), new Set())).toBe(false);
    expect(nodeRowUsable(ok({ outputs: [1] }), new Set())).toBe(false);
    expect(nodeRowUsable(ok({ input_names: { a: 7 } }), new Set())).toBe(false);
    expect(nodeRowUsable(ok({ outputs: { b: 3 } }), new Set())).toBe(false);
    expect(nodeRowUsable(ok({ input_names: { a: "s" }, outputs: { b: "t" } }), new Set())).toBe(true);
  });
  it("refuses a mistyped params map (falsy params ride)", () => {
    expect(nodeRowUsable(ok({ params: "flat" }), new Set())).toBe(false);
    expect(nodeRowUsable(ok({ params: null }), new Set())).toBe(true);
  });
});

describe("graphRowsUsable", () => {
  const row = (id: string): Record<string, unknown> => ({
    id, type: "T", input_from: [], input_names: {}, outputs: {}, params: {},
  });
  it("falsy graphs ride the empty FlowGraph; truthy non-lists die", () => {
    expect(graphRowsUsable(undefined)).toBe(true);
    expect(graphRowsUsable(null)).toBe(true);
    expect(graphRowsUsable("")).toBe(true);
    expect(graphRowsUsable("flat")).toBe(false);
    expect(graphRowsUsable({ a: 1 })).toBe(false);
  });
  it("every row must be usable; duplicate ids across rows refuse", () => {
    expect(graphRowsUsable([row("a"), row("b")])).toBe(true);
    expect(graphRowsUsable([row("a"), { id: "b", type: "" }])).toBe(false);
    expect(graphRowsUsable([row("a"), row("a")])).toBe(false);
    expect(graphRowsUsable([7])).toBe(false);
  });
});

describe("sidecarList + artifactStrings", () => {
  it("falsy rides [], arrays ride copied, truthy non-arrays throw", () => {
    expect(sidecarList(undefined)).toEqual([]);
    expect(sidecarList(["a"])).toEqual(["a"]);
    expect(() => sidecarList("flat")).toThrow(/unlistable sidecar value/);
    expect(() => sidecarList({ a: 1 })).toThrow(/unlistable sidecar value/);
  });
  it("artifact names filter to non-empty strings", () => {
    expect(artifactStrings(["a.png", "", 7, null, "b.png"])).toEqual(["a.png", "b.png"]);
    expect(artifactStrings(undefined)).toEqual([]);
  });
});

describe("coerceCreatedAt", () => {
  it("finite numbers ride; non-finite toll to 0", () => {
    expect(coerceCreatedAt(1726000000)).toBe(1726000000);
    expect(coerceCreatedAt(Infinity)).toBe(0);
    expect(coerceCreatedAt(NaN)).toBe(0);
  });
  it("numeric strings parse (int, decimal, leading-dot, exponent, signed); everything else tolls to 0", () => {
    expect(coerceCreatedAt("1726000000")).toBe(1726000000);
    expect(coerceCreatedAt(" 12.5 ")).toBe(12.5);
    expect(coerceCreatedAt(".5")).toBe(0.5);
    expect(coerceCreatedAt("1e3")).toBe(1000);
    expect(coerceCreatedAt("+7")).toBe(7);
    expect(coerceCreatedAt("")).toBe(0);
    expect(coerceCreatedAt("   ")).toBe(0);
    expect(coerceCreatedAt("yesterday")).toBe(0);
    expect(coerceCreatedAt(null)).toBe(0);
    expect(coerceCreatedAt(true)).toBe(0);
  });
});

describe("durableRecordUsable", () => {
  const sidecar = (over: Record<string, unknown> = {}): string =>
    JSON.stringify({ draft_id: "d1", status: "queued", graph: [], stages: [], skipped_stages: [], artifacts: [], ...over });
  it("a clean record rides", () => {
    expect(durableRecordUsable(sidecar(), "{}", true)).toBe(true);
  });
  it("an unparseable or non-object sidecar refuses", () => {
    expect(durableRecordUsable("{nope", "{}", true)).toBe(false);
    expect(durableRecordUsable("[1]", "{}", true)).toBe(false);
    expect(durableRecordUsable("7", "{}", true)).toBe(false);
  });
  it("a missing/empty/foreign draft_id refuses (the doc is the birth certificate)", () => {
    expect(durableRecordUsable(sidecar({ draft_id: 7 }), "{}", true)).toBe(false);
    expect(durableRecordUsable(sidecar({ draft_id: "" }), "{}", true)).toBe(false);
    expect(durableRecordUsable(sidecar(), "{}", false)).toBe(false);
  });
  it("an unparseable _request.json refuses; ANY parseable shape rides", () => {
    expect(durableRecordUsable(sidecar(), "{nope", true)).toBe(false);
    expect(durableRecordUsable(sidecar(), "[1, 2]", true)).toBe(true);
    expect(durableRecordUsable(sidecar(), '"flat"', true)).toBe(true);
  });
  it("a FlowGraph-unusable graph refuses", () => {
    expect(durableRecordUsable(sidecar({ graph: "flat" }), "{}", true)).toBe(false);
    expect(durableRecordUsable(sidecar({ graph: [{ id: "a", type: "" }] }), "{}", true)).toBe(false);
  });
  it("unlistable stages/skipped/artifacts refuse", () => {
    expect(durableRecordUsable(sidecar({ stages: "flat" }), "{}", true)).toBe(false);
    expect(durableRecordUsable(sidecar({ skipped_stages: 7 }), "{}", true)).toBe(false);
    expect(durableRecordUsable(sidecar({ artifacts: { a: 1 } }), "{}", true)).toBe(false);
  });
});

describe("planResurrect", () => {
  const sidecar = (over: Record<string, unknown> = {}): string =>
    JSON.stringify({ draft_id: "d1", status: "queued", created_at: 100, graph: [], stages: [], skipped_stages: [], artifacts: [], ...over });
  const mk = (): { root: string; out: string } => {
    const root = mkdtempSync(join(tmpdir(), "melite-resurrect-"));
    const out = join(root, "output");
    mkdirSync(out, { recursive: true });
    mkdirSync(join(out, "run-a"));
    mkdirSync(join(out, "run-b"));
    mkdirSync(join(out, "run-c"));
    mkdirSync(join(out, "run-d"));
    mkdirSync(join(out, "run-e"));
    mkdirSync(join(out, "not-a-run"));
    return { root, out };
  };

  it("a missing output root plans empty (boot on a fresh state)", () => {
    const root = mkdtempSync(join(tmpdir(), "melite-resurrect-"));
    const plan = planResurrect(join(root, "nope"));
    expect(plan).toEqual({ order: [], orphans: [] });
  });

  it("half-written and non-object sidecars orphan; non-queued skip silently; the rest order FIFO by created_at", () => {
    const { root, out } = mk();
    writeFileSync(join(out, "run-a", "_flow.json"), "{half");
    writeFileSync(join(out, "run-b", "_flow.json"), "[1]");
    writeFileSync(join(out, "run-c", "_flow.json"), sidecar({ status: "running" }));
    writeFileSync(join(out, "run-d", "_flow.json"), sidecar({ created_at: 50 }));
    const plan = planResurrect(
      root,
      (id) => {
        try {
          // the real default reader shape — file read or null
          const { readFileSync } = require("node:fs") as typeof import("node:fs");
          return readFileSync(join(out, id, "_flow.json"), "utf8");
        } catch {
          return null;
        }
      },
      () => "{}",
      () => true,
    );
    expect(plan.order).toEqual(["run-d"]);
    expect(plan.orphans).toEqual(["run-a", "run-b"]);
  });

  it("a record whose request is missing orphans; a stale draft orphans; a clean record rides", () => {
    const { root, out } = mk();
    writeFileSync(join(out, "run-a", "_flow.json"), sidecar({ created_at: 1 }));
    writeFileSync(join(out, "run-b", "_flow.json"), sidecar({ created_at: 2 }));
    const plan = planResurrect(
      root,
      (id) => {
        const { readFileSync } = require("node:fs") as typeof import("node:fs");
        try {
          return readFileSync(join(out, id, "_flow.json"), "utf8");
        } catch {
          return null;
        }
      },
      (id) => (id === "run-a" ? null : "{}"),
      (draftId: string) => draftId === "d1",
    );
    expect(plan.order).toEqual(["run-b"]);
    expect(plan.orphans).toEqual(["run-a"]);
  });

  it("the LOUD default draftExists probe throws (the drafts domain owns existence)", () => {
    const { root, out } = mk();
    writeFileSync(join(out, "run-a", "_flow.json"), sidecar());
    writeFileSync(join(out, "run-a", "_request.json"), "{}");
    expect(() => planResurrect(root)).toThrow(/needs the caller's draftExists probe/);
  });

  it("the default fs readers serve a real tree end to end (FIFO by created_at, missing-request toll, non-string draft toll)", () => {
    const { root, out } = mk();
    writeFileSync(join(out, "run-a", "_flow.json"), sidecar({ created_at: 30 }));
    writeFileSync(join(out, "run-a", "_request.json"), "{}");
    writeFileSync(join(out, "run-b", "_flow.json"), sidecar({ created_at: 10 }));
    writeFileSync(join(out, "run-b", "_request.json"), "{}");
    writeFileSync(join(out, "run-c", "_flow.json"), sidecar({ created_at: 5 }));
    // run-c: sidecar but NO _request.json -> the default readRequest
    // catch tolls null -> orphan
    writeFileSync(join(out, "run-d", "_flow.json"), sidecar({ draft_id: 7, created_at: 1 }));
    writeFileSync(join(out, "run-d", "_request.json"), "{}");
    // run-d: non-string draft_id tolls the false arm -> orphan
    // run-e: an empty run dir (no sidecar at all) -> the default
    // readSidecar catch tolls null -> skipped from both lists
    const plan = planResurrect(root, undefined, undefined, () => true);
    expect(plan.order).toEqual(["run-b", "run-a"]);
    expect(plan.orphans).toEqual(["run-c", "run-d"]);
  });
});
