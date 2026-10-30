/** One satisfiable byte window, inclusive on both ends. */
export interface ByteRange {
    readonly start: number;
    readonly end: number;
}
/** Parse one `Range` request header against a known body size.
 *
 * - `null` — serve the FULL 200: no header, or an ignorable
 *   spelling (malformed, multi-range, `bytes=-`, inverted bounds).
 *   A server MAY ignore; this route ignores rather than erroring —
 *   a stray header never breaks a plain GET.
 * - `'unsatisfiable'` — the loud 416: no byte of the file can
 *   satisfy the ask (start at/past EOF, or a zero-length suffix).
 * - `{ start, end }` — serve 206 with bytes start..end inclusive;
 *   a missing/overlong end clamps to the last byte.
 *
 * The unit word is matched case-SENSITIVELY (`bytes=`) — what every
 * browser sends; exotic spellings fall to the ignore arm, never a
 * wrong slice. */
export declare function parseRangeHeader(header: string | undefined, size: number): ByteRange | 'unsatisfiable' | null;
//# sourceMappingURL=mediaRange.d.ts.map
