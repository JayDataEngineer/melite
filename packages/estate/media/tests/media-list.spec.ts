// media-list.spec.ts — the media/list door's list arm, pinned pure
// over a fixture runs tree: kind filtering by the vocab leaf, the
// /melite-media/runs URL grammar minted at the tree, newest-run-first
// ordering, and the sidecar skip.
import { mkdtemp, mkdir, writeFile, rm, utimes } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { listMedia, listMediaAcross, MEDIA_PREFIX } from '@melite/estate-media'

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

// stroke-82 wall: kind filters name exactly their family, and the
// extension case washes ('A.PNG' is image — the media package's
// kindForExt lowercases before the vocab lookup).
test('kind filters: wav names audio, mp4 video, glb model, A.PNG image', async () => {
  const root = await mkdtemp(join(tmpdir(), 'melite-media-kinds-'))
  try {
    await mkdir(join(root, 'output', 'run-aaa1-mix'), { recursive: true })
    await writeFile(join(root, 'output', 'run-aaa1-mix', 'clip.wav'), 'a')
    await writeFile(join(root, 'output', 'run-aaa1-mix', 'clip.mp4'), 'v')
    await writeFile(join(root, 'output', 'run-aaa1-mix', 'mesh.glb'), 'm')
    await writeFile(join(root, 'output', 'run-aaa1-mix', 'A.PNG'), 'i')
    const names = async (kind: string): Promise<string[]> =>
      (await listMedia(root, kind)).items.map((i) => i.name)
    expect(await names('audio')).toEqual(['clip.wav'])
    expect(await names('video')).toEqual(['clip.mp4'])
    expect(await names('model')).toEqual(['mesh.glb'])
    const images = await listMedia(root, 'image')
    expect(images.items.map((i) => i.name)).toEqual(['A.PNG'])
    expect(images.items[0]?.kind).toBe('image')
    const all = await listMedia(root, 'all')
    expect(all.count).toBe(4)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

// §23 CROSS-ROOTS: the list arm walks the manifest (own root first),
// unions the runs, stamps every row with the serving root, and
// resolves run-id collisions first-root-wins.
test('listMediaAcross: the manifest union — newest run first across roots, every row names its root', async () => {
  const own = await mkdtemp(join(tmpdir(), 'melite-media-x-own-'))
  const mk = await mkdtemp(join(tmpdir(), 'melite-media-x-mk-'))
  try {
    await mkdir(join(own, 'output', 'run-0aaa1-own'), { recursive: true })
    await mkdir(join(mk, 'output', 'run-0bbb2-mk'), { recursive: true })
    await writeFile(join(own, 'output', 'run-0aaa1-own', 'a.png'), 'x')
    await writeFile(join(mk, 'output', 'run-0bbb2-mk', 'b.mp4'), 'xx')
    // deterministic order: the maker run is the NEWER tree
    await utimes(join(mk, 'output', 'run-0bbb2-mk'), 5_000, 5_000)
    await utimes(join(own, 'output', 'run-0aaa1-own'), 1_000, 1_000)
    const { count, items } = await listMediaAcross([own, mk], 'all')
    expect(count).toBe(2)
    expect(items.map((i) => i.name)).toEqual(['b.mp4', 'a.png'])
    expect(items[0]?.served_from).toBe(mk)
    expect(items[1]?.served_from).toBe(own)
  } finally {
    await rm(own, { recursive: true, force: true })
    await rm(mk, { recursive: true, force: true })
  }
})

test('listMediaAcross: a run-id collision resolves FIRST-ROOT-WINS (own root leads)', async () => {
  const own = await mkdtemp(join(tmpdir(), 'melite-media-x-c1-'))
  const mk = await mkdtemp(join(tmpdir(), 'melite-media-x-c2-'))
  try {
    await mkdir(join(own, 'output', 'run-0ccc3-dup'), { recursive: true })
    await mkdir(join(mk, 'output', 'run-0ccc3-dup'), { recursive: true })
    await writeFile(join(own, 'output', 'run-0ccc3-dup', 'own.png'), 'x')
    await writeFile(join(mk, 'output', 'run-0ccc3-dup', 'mk.png'), 'x')
    const { count, items } = await listMediaAcross([own, mk], 'image')
    expect(count).toBe(1)
    expect(items[0]?.name).toBe('own.png')
    expect(items[0]?.served_from).toBe(own)
  } finally {
    await rm(own, { recursive: true, force: true })
    await rm(mk, { recursive: true, force: true })
  }
})

test('listMediaAcross: a missing/unreadable root reads empty, never poisons the union', async () => {
  const own = await mkdtemp(join(tmpdir(), 'melite-media-x-e1-'))
  const ghost = join(tmpdir(), 'melite-media-x-ghost-')
  try {
    await mkdir(join(own, 'output', 'run-0ddd4-solo'), { recursive: true })
    await writeFile(join(own, 'output', 'run-0ddd4-solo', 's.png'), 'x')
    const { count, items } = await listMediaAcross([own, ghost], 'all')
    expect(count).toBe(1)
    expect(items[0]?.served_from).toBe(own)
  } finally {
    await rm(own, { recursive: true, force: true })
  }
})
