/** One cell: the picked key plus its subscribers. */
export type PickCell = {
    key: string | null;
    listeners: Set<() => void>;
};
/** The cell for a view identity, created on first use and
 *  refreshed to the newest insertion on every later read (LRU, not
 *  FIFO-of-birth); the oldest insertion is pruned at the cap. */
export declare function pickCellOf(id: string): PickCell;
/** The cell's current key, and the write that notifies every
 *  subscriber of the cell. */
export declare function readPick(cell: PickCell): string | null;
/** Write a cell's key and invalidate its subscribers. */
export declare function writePick(cell: PickCell, next: string | null): void;
/** The test seam: cells are module-shared BY DESIGN (identity-stable
 *  across mounts); walls reset between cases so no pick bleeds. */
export declare function resetPickCellsForTests(): void;
//# sourceMappingURL=pick-store.d.ts.map