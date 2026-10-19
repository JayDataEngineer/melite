// stage-view-plane.spec.ts — THE SERVED DECLARATION's wall (2026-11-09,
// the fallback extermination). The drill's loud-refusal law keys off
// FormSpecDoc.stage_view; if the estate stopped deriving it (the walk
// broke, the regex drifted, the memo went stale-empty), every card
// would serve stage_view: null and the dispatch would quietly revert
// to the generic form — the suppressed-error class again, green
// everywhere. This wall rides the REAL repo tree: input-prep (the
// operator's burn) and h3-timeline declare; a card with no client
// index registration serves null; an unknown card serves null. The
// roster is derived by the plane under test, so the wall judges the
// plane against the tree, never against a frozen list.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { stageViewDeclaration } from "../src/stageViewPlane.ts";

const ROOT = join(dirnameOf(), "../../../..");

function dirnameOf(): string {
  return new URL(".", import.meta.url).pathname;
}

/** The tree's own registration count, derived independently of the
 *  plane's walk (a second opinion — the wall's judge must not be the
 *  plane's own memo). */
function treeDeclaredCount(): number {
  let count = 0;
  const walk = (dir: string): void => {
    for (const e of readdirShim(dir)) {
      const p = join(dir, e);
      if (!statDir(p)) continue;
      if (e === "node_modules" || e === ".git" || e === "lib") continue;
      const index = join(p, "src", "client", "index.ts");
      if (existsSync(index) &&
        /defineStageViewRegistration\(\s*'([^']+)'/.test(readFileSync(index, "utf8"))) count++;
      walk(p);
    }
  };
  walk(join(ROOT, "packages"));
  return count;
}

import { readdirSync, statSync } from "node:fs";
const readdirShim = (d: string): string[] => {
  try { return readdirSync(d); } catch { return []; }
};
const statDir = (p: string): boolean => {
  try { return statSync(p).isDirectory(); } catch { return false; }
};

describe("the stage-view declaration plane (the estate serves the studio claim the drill's refusal law reads)", () => {
  it("the operator's burn card declares its studio: input-prep serves the package name", () => {
    assert.equal(stageViewDeclaration("input-prep"), "@melite/image-input-prep",
      "the burned card must declare — the drill's loud refusal is dead weight without it");
  });

  it("h3-timeline declares too (the roster is plural, not a one-card special case)", () => {
    assert.equal(stageViewDeclaration("h3-timeline"), "@melite/video-h3-timeline");
  });

  it("a card with no registration serves null and an unknown card serves null", () => {
    assert.equal(stageViewDeclaration("image-gen"), undefined,
      "no registration → no declaration — the generic form is that card's designed seat");
    assert.equal(stageViewDeclaration("no-such-card"), undefined);
  });

  it("the plane's roster covers every registration the tree carries (no silent drop)", () => {
    const treeCount = treeDeclaredCount();
    assert.ok(treeCount >= 4, "the tree derivation found a real roster (got " + treeCount + ")");
    // every tree registration must resolve through the plane: walk
    // the known-id face — the plane's map is private, so judge by
    // the ids the tree spells. A dropped registration = a card the
    // drill would silently downgrade.
    const seen = treeDeclaredIds();
    for (const id of seen) {
      assert.ok(stageViewDeclaration(id) !== undefined,
        "the plane dropped a tree registration: '" + id + "'");
    }
  });
});

function treeDeclaredIds(): string[] {
  const ids: string[] = [];
  const walk = (dir: string): void => {
    for (const e of readdirShim(dir)) {
      const p = join(dir, e);
      if (!statDir(p)) continue;
      if (e === "node_modules" || e === ".git" || e === "lib") continue;
      const index = join(p, "src", "client", "index.ts");
      if (existsSync(index)) {
        const m = readFileSync(index, "utf8").match(/defineStageViewRegistration\(\s*'([^']+)'/);
        if (m !== null) ids.push(m[1] as string);
      }
      walk(p);
    }
  };
  walk(join(ROOT, "packages"));
  return ids;
}
