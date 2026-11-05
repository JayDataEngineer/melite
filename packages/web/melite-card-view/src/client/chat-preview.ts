// chat-preview.ts — Q3 (operator 2026-11-09), refrozen 2026-11-19:
// the in-chat preview derivation. The chat card renders the press's
// OWN settled outputs — the previews the tool's presentationMeta
// persisted AT SETTLE TIME (one hero per pressed stage that minted
// a url) — never a live tail and never the present-time draft doc.
// THE REFREEZE (the refresh-flood burn, 2026-11-19: a page refresh
// re-rendered the same settled artifacts in every historical chat
// card, repeating): the first cut derived the strip from the draft doc
// the card re-fetched at render time, so EVERY historical card in a
// replayed transcript stamped the WHOLE bench's current heroes under
// itself — N cards × every settled stage, stale artifacts included.
// The persisted meta row is frozen by construction (the projector
// runs once, on the settled value — live streaming and log replay
// read the same bytes), so a historical card shows exactly what THAT
// call produced, once, forever.
import { previewKindFor } from './preview-kinds.ts'

/** The in-chat hero kinds (the operator named image/audio/video). */
export type ChatPreviewKind = 'video' | 'image' | 'audio'

/** The persisted row the tool's presentationMeta carries: the press's
 *  own pass rows that minted an output url (the projector's shape —
 *  structural so callers pass the meta verbatim). */
export interface ChatPreviewRow {
  stage?: unknown
  url?: unknown
  status?: unknown
  /** THE FOUR-TAKE FACE (the stale-two-run audit, cure 2,
   *  2026-11-15): the row's OWN artifact set — media-spelled urls,
   *  the lead first — the projector persisted at settle. Absent on
   *  pre-cure rows (the lead alone renders, the old shape). */
  artifacts?: unknown
}

/** One frozen in-chat hero: its stage, its kind, its artifact set. */
export interface ChatPreview {
  stageId: string
  kind: ChatPreviewKind
  artifacts: Array<{ name: string, url: string }>
  runStatus: string
}

/** THE ROW'S ARTIFACT SET (cure 2, 2026-11-15): the persisted urls as
 *  {name, url} rows — the whole set renders (the all-visible law,
 *  card-base preview.tsx). The lead is ALWAYS first: the projector
 *  unshifts it, and a hand-built row without it gets it here — the
 *  hero seat never loses the url the meta names. A row with no set
 *  renders the lead alone (the pre-cure shape). */
function artifactSetOf(raw: unknown, lead: string): Array<{ name: string, url: string }> {
  const urls = Array.isArray(raw)
    ? raw.filter((u): u is string => typeof u === 'string' && u !== '')
    : []
  if (!urls.includes(lead)) urls.unshift(lead)
  return urls.map((u) => {
    const name = u.split('/').pop() ?? u
    return { name: name === '' ? u : name, url: u }
  })
}

/** Derive the frozen chat heroes from the call's OWN persisted rows.
 * @param rows The presentationMeta `previews` array, served verbatim
 *        (an absent key is an empty list — a card that pressed
 *        nothing renders no strip, the flood class dies at the root).
 * @returns One hero per row with a renderable artifact; mesh/text
 *          rows and rows with no url stay out (never a dead hero). */
export function chatPreviewsFor(rows: ReadonlyArray<ChatPreviewRow>): ChatPreview[] {
  const out: ChatPreview[] = []
  for (const row of rows) {
    const stageId = typeof row.stage === 'string' && row.stage !== '' ? row.stage : null
    const url = typeof row.url === 'string' && row.url !== '' ? row.url : null
    if (stageId === null || url === null) continue
    const kind = previewKindFor(url)
    if (kind !== 'video' && kind !== 'image' && kind !== 'audio') continue
    out.push({
      stageId,
      kind,
      artifacts: artifactSetOf(row.artifacts, url),
      runStatus: typeof row.status === 'string' ? row.status : '',
    })
  }
  return out
}
