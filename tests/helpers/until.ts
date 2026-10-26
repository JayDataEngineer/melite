// tests/helpers/until.ts — the bounded condition wait (flake audit
// 2026-10-13 item 7). `for (i < turns && !probe()) await setTimeout()`
// cannot hang (turns cap) and, unlike a fixed `await sleep(700)`, is a
// wait on the CONDITION, not a guess at when it lands: a fast machine
// returns the moment the probe holds, a slow one gets the whole turn
// budget instead of a false failure.
/**
 * Resolve once `probe` holds, bounded by a turn cap.
 * @param probe condition checked after every turn
 * @param opts.turns macrotask budget before the wait fails (default 500)
 * @param opts.intervalMs real milliseconds per turn — 0 drains
 *   microtask/macrotask chains; >0 crosses real-time deferrals such as
 *   debounce or revoke timers (500 turns at 10ms = 5s ceiling)
 */
export async function until(
  probe: () => boolean,
  opts: { turns?: number; intervalMs?: number } = {},
): Promise<void> {
  const turns = opts.turns ?? 500;
  const intervalMs = opts.intervalMs ?? 0;
  for (let i = 0; i < turns && !probe(); i++) {
    await new Promise((resolve) => { setTimeout(resolve, intervalMs); });
  }
  if (!probe()) {
    throw new Error(`condition never held within ${String(turns)} turns`);
  }
}
