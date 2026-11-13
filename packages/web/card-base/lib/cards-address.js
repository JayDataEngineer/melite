// cards-address.ts — the ONE mint for the cards tab's resource
// addresses (DRY sweep C3, 2026-10-18). This lived twice: card-view's
// cards-resource.ts (whose comment claimed "the one place that owns
// the address") and infer-gallery's bench-load.ts (whose comment
// conceded the twin). No view→view client dep exists by design — a
// second loaded row inlined into another view's bundle is the
// dual-instance trap the one-row law exists to prevent — so the
// shared leaf both views already externalize owns the mint.
//
// Address grammar (card-view cards-resource.ts parses it):
//   dsh-resource://cards/run/<runId>  one run, live
/** The run address: `dsh-resource://cards/run/<runId>` — the wand's
 * restore target. The runId rides encodeURIComponent: a run id with
 * spaces or slashes stays one path segment. */
export function cardsRunAddress(runId) {
    return 'dsh-resource://cards/run/' + encodeURIComponent(runId);
}
//# sourceMappingURL=cards-address.js.map