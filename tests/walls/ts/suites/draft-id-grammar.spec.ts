import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { DRAFT_ID_RE as OWNER } from "../../../../packages/estate/drafts/src/spec.ts";
import { DRAFT_ID_RE as MIRROR } from "../../../../packages/harness/estate-queue/src/runsGates.ts";
// THE SESSION RULE ITSELF (the wall audit's B-C1/B-C2, 2026-09-28):
// the session describe's behavioural half used to drive OWNER/MIRROR
// — the DRAFT regexes — while naming itself the session wall: the
// session rule was unexported, so the wall sampled a neighbour and
// proved nothing. The owner exports SESSION_RE now; the wall drives
// the real rule. The two CLIENT mirrors are pinned by SOURCE TEXT
// (they are browser modules — importing the cards tab here drags the
// gateway client, which wants window — so their equality arm reads
// the code, comments stripped, and compares the extracted source).
import { SESSION_RE as SERVER_SESSION } from "../../../../packages/estate/drafts/src/bench.ts";

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
    // THE MIRRORS ARE PINNED BY SOURCE TEXT: both clients are
    // browser modules (importing the cards tab here drags the
    // gateway client, which wants window), so the wall reads their
    // CODE — comments stripped, the pattern must be code, not a
    // comment (the walls audit's M6) — and compares the extracted
    // regex source to the imported owner's, character for character.
    const mirrors: Array<[string, string]> = [
      ["cards tab", "../../../../packages/web/melite-card-view/src/client/cards-resource.ts"],
      ["gallery", "../../../../packages/web/infer-gallery/src/client/bench-load.ts"],
    ];
    for (const [name, path] of mirrors) {
      const src = readFileSync(new URL(`${path}`, import.meta.url), "utf8");
      const code = src
        .replace(/\/\*[\s\S]*?\*\//g, " ")
        .split("\n")
        .filter((l) => !l.trim().startsWith("//") && !l.trim().startsWith("*") && !l.trim().startsWith("/*"))
        .join("\n");
      const m = code.match(/BENCH_SESSION_RE\s*=\s*\/(\^\[A-Za-z0-9_-\]\{1,64\}\$)\//);
      expect(m, `${name}: BENCH_SESSION_RE is code, not a comment — and the spelling has not moved`).not.toBeNull();
      expect(m?.[1], `${name}'s mirror must equal the server's, character for character`)
        .toBe(SERVER_SESSION.source);
    }
  });

  it("the session rule itself behaves — absolute bounds, not self-comparison", () => {
    // B-C2 (the wall audit): "expects OWNER.test(x).toBe(true)" over
    // a regex the wall ALSO drives as the draft grammar was a
    // self-licking pin — these bounds are ABSOLUTE, spelled from the
    // documented law (same charset family as draft ids, 1..64, so
    // "bench-" + session always clears the 96-char draft ceiling).
    const re = SERVER_SESSION;
    expect(re.test("a"), "admits a 1-char session").toBe(true);
    expect(re.test("session_1"), "admits the ordinary shape").toBe(true);
    expect(re.test("MAIN-2026_x"), "admits the full charset").toBe(true);
    expect(re.test("x".repeat(64)), "admits exactly 64").toBe(true);
    // refusals — the absolute floor
    expect(re.test(""), "refuses empty").toBe(false);
    expect(re.test(" "), "refuses whitespace").toBe(false);
    expect(re.test("x".repeat(65)), "refuses 65 (the cap is 64)").toBe(false);
    expect(re.test("x".repeat(200)), "refuses runaway length").toBe(false);
    expect(re.test("bad/id"), "refuses path separators").toBe(false);
    expect(re.test("bad id"), "refuses spaces").toBe(false);
    expect(re.test("bad.id"), "refuses dots").toBe(false);
    expect(re.test("café"), "refuses non-ASCII").toBe(false);
    expect(re.test("ses-sión-🎬"), "refuses emoji").toBe(false);
    // AND THE CEILING IS THE DOCUMENTED ONE: 64 keeps "bench-" + session
    // under the draft grammar's 96 — the invariant the cap exists for,
    // pinned against both real rules, both imported.
    expect(OWNER.test("bench-" + "x".repeat(64)),
      "a max-length session still clears the 96-char draft ceiling").toBe(true);
  });
});
