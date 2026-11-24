// @contract models-h3-image-canvas-law
// h3-image-canvas-law.spec.ts — THE h3-image CANVAS-LAW WALL (the
// promgen handoff A4, 2026-11-17: the consumer lane rendered 832×1216
// seven times — a 1024-native family's stated canvas riding a model
// flip — while every family-scoped surface the agent reads was silent
// or missing the law). The wall pins the law's TWO seats: the t2i
// skill's canvas-law section (the agent's pre-compose reading path)
// and the DECL's own lane row (description + the 2K drafting default
// the compose door fills when no canvas is stated). The law must name
// the model's native-4K envelope, the drafting default, AND the
// inheritance hazard — a law that omits the hazard teaches the exact
// burn it survived. (2026-11-24 canvas truth cure: the old wall pinned
// a 2048-class working band the model never had; the checkpoint is
// native 4K, and the operator's own recommended pairs are the law.)
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
    // the model's own envelope, in its published units
    expect(skill).toMatch(/native-4K model \(~16 MP\)/);
    expect(skill).toMatch(/2K\s*drafting floor/);
    expect(skill).toMatch(/area 655,360–20,000,000\s*px/);
    expect(skill).toMatch(/aspect 1:3–3:1/);
    // the model's recommended pairs, the 4K set above the 2K default
    expect(skill).toMatch(/4096×4096/);
    expect(skill).toMatch(/7104×2368/);
    // the drafting default the compose door fills
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

  it("the DECL lane row carries the same law — the native-4K envelope and the 2K drafting default", () => {
    const desc = flat(String(DECL.description ?? ""));
    expect(desc).toMatch(/native 4K \(~16 MP\)/);
    expect(desc).toMatch(/655,360–20,000,000 px/);
    expect(desc).toMatch(/aspect 1:3–3:1/);
    expect(desc).toMatch(/4096x4096/);
    const defaults = DECL.defaults as Record<string, unknown> | undefined;
    expect(defaults?.width).toBe(2048);
    expect(defaults?.height).toBe(2048);
  });
});
