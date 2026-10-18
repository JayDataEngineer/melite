// filmMemoryWarn.ts — F-6(b): the film lane warns at admission.
//
// The OOM record (attempt002/003): a film admitted under memory
// pressure burns the render — kernel OOM on host contention (43G +
// swap, load-264) and VRAM at 23.7/24.5 GiB (96.8%), while the
// retry that lived ran with 8.7G VRAM free. The TOOL half of the
// pre-flight (F-6(a) briefs the agent; this warns the run): at film
// admission the door reads the engine's live VRAM and, under the
// pressure line, stamps a warning on the run — the warn rides
// run_status, never a refusal. Admission NEVER blocks on telemetry:
// an unreachable engine skips the warn (the run is unaffected; the
// §21 engine-loss arm owns dead engines).
//
// The line (20% of device VRAM) interpolates between the two
// measured points on this box (failure 3%, success 35%) —
// documented here, not derived: a byte predictor would need
// measured per-family weight minima that exist nowhere on record,
// and LAW 2 forbids fabricating them. The warn names the admitted
// LOAD (windows/frames/geometry — exact, off the doc) against live
// FREE, so the pressure comparison is real on both sides.
import { deadline } from "@deepseek-ai/dsh-timeout";
/** Read the film load off a card body (h3-timeline calls shape).
 *  Null when the body carries no computable spans — the warn never
 *  refuses on shape (validate owns that); nothing computable means
 *  nothing to warn about. */
export function filmLoadOf(body) {
    const calls = body['calls'];
    if (!Array.isArray(calls) || calls.length === 0)
        return null;
    let frames = 0;
    let counted = 0;
    for (const c of calls) {
        if (typeof c !== 'object' || c === null)
            continue;
        const rec = c;
        const s = rec['start_frame'];
        const e = rec['end_frame'];
        if (typeof s !== 'number' || typeof e !== 'number' ||
            !Number.isInteger(s) || !Number.isInteger(e) || e <= s)
            continue;
        frames += e - s;
        counted++;
    }
    if (counted === 0)
        return null;
    const w = body['width'];
    const h = body['height'];
    return {
        windows: calls.length,
        frames,
        width: typeof w === 'number' && w > 0 ? w : 0,
        height: typeof h === 'number' && h > 0 ? h : 0,
    };
}
const GIB = 1024 ** 3;
const gib = (b) => (b / GIB).toFixed(1);
/** The pressure decision — null mem (telemetry down) or healthy
 *  pressure returns null: no warn. Only the pressured side speaks. */
export function filmMemoryWarn(load, mem) {
    if (mem === null)
        return null;
    if (!(mem.vramTotal > 0) || !(mem.vramFree >= 0))
        return null;
    if (mem.vramFree >= mem.vramTotal / 5)
        return null;
    const pct = ((mem.vramFree / mem.vramTotal) * 100).toFixed(0);
    const geo = load.width > 0 && load.height > 0 ? `, ${load.width}x${load.height}` : ', unstated geometry';
    return (`film admission: engine VRAM pressured — ${gib(mem.vramFree)} of ${gib(mem.vramTotal)} GiB free ` +
        `(${pct}%) below the 20% line for a ${load.windows}-window film (${load.frames} frames${geo}); ` +
        `a ComfyUI restart before the big film is sanctioned — an identical params/seed rerun rides the node cache.`);
}
/** Live VRAM off the engine (primary device serves the film).
 *  Null on ANY failure (unreachable, unparseable, no devices) —
 *  the caller skips the warn, never fails admission. The fuse is
 *  dsh-timeout's deadline (no timer seat on this path — the manage
 *  plane's seat does not reach the start door). */
export async function fetchEngineMem(baseUrl, fetchFn = globalThis.fetch, timeoutMs = 5000) {
    const dl = deadline(undefined, timeoutMs, "ENGINE_MEM");
    try {
        const r = await fetchFn(baseUrl.replace(/\/+$/, '') + '/system_stats', { signal: dl.signal });
        const stats = (await r.json());
        const devices = stats['devices'];
        if (!Array.isArray(devices) || devices.length === 0)
            return null;
        const d = devices[0];
        const free = d['vram_free'];
        const total = d['vram_total'];
        if (typeof free !== 'number' || typeof total !== 'number')
            return null;
        return { vramFree: free, vramTotal: total };
    }
    catch {
        return null;
    }
    finally {
        dl[Symbol.dispose]();
    }
}
//# sourceMappingURL=filmMemoryWarn.js.map