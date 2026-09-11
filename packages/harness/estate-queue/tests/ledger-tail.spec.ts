// ledger-tail.spec.ts — the journal tail: limit law (default 50,
// clamp 1..500, garbage rides 50), the 64-char event match on the
// raw line, last-N tailing, unparseable lines counted-but-skipped,
// oldest->newest, missing journal reads empty.
import { describe, it, beforeAll, afterAll } from "vitest";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { tailLedger } from "../src/ledgerTail.ts";

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
      a.entries.map((e) => (e as { n: { literal: string } }).n.literal),
      ["1", "3", "5", "7", "9"],
    );
  });

  it("truncates the event to 64 chars and keeps the last N", () => {
    const a = tailLedger(ledger(), "2", "run" + "x".repeat(100));
    assert.equal(a.matched, 0);
    const b = tailLedger(ledger(), "2", "run");
    assert.equal(b.matched, 6);
    assert.equal(b.shown, 2);
    assert.deepEqual(
      b.entries.map((e) => (e as { n: { literal: string } }).n.literal),
      ["8", "10"],
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
