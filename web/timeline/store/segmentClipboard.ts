/**
 * E4.1 — Copy/paste segment params.
 *
 * Module-level clipboard holding a single snapshot of a segment's
 * `SegmentParams` together with its `prompt` + `negativePrompt`. Kept
 * OUT of the persisted timeline store on purpose — a clipboard is a
 * transient UI affordance, not document state, and we explicitly do
 * not want it serialized to IndexedDB or restored on reload.
 *
 * Round-trip: `copySegmentParams(seg)` snapshots the active segment;
 * `pasteParamsInto(target)` returns a fresh patch (a NEW object each
 * paste — never the stored reference) so callers can mutate freely.
 */
import type { SegmentParams, TimelineSegment } from "@melite/contracts"

/** Shape of the clipboard — params + the two prompt fields. */
export interface SegmentClipboard {
  params: SegmentParams
  prompt: string
  negativePrompt: string
  /** Source segment id (purely informational — lets the UI show
   *  "Pasted from seg-3" if we ever want to). */
  sourceId: string
  /** Epoch ms when the copy happened. */
  copiedAt: number
}

let _clipboard: SegmentClipboard | null = null

/**
 * Snapshot the segment's params + prompt + negativePrompt into the
 * module-level clipboard. Returns the snapshot (a defensive copy of
 * the params object — later mutations to the source segment do NOT
 * leak into the clipboard). Public for unit tests.
 */
export function copySegmentParams(seg: TimelineSegment): SegmentClipboard {
  const snapshot: SegmentClipboard = {
    // Shallow-clone the params object so the clipboard is immutable
    // from the caller's perspective. A deep clone is unnecessary —
    // SegmentParams is a flat bag of primitives + one nullable string
    // (motionVideoB64) and we never mutate fields in place.
    params: { ...seg.params },
    prompt: seg.prompt,
    negativePrompt: seg.negativePrompt,
    sourceId: seg.id,
    copiedAt: Date.now(),
  }
  _clipboard = snapshot
  return snapshot
}

/**
 * Returns a FRESH patch derived from the clipboard — params + prompt +
 * negativePrompt, ready to spread into `updateSegment(id, patch)`.
 * Returns `null` when the clipboard is empty (nothing copied yet).
 *
 * The returned object is a new reference every call so callers can
 * safely mutate it (e.g. strip the prompt before applying) without
 * touching the canonical clipboard. The `params` field is also cloned
 * for the same reason.
 */
export function pasteParamsInto(
  target: TimelineSegment,
): Partial<TimelineSegment> | null {
  if (!_clipboard) return null
  // The patch is segment-agnostic — we accept `target` purely so the
  // signature reads clearly at call sites ("paste INTO this segment")
  // and to leave room for future target-aware merges (e.g. preserving
  // the target's seed). For now, target is unused beyond existence.
  void target
  return {
    params: { ..._clipboard.params },
    prompt: _clipboard.prompt,
    negativePrompt: _clipboard.negativePrompt,
  }
}

/** Read-only accessor — returns the live clipboard reference (or null). */
export function getSegmentClipboard(): SegmentClipboard | null {
  return _clipboard
}

/** True when `copySegmentParams` has been called at least once. */
export function hasSegmentClipboard(): boolean {
  return _clipboard !== null
}

/** Clear the clipboard. Mostly useful for tests. */
export function clearSegmentClipboard(): void {
  _clipboard = null
}
