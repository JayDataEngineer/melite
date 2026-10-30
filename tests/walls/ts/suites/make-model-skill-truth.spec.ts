// make-model-skill-truth.spec.ts — THE SKILL-DOC TRUTH WALL (F4,
// nativity audit 2026-11-05). The make-model skill is a mandated
// teaching doc: when it describes a build face the tree retired,
// every agent that follows it re-authors the retired mechanism (the
// audit found it teaching the dead FAMILY_PLUGINS static-import
// barrel + a @melite/comfyui-cordis model-contract import, while
// the live tree loads families through the FAMILY_PKGS string table
// and dynamic import with card-kit contract deps). The wall judges
// the skill against the LIVE tree: what the skill names must exist
// and work, and what it teaches must not be the retired spelling.
import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..", "..", "..", "..");
const SKILL = join(ROOT, ".agents", "skills", "make-model", "SKILL.md");
const FAMILY_TABLE = join(ROOT, "packages/engines/comfyui-cordis/src/models/families/index.ts");

describe("the make-model skill teaches the live tree (F4)", () => {
  const skill = readFileSync(SKILL, "utf8");
  const table = readFileSync(FAMILY_TABLE, "utf8");

  it("Face 1 is the FAMILY_PKGS string table with dynamic import — and the retired barrel spelling is gone", () => {
    // the live mechanism, named
    expect(skill).toContain("FAMILY_PKGS");
    expect(skill).toMatch(/dynamic\s+`?import/u,
      "the skill must teach the dynamic-import load (the cycle cure), not a static barrel");
    // the retired mechanism, absent — a comment may not even name
    // FAMILY_PLUGINS as the thing to edit (code lines only is the
    // closure-gate idiom; here the DOC is the artifact, so the
    // retired NAME must not appear at all)
    expect(skill).not.toContain("FAMILY_PLUGINS");
    expect(skill, "the static barrel import is the retired Face 1 — the string table replaced it").not.toMatch(/import \{ family as/u);
    // and the teaching target is REAL (the wall rides the live door)
    expect(table).toMatch(/export const FAMILY_PKGS: readonly string\[\]/u);
    expect(table).toMatch(/await import\(pkg\)/u,
      "families/index.ts must load through dynamic import — the skill's claim must stay true");
    expect(table).not.toMatch(/FAMILY_PLUGINS/u);
  });

  it("the deps teaching names the kit contract — and every family manifest agrees", () => {
    expect(skill).toContain("@melite/comfyui-card-kit/model-contract");
    expect(skill).not.toContain("@melite/comfyui-cordis/model-contract");
    // derived census: the live families MUST match what the skill
    // teaches — the kit dep present, the engine dep absent (the
    // family→engine edge is the cycle the string table cured)
    const modelsDir = join(ROOT, "packages", "models");
    const offenders: string[] = [];
    for (const fam of readdirSync(modelsDir)) {
      let pkg: { dependencies?: Record<string, string> };
      try {
        pkg = JSON.parse(readFileSync(join(modelsDir, fam, "package.json"), "utf8")) as typeof pkg;
      } catch { continue; } // non-package dir
      const deps = pkg.dependencies ?? {};
      if (!("@melite/comfyui-card-kit" in deps)) offenders.push(`${fam}: no @melite/comfyui-card-kit dep`);
      if ("@melite/comfyui-cordis" in deps) offenders.push(`${fam}: depends on @melite/comfyui-cordis (the retired edge)`);
    }
    expect(offenders,
      "the families' manifests and the skill's deps teaching disagree — fix the tree or the skill, never let them drift")
      .toEqual([]);
  });
});
