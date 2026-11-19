/** Frozen vocabularies — types + vocabulary CONSTANTS only (no
 * render, no fetch; the icon-bearing META table stays app-side). */

export const Authorship = {
  agent: "agent",
  user: "user",
  imported: "imported",
} as const

export type Authorship = (typeof Authorship)[keyof typeof Authorship]

export const AUTHORSHIP_VALUES: readonly Authorship[] = Object.values(Authorship)

/** Is the value a valid Authorship? Gate untrusted JSON (a past run's
 * metadata, a drag payload) before rendering. */
export function isAuthorship(v: unknown): v is Authorship {
  return typeof v === "string" && (AUTHORSHIP_VALUES as string[]).includes(v)
}
