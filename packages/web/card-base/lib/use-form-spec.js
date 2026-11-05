/** use-form-spec.ts — extracted from form.tsx (hour 15, the godfile split; the
 *  operator's DRY audit law: one seam, one small file, one wall). */
import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchFormSpec } from "./wire.js";
import { rejectionVoice } from "./rejection-voice.js";
/** THE SERVED-SPEC HOOK (the DRY extraction, 2026-09-13): four
 *  consumers (mask-studio's TuneSection, h3's RunAdvancedPanels,
 *  img-to-mesh's client, ideogram4's client) each hand-copied the
 *  same fetch-once + abort dance. One spelling now: fetches
 *  /v1/form-spec?model=<id> when the id is non-empty, aborts the
 *  in-flight fetch on unmount or id change, and hands back the doc
 *  (null until it lands) + the refusal message (null unless the door
 *  refused — loud consumers render it, silent ones ignore it).
 *  Consumer-specific derivations (field filters, value seeding) stay
 *  at the call site as reactions to `spec`. */
export function useFormSpec(modelId) {
    const [spec, setSpec] = useState(null);
    const [error, setError] = useState(null);
    // one monotonic token per hook instance: every flight (the mount
    // effect's or a refresh call's) claims it; only the newest may
    // setState — an id change or a later refresh orphans the older
    // flight's answer instead of clobbering the newer doc
    const tokenRef = useRef(0);
    const id = typeof modelId === 'string' && modelId !== '' ? modelId : null;
    useEffect(() => {
        if (id === null)
            return;
        const ctl = new AbortController();
        const token = ++tokenRef.current;
        setSpec(null);
        setError(null);
        fetchFormSpec(id, ctl.signal)
            .then((doc) => { if (tokenRef.current === token)
            setSpec(doc); })
            .catch((e) => {
            // a superseded flight (the id re-keyed mid-read) aborts by
            // design — its AbortError is cleanup, never an error face
            // beside the next family's healthy spec (audit X-S1)
            if (ctl.signal.aborted)
                return;
            if (tokenRef.current === token)
                setError(rejectionVoice(e));
        });
        return () => { ctl.abort(); };
    }, [id]);
    const refresh = useCallback(async () => {
        if (id === null)
            return;
        const token = ++tokenRef.current;
        try {
            const doc = await fetchFormSpec(id);
            if (tokenRef.current === token)
                setSpec(doc);
        }
        catch (e) {
            // the standing spec survives a refused refresh — the operator
            // keeps editing against the last healthy serve
            if (tokenRef.current === token)
                setError(rejectionVoice(e));
        }
    }, [id]);
    return { spec, error, refresh };
}
//# sourceMappingURL=use-form-spec.js.map
