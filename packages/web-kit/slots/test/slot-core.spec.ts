// slot-core.spec.ts — the vendored SlotCore registry: seat declaration,
// single/keyed/list/chain registration, shadowing, chain election,
// disposal collapse, error supervision, describe(), and injectSlot.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
// (imports ride the seam-layer barrel — the S4a wall forbids test
// files importing vendored/core directly; index re-exports the same
// module instance, so coverage still attributes to core.ts.)
import {
  SlotCore,
  injectSlot,
  resolveSlotLabel,
} from "../src/index.ts";
import type { SlotEntryView } from "../src/index.ts";

// The spec's fixture seats, declared the DESIGNED way: SlotMap is
// extensible by declaration merging (any module may extend the seat
// vocabulary — cardSeam.ts declares the estate's own two rows the
// same way). Kind per use: seats addressed with key: are keyed, id:
// are list, the rest single; "route" exercises chain election.
// (2026-09-12: before this block the spec never sat in a tsc
// program, so its seat names rode the wide side.)
declare module "../src/vendored/core" {
  interface SlotMap {
    a: { kind: "single" }
    anon: { kind: "single" }
    b: { kind: "list" }
    bad: { kind: "single" }
    bare: { kind: "list" }
    c: { kind: "keyed" }
    cells: { kind: "keyed" }
    dup: { kind: "single" }
    flaky: { kind: "single" }
    g: { kind: "single" }
    ghost: { kind: "single" }
    inj: { kind: "single" }
    items: { kind: "list" }
    kid: { kind: "single" }
    keyed: { kind: "keyed" }
    late: { kind: "single" }
    lax: { kind: "single" }
    listed: { kind: "list" }
    once: { kind: "single" }
    p: { kind: "single" }
    r: { kind: "single" }
    rb: { kind: "single" }
    route: { kind: "chain" }
    s: { kind: "single" }
    single: { kind: "single" }
    solo: { kind: "single" }
  }
}

function Null(): null {
  return null;
}

function tick(): Promise<void> {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, 0);
  });
}

describe("resolveSlotLabel", () => {
  it("resolves thunks, passes strings, keeps undefined", () => {
    assert.equal(resolveSlotLabel("plain"), "plain");
    assert.equal(resolveSlotLabel(() => "lazy"), "lazy");
    assert.equal(resolveSlotLabel(undefined), undefined);
  });
});

