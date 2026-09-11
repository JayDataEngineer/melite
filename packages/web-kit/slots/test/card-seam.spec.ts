// card-seam.spec.ts — the card KIND registry: data-driven flags, chain
// election, fail-safe unknowns, and the live-propagation store.
// (NullSeat is a never-mounted ledger placeholder — v8-ignored at the site.)
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import {
  getCardKindsVersion,
  kindDef,
  kindHasCompound,
  kindHasFormSpec,
  kindOpensStudio,
  markCardKindsLaneSettled,
  registeredCardKinds,
  registerCardKind,
  subscribeCardKinds,
} from "../src/cardSeam.ts";
import type { CardKindDef } from "../src/cardSeam.ts";

function def(kind: string, over: Partial<CardKindDef> = {}): CardKindDef {
  return {
    kind,
    runnable: true,
    executable: true,
    formSpec: true,
    compound: false,
    opensStudio: false,
    badgeTone: "default",
    runner: "",
    ...over,
  };
}



describe("registerCardKind", () => {
  it("registers flags retrievable through every selector", () => {
    const dispose = registerCardKind(
      def(" generation-test", {
        kind: "generation-test",
        compound: true,
        opensStudio: true,
        badgeTone: "brand",
        runner: "input",
      }),
    );
    try {
      const got = kindDef("generation-test");
      assert.equal(got.runnable, true);
      assert.equal(got.compound, true);
      assert.equal(got.opensStudio, true);
      assert.equal(got.badgeTone, "brand");
      assert.equal(got.runner, "input");
      assert.equal(kindHasFormSpec("generation-test"), true);
      assert.equal(kindHasCompound("generation-test"), true);
      assert.equal(kindOpensStudio("generation-test"), true);
    } finally {
      dispose();
    }
  });

  it("duplicate kind strings are loud", () => {
    const dispose = registerCardKind(def("dup-kind"));
    try {
      assert.throws(() => registerCardKind(def("dup-kind")), /already registered/);
    } finally {
      dispose();
    }
  });

  it("the disposer removes the kind; a stale disposer no-ops", () => {
    const d = def("gone-kind", { formSpec: true });
    const dispose = registerCardKind(d);
    assert.ok(registeredCardKinds().includes("gone-kind"));
    dispose();
    assert.ok(!registeredCardKinds().includes("gone-kind"));
    assert.equal(kindHasFormSpec("gone-kind"), false);
    dispose();
    // Re-register after dispose works; the stale disposer cannot kill it.
    const dispose2 = registerCardKind(def("gone-kind", { formSpec: false }));
    try {
      dispose();
      assert.ok(registeredCardKinds().includes("gone-kind"));
    } finally {
      dispose2();
    }
  });

  it("lists registered kinds sorted", () => {
    const db = registerCardKind(def("zzz-kind"));
    const da = registerCardKind(def("aaa-kind"));
    try {
      const kinds = registeredCardKinds();
      assert.ok(kinds.indexOf("aaa-kind") < kinds.indexOf("zzz-kind"));
      // The chain election skips aaa's declining selector and elects zzz.
      assert.equal(kindDef("zzz-kind").kind, "zzz-kind");
      assert.equal(kindDef("aaa-kind").kind, "aaa-kind");
    } finally {
      db();
      da();
    }
  });
});

describe("kindDef fail-safe", () => {
  it("unknown kinds render with fail-safe flags (never run, never fetch)", () => {
    const got = kindDef("no-such-kind-ever");
    assert.equal(got.kind, "(unknown)");
    assert.equal(got.runnable, false);
    assert.equal(got.executable, false);
    assert.equal(got.formSpec, false);
    assert.equal(got.compound, false);
    assert.equal(got.opensStudio, false);
    assert.equal(got.badgeTone, "default");
    assert.equal(kindHasFormSpec("no-such-kind-ever"), false);
    assert.equal(kindHasCompound("no-such-kind-ever"), false);
    assert.equal(kindOpensStudio("no-such-kind-ever"), false);
  });

  it("logs loud exactly once after the kinds lane settles", () => {
    const logged: unknown[][] = [];
    const orig = globalThis.console;
    (globalThis as Record<string, unknown>).console = {
      ...orig,
      error: (...args: unknown[]) => {
        logged.push(args);
      },
    };
    try {
      markCardKindsLaneSettled();
      kindDef("warn-once-kind");
      kindDef("warn-once-kind");
      assert.equal(logged.length, 1);
      assert.match(String(logged[0]![0]), /unknown card kind/);
    } finally {
      globalThis.console = orig;
    }
  });

  it("stays silent without a console", () => {
    const orig = globalThis.console;
    (globalThis as Record<string, unknown>).console = undefined;
    try {
      markCardKindsLaneSettled();
      const got = kindDef("console-less-kind");
      assert.equal(got.runnable, false);
    } finally {
      globalThis.console = orig;
    }
  });
});

describe("live propagation", () => {
  it("bumps the version on register/dispose and pings listeners", () => {
    let pings = 0;
    const unsub = subscribeCardKinds(() => {
      pings++;
    });
    try {
      const v0 = getCardKindsVersion();
      const dispose = registerCardKind(def("live-kind"));
      assert.equal(getCardKindsVersion(), v0 + 1);
      assert.equal(pings, 1);
      dispose();
      assert.equal(getCardKindsVersion(), v0 + 2);
      assert.equal(pings, 2);
    } finally {
      unsub();
    }
  });
});
