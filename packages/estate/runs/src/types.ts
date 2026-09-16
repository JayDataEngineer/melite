// The runs remote's public boundary types (the generator's law:
// remote boundary types export from a public non-root type subpath).
/** The wire-honest JSON value (the drafts remote's own spelling —
 *  payloads are honestly JSON all the way down). */
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { readonly [key: string]: JsonValue };

/** The submit doc's constrained wire shape (the remote boundary law —
 * assertRemoteJsonType refuses unconstrained unknown; values are
 * JSON-flat: the submit chain reads draft_id, everything else rides
 * for the registry's own envelope walk). */
export type RunStartDoc = { readonly [key: string]: JsonValue };

/** The run status/stop answer + the list row — JSON-flat rows (the
 *  registry's envelope is honestly JSON all the way down). */
export type RunRow = { readonly [key: string]: JsonValue };
