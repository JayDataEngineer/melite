/**
 * THE REGISTRY-ACCEPTANCE GATE CANNOT LIE.
 *
 * tools/registry-acceptance.mjs is the content gate for a melite npm
 * registry: packument carries the version, packument integrity (sha512)
 * matches the served bytes, served bytes match the release manifest
 * (sha256), and a cold install lands the exact versions from the target
 * registry. A gate like this earns its green only if every one of its
 * failure modes is PROVEN to fail — here, against stub registries built
 * in-process on node:http (the same proofs run live against the estate
 * registry; these pin the gate's teeth).
 *
 * Each stub serves a two-row release manifest (@melite/gate-fixture-a,
 * @melite-plugin/gate-fixture-b — the plugin scope pins the name
 * derivation). Tarball bytes are real gzipped payloads so sha512/sha256
 * arithmetic is honest.
 */

import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { createServer, type Server } from 'node:http'
import { gzipSync } from 'node:zlib'
import { mkdtempSync, existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

const VERSION = '0.1.4-gate'
const ROWS = [
  { file: 'melite-gate-fixture-a-0.1.4-gate.tgz', name: '@melite/gate-fixture-a' },
  { file: 'melite-plugin-gate-fixture-b-0.1.4-gate.tgz', name: '@melite-plugin/gate-fixture-b' },
]

/** A REAL tar.gz fixture: npm unpacks tarballs, so gzip(JSON) won't do —
 * a minimal ustar with one entry, package/package.json, carrying the name
 * and version (all npm's resolver reads). */
function tarballFor(name: string): Buffer {
  const pkg = Buffer.from(JSON.stringify({ name, version: VERSION }))
  const header = Buffer.alloc(512)
  header.write('package/package.json', 0) // name[100]
  header.write('0000644\u0000', 100) // mode[8]
  header.write('0000000\u0000', 108) // uid[8]
  header.write('0000000\u0000', 116) // gid[8]
  header.write(pkg.length.toString(8).padStart(11, '0') + '\u0000', 124) // size[12]
  header.write('00000000000\u0000', 136) // mtime[12]
  header.write('        ', 148) // chksum[8] — spaces while summing
  header.write('0', 156) // typeflag: regular file
  header.write('ustar\u0000', 257) // magic[6]
  header.write('00', 263) // version[2]
  let sum = 0
  for (const b of header) sum += b
  header.write(sum.toString(8).padStart(6, '0') + '\u0000 ', 148)
  const data = Buffer.concat([pkg, Buffer.alloc((512 - (pkg.length % 512)) % 512)])
  return gzipSync(Buffer.concat([header, data, Buffer.alloc(1024)]))
}

interface Stub {
  url: string
  close: () => Promise<void>
}

/** One stub registry, parameterized by per-row tarball and packument overrides. */
async function stubRegistry(opts: {
  tarballOverride?: (row: (typeof ROWS)[number], payload: Buffer) => Buffer
  packumentOverride?: (row: (typeof ROWS)[number], doc: Record<string, unknown>) => Record<string, unknown>
}): Promise<Stub> {
  const rows = ROWS.map((row) => {
    const payload = opts.tarballOverride ? opts.tarballOverride(row, tarballFor(row.name)) : tarballFor(row.name)
    return {
      ...row,
      payload,
      integrity: `sha512-${createHash('sha512').update(payload).digest('base64')}`,
    }
  })
  const server: Server = createServer((req, res) => {
    const path = decodeURIComponent(req.url ?? '')
    if (path === '/-/ping') {
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ ok: true }))
      return
    }
    const row = rows.find((r) => path === `/${r.name}` || path.startsWith(`/${r.name}/-/`))
    if (!row) {
      res.writeHead(404, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ error: 'not_found' }))
      return
    }
    if (path === `/${row.name}`) {
      const inner = {
        name: row.name,
        version: VERSION,
        // npm opens dist.tarball as given — real registries emit ABSOLUTE
        // urls (a relative one is treated as a filesystem path, ENOENT).
        dist: { tarball: `http://${req.headers.host}/${row.name}/-/${row.file}`, integrity: row.integrity },
      }
      const doc = { name: row.name, versions: { [VERSION]: inner }, 'dist-tags': { latest: VERSION } }
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(JSON.stringify(opts.packumentOverride ? opts.packumentOverride(row, doc) : doc))
      return
    }
    res.writeHead(200, { 'content-type': 'application/octet-stream' })
    res.end(row.payload)
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const addr = server.address()
  const url = `http://127.0.0.1:${typeof addr === 'object' && addr ? addr.port : 0}`
  return { url, close: () => new Promise((resolve) => server.close(() => resolve())) }
}

function manifestDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'gate-manifest-'))
  writeFileSync(
    join(dir, 'release-manifest.json'),
    JSON.stringify({
      manifest: 1,
      tag: `v${VERSION}`,
      packages: ROWS.map((row) => {
        const payload = tarballFor(row.name)
        return {
          file: row.file,
          bytes: payload.length,
          sha256: createHash('sha256').update(payload).digest('hex'),
        }
      }),
    }),
  )
  return dir
}

