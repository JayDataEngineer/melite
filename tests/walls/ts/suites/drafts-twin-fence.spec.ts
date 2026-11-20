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
 *   3. JUDGED, NEVER EXECUTED (the 0/8-coverage ghost, 2026-11-20) —
 *      vite resolves drafts' own "./spec.js" specifiers to the on-disk
 *      twin FIRST, so under the full fleet the whole drafts domain ran
 *      on the twin while spec.ts collected ghost arithmetic (7/8 — its
 *      draftIdOk body never executed as source; the coverage ratchet
 *      red is the live judge). The vitest.shared twin-source plugin is
 *      the cure; this arm judges the redirect's own law and
 *   4. THE WIRING — every vitest tier spreads vitestPlugins(), so the
 *      door rides every project's graph.
 */
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { draftsTwinSourcePlugin } from "../../../../vitest.shared.ts";

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

  it("ARM 3 JUDGED, NEVER EXECUTED: the twin-source plugin redirects every twin-bound specifier to the source face", () => {
    // the plugin's own redirect law, judged directly and
    // deterministically (the fork it cures only bites under the full
    // fleet's module graph, so the live face is the coverage
    // ratchet's; this arm judges the redirect itself):
    //   - the twin specifier, absolute — redirected to the source;
    //   - a relative twin specifier from drafts' own sources —
    //     redirected to the source;
    //   - every OTHER specifier — untouched (null).
    const plugin = draftsTwinSourcePlugin();
    const twin = join(REPO, "packages/estate/drafts/src/spec.js");
    const source = join(REPO, "packages/estate/drafts/src/spec.ts");
    const index = join(REPO, "packages/estate/drafts/src/index.ts");
    const store = join(REPO, "packages/estate/drafts/src/store.ts");
    assert.equal(plugin.resolveId(twin, undefined), source, "the absolute twin specifier must redirect to the source face");
    assert.equal(plugin.resolveId("./spec.js", index), source, "index's own ./spec.js must redirect to the source face");
    assert.equal(plugin.resolveId("../src/spec.js", store), source, "the tests' ../src/spec.js shape must redirect to the source face");
    assert.equal(plugin.resolveId("./spec.js", store), source, "store's own ./spec.js resolves to the twin too — redirected likewise");
    assert.equal(plugin.resolveId("./store.js", index), null, "other relative specifiers must pass untouched");
    assert.equal(plugin.resolveId("@melite/estate-drafts", undefined), null, "package specifiers must pass untouched");
  });

  it("ARM 4 THE WIRING: every vitest tier spreads vitestPlugins — the twin door rides every project", () => {
    // the redirect only protects the tiers it is spread into. A
    // config reverted to the bare decorator plugin (or a NEW tier
    // config that forgets the facade) re-opens the twin's execution
    // path in that tier's graph — this arm reads every config's
    // plugin array aloud.
    const configs = ["vitest.config.ts", "vitest.e2e.config.ts", "vitest.web.config.ts", "vitest.expected.config.ts", "vitest.snapshot.config.ts"];
    for (const name of configs) {
      const text = readFileSync(join(REPO, name), "utf8");
      assert.match(text, /plugins:\s*vitestPlugins\(\)/, `${name}: the plugin array must spread vitestPlugins() — the twin door rides every tier`);
      assert.doesNotMatch(text, /plugins:\s*\[\s*standardDecoratorPlugin\(\)\s*\]/, `${name}: a bare decorator-only plugin array re-opens the twin's execution path`);
    }
  });
});