describe("register validation", () => {
  it("throws into undeclared seats", () => {
    const core = new SlotCore();
    // "ghost-seat" is deliberately OUTSIDE the merged fixture table —
    // the runtime's undeclared-seat refusal is the thing under test,
    // so the name rides the wide side (the uiSlotSeam dynamic-key
    // precedent) rather than the declared table.
    assert.throws(
      () => core.register({ name: "ghost-seat" as "root", registrant: "t" }, Null),
      /not declared/,
    );
  });

  it("throws redeclaring a child seat (names the first declarer)", () => {
    const core = new SlotCore();
    core.register({ name: "root", children: { dup: { kind: "single" } }, registrant: "first" }, Null);
    assert.throws(
      () =>
        core.register(
          { name: "root", priority: 1, children: { dup: { kind: "single" } } },
          Null,
        ),
      /already declared.*\(by an entry in "root" \(first\)\)/,
    );
  });

  it("names the declaring seat when the first declarer was anonymous", () => {
    const core = new SlotCore();
    core.register({ name: "root", children: { ghost: { kind: "single" } } }, Null);
    assert.throws(
      () =>
        core.register(
          { name: "root", priority: 1, children: { ghost: { kind: "single" } } },
          Null,
        ),
      /already declared.*\(by an entry in "root"\)/,
    );
  });

  it("single seats reject a second occupant at the same priority", () => {
    const core = new SlotCore();
    core.register({ name: "root", children: { solo: { kind: "single" } } }, Null);
    core.register({ name: "solo", registrant: "named" }, Null);
    assert.throws(
      () => core.register({ name: "solo", registrant: "late" }, Null),
      /already has a registration.*registered by named/,
    );
  });

  it("the occupant hint omits the byline when the occupant is anonymous", () => {
    const core = new SlotCore();
    core.register({ name: "root", children: { anon: { kind: "single" } } }, Null);
    core.register({ name: "anon" }, Null);
    assert.throws(
      () => core.register({ name: "anon" }, Null),
      /already has a registration/,
    );
  });

  it("keyed seats require a key and reject same-cell duplicates", () => {
    const core = new SlotCore();
    core.register({ name: "root", children: { cells: { kind: "keyed" } } }, Null);
    assert.throws(
      () => core.register({ name: "cells" }, Null),
      /requires options.key/,
    );
    core.register({ name: "cells", key: "k", registrant: "v1" }, Null);
    core.register({ name: "cells", key: "k", priority: 1, registrant: "v2" }, Null);
    assert.throws(
      () => core.register({ name: "cells", key: "k", registrant: "v3" }, Null),
      /already has an entry for key "k"/,
    );
  });

  it("list seats require an id and reject same-cell duplicates", () => {
    const core = new SlotCore();
    core.register({ name: "root", children: { items: { kind: "list" } } }, Null);
    assert.throws(
      () => core.register({ name: "items" }, Null),
      /requires options.id/,
    );
    core.register({ name: "items", id: "a", registrant: "v1" }, Null);
    assert.throws(
      () => core.register({ name: "items", id: "a", registrant: "v2" }, Null),
      /already has an entry with id "a"/,
    );
  });

  it("chain seats require a selector", () => {
    const core = new SlotCore();
    core.register({ name: "root", children: { route: { kind: "chain" } } }, Null);
    assert.throws(
      () => core.register({ name: "route", registrant: "lost" }, Null),
      /requires options.select/,
    );
  });

  it("disposers are idempotent", () => {
    const core = new SlotCore();
    core.register({ name: "root", children: { once: { kind: "single" } } }, Null);
    const dispose = core.register({ name: "once", registrant: "x" }, Null);
    dispose();
    dispose();
    assert.equal(core.entriesOfSlot("once").length, 0);
  });
});

describe("ledger order", () => {
  it("sorts single seats by ascending priority", () => {
    const core = new SlotCore();
    core.register({ name: "root", children: { s: { kind: "single" } } }, Null);
    core.register({ name: "s", priority: 3, registrant: "c" }, Null);
    core.register({ name: "s", priority: 1, registrant: "a" }, Null);
    core.register({ name: "s", priority: 2, registrant: "b" }, Null);
    assert.deepEqual(
      core.entriesOfSlot("s").map((v) => v.registrant),
      ["a", "b", "c"],
    );
  });

  it("sorts list seats by priority, then explicit order", () => {
    const core = new SlotCore();
    core.register({ name: "root", children: { items: { kind: "list" } } }, Null);
    core.register({ name: "items", id: "a", order: 2, registrant: "a" }, Null);
    core.register({ name: "items", id: "b", order: 1, registrant: "b" }, Null);
    core.register({ name: "items", id: "c", priority: -1, order: 9, registrant: "c" }, Null);
    core.register({ name: "items", id: "d", registrant: "d" }, Null);
    assert.deepEqual(
      core.entriesOfSlot("items").map((v) => v.key),
      ["c", "d", "b", "a"],
    );
  });

  it("sorts bare list entries (no priority, no order) stably", () => {
    const core = new SlotCore();
    core.register({ name: "root", children: { bare: { kind: "list" } } }, Null);
    core.register({ name: "bare", id: "n1" }, Null);
    core.register({ name: "bare", id: "n2" }, Null);
    core.register({ name: "bare", id: "o1", order: 5 }, Null);
    core.register({ name: "bare", id: "o0", order: -1 }, Null);
    assert.deepEqual(
      core.entriesOfSlot("bare").map((v) => v.key),
      ["o0", "n1", "n2", "o1"],
    );
  });

  it("keyed entries keep every cell in priority order", () => {
    const core = new SlotCore();
    core.register({ name: "root", children: { cells: { kind: "keyed" } } }, Null);
    core.register({ name: "cells", key: "k1", registrant: "v1" }, Null);
    core.register({ name: "cells", key: "k2", registrant: "w1" }, Null);
    core.register({ name: "cells", key: "k1", priority: 1, registrant: "v2" }, Null);
    assert.deepEqual(
      core.entriesOfSlot("cells").map((v) => `${v.key}:${v.registrant}`),
      ["k1:v1", "k2:w1", "k1:v2"],
    );
  });

  it("returns a stable snapshot until the next mutation", () => {
    const core = new SlotCore();
    core.register({ name: "root", children: { s: { kind: "single" } } }, Null);
    core.register({ name: "s", registrant: "a" }, Null);
    const first = core.entriesOfSlot("s");
    assert.equal(core.entriesOfSlot("s"), first);
    core.register({ name: "s", priority: 1, registrant: "b" }, Null);
    assert.notEqual(core.entriesOfSlot("s"), first);
  });

  it("unknown seats project as a shared empty view", () => {
    const core = new SlotCore();
    assert.deepEqual([...core.entriesOfSlot("nope")], []);
    assert.equal(core.entriesOfSlot("nope"), core.entriesOfSlot("nope"));
  });

  it("builds view keys from key, id, then ledger index", () => {
    const core = new SlotCore();
    core.register(
      {
        name: "root",
        children: {
          keyed: { kind: "keyed" },
          listed: { kind: "list" },
          single: { kind: "single" },
        },
      },
      Null,
    );
    core.register({ name: "keyed", key: "kk", label: "L", registrant: "r" }, Null);
    core.register({ name: "listed", id: "ii", order: 4, registrant: "r" }, Null);
    core.register({ name: "single", registrant: "r" }, Null);
    const [k] = [...core.entriesOfSlot("keyed")];
    const [l] = [...core.entriesOfSlot("listed")];
    const [s] = [...core.entriesOfSlot("single")];
    assert.equal(k!.key, "kk");
    assert.equal(k!.label, "L");
    assert.equal(l!.key, "ii");
    assert.equal(l!.id, "ii");
    assert.equal(l!.order, 4);
    assert.equal(s!.key, "#0");
    assert.equal(s!.order, 0);
    assert.equal(s!.priority, 0);
  });
});

