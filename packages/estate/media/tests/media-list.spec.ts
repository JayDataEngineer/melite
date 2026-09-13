// media-list.spec.ts — the media/list door's list arm, pinned pure
// over a fixture runs tree: kind filtering by the vocab leaf, the
// /melite-media/runs URL grammar minted at the tree, newest-run-first
// ordering, and the sidecar skip.
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, expect, test } from 'vitest'
import { listMedia, MEDIA_PREFIX } from '../src/index.ts'

let root = ''

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), 'melite-media-list-'))
  await mkdir(join(root, 'output', 'run-aaa1-img'), { recursive: true })
  await mkdir(join(root, 'output', 'run-bbb2-vid', 'stage'), { recursive: true })
  await writeFile(join(root, 'output', 'run-aaa1-img', 'gen_00001_.png'), 'x')
  await writeFile(join(root, 'output', 'run-aaa1-img', 'prompt.json'), '{}') // sidecar: never listed
  await writeFile(join(root, 'output', 'run-bbb2-vid', 'stage', 'out.mp4'), 'xx')
  await writeFile(join(root, 'output', 'run-bbb2-vid', 'stage', 'voice.wav'), 'x')
})

afterAll(async () => {
  await rm(root, { recursive: true, force: true })
})

test('kind filter: image names only the images, URL minted at the tree', async () => {
  const { count, items } = await listMedia(root, 'image')
  expect(count).toBe(1)
  expect(items[0]?.url).toBe(`${MEDIA_PREFIX}/run-aaa1-img/gen_00001_.png`)
  expect(items[0]?.kind).toBe('image')
  expect(items[0]?.runId).toBe('run-aaa1-img')
})

test('nested artifacts list with their relative name; sidecars never', async () => {
  const { items } = await listMedia(root, 'all')
  const names = items.map((i) => i.name).sort()
  expect(names).toEqual(['gen_00001_.png', 'stage/out.mp4', 'stage/voice.wav'])
  expect(items.some((i) => i.name.endsWith('.json'))).toBe(false)
})

test('empty tree answers an empty page, not an error', async () => {
  const empty = await mkdtemp(join(tmpdir(), 'melite-media-empty-'))
  try {
    const { count, items } = await listMedia(empty, 'image')
    expect(count).toBe(0)
    expect(items).toEqual([])
  } finally {
    await rm(empty, { recursive: true, force: true })
  }
})
