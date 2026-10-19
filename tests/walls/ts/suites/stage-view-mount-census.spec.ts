// stage-view-mount-census.spec.ts — THE STUDIO MOUNT CENSUS
// (2026-11-09, the operator's burn: "HOW ARE WE ALL GREEN, WHEN THE
// FALLBACK HITS". The input-prep card declared a stage view
// (src/client/index.ts, the ANNY-style crop studio) but NO lane ever
// mounted the plugin — no own cordis.patch.yml, no provisioner row —
// so the cards.stage.view slot never claimed the key and the dispatch
// silently rendered the generic form. EVERY suite stayed green: the
// package's own client spec exercised the registration src-side, and
// the fallback's generic fields were then probed live as if they were
// the cure. The runtime could SEE "not loaded → better fall back"
// live, yet the pipeline said "works great". That is the
// suppressed-error class exactly: a dispatch that detects failure and
// renders success.
//
// This wall derives BOTH rosters from the tree (zero maintained
// literals) and judges the edge between them:
//
//   DECLARED  — every src/client/index.ts exporting a
//               defineStageViewRegistration('<card-id>', …)
//   MOUNTED   — the package's own dsh.bundle.patch row (the
//               channel law: every web plugin owns its existence
//               row in ITS OWN package), OR a provisioner
//               card-studio row (the exception: studios a profile
//               does not bundle).
//
// A declared studio with no mount reds HERE, naming the card and
// both mount spellings — before any lane boots without it. A mount
// naming a package that registers nothing reds too (the zombie-row
// half: a bundle that composes nothing rides the lane forever).
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../../..");

const isDir = (p: string): boolean => {
  try { return statSync(p).isDirectory(); } catch { return false; }
};

/** The registration declaration's own truth: the client index's
 *  defineStageViewRegistration('<card-id>', …) call. */
function declaredStudios(): Array<{ cardId: string; pkg: string; dir: string }> {
  const out: Array<{ cardId: string; pkg: string; dir: string }> = [];
  const walk = (dir: string): void => {
    for (const e of readdirSync(dir)) {
      const p = join(dir, e);
      if (isDir(p)) {
        if (e === "node_modules" || e === ".git" || e === "lib") continue;
        walk(p);
        continue;
      }
      if (e !== "index.ts" || !dir.endsWith(join("src", "client"))) continue;
      const text = readFileSync(p, "utf8");
      const m = text.match(/defineStageViewRegistration\(\s*'([^']+)'/);
      if (m === null) continue;
      const pkgDir = dirname(dirname(dir));
      const manifest = JSON.parse(readFileSync(join(pkgDir, "package.json"), "utf8")) as { name?: string };
      assert.ok(manifest.name !== undefined, "client index without a package name: " + p);
      out.push({ cardId: m[1] as string, pkg: manifest.name as string, dir: pkgDir });
    }
  };
  walk(join(ROOT, "packages"));
  return out;
}

/** The own-patch mount spelling: dsh.bundle.patch names an existing
 *  yml whose insert rows mount THIS package (`- name: '<pkg>'`). */
function ownPatchMounts(pkg: string, dir: string): boolean {
  const manifest = JSON.parse(readFileSync(join(dir, "package.json"), "utf8")) as {
    dsh?: { bundle?: { patch?: string } };
  };
  const rel = manifest.dsh?.bundle?.patch;
  if (rel === undefined) return false;
  const patchPath = join(dir, rel);
  if (!existsSync(patchPath)) return false;
  // the row's VALUE names the package — quote style and row indent
  // are the yml's formatting, not facts (motion spells double
  // quotes; the h3/input-prep rows indent the name under `- id:`).
  return new RegExp("name:\\s*['\"]" + pkg.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "['\"]")
    .test(readFileSync(patchPath, "utf8"));
}

/** The provisioner-row spelling (the not-bundled-by-the-profile
 *  exception): a card-studio insert row naming the package. */
function provisionerRows(): Array<{ id: string; pkg: string }> {
  const path = join(ROOT, "packages", "harness", "provisioner", "cordis.patch.yml");
  if (!existsSync(path)) return [];
  const text = readFileSync(path, "utf8");
  const out: Array<{ id: string; pkg: string }> = [];
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const id = lines[i]?.match(/^\s*-\s*id:\s*(card-studio-[^\s]+)\s*$/);
    if (id === null || id === undefined) continue;
    // the row's name rides the next line (`- id: …` / `name: …`, the
    // patch's own two-line row shape)
    for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
      const name = lines[j]?.match(/^\s*name:\s*['"]([^'"]+)['"]\s*$/);
      if (name !== null && name !== undefined) {
        out.push({ id: id[1] as string, pkg: name[1] as string });
        break;
      }
    }
  }
  return out;
}

describe("THE STUDIO MOUNT CENSUS (a declared stage view rides a mounted plugin — the fallback masked the hole, this wall is the hole's judge)", () => {
  it("every declared stage view mounts: its own package patch row OR a provisioner card-studio row", () => {
    const declared = declaredStudios();
    assert.ok(declared.length >= 4, "the census derived a real roster (got " + declared.length + ") — the derivation broke");
    const provisioner = provisionerRows();
    const unmounted = declared.filter(
      (d) => !ownPatchMounts(d.pkg, d.dir) && !provisioner.some((r) => r.pkg === d.pkg),
    );
    assert.deepEqual(
      unmounted.map((d) => d.cardId + " (" + d.pkg + ")"),
      [],
      "declared stage views with NO mount — the dispatch silently falls back to the generic form for these cards, live, " +
        "while every suite stays green. Mount each: an own cordis.patch.yml + package.json dsh.bundle.patch (the h3/motion " +
        "spelling), or a provisioner card-studio row (the img-to-mesh spelling).",
    );
  });

  it("every provisioner card-studio row names a package that DECLARES a stage view (no zombie mounts)", () => {
    const declared = new Set(declaredStudios().map((d) => d.pkg));
    const zombies = provisionerRows().filter((r) => !declared.has(r.pkg));
    assert.deepEqual(
      zombies.map((r) => r.id + " -> " + r.pkg),
      [],
      "provisioner card-studio rows mounting packages that register no stage view — a dead bundle riding every lane boot",
    );
  });
});
