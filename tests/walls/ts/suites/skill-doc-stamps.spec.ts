// skill-doc-stamps — THE SERVED-DOC PROVENANCE BAN WALL (operator
// 2026-11-15: served docs are not skills — they are tied to files and
// cruft, and provenance like git history does not belong on them):
// agent docs are PROMPT MATERIAL served to LLM agents at runtime —
// they teach current capability law only. Provenance archaeology
// (VERIFIED LIVE stamps, receipt paths, run ids, dated operator
// orders, friction-report cites, commit shas) is BANNED from every
// served SKILL.md/AGENT.md; the forensic record lives in
// dev_docs/contracts/receipts, never in prompt copy. The pre-ban
// design judged stamps against real runs; the cure deleted every
// stamp, so the wall now enforces the ban itself — corpus-wide,
// derived by walk, no roster to rot.
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import YAML from 'yaml';

const ROOT = join(import.meta.dirname, '../../../..');
const ROW_ID = 'cards-skill-doc-stamps';

/** Every served agent doc under packages/ (the walk, not a hand list). */
function servedDocs(): string[] {
  const out: string[] = [];
  const walk = (dir: string): void => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name === 'SKILL.md' || e.name === 'AGENT.md') out.push(p);
    }
  };
  walk(join(ROOT, 'packages'));
  return out.map((p) => p.slice(ROOT.length + 1)).sort();
}

/** The registry row that owns the ban (the law's seat — read, never hand-edited). */
function rowDoc(): string {
  const doc = YAML.parse(
    readFileSync(join(ROOT, 'dev_docs/contracts/registry/cards-tier.yaml'), 'utf8'),
  ) as { rows?: Array<{ id?: string; invariant?: string }> };
  const row = (doc.rows ?? []).find((r) => r.id === ROW_ID);
  expect(row, `registry row ${ROW_ID} exists (seat it via the contract CLI, never by hand)`).toBeDefined();
  return row!.invariant ?? '';
}

const BANNED: ReadonlyArray<{ name: string; re: RegExp; why: string }> = [
  { name: 'VERIFIED LIVE stamp', re: /VERIFIED LIVE/, why: 'a stamp is provenance, not law — earn trust in dev_docs, teach law in the doc' },
  { name: 'receipt path', re: /receipts\/[a-z0-9-]+\.md/, why: 'receipt files are the forensic plane (dev_docs), never served prompt copy' },
  { name: 'run id', re: /run-[0-9a-f]+-[0-9a-f]+/, why: 'a historical run id teaches nothing an agent can press — teach the press shape' },
  { name: 'dated order', re: /2026-\d{2}-\d{2}|operator 2026/, why: 'dates and operator stamps are history; the law stands on its own' },
  { name: 'friction-report cite', re: /friction[- ]report #?\d+/, why: 'the report is the finding\'s home, not the doc\'s authority' },
  { name: 'commit sha', re: /commit [0-9a-f]{9}/, why: 'git history is not capability law' },
];

describe('THE SERVED-DOC PROVENANCE BAN WALL (agent docs teach law, never history)', () => {
  it('no served SKILL.md/AGENT.md carries any banned provenance pattern', () => {
    const docs = servedDocs();
    expect(docs.length, 'the walk finds the served corpus (a zero walk is a broken walk)').toBeGreaterThan(50);
    for (const rel of docs) {
      const md = readFileSync(join(ROOT, rel), 'utf8');
      for (const b of BANNED) {
        expect(b.re.test(md), `${rel} carries a ${b.name} — ${b.why}`).toBe(false);
      }
    }
  });

  it('the registry row states the ban (the law has a seat)', () => {
    const invariant = rowDoc();
    expect(invariant, 'the row names the ban').toMatch(/provenance|archaeology|stamp/i);
    expect(invariant, 'the row names the banned classes').toMatch(/receipt/i);
    expect(invariant, 'the row names the forensic plane').toMatch(/dev_docs/);
  });
});
