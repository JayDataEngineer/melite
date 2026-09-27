// The mcp client's package ships its types at lib/types, not beside
// the entry the lane mounts (lib/index.js), so a relative import of
// the entry is implicit-any to every typecheck tier. The e2e file
// consumes the face ONLY through `as unknown as` casts — its shape
// is pinned at each call site, not here — so the honest ambient
// wildcard types the module as a face carrying `apply` and nothing
// more. Found by the repo tier's first sweep (the audit's gate
// hole: tests/e2e was typed by nothing).
declare module "*dsh-mcp-client/lib/index.js" {
  export const apply: unknown;
}
