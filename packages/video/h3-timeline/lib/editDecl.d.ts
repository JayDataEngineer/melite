/**
 * editDecl.ts — THE EDIT DECLARATION'S CLIENT-SAFE SEAT.
 *
 * THE SEAM (the client-bundle purity gate, 2026-11-09): the edit
 * row's rail projection must read the declaration's own field rows
 * — a hand-copied roster would drift while the declaration moved —
 * but the card module (EDIT_MOD's home) imports the compose plane
 * (schema builders, schemastery), and a client value-import of it
 * refuses the client bundle. THE DECLARATION DATA therefore lives
 * here, in a leaf with NO imports: the card seats EDIT_MOD.fields
 * on EDIT_FIELDS (one spelling, the card stays the SSOT), and the
 * studio rail derives its projection from the SAME rows the card
 * serves — the internal/visible_when law judged at the
 * declaration, never re-typed beside it.
 */
/** The edit door's declared field rows — the single spelling the
 *  card serves and the rail projects. Pure data; the card owns the
 *  law these rows carry (internal = admitted, never the operator's
 *  face; visible_when = the posture guards the form shows). */
export declare const EDIT_FIELDS: readonly Record<string, unknown>[];
/** Evaluate one edit field's visible_when guards against the entry
 *  the row rides — the grammar the served form renders (guards
 *  joined by `&`, `key=value`, `!=` negation, `|`-sets), spelled
 *  once at the declaration's owner so the rail judges the same
 *  conditions the form shows for the SAME entry.
 *  @param guard the field's declared visible_when ("key=value&…")
 *  @param entry the edit bag's first entry (the sibling values)
 *  @returns true when every guard holds */
export declare function editGuardHolds(guard: string, entry: Record<string, unknown>): boolean;
/** THE RAIL PROJECTION (operator 2026-11-09, the pasted timeline
 *  DOM: the edit commission row printed "window_start 0 ·
 *  window_length 0 · clip_seconds 6 · overlap_frames 39 ·
 *  segment_crf 18 · scale 2 · extend_seconds 2.33" — the frame
 *  dialect and posture-dead seats under the row's label, while the
 *  one concept the edit door adds, the carry split, had no seat at
 *  all). Saved edit entries carry STAMPED DEFAULTS for every
 *  field, so printing every scalar reads as if the run rode all of
 *  them. This projection derives the row from EDIT_FIELDS at
 *  runtime — never a hand-copied roster: an `internal` row never
 *  reaches the rail (admitted at the compose door, never the
 *  operator's seat), and a visible_when-guarded row reaches it
 *  only when its guards hold (scale prints only under refine=true,
 *  extend_seconds only under continuation=true — a seat the run
 *  does not read never prints as if it rode). Undeclared scalar
 *  keys the entry still carries append last — the no-silent-drop
 *  law: state the drift, never hide it. `carry` is skipped here;
 *  the rail's own lead seat states the split in the compose
 *  door's words.
 *  @param entry the edit bag's first entry
 *  @returns the seats the run reads, declaration order */
export declare function editRailSeats(entry: Record<string, unknown>): Array<{
    key: string;
    value: string;
}>;
//# sourceMappingURL=editDecl.d.ts.map
