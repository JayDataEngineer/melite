// ui-slot-backing.spec.ts — S1b walls for the createUiSlot consolidation:
// the face (UiSlotClaim tiers, walk, LOUD messages, sync store) now rides
// the vendored SlotCore (one `ui.<name>` chain seat per slot; claim
// selectors ARE the resolve-or-decline; precedence maps to priority
// negated; walks return the election's `matched` payload).
//
// Pinned S1b shapes: seat identity is the slot NAME (re-creating a name
// re-opens the same seat — declaration-merging semantics, NOT the old
// per-handle independence); distinct names stay isolated; the store
// organs stay synchronous (the core batches per microtask — the face
// pins sync delivery); the LOUD messages are verbatim.
//
// Run: npx vitest run tests/walls/ts/suites/ui-slot-backing.spec.ts
// (or the whole gate: pnpm run test)
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { createUiSlot } from "../../../../packages/web-kit/slots/src/uiSlotSeam.ts";

interface Payload {
  tag: string;
}

describe("ui slots on the SlotCore backing", () => {
  it("walks highest precedence first; deferring falls through; empty is null", () => {
    const s = createUiSlot<Payload, string>("wall.backing.walk");
    s.register({ id: "skip", precedence: 500, resolve: () => null });
    s.register({ id: "take", precedence: 100, resolve: (i) => ({ tag: `take:${i}` }) });
    assert.equal(s.resolve("y")?.tag, "take:y");
    assert.equal(createUiSlot<Payload, string>("wall.backing.empty").resolve("y"), null);
  });

  it("disposing the loud claim restores the quiet one", () => {
    const s = createUiSlot<Payload, string>("wall.backing.shadow");
    s.register({ id: "low", precedence: 10, resolve: (i) => ({ tag: `low:${i}` }) });
    const disposeHigh = s.register({
      id: "high",
      precedence: 200,
      resolve: (i) => ({ tag: `high:${i}` }),
    });
    assert.equal(s.resolve("x")?.tag, "high:x");
    disposeHigh();
    assert.equal(s.resolve("x")?.tag, "low:x");
  });

  it("seat identity is the slot name: re-creating a name re-opens the same seat", () => {
    const first = createUiSlot<Payload, string>("wall.backing.shared");
    first.register({ id: "one", precedence: 10, resolve: (i) => ({ tag: `one:${i}` }) });
    const second = createUiSlot<Payload, string>("wall.backing.shared");
    assert.deepEqual(second.registered(), ["10:one"]);
    assert.equal(second.resolve("z")?.tag, "one:z");
  });

  it("distinct names are isolated seats", () => {
    const a = createUiSlot<Payload, string>("wall.backing.iso.a");
    const b = createUiSlot<Payload, string>("wall.backing.iso.b");
    a.register({ id: "only-a", precedence: 10, resolve: () => ({ tag: "a" }) });
    assert.deepEqual(b.registered(), []);
    assert.equal(b.resolve("x"), null);
  });

  it("tier collisions and dup ids stay LOUD with the verbatim messages", () => {
    const s = createUiSlot<Payload, string>("wall.backing.loud");
    s.register({ id: "a", precedence: 100, resolve: () => ({ tag: "a" }) });
    assert.throws(
      () => s.register({ id: "b", precedence: 100, resolve: () => ({ tag: "b" }) }),
      /precedence 100 is taken by "a"[\s\S]*different precedence to shadow/,
    );
    assert.throws(
      () => s.register({ id: "a", precedence: 999, resolve: () => ({ tag: "x" }) }),
      /already registered/,
    );
  });

  it("the store stays synchronous: listeners fire on register/dispose, double-dispose no-ops", () => {
    const s = createUiSlot<Payload, string>("wall.backing.store");
    const seen: number[] = [];
    const unsub = s.subscribe(() => seen.push(s.getVersion()));
    const v0 = s.getVersion();
    const dispose = s.register({ id: "w", precedence: 1, resolve: () => null });
    assert.ok(s.getVersion() > v0);
    dispose();
    dispose();
    assert.ok(s.getVersion() > v0 + 1);
    assert.equal(seen.length, 2);
    unsub();
  });

  it("null walk inputs ride the election (region/viewer seats)", () => {
    const s = createUiSlot<{ ready: boolean }, null>("wall.backing.null");
    s.register({ id: "chrome", precedence: 10, resolve: () => ({ ready: true }) });
    assert.equal(s.resolve(null)?.ready, true);
  });
});
