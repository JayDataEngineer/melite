#!/usr/bin/env node
// lane-sync — the ONE command for the melite-test lane (:3088).
//
//   node scripts/lane-sync.mjs
//
// Mirror the operator's live web-profile rows into the lane's rows file,
// render the profile with estate-provision, restart the seat, wait for the
// fresh boot token, and run the GUI gates (tests/drives/gui-model-picker.mjs,
// tests/drives/gui-media-restore.mjs).
// Idempotent: if the mirrored rows are unchanged the render still runs but
// the mirror step prints "unchanged".
//
// Flags (the operator no-env law, 2026-11-16 — the promote-prod
// shape): --profile P (default melite-test), --dsh-home HOME
// (default ~/.dsh-dev), --route ROUTE (default
// zai/glm-5.3-flash), --web-profile PATCH (default
// ~/.dsh/profiles/web/cordis.patch.yml), --skip-gate to skip the
// GUI gate. Defaults are the historical single lane, byte-identical
// when no flags are passed.
//
// CWD LAW: every child spawn below resolves relative paths from the repo
// root (the cold-start drive resolves tools/ from process.cwd() — firing it
// from anywhere else is how drive A6 died).

// Mechanical port of the retired lane-sync.sh; runOrExit/capture carry the
// set -e / $( ) semantics below.
import { spawnSync } from 'node:child_process';
import { copyFileSync, lstatSync, readdirSync, readFileSync, renameSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SIGNAL_NUMBERS = { SIGHUP: 1, SIGINT: 2, SIGQUIT: 3, SIGKILL: 9, SIGTERM: 15, SIGUSR1: 10, SIGUSR2: 12, SIGPIPE: 13 };

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function out(message) {
  process.stdout.write(message + '\n');
}

function fail(message, code = 1) {
  process.stderr.write(message + '\n');
  process.exit(code);
}

// $? as bash reports it: command-not-found is 127, a signal death is 128+sig.
function childExitCode(result, cmd) {
  if (result.error) {
    process.stderr.write(`${cmd}: command not found\n`);
    return 127;
  }
  if (result.status === null) return 128 + (SIGNAL_NUMBERS[result.signal] ?? 0);
  return result.status;
}

// set -e analog: run a foreground child; any nonzero status ends the script with it.
function runOrExit(cmd, args, opts = {}) {
  const result = spawnSync(cmd, args, {
    stdio: opts.stdoutIgnore ? ['inherit', 'ignore', 'inherit'] : 'inherit',
    ...(opts.env ? { env: opts.env } : {}),
  });
  const status = childExitCode(result, cmd);
  if (status !== 0) process.exit(status);
  return result;
}

// $(cmd ...) || true analog: trimmed stdout, failures never fatal.
function capture(cmd, args) {
  const result = spawnSync(cmd, args, { stdio: ['ignore', 'pipe', 'inherit'] });
  if (result.error) return '';
  return (result.stdout ?? Buffer.alloc(0)).toString().trim();
}

function isFile(p) {
  try {
    return statSync(p).isFile();
  } catch {
    return false;
  }
}

function isDir(p) {
  try {
    return statSync(p).isDirectory();
  } catch {
    return false;
  }
}

// awk record semantics: a trailing newline does not open a final empty line.
function splitLines(content) {
  const lines = content.split('\n');
  if (lines[lines.length - 1] === '') lines.pop();
  return lines;
}

// head -n N: the first N lines, each with its original terminator.
function headLines(content, n) {
  let taken = '';
  let pos = 0;
  for (let line = 0; line < n; line += 1) {
    const nl = content.indexOf('\n', pos);
    if (nl === -1) {
      taken += content.slice(pos);
      break;
    }
    taken += content.slice(pos, nl + 1);
    pos = nl + 1;
  }
  return taken;
}

// mv across filesystems has no EXDEV refusal; rename alone does.
function moveOver(from, to) {
  try {
    renameSync(from, to);
  } catch (error) {
    if (error.code !== 'EXDEV') throw error;
    copyFileSync(from, to);
    unlinkSync(from);
  }
}

// grep -o 'token=[A-Za-z0-9_-]*' "$BOOT_LOG" 2>/dev/null | tail -1 | cut -d= -f2 || true
function lastToken(logPath) {
  let content;
  try {
    content = readFileSync(logPath, 'utf8');
  } catch {
    return '';
  }
  const matches = content.match(/token=[A-Za-z0-9_-]*/g);
  if (!matches || matches.length === 0) return '';
  return matches[matches.length - 1].split('=')[1] ?? '';
}

// bash glob of directories; symlinked directories qualify like packages/*/.
function listDirs(dir) {
  try {
    return readdirSync(dir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() || (entry.isSymbolicLink() && isDir(path.join(dir, entry.name))))
      .map((entry) => entry.name)
      .sort();
  } catch {
    return [];
  }
}

// find "$dir" -name '*<suffix>' -printf '%T@\n' | sort -n | tail -1 — find never
// descends symlinked directories and %T@ lstats the match itself.
function newestMtime(root, suffix) {
  let newest = null;
  const walk = (dir) => {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const p = path.join(dir, entry.name);
      if (entry.name.endsWith(suffix)) {
        try {
          const mtime = lstatSync(p).mtimeMs / 1000;
          if (newest === null || mtime > newest) newest = mtime;
        } catch {
          // find 2>/dev/null
        }
      }
      if (entry.isDirectory()) walk(p);
    }
  };
  walk(root);
  return newest;
}

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const git = spawnSync('git', ['-C', path.join(SCRIPT_DIR, '..'), 'rev-parse', '--show-toplevel'], { stdio: ['ignore', 'pipe', 'inherit'] });
const gitStatus = childExitCode(git, 'git');
if (gitStatus !== 0) process.exit(gitStatus);
process.chdir(git.stdout.toString().trim());

