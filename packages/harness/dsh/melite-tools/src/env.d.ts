// Minimal Node ambient for host-side handlers — melite-tools runs under the
// Bun/Node DSH host, but this package deliberately carries no @types/node
// install. Declare ONLY the surface src/ actually uses; extend it when a
// handler needs more (the typecheck lane fails loud on anything undeclared).
declare interface Buffer extends Uint8Array {
  toString(encoding?: string): string
}
declare var Buffer: {
  concat(list: readonly Buffer[]): Buffer
  // (2026-09-05, the enhance-route restoration) the catalog route frames
  // its own content-length; the handler builds one from a string.
  byteLength(text: string, encoding?: string): number
  from(text: string, encoding?: string): Buffer
};
