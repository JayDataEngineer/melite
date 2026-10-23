// @vitest-environment happy-dom
/**
 * Web snapshot scenario (DSH tier 7): the media sidebar's
 * BOOT-STAGED FIRST PAINT — the product face of E2-3 arm 2 (the
 * persisted feed paints instantly with a stale face while the fresh
 * feed seats, never minutes of spinner through a lane boot). This
 * scenario exists to close boot-feed audit F3 (2026-11-12): the
 * boot-staged paint landed with NO keyless recorded-session judge
 * for the sidebar face at all — snapshots/web held cards-tab,
 * chat-preview, hello, melite-runs; none was the panel.
 *
 * KEYLESS (the cards-tab law): borrows the canonical session from
 * snapshots/session/hello and reads that owner's selected parent
 * generation read-only; the paint itself is a happy-dom mount of
 * the REAL MediaPanel over a gated fetch — the same component the
 * lane serves, no host, no engine, no key. The wall-spec arm
 * (packages/web/infer-gallery/tests/media-panel.spec.tsx) owns the
 * mechanism's every branch; this scenario owns the PRODUCT FACE:
 * the strings the operator sees on a cold lane open.
 */
import { describe, it, afterEach } from 'vitest'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { render, cleanup, waitFor, screen } from '@testing-library/react'
import { createElement as h } from 'react'
import { parseSnapshotManifest, selectGeneration } from '../../../tests/snapshot-support/storage.ts'
import { MediaPanel } from '../../../packages/web/infer-gallery/src/client/MediaPanel.tsx'

const here = dirname(fileURLToPath(import.meta.url))
const snapshotsRoot = resolve(here, '..', '..')

/** THE GATED FEED: the runs fetch hangs on a gate the test holds;
 * the drafts fetch answers empty. The gate is the lane boot's
 * honest stand-in — the panel paints from the persisted cache
 * BEFORE any wire answers. */
interface Gate { release: () => void }

/** the panel's real fetch, restored after every arm (the stub assigns
 * globalThis.fetch directly — the restore is this module's own, never
 * vi.unstubAllGlobals, which only knows vi.stubGlobal seats) */
let restoreFetch: (() => void) | undefined

const stubGatedFeed = (freshBody: string): Gate => {
  let release: (() => void) | undefined
  const gate: Gate = { release: () => { release?.() } }
  const gated = new Promise<void>((res) => { release = res })
  const realFetch = globalThis.fetch
  globalThis.fetch = ((url: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const u = String(url)
    if (u === '/infer-gallery/runs') {
      return gated.then(() => Promise.resolve(new Response(freshBody, { status: 200 })))
    }
    if (u === '/infer-gallery/drafts') {
      return Promise.resolve(new Response('{"drafts":[],"errors":[]}', { status: 200 }))
    }
    return realFetch(u as URL, init)
  }) as typeof fetch
  restoreFetch = () => { globalThis.fetch = realFetch }
  return gate
}

afterEach(() => {
  cleanup()
  restoreFetch?.()
  restoreFetch = undefined
  localStorage.clear()
})

// THE STALE CHIP, verbatim off the typed dictionary — the product
// string the operator reads on a cold open (galleryCopy.statStale;
// imported here as a literal assertion, the same verbatim law every
// snapshot scenario judges its faces by).
const STALE_CHIP = ' · stale — refreshing'

describe('web media-panel (the boot-staged sidebar face, keyless)', () => {
  it('replays against the borrowed canonical session', () => {
    const mode = process.env.DSH_SNAPSHOT ?? 'replay'
    assert.ok(['replay', 'record', 'refresh'].includes(mode), `unknown DSH_SNAPSHOT=${mode}`)
    if (process.env.CI !== undefined) assert.equal(mode, 'replay')

    const manifest = parseSnapshotManifest(
      readFileSync(join(here, 'snapshot.yml'), 'utf8'),
      join(here, 'snapshot.yml'),
    )
    assert.ok(manifest.borrows, 'web scenario without a local fixture must declare borrows')
    const parent = selectGeneration(join(snapshotsRoot, manifest.borrows!), 'parent')
    assert.ok(parent.rows.length > 0, 'the borrowed session carries rows')
  })

  it('the persisted feed paints before the wire answers, chips stale, then the fresh feed replaces it', async () => {
    // THE PERSISTED FEED (the exact cache key the boot uses —
    // melite:feed:<url>, origin-scoped by localStorage itself)
    localStorage.setItem('melite:feed:/infer-gallery/runs', JSON.stringify({
      runs: [{
        run_id: 'cached-run',
        created_at: 1,
        status: 'completed',
        artifacts: [{ url: '/c/cached-film.png', name: 'cached-film.png', type: 'image' }],
      }],
      errors: [],
    }))
    const fresh = JSON.stringify({
      runs: [{
        run_id: 'fresh-run',
        created_at: 2,
        status: 'completed',
        artifacts: [{ url: '/v/fresh-film.png', name: 'fresh-film.png', type: 'image' }],
      }],
      errors: [],
    })
    const gate = stubGatedFeed(fresh)
    render(h(MediaPanel))

    // THE COLD-OPEN FACE: the cached tile paints instantly (no wire
    // has answered) and the stat line chips the stale truth verbatim
    const cached = await waitFor(() => {
      const img = document.querySelector('button img[src="/c/cached-film.png"]') as HTMLImageElement | null
      assert.ok(img !== null, 'the persisted tile paints before any fetch answers')
      return img as HTMLImageElement
    })
    assert.ok(cached.src.includes('/c/cached-film.png'))
    assert.ok(document.body.textContent?.includes(STALE_CHIP), 'the stale chip names the face')

    // THE FRESH SEAT: the gate opens, the fresh feed replaces the
    // stale one, the chip clears
    gate.release()
    await waitFor(() => {
      assert.ok(document.querySelector('button img[src="/v/fresh-film.png"]') !== null, 'the fresh tile replaces the cached one')
    })
    assert.ok(!document.body.textContent?.includes(STALE_CHIP), 'the chip clears when the feed is live')
    assert.ok(screen.getByText(/1 runs · 1 artifacts/) !== null, 'the stat line states the fresh truth')
  })

  it('a cold cache (nothing persisted) paints no stale face — the first paint is the fresh feed alone', async () => {
    const fresh = JSON.stringify({
      runs: [{
        run_id: 'fresh-run',
        created_at: 2,
        status: 'completed',
        artifacts: [{ url: '/v/only-film.png', name: 'only-film.png', type: 'image' }],
      }],
      errors: [],
    })
    const gate = stubGatedFeed(fresh)
    render(h(MediaPanel))
    gate.release()
    await waitFor(() => {
      assert.ok(document.querySelector('button img[src="/v/only-film.png"]') !== null, 'the fresh tile paints')
    })
    assert.ok(!document.body.textContent?.includes(STALE_CHIP), 'a cold cache never chips stale')
  })
})
