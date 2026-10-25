/**
 * packed-payload.spec.ts — THE F7 WALL (HMR audit 009, 2026-10-24):
 * "no wall pins the packed-tarball payload contract for the
 * HMR-relevant members — that `files` covers `lib/client.js` for
 * every client row, and that a `dsh.bundle.patch` target file
 * actually rides its tarball. A dropped member fails loud at
 * consumer boot — but only after publish."
 *
 * The judge is ONE function (scripts/lib/packed-payload.mjs
 * validatePackedTarball) riding the estate's own release gates
 * (G2/G3) over the PACKED BYTES. Seats:
 *   A. a complete tarball passes — the judge is not always-false.
 *   B. a client row whose ./lib/client.js member was dropped from
 *      `files` reds AT PACK naming the member (the audit's first
 *      named class).
 *   C. a dsh.bundle.patch declared but not packed reds naming the
 *      overlay (the audit's second named class).
 *   D. THE WIRING — pack-real-install.mjs calls the judge in its
 *      pack loop (the install path is the door the audit found
 *      ungated; the release path always owned the gates).
 */
import { describe, expect, it } from 'vitest'
import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const VALIDATOR = join(ROOT, 'scripts', 'lib', 'packed-payload.mjs')

interface Minted { tgz: string; base: string }

/** Mint a real tarball (tar czf) from a staged package dir. */
function mintTarball (name: string, members: Record<string, string>): Minted {
  const base = join(ROOT, 'node_modules', '.tmp', `packed-payload-${name}-${process.pid}`)
  const pkg = join(base, 'package')
  rmSync(base, { recursive: true, force: true })
  mkdirSync(pkg, { recursive: true })
  for (const [rel, text] of Object.entries(members)) {
    mkdirSync(dirname(join(pkg, rel)), { recursive: true })
    writeFileSync(join(pkg, rel), text)
  }
  const tgz = `${base}/fixture.tgz`
  execFileSync('tar', ['-czf', tgz, '-C', base, 'package'])
  return { tgz, base }
}

const OK_MANIFEST = JSON.stringify({
  name: '@melite/fixture',
  version: '0.0.0',
  type: 'module',
  main: './lib/index.js',
  exports: { '.': './lib/index.js', './client': './lib/client.js' },
}, null, 2)

describe('the F7 packed-payload judge', () => {
  it('A: a complete tarball passes (the judge is not always-false)', async () => {
    const { validatePackedTarball } = await import(VALIDATOR)
    const m = mintTarball('ok', {
      'package.json': OK_MANIFEST,
      'lib/index.js': 'export const x = 1\n',
      'lib/client.js': 'export const y = 2\n',
    })
    try {
      const r = validatePackedTarball(m.tgz)
      expect(r.inner.name).toBe('@melite/fixture')
      expect(r.listing).toContain('package/lib/client.js')
    } finally {
      rmSync(m.base, { recursive: true, force: true })
    }
  })

  it('B: a dropped client member reds at pack naming the export promise', async () => {
    const { validatePackedTarball } = await import(VALIDATOR)
    // `files` dropped lib/client.js — the manifest still promises it
    // (the audit's exact class: fails loud only at consumer boot).
    const m = mintTarball('client-missing', {
      'package.json': OK_MANIFEST,
      'lib/index.js': 'export const x = 1\n',
    })
    try {
      expect(() => validatePackedTarball(m.tgz))
        .toThrow(/exports "\.\/client" but the tarball does not contain it|does not contain/)
    } finally {
      rmSync(m.base, { recursive: true, force: true })
    }
  })

  it('C: a declared dsh.bundle.patch not packed reds naming the overlay', async () => {
    const { validatePackedTarball } = await import(VALIDATOR)
    const manifest = JSON.stringify({
      name: '@melite/fixture',
      version: '0.0.0',
      type: 'module',
      main: './lib/index.js',
      exports: { '.': './lib/index.js' },
      dsh: { bundle: { patch: './cordis.patch.yml' } },
    }, null, 2)
    const m = mintTarball('patch-missing', {
      'package.json': manifest,
      'lib/index.js': 'export const x = 1\n',
    })
    try {
      expect(() => validatePackedTarball(m.tgz))
        .toThrow('declares dsh.bundle.patch "./cordis.patch.yml" but does not pack it')
    } finally {
      rmSync(m.base, { recursive: true, force: true })
    }
  })

  it('D: the install path kills the pack when the judge reds (real subprocess)', () => {
    // THE REAL DOOR: spawn pack-real-install.mjs with PNPM stubbed to
    // serve a tarball whose client member was dropped. The judge must
    // kill the process on the FIRST package — exit 1, the payload
    // gate's voice, never a warn-and-continue into install.
    const manifest = JSON.stringify({
      name: '@melite/fixture',
      version: '0.0.0',
      type: 'module',
      main: './lib/index.js',
      exports: { '.': './lib/index.js', './client': './lib/client.js' },
    }, null, 2)
    const m = mintTarball('stub-pack', {
      'package.json': manifest,
      'lib/index.js': 'export const x = 1\n',
    })
    const tmp = join(ROOT, 'node_modules', '.tmp', `packed-payload-d-${process.pid}`)
    rmSync(tmp, { recursive: true, force: true })
    mkdirSync(join(tmp, 'profile'), { recursive: true })
    writeFileSync(join(tmp, 'profile', 'package.json'), '{"name":"stub-profile"}\n')
    // the stub "packs" by copying the bad fixture and echoing its
    // path — exactly pnpm pack's contract with the script.
    writeFileSync(join(tmp, 'pnpm-stub.sh'), [
      '#!/bin/sh',
      'case "$1" in',
      '  pack)',
      '    dest=""',
      '    for a in "$@"; do case "$prev" in --pack-destination) dest="$a";; esac; prev="$a"; done',
      `    cp ${JSON.stringify(m.tgz)} "$dest/stub-0.0.0.tgz"`,
      '    echo "$dest/stub-0.0.0.tgz"',
      '    ;;',
      'esac',
    ].join('\n'), { mode: 0o755 })
    let spawned: { status: number | null, stderr: string } | null = null
    try {
      const r = execFileSync(
        'node',
        [join(ROOT, 'scripts', 'pack-real-install.mjs'),
          '--profile', join(tmp, 'profile'),
          '--out', join(tmp, 'tarballs')],
        {
          encoding: 'utf8',
          env: { ...process.env, PNPM: join(tmp, 'pnpm-stub.sh') },
          stdio: ['ignore', 'pipe', 'pipe'],
        },
      )
      spawned = { status: 0, stderr: r }
    } catch (e) {
      const err = e as { status?: number, stderr?: string }
      spawned = { status: err.status ?? -1, stderr: err.stderr ?? '' }
    }
    expect(spawned.status, 'a payload violation kills the pack (exit 1)').toBe(1)
    expect(spawned.stderr, 'the gate names the dropped member').toContain('does not contain it')
  })
})
