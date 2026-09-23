/**
 * buildStamp.ts — THE DEPLOY HANDSHAKE (the stale-tab root rot,
 * 2026-09-23; AMENDED the same night: THE GUILLOTINE).
 *
 * THE ROT (proven live on the 3088 lane): the dsh module loader
 * serves every client plugin through ONE muxed URL keyed by a rev
 * that hashes the plugin LIST — not the bytes — under
 * `cache-control: immutable, max-age=31536000`. A rebuilt card
 * bundle therefore lands on disk, is served to fresh browsers, and
 * remains INVISIBLE to every browser that ever cached the URL.
 *
 * THE HANDSHAKE: every client bundle bakes a content stamp of its
 * own code (the build appends `stampLine`); the lane serves the
 * CURRENT disk stamps on a no-store route; the cards tab compares
 * and renders an unmissable face on mismatch.
 *
 * THE GUILLOTINE (the amendment, paid for live): the first cut of
 * this law stripped at `lastIndexOf(marker)` — and a bundle that
 * INLINES this module carries the marker literal inside its own
 * template string, so the strip guillotined the bundle mid-
 * expression and the whole muxed /plugins payload failed to parse:
 * every plugin in the operator's browser refused to register. The
 * strip is now STRUCTURAL: the marker only counts when it BEGINS
 * the final content line and everything after it is EXACTLY the
 * stamp assignment — a marker sighted anywhere else is inert text.
 *
 * THE LAW: the stamp is the sha1 of the bundle's code with its own
 * trailing stamp line removed — build and server hash the same
 * prefix, so the appended line never perturbs its own value.
 */
import { createHash } from "node:crypto";

/** The global the baked line sets (read by the cards tab). */
export const BUILD_STAMP_GLOBAL = "__MELITE_BUILD_STAMP__";

/** The marker prefix identifying the appended stamp line. */
export const STAMP_MARKER = "/*__MELITE_BUILD_STAMP__*/";

/** The exact shape of a stamped tail: marker at line start, then
 *  the assignment, then nothing but whitespace to end-of-file. */
const STAMPED_TAIL = new RegExp(
  `${STAMP_MARKER.replace(/[*/]/g, (ch) => `\\${ch}`)}` +
    `globalThis\\.${BUILD_STAMP_GLOBAL}="[0-9a-f]{40}";\\s*$`,
);

/** Strip the bundle's OWN trailing stamp line, verbatim else. A
 *  marker anywhere else (inside a string, a template literal, an
 *  inlined copy of this very module) is NOT a stamp line — the
 *  guillotine law: strip structurally or not at all. */
export function unstamped(code: string): string {
  const at = code.lastIndexOf(STAMP_MARKER);
  if (at === -1) return code;
  const tail = code.slice(at);
  if (!STAMPED_TAIL.test(tail)) return code;
  // the marker begins its own line: reclaim that line's newline too
  const before = code.slice(0, at);
  return before.endsWith("\n") ? before.slice(0, -1) : before;
}

/** The stamp OF bundle code: sha1 of the code sans its stamp line. */
export function stampOf(code: string): string {
  return createHash("sha1").update(unstamped(code)).digest("hex");
}

/** The line the build appends — sets the global to the stamp. */
export function stampLine(hex: string): string {
  return `\n${STAMP_MARKER}globalThis.${BUILD_STAMP_GLOBAL}=${JSON.stringify(hex)};\n`;
}
