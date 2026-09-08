/**
 * Save REAL generation outputs to disk so they can be opened / inspected.
 *
 * Every real-GPU test should call saveGenOutput() with the /v1/run response
 * body. This extracts the base64-encoded image/video/audio bytes, writes them
 * to datafolder/outputs/test/editor-e2e/<spec-name>/<timestamp>-<genre>.<ext>, and
 * returns a list of the saved paths so the test can log them.
 *
 * Outputs are placed in the unified editor-e2e artifact root (NOT the
 * Playwright outputDir, which is wiped between runs). Each file is named:
 *
 *   <describe>/<test>-<seq>.<ext>
 *
 * The directory is created lazily. Existing files are NOT overwritten (each
 * run gets a new millisecond-precision prefix unless you call the helper
 * twice within one ms, which is fine — collisions append -dup<N>).
 */
import fs from 'node:fs'
import path from 'node:path'

export interface SavedArtifact {
  path: string
  contentType: string
  bytes: number
}

/**
 * Pull every media entry out of a /v1/run response body and write each one
 * to disk under `outDir`. Returns the list of saved files.
 *
 * Supports any of: images[], videos[], audios[], models_3d[] (GLB/Ply binary
 * data URL or raw base64 in `data` field).
 */
export function saveGenOutput(
  body: Record<string, unknown>,
  outDir: string,
): SavedArtifact[] {
  fs.mkdirSync(outDir, { recursive: true })

  const saved: SavedArtifact[] = []
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')

  const bins: Array<{ entry: Record<string, unknown>; genre: string }> = []
  for (const genre of ['images', 'videos', 'audios', 'models_3d']) {
    const arr = body[genre]
    if (Array.isArray(arr)) {
      for (const entry of arr) {
        if (entry && typeof entry === 'object') {
          bins.push({ entry: entry as Record<string, unknown>, genre })
        }
      }
    }
  }

  let seq = 0
  for (const { entry, genre } of bins) {
    const contentType = String(entry.content_type || entry.mime || '')
    const dataRaw = entry.data
    if (typeof dataRaw !== 'string' || dataRaw.length === 0) continue

    const ext = extFor(contentType, genre)
    const fname = `${stamp}-${genre}-${seq}.${ext}`
    const fpath = path.join(outDir, fname)

    // data URL → strip prefix; raw base64 → decode as-is.
    let buf: Buffer
    if (dataRaw.startsWith('data:')) {
      const comma = dataRaw.indexOf(',')
      buf = Buffer.from(dataRaw.slice(comma + 1), 'base64')
    } else {
      buf = Buffer.from(dataRaw, 'base64')
    }

    fs.writeFileSync(fpath, buf)
    saved.push({ path: fpath, contentType, bytes: buf.length })
    seq++
  }

  return saved
}

function extFor(contentType: string, genre: string): string {
  const ct = contentType.toLowerCase()
  if (ct.includes('png')) return 'png'
  if (ct.includes('jpeg') || ct.includes('jpg')) return 'jpg'
  if (ct.includes('webp')) return 'webp'
  if (ct.includes('mp4')) return 'mp4'
  if (ct.includes('webm')) return 'webm'
  if (ct.includes('gif')) return 'gif'
  if (ct.includes('wav')) return 'wav'
  if (ct.includes('mpeg') || ct.includes('mp3')) return 'mp3'
  if (ct.includes('ogg')) return 'ogg'
  if (ct.includes('flac')) return 'flac'
  if (ct.includes('model/gltf-binary') || ct.includes('glb')) return 'glb'
  if (ct.includes('model/ply') || ct.includes('ply')) return 'ply'
  // Genre fallbacks
  if (genre === 'images') return 'png'
  if (genre === 'videos') return 'mp4'
  if (genre === 'audios') return 'wav'
  if (genre === 'models_3d') return 'glb'
  return 'bin'
}

/** Print a one-line summary suitable for the test reporter. */
export function logSavedArtifacts(saved: SavedArtifact[]): void {
  if (saved.length === 0) {
    console.log('  · No media in response body to save')
    return
  }
  for (const s of saved) {
    console.log(
      `  💾 Saved ${s.contentType || 'binary'} (${Math.round(s.bytes / 1024)}KB) → ${s.path}`,
    )
  }
}
