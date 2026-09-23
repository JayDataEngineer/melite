// ledger-tail.spec.ts — the journal tail: limit law (default 50,
// clamp 1..500, garbage rides 50), the 64-char event match on the
// raw line, last-N tailing, unparseable lines counted-but-skipped,
// oldest->newest, missing journal reads empty.
import { describe, it, beforeAll, afterAll } from "vitest";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { tailLedger, tailLedgerAcross } from "../src/ledgerTail.ts";

describe("tailLedger", () => {
  let dir = "";
  const row = (event: string, n: number): string =>
    JSON.stringify({ event, n, extra: "x".repeat(10) });
  const ledger = (): string => join(dir, "journal.jsonl");

  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), "ledger-tail-"));
    const lines: string[] = [];
    for (let i = 0; i < 10; i++) lines.push(row(i % 2 === 0 ? "run" : "flip", i));
    lines.push("not json at all");
    lines.push(row("run", 10));
    writeFileSync(ledger(), lines.join("\n") + "\n");
  });
  afterAll(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("defaults garbage limits to 50 and clamps to 1..500", () => {
    assert.equal(tailLedger(ledger(), "junk", "").matched, 12);
    assert.equal(tailLedger(ledger(), "junk", "").shown, 11);
    assert.equal(tailLedger(ledger(), "0", "").shown, 1);
    assert.equal(tailLedger(ledger(), "-3", "").shown, 1);
    assert.equal(tailLedger(ledger(), "3", "").shown, 2);
    assert.equal(tailLedger(ledger(), "9999", "").shown, 11);
  });

  it("matches the event on the raw line substring, oldest first", () => {
    const a = tailLedger(ledger(), "50", "flip");
    assert.equal(a.matched, 5);
    assert.deepEqual(
      a.entries.map((e) => (e as { n: number }).n),
      [1, 3, 5, 7, 9],
    );
  });

  it("truncates the event to 64 chars and keeps the last N", () => {
    const a = tailLedger(ledger(), "2", "run" + "x".repeat(100));
    assert.equal(a.matched, 0);
    const b = tailLedger(ledger(), "2", "run");
    assert.equal(b.matched, 6);
    assert.equal(b.shown, 2);
    assert.deepEqual(
      b.entries.map((e) => (e as { n: number }).n),
      [8, 10],
    );
  });

  it("a missing journal reads empty", () => {
    assert.deepEqual(tailLedger(join(dir, "nope.jsonl"), "50", ""), {
      entries: [],
      shown: 0,
      matched: 0,
    });
  });

  it("mid-file blank lines count as matched but never as entries", () => {
    const p = join(dir, "blank.jsonl");
    writeFileSync(p, row("run", 1) + "\n\n" + row("run", 2) + "\n");
    const a = tailLedger(p, "50", "");
    assert.equal(a.matched, 3);
    assert.equal(a.shown, 2);
  });
});

describe("tailLedgerAcross (§23 cross-roots)", () => {
  const mkRoot = (name: string, rows: string[]): string => {
    const root = mkdtempSync(join(tmpdir(), "ledger-x-" + name + "-"));
    mkdirSync(join(root, "output"), { recursive: true });
    writeFileSync(join(root, "output", "_ledger.jsonl"), rows.join("\n") + "\n");
    return root;
  };
  const line = (ts: number, event: string, tag: string): string =>
    JSON.stringify({ ts, event, tag });

  it("merges two journals into one ts-ordered timeline; names the searched roots", () => {
    const own = mkRoot("own", [line(1, "run", "own-1"), line(3, "run", "own-3")]);
    const maker = mkRoot("maker", [line(2, "run", "mk-2"), line(4, "run", "mk-4")]);
    const ans = tailLedgerAcross([own, maker], "50", "");
    assert.deepEqual(ans.searched, [own, maker]);
    assert.deepEqual(
      ans.entries.map((e) => (e as { tag: string }).tag),
      ["own-1", "mk-2", "own-3", "mk-4"],
    );
    try {
      rmSync(own, { recursive: true, force: true });
      rmSync(maker, { recursive: true, force: true });
    } catch { /* tmp cleanup best-effort */ }
  });

  it("a tie keeps manifest order (own root first); the tail keeps the LAST N merged; missing roots read empty", () => {
    const own = mkRoot("tie-own", [line(5, "run", "own-5"), line(7, "run", "own-7")]);
    // a ts-less matched line (unparseable): sorts oldest, counts
    // matched, never becomes an entry (the door's law, per root).
    // and a ts-present-but-non-numeric line (unparseable too):
    // lineTs reads 0 for both shapes — oldest, counted, never an entry.
    const maker = mkRoot("tie-mk", ["not json at all", '{"ts": "soon"', line(5, "run", "mk-5"), line(6, "run", "mk-6")]);
    const empty = mkdtempSync(join(tmpdir(), "ledger-x-empty-"));
    const ans = tailLedgerAcross([own, maker, empty], "3", "");
    assert.deepEqual(
      ans.entries.map((e) => (e as { tag: string }).tag),
      ["mk-5", "mk-6", "own-7"],
    );
    assert.equal(ans.matched, 6);
    try {
      rmSync(own, { recursive: true, force: true });
      rmSync(maker, { recursive: true, force: true });
      rmSync(empty, { recursive: true, force: true });
    } catch { /* tmp cleanup best-effort */ }
  });
});