describe("resolveChain", () => {
  function chained(): SlotCore {
    const core = new SlotCore();
    core.register({ name: "root", children: { route: { kind: "chain" } } }, Null);
    core.register(
      { name: "route", id: "decline-null", registrant: "n", select: () => null },
      Null,
    );
    core.register(
      {
        name: "route",
        id: "decline-undef",
        registrant: "u",
        select: () => undefined as unknown as null,
      },
      Null,
    );
    core.register(
      {
        name: "route",
        id: "answer",
        registrant: "a",
        select: (owner) => owner,
      },
      Null,
    );
    return core;
  }

  it("elects the first non-null selector in chain order", () => {
    const election = chained().resolveChain("route", { pick: "me" });
    assert.ok(election);
    assert.deepEqual(election.matched, { pick: "me" });
    assert.equal(election.view.registrant, "a");
  });

  it("falls to null when every entry declines", () => {
    const core = new SlotCore();
    core.register({ name: "root", children: { route: { kind: "chain" } } }, Null);
    core.register({ name: "route", registrant: "n", select: () => null }, Null);
    assert.equal(core.resolveChain("route", {}), null);
  });

  it("returns null for unknown, undeclared, and non-chain seats", () => {
    const core = new SlotCore();
    core.register({ name: "root", children: { solo: { kind: "single" } } }, Null);
    assert.equal(core.resolveChain("missing", {}), null);
    core.subscribe("ghost", () => {});
    assert.equal(core.resolveChain("ghost", {}), null);
    assert.equal(core.resolveChain("solo", {}), null);
    assert.equal(core.resolveChain("root", {}), null);
  });

  it("skips abdicated entries", () => {
    const core = chained();
    core.reportEntryError("route", "answer", new Error("x"), { abdicate: true });
    assert.equal(core.resolveChain("route", { pick: "me" }), null);
  });
});

