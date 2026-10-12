// bundle-gate.spec.ts — THE GUTTED-LANE WALL (2026-10-05: dsh-melite-test
// booted with every @melite* bundle skipped — "cannot resolve profile
// bundle" — and still served :3088 with no melite tools, no /v1 doors,
// warning-only).
//
// The wall pins the estate's lane-side refusal (packages/web/melite-estate/
// src/bundle-gate.ts): a loader tree without the tool surface's bundle
// rows refuses the boot loud (default), or marks itself degraded on the
// explicit opt-out. Eighteen arms, all proven here (header corrected
// 2026-10-26 — "four" named only the core seats while the file judged
// eighteen; the count below is the live census): whole-tree pass (silent),
// broken-tree refusal (the incident replay), degraded-by-config, and
// degraded-by-env — plus the direct-mount skip (no loader, no tree to
// judge) and every defensive probe branch. The apply-ordering half
// (gate first, zero rows attempted) lives with the fake in
// packages/web/melite-estate/tests/estate.spec.ts.
//
// Run: npx vitest run tests/walls/ts/suites/bundle-gate.spec.ts
// (or the whole gate: pnpm run test)

import { afterEach, beforeEach, describe, it, vi } from "vitest";
import assert from "node:assert/strict";
import {
  GUTTED_LANE_ENV,
  LANE_HEALTH_SERVICE,
  checkBundleGate,
  findMissingBundles,
  resolveAllowGuttedLane,
} from "../../../../packages/web/melite-estate/src/bundle-gate.ts";

const TOOLS = "@melite/harness-tools";
const DOORS = "@melite/harness-tools/doors";

// The incident replay: a loader tree where every @melite* bundle
// skipped — only DSH-owned rows composed, yet the lane served.
const GUTTED_ENTRIES = [
  { options: { name: "@deepseek-ai/dsh-base" } },
  { options: { name: "@deepseek-ai/dsh-web-app" } },
];

function loaderWith(names: readonly string[]): { loader: { entries(): Array<{ options: { name: string } }> } } {
  return { loader: { entries: () => names.map((name) => ({ options: { name } })) } };
}

// Ambient-env law (dsh-ci-test-reliability): a shell carrying the
// opt-out would flip every refusal arm to degraded, so the wall owns
// the variable — stashed once, cleared per case, restored after.
let envBefore: string | undefined;
beforeEach(() => {
  envBefore = process.env[GUTTED_LANE_ENV];
  delete process.env[GUTTED_LANE_ENV];
});
afterEach(() => {
  if (envBefore === undefined) delete process.env[GUTTED_LANE_ENV];
  else process.env[GUTTED_LANE_ENV] = envBefore;
  vi.restoreAllMocks();
});

describe("findMissingBundles — presence, never fiber phase", () => {
  it("a whole lane misses nothing (both tools rows present)", () => {
    assert.deepEqual(findMissingBundles([TOOLS, DOORS]), []);
  });

  it("either tools row proves the bundle (server profiles disable the doors row by id; headless lanes never mount it)", () => {
    assert.deepEqual(findMissingBundles([TOOLS]), []);
    assert.deepEqual(findMissingBundles([DOORS]), []);
  });

  it("the incident tree misses the tool surface", () => {
    assert.deepEqual(
      findMissingBundles(GUTTED_ENTRIES.map((entry) => entry.options.name)),
      [TOOLS],
    );
  });

  it("an empty tree misses the tool surface", () => {
    assert.deepEqual(findMissingBundles([]), [TOOLS]);
  });
});

describe("resolveAllowGuttedLane — the config owns the switch (the env plane is dead)", () => {
  it("the dead env plane writes nothing: a set variable cannot flip a refusing config", () => {
    process.env[GUTTED_LANE_ENV] = "1";
    try {
      assert.equal(resolveAllowGuttedLane({ allowGuttedLane: false }), false);
    } finally {
      delete process.env[GUTTED_LANE_ENV];
    }
  });

  it("serves degraded on the config opt-out alone", () => {
    assert.equal(resolveAllowGuttedLane({ allowGuttedLane: true }), true);
  });

  it("refuses by default (no env, no config)", () => {
    assert.equal(resolveAllowGuttedLane(), false);
    assert.equal(resolveAllowGuttedLane({}), false);
    assert.equal(resolveAllowGuttedLane({ allowGuttedLane: false }), false);
  });

  it("no env spelling reaches the switch (the config field is the only door)", () => {
    process.env[GUTTED_LANE_ENV] = "1";
    try {
      assert.equal(resolveAllowGuttedLane(), false);
    } finally {
      delete process.env[GUTTED_LANE_ENV];
    }
  });
});

