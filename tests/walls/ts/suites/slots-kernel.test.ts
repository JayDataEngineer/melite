// slots-kernel.test.ts — S1 walls for the re-vendored slot core.
//
// Pins the primitives the ATTRIBUTION.md dropped-ledger used to list as
// cut: keyed + chain kinds, chain election, the error policy
// (reportEntryError / abdication / onEntryError), the declaration seam
// (declarationEpoch / subscribeDeclaration), and the staleness probe
// (isLive). Single/list/disposal/collapse behavior is re-pinned here so
// the port cannot regress the kept semantics.
//
// Run: node --experimental-strip-types --test tests/walls/ts/suites/slots-kernel.test.ts
// (or the whole plane: node tests/walls/ts/run.mjs)
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { SlotCore } from "../../../../packages/web-kit/slots/src/vendored/core.ts";

const Null = (): null => null;

/** Declare one seat on a fresh core via a root claim. */
function seat(core: SlotCore, name: string, kind: "single" | "list" | "keyed" | "chain"): () => void {
  return core.register(
    { name: "root", children: { [name]: { kind } } as never },
    Null as never,
  );
}

describe("single/list kept semantics", () => {
  it("undeclared registration throws; list requires id", () => {
    const core = new SlotCore();
    assert.throws(() => core.register({ name: "nope" }, Null as never), /not declared/);
    seat(core, "s.a", "list");
    assert.throws(() => core.register({ name: "s.a" }, Null as never), /requires options.id/);
  });

  it("single shadows at distinct priorities, lowest first; same-priority double registration throws", () => {
    const core = new SlotCore();
    seat(core, "s.panel", "single");
    core.register({ name: "s.panel", registrant: "base" }, Null as never);
    core.register({ name: "s.panel", priority: 1, registrant: "shadow" }, Null as never);
    const entries = core.entriesOfSlot("s.panel");
    assert.equal(entries.length, 2);
    assert.equal(entries[0]?.registrant, "base");
    assert.throws(
      () => core.register({ name: "s.panel", registrant: "clash" }, Null as never),
      /already has a registration/,
    );
  });

  it("disposal collapses declared children recursively; stale disposers no-op; redeclaration legal", () => {
    const core = new SlotCore();
    seat(core, "s.a", "list");
    const disposeMiddle = core.register(
      { name: "s.a", id: "middle", children: { "s.b": { kind: "list" } } as never },
      Null as never,
    );
    const disposeInner = core.register({ name: "s.b", id: "inner" }, Null as never);
    assert.equal(core.isDeclared("s.b"), true);
    disposeMiddle();
    assert.equal(core.isDeclared("s.b"), false);
    assert.equal(core.entriesOfSlot("s.b").length, 0);
    assert.doesNotThrow(() => disposeInner());
    core.register(
      { name: "s.a", id: "again", children: { "s.b": { kind: "list" } } as never },
      Null as never,
    );
    assert.equal(core.isDeclared("s.b"), true);
  });
});

describe("keyed kind (re-vendored)", () => {
  it("requires options.key; same key + same priority throws; distinct keys coexist", () => {
    const core = new SlotCore();
    seat(core, "k.view", "keyed");
    assert.throws(() => core.register({ name: "k.view" }, Null as never), /requires options.key/);
    core.register({ name: "k.view", key: "a", registrant: "ra" }, Null as never);
    core.register({ name: "k.view", key: "b", registrant: "rb" }, Null as never);
    assert.throws(
      () => core.register({ name: "k.view", key: "a" }, Null as never),
      /already has an entry for key "a"/,
    );
    // Same key at a distinct priority shadows instead of throwing.
    core.register({ name: "k.view", key: "a", priority: 1, registrant: "shadow" }, Null as never);
    const entries = core.entriesOfSlot("k.view");
    assert.equal(entries.length, 3);
    assert.equal(entries[0]?.key, "a");
    assert.equal(entries[0]?.registrant, "ra");
  });
});