describe("isLive / versionOf / kindOf / isDeclared / declarationEpoch", () => {
  it("tracks liveness across abdication and disposal", () => {
    const core = new SlotCore();
    core.register({ name: "root", children: { s: { kind: "single" } } }, Null);
    const dispose = core.register({ name: "s", registrant: "a" }, Null);
    const [live] = [...core.entriesOfSlot("s")];
    assert.equal(core.isLive(live!), true);
    assert.equal(core.isLive({} as SlotEntryView), false);
    dispose();
    assert.equal(core.isLive(live!), false);
  });

  it("marks abdicated views stale", () => {
    const core = new SlotCore();
    core.register({ name: "root", children: { s: { kind: "single" } } }, Null);
    core.register({ name: "s", registrant: "a" }, Null);
    const [view] = [...core.entriesOfSlot("s")];
    core.reportEntryError("s", undefined, new Error("x"), { abdicate: true });
    assert.equal(core.isLive(view!), false);
  });

  it("answers the seat probes", () => {
    const core = new SlotCore();
    assert.equal(core.versionOf("nope"), 0);
    assert.equal(core.kindOf("nope"), undefined);
    assert.equal(core.isDeclared("nope"), false);
    assert.equal(core.declarationEpoch("nope"), 0);
    core.subscribe("ghost", () => {});
    assert.equal(core.kindOf("ghost"), undefined);
    core.register({ name: "root", children: { s: { kind: "single" } } }, Null);
    assert.equal(core.isDeclared("s"), true);
    assert.equal(core.kindOf("s"), "single");
    assert.equal(core.declarationEpoch("s"), 1);
    assert.ok(core.versionOf("s") >= 1);
  });
});

describe("subscribe batching", () => {
  it("batches same-tick mutations into one notification", async () => {
    const core = new SlotCore();
    let calls = 0;
    core.subscribe("solo", () => {
      calls++;
    });
    core.register({ name: "root", children: { solo: { kind: "single" } } }, Null);
    core.register({ name: "solo", registrant: "a" }, Null);
    core.register({ name: "solo", priority: 1, registrant: "b" }, Null);
    assert.equal(calls, 0);
    await tick();
    assert.equal(calls, 1);
  });

  it("supports unsubscribe", async () => {
    const core = new SlotCore();
    let calls = 0;
    const unsub = core.subscribe("solo", () => {
      calls++;
    });
    unsub();
    core.register({ name: "root", children: { solo: { kind: "single" } } }, Null);
    await tick();
    assert.equal(calls, 0);
  });
});

describe("declaration lifetime", () => {
  it("fires declaration listeners on declare and collapse, never on entries", async () => {
    const core = new SlotCore();
    let calls = 0;
    const unsub = core.subscribeDeclaration("kid", () => {
      calls++;
    });
    const dispose = core.register(
      { name: "root", children: { kid: { kind: "single" } } },
      Null,
    );
    assert.equal(calls, 1);
    assert.equal(core.declarationEpoch("kid"), 1);
    core.register({ name: "kid", registrant: "e" }, Null);
    await tick();
    assert.equal(calls, 1);
    dispose();
    assert.equal(calls, 2);
    assert.equal(core.declarationEpoch("kid"), 2);
    unsub();
    const redeclare = core.register(
      { name: "root", children: { kid: { kind: "single" } } },
      Null,
    );
    assert.equal(calls, 2);
    redeclare();
  });

  it("collapses recursively and frees child keys for redeclaration", () => {
    const core = new SlotCore();
    const disposeParent = core.register(
      { name: "root", children: { p: { kind: "single" } } },
      Null,
    );
    const disposeP = core.register(
      { name: "p", children: { g: { kind: "single" } } },
      Null,
    );
    core.register({ name: "g", registrant: "deep" }, Null);
    assert.equal(core.isDeclared("g"), true);
    disposeParent();
    assert.equal(core.isDeclared("p"), false);
    assert.equal(core.isDeclared("g"), false);
    assert.deepEqual([...core.entriesOfSlot("g")], []);
    // The child's stale disposer is a no-op now (entry already cleared).
    disposeP();
    assert.deepEqual([...core.entriesOfSlot("g")], []);
  });
});

