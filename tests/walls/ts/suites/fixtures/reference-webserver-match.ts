// reference-webserver-match.ts — VERBATIM excerpt of the reference
// router's match(), vendored so the route-precedence wall's
// anti-self-fulfilling pin runs in EVERY checkout, not only ones
// with the (developer-local, untracked) references/ tree.
//
// Source: references/deepseek-harness/packages/host/webserver/src/index.ts
// @ ecf6acfb15d91b5a253d026cd7c4fac760891bc7 (last commit touching it,
// 2026-09-19). route-precedence.spec.ts re-syncs this fixture against
// the live reference whenever the checkout is present and refuses on
// drift — the fixture cannot silently age.
//
// THE RULE THIS PROVES: the exact table is consulted before the
// longest-prefix loop; a prefix that also matches an exact path never
// wins it.

  /** Longest-prefix-wins over the prefix table after an exact-table miss. */
  private match(pathname: string): WebRoute | undefined {
    const exact = this.exact.get(pathname)
    if (exact !== undefined) return exact
    let best: WebRoute | undefined
    for (const [prefix, route] of this.prefixes) {
      if (pathname !== prefix && !pathname.startsWith(`${prefix}/`)) continue
      if (best === undefined || prefix.length > best.path.length) best = route
    }
    return best
  }
