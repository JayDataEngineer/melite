// host-apply.spec.ts — the package's HOST half (src/index.ts): the
// bundle-row mount boots configless and logs its one line. The empty
// invariant companion was deleted 2026-10-18 (the conformance sweep's
// F20: an installer asserting nothing is invalid — the omission reason
// lives in README.md). Fakes-not-mocks: a recording logger, deep-equal
// on the recorded call.
import { describe, expect, test } from "vitest";
import { apply, inject, name } from "../src/index.ts";

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

