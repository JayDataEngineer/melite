const QVOICE_NUMBER = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;
function qvoiceStrength(value) {
    if (value === undefined || value === null || value === '')
        return undefined;
    const n = typeof value === 'number'
        ? value
        : typeof value === 'string' && QVOICE_NUMBER.test(value.trim())
            ? Number(value.trim())
            : Number.NaN;
    if (!Number.isFinite(n) || n < 0 || n > 2) {
        throw new Error("qvoice voice_strength must be a finite number from 0 to 2");
    }
    return n;
}
function qvoiceRow(value, fallbackStrength) {
    if (value === undefined || value === null)
        return undefined;
    if (typeof value === 'string') {
        const path = value.trim();
        return path ? { path, strength: qvoiceStrength(fallbackStrength) } : undefined;
    }
    if (Array.isArray(value)) {
        if (value.length === 0)
            return undefined;
        if (value.length !== 1)
            throw new Error('qvoice accepts one media entry');
        return qvoiceRow(value[0], fallbackStrength);
    }
    if (typeof value !== 'object') {
        throw new Error('qvoice must be a path or one-entry qvoice bag');
    }
    const record = value;
    if (Object.keys(record).length === 1 && Object.prototype.hasOwnProperty.call(record, 'item')) {
        const item = record['item'];
        if (Array.isArray(item) && item.length === 0)
            return undefined;
        return qvoiceRow(item, fallbackStrength);
    }
    const pathValue = record['qvoice'];
    if (typeof pathValue !== 'string') {
        throw new Error('qvoice bag entry requires a string qvoice path');
    }
    const path = pathValue.trim();
    if (!path)
        return undefined;
    const strength = record['voice_strength'] ?? fallbackStrength;
    return { path, strength: qvoiceStrength(strength) };
}
export function qvoiceUse(p) {
    return qvoiceRow(p['qvoice'], p['voice_strength']);
}
// TTST1 IS FAMILY-OWNED (the kit-arm retirement, 2026-09-30): the qwen3-tts
// family composes its own lane in its declared action (pinned to committed
// goldens in that family's tests/golden/). This arm is deleted; the family is
// the only home of the lane.
// THE TTS LANE IS FAMILY-OWNED (the kit-arm retirement, 2026-09-30):
// the qwen3-tts and qwen3-tts-voicedesign families compose their own
// speak/clone/use/export lanes in their declared actions (pinned to
// committed goldens in those families' tests/golden/). These sub-arms
// go with the lane; the qvoice READER above stays — the families' own
// actions read their qvoice through it (admission, not lane).
// TTSDESIGNT1 IS FAMILY-OWNED (the kit-arm retirement, 2026-09-30): the qwen3-tts-voicedesign
// family composes its own lane in its declared action (pinned to committed
// goldens in that family's tests/golden/). This arm is deleted; the family is
// the only home of the lane.
// sfxT1 IS FAMILY-OWNED (the kit-arm retirement, 2026-09-30): the
// moss-sfx family composes its own lane in its declared action
// (packages/models/moss-sfx/src/actions.ts, pinned to committed goldens in
// that family's tests/golden/). This arm is deleted; the family is the
// only home of the lane.
//# sourceMappingURL=lanes-audio.js.map