// dts-rewriter.spec.ts — THE REWRITER'S OWN WALL (the missing-tests
// audit's finding #1, 2026-11-06): scripts/rewrite-dts-specifiers.mjs
// was run by hand once (bd3c3754d's bare-tsc sweep cure), tested by
// nothing, and wired into nothing — the exact repeat wedge (a
// freshness sweep rebuilds with bare tsc, the d.ts wall reds weeks
// later) had no enforcement. This wall drives the REAL subprocess
// over real trees (DEPTH — never a frozen literal), and pins the
// ship lane's wiring (the pass must fire after every emit).
import { describe, it, afterAll } from 'vitest';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

// process.cwd(), not import.meta.url: the runner's transform can
// virtualize the spec's own URL; the whole harness runs from the
// repo root (every other wall assumes it).
const ROOT = process.cwd();
const TOOL = join(ROOT, 'scripts', 'rewrite-dts-specifiers.mjs');

const run = (arg: string) =>
  spawnSync(process.execPath, [TOOL, arg], { encoding: 'utf8' });

let TMPS: string[] = [];
afterAll(() => {
  for (const d of TMPS) rmSync(d, { recursive: true, force: true });
});
const tmpPkg = (): string => {
  const d = mkdtempSync(join(tmpdir(), 'dts-rewriter-'));
  TMPS.push(d);
  mkdirSync(join(d, 'lib'));
  return d;
};

describe('THE D.TS REWRITER (audit finding 1, 2026-11-06): tested + wired', () => {
  it('rewrites every relative .ts specifier in emitted d.ts (both spellings: from + dynamic import)', () => {
    const pkg = tmpPkg();
    writeFileSync(join(pkg, 'lib', 'a.d.ts'),
      'export { x } from "./y.ts";\nexport type T = import("./z.ts").T;\nexport { w } from \'../dir/w.ts\';\n');
    const r = run(pkg);
    assert.equal(r.status, 0, 'the tool exits 0 on a happy pass');
    const after = readFileSync(join(pkg, 'lib', 'a.d.ts'), 'utf8');
    assert.ok(after.includes('from "./y.js"'), 'the from-spelling rewrites');
    assert.ok(after.includes('import("./z.js")'), 'the dynamic-import spelling rewrites');
    assert.ok(after.includes("from '../dir/w.js'"), 'parent-relative rewrites, quote style kept');
    assert.ok(!after.includes('.ts"') && !after.includes(".ts'"), 'no relative .ts specifier survives');
    assert.match(String(r.stdout), /1 d\.ts walked, 1 rewritten/);
  });

  it('touches NOTHING else (bare specifiers, .js specifiers, non-d.ts files stay byte-identical)', () => {
    const pkg = tmpPkg();
    // a package-name specifier, an already-.js specifier, a dynamic
    // import of a package, and a non-d.ts file carrying .ts text
    const dts = 'export { a } from "@melite/card-base/client";\nexport { b } from "./ok.js";\nexport type Q = import("@melite/contracts").Q;\n';
    const js = 'export const s = "from \'./x.ts\'"; // a string, never a specifier\n';
    writeFileSync(join(pkg, 'lib', 'keep.d.ts'), dts);
    writeFileSync(join(pkg, 'lib', 'keep.js'), js);
    const r = run(pkg);
    assert.equal(r.status, 0);
    assert.equal(readFileSync(join(pkg, 'lib', 'keep.d.ts'), 'utf8'), dts,
      'bare and .js specifiers untouched');
    assert.equal(readFileSync(join(pkg, 'lib', 'keep.js'), 'utf8'), js,
      'non-d.ts files untouched (the walk judges names, not contents)');
    assert.match(String(r.stdout), /1 d\.ts walked, 0 rewritten/);
  });

  it('is idempotent (a second pass rewrites zero)', () => {
    const pkg = tmpPkg();
    writeFileSync(join(pkg, 'lib', 'a.d.ts'), 'export { x } from "./y.ts";\n');
    assert.equal(run(pkg).status, 0);
    const once = readFileSync(join(pkg, 'lib', 'a.d.ts'), 'utf8');
    const second = run(pkg);
    assert.equal(second.status, 0);
    assert.equal(readFileSync(join(pkg, 'lib', 'a.d.ts'), 'utf8'), once, 'byte-stable');
    assert.match(String(second.stdout), /0 rewritten/, 'the counter proves the zero');
  });

  it('walks nested lib/ trees', () => {
    const pkg = tmpPkg();
    mkdirSync(join(pkg, 'lib', 'ui', 'deep'), { recursive: true });
    writeFileSync(join(pkg, 'lib', 'ui', 'deep', 'b.d.ts'), 'export { y } from "../../root.ts";\n');
    const r = run(pkg);
    assert.equal(r.status, 0);
    assert.ok(readFileSync(join(pkg, 'lib', 'ui', 'deep', 'b.d.ts'), 'utf8')
      .includes('"../../root.js"'), 'the nested d.ts rewrote');
  });

  it('refuses a missing argv with the usage line, exit 1', () => {
    const r = spawnSync(process.execPath, [TOOL], { encoding: 'utf8' });
    assert.equal(r.status, 1);
    assert.match(String(r.stderr), /usage: node scripts\/rewrite-dts-specifiers\.mjs <package-dir>/);
  });

  it('refuses a package with no lib/ LOUDLY (a silent zero would green a pass over nothing)', () => {
    const pkg = mkdtempSync(join(tmpdir(), 'dts-rewriter-empty-'));
    TMPS.push(pkg);
    const r = run(pkg);
    assert.equal(r.status, 1, 'never exit 0 without walking anything');
    assert.match(String(r.stderr), /no lib\/ under .+ — build the package first/);
  });

  it('THE WIRING PIN: the ship lane runs the pass after every compiled emit (the repeat wedge dies)', () => {
    const lane = readFileSync(join(ROOT, 'scripts', 'ship-lane.sh'), 'utf8');
    const compiledLoop = lane.slice(lane.indexOf('for p in "${COMPILED[@]}"; do'));
    assert.ok(compiledLoop.includes('rewrite-dts-specifiers.mjs'),
      'the compiled build loop invokes the rewrite pass');
    const buildAt = compiledLoop.indexOf('tsconfig.json >');
    const rewriteAt = compiledLoop.indexOf('rewrite-dts-specifiers.mjs');
    const stampAt = compiledLoop.indexOf('write_stamp "$p"');
    assert.ok(buildAt >= 0 && rewriteAt > buildAt && stampAt > rewriteAt,
      'the order is emit → rewrite → stamp (a stamp over un-rewritten d.ts lies)');
    assert.ok(lane.includes('"$REPO/scripts/rewrite-dts-specifiers.mjs" "$p"'),
      'the lane passes the repo-relative package dir (the run-from-root law)');
  });

  it('THE ARTIFACT HALF — the pass over this tree exits clean: no emitted d.ts in this tree names a relative .ts specifier', () => {
    // the artifact half is judged by gate-regressions' census; this
    // arm proves the PASS was run over every compiled package in
    // this tree — the tool over each real package dir exits 0
    // (a flipped d.ts makes this red the moment it lands)
    const pkgs = ['packages/harness/estate-queue', 'packages/web/infer-gallery'];
    for (const p of pkgs) {
      const r = run(p);
      assert.equal(r.status, 0, `${p}: the pass exits 0 over the built tree`);
      assert.match(String(r.stdout), /0 rewritten/, `${p}: the committed d.ts are already clean`);
    }
  });
});
