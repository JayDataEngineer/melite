/**
 * sleep.ts — ONE delay for the package (the hand-roll audit's 7.9).
 *
 * Four clones across this package's own sources carried three
 * different contracts: an abortable sleep that rejects with an
 * `AbortError` (api.ts's retry backoff), a plain delay
 * (text-to-pose's poll), and two inline `new Promise(r =>
 * setTimeout(r, ms))` waits (FlowProtocol's poll ticks). They are one
 * function with an optional signal: a caller with no signal gets the
 * plain delay, a caller with one gets the abort that clears the timer.
 *
 * Why this is a local module and not the DSH timer seat: this package
 * is a browser client (no `Context`), and `ctx.timeout` is fiber-owned
 * by the Cordis plugin. The cross-package fold the row names is
 * unavailable to every one of these sites for that reason alone; what
 * IS available is one implementation per package, which is this.
 * @module @melite/catalog/sleep
 */
/**
 * Await `ms` milliseconds; an `AbortSignal` clears the timer and
 * rejects with a DOM `AbortError`, the spelling the retry path
 * already catches.
 * @param ms - delay in milliseconds.
 * @param signal - optional cancellation; an already-aborted signal rejects without waiting.
 * @returns resolves after the delay, rejects on abort.
 */
export function sleep(ms, signal) {
    return new Promise((resolve, reject) => {
        if (signal?.aborted === true) {
            reject(new DOMException('Aborted', 'AbortError'));
            return;
        }
        const timer = setTimeout(() => {
            signal?.removeEventListener('abort', onAbort);
            resolve();
        }, ms);
        const onAbort = () => {
            clearTimeout(timer);
            reject(new DOMException('Aborted', 'AbortError'));
        };
        signal?.addEventListener('abort', onAbort, { once: true });
    });
}
//# sourceMappingURL=sleep.js.map