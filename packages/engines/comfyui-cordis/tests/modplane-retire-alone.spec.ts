// modplane-retire-alone.spec.ts — the flavor rows of a pruned family
// retire ALONE (the plugin law's mod-plane half, 2026-11-17): a
// packaged flavor module ships INSIDE its family package, and when
// that package is absent the flavor is skipped with a named warn.
// The SKIP half is judged on the real door by the L2 wall's krea-2
// arm (child process + resolve hook — vitest cannot synthesize a
// coded ERR_MODULE_NOT_FOUND: mock-factory errors are wrapped in
// vitest's own text, which the catch correctly treats as non-absence
// and rethrows); THIS spec owns the loud half the same catch owns —
// a flavor failing for any reason OTHER than absence refuses the
// whole compose (an absence is lawful; a broken module is not).
import { describe, it, expect, vi } from "vitest";

// a BROKEN flavor: the wrapped mock error carries no absence code —
// the retire-alone catch must rethrow it, never skip it
vi.mock("@melite/models-krea-2/mods/mask", async () => {
  throw new Error("a flavor module that is broken, not absent");
});

import { composeModPlane } from "../src/cardDefs.ts";

describe("composeModPlane's retire-alone catch rethrows non-absence failures", () => {
  it("a flavor failing without the absence code refuses the whole plane loud", async () => {
    const { Context } = await import("@deepseek-ai/cordis");
    const ctx = new Context();
    const warns: string[] = [];
    const realWarn = console.warn;
    console.warn = (...args: unknown[]) => { warns.push(args.join(" ")); };
    try {
      await expect(composeModPlane(ctx as never)).rejects.toThrow(/broken, not absent|error when mocking a module/);
    } finally {
      console.warn = realWarn;
    }
    expect(
      warns.some((w) => w.includes("packaged flavor absent")),
      "a broken flavor is never announced as absent",
    ).toBe(false);
  });
});