function runGate(registry: string, from: string, extra: string[] = [], env: Record<string, string> = {}): Promise<{ code: number; out: string }> {
  return new Promise((resolve) => {
    // --no-install is the default; extra flags may override install behavior.
    const installFlags = extra.some((f) => f === '--packages') ? [] : ['--no-install']
    const child = spawn(
      process.execPath,
      [join(import.meta.dirname, '..', 'tools', 'registry-acceptance.mjs'), '--registry', registry, '--from', from, ...installFlags, ...extra],
      { stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, ...env } },
    )
    let out = ''
    child.stdout.on('data', (c: Buffer) => (out += c.toString()))
    child.stderr.on('data', (c: Buffer) => (out += c.toString()))
    child.on('close', (code) => resolve({ code: code ?? -1, out }))
  })
}

describe('registry-acceptance gate', () => {
  let from = ''
  beforeEach(() => (from = manifestDir()))
  afterEach(() => rmSync(from, { recursive: true, force: true }))

  it('accepts a truthful registry — both scopes, real payloads', async () => {
    const stub = await stubRegistry({})
    try {
      const { code, out } = await runGate(stub.url, from)
      expect(code, out).toBe(0)
      expect(out).toContain('all 2 rows accepted')
      expect(out).toContain('@melite/gate-fixture-a')
      expect(out).toContain('@melite-plugin/gate-fixture-b')
    } finally {
      await stub.close()
    }
  })

  it('fails when the served bytes drift from the manifest (sha256)', async () => {
    const stub = await stubRegistry({
      tarballOverride: (row, payload) => (row.name === '@melite/gate-fixture-a' ? gzipSync(Buffer.from('drifted bytes')) : payload),
    })
    try {
      const { code, out } = await runGate(stub.url, from)
      expect(code, out).not.toBe(0)
      expect(out).toContain('sha256 DRIFT')
    } finally {
      await stub.close()
    }
  })

  it('fails when the packument integrity does not match the served bytes (sha512)', async () => {
    const stub = await stubRegistry({
      packumentOverride: (row, doc) => {
        if (row.name !== '@melite/gate-fixture-a') return doc
        const inner = (doc.versions as Record<string, Record<string, unknown>>)[VERSION]
        return {
          ...doc,
          versions: {
            [VERSION]: {
              ...inner,
              dist: { ...(inner.dist as Record<string, unknown>), integrity: `sha512-${createHash('sha512').update('other').digest('base64')}` },
            },
          },
        }
      },
    })
    try {
      const { code, out } = await runGate(stub.url, from)
      expect(code, out).not.toBe(0)
      expect(out).toContain('sha512 MISMATCH')
    } finally {
      await stub.close()
    }
  })

  it('fails when a packument is missing', async () => {
    const stub = await stubRegistry({
      packumentOverride: (row, doc) => (row.name === '@melite-plugin/gate-fixture-b' ? { name: row.name, versions: {} } : doc),
    })
    try {
      const { code, out } = await runGate(stub.url, from)
      expect(code, out).not.toBe(0)
      expect(out).toContain(`packument lacks version ${VERSION}`)
    } finally {
      await stub.close()
    }
  })

  it('fails clean on a dead registry — a named gate failure, not a crash', async () => {
    const { code, out } = await runGate('http://127.0.0.1:1', from)
    expect(code).not.toBe(0)
    expect(out).toContain('packument unreachable')
  })

  it('refuses to run without a release manifest (usage, exit 2)', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'gate-empty-'))
    try {
      const { code, out } = await runGate('http://127.0.0.1:1', dir)
      expect(code).toBe(2)
      expect(out).toContain('usage:')
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('cold-installs INTO the probe dir — never a parent tree (the /tmp false green)', async () => {
    const stub = await stubRegistry({})
    try {
      // MELITE_ACCEPT_KEEP keeps the probe dir; its path is printed.
      const { code, out } = await runGate(stub.url, from, ['--packages', '@melite/gate-fixture-a'], { MELITE_ACCEPT_KEEP: '1' })
      expect(code, out).toBe(0)
      const kept = /kept for inspection: (\S+?)\)/.exec(out)?.[1]
      expect(kept, 'kept dir path printed').toBeTruthy()
      const probePkg = join(kept!, 'node_modules', '@melite', 'gate-fixture-a', 'package.json')
      expect(existsSync(probePkg), `probe installed at ${probePkg}`).toBe(true)
      expect(JSON.parse(readFileSync(probePkg, 'utf8')).version).toBe(VERSION)
      // and nothing leaked into /tmp/node_modules from this run
      expect(existsSync('/tmp/node_modules/@melite/gate-fixture-a')).toBe(false)
    } finally {
      await stub.close()
    }
  }, 60_000)

  it('fails when the install itself fails (package absent at install time)', async () => {
    const stub = await stubRegistry({})
    try {
      const { code, out } = await runGate(stub.url, from, ['--packages', '@melite/gate-fixture-a,@melite/gate-absent'])
      expect(code, out).not.toBe(0)
      expect(out).toContain('npm install failed')
    } finally {
      await stub.close()
    }
  }, 60_000)
})
