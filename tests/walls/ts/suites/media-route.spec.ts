import { test } from 'vitest'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, symlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Context, Service } from '@deepseek-ai/cordis'
import type { Plugin } from '@deepseek-ai/cordis'

/** THE MEDIA WALL (the /v1/assets face's DSH-native replacement):
 *  run artifacts served same-origin from the queue seat's own runs
 *  tree — happy path streams bytes with the content-type, the
 *  confinement grammar rejects bad run ids / .. / rooted names with
 *  LOUD 404s, HEAD answers headers only, non-GET/HEAD is 405, and
 *  an absent queue seat is a LOUD 502 naming the fix (the gallery's
 *  optional-dependency law — never a fallback absorbing it). */

class FakeRes {
  status = 0
  headers: Record<string, string> = {}
  chunks: Buffer[] = []
  ended = false
  destroyed = false
  writeHead(status: number, headers: Record<string, string>): FakeRes {
    this.status = status
    this.headers = headers
    return this
  }
  write(chunk: Buffer | string): boolean {
    this.chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
    return true
  }
  end(body?: Buffer | string): FakeRes {
    if (body !== undefined) this.write(body)
    this.ended = true
    return this
  }
  on(): FakeRes { return this }
  once(): FakeRes { return this }
  destroy(): void { this.destroyed = true }
  body(): Buffer {
    return Buffer.concat(this.chunks)
  }
}

/** The minimal webServer service (register captures the rows). */
class FakeWebServer extends Service {
  captured: { route: string; handler: (req: { url?: string; method?: string }, res: FakeRes) => Promise<void> | void }[] = []
  constructor(ctx: Context) {
    super(ctx, 'webServer')
  }
  register(_row: unknown, route?: string): () => void {
    const row = _row as { path?: string; handler?: (req: { url?: string; method?: string }, res: FakeRes) => Promise<void> | void }
    this.captured.push({ route: route ?? row.path ?? '?', handler: row.handler! })
    return () => {}
  }
}

/** The queue seat stub: the stateRoot face the route reads. */
class FakeQueue extends Service {
  readonly stateRoot: string
  constructor(ctx: Context, stateRoot: string) {
    super(ctx, 'queue')
    this.stateRoot = stateRoot
  }
}

async function boot(withQueue: boolean): Promise<{ handler: (req: { url?: string; method?: string }, res: FakeRes) => Promise<void> | void; mediaUrl: (runId: string, name: string) => string; root: string }> {
  const ctx = new Context()
  new FakeWebServer(ctx)
  const root = mkdtempSync(join(tmpdir(), 'media-wall-'))
  mkdirSync(join(root, 'output', 'run-00ff-abc'), { recursive: true })
  writeFileSync(join(root, 'output', 'run-00ff-abc', 'img.png'), Buffer.from([0x89, 0x50, 0x4e, 0x47]))
  if (withQueue) new FakeQueue(ctx, root)
  const mod = await import('../../../../packages/estate/media/src/index.ts')
  await ctx.plugin(mod.default as never as Plugin)
  const server = ctx.get('webServer', true) as FakeWebServer
  // register() gets the row only (the effect label rides ctx.effect's
  // second arg, not the route name) — the prefix path is the key.
  const row = server.captured.find((c) => c.route === '/melite-media/runs')!
  assert.ok(row, 'media route registered')
  return { handler: row.handler, mediaUrl: mod.mediaUrl, root }
}

test('happy path: bytes + content-type from the runs output tree', async () => {
  const { handler } = await boot(true)
  const res = new FakeRes()
  await handler({ url: '/melite-media/runs/run-00ff-abc/img.png', method: 'GET' }, res)
  assert.equal(res.status, 200)
  assert.equal(res.headers['content-type'], 'image/png')
  assert.equal(res.headers['content-length'], '4')
  assert.deepEqual([...res.body()], [0x89, 0x50, 0x4e, 0x47])
})

test('confinement: bad run id, missing file, and non-GET are loud refusals', async () => {
  const { handler } = await boot(true)
  for (const url of [
    '/melite-media/runs/not-a-run/img.png',
    '/melite-media/runs/run-00ff-abc/missing.png',
    '/melite-media/runs/run-00ff-abc',
  ]) {
    const res = new FakeRes()
    await handler({ url, method: 'GET' }, res)
    assert.equal(res.status, 404, url)
    assert.ok(res.body().toString().includes('media/not-found'), url)
  }
  const res405 = new FakeRes()
  await handler({ url: '/melite-media/runs/run-00ff-abc/img.png', method: 'POST' }, res405)
  assert.equal(res405.status, 405)
  assert.equal(res405.headers.allow, 'GET, HEAD')
})

test('HEAD answers headers only; the absent queue seat is a LOUD 502', async () => {
  const { handler } = await boot(false)
  const res = new FakeRes()
  await handler({ url: '/melite-media/runs/run-00ff-abc/img.png', method: 'GET' }, res)
  assert.equal(res.status, 502)
  assert.ok(res.body().toString().includes('no-queue-seat'))
  assert.ok(res.body().toString().includes('melite-estate'))
})