describe("reportEntryError / onEntryError", () => {
  function solo(): SlotCore {
    const core = new SlotCore();
    core.register({ name: "root", children: { s: { kind: "single" } } }, Null);
    core.register({ name: "s", registrant: "a" }, Null);
    return core;
  }

  it("drops reports naming no live entry", () => {
    const core = solo();
    const seen: unknown[] = [];
    core.onEntryError((key) => {
      seen.push(key);
    });
    core.reportEntryError("missing-seat", undefined, new Error("x"), { abdicate: true });
    core.reportEntryError("missing-seat", "id", new Error("x"), { abdicate: false });
    core.reportEntryError("s", "unknown-id", new Error("x"), { abdicate: false });
    assert.deepEqual(seen, []);
  });

  it("reports the first entry for single seats with no id", () => {
    const core = solo();
    const seen: Array<{ key: string; abdicated: boolean }> = [];
    const unsub = core.onEntryError((key, _entry, _error, info) => {
      seen.push({ key, abdicated: info.abdicated });
    });
    core.reportEntryError("s", undefined, new Error("x"), { abdicate: false });
    assert.deepEqual(seen, [{ key: "s", abdicated: false }]);
    assert.equal(core.entriesOfSlot("s").length, 1);
    unsub();
    core.reportEntryError("s", undefined, new Error("y"), { abdicate: false });
    assert.equal(seen.length, 1);
  });

  it("abdicating retires the entry but keeps the ledger row", () => {
    const core = new SlotCore();
    core.register({ name: "root", children: { cells: { kind: "keyed" } } }, Null);
    const disposeV1 = core.register({ name: "cells", key: "k", registrant: "v1" }, Null);
    core.register({ name: "cells", key: "k", priority: 1, registrant: "v2" }, Null);
    const before = core.entriesOfSlot("cells");
    assert.equal(before.length, 2);
    let calls = 0;
    core.onEntryError(() => {
      calls++;
    });
    core.reportEntryError("cells", "k", new Error("x"), { abdicate: true });
    assert.equal(calls, 1);
    assert.deepEqual(
      core.entriesOfSlot("cells").map((v) => v.registrant),
      ["v2"],
    );
    // A repeat abdicating report no-ops entirely.
    core.reportEntryError("cells", "k", new Error("x"), { abdicate: true });
    assert.equal(calls, 1);
    // Disposal authority stays with the registrant.
    disposeV1();
    assert.deepEqual(
      core.entriesOfSlot("cells").map((v) => v.registrant),
      ["v2"],
    );
  });
});

describe("describe", () => {
  it("projects the declaration tree with occupant rows", () => {
    const core = new SlotCore();
    const disposeRoot = core.register(
      {
        name: "root",
        children: {
          a: { kind: "single" },
          b: { kind: "list" },
          c: { kind: "keyed" },
        },
        registrant: "test",
      },
      Null,
    );
    core.register({ name: "a", priority: 2, registrant: "ra" }, Null);
    core.register({ name: "b", id: "x", order: 3, registrant: "rb" }, Null);
    core.register({ name: "b", id: "y" }, Null);
    core.register({ name: "c", key: "k", priority: 1 }, Null);
    const tree = core.describe();
    assert.equal(tree.name, "root");
    assert.equal(tree.kind, "single");
    assert.equal(tree.declaredBy, "(built-in)");
    const byName = new Map(tree.children.map((n) => [n.name, n]));
    const a = byName.get("a")!;
    assert.equal(a.kind, "single");
    assert.deepEqual(a.occupants, [{ priority: 2, registrant: "ra" }]);
    const b = byName.get("b")!;
    assert.deepEqual(b.occupants, [
      { id: "y", priority: 0 },
      { id: "x", order: 3, priority: 0, registrant: "rb" },
    ]);
    const c = byName.get("c")!;
    assert.deepEqual(c.occupants, [{ key: "k", priority: 1 }]);
    disposeRoot();
    const fallen = core.describe();
    assert.equal(fallen.children.length, 0);
  });

  it("marks collapsed seats", () => {
    const core = new SlotCore();
    const disposeRoot = core.register(
      { name: "root", children: { kid: { kind: "single" } }, registrant: "t" },
      Null,
    );
    core.register({ name: "kid", registrant: "e" }, Null);
    disposeRoot();
    // Reach the collapsed record through a fresh declarer elsewhere is
    // impossible (redeclaration revives it), so collapse via a nested
    // entry and read the parent's child list before revival.
    const core2 = new SlotCore();
    const dParent = core2.register(
      { name: "root", children: { p: { kind: "single" } } },
      Null,
    );
    core2.register({ name: "p", children: { g: { kind: "single" } } }, Null);
    const tree = core2.describe();
    const p = tree.children.find((n) => n.name === "p")!;
    assert.equal(p.children.length, 1);
    assert.equal(p.children[0]!.kind, "single");
    dParent();
    const fallen = core2.describe();
    assert.equal(fallen.children.length, 0);
  });
});

