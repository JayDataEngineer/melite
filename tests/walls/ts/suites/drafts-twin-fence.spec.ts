/**
 * DRAFTS TSC-TWIN FENCE (2026-11-19 — the b2bf57958 re-sweep).
 *
 * THE LAW: in-place tsc emits .js twins beside packages/estate/drafts'
 * .ts sources. Six of them are UNREFERENCED (bench/index/remote/store/
 * trail/types .js) and one — spec.js — is load-bearing: seven wall
 * suites judge its emitted face. Commit 25558a6cf swept the twins with
 * a blind `git add -A` and bench.js's emitted prose tripped gitleaks'
 * llm-keystore entropy rule; c9bdf9ca7 removed them; b2bf57958's
 * `git add -A` SWEPT THEM BACK (Secrets Scan red on that commit's
 * diff). The .gitignore fence (`packages/estate/drafts/src/*.js` with a
 * spec.js negation) makes the re-sweep impossible — this wall fires if
 * the fence is deleted or a twin is force-added past it.
 *
 * ARMS (each its own firing arm — LAW 4):
 *   1. TRACKED SET — among .js files under drafts/src, exactly spec.js
 *      is tracked. Fires red the moment any twin lands in the index
 *      (force-add) or spec.js is dropped.
 *   2. FENCE PRESENT — .gitignore carries the rule and the negation;
 *      deleting either arm of the fence trips this before arm 1 can be
 *      re-tripped by an ordinary `git add -A`.
 */
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";

const REPO = join(import.meta.dirname, "..", "..", "..", "..");

function trackedUnder(rel: string): string[] {
  const out = execFileSync("git", ["ls-files", "--", rel], { cwd: REPO, encoding: "utf8" });
  return out.split("\n").filter((l) => l !== "");
}

describe("drafts tsc-twin fence", () => {
  it("ARM 1 TRACKED SET: only spec.js among drafts/src .js files is tracked", () => {
    const jsFiles = trackedUnder("packages/estate/drafts/src")
      .filter((f) => f.endsWith(".js"));
    assert.deepEqual(jsFiles, ["packages/estate/drafts/src/spec.js"],
      "a tsc twin rode the index again — the .gitignore fence is the cure, not this wall");
  });

  it("ARM 2 FENCE PRESENT: the ignore rule and the spec.js negation both stand", () => {
    const gi = readFileSync(join(REPO, ".gitignore"), "utf8");
    assert.ok(/^packages\/estate\/drafts\/src\/\*\.js$/m.test(gi),
      "the twin rule was deleted — `git add -A` can sweep a re-emission again");
    assert.ok(/^!packages\/estate\/drafts\/src\/spec\.js$/m.test(gi),
      "the spec.js negation was deleted — the wall-suite face would go unversioned");
  });
});
