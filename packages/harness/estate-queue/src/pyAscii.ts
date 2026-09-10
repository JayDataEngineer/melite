// pyAscii.ts — ensure_ascii (py json ensure_ascii: every non-ASCII
// unit rides \uXXXX; astral chars become surrogate halves —
// charCodeAt gives exactly that, same as the ctx serializePy rule).
// ROW 29 STAGE 2 heritage: moved verbatim from gateway-core
// pyValue.ts when the queue core re-homed (REBUILD-5, 2026-09-10) —
// this is now the ONE shared address for the journal, sidecar, and
// serve writers (all three keep byte-safe ASCII output).
export function asciiEscape(text: string): string {
  return text.replace(
    /[^\x00-\x7F]/g,
    (ch: string): string =>
      "\\u" + ch.charCodeAt(0).toString(16).padStart(4, "0"),
  );
}
