/**
 * anchor-upload.ts — THE ANCHOR UPLOAD LAW, one home (2026-11-14).
 *
 * ComfyUI's `/upload/image` door does NOT overwrite by default: a
 * colliding name is stored BESIDE the old file as `name (1).png`
 * while the door still answers the REQUESTED name. A lane that loads
 * the requested name then reads whatever stale bytes an earlier
 * session left on the box — the live calls journey died exactly that
 * way (a corrupt 93-byte anchor from an earlier session shadowed
 * every fresh upload; the upload answered 200 and every h3 row died
 * at LoadImage with "PIL.UnidentifiedImageError").
 *
 * So the upload STATES overwrite and JUDGES the answer: a renamed
 * copy means the bytes this press uploaded are not the bytes the lane
 * will read, and the press refuses before it burns GPU time.
 *
 * Lives apart from gpu-harness.ts on purpose: the harness imports the
 * engine gate (a top-level engine probe), this module imports nothing
 * engine-shaped — so the keyless wall can judge the transport law
 * with a stubbed fetch, on every battery run, with no engine present.
 */

/** The anchor's file name — one home: the upload and its judge name
 *  the same file, so a rename can never be mistaken for success. */
export const ANCHOR_NAME = 'e2e_anchor.png'

// A 64×64 RGBA PNG anchor (checker 200/90 — PIL-verified: the FIRST
// anchor's bytes carried a corrupt IHDR (bit depth 0) that uploaded
// fine and died at LoadImage on every box with an engine, failing
// the established pixal3d row too. These bytes were generated,
// PIL-opened, and embedded — never hand-typed.)
export const ANCHOR_PNG_B64 =
  'iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAAeElEQVR4nO3SoQ0AMAwEscz5E2erdIiCRqrR0QOu7p4k82trw8TL1oYJAggggAACCCCAAAIIIIAAAggggAACCCCAAAIIIIAAAggggAACCCCAAAIIIIAAAggggAACCCCAAAIIIIAAAi57ACFFIob5MV0aAAAAAElFTkSuQmCC'

/** The upload's injection seams: the fetch it rides and the door URL —
 *  defaults are the live lane's (127.0.0.1:8188); the wall stubs them. */
export interface AnchorUploadDoor {
  engineUrl: string
  fetchImpl?: typeof fetch
}

/**
 * Uploads the one PIL-verified anchor through the engine's own door
 * and returns the staged name the lane's image slots address.
 *
 * @param door - where the upload lands and which transport it rides.
 * @param tag - the row's name, prefixed to every refusal.
 * @returns the stored name, asserted equal to {@link ANCHOR_NAME}.
 * @throws when the door refuses, when the answer is not JSON, or when
 *   the door stored a renamed copy (the stale-shadow class).
 */
export async function uploadAnchorPng(door: AnchorUploadDoor, tag: string): Promise<string> {
  const png = Buffer.from(ANCHOR_PNG_B64, 'base64')
  const fd = new FormData()
  fd.append('image', new Blob([png], { type: 'image/png' }), ANCHOR_NAME)
  fd.append('overwrite', 'true')
  const send = door.fetchImpl ?? fetch
  const up = await send(`${door.engineUrl}/upload/image`, {
    method: 'POST', body: fd,
    signal: AbortSignal.timeout(30_000),
  })
  if (!up.ok) throw new Error(`${tag}: the anchor upload lands: ${up.status}`)
  const upBody = await up.json() as { name?: string }
  const stored = upBody['name'] ?? ANCHOR_NAME
  if (stored !== ANCHOR_NAME) {
    throw new Error(`${tag}: the upload OVERWRITES its own name — a renamed copy (${stored}) would leave a stale anchor shadowing the fresh bytes`)
  }
  return stored
}
