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

/** True the file-end law across lib text files (js, d.ts, maps) —
 * exactly one trailing newline; returns the number of files
 * corrected. */
export function ensureFinalNewlines(libDir: string): number

/** Raised when a LIVE build-plane process holds the tree lock;
 * `pid` is the live holder. */
export class TreeLockHeld extends Error {
  constructor(pid: number, lockDir: string)
  readonly pid: number
}

/** Acquire `<root>`'s one-writer build lock, creating the runtime
 * parent dirs a fresh clone lacks; returns the lock directory path.
 * `pid` is the holder (defaults to this process). */
export function acquireTreeLock(root: string, pid?: number): string

/** Release a lock acquired by acquireTreeLock; `lockDir` is the path
 * it returned. */
export function releaseTreeLock(lockDir: string): void
