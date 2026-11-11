/** The declaration face of tools/build-plane.mjs — the .mjs is
 * JS-by-design repo tooling, and the TS test tier (spec files
 * typecheck against declarations) needs the pairing for the one
 * consumer: the bundle-repro gate imports the canonical declaration
 * finisher so the repro rebuilds with the build's own recipe. This
 * face declares the exported signature TS consumers reach — the
 * recipe itself lives in the .mjs, never here. */

/** Rewrite relative .ts/.tsx specifiers inside emitted .d.ts files
 * under libDir to their .js twins; returns the number of
 * declarations touched. */
export function rewriteDeclSpecifiers(libDir: string): number
