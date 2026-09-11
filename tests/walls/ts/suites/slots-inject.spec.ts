// slots-inject.spec.ts — S1 walls for injectSlot, the unload-cancels
// guarantee (the ctx-free port of upstream ctx.slots.inject: declaration
// wait + collapse-dispose + redeclaration-rerun + caller-owned teardown).
//
// This is THE guarantee nothing in the estate had: an unfibered
// import-time register into a late-declared seat throws (pinned last);
// injectSlot waits, follows, and cancels.
//
// Run: npx vitest run tests/walls/ts/suites/slots-inject.spec.ts
// (or the whole gate: pnpm run test)
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import {
  SlotCore,
  injectSlot,
} from "../../../../packages/web-kit/slots/src/vendored/core.ts";

const Null = (): null => null;

describe("injectSlot", () => {
  it("runs the callback synchronously when the declaration already exists", () => {
    const core = new SlotCore();
    core.register(
      { name: "root", children: { "i.ready": { kind: "list" } } as never },
      Null as never,
    );
    let ran = 0;
    const stop = injectSlot(core, "i.ready", () => {
      ran += 1;
      return () => {};
    });
    assert.equal(ran, 1);
    stop();
  });

  it("waits on an undeclared seat and runs when the declaration lands (no throw)", () => {
    const core = new SlotCore();
    let ran = 0;
    const stop = injectSlot(core, "i.late", () => {
      ran += 1;
      return () => {};
    });
    assert.equal(ran, 0);
    core.register(
      { name: "root", children: { "i.late": { kind: "list" } } as never },
      Null as never,
    );
    assert.equal(ran, 1);
    stop();
  });

  it("collapse disposes the active effect; redeclaration reruns the callback", () => {
    const core = new SlotCore();
    let disposed = 0;
    const stop = injectSlot(core, "i.flap", () => {
      return () => {
        disposed += 1;
      };
    });
    const disposeOwner = core.register(
      { name: "root", children: { "i.flap": { kind: "list" } } as never },
      Null as never,
    );
    assert.equal(disposed, 0);
    disposeOwner(); // collapse
    assert.equal(disposed, 1);
    core.register(
      { name: "root", children: { "i.flap": { kind: "list" } } as never },
      Null as never,
    );
    assert.equal(disposed, 1); // rerun installs a fresh effect, old stays disposed
    stop();
    assert.equal(disposed, 2);
  });

  it("master dispose cancels a pending wait (declaration later never runs)", () => {
    const core = new SlotCore();
    let ran = 0;
    const stop = injectSlot(core, "i.cancelled", () => {
      ran += 1;
      return () => {};
    });
    stop();
    core.register(
      { name: "root", children: { "i.cancelled": { kind: "list" } } as never },
      Null as never,
    );
    assert.equal(ran, 0);
  });

  it("master dispose removes an active contribution (full unload)", () => {
    const core = new SlotCore();
    core.register(
      { name: "root", children: { "i.live": { kind: "list" } } as never },
      Null as never,
    );
    const stop = injectSlot(core, "i.live", () => {
      return core.register({ name: "i.live", id: "held" }, Null as never);
    });
    assert.equal(core.entriesOfSlot("i.live").length, 1);
    stop();
    assert.equal(core.entriesOfSlot("i.live").length, 0);
  });

  it("iterable effects install transactionally and dispose in reverse order", () => {
    const core = new SlotCore();
    core.register(
      { name: "root", children: { "i.multi": { kind: "list" } } as never },
      Null as never,
    );
    const order: string[] = [];
    const stop = injectSlot(core, "i.multi", () => {
      const d1 = core.register({ name: "i.multi", id: "one" }, Null as never);
      const d2 = core.register({ name: "i.multi", id: "two" }, Null as never);
      return [
        () => {
          order.push("first");
          d1();
        },
        () => {
          order.push("second");
          d2();
        },
      ];
    });
    assert.equal(core.entriesOfSlot("i.multi").length, 2);
    stop();
    assert.deepEqual(order, ["second", "first"]);
    assert.equal(core.entriesOfSlot("i.multi").length, 0);
  });

  it("setup failure retires the injection permanently and propagates", () => {
    const core = new SlotCore();
    core.register(
      { name: "root", children: { "i.fail": { kind: "list" } } as never },
      Null as never,
    );
    let runs = 0;
    assert.throws(
      () =>
        injectSlot(core, "i.fail", () => {
          runs += 1;
          throw new Error("setup blew up");
        }),
      /setup blew up/,
    );
    assert.equal(runs, 1);
  });

  it("a bare register into an undeclared seat still throws (inject is the only wait seam)", () => {
    const core = new SlotCore();
    assert.throws(
      () => core.register({ name: "i.never-declared", id: "x" }, Null as never),
      /not declared/,
    );
  });
});
