#!/usr/bin/env node
// Create trusted-publisher rows for every package this repo ships, in
// one sitting. Run it after a single 2FA challenge has been answered
// (npm grants a short elevation window); it stops at the first refusal
// so a challenge-per-row registry never burns the operator's time.
//
//   node tools/npm-trust-all.mjs [--from <dir-with-tgz>] [--dry]
//
// The rows name this repository's release-publish workflow and the
// npm-publish environment, so the publish job's OIDC identity matches
// exactly. Rows are per package NAME, created once — every future
// version of a trusted name publishes unmetered, with no token.
import { execFileSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';

const REPO = 'JayDataEngineer/melite';
const WORKFLOW = 'release-publish.yml';
const ENV = 'npm-publish';

const args = process.argv.slice(2);
const dry = args.includes('--dry');
const fromIdx = args.indexOf('--from');
const dir = fromIdx >= 0 ? args[fromIdx + 1] : '/var/tmp/melite-0.1.5-pre-alpha-set';

const tgz = readdirSync(dir).filter((f) => f.endsWith('.tgz'));
if (tgz.length === 0) {
  console.error(`no tarballs in ${dir} — pass --from <dir>`);
  process.exit(1);
}
const names = tgz.map((f) =>
  JSON.parse(execFileSync('tar', ['-xzOf', join(dir, f), 'package/package.json']).toString()).name);

console.log(`${dry ? '[dry] ' : ''}trusting ${names.length} package names on ${REPO}/${WORKFLOW} (env ${ENV})`);

let ok = 0;
const deferred = [];
for (const name of names) {
  if (dry) {
    console.log(`[dry] npm trust github ${name}`);
    ok++;
    continue;
  }
  try {
    execFileSync('npm', [
      'trust', 'github', name,
      '--repo', REPO, '--file', WORKFLOW, '--env', ENV,
      '--allow-publish', '-y',
    ], { stdio: ['ignore', 'pipe', 'pipe'] });
    ok++;
    console.log(`ok ${name}`);
  } catch (err) {
    const out = String(err.stderr || err.message);
    if (out.includes('409')) {
      // The row already exists — a prior sitting created it.
      ok++;
      console.log(`already ${name}`);
      continue;
    }
    if (out.includes('404')) {
      // The trust endpoint only knows registry-live names; a name that
      // has not landed yet (the metered walk still owns it) is deferred
      // to the next run after it publishes.
      deferred.push(name);
      console.log(`deferred ${name} (not on the registry yet)`);
      continue;
    }
    // An auth refusal (2FA elevation gone or permission lost) ends the
    // sitting — never grind the operator for a challenge per row.
    console.error(`refused on ${name}:`);
    console.error(out.trim().split('\n').slice(-4).join('\n'));
    console.error(`\nstopped after ${ok}/${names.length}. Re-run once a fresh challenge is answered.`);
    process.exit(2);
  }
}
if (deferred.length > 0) {
  console.log(`\ndeferring ${deferred.length} names until the walk lands them:`);
  console.log(deferred.join(' '));
}
console.log(`trusted ${ok}/${names.length} — every future publish of these names is unmetered OIDC`);
