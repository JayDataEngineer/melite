/** The voice for a caught rejection, lossless by the estate's
 * failureText law (cards-resource-open.spec): an Error speaks its
 * message; any other thrown value (the transport fakes speak plain
 * strings) surfaces verbatim, never a fixed fallback that masks the
 * thrower's words. One voice for every catch face in this package —
 * the silent-fallback audit's dead-fallback family folds here. */
export function rejectionVoice(e) {
    return e instanceof Error ? e.message : String(e);
}
/** The voice for a refused HTTP response, the same lossless law: a
 * JSON body's error field speaks itself; any other body names the
 * status and carries the raw text verbatim — never "undefined" for
 * a body the door never wrote as JSON.
 * @param res the refused response (already known !res.ok)
 * @returns the refusal's own words, for the operator's error line */
export async function refusalVoice(res) {
    const raw = await res.text().catch(() => '');
    try {
        const parsed = JSON.parse(raw);
        if (typeof parsed.error === 'string' && parsed.error !== '')
            return parsed.error;
    }
    catch {
        // not JSON — the raw body below is the door's own words
    }
    return `HTTP ${res.status}${raw === '' ? '' : `: ${raw}`}`;
}
//# sourceMappingURL=rejection-voice.js.map
