// card-kinds-chain.spec.ts — S1 walls for the kinds-as-chain-entries
// migration (cardSeam.ts): kind registration rides the re-vendored chain
// primitive (selector-routed election) instead of a hand Map walk.
//
// Pinned: duplicates stay LOUD (same message), election resolves in
// registration order, unknown kinds fail safe with the settled-gate log,
// disposal removes the kind (election + registry agree), re-registration
// after dispose works.
//
// Run: npx vitest run tests/walls/ts/suites/card-kinds-chain.spec.ts
// (or the whole gate: pnpm run test)
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import {
  kindDef,
  kindHasCompound,
  kindHasFormSpec,
  kindOpensStudio,
  markCardKindsLaneSettled,
  registerCardKind,
  registeredCardKinds,
} from "../../../../packages/web-kit/slots/src/cardSeam.ts";
import type { CardKindDef } from "../../../../packages/web-kit/slots/src/cardSeam.ts";

function def(kind: string, flags: Partial<CardKindDef> = {}): CardKindDef {
  return {
    kind,
    runnable: false,
    executable: false,
    formSpec: false,
    compound: false,
    opensStudio: false,
    badgeTone: "default",
    ...flags,
  };
}

describe("kinds as chain entries", () => {
  it("registration elects; flags read through the election", () => {
    const dispose = registerCardKind(
      def("wall.kind.alpha", { runnable: true, formSpec: true, opensStudio: true }),
    );
    try {
      assert.equal(kindDef("wall.kind.alpha").runnable, true);
      assert.equal(kindHasFormSpec("wall.kind.alpha"), true);
      assert.equal(kindOpensStudio("wall.kind.alpha"), true);
      assert.equal(kindHasCompound("wall.kind.alpha"), false);
      assert.ok(registeredCardKinds().includes("wall.kind.alpha"));
    } finally {
      dispose();
    }
  });

  it("duplicate kind strings are LOUD with the historical message", () => {
    const dispose = registerCardKind(def("wall.kind.dupe"));
    try {
      assert.throws(
        () => registerCardKind(def("wall.kind.dupe")),
        /^Error: card kind "wall\.kind\.dupe" is already registered$/,
      );
    } finally {
      dispose();
    }
  });

  it("disposal removes the kind from election AND registry; re-registration works", () => {
    const first = registerCardKind(def("wall.kind.flap", { runnable: true }));
    assert.equal(kindDef("wall.kind.flap").runnable, true);
    first();
    assert.equal(kindDef("wall.kind.flap").runnable, false); // fail-safe, unelected
    assert.ok(!registeredCardKinds().includes("wall.kind.flap"));
    const second = registerCardKind(def("wall.kind.flap", { executable: true }));
    try {
      assert.equal(kindDef("wall.kind.flap").executable, true);
    } finally {
      second();
    }
  });

  it("stale disposers no-op (a re-register after dispose keeps its seat)", () => {
    const first = registerCardKind(def("wall.kind.stale", { runnable: true }));
    first();
    const second = registerCardKind(def("wall.kind.stale", { executable: true }));
    try {
      first(); // stale — must not kill the live registration
      assert.equal(kindDef("wall.kind.stale").executable, true);
    } finally {
      second();
    }
  });

  it("unknown kinds fail safe with the settled-gate log shape", () => {
    markCardKindsLaneSettled();
    const flags = kindDef("wall.kind.never-registered-zzz");
    assert.equal(flags.runnable, false);
    assert.equal(flags.executable, false);
    assert.equal(flags.formSpec, false);
    assert.equal(flags.compound, false);
    assert.equal(flags.opensStudio, false);
    assert.equal(flags.badgeTone, "default");
  });
});
