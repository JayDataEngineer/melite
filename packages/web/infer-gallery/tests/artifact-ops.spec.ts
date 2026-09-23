/**
 * artifact-ops — the modal's delete + rename wires: the run-relative
 * path parses off the same-origin artifact URL (null for anything
 * else), and both verbs POST the gallery host's mutating doors,
 * throwing the door's `error` code LOUD on refusal.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

import { artifactPathOfUrl, deleteArtifact, renameArtifact } from '../src/client/artifact-ops.ts'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('artifactPathOfUrl', () => {
  it('parses the run-relative path off the same-origin artifact URL', () => {
    expect(artifactPathOfUrl('/infer-gallery/artifact?path=run-abc123-def%2Fgen%2Fa.png')).toBe('run-abc123-def/gen/a.png')
    expect(artifactPathOfUrl('https://host.example/infer-gallery/artifact?path=run-abc123-def/a.png')).toBe('run-abc123-def/a.png')
  })

  it('answers null when the URL rides no gallery path', () => {
    expect(artifactPathOfUrl('https://example.com/a.png')).toBeNull()
    expect(artifactPathOfUrl('/infer-gallery/artifact')).toBeNull()
    expect(artifactPathOfUrl('')).toBeNull()
  })
})

function stubFetchJson(status: number, body: unknown): string[] {
  const calls: string[] = []
  vi.stubGlobal('fetch', vi.fn(async (input: unknown, init: unknown): Promise<Response> => {
    calls.push(JSON.stringify({ url: String(input), method: (init as { method?: string })?.method, body: (init as { body?: string })?.body }))
    return new Response(JSON.stringify(body), { status })
  }))
  return calls
}

describe('deleteArtifact', () => {
  it('POSTs {path} and resolves on ok', async () => {
    const calls = stubFetchJson(200, { ok: true, path: 'run-a/b.png' })
    await deleteArtifact('run-a/b.png')
    const seen = JSON.parse(calls[0]!) as { url: string; method: string; body: string }
    expect(seen.url).toBe('/infer-gallery/artifact-delete')
    expect(seen.method).toBe('POST')
    expect(seen.body).toBe(JSON.stringify({ path: 'run-a/b.png' }))
  })

  it('throws the door error code LOUD on refusal', async () => {
    stubFetchJson(404, { error: 'no_artifact' })
    await expect(deleteArtifact('run-a/gone.png')).rejects.toThrow('delete failed (no_artifact)')
  })

  it('throws on transport failure', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('socket reset') }))
    await expect(deleteArtifact('run-a/b.png')).rejects.toThrow('delete failed — socket reset')
  })
})

describe('renameArtifact', () => {
  it('POSTs {path, name} and resolves the new path + url', async () => {
    const calls = stubFetchJson(200, { ok: true, path: 'run-a/gen/b.png', url: '/infer-gallery/artifact?path=x' })
    const next = await renameArtifact('run-a/gen/a.png', 'b.png')
    expect(next).toEqual({ path: 'run-a/gen/b.png', url: '/infer-gallery/artifact?path=x' })
    const seen = JSON.parse(calls[0]!) as { url: string; method: string; body: string }
    expect(seen.url).toBe('/infer-gallery/artifact-rename')
    expect(seen.method).toBe('POST')
    expect(seen.body).toBe(JSON.stringify({ path: 'run-a/gen/a.png', name: 'b.png' }))
  })

  it('throws the door error code LOUD on refusal', async () => {
    stubFetchJson(409, { error: 'already_exists' })
    await expect(renameArtifact('run-a/a.png', 'taken.png')).rejects.toThrow('rename failed (already_exists)')
  })

  it('refuses a shapeless 200 (the door must answer path + url)', async () => {
    stubFetchJson(200, { ok: true })
    await expect(renameArtifact('run-a/a.png', 'b.png')).rejects.toThrow('bad_rename_answer')
  })

  it('throws on transport failure', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('socket reset') }))
    await expect(renameArtifact('run-a/a.png', 'b.png')).rejects.toThrow('rename failed — socket reset')
  })
})
