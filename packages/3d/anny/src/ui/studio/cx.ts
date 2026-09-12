/** Local classnames joiner (the kit `cn` without the kit). */
export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ")
}
