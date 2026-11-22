/**
 * decodeRuns/decodeDrafts — the ONE validation site per feed
 * (malformed shapes fall back to empty HERE, never at render):
 *
 *   runs    — keyless rows drop LOUDLY into the errors channel (a run
 *             without a string run_id is undedupeable and unkeyable);
 *             non-array feeds fall back to empty;
 *   drafts  — non-array members fall back to empty, loudly typed.
 */
import { describe, expect, it } from 'vitest'

import { decodeBrowse, decodeDrafts, decodeMediaFiles, decodeRuns } from '../src/client/decode.ts'

describe('decodeRuns — the runs validation site', () => {
  it('passes clean rows through with the errors channel intact', () => {
    const feed = decodeRuns({
      runs: [{ run_id: 'r1', prompt: 'a cube' }],
      errors: [{ gateway: 'g', message: 'm' }],
    })
    expect(feed).toEqual({
      runs: [{ run_id: 'r1', prompt: 'a cube' }],
      errors: [{ gateway: 'g', message: 'm' }],
    })
  })

  it('drops keyless rows loudly (never a partial, never silent)', () => {
    const feed = decodeRuns({
      runs: [{ run_id: 'r1' }, { name: 'no id' }, { run_id: '' }, { run_id: 7 }, null],
      errors: [],
    })
    expect(feed.runs).toEqual([{ run_id: 'r1' }])
    expect(feed.errors).toEqual([
      { gateway: 'runs', message: 'dropped 4 rows without run_id (unkeyable)' },
    ])
  })

  it('non-array feeds fall back to empty (the wire guards the render)', () => {
    expect(decodeRuns(null)).toEqual({ runs: [], errors: [] })
    expect(decodeRuns({})).toEqual({ runs: [], errors: [] })
    expect(decodeRuns({ runs: 'nope', errors: 'nope' })).toEqual({ runs: [], errors: [] })
  })
})

describe('decodeDrafts — the drafts validation site', () => {
  it('drops an unkeyable draft and counts it loudly (the runs law, mirrored)', () => {
    const feed = decodeDrafts({ drafts: [{ draft_id: 'd1' }, { name: 'no id' }, null], errors: [] })
    expect(feed.drafts).toEqual([{ draft_id: 'd1' }])
    expect(feed.errors).toEqual([{ gateway: 'drafts', message: 'dropped 2 rows without draft_id (unkeyable)' }])
  })

  it('passes clean rows through', () => {
    expect(decodeDrafts({ drafts: [{ draft_id: 'd1' }], errors: [] })).toEqual({
      drafts: [{ draft_id: 'd1' }],
      errors: [],
    })
  })

  it('non-array members fall back to empty', () => {
    expect(decodeDrafts(null)).toEqual({ drafts: [], errors: [] })
    expect(decodeDrafts({ drafts: 'nope', errors: 'nope' })).toEqual({ drafts: [], errors: [] })
  })
})

describe('decodeBrowse — the browse validation site', () => {
  it('THE BROWSE ANSWER DECODES FAITHFULLY — a clean page rides name, kind, and every optional number it serves', () => {
    expect(
      decodeBrowse({
        path: 'runs/r1',
        entries: [
          { name: 'img', kind: 'dir', size: 4096, mtime: 1700000000000 },
          { name: 'a.png', kind: 'file', size: 512 },
          { name: 'b', kind: 'dir' },
        ],
        total: 3,
        nextCursor: 2,
      }),
    ).toEqual({
      path: 'runs/r1',
      entries: [
        { name: 'img', kind: 'dir', size: 4096, mtime: 1700000000000 },
        { name: 'a.png', kind: 'file', size: 512 },
        { name: 'b', kind: 'dir' },
      ],
      total: 3,
      nextCursor: 2,
    })
  })

  it('THE WIRE GUARD DROPS UNRENDERABLE BROWSE ROWS — no name, an empty name, or a foreign kind is dropped, never a partial face', () => {
    const page = decodeBrowse({
      path: 'runs/r1',
      entries: [
        null,
        {},
        { name: '', kind: 'dir' },
        { name: 'x', kind: 'symlink' },
        { name: 'kept', kind: 'dir' },
        { name: 'kept2', kind: 'file' },
      ],
    })
    expect(page.entries).toEqual([
      { name: 'kept', kind: 'dir' },
      { name: 'kept2', kind: 'file' },
    ])
  })

  it('THE WALK ANSWER DEFAULTS HONESTLY — a non-string path is empty, a non-number total is the entry count, a missing cursor is null (never a silent cap)', () => {
    expect(
      decodeBrowse({ path: 42, entries: [{ name: 'a', kind: 'dir' }], total: 'many', nextCursor: 'end' }),
    ).toEqual({ path: '', entries: [{ name: 'a', kind: 'dir' }], total: 1, nextCursor: null })
    expect(decodeBrowse({ entries: [] })).toEqual({ path: '', entries: [], total: 0, nextCursor: null })
  })

  it('THE NULL ANSWER IS THE EMPTY COMPLETE WALK — decodeBrowse(null) decodes to an empty finished page, never a throw', () => {
    expect(decodeBrowse(null)).toEqual({ path: '', entries: [], total: 0, nextCursor: null })
    expect(decodeBrowse(undefined)).toEqual({ path: '', entries: [], total: 0, nextCursor: null })
  })
})

