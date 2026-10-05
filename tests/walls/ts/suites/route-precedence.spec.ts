// route-precedence.spec.ts — WHICH HANDLER ANSWERS (2026-10-13).
//
// The deck mounts a /v1/llm PREFIX whose fallback answers 404
// llm_lane_disabled (melite-card-deck/src/index.ts:45), while
// melite-tools mounts an EXACT /v1/llm/enhance (doors.ts:438). If the
// host resolved prefix-before-exact, the real enhancer would be DEAD on
// every deck-mounted lane and the failure would read as "the lane is
// disabled" — a silent wrong answer, not an error.
//
// It does NOT manifest: the reference router consults the exact table
// first and only falls to the longest prefix on a miss
// (references/deepseek-harness/packages/host/webserver/src/index.ts:
// "Longest-prefix-wins over the prefix table AFTER an exact-table
// miss"). Nothing proved that, though — the finding was reported as a
// live hazard on reading the two registrations alone.
//
// The assertions are on ROUTE IDENTITY (which handler was selected),
// never on a status code: a status-code test would pass whether the
// stub or the enhancer answered, which is the whole question. The
// textual pin on the reference's own match() is the anti-self-fulfilling
// half — without it this test would only re-assert its own transcription
// of the rule.

import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(__dirname, "..", "..", "..", "..");
const REFERENCE_MATCHER = join(
  ROOT,
  "references/deepseek-harness/packages/host/webserver/src/index.ts",
);

type RouteKind = "exact" | "prefix";

interface Route {
  kind: RouteKind;
  path: string;
  handler: (pathname: string) => string;
}

/** The reference router's own rule, transcribed. */
function match(routes: readonly Route[], pathname: string): Route | undefined {
  const exact = routes.find((r) => r.kind === "exact" && r.path === pathname);
  if (exact !== undefined) return exact;
  let best: Route | undefined;
  for (const route of routes.filter((r) => r.kind === "prefix")) {
    if (pathname !== route.path && !pathname.startsWith(`${route.path}/`)) continue;
    if (best === undefined || route.path.length > best.path.length) best = route;
  }
  return best;
}

const DECK_PREFIX: Route = {
  kind: "prefix",
  path: "/v1/llm",
  handler: () => "deck-stub",
};
const DOORS_EXACT: Route = {
  kind: "exact",
  path: "/v1/llm/enhance",
  handler: () => "enhance-handler",
};

describe("ROUTE PRECEDENCE — the exact table beats the longest prefix", () => {
  it("POST /v1/llm/enhance is answered by the exact handler, in BOTH mount orders", () => {
    // the two registrations, in the order each apply() mounts them
    const deckFirst = [DECK_PREFIX, DOORS_EXACT];
    const doorsFirst = [DOORS_EXACT, DECK_PREFIX];
    for (const [label, routes] of [["deck first", deckFirst], ["doors first", doorsFirst]] as const) {
      expect(match(routes, "/v1/llm/enhance")?.handler("/v1/llm/enhance"), label).toBe("enhance-handler");
    }
  });

  it("the mirror: /v1/llm/keys falls to the PREFIX (no exact answers it)", () => {
    for (const [label, routes] of [
      ["deck first", [DECK_PREFIX, DOORS_EXACT]],
      ["doors first", [DOORS_EXACT, DECK_PREFIX]],
    ] as const) {
      expect(match(routes, "/v1/llm/keys")?.handler("/v1/llm/keys"), label).toBe("deck-stub");
    }
    // and the exact table really is consulted FIRST, so a prefix that
    // also matches the exact path never wins it
    expect(match([DECK_PREFIX], "/v1/llm/enhance")?.handler("/v1/llm/enhance")).toBe("deck-stub");
  });

  it("the reference router consults the exact table before the prefix loop", () => {
    // The anti-self-fulfilling half. This suite transcribes the rule
    // above; if the reference ever changed the order, the transcription
    // would still pass and the estate would break. The pin runs against
    // a TRACKED verbatim fixture (A8d: the reference tree is
    // developer-local and untracked, so a CI checkout never had it and
    // this arm passed vacuously there, every run, forever). When the
    // live reference IS present, the fixture is re-synced first and a
    // drift refuses — the fixture cannot silently age.
    const FIXTURE = join(ROOT, "tests/walls/ts/suites/fixtures/reference-webserver-match.ts");
    if (existsSync(REFERENCE_MATCHER)) {
      const live = readFileSync(REFERENCE_MATCHER, "utf8");
      const start = live.indexOf("  /** Longest-prefix-wins over the prefix table after an exact-table miss. */");
      const end = live.indexOf("  /**", start + 10); // the next doc comment closes the excerpt
      const liveExcerpt = live.slice(start, end).trimEnd();
      const fixture = readFileSync(FIXTURE, "utf8");
      const fixtureExcerpt = fixture.slice(fixture.indexOf("  /** Longest-prefix-wins")).trimEnd();
      expect(fixtureExcerpt === liveExcerpt,
        "the vendored matcher fixture drifted from the live reference — re-vendor " +
        "tests/walls/ts/suites/fixtures/reference-webserver-match.ts from the reference's match()").toBe(true);
    }
    const source = readFileSync(FIXTURE, "utf8");
    const exactAt = source.indexOf("this.exact.get(pathname)");
    const loopAt = source.indexOf("for (const [prefix, route] of this.prefixes)");
    expect(exactAt, "the exact-table lookup is present").toBeGreaterThan(-1);
    expect(loopAt, "the prefix loop is present").toBeGreaterThan(-1);
    expect(
      exactAt,
      "the exact table must be consulted BEFORE the longest-prefix loop",
    ).toBeLessThan(loopAt);
  });

  it("the deck's prefix fallback really is the disabled-lane voice the hazard described", () => {
    // If the deck ever stops answering 404 llm_lane_disabled, the
    // hazard this suite rules out is no longer the hazard it ruled out.
    const deck = readFileSync(
      join(ROOT, "packages/web/melite-card-deck/src/index.ts"),
      "utf8",
    );
    expect(deck).toMatch(/llm_lane_disabled/);
    const doors = readFileSync(
      join(ROOT, "packages/harness/melite-tools/src/doors.ts"),
      "utf8",
    );
    expect(doors).toMatch(/kind:\s*'exact',[\s\S]{0,80}?path:\s*'\/v1\/llm\/enhance'/u);
  });
});