// ── flags (the no-env law) ────────────────────────────────────────
if (process.env.HOME === undefined) fail('HOME: unbound variable');
let PROFILE = 'melite-test';
// The seat is the PRIMARY brain (zai/glm-5.3-flash, same as :3080's
// agent route). It sat on the muse FALLBACK until 2026-10-20 —
// every lane-sync re-pin stuck the lane on muse and the rate-limit
// "switch back" never reached it (owner report 2026-10-20). --route
// still overrides for a deliberate muse seat.
let ROUTE = 'zai/glm-5.3-flash';
let DSH_HOME = path.join(process.env.HOME, '.dsh-dev');
let WEB_PROFILE = path.join(process.env.HOME, '.dsh/profiles/web/cordis.patch.yml');
let SKIP_GATE = 0;
const NEEDS_VALUE = {
  '--profile': '--profile needs a profile name',
  '--dsh-home': '--dsh-home needs the dsh home',
  '--route': '--route needs provider/model',
  '--web-profile': '--web-profile needs a patch file',
};
const argv = process.argv.slice(2);
let i = 0;
while (i < argv.length) {
  const flag = argv[i];
  if (flag === '--skip-gate') {
    SKIP_GATE = 1;
    i += 1;
    continue;
  }
  if (flag in NEEDS_VALUE) {
    const value = argv[i + 1];
    // ${2:?word}: unset OR empty refuses with exit 1.
    if (value === undefined || value === '') fail(NEEDS_VALUE[flag]);
    if (flag === '--profile') PROFILE = value;
    else if (flag === '--dsh-home') DSH_HOME = value;
    else if (flag === '--route') ROUTE = value;
    else WEB_PROFILE = value;
    i += 2;
    continue;
  }
  fail(`lane-sync: unknown argument ${flag} (lawful: --profile P | --dsh-home HOME | --route ROUTE | --web-profile PATCH | --skip-gate)`, 2);
}
const ROWS = 'dev_docs/deployment/studio-lane-rows.yml';
const BOOT_LOG = path.join(DSH_HOME, `${PROFILE}-3088.log`);
const URL = 'http://127.0.0.1:3088';

if (!isFile(WEB_PROFILE)) fail(`lane-sync: web profile missing: ${WEB_PROFILE}`);
if (!isFile(ROWS)) fail(`lane-sync: rows file missing: ${ROWS}`);

// 0) STALE-LIB GATE (2026-10-11): the lane loads workspace packages by
//    symlink, so the RENDER carries whatever lib/ sits next to src/ — a
//    committed src that never got rebuilt ships as old law (the wall-less
//    managePlane served 34.8GB family totals for narrowed asks for two
//    days because estate-queue/lib predated the file→items wall and its
//    build had been silently failing on a stale comfyui-cordis .d.ts).
//    Any bundled package whose newest src file outruns its newest lib
//    file refuses the sync HERE, before the seat restarts onto old code.
let stale = '';
const packageDirs = [];
for (const name of listDirs('packages')) packageDirs.push([`packages/${name}`, `packages/${name}/`]);
for (const a of listDirs('packages')) {
  for (const b of listDirs(`packages/${a}`)) packageDirs.push([`packages/${a}/${b}`, `packages/${a}/${b}/`]);
}
for (const [dir, globDir] of packageDirs) {
  if (!isDir(`${dir}/src`) || !isDir(`${dir}/lib`)) continue;
  const srcNewest = newestMtime(`${dir}/src`, '.ts');
  const libNewest = newestMtime(`${dir}/lib`, '.js');
  if (srcNewest === null || libNewest === null) continue;
  if (!(srcNewest > libNewest + 2)) continue;
  stale += ` ${globDir}`;
}
if (stale !== '') fail(`lane-sync: FAIL — src newer than lib (rebuild before serving):${stale}`);
out('lane-sync: stale-lib gate clean');

const oldToken = lastToken(BOOT_LOG);

