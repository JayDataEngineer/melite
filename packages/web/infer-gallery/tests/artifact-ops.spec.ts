/**
 * artifact-ops — the modal's delete + rename wires: the run-relative
 * path parses off the same-origin artifact URL (null for anything
 * else), and both verbs POST the gallery host's mutating doors,
 * throwing the door's `error` code LOUD on refusal.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

import { artifactNameOf, artifactPathOfUrl, deleteArtifact, renameArtifact } from '../src/client/artifact-ops.ts'

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
    expect(artifactPathOfUrl('http://[invalid')).toBeNull()
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

  it('falls back to the HTTP status when a refusal has no error code', async () => {
    stubFetchJson(418, { error: '' })
    await expect(deleteArtifact('run-a/gone.png')).rejects.toThrow('delete failed (HTTP 418)')
  })

  it('handles malformed refusal JSON and a foreign transport failure', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: false,
      status: 503,
      json: async () => { throw new Error('bad json') },
    } as unknown as Response)))
    await expect(deleteArtifact('run-a/gone.png')).rejects.toThrow('delete failed (HTTP 503)')

    vi.stubGlobal('fetch', vi.fn(async () => { throw 'offline' }))
    await expect(deleteArtifact('run-a/b.png')).rejects.toThrow('delete failed — offline')
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

  it('handles malformed refusal JSON, a null answer, and a foreign transport failure', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: false,
      status: 409,
      json: async () => { throw new Error('bad json') },
    } as unknown as Response)))
    await expect(renameArtifact('run-a/a.png', 'taken.png')).rejects.toThrow('rename failed (HTTP 409)')

    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200, json: async () => null } as unknown as Response)))
    await expect(renameArtifact('run-a/a.png', 'b.png')).rejects.toThrow('bad_rename_answer')

    vi.stubGlobal('fetch', vi.fn(async () => { throw 'offline' }))
    await expect(renameArtifact('run-a/a.png', 'b.png')).rejects.toThrow('rename failed — offline')
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

describe('artifactNameOf — THE ONE LAW (the operator\'s 3D-door report)', () => {
  it('reads the name from the artifact route\'s ?path= query, not the route word', () => {
    expect(
      artifactNameOf('/infer-gallery/artifact?path=' + encodeURIComponent('run-x/img-to-mesh/pixal3d_00003.glb')),
    ).toBe('pixal3d_00003.glb')
  })

  it('reads a directly-served file from its path', () => {
    expect(artifactNameOf('/melite-media/runs/run-1/creature.glb')).toBe('creature.glb')
    expect(artifactNameOf('/v1/assets/runs/run-1/a/b/mesh.gltf')).toBe('mesh.gltf')
  })

  it('never answers with the route word, whatever it is', () => {
    for (const route of ['/infer-gallery/artifact', '/v1/assets/artifact', '/artifact']) {
      const name = artifactNameOf(route + '?path=' + encodeURIComponent('run-x/scene.gltf'))
      expect(name, route).toBe('scene.gltf')
      expect(name).not.toBe('artifact')
    }
  })

  it('a URL with no path and no query answers with itself (never undefined)', () => {
    expect(artifactNameOf('')).toBe('')
    expect(artifactNameOf('/a/b/c.glb')).toBe('c.glb')
  })
})
