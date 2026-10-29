// skill-doc-stamps — THE DOC-STAMP SWEEP WALL (the F2 VERIFIED stamp
// sweep, ROADMAP owed line, 2026-11-12): every skill doc that carries a
// VERIFIED LIVE stamp is judged against real doors, never a frozen
// literal. The stamped roster is the registry row's OWN truth_home
// (cards-skill-doc-stamps) — the wall reads the row, the row names the
// docs, the docs name their runs and receipts, and the wall checks each
// cited run id resolves in the runs ledger (data/runs/output/<id> with
// _request.json + _flow.json) and each cited receipt is a real file
// under dev_docs/contracts/receipts/. A stamp outside the roster reds,
// so new stamps land through the registry row, never beside it.
import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import YAML from 'yaml';

const ROOT = join(import.meta.dirname, '../../../..');
const ROW_ID = 'cards-skill-doc-stamps';
const RUNS = join(ROOT, 'data/runs/output');
const RECEIPTS = join(ROOT, 'dev_docs/contracts/receipts');
const STAMP_RE = /VERIFIED LIVE (\d{4}-\d{2}-\d{2}) against ([\s\S]*?)(?=\n\n)/;

/** The registry row that owns the sweep (the roster's real home). */
function roster(): string[] {
  const doc = YAML.parse(
    readFileSync(join(ROOT, 'dev_docs/contracts/registry/cards-tier.yaml'), 'utf8'),
  ) as { rows?: Array<{ id?: string; truth_home?: { files?: string[] } }> };
  const row = (doc.rows ?? []).find((r) => r.id === ROW_ID);
  expect(row, `registry row ${ROW_ID} exists (seat it via the contract CLI, never by hand)`).toBeDefined();
  const files = row!.truth_home?.files ?? [];
  expect(files.length, `row ${ROW_ID} names its stamped docs`).toBeGreaterThan(0);
  return files;
}

/** Every SKILL.md under packages/ (the walk, not a hand list). */
function allSkills(): string[] {
  const out: string[] = [];
  const walk = (dir: string): void => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name === 'SKILL.md') out.push(p);
    }
  };
  walk(join(ROOT, 'packages'));
  return out.map((p) => p.slice(ROOT.length + 1)).sort();
}

const stampOf = (md: string): RegExpExecArray | null => STAMP_RE.exec(md);
const runIdsOf = (body: string): string[] =>
  [...body.matchAll(/run-[0-9a-f]+-[0-9a-f]+/g)].map((m) => m[0]);
const receiptOf = (body: string): string | null => {
  const m = /receipts\/([a-z0-9-]+\.md)/.exec(body);
  return m === null ? null : m[1];
};

describe('THE DOC-STAMP SWEEP WALL (stamps are earned by live runs only)', () => {
  it('every rostered doc carries a well-formed VERIFIED LIVE stamp (date + receipt + run)', () => {
    for (const rel of roster()) {
      const abs = join(ROOT, rel);
      expect(existsSync(abs), `rostered doc exists: ${rel}`).toBe(true);
      const md = readFileSync(abs, 'utf8');
      const stamp = stampOf(md);
      expect(stamp, `${rel} carries a VERIFIED LIVE <date> against ... stamp`).not.toBeNull();
      expect(stamp![1], `${rel}: the stamp is dated`).toMatch(/^2026-/);
      expect(receiptOf(stamp![2]!), `${rel}: the stamp names a receipt under dev_docs/contracts/receipts/`).not.toBeNull();
      expect(runIdsOf(stamp![2]!).length, `${rel}: the stamp cites at least one run id`).toBeGreaterThan(0);
    }
  });

  it('every run id a stamp cites resolves in the runs ledger (request + flow on disk)', () => {
    for (const rel of roster()) {
      const stamp = stampOf(readFileSync(join(ROOT, rel), 'utf8'));
      expect(stamp, `${rel} carries a stamp`).not.toBeNull();
      for (const id of runIdsOf(stamp![2]!)) {
        const dir = join(RUNS, id);
        expect(existsSync(join(dir, '_request.json')), `${rel}: ${id} has its ledger request`).toBe(true);
        expect(existsSync(join(dir, '_flow.json')), `${rel}: ${id} has its composed flow`).toBe(true);
      }
    }
  });

  it('every receipt a stamp cites is a real file (a moved receipt reds, never rots)', () => {
    for (const rel of roster()) {
      const stamp = stampOf(readFileSync(join(ROOT, rel), 'utf8'));
      expect(stamp, `${rel} carries a stamp`).not.toBeNull();
      const receipt = receiptOf(stamp![2]!);
      expect(receipt, `${rel}: the stamp names a receipt`).not.toBeNull();
      expect(existsSync(join(RECEIPTS, receipt!)), `${rel}: the named receipt exists: ${receipt}`).toBe(true);
    }
  });

  it('no skill doc outside the roster carries a VERIFIED LIVE stamp (unstamped stamps are a lie)', () => {
    const owned = new Set(roster());
    for (const rel of allSkills()) {
      if (owned.has(rel)) continue;
      const md = readFileSync(join(ROOT, rel), 'utf8');
      expect(stampOf(md), `${rel} carries an unrostered VERIFIED LIVE stamp — seat it through row ${ROW_ID} first`).toBeNull();
    }
  });
});
