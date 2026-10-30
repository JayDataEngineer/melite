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
import { existsSync, readFileSync, readdirSync } from "node:fs";
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

  it("the extras teaching is capacity, not obligation (M10, 2026-11-13)", () => {
    // The skill used to say every family declares contracts +
    // schemastery; 28 of 32 declare the kit alone. The extra deps
    // are valid ONLY where the family's own source imports them.
    expect(skill).toMatch(/the ONLY required dep/u);
    expect(skill).not.toMatch(/deps: @melite\/comfyui-card-kit[\s\S]{0,120}\+ @melite\/contracts \+\n?\s*#? ?@deepseek-ai\/schemastery — NOT/u);
    const modelsDir = join(ROOT, "packages", "models");
    const liars: string[] = [];
    for (const fam of readdirSync(modelsDir)) {
      const pkgPath = join(modelsDir, fam, "package.json");
      if (!existsSync(pkgPath)) continue;
      const deps = (JSON.parse(readFileSync(pkgPath, "utf8")) as { dependencies?: Record<string, string> })
        .dependencies ?? {};
      const src = readDirSources(join(modelsDir, fam));
      for (const extra of ["@melite/contracts", "@deepseek-ai/schemastery"]) {
        if (!(extra in deps)) continue;
        if (!src.includes(extra)) liars.push(`${fam}: declares ${extra} but its src never imports it`);
      }
    }
    expect(liars, "an extra dependency that the family does not import is dead weight — drop the dep or the teaching")
      .toEqual([]);
    // and at least one family proves the teaching's counter-arm is real
    const kitOnly = readdirSync(modelsDir).filter((fam) => {
      const pkgPath = join(modelsDir, fam, "package.json");
      if (!existsSync(pkgPath)) return false;
      const deps = (JSON.parse(readFileSync(pkgPath, "utf8")) as { dependencies?: Record<string, string> })
        .dependencies ?? {};
      return Object.keys(deps).length === 1 && "@melite/comfyui-card-kit" in deps;
    });
    expect(kitOnly.length, "the skill's '28 of 32' claim needs a real kit-only majority").toBeGreaterThan(20);
  });

  it("Face 1's manifest row exists for every FAMILY_PKGS row (M9, 2026-11-13)", () => {
    expect(skill).toContain('"@melite/models-<family>": "workspace:*"');
    const enginePkg = JSON.parse(
      readFileSync(join(ROOT, "packages/engines/comfyui-cordis/package.json"), "utf8"),
    ) as { dependencies?: Record<string, string> };
    const engineDeps = enginePkg.dependencies ?? {};
    const rows = [...table.matchAll(/"(@melite\/models-[a-z0-9-]+)"/gu)].map((m) => m[1]);
    expect(rows.length, "the string table must carry the family rows").toBeGreaterThan(20);
    expect(rows.filter((r) => r === undefined || !(r in engineDeps)),
      "a FAMILY_PKGS row the engine manifest does not depend on cannot be imported at boot").toEqual([]);
  });

  it("the actions face and the facts row are taught against the live tree (M7/M8, 2026-11-13)", () => {
    for (const fact of ["src/actions.ts", "flowKinds", "registerFamily"]) {
      if (fact === "flowKinds") continue; // belong to the card skill
      expect(skill, `the skill must teach ${fact}`).toContain(fact);
    }
    expect(skill).toContain("model-facts.json");
    expect(skill).toContain("requires_by_family");
    // the teaching's shape is the file's own: the live facts file
    // enumerates exactly these card-slice keys
    const facts = JSON.parse(
      readFileSync(join(ROOT, "packages/engines/comfyui-cordis/data/model-facts.json"), "utf8"),
    ) as { cards: Record<string, { requires_by_family?: Record<string, string[]> }> };
    for (const [card, slice] of Object.entries(facts.cards)) {
      for (const fam of Object.keys(slice.requires_by_family ?? {})) {
        expect(existsSync(join(ROOT, "packages/models", fam, "package.json")),
          `facts row cards.${card}.requires_by_family.${fam} names no live family`).toBe(true);
      }
    }
    // and the actions face is real in the skill's own copy-source
    expect(readFileSync(join(ROOT, "packages/models/krea-2/src/index.ts"), "utf8"))
      .toMatch(/export \{ t2i[^}]*\} from "\.\/actions\.ts"/u);
  });
});

/** Every `.ts`/`.tsx` file under a package, excluding built + test
 *  trees (a dep must be imported by SHIPPING source to be owed). */
function readDirSources(dir: string): string {
  if (!existsSync(dir)) return "";
  let all = "";
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (["lib", "node_modules", "tests", "test"].includes(entry.name)) continue;
    if (entry.isDirectory()) all += readDirSources(path);
    else if (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) all += readFileSync(path, "utf8");
  }
  return all;
}
