/** Frozen vocabularies — types + vocabulary CONSTANTS only (no
 * render, no fetch; the icon-bearing META table stays app-side). */

export const Provenance = {
  agent: "agent",
  user: "user",
  imported: "imported",
} as const

export type Provenance = (typeof Provenance)[keyof typeof Provenance]

export const PROVENANCE_VALUES: readonly Provenance[] = Object.values(Provenance)

/** Is the value a valid Provenance? Gate untrusted JSON (a past run's
 * metadata, a drag payload) before rendering. */
export function isProvenance(v: unknown): v is Provenance {
  return typeof v === "string" && (PROVENANCE_VALUES as string[]).includes(v)
}