describe('decodeMediaFiles — the all-files validation site', () => {
  it('THE ALL-FILES FEED DECODES THE PANEL VOCABULARY VERBATIM — image, video, audio, model, and text rows all ride', () => {
    expect(
      decodeMediaFiles({
        files: [
          { path: 'runs/r1/a.png', kind: 'image', size: 512, mtime: 1700000000000 },
          { path: 'runs/r1/b.mp4', kind: 'video', size: 10, mtime: 1700000000001 },
          { path: 'runs/r1/c.wav', kind: 'audio', size: 20, mtime: 1700000000002 },
          { path: 'runs/r1/d.glb', kind: 'model', size: 30, mtime: 1700000000003 },
          { path: 'runs/r1/e.txt', kind: 'text', size: 5, mtime: 1700000000004 },
        ],
        total: 5,
        nextCursor: 4,
      }),
    ).toEqual({
      files: [
        { path: 'runs/r1/a.png', kind: 'image', size: 512, mtime: 1700000000000 },
        { path: 'runs/r1/b.mp4', kind: 'video', size: 10, mtime: 1700000000001 },
        { path: 'runs/r1/c.wav', kind: 'audio', size: 20, mtime: 1700000000002 },
        { path: 'runs/r1/d.glb', kind: 'model', size: 30, mtime: 1700000000003 },
        { path: 'runs/r1/e.txt', kind: 'text', size: 5, mtime: 1700000000004 },
      ],
      total: 5,
      nextCursor: 4,
    })
  })

  it('THE WIRE GUARD DROPS UNRENDERABLE FILE ROWS — no path, an empty path, or a foreign kind is dropped, never a partial face', () => {
    const page = decodeMediaFiles({
      files: [
        null,
        {},
        { path: '', kind: 'image' },
        { path: 'x.png', kind: 'other' },
        { path: 'kept.png', kind: 'image' },
      ],
    })
    expect(page.files).toEqual([{ path: 'kept.png', kind: 'image', size: 0, mtime: 0 }])
  })

  it('THE PROMPT RIDES THE ROW WHEN THE WALK CARRIES ONE — a string prompt stays; an absent one is no key (never guessed), a non-string one is dropped', () => {
    const page = decodeMediaFiles({
      files: [
        { path: 'a.png', kind: 'image', prompt: 'a mossy lighthouse' },
        { path: 'b.png', kind: 'image' },
        { path: 'c.png', kind: 'image', prompt: '' },
        { path: 'd.png', kind: 'image', prompt: 42 },
      ],
    })
    expect(page.files).toEqual([
      { path: 'a.png', kind: 'image', size: 0, mtime: 0, prompt: 'a mossy lighthouse' },
      { path: 'b.png', kind: 'image', size: 0, mtime: 0 },
      { path: 'c.png', kind: 'image', size: 0, mtime: 0 },
      { path: 'd.png', kind: 'image', size: 0, mtime: 0 },
    ])
  })

  it('THE FILE ROW NUMBERS FALL BACK TO ZERO — a non-number size or mtime is 0, the row still rides; a non-number total is the file count and a missing cursor is null', () => {
    expect(
      decodeMediaFiles({ files: [{ path: 'a.png', kind: 'image', size: 'big', mtime: false }], total: 'many' }),
    ).toEqual({ files: [{ path: 'a.png', kind: 'image', size: 0, mtime: 0 }], total: 1, nextCursor: null })
    expect(decodeMediaFiles({ files: [] })).toEqual({ files: [], total: 0, nextCursor: null })
  })

  it('THE NULL FEED IS THE EMPTY COMPLETE PAGE — decodeMediaFiles(null) decodes to an empty finished page, never a throw', () => {
    expect(decodeMediaFiles(null)).toEqual({ files: [], total: 0, nextCursor: null })
    expect(decodeMediaFiles(undefined)).toEqual({ files: [], total: 0, nextCursor: null })
  })
})