test('HEAD on a present artifact: same headers as GET, no body bytes', async () => {
  const { handler } = await boot(true)
  const res = new FakeRes()
  await handler({ url: '/melite-media/runs/run-00ff-abc/img.png', method: 'HEAD' }, res)
  assert.equal(res.status, 200)
  assert.equal(res.headers['content-type'], 'image/png')
  assert.equal(res.headers['content-length'], '4')
  assert.equal(res.body().length, 0)
})

test('realpath containment: symlink escapes refuse 404 (the second lock)', async () => {
  const { handler, root } = await boot(true)
  // An OUTSIDE file the regex grammar cannot see: the URL is a plain
  // name (first lock passes), but realpath resolves outside the run
  // dir (second lock refuses).
  writeFileSync(join(root, 'secret-outside.txt'), 'x')
  symlinkSync(join(root, 'secret-outside.txt'), join(root, 'output', 'run-00ff-abc', 'escape.png'))
  const res = new FakeRes()
  await handler({ url: '/melite-media/runs/run-00ff-abc/escape.png', method: 'GET' }, res)
  assert.equal(res.status, 404)
  assert.ok(res.body().toString().includes('media/not-found'))
})

test('realpath containment: a symlink to the run dir itself resolves to relFromRoot ""', async () => {
  const { handler, root } = await boot(true)
  symlinkSync(join(root, 'output', 'run-00ff-abc'), join(root, 'output', 'run-00ff-abc', 'selfdir'))
  const res = new FakeRes()
  await handler({ url: '/melite-media/runs/run-00ff-abc/selfdir', method: 'GET' }, res)
  assert.equal(res.status, 404)
  assert.ok(res.body().toString().includes('media/not-found'))
})

test('a directory target passes containment but refuses on stat: 404, never a stream', async () => {
  const { handler, root } = await boot(true)
  mkdirSync(join(root, 'output', 'run-00ff-abc', 'generate'))
  const res = new FakeRes()
  await handler({ url: '/melite-media/runs/run-00ff-abc/generate', method: 'GET' }, res)
  assert.equal(res.status, 404)
  assert.ok(res.body().toString().includes('media/not-found'))
})

test('content-type + grammar arms: dotless names, off-grammar segments, absent url', async () => {
  const { handler, root } = await boot(true)
  // A dotless name: ext "" misses the table — octet-stream, bytes
  // still served (the table is a courtesy, never a gate).
  writeFileSync(join(root, 'output', 'run-00ff-abc', 'README'), 'plain')
  const res = new FakeRes()
  await handler({ url: '/melite-media/runs/run-00ff-abc/README', method: 'GET' }, res)
  assert.equal(res.status, 200)
  assert.equal(res.headers['content-type'], 'application/octet-stream')
  assert.equal(res.body().toString(), 'plain')
  // A segment outside the grammar (asterisk) refuses at the FIRST
  // lock — the regex, before any filesystem word.
  const bad = new FakeRes()
  await handler({ url: '/melite-media/runs/run-00ff-abc/im*g.png', method: 'GET' }, bad)
  assert.equal(bad.status, 404)
  assert.ok(bad.body().toString().includes('media/not-found'))
  // An absent url (node never sends one) parses to the root — 404.
  const noUrl = new FakeRes()
  await handler({ method: 'GET' }, noUrl)
  assert.equal(noUrl.status, 404)
  assert.ok(noUrl.body().toString().includes('media/not-found'))
})

test('mediaUrl: the empty name passes verbatim (the null artifact row)', async () => {
  const { mediaUrl } = await boot(true)
  assert.equal(mediaUrl('run-00ff-abc', ''), '')
})

test('mediaUrl: bare run-relative names ride the route; URLs pass verbatim', async () => {
  const { mediaUrl } = await boot(true)
  assert.equal(mediaUrl('run-00ff-abc', 'img.png'), '/melite-media/runs/run-00ff-abc/img.png')
  assert.equal(mediaUrl('run-00ff-abc', 'sub dir/x.png'), '/melite-media/runs/run-00ff-abc/sub%20dir/x.png')
  assert.equal(mediaUrl('run-00ff-abc', 'https://elsewhere/x.png'), 'https://elsewhere/x.png')
  assert.equal(mediaUrl('run-00ff-abc', '/rooted.png'), '/rooted.png')
})

test('headless mount: no webServer seat — the route stays unmounted, no pend', async () => {
  const ctx = new Context()
  const mod = await import('../../../../packages/estate/media/src/index.ts')
  await ctx.plugin(mod.default as never as Plugin) // must NOT throw or pend
  const server = ctx.get('webServer', true)
  assert.equal(server, undefined, 'no webServer was mounted; the probe skipped the route')
})