describe("injectSlot", () => {
  it("waits for the declaration, then installs the effect", () => {
    const core = new SlotCore();
    let runs = 0;
    const downs: string[] = [];
    const stop = injectSlot(core, "inj", () => {
      runs++;
      return () => {
        downs.push("down");
      };
    });
    assert.equal(runs, 0);
    const disposeDecl = core.register(
      { name: "root", children: { inj: { kind: "single" } } },
      Null,
    );
    assert.equal(runs, 1);
    stop();
    assert.deepEqual(downs, ["down"]);
    disposeDecl();
  });

  it("runs at once when the seat already exists; collapse tears down, redeclare reruns", () => {
    const core = new SlotCore();
    const decl1 = core.register(
      { name: "root", children: { r: { kind: "single" } } },
      Null,
    );
    const order: string[] = [];
    let runs = 0;
    const stop = injectSlot(core, "r", () => {
      runs++;
      return [
        () => {
          order.push("first");
        },
        () => {
          order.push("second");
        },
      ];
    });
    assert.equal(runs, 1);
    decl1();
    assert.deepEqual(order, ["second", "first"]);
    assert.equal(runs, 1);
    const decl2 = core.register(
      { name: "root", children: { r: { kind: "single" } } },
      Null,
    );
    assert.equal(runs, 2);
    stop();
    assert.deepEqual(order, ["second", "first", "second", "first"]);
    decl2();
  });

  it("master-dispose cancels a pending wait and is idempotent", async () => {
    const core = new SlotCore();
    let runs = 0;
    const stop = injectSlot(core, "late", () => {
      runs++;
      return () => {};
    });
    stop();
    stop();
    core.register({ name: "root", children: { late: { kind: "single" } } }, Null);
    await tick();
    assert.equal(runs, 0);
  });

  it("a setup failure retires the injection permanently and propagates", () => {
    const core = new SlotCore();
    core.register({ name: "root", children: { bad: { kind: "single" } } }, Null);
    assert.throws(
      () =>
        injectSlot(core, "bad", () => {
          throw new Error("setup");
        }),
      /setup/,
    );
  });

  it("a delayed setup failure propagates to the declaring caller", () => {
    const core = new SlotCore();
    const decl = core.register(
      { name: "root", children: { flaky: { kind: "single" } } },
      Null,
    );
    let calls = 0;
    const stop = injectSlot(core, "flaky", () => {
      calls++;
      if (calls > 1) throw new Error("late");
      return () => {};
    });
    assert.equal(calls, 1);
    decl();
    assert.equal(calls, 1);
    assert.throws(
      () =>
        core.register({ name: "root", children: { flaky: { kind: "single" } } }, Null),
      /late/,
    );
    stop();
  });

  it("a mid-iteration setup failure rolls earlier yields back in reverse", () => {
    const core = new SlotCore();
    core.register({ name: "root", children: { rb: { kind: "single" } } }, Null);
    const order: string[] = [];
    function* effects(): Generator<() => void> {
      yield () => {
        order.push("d1");
      };
      yield () => {
        order.push("d2");
      };
      throw new Error("mid-setup");
    }
    assert.throws(() => injectSlot(core, "rb", () => effects()), /mid-setup/);
    assert.deepEqual(order, ["d2", "d1"]);
  });

  it("tolerates a yielding iterable with a hole (defensive optional call)", () => {
    const core = new SlotCore();
    core.register({ name: "root", children: { lax: { kind: "single" } } }, Null);
    const order: string[] = [];
    function* lax(): Generator<(() => void) | undefined> {
      yield () => {
        order.push("ok");
      };
      yield undefined;
    }
    // The iterable contract says functions; runtime JS may hand a hole —
    // the teardown's optional call skips it instead of crashing.
    const stop = injectSlot(core, "lax", () => lax() as unknown as Iterable<() => void>);
    stop();
    assert.deepEqual(order, ["ok"]);
  });
});
