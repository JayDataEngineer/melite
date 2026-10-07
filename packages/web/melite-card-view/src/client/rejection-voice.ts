/** Re-export shim (R4 unmask): rejectionVoice lives at its home
 *  door now — `@melite/card-base/client` voices every catch face in
 *  the estate through one lossless function — and this module keeps
 *  the package's thirty-seven call sites untouched. refusalVoice
 *  stays card-view-local: it voices refused HTTP responses, a
 *  card-view transport concern card-base never touches. */
export { rejectionVoice } from '@melite/card-base/client'

/** The voice for a refused HTTP response, the same lossless law: a
 * JSON body's error field speaks itself; any other body names the
 * status and carries the raw text verbatim — never "undefined" for
 * a body the door never wrote as JSON.
 * @param res the refused response (already known !res.ok)
 * @returns the refusal's own words, for the operator's error line */
export async function refusalVoice(res: Response): Promise<string> {
  const raw = await res.text().catch(() => '')
  try {
    const parsed = JSON.parse(raw) as { error?: unknown }
    if (typeof parsed.error === 'string' && parsed.error !== '') return parsed.error
  } catch {
    // not JSON — the raw body below is the door's own words
  }
  return `HTTP ${res.status}${raw === '' ? '' : `: ${raw}`}`
}