describe("checkBundleGate — the whole tree passes silent", () => {
  it("resolves checked with no missing and logs nothing", () => {
    const lines: string[] = [];
    vi.spyOn(console, "log").mockImplementation((...args: unknown[]) => {
      lines.push(args.map((item) => String(item)).join(" "));
    });
    const outcome = checkBundleGate(loaderWith([TOOLS, "@deepseek-ai/dsh-web-app"]));
    assert.deepEqual(outcome, { checked: true, missing: [], degraded: false });
    assert.deepEqual(lines, []);
  });

  it("non-string and absent entry names never satisfy the gate", () => {
    const ctx = {
      loader: {
        entries: () => [{ options: { name: 7 } }, null, {}, { options: { name: TOOLS } }],
      },
    };
    assert.deepEqual(checkBundleGate(ctx).missing, []);
  });

  it("reads the loader through the get seat when the lane provides it there", () => {
    const stub = { entries: () => [{ options: { name: TOOLS } }] };
    const ctx = { get: (name: string): unknown => (name === "loader" ? stub : undefined) };
    assert.deepEqual(checkBundleGate(ctx), { checked: true, missing: [], degraded: false });
  });
});

describe("checkBundleGate — the broken tree refuses loud (the incident replay)", () => {
  it("throws naming the missing bundle, the cause, and the explicit way out", () => {
    assert.throws(
      () => checkBundleGate({ loader: { entries: () => GUTTED_ENTRIES } }),
      (error: unknown) => {
        assert.ok(error instanceof Error);
        assert.match(error.message, /gutted lane/);
        assert.match(error.message, /@melite\/harness-tools/);
        assert.match(error.message, /cannot resolve profile bundle/);
        assert.match(error.message, new RegExp(GUTTED_LANE_ENV));
        return true;
      },
    );
  });
});

describe("checkBundleGate — the degraded-path arm", () => {
  it("serves degraded on the config opt-out and marks the lane machine-readable", () => {
    const provided: Array<{ name: string; value: unknown }> = [];
    const lines: string[] = [];
    vi.spyOn(console, "log").mockImplementation((...args: unknown[]) => {
      lines.push(args.map((item) => String(item)).join(" "));
    });
    const ctx = {
      loader: { entries: () => GUTTED_ENTRIES },
      provide: (name: string, value: unknown): void => {
        provided.push({ name, value });
      },
    };
    const outcome = checkBundleGate(ctx, { allowGuttedLane: true });
    assert.deepEqual(outcome.missing, [TOOLS]);
    assert.equal(outcome.degraded, true);
    assert.equal(outcome.checked, true);
    assert.match(lines.join("\n"), /DEGRADED lane/);
    assert.match(lines.join("\n"), /@melite\/harness-tools/);
    assert.equal(provided.length, 1);
    assert.equal(provided[0]?.name, LANE_HEALTH_SERVICE);
    const health = provided[0]?.value as { degraded: boolean; missing: readonly string[]; checkedAt: string };
    assert.equal(health.degraded, true);
    assert.deepEqual(health.missing, [TOOLS]);
    assert.ok(typeof health.checkedAt === "string" && health.checkedAt.length > 0);
  });

  it("the env plane is dead: a set variable without the config field REFUSES loud", () => {
    process.env[GUTTED_LANE_ENV] = "1";
    try {
      assert.throws(
        () => checkBundleGate({ loader: { entries: () => GUTTED_ENTRIES } }),
        /allowGuttedLane/,
      );
    } finally {
      delete process.env[GUTTED_LANE_ENV];
    }
  });

  it("marks nothing when the ctx carries no provide, but still serves degraded", () => {
    const outcome = checkBundleGate(
      { loader: { entries: () => GUTTED_ENTRIES }, provide: 42 },
      { allowGuttedLane: true },
    );
    assert.deepEqual(outcome, { checked: true, missing: [TOOLS], degraded: true });
  });
});

describe("checkBundleGate — no loader, no tree to judge", () => {
  it("skips loud on a bare ctx (direct-mount rigs carry no bundle tree)", () => {
    const lines: string[] = [];
    vi.spyOn(console, "log").mockImplementation((...args: unknown[]) => {
      lines.push(args.map((item) => String(item)).join(" "));
    });
    assert.deepEqual(checkBundleGate({}), { checked: false, missing: [], degraded: false });
    assert.match(lines.join("\n"), /no loader visible/);
  });

  it("skips when the seat probe answers absent", () => {
    assert.deepEqual(checkBundleGate({ get: (_name: string) => undefined }), {
      checked: false,
      missing: [],
      degraded: false,
    });
  });

  it("a throwing probe reads as absent — the gate never breaks a boot its own diagnosis cannot read", () => {
    const throwingGet = {
      get: (_name: string): unknown => {
        throw new Error("topology without a service store");
      },
    };
    assert.deepEqual(checkBundleGate(throwingGet).checked, false);
    const throwingEntries = { loader: { entries: (): unknown => { throw new Error("loader torn down"); } } };
    assert.deepEqual(checkBundleGate(throwingEntries).checked, false);
    const notAList = { loader: { entries: () => 42 } };
    assert.deepEqual(checkBundleGate(notAList).checked, false);
    const throwingProperty = { get: (_name: string): unknown => undefined };
    Object.defineProperty(throwingProperty, "loader", {
      get: (): unknown => { throw new Error("topology-sensitive proxy"); },
    });
    assert.deepEqual(checkBundleGate(throwingProperty).checked, false);
  });
});
