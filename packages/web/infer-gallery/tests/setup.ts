// tests/setup.ts — the dom18 lane's DOM-observer seat (li-bp's
// dom-lane repair, one of the three latent reds behind dead loads).
//
// The DSH Tooltip primitive (dsh-client-ui-primitives, inlined into
// this lane) instantiates a ResizeObserver the moment a tooltip
// opens; jsdom ships no observer implementation, so the wand's
// focus test died with "ResizeObserver is not defined" — a red that
// sat hidden while the load path ahead of it was dead. The mock is
// the SAME honest shape card-view's own setup carries (observe/
// unobserve/disconnect no-ops): the primitive's fitting math never
// runs without a real layout engine, and no assertion depends on
// observed sizes.

class FakeResizeObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
globalThis.ResizeObserver = FakeResizeObserver as unknown as typeof ResizeObserver

if (typeof Element.prototype.getAnimations !== 'function') {
  // jsdom lacks Element.getAnimations — @base-ui/react's scroll
  // areas call it from a delayed timer; empty array = "nothing to
  // pause" (the same stub card-view's setup documents).
  Element.prototype.getAnimations = () => []
}

class FakeIntersectionObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
  takeRecords(): IntersectionObserverEntry[] {
    return []
  }
}
globalThis.IntersectionObserver = FakeIntersectionObserver as unknown as typeof IntersectionObserver
