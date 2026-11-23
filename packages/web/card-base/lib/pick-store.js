// pick-store.ts — THE PICK MIRROR (the DSH client-state law's
// store seat for the preview's history pick: "identity-stable,
// React-free mirrors"; a presentation component never owns
// store-lifetime state).
//
// The mirror is keyed by the view's IDENTITY — the stage plus the
// current run's urls — and is shared across mounts: an unkeyed
// remount (the drill swaps stages in the same mount position)
// reads the SAME cell as its identity dictates, so a different
// stage or a new run is a DIFFERENT cell (fresh, unpicked) and a
// pick can never leak across stages or runs; history growth keeps
// the same cell, so a keyed pick survives index shifts. No
// effects, no mount-lifetime coupling. THE CAP: 64 cells,
// insertion-pruned — a long session never grows the map unbounded.
//
// The keyed, capped, identity-addressed shape is NOT the DSH
// store registration (packages/@deepseek-ai/dsh-client-store's
// contract: the framework creates one instance per entry x scope
// and components never construct one). This mirror answers a
// different question — many small cells addressed by a view
// identity, with a cap — so it stays a package-local React-free
// module and preview.tsx only subscribes to it.
const pickCells = new Map();
const PICK_CELL_CAP = 64;
/** The cell for a view identity, created on first use and
 *  refreshed to the newest insertion on every later read (LRU, not
 *  FIFO-of-birth); the oldest insertion is pruned at the cap. */
export function pickCellOf(id) {
    let cell = pickCells.get(id);
    if (cell === undefined) {
        if (pickCells.size >= PICK_CELL_CAP) {
            // the map is non-empty at cap — take the OLDEST insertion
            for (const oldest of pickCells.keys()) {
                pickCells.delete(oldest);
                break;
            }
        }
        cell = { key: null, listeners: new Set() };
        pickCells.set(id, cell);
    }
    else {
        // refresh insertion order (LRU, not FIFO-of-birth)
        pickCells.delete(id);
        pickCells.set(id, cell);
    }
    return cell;
}
/** The cell's current key, and the write that notifies every
 *  subscriber of the cell. */
export function readPick(cell) {
    return cell.key;
}
/** Write a cell's key and invalidate its subscribers. */
export function writePick(cell, next) {
    cell.key = next;
    for (const l of cell.listeners)
        l();
}
/** The test seam: cells are module-shared BY DESIGN (identity-stable
 *  across mounts); walls reset between cases so no pick bleeds. */
export function resetPickCellsForTests() {
    pickCells.clear();
}
//# sourceMappingURL=pick-store.js.map