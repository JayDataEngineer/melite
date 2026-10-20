// chat-preview.ts — Q3 (operator 2026-11-09): the frozen in-chat preview
// derivation. The chat card renders the settled stage's OWN artifacts
// (one hero per stage, harvested off the draft doc the card already
// fetched) — never a live tail. The bench keeps live progress; the
// thread keeps a replay-safe snapshot.
import { previewArtifactsFor, previewKindFor } from './preview-kinds.ts'

/** The in-chat hero kinds (the operator named image/audio/video). */
export type ChatPreviewKind = 'video' | 'image' | 'audio'

/** The stage face the derivation reads: identity + settled status +
 *  the served result. Structural (not DraftStage) so callers pass
 *  served rows without a cast — the door's superset is tolerated. */
export interface ChatPreviewStage {
  id?: unknown
  status?: unknown
  result?: unknown
}

/** One frozen in-chat hero: its stage, its kind, its single artifact. */
export interface ChatPreview {
  stageId: string
  kind: ChatPreviewKind
  artifacts: Array<{ name: string, url: string }>
  runStatus: string
}

/** Derive the frozen chat heroes for settled stages.
 * @param stages The draft doc's stage rows, served verbatim.
 * @returns One hero per stage with a renderable artifact; mesh/text
 * stages and stages with no artifacts stay out (never a dead hero). */
export function chatPreviewsFor(stages: ReadonlyArray<ChatPreviewStage>): ChatPreview[] {
  const out: ChatPreview[] = []
  for (const stage of stages) {
    const stageId = typeof stage.id === 'string' && stage.id !== '' ? stage.id : null
    if (stageId === null) continue
    const runStatus = typeof stage.status === 'string' ? stage.status : ''
    const first = previewArtifactsFor({ result: stage.result }).find((artifact) => {
      const kind = previewKindFor(artifact.url)
      return kind === 'video' || kind === 'image' || kind === 'audio'
    })
    if (first === undefined) continue
    out.push({
      stageId,
      kind: previewKindFor(first.url) as ChatPreviewKind,
      artifacts: [first],
      runStatus,
    })
  }
  return out
}
