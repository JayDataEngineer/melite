// runs-disk-wire.spec.ts — THE DISK-ROW WIRE SEAT (windows-portability
// #6's missing arm, found by the coverage gate: the drive-join segment
// hunt landed with no judge).
//
// THE LAW (the serve door's one wire spelling): a disk row's artifact
// paths reach the wire as run-relative posix names — a posix-rooted
// value strips its leading separators after the run-id marker; a
// WINDOWS-harvested value (drive- or UNC-rooted, run-id segment often
// bounded by backslashes, mixed with posix tails stored earlier) hunts
// the run-id segment bounded by EITHER separator and mints the same
// wire tail. The hunt is pure string law — it fires identically on
// every lane, judged here with windows-shaped values on posix.
//
// Depth: enrichDiskRow is the real serve-door adapter (exported); the
// arms feed it rows the way the disk scan persists them and assert the
// stage's gallery/url wiring — never a frozen literal list.
import { describe, it } from 'vitest'
import assert from "node:assert/strict"
import { enrichDiskRow } from '../src/runsRegistry.ts'

/** A one-stage row whose artifacts ride the given paths. */
const rowWithArtifacts = (runId: string, artifacts: string[]): Record<string, unknown> =>
  ({ run_id: runId, stages: [{ stage: 's1' }], artifacts })

/** The sole stage's gallery names — the wire face of the row. */
const galleryNames = (row: Record<string, unknown>): string[] => {
  const stages = row['stages'] as Array<Record<string, unknown>>
  const gallery = stages[0]!['gallery'] as Array<{ name: string }> | undefined
  return gallery === undefined ? [] : gallery.map((g) => g.name)
}

describe('enrichDiskRow — the wire tail, both harvest lanes', () => {
  it('a posix-rooted artifact strips to its run-relative name', () => {
    const served = enrichDiskRow(rowWithArtifacts('run-abcd-1', ['/out/run-abcd-1/film.mp4']))
    assert.deepEqual(galleryNames(served), ['film.mp4'])
  })

  it('a drive-rooted artifact hunts the backslash-bounded run-id segment (windows harvest, judged on posix)', () => {
    const served = enrichDiskRow(rowWithArtifacts('run-abcd-1', ['D:\\out\\runs\\run-abcd-1\\film.mp4']))
    assert.deepEqual(galleryNames(served), ['film.mp4'])
  })

  it('a UNC-rooted artifact with MIXED separators mints the same tail', () => {
    // the real windows shape: the engine joins native (backslash),
    // a stored prefix rides posix — the hunt is separator-blind
    const served = enrichDiskRow(rowWithArtifacts('run-abcd-1', ['//host/share/out\\run-abcd-1/sub/clip.mp4']))
    assert.deepEqual(galleryNames(served), ['sub/clip.mp4'])
  })

  it('a run-id substring that is NOT a segment never matches (the fence law)', () => {
    // `prerun-abcd-1` contains the id but is not bounded by a
    // separator on both sides — the value keeps its raw shape minus
    // leading separators (posix miss path, byte-for-byte)
    const served = enrichDiskRow(rowWithArtifacts('run-abcd-1', ['D:\\out\\prerun-abcd-1\\film.mp4']))
    assert.deepEqual(galleryNames(served), ['D:\\out\\prerun-abcd-1\\film.mp4'])
  })
})
