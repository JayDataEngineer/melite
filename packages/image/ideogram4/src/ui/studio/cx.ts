/**
 * cx — the studio-local class joiner (replaces the kit `cn`:
 * clsx + tailwind-merge). With tailwind gone there are no
 * conflicting utilities to merge — plain join is exact.
 */
export function cx(
  ...parts: Array<string | false | null | undefined>
): string {
  return parts.filter(Boolean).join(" ")
}
