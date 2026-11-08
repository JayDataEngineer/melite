import { schedulePersist } from "./timelinePersistence.js";
// ── Undo/Redo history ─────────────────────────────────────────────────────────
export const _history = [];
export let _historyIdx = -1;
export const MAX_HISTORY = 50;
export function pushHistory(segments, audioCues) {
    _history.splice(_historyIdx + 1);
    _history.push({
        segments: segments.map(s => ({ ...s, params: { ...s.params } })),
        audioCues: audioCues.map(c => ({ ...c })),
    });
    if (_history.length > MAX_HISTORY)
        _history.shift();
    _historyIdx = _history.length - 1;
}
/**
 * Undo/redo actions. They live here (with the stack they mutate) and are
 * composed into the store by timelineStore.ts. Bodies are verbatim moves.
 */
export function createHistorySlice(set, get) {
    return {
        undo: () => {
            if (_historyIdx <= 0)
                return;
            _historyIdx--;
            const snap = _history[_historyIdx];
            // Proven dead false-arm (2026-09-12): the bound above guarantees
            // _historyIdx >= 0 after decrement, and the push/shift/undo
            // transitions maintain 0 <= _historyIdx <= _history.length - 1
            // whenever the list is non-empty — the slot always holds a snapshot.
            /* v8 ignore next -- snap always defined inside the history bounds (2026-09-12) */
            if (snap) {
                set({ segments: snap.segments, audioCues: snap.audioCues });
                schedulePersist(get());
            }
        },
        redo: () => {
            if (_historyIdx >= _history.length - 1)
                return;
            _historyIdx++;
            const snap = _history[_historyIdx];
            // Proven dead false-arm (2026-09-12): same bounds argument as undo —
            // the guard guarantees _historyIdx <= _history.length - 1, so the
            // slot always holds a snapshot.
            /* v8 ignore next -- snap always defined inside the history bounds (2026-09-12) */
            if (snap) {
                set({ segments: snap.segments, audioCues: snap.audioCues });
                schedulePersist(get());
            }
        },
    };
}
//# sourceMappingURL=timelineHistory.js.map