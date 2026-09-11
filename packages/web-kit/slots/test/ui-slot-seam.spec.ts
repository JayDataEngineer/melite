// ui-slot-seam.spec.ts — the UI slot kernel: precedence walks, loud
// collisions, fail-safe nulls, and the sync store organs.
// (useVersion is React-renderer wiring — v8-ignored at the site.)
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { createUiSlot } from "../src/uiSlotSeam.ts";

describe("createUiSlot walk", () => {
  it("an empty slot resolves null (the host fail-safe renders)", () => {
    const slot = createUiSlot<string, number>("walk-empty");
    assert.equal(slot.name, "walk-empty");
    assert.equal(slot.resolve(1), null);
    assert.deepEqual(slot.registered(), []);
    assert.equal(slot.getVersion(), 0);
  });

  it("the loudest claim wins; deferring passes down the walk", () => {
    const slot = createUiSlot<string, number>("walk-order");
    slot.register({ id: "quiet", precedence: 10, resolve: () => "quiet" });
    slot.register({ id: "loud-defer", precedence: 100, resolve: () => null });
    slot.register({ id: "loud", precedence: 50, resolve: (n) => `loud:${n}` });
    assert.equal(slot.resolve(7), "loud:7");
    assert.deepEqual(slot.registered(), ["100:loud-defer", "50:loud", "10:quiet"]);
  });

  it("a fully-deferring walk returns null", () => {
    const slot = createUiSlot<string, number>("walk-defer");
    slot.register({ id: "a", precedence: 10, resolve: () => null });
    slot.register({ id: "b", precedence: 20, resolve: () => null });
    assert.equal(slot.resolve(1), null);
  });

  it("duplicate ids are loud", () => {
    const slot = createUiSlot<string, number>("walk-dup");
    slot.register({ id: "same", precedence: 10, resolve: () => "x" });
    assert.throws(
      () => slot.register({ id: "same", precedence: 20, resolve: () => "y" }),
      /already registered/,
    );
  });

  it("shared precedences are loud, with the shadowing hint", () => {
    const slot = createUiSlot<string, number>("walk-tier");
    slot.register({ id: "first", precedence: 10, resolve: () => "x" });
    assert.throws(
      () => slot.register({ id: "second", precedence: 10, resolve: () => "y" }),
      /precedence 10 is taken by "first" — register at a different precedence/,
    );
  });

  it("re-creating a name re-opens the same seat", () => {
    const first = createUiSlot<string, number>("walk-shared");
    first.register({ id: "keeper", precedence: 10, resolve: () => "kept" });
    const second = createUiSlot<string, number>("walk-shared");
    assert.equal(second.resolve(1), "kept");
  });
});

describe("store organs", () => {
  it("register/dispose bump the version and ping listeners synchronously", () => {
    const slot = createUiSlot<string, number>("walk-store");
    let pings = 0;
    const unsub = slot.subscribe(() => {
      pings++;
    });
    const v0 = slot.getVersion();
    const dispose = slot.register({ id: "a", precedence: 10, resolve: () => "a" });
    assert.equal(slot.getVersion(), v0 + 1);
    assert.equal(pings, 1);
    dispose();
    assert.equal(slot.getVersion(), v0 + 2);
    assert.equal(pings, 2);
    // A second dispose is a no-op (no phantom bump).
    dispose();
    assert.equal(slot.getVersion(), v0 + 2);
    assert.equal(pings, 2);
    unsub();
    slot.register({ id: "b", precedence: 10, resolve: () => "b" });
    assert.equal(pings, 2);
  });

  it("dispose removes the claim from the walk", () => {
    const slot = createUiSlot<string, number>("walk-drop");
    const dispose = slot.register({ id: "only", precedence: 10, resolve: () => "hit" });
    assert.equal(slot.resolve(0), "hit");
    dispose();
    assert.equal(slot.resolve(0), null);
    assert.deepEqual(slot.registered(), []);
  });
});
