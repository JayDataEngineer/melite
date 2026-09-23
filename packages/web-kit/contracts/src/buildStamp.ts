/**
 * buildStamp.ts — THE DEPLOY HANDSHAKE (the stale-tab root rot,
 * 2026-09-23).
 *
 * THE ROT (proven live on the 3088 lane): the dsh module loader
 * serves every client plugin through ONE muxed URL keyed by a rev
 * that hashes the plugin LIST — not the bytes — under
 * `cache-control: immutable, max-age=31536000`. A rebuilt card
 * bundle therefore lands on disk, is served to fresh browsers, and
 * remains INVISIBLE to every browser that ever cached the URL: no
 * push, no bust, no warning. An operator with a long-lived tab runs
 * a museum while the walls test the living tree — every "the fix
 * didn't work" report and every "it silently did nothing" night
 * rides this seam.
 *
 * THE HANDSHAKE (melite's layer; the /plugins route is upstream
 * dsh, not ours to patch): every client bundle bakes a content
 * stamp of its own code (the build appends `stampLine`); the lane
 * serves the CURRENT disk stamps on a no-store route; the cards tab
 * compares its baked stamp against the served one and renders an
 * unmissable face on mismatch. A stale tab can no longer masquerade
 * as the shipped build — the silence is the disease; the face is
 * the cure.
 *
 * THE LAW: the stamp is the sha1 of the bundle's code with any
 * trailing stamp line STRIPPED — build and server hash the same
 * prefix, so the appended line never perturbs its own value.
 */
import { createHash } from "node:crypto";

/** The global the baked line sets (read by the cards tab). */
export const BUILD_STAMP_GLOBAL = "__MELITE_BUILD_STAMP__";

/** The marker prefix identifying the appended stamp line. The line
 *  BEGINS with the marker (a leading newline of its own), so
 *  stripping at the marker restores the pre-stamp code EXACTLY. */
const STAMP_MARKER = `/*__MELITE_BUILD_STAMP__*/`;

/** Strip a trailing stamp line from bundle code, verbatim else.
 *  The stamp line owns NO leading newline (the preceding code's
 *  own terminator ends its last line), so slicing at the marker
 *  restores the pre-stamp code BYTE-EXACT — trailing newlines and
 *  all. This is the whole law: same prefix both sides, one stamp.
 */
export function unstamped(code: string): string {
  const at = code.lastIndexOf(STAMP_MARKER);
  return at === -1 ? code : code.slice(0, at);
}

/** The stamp OF bundle code: sha1 of the code sans its stamp line. */
export function stampOf(code: string): string {
  return createHash("sha1").update(unstamped(code)).digest("hex");
}

/** The line the build appends — sets the global to the stamp. */
export function stampLine(hex: string): string {
  return `${STAMP_MARKER}globalThis.${BUILD_STAMP_GLOBAL}=${JSON.stringify(hex)};\n`;
}