// 1) MIRROR — keep the file's existing header, splice the web profile's
//    rows verbatim from its first top-level row. A row whose block binds
//    `!!js ctx.` stays web-owned (ctx rows cannot resolve on this lane);
//    env-`!!js` rows ride fine.
const rowsContent = readFileSync(ROWS, 'utf8');
const webProfileContent = readFileSync(WEB_PROFILE, 'utf8');
const firstRowLine = splitLines(rowsContent).findIndex((line) => /^- id: /.test(line));
if (firstRowLine === -1) fail(`head: invalid number of lines: `);
const tmpRows = '/tmp/lane-sync-rows.yml';
const rowLineCount = (content) => splitLines(content).filter((line) => /^- id: /.test(line)).length;
// awk: buffer row blocks; a block touching `!!js` + `ctx.` is dropped whole.
const spliceRowBlocks = (content) => {
  let buf = '';
  let skip = false;
  let emitted = '';
  for (const line of splitLines(content)) {
    if (/^- id: /.test(line)) {
      if (buf !== '' && !skip) emitted += buf;
      buf = line + '\n';
      skip = false;
      continue;
    }
    buf += line + '\n';
    if (line.includes('!!js') && line.includes('ctx.')) skip = true;
  }
  if (buf !== '' && !skip) emitted += buf;
  return emitted;
};
const newRows = headLines(rowsContent, firstRowLine) + spliceRowBlocks(webProfileContent);
writeFileSync(tmpRows, newRows);
if (readFileSync(ROWS).equals(readFileSync(tmpRows))) {
  out(`lane-sync: mirror unchanged (${rowLineCount(rowsContent)} rows)`);
} else {
  moveOver(tmpRows, ROWS);
  out(`lane-sync: mirror updated (${rowLineCount(newRows)} rows)`);
}

// 2) RENDER — estate-provision is the only sanctioned writer of $DSH_HOME.
runOrExit('node', [
  'packages/harness/provisioner/bin/infer-provision.mjs',
  'profile',
  PROFILE,
  '--dsh-home',
  DSH_HOME,
  '--estate-agent-route',
  ROUTE,
  '--profile-rows',
  ROWS,
], { stdoutIgnore: true });
out(`lane-sync: rendered ${PROFILE} into ${DSH_HOME} (route ${ROUTE})`);

// 3) RESTART + 4) WAIT for the fresh boot token (the boot rotates it).
runOrExit('systemctl', ['--user', 'restart', `dsh-${PROFILE}.service`]);
process.stdout.write('lane-sync: waiting for fresh boot');
let fresh = '';
for (let round = 0; round < 45; round += 1) {
  await sleep(3000);
  process.stdout.write('.');
  fresh = lastToken(BOOT_LOG);
  if (fresh !== '' && fresh !== oldToken) break;
}
process.stdout.write('\n');
if (!(fresh !== '' && fresh !== oldToken)) fail(`lane-sync: FAIL — no fresh token appeared in ${BOOT_LOG}`);
// Shell must actually answer the token handshake.
let code = '';
for (let round = 0; round < 20; round += 1) {
  code = capture('curl', ['-sk', '-o', '/dev/null', '-w', '%{http_code}', `${URL}/?token=${fresh}`]);
  if (code === '303' || code === '200') break;
  await sleep(2000);
}
out(`lane-sync: seat up — ${URL}/?token=${fresh}`);

// 5a) ESTATE WARM WAIT — the DSH remote proxy answers 503 on every /v1/bench
// read until the estate queue seats (observed 2026-10-11: the media gate ran
// cold, ensure 503'd, and the restore chain read as dead). Warmth is NOT
// traffic-driven — it lands 3-5 min after boot on its own clock, so the wait
// must outlast it. A probe against a bench key that cannot exist returns 404
// once the queue is seated, 503 while it is not — that is the discriminator.
// Reuse one cookie jar for the token handshake the probe needs.
spawnSync('curl', ['-sk', '-c', '/tmp/lane-sync-jar', '-o', '/dev/null', `${URL}/?token=${fresh}`], { stdio: 'ignore' });
let wcode = '503';
for (let round = 0; round < 180; round += 1) {
  wcode = capture('curl', ['-sk', '-b', '/tmp/lane-sync-jar', '-o', '/dev/null', '-w', '%{http_code}', `${URL}/v1/bench/lane-sync-warmup-probe`]);
  if (wcode === '404' || wcode === '200') break;
  await sleep(2000);
}
out(`lane-sync: estate warm (bench probe: ${wcode})`);
if (wcode !== '404' && wcode !== '200') process.stderr.write(`lane-sync: WARN — estate bench door still cold (${wcode}); gates may race\n`);

// 5) GATE — the operator's law: if it shows in the GUI, it gets tested.
if (SKIP_GATE !== 1) {
  runOrExit('node', ['tests/drives/gui-model-picker.mjs'], { env: { ...process.env, GUI_TOKEN: fresh } });
  runOrExit('node', ['tests/drives/gui-media-restore.mjs'], { env: { ...process.env, GUI_TOKEN: fresh } });
}
out(`lane-sync: DONE — ${URL}/?token=${fresh}`);
