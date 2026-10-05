/** The voice for a caught rejection, lossless by the estate's
 * failureText law (cards-resource-open.spec): an Error speaks its
 * message; any other thrown value (the transport fakes speak plain
 * strings) surfaces verbatim, never a fixed fallback that masks the
 * thrower's words. One voice for every catch face in this package —
 * the silent-fallback audit's dead-fallback family folds here. */
export function rejectionVoice(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}
