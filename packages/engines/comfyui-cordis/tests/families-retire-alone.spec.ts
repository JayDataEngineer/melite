// families-retire-alone.spec.ts — the plugin law's load seam, pinned
// IN-POOL (2026-11-17, the card-without-family audit's (b) cure):
// loadFamilies isolates each row — a family package that fails to
// load retires ALONE into the dead roster (vi.mock stands in for the
// pruned install, exactly as the L2 wall's resolve hook does
// out-of-process). The REAL-door journey (child process, real
// resolve hook, real estate) is the composite wall
// tests/walls/ts/suites/card-without-family-journey.spec.ts — this
// spec owns the unit half the coverage pool judges.
import { describe, it, expect, vi } from "vitest";

// The pruned family: every import of the module rejects, exactly as
// an absent package does (the wall's hook throws the same shape).
vi.mock("@melite/models-music3", () => {
  throw Object.assign(
    new Error("Cannot find package '@melite/models-music3' (PRUNED by the retire-alone spec)"),
    { code: "ERR_MODULE_NOT_FOUND" },
  );
});

import { FAMILY_PKGS, FAMILY_ROWS, loadFamilies } from "../src/models/families/index.ts";
import { bootModels, modelsFamiliesProvider } from "../src/models/service.ts";

describe("loadFamilies retires a dead family ALONE (the plugin law's load seam)", () => {
  it("a pruned package retires alone: the survivors mount, the dead row named with its error", async () => {
    const { families, dead } = await loadFamilies();
    expect(families).toHaveLength(FAMILY_ROWS.length - 1);
    expect(dead.map((d) => d.id)).toEqual(["music3"]);
    expect(dead[0]!.pkg).toBe("@melite/models-music3");
    // vitest wraps a throwing mock factory in its own error text —
    // the PRISTINE absence voice ("absent from the install") is the
    // composite wall's judgment on the real door; here the structure
    // is the law: the failure's message is carried, never swallowed.
    expect(dead[0]!.error.length).toBeGreaterThan(0);
  });

  it("the boot arms with the survivors and names the dead family (the private boot's own loop)", async () => {
    const warnings: string[] = [];
    const realWarn = console.warn;
    console.warn = (...args: unknown[]) => { warnings.push(args.join(" ")); };
    try {
      const svc = await bootModels();
      const ids = svc.registryIds();
      expect(ids).not.toContain("music3");
      expect(ids).toContain("yue2");
    } finally {
      console.warn = realWarn;
    }
    const voice = warnings.find((w) => w.includes("'music3' retired alone"));
    expect(voice, `the boot log must name the retired family (got: ${warnings.join(" | ")})`).toBeDefined();
    expect(voice).toContain("@melite/models-music3 absent from the install");
  });

  it("the FAMILIES PROVIDER's own boot isolates the dead family too (the lane-serving door, not just the singleton)", async () => {
    // the provider is what a serving lane mounts (service.ts:1059) —
    // its dead loop, its transactional gate over the SURVIVORS, and
    // its validate threading must all ride the same mock prune
    const { Context } = await import("@deepseek-ai/cordis");
    const warnings: string[] = [];
    const realWarn = console.warn;
    console.warn = (...args: unknown[]) => { warnings.push(args.join(" ")); };
    try {
      const ctx = new Context();
      await ctx.plugin(modelsFamiliesProvider);
      const svc = ctx.get("models") as unknown as { registryIds(): string[] };
      expect(svc.registryIds()).not.toContain("music3");
      expect(svc.registryIds()).toContain("yue2");
    } finally {
      console.warn = realWarn;
    }
    expect(warnings.some((w) => w.includes("'music3' retired alone"))).toBe(true);
  });

  it("the roster is the rows: FAMILY_PKGS is derived, one pkg per row", () => {
    expect(FAMILY_PKGS).toEqual(FAMILY_ROWS.map((r) => r.pkg));
    expect(new Set(FAMILY_PKGS).size).toBe(FAMILY_PKGS.length);
  });
});
