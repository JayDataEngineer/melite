/** The admitted film load — exact off the doc, never estimated. */
export interface FilmLoad {
    windows: number;
    frames: number;
    width: number;
    height: number;
}
/** Live engine memory, bytes (ComfyUI /system_stats units). */
export interface EngineMem {
    vramFree: number;
    vramTotal: number;
}
/** Read the film load off a card body (h3-timeline calls shape).
 *  Null when the body carries no computable spans — the warn never
 *  refuses on shape (validate owns that); nothing computable means
 *  nothing to warn about. */
export declare function filmLoadOf(body: Record<string, unknown>): FilmLoad | null;
/** The pressure decision — null mem (telemetry down) or healthy
 *  pressure returns null: no warn. Only the pressured side speaks. */
export declare function filmMemoryWarn(load: FilmLoad, mem: EngineMem | null): string | null;
/** Live VRAM off the engine (primary device serves the film).
 *  Null on ANY failure (unreachable, unparseable, no devices) —
 *  the caller skips the warn, never fails admission. The fuse is
 *  dsh-timeout's deadline (no timer seat on this path — the manage
 *  plane's seat does not reach the start door). */
export declare function fetchEngineMem(baseUrl: string, fetchFn?: typeof fetch, timeoutMs?: number): Promise<EngineMem | null>;
//# sourceMappingURL=filmMemoryWarn.d.ts.map