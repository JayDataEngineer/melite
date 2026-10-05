/**
 * useFeed — the ONE fetch/load/never-stale engine for sidebar feeds
 * (audit F6: the runs and drafts feeds each carried a hand-copied
 * load + 15s-throttled visibility/focus refetch + error trio).
 *
 * decode validates at the door: it receives unknown JSON and returns the
 * typed feed; malformed shapes fall back to empty lists THERE, in one
 * place per feed, instead of Array.isArray sprinkles at render sites.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
/** Refetch when the page becomes visible / regains focus, throttled.
 * A new chat session does NOT reload the SPA — without this the panel
 * sits on hour-old data while fresh runs exist. */
function useRefreshOnVisible(reload, throttleMs) {
    const ref = useRef(reload);
    ref.current = reload;
    useEffect(() => {
        let last = Date.now();
        const refresh = () => {
            if (Date.now() - last < throttleMs)
                return;
            last = Date.now();
            ref.current();
        };
        const onVis = () => { if (document.visibilityState === 'visible')
            refresh(); };
        document.addEventListener('visibilitychange', onVis);
        window.addEventListener('focus', refresh);
        return () => {
            document.removeEventListener('visibilitychange', onVis);
            window.removeEventListener('focus', refresh);
        };
    }, [throttleMs]);
}
export function useFeed(url, decode, initial) {
    const [data, setData] = useState(initial);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const load = useCallback(() => {
        setLoading(true);
        setError('');
        fetch(url)
            .then(async (r) => {
            const json = await r.json();
            if (!r.ok) {
                const msg = json.error;
                throw new Error(typeof msg === 'string' && msg !== '' ? msg : 'HTTP ' + String(r.status));
            }
            setData(decode(json));
        })
            .catch((e) => { setError(e instanceof Error ? e.message : String(e)); })
            .finally(() => { setLoading(false); });
    }, [url, decode]);
    useEffect(() => { load(); }, [load]);
    useRefreshOnVisible(load, 15_000);
    return { data, loading, error, reload: load, setData };
}
//# sourceMappingURL=useFeed.js.map
