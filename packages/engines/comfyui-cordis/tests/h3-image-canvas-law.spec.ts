// @contract models-h3-image-canvas-law
// h3-image-canvas-law.spec.ts — THE h3-image CANVAS-LAW WALL (the
// promgen handoff A4, 2026-11-17: the consumer lane rendered 832×1216
// seven times — a 1024-native family's stated canvas riding a model
// flip — while every family-scoped surface the agent reads was silent
// or missing the law). The wall pins the law's TWO seats: the t2i
// skill's canvas-law section (the agent's pre-compose reading path)
// and the DECL's own lane row (description + the 2048×2048 default
// the compose door fills when no canvas is stated). The law must name
// the working band, the family default, AND the inheritance hazard —
// a law that omits the hazard teaches the exact burn it survived.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { DECL } from "@melite/models-h3-image";

const FAMILY_DIR = join(import.meta.dirname, "..", "models", "image", "h3-image");
const T2I_SKILL = join(FAMILY_DIR, "agents", "skills", "h3-prompt-writing-t2i.md");

/** Prose flattened: every run of whitespace to one space — the wall
 *  matches taught PHRASES, never the column the editor wrapped at. */
const flat = (t: string): string => t.replace(/\s+/g, " ");
const skill = flat(readFileSync(T2I_SKILL, "utf8"));

describe("the h3-image canvas law (promgen A4 — 832×1216 rode a model flip seven times)", () => {
  it("the t2i skill carries the canvas law: the working band, the family default, the low-canvas verdict", () => {
    // the band, in the node's own terms
    expect(skill).toMatch(/2048-class working area/);
    expect(skill).toMatch(/~2048×2048 pixels, 32-multiple canvas/);
    // the family default the compose door fills
    expect(skill).toMatch(/width: 2048, height: 2048/);
    // the low-canvas verdict — the operator's own ruling voiced
    expect(skill).toMatch(/doesn't work well in low resolution/);
    expect(skill).toMatch(/it renders worse/);
  });

  it("the skill names the inheritance hazard — a previous family's canvas riding a model flip", () => {
    // the burn's exact shape: stated params survive the flip
    expect(skill).toMatch(/bench keeps\s*stated params across a model flip/);
    expect(skill).toMatch(/832×1216/);
    expect(skill).toMatch(/Restate\s*width\/height when switching onto this family/);
  });

  it("the DECL lane row carries the same law — the description's area law and the 2048² default", () => {
    const desc = flat(String(DECL.description ?? ""));
    expect(desc).toMatch(/~2048x2048 pixels of working area/);
    expect(desc).toMatch(/composes low-resolution work poorly/);
    const defaults = DECL.defaults as Record<string, unknown> | undefined;
    expect(defaults?.width).toBe(2048);
    expect(defaults?.height).toBe(2048);
  });
});
