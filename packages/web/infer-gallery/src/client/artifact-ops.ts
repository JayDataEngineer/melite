/**
 * artifact-ops — the modal's delete + rename wires (the media
 * sidebar's popup modal on media stuff).
 *
 * Both doors ride the gallery host's SAME-ORIGIN mutating routes
 * (POST /infer-gallery/artifact-delete {path},
 * POST /infer-gallery/artifact-rename {path, name}) — the read
 * artifact route stays read-only, so a prefetcher can never mutate
 * by URL. Failures surface as thrown Errors carrying the door's
 * `error` code, never silent.
 */

/** The artifact's FILE NAME behind an artifact URL — THE ONE LAW
 *  (the operator's 2026-09-26 report: a real .glb was refused as
 *  `"artifact" is not a .glb/.gltf artifact`, because the media route
 *  serves `/infer-gallery/artifact?path=<run>/<file>` and the caller
 *  read the ROUTE's last path segment). `?path=` first, the plain URL
 *  path second (a directly-served file has no query). */
export function artifactNameOf(url: string): string {
  const fromQuery = artifactPathOfUrl(url)
  // String.prototype.split always yields at least one part — the empty
  // string splits to [''] — so the pre-'?' part is defined, and
  // lastIndexOf answers -1 for a path holding no separator, leaving
  // slice(0) as the whole string.
  const path = fromQuery ?? url.split('?')[0]
  return path.slice(path.lastIndexOf('/') + 1)
}

/** The run-relative artifact path behind one same-origin artifact
 *  URL (`/infer-gallery/artifact?path=run-<id>/<file>`) — null when
 *  the URL rides no such path (foreign URLs, card previews). */
export function artifactPathOfUrl(url: string): string | null {
  try {
    const parsed = new URL(url, 'http://artifact-ops.invalid')
    const target = parsed.searchParams.get('path')
    return target !== null && target !== '' ? target : null
  } catch {
    return null
  }
}

async function refusalOf(res: Response, answer: unknown): Promise<string> {
  const err = (answer as Record<string, unknown> | null)?.['error']
  return typeof err === 'string' && err !== '' ? err : 'HTTP ' + String(res.status)
}

/** Unlink one run-relative artifact file. */
export async function deleteArtifact(path: string): Promise<void> {
  let res: Response
  try {
    res = await fetch('/infer-gallery/artifact-delete', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ path }),
    })
  } catch (e) {
    throw new Error('delete failed — ' + (e instanceof Error ? e.message : String(e)))
  }
  if (!res.ok) {
    const answer: unknown = await res.json().catch(() => null)
    throw new Error('delete failed (' + await refusalOf(res, answer) + ')')
  }
}

/** The mass-delete answer: per-file outcomes, never a first-failure
 *  abort — the operator asked for N deletions and reads which landed. */
export interface DeleteManyAnswer {
  deleted: number
  failed: Array<{ path: string; message: string }>
}

/** Unlink several run-relative artifacts, one door call per file (the
 *  host route has no batch arm). A failure is RECORDED, not thrown:
 *  the remaining files still delete, and the caller voices the
 *  failures over the feed the survivor rows still render in. */
export async function deleteArtifacts(paths: readonly string[]): Promise<DeleteManyAnswer> {
  const failed: DeleteManyAnswer['failed'] = []
  let deleted = 0
  for (const path of paths) {
    try {
      await deleteArtifact(path)
      deleted += 1
    } catch (e) {
      failed.push({ path, message: e instanceof Error ? e.message : String(e) })
    }
  }
  return { deleted, failed }
}

/** Rename one artifact inside its own directory — resolves the new
 *  run-relative path + its same-origin URL (the preview re-points). */
export async function renameArtifact(path: string, name: string): Promise<{ path: string; url: string }> {
  let res: Response
  try {
    res = await fetch('/infer-gallery/artifact-rename', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ path, name }),
    })
  } catch (e) {
    throw new Error('rename failed — ' + (e instanceof Error ? e.message : String(e)))
  }
  const answer: unknown = await res.json().catch(() => null)
  if (!res.ok) {
    throw new Error('rename failed (' + await refusalOf(res, answer) + ')')
  }
  const row = (answer ?? {}) as { path?: unknown; url?: unknown }
  if (typeof row.path !== 'string' || typeof row.url !== 'string') {
    throw new Error('rename failed (bad_rename_answer)')
  }
  return { path: row.path, url: row.url }
}
