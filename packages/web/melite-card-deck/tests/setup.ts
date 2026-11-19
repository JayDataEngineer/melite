// test/setup.ts — the deck lane's DOM-observer seat (the 2026-11-19
// walls tier's 8-error red).
//
// The DSH Tooltip and Menu primitives read `window.matchMedia` from
// their hover-intent gates — Tooltip.tsx's `onPointerEnter` and
// useMenuSubmenu's `menuHoverAllowed` — and jsdom ships none. A
// pointer event over a tooltip/menu therefore threw an UNCAUGHT
// exception AFTER the assertion had already passed: every spec file
// green, the run still red (the "8 errors" verdict is the whole
// failure, so the red named no test). No media query is true in this
// lane: hover intent is the primitive's enhancement, never a verdict
// these specs judge. The shape mirrors card-view's own setup.
if (typeof globalThis.matchMedia !== 'function') {
  Object.defineProperty(globalThis, 'matchMedia', {
    value: (query: string): MediaQueryList => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
    writable: true,
  })
}