describe("chain kind (re-vendored)", () => {
  it("requires options.select; election is priority-ordered; all-decline is null", () => {
    const core = new SlotCore();
    seat(core, "c.body", "chain");
    assert.throws(() => core.register({ name: "c.body" }, Null as never), /requires options.select/);
    core.register(
      { name: "c.body", priority: 10, select: (o) => (o["wants"] === "late" ? "LATE" : null), registrant: "late" },
      Null as never,
    );
    core.register(
      { name: "c.body", select: (o) => (o["wants"] === "early" ? "EARLY" : null), registrant: "early" },
    );
    const early = core.resolveChain("c.body", { wants: "early" });
    assert.notEqual(early, null);
    assert.equal(early?.matched, "EARLY");
    assert.equal(early?.view.registrant, "early");
    // Priority 0 tries before priority 10 even though it registered second.
    const late = core.resolveChain("c.body", { wants: "late" });
    assert.equal(late?.matched, "LATE");
    assert.equal(core.resolveChain("c.body", { wants: "nothing" }), null);
  });

  it("non-chain seats never elect", () => {
    const core = new SlotCore();
    seat(core, "s.plain", "single");
    core.register({ name: "s.plain" }, Null as never);
    assert.equal(core.resolveChain("s.plain", {}), null);
    assert.equal(core.resolveChain("missing", {}), null);
  });
});

describe("error policy (re-vendored)", () => {
  it("abdicating report retires the entry from its cell; the next survivor renders; repeat reports no-op", () => {
    const core = new SlotCore();
    seat(core, "e.panel", "single");
    core.register({ name: "e.panel", registrant: "doomed" }, Null as never);
    core.register({ name: "e.panel", priority: 1, registrant: "next" }, Null as never);
    const seen: Array<{ abdicated: boolean }> = [];
    core.onEntryError((_key, _entry, _error, info) => {
      seen.push({ abdicated: info.abdicated });
    });
    core.reportEntryError("e.panel", undefined, new Error("boom"), { abdicate: true });
    const entries = core.entriesOfSlot("e.panel");
    assert.equal(entries.length, 1);
    assert.equal(entries[0]?.registrant, "next");
    assert.deepEqual(seen, [{ abdicated: true }]);
    core.reportEntryError("e.panel", undefined, new Error("boom"), { abdicate: true });
    assert.equal(seen.length, 1); // one-shot: the repeat no-ops entirely
  });

  it("non-abdicating report notifies without mutating the ledger (chain crashes)", () => {
    const core = new SlotCore();
    seat(core, "e.chain", "chain");
    core.register({ name: "e.chain", select: () => "M" }, Null as never);
    let count = 0;
    core.onEntryError(() => {
      count += 1;
    });
    core.reportEntryError("e.chain", undefined, new Error(" render "), { abdicate: false });
    assert.equal(count, 1);
    assert.equal(core.entriesOfSlot("e.chain").length, 1);
    assert.notEqual(core.resolveChain("e.chain", {}), null);
  });
});

describe("declaration seam (re-vendored)", () => {
  it("epoch advances on declare and collapse only; entry mutations do not move it", () => {
    const core = new SlotCore();
    assert.equal(core.declarationEpoch("d.s"), 0);
    const disposeOwner = core.register(
      { name: "root", children: { "d.s": { kind: "list" } } as never },
      Null as never,
    );
    assert.equal(core.declarationEpoch("d.s"), 1);
    const disposeEntry = core.register({ name: "d.s", id: "x" }, Null as never);
    assert.equal(core.declarationEpoch("d.s"), 1);
    disposeEntry();
    assert.equal(core.declarationEpoch("d.s"), 1);
    disposeOwner();
    assert.equal(core.declarationEpoch("d.s"), 2);
    assert.equal(core.isDeclared("d.s"), false);
  });

  it("subscribeDeclaration fires synchronously on declare and collapse, never on entry churn", () => {
    const core = new SlotCore();
    let fires = 0;
    core.subscribeDeclaration("d.w", () => {
      fires += 1;
    });
    const disposeOwner = core.register(
      { name: "root", children: { "d.w": { kind: "list" } } as never },
      Null as never,
    );
    assert.equal(fires, 1);
    const disposeEntry = core.register({ name: "d.w", id: "x" }, Null as never);
    disposeEntry();
    assert.equal(fires, 1);
    disposeOwner();
    assert.equal(fires, 2);
  });
});

describe("staleness probe (re-vendored)", () => {
  it("isLive is true while registered, false after dispose or abdication", () => {
    const core = new SlotCore();
    seat(core, "v.panel", "single");
    const dispose = core.register({ name: "v.panel" }, Null as never);
    const view = core.entriesOfSlot("v.panel")[0];
    assert.ok(view);
    assert.equal(core.isLive(view as never), true);
    dispose();
    assert.equal(core.isLive(view as never), false);
  });

  it("abdicated entries read dead while still on the ledger", () => {
    const core = new SlotCore();
    seat(core, "v.solo", "single");
    core.register({ name: "v.solo" }, Null as never);
    const view = core.entriesOfSlot("v.solo")[0];
    assert.ok(view);
    core.reportEntryError("v.solo", undefined, new Error("x"), { abdicate: true });
    assert.equal(core.isLive(view as never), false);
  });
});
