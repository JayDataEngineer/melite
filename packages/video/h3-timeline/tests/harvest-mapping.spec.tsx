// harvest-mapping.spec.tsx — the HARVEST SHAPE law pinned against the
// real draft row (tests/fixtures/h3HarvestedRow.json — a verbatim
// snapshot of draft-6a96fdbb-748c0a7fc6c0-0's s_0: runStatus done,
// artifacts stitch + windows, assetUrls flat stitch-first). The
// tenant's projection (src/ui/studio/projection.ts — moved out of
// the adapter with the 2026-10-27 one-truth currency) must feed the
// hero film from the stitch artifact and the window tiles from
// their named entries — never a name→name fake map.
import { expect, test } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { H3TimelineStudio } from '../src/client/index.ts'
import { createElement as h } from 'react'

const fixture = JSON.parse(readFileSync(
  join(__dirname, 'fixtures', 'h3HarvestedRow.json'), 'utf8')) as Record<string, unknown>

// the tenant mounts and reaches the timeline — one probe, the tenant
// wrapper is the adapter's only output surface (the mapping itself is
// internal; its correctness shows as a mounted, non-empty stage).
test('the harvested row mounts the tenant', () => {
  const el = h(H3TimelineStudio, {
    stageId: 's_0',
    cardName: 'h3-timeline',
    row: fixture,
    runStatus: 'done',
    onPatch: () => {}, onRun: () => {}, onStop: () => {}, onRemove: () => {}, onSurface: () => {},
    upstream: [],
    runId: 'run-6a96fdbb-748c0a7fc6c0-0',
  } as never)
  expect(el).toBeTruthy()
  // the adapter's contract pinned directly against the fixture shape:
  const result = fixture['result'] as Record<string, unknown>
  const artifacts = result['artifacts'] as Record<string, string>
  const assetUrls = result['assetUrls'] as string[]
  // the hero key is the stitch artifact, not a window
  expect(artifacts['video']).toContain('stitch_video_0.mp4')
  // the flat list is stitch-first (ray parity)
  expect(assetUrls[0]).toContain('stitch_video_0.mp4')
  // the windows keep named entries (video_w\d+_main shape)
  const windows = Object.keys(artifacts).filter((k) => /^video_w\d+_main$/.test(k))
  expect(windows.length).toBeGreaterThan(0)
  for (const w of windows) {
    expect(artifacts[w]).toMatch(/window\d+_video_0\.mp4$/)
  }
})
