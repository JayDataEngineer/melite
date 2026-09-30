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
// package's (the owner, 1..96) and the queue gate's former COPY. The
// copy had NO length cap, so a long id passed one door and was
// refused by the next in a different voice. The copy is now the
// owner's own binding; closure-gate RULE 4d fails if a second
// DECLARATION of the grammar ever appears.
// THE MIRROR IS GONE: the queue imports the drafts package's binding
// (runsGates.ts:201) and re-exports it, so "the two copies must stay
// equal" is a comparison of one object with itself — a wall that can
// no longer fail, which is the same self-licking pin this file's own
// header condemns. What now has teeth is the DECLARATION COUNT in
// closure-gate RULE 4d: exactly one DRAFT_ID_RE declaration in the
// tree, offenders named. This block keeps the ids themselves honest
// (the sampling below still exercises the ONE live grammar).
describe("the draft-id grammar has one rule", () => {
  it("the queue gate SERVES the drafts package's own binding", () => {
    expect(MIRROR, "the queue's address must BE the owner's object, not a copy of it")
      .toBe(OWNER);
  });

  it("the one grammar admits the ids both doors must agree on", () => {
    // ABSOLUTE BOUNDS, NOT A SELF-COMPARISON (the census's M16
    // lesson, applied here): with the mirror gone there is one
    // grammar, so comparing it with itself proves nothing. Each
    // sample states what the rule must do.
    const admitted = ["a", "bench-main", "draft-6a96e487-704ce3fff6c0-1", "A_b-9", "x".repeat(96)];
    for (const id of admitted) {
      expect(MIRROR.test(id), "must admit " + JSON.stringify(id.slice(0, 12))).toBe(true);
    }
    const refused = ["", " ", "bench main", "bench/main", "bench.main", "x".repeat(97),
      "x".repeat(200), "caf\u00e9", "bench-\ud83c\udfac"];
    for (const id of refused) {
      expect(MIRROR.test(id), "must refuse " + JSON.stringify(id.slice(0, 12))).toBe(false);
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
    // comment (the walls audit's M6).
    // THE DECISION JOINED THE GRAMMAR (the li-ay stroke, 2026-10-11):
    // the clients used to import SESSION_RE and each spell the
    // sanitize body (`test ? id : 'main'`) over it — the gallery's
    // copy, the cards tab's copy, and TWO inline copies in the agent
    // tool. The grammar arms alone never held the ROUTING: gutting
    // any body to return 'main' forever kept every grammar arm green
    // (only the codec specs caught it). The contract owns the
    // decision now (benchSessionOf, beside SESSION_RE): every seat
    // imports it, no seat spells a grammar OR a sanitize, and this
    // arm bans both spellings in code.
    const seats: Array<[string, string]> = [
      ["cards tab", "../../../../packages/web/melite-card-view/src/client/cards-resource.ts"],
      ["gallery", "../../../../packages/web/infer-gallery/src/client/bench-load.ts"],
      ["agent tool", "../../../../packages/harness/melite-tools/src/tools/melite-construct.ts"],
    ];
    for (const [name, path] of seats) {
      const src = readFileSync(new URL(`${path}`, import.meta.url), "utf8");
      const code = src
        .replace(/\/\*[\s\S]*?\*\//g, " ")
        .split("\n")
        .filter((l) => !l.trim().startsWith("//") && !l.trim().startsWith("*") && !l.trim().startsWith("/*"))
        .join("\n");
      expect(code, `${name}: the seat spells NO grammar of its own — it imports the contract's`)
        .not.toMatch(/BENCH_SESSION_RE\s*=\s*\//);
      expect(code, `${name}: the seat spells NO sanitize body over the grammar — the decision is the contract's`)
        .not.toMatch(/SESSION_RE\.test/);
      // and not over a PRIVATE grammar either: the ternary ending in
      // the default key is the sanitize body's shape, whatever regex
      // guards it (the mutation that named no SESSION_RE still
      // rebuilt a second producer in place)
      expect(code, `${name}: no private ternary-to-'main' body — the decision is the contract's`)
        .not.toMatch(/\?[^:?]+:\s*['"`]main['"`]/);
      expect(code, `${name}: the seat reads the contract's benchSessionOf (one producer)`)
        .toMatch(/benchSessionOf/);
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
