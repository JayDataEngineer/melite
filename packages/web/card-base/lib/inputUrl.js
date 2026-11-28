import { mediaVocab } from '@melite/contracts/mediaKinds';
// THE IMAGE FACE IS THE SHARED VOCABULARY, MINUS SVG (the
// MCP/media audit's M1): these predicates used to retype their own
// extension list, so an extension the classifier knows (svg) never
// rendered, one it does not (avif) rendered but never listed, and
// neither was a bug anyone could see. The list is the media
// contract's now, plus avif (which the square has always rendered)
// MINUS svg — a DELIBERATE divergence, pinned by the square wall:
// an svg is classified as an image (it IS one) but a square would
// embed it as a document, so the thumbnail face refuses it and the
// picker offers it as a file.
const IMAGE_EXTS = [...mediaVocab().image, 'avif'].filter((e) => e !== 'svg');
/** An image extension at the value's end (a query or fragment may
 *  follow it) — the shared vocabulary's image face. */
export const IMAGE_EXT_RE = new RegExp('\\.(?:' + IMAGE_EXTS.join('|') + ')(?:[?#]|$)', 'i');
/** THE INPUT-PATH DISPLAY MIRROR (2026-10-13, the operator's live
 *  burn: uploads persist as estate paths — 'data/input/x.png', the
 *  uploads door's own param currency — and the square rendered a
 *  BLANK face because no isImageUrl arm matches a relative path).
 *  The uploads door's contract already serves the bytes for the img
 *  tags (GET /v1/assets/inputs/<name>, doors.ts's own doc line);
 *  this resolver is the display half: an estate input path with an
 *  image extension renders from the assets door. DISPLAY ONLY —
 *  the param keeps the estate path verbatim (the run stages it
 *  into the engine's input dir; the currency law, wire.ts).
 *
 *  THE ONE DERIVATION (2026-11-28, the source-photo row's cure):
 *  this module is the single home of the grammar — the square, the
 *  rail, and the mesh stage's source-photo badge all resolve through
 *  it. The badge used to carry its own copy (meshAssetUrl) that never
 *  received the absolute-tail arm, so a stage doc holding the HOST
 *  spelling of an uploads leaf previewed on the square and 404'd on
 *  the badge in the same card. */
/**
 * @param value - the attached value (an estate input path or any other string).
 * @returns the assets-door display URL for an estate input path, else null.
 */
export function estateInputUrl(value) {
    // THE ABSOLUTE-TAIL ARM (the agent-refs burn, 2026-11-22): an
    // agent-landed ref arrives as the HOST spelling of the same
    // uploads currency — '/home/…/data/input/x.png' — a path no <img>
    // can fetch and no earlier arm healed (runHostMediaUrl needs a
    // run-id segment; isImageUrl passed the raw path and the browser's
    // broken-image glyph flipped the face to the HELD text). The
    // uploads tree is the leaf: every leading segment up to the LAST
    // 'data/input/' pair is address, and the single-segment grammar
    // the door enforces (doors.ts SEG) rides the leaf. A value whose
    // tail is not the uploads tree still heals nothing.
    const tail = value.lastIndexOf('data/input/');
    if (tail > 0) {
        const leaf = value.slice(tail + 'data/input/'.length);
        if (/^[^/]+$/.test(leaf) && IMAGE_EXT_RE.test(leaf)) {
            return '/v1/assets/inputs/' + encodeURIComponent(leaf);
        }
        return null;
    }
    const m = /^data\/input\/([^/]+)$/.exec(value);
    if (m === null)
        return null;
    const name = m[1];
    return IMAGE_EXT_RE.test(name) ? '/v1/assets/inputs/' + encodeURIComponent(name) : null;
}
//# sourceMappingURL=inputUrl.js.map
