// host-apply.spec.ts — the package's HOST half (src/index.ts) and its
// invariant companion (src/invariant.ts): the bundle-row mount boots
// configless and logs its one line; the invariant companion asserts
// nothing and throws nothing. Fakes-not-mocks: a recording logger,
// deep-equal on the recorded call.
import { describe, expect, test } from "vitest";
import { apply, inject, name } from "../src/index.ts";
import { apply as applyInvariant } from "../src/invariant.ts";

describe("host half — the bundle-row mount", () => {
  test("identity: name + empty inject (configless boot)", () => {
    expect(name).toBe("melite-card-view");
    expect(inject).toEqual([]);
  });

  test("apply logs the mount line and throws nothing", () => {
    const recorded: unknown[][] = [];
    const ctx = { logger: { info: (...args: unknown[]): void => { recorded.push(args); } } };
    apply(ctx as never);
    expect(recorded).toEqual([[
      "melite-card-view: browser bundle row mounted (the card surfaces ride the estate remotes over /api; no host routes)",
    ]]);
  });
});

describe("invariant companion — nothing to check at runtime", () => {
  test("apply returns undefined and throws nothing", () => {
    expect(applyInvariant()).toBeUndefined();
  });
});
