import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { DRAFT_ID_RE as OWNER } from "../../../../packages/estate/drafts/src/spec.ts";
import { DRAFT_ID_RE as MIRROR } from "../../../../packages/harness/estate-queue/src/runsGates.ts";

// THE MIRRORED-GRAMMAR LAW (2026-10-10, the census's H13): a draft
// id is admitted by two doors with two grammars — the drafts
// package's (the owner, 1..96) and the queue gate's copy. The copy
// had NO length cap, so a long id passed one door and was refused
// by the next in a different voice. A mirror is acceptable ONLY
// while it is provably equal: this wall fails the moment they differ.
describe("the draft-id grammar has one rule", () => {
  it("the queue gate's copy IS the drafts package's rule", () => {
    expect(MIRROR.source, "the mirrored grammar must equal the owner's, character for character")
      .toBe(OWNER.source);
  });

  it("both admit the same ids (a sampling that would expose any difference)", () => {
    const samples = [
      "a", "bench-main", "draft-6a96e487-704ce3fff6c0-1", "A_b-9",
      "", " ", "bench main", "bench/main", "bench.main",
      "x".repeat(96), "x".repeat(97), "x".repeat(200),
      "café", "bench-🎬",
    ];
    for (const id of samples) {
      expect(MIRROR.test(id), "mirror vs owner for " + JSON.stringify(id.slice(0, 12)))
        .toBe(OWNER.test(id));
    }
  });

  it("the drafts spec's own field uses the same bound", () => {
    const src = readFileSync(
      new URL("../../../../packages/estate/drafts/src/spec.ts", import.meta.url),
      "utf8",
    );
    expect(src).toMatch(/DRAFT_ID_RE: RegExp = \/\^\[A-Za-z0-9_-\]\{1,96\}\$\//);
  });
});

// THE SESSION GRAMMAR, THREE MIRRORS (the census's M16): the bench
// session id is validated by the server and re-validated by two
// clients, each holding its own copy. Today they agree; a server
// tightening (or a client loosening) would have a client accept an
// id the server refuses, with a confusing voice. The law is the same
// rule in three places, so it is pinned.
describe("the bench session grammar has one rule", () => {
  it("the server's and both clients' patterns are character-for-character equal", () => {
    const server = readFileSync(
      new URL("../../../../packages/estate/drafts/src/bench.ts", import.meta.url),
      "utf8",
    );
    const clientA = readFileSync(
      new URL("../../../../packages/web/melite-card-view/src/client/cards-resource.ts", import.meta.url),
      "utf8",
    );
    const clientB = readFileSync(
      new URL("../../../../packages/web/infer-gallery/src/client/bench-load.ts", import.meta.url),
      "utf8",
    );
    const pattern = /=\s*\/\^\[A-Za-z0-9_-\]\{1,64\}\$\//
    expect(server, "the server's SESSION_RE").toMatch(pattern);
    expect(clientA, "the cards tab's BENCH_SESSION_RE").toMatch(pattern);
    expect(clientB, "the gallery's BENCH_SESSION_RE").toMatch(pattern);
  });
});
