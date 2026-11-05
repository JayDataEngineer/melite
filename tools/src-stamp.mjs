#!/usr/bin/env node
/** src-stamp.mjs — THE NODE-NATIVE SRC-STAMP DERIVATION (CI class B R1,
 *  2026-10-31: the stamp recipe shelled out — build-plane.mjs
 *  writeSrcStamp spawnSync'd `bash -c "find src ... | LC_ALL=C sort |
 *  xargs sha256sum ..."` and two walls mirrored the same pipeline —
 *  and the shell collation (LC_ALL=C vs the ambient locale, windows
 *  find.exe resolving before GNU find, `LC_ALL=C` dying as a command
 *  under cmd.exe) made the stamp builder-dependent. This module
 *  derives the stamp IN-PROCESS: crypto over the deterministic input
 *  set (every .ts/.tsx under src/, forward-slash relpaths,
 *  byte-order sort), hashed EXACTLY as sha256sum spells its lines, so
 *  the value is byte-identical to the shell recipe's on every OS.
 *  ONE implementation: tools/build-plane.mjs writeSrcStamp and the
 *  stamp walls (client-bundle-freshness, estate-singleton-law,
 *  emit-determinism) all consume deriveSrcStamp().
 *  scripts/ship-lane.sh stamp_src and scripts/lib/lane-freshness.sh
 *  stay the shell oracles by design (shell-native seats) — the parity
 *  arm in emit-determinism.spec.ts keeps node === shell honest, so a
 *  recipe drift reds there instead of degrading a stamp silently.
 */
import { createHash } from 'node:crypto'
import { readdirSync, readFileSync, existsSync, realpathSync } from 'node:fs'
import { join } from 'node:path'
import { argv, exit } from 'node:process'
import { fileURLToPath } from 'node:url'

/** The stamp input set: what `find src \( -name '*.ts' -o -name
 *  '*.tsx' \)` enumerates — case-sensitive fnmatch, no pruning, no
 *  symlink-following (readdirSync lists the link itself; a link is
 *  hashed by TARGET bytes through readFileSync, exactly as sha256sum
 *  follows its argv links — byte-identical while no src tree carries
 *  a link whose name sorts differently from its target, and the
 *  parity arm would catch such a tree). Relpaths ride FORWARD
 *  slashes, the find-on-linux spelling the committed stamps carry. */
function collectSrcFiles(pkgDir) {
  const srcDir = join(pkgDir, 'src')
  const out = []
  const walk = (dir, rel) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const childRel = rel === '' ? entry.name : rel + '/' + entry.name
      if (entry.isDirectory()) {
        walk(join(dir, entry.name), childRel)
      } else if (/\.tsx?$/.test(entry.name)) {
        out.push(childRel)
      }
    }
  }
  walk(srcDir, '')
  return out
}

/** Byte-order sort — the LC_ALL=C law: LC_ALL=C collation compares
 *  raw bytes, and UTF-8 preserves code-point order byte-wise, so
 *  Buffer.compare over UTF-8 bytes IS the C-locale sort for every
 *  representable filename (a JS default sort compares UTF-16 code
 *  units and mis-orders astral-plane names — the parity arm's
 *  mixed-case synthetic tree pins the ASCII face of this). */
function byteSort(paths) {
  return paths.sort((a, b) => Buffer.compare(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8')))
}

/** Derive the 16-hex-char src stamp for a package dir (must carry a
 *  src/ tree). The line format is sha256sum's own text-mode
 *  spelling — `<hex><two spaces>src/<relpath>\n` — and the stamp is
 *  the sha256 of the concatenation, first 16 hex chars: the exact
 *  bytes `... | xargs sha256sum | sha256sum | cut -c1-16` produces
 *  (parity-proved in emit-determinism.spec.ts, node === shell). */
export function deriveSrcStamp(pkgDir) {
  const files = byteSort(collectSrcFiles(pkgDir))
  const hash = createHash('sha256')
  for (const rel of files) {
    const fileHash = createHash('sha256').update(readFileSync(join(pkgDir, 'src', ...rel.split('/')))).digest('hex')
    hash.update(`${fileHash}  src/${rel}\n`)
  }
  return hash.digest('hex').slice(0, 16)
}

/** CLI seat (the census R1 shape): `node tools/src-stamp.mjs
 *  <pkgDir>` prints the stamp — the day a shell seat (ship-lane.sh,
 *  lane-freshness.sh) wants ONE implementation it calls here. The
 *  direct-run probe compares argv[1] against this module's own path,
 *  so importing the module never fires the CLI. */
const invoked = (() => {
  try {
    return realpathSync(argv[1]) === realpathSync(fileURLToPath(import.meta.url))
  } catch {
    return false
  }
})()
if (invoked) {
  const pkgDir = argv[2]
  if (pkgDir === undefined || !existsSync(join(pkgDir, 'src'))) {
    console.error('src-stamp: refusing — no src/ under ' + String(pkgDir))
    exit(1)
  }
  process.stdout.write(deriveSrcStamp(pkgDir) + '\n')
}
