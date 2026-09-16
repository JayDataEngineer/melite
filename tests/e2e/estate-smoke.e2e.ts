/**
 * estate-smoke.e2e.ts — the SHIPPED-COMPOSITION smoke (stroke 82:
 * the old with-key body was a placeholder writing a marker file —
 * banned; the model arm it claimed has NO in-repo seam, the model
 * lives in the hosting DSH session, so the claim is gone too).
 *
 * What this tier CAN prove for real: the shipped estate plugins
 * boot together in one cordis Context on fresh state — the queue
 * takes its lock, the ledger face answers, the drafts + bench
 * remotes mount and serve a real draft round-trip on disk, and the
 * media remote lists the (empty) tree headless. No engine, no
 * model, no key — the ENGINE receipt is inference-smoke.e2e.ts;
 * the MODEL receipt is the hosting DSH session itself.
 */
import { describe, it } from 'vitest'
import assert from 'node:assert/strict'
import { join } from 'node:path'
import { Context } from '@deepseek-ai/cordis'
import { mintSandbox } from '../harness.ts'

describe('estate composition smoke (headless boot)', () => {
  it('the shipped plugins boot together on fresh state and the world answers (lock held, drafts round-trip, media lists empty)', async () => {
    const sandbox = mintSandbox('estate-smoke-')
    const ctx = new Context()
    try {
      process.env['MELITE_STATE_ROOT'] = join(sandbox.root, 'state')
      // THE HOST STORAGE STACK first (the facility the drafts domain
      // rides — the same rows the lane profile mounts, no fakes):
      // hub → json backend on the sandbox root → domain facility.
      const hostPkg = (n: string) =>
        `../../packages/estate/drafts/node_modules/@deepseek-ai/${n}/lib/index.js`
      const Storage = (await import(hostPkg('dsh-storage'))).default as new (ctx: Context) => unknown
      const jsonBackend = await import(hostPkg('dsh-storage-json'))
      const domainPlugin = await import(hostPkg('dsh-storage-domain'))
      await ctx.plugin(Storage)
      await ctx.plugin(
        { apply: jsonBackend.apply, Config: jsonBackend.Config, inject: jsonBackend.inject, name: 'storage-json-smoke' },
        { root: join(sandbox.root, 'state', 'storage') },
      )
      await ctx.plugin({ ...domainPlugin }, { backend: 'json' })

      // THE SHIPPED ESTATE PLUGINS, applied like a profile applies
      // them (relative source imports — the e2e lives outside the
      // package graph, same discipline as inference-smoke).
      const estateQueue = (await import('../../packages/harness/estate-queue/src/index.ts')).default
      const estateDrafts = (await import('../../packages/estate/drafts/src/index.ts')).default
      const estateMedia = (await import('../../packages/estate/media/src/index.ts')).default
      estateQueue.apply(ctx, { repoRoot: sandbox.root })
      estateDrafts.apply(ctx)
      estateMedia.apply(ctx)

      // THE WORLD, not the self-report:
      // 1. the queue owns its root (lock + ledger face)
      const queue = ctx.get('queue') as unknown as {
        lockNote: string
        ledgerPath: string
        stateRoot: string
      }
      assert.equal(queue.lockNote, 'acquired')
      assert.ok(queue.ledgerPath.endsWith(join('output', '_ledger.jsonl')))
      assert.equal(queue.stateRoot, join(sandbox.root, 'state'))

      // 2. a second QueueService on the same root REFUSES (the lock
      //    is real, not a claim)
      const { QueueService } = await import('../../packages/harness/estate-queue/src/service.ts')
      assert.throws(
        () => new QueueService(new Context(), { repoRoot: sandbox.root }),
        /held|live|lock/,
      )

      // 3. the bench remote mints the session bench on fresh state
      //    and serves it back — a REAL round-trip whose bytes land
      //    in the sandbox (the drafts domain's session store)
      const benchRemote = (ctx as unknown as { benchRemote: unknown }).benchRemote as {
        ensure(doc: Record<string, unknown>, signal: AbortSignal): Promise<unknown>
        get(session: string, signal: AbortSignal): Promise<{ stages?: unknown[] }>
      }
      assert.ok(typeof benchRemote?.ensure === 'function', 'the bench remote seat mounted')
      await benchRemote.ensure(
        {
          session: 'main',
          intent: 'smoke',
          stages: [{ id: 's_0', kind: 'prompt', text: 'a smoke row' }],
          author: 'estate-smoke',
          expect_rev: null,
          overwrite: false,
        },
        new AbortController().signal,
      )
      const bench = await benchRemote.get('main', new AbortController().signal)
      assert.ok((bench.stages?.length ?? 0) >= 1, 'the bench serves the minted row back')

      // 4. the media remote SEAT mounted (the verb serves through
      //    the typert gateway, not instance methods) and its list
      //    arm's own truth — the pure listMedia the verb delegates
      //    to — answers the empty tree on fresh state (headless:
      //    the byte route is honestly unmounted)
      assert.ok(
        typeof (ctx as unknown as { mediaRemote?: unknown }).mediaRemote === 'object',
        'the media remote seat mounted',
      )
      const { listMedia } = await import('../../packages/estate/media/src/index.ts')
      const listed = await listMedia(join(sandbox.root, 'state'), 'image')
      assert.equal(listed.count, 0, 'fresh state lists no media')
    } finally {
      delete process.env['MELITE_STATE_ROOT']
      await ctx.fiber.dispose()
      sandbox.dispose()
    }
  })
})
