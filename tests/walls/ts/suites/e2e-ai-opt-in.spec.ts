// e2e-ai-opt-in.spec.ts — THE AI OPT-IN WALL (operator order 2026-10-17:
// the e2e browser mints are ACTUAL AI CALLS — tour.ts's openAConversation
// types a composer message and sends it, riding /api/session/prompt to the
// lane's real model; one model turn per mint, tokens burned, a keyed live
// lane required). Minting is opt-in only: every minting spec self-skips
// without MELITE_E2E_AI=1, and the spine itself refuses loud if a caller
// reaches it anyway (belt + suspenders — a spec that forgets its skip line
// still cannot burn tokens silently).
//
// The wall judges the real e2e tree, never a copy: the gate export's
// default-off shape, the spine's refusal arm, and a DERIVED census — every
// spec importing the mint spine must carry the opt-in skip, with the roster
// computed from the directory (a renamed spine empties the roster and reds
// the vacuity arm; no hand-maintained count to drift).
//
// Run: npx vitest run tests/walls/ts/suites/e2e-ai-opt-in.spec.ts
// (or the whole gate: pnpm run test)

import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, it } from "vitest";
import assert from "node:assert/strict";

const E2E_DIR = path.resolve(
  import.meta.dirname,
  "../../../../packages/web/melite-card-view/e2e",
);

const tourSource = readFileSync(path.join(E2E_DIR, "tour.ts"), "utf8");

/** Body of the first top-level `function`/`const` whose declaration line
 * matches `name`. Brace depth is scanned once to find every depth-0 `{`
 * (the signature's return-type braces included); the LAST one is the body's
 * opening brace, matched in a second pass. '' when absent. */
function extractBody(source: string, name: string): string {
  const re = new RegExp(`(?:export )?(?:async )?(?:function|const) ${name}\\b`);
  const start = source.search(re);
  if (start < 0) return "";
  let depth = 0;
  let bodyOpen = -1;
  for (let i = start; i < source.length; i++) {
    if (source[i] === "{") {
      if (depth === 0) bodyOpen = i;
      depth++;
    } else if (source[i] === "}") {
      depth--;
    }
  }
  if (bodyOpen < 0) return "";
  depth = 0;
  for (let i = bodyOpen; i < source.length; i++) {
    if (source[i] === "{") depth++;
    else if (source[i] === "}" && --depth === 0) return source.slice(start, i + 1);
  }
  return "";
}

/** e2e specs that mint: they import the spine from the tour module. */
function mintingSpecs(): string[] {
  return readdirSync(E2E_DIR)
    .filter((f) => f.endsWith(".spec.ts"))
    .filter((f) =>
      /from\s+['"](\.\.?\/)?tour(\.ts)?['"]/.test(readFileSync(path.join(E2E_DIR, f), "utf8"))
      && readFileSync(path.join(E2E_DIR, f), "utf8").includes("openAConversation"),
    );
}

describe("THE AI OPT-IN — e2e mints are actual AI calls, opt-in only", () => {
  it("the gate export exists and defaults OFF (module-load env read)", () => {
    const decl = tourSource.match(
      /export const AI_OPT_IN = process\.env\.MELITE_E2E_AI === '1'/,
    );
    assert.ok(decl, "tour.ts must export AI_OPT_IN reading MELITE_E2E_AI === '1' at module load — a default-on gate or a lazy read breaks the opt-in law");
  });

  it("the mint spine refuses loud when the opt-in is absent", () => {
    const body = extractBody(tourSource, "openAConversation");
    assert.notEqual(body, "", "openAConversation not found in tour.ts");
    assert.match(body, /if \(!AI_OPT_IN\)/, "the spine's first statement must test !AI_OPT_IN");
    assert.match(body, /throw new Error\(/, "an uninvited mint must THROW loud — a silent return would strand the spec as a false pass");
    assert.match(body, /THE MINT IS AN ACTUAL AI CALL/, "the refusal must name the burn");
    assert.match(body, /MELITE_E2E_AI=1/, "the refusal must name the opt-in");
  });

  it("every minting spec self-skips without the opt-in (derived census)", () => {
    const specs = mintingSpecs();
    assert.ok(specs.length >= 1, `no spec imports openAConversation — the mint spine went orphaned (renamed?) and the per-spec skip law is unjudgeable; roster: ${specs.join(", ")}`);
    const ungated = specs.filter((f) => {
      const src = readFileSync(path.join(E2E_DIR, f), "utf8");
      return !/test\.skip\([^)]*MELITE_E2E_AI/.test(src);
    });
    assert.deepEqual(ungated, [], `specs mint through openAConversation without the MELITE_E2E_AI skip: ${ungated.join(", ")}`);
  });

  it("the opt-in law is documented at the e2e tree's README", () => {
    const readme = readFileSync(path.join(E2E_DIR, "README.md"), "utf8");
    assert.match(readme, /MELITE_E2E_AI/, "README must document the opt-in env");
    assert.match(readme, /api\/session\/prompt/, "README must name the real wire the mint rides");
  });
});
