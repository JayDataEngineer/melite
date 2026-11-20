/** THE QUEUE OWNERSHIP LAW (the operator's-bench burn, 2026-11-20):
 * the battery's drain once wiped the engine queue whole —
 * `POST /queue {clear: true}` + a blind interrupt — licensed by the
 * serial-battery assumption "our row is the queue's content". With
 * the operator pressing a live bench on the same engine that
 * assumption is false: the wipe deleted THEIR pending renders and
 * the interrupt killed the run mid-flight. The engine queue carries
 * no owner field, but the estate stamps every submitted run's
 * ENGINE-SIDE prompt id onto its own sidecar receipt
 * (graph_receipt.prompt_id — minted at POST /prompt, so it cannot
 * be guessed), and the drain knows its own run's id. Ownership is
 * exact: partition by prompt_id, clear only ours, name foreign
 * work without touching it.
 *
 * Pure data — no imports — so the walls tier judges it without
 * dragging the harness's engine-facing module graph. */

/** Read an engine queue entry's prompt_id. The /queue face wraps
 * entries either as `[execution_number, prompt_id, ...]` arrays
 * (the historic face) or `{prompt_id}` objects (the object face) —
 * both seen across engine versions. Any other shape owns no id:
 * the empty string. The dangerous direction is misclassifying a
 * foreign item as ours (the drain would clear it), so unknown
 * shapes fail closed to NOT-ours. */
export const queueEntryPromptId = (entry: unknown): string => {
  if (Array.isArray(entry)) {
    const at = entry[1]
    return typeof at === 'string' && at !== '' ? at : ''
  }
  if (entry !== null && typeof entry === 'object' && !Array.isArray(entry)) {
    const at = (entry as Record<string, unknown>)['prompt_id']
    return typeof at === 'string' && at !== '' ? at : ''
  }
  return ''
}

/** Partition queue items into OURS (exact prompt_id match — the
 * drain may clear and interrupt these) and FOREIGN (the operator's
 * live work — never cleared, never failed on). The counts are
 * honest: foreign is a number, ours is the matched entries. */
export const partitionQueue = (
  items: readonly unknown[],
  ours: string,
): { ours: unknown[]; foreign: number } => {
  const matched: unknown[] = []
  let foreign = 0
  for (const entry of items) {
    if (ours !== '' && queueEntryPromptId(entry) === ours) matched.push(entry)
    else foreign += 1
  }
  return { ours: matched, foreign }
}
