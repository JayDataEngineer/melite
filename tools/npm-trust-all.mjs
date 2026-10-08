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
const dir = fromIdx >= 0 ? args[fromIdx + 1] : '/var/tmp/melite-0.1.4-alpha-set';

const tgz = readdirSync(dir).filter((f) => f.endsWith('.tgz'));
if (tgz.length === 0) {
  console.error(`no tarballs in ${dir} — pass --from <dir>`);
  process.exit(1);
}
const names = tgz.map((f) =>
  JSON.parse(execFileSync('tar', ['-xzOf', join(dir, f), 'package/package.json']).toString()).name);

console.log(`${dry ? '[dry] ' : ''}trusting ${names.length} package names on ${REPO}/${WORKFLOW} (env ${ENV})`);

let ok = 0;
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
    // Stop at the FIRST refusal. A 2FA-elevation expiry or a permission
    // error means the sitting is over — never grind the operator for a
    // challenge per row.
    console.error(`refused on ${name}:`);
    console.error(String(err.stderr || err.message).trim().split('\n').slice(-4).join('\n'));
    console.error(`\nstopped after ${ok}/${names.length}. Re-run once a fresh challenge is answered.`);
    process.exit(2);
  }
}
console.log(`trusted ${ok}/${names.length} — every future publish of these names is unmetered OIDC`);
