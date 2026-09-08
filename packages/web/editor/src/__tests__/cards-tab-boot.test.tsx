// cards-tab-boot — REPRODUCTION of the operator's blank Cards tab
// (2026-09-01: "I click Cards, it takes me to a blank page instead of
// the action card like it used to"). The DSH sidebar Cards tab iframes
// /editor/?meliteAssets=cards. This mounts the REAL App at that URL in
// jsdom and fails on ANY boot crash — no mocks of the surfaces under
// test, only the network layer jsdom can't provide.
import { describe, it, expect, vi, beforeAll } from "vitest"
import { render } from "@testing-library/react"

beforeAll(() => {
  // The embed URL the deck iframe actually loads.
  window.history.replaceState({}, "", "/editor/?meliteAssets=cards")
  // jsdom has no fetch-mock needs: the app's loaders fail-soft; a boot
  // crash is what we are hunting.
  window.matchMedia ||= (() => ({
    matches: false, media: "", onchange: null,
    addListener: () => {}, removeListener: () => {},
    addEventListener: () => {}, removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia
  window.IntersectionObserver ||= class {
    observe() {} unobserve() {} disconnect() {} takeRecords(): IntersectionObserverEntry[] { return [] }
  } as unknown as typeof IntersectionObserver
  window.ResizeObserver ||= class {
    observe() {} unobserve() {} disconnect() {}
  } as unknown as typeof ResizeObserver
})

describe("App boots at the Cards tab embed URL", () => {
  it("renders the cards surface without crashing", async () => {
    const { App } = await import("../App")
    const consoleErrors: string[] = []
    const errSpy = vi.spyOn(console, "error").mockImplementation((...a: unknown[]) => {
      consoleErrors.push(a.map(String).join(" "))
    })
    let threw: unknown = null
    try {
      const r = render(<App />)
      // Let effects settle (boot fetches + skeleton swap).
      await new Promise((res) => setTimeout(res, 300))
      const html = r.container.innerHTML
      expect(html.length).toBeGreaterThan(200)
      threw = null
    } catch (e) {
      threw = e
    }
    errSpy.mockRestore()
    if (threw) throw threw
    // React uncaught render errors surface via console.error too.
    const fatal = consoleErrors.filter((e) => /uncaught|above the error boundary|Minified React error/i.test(e))
    expect(fatal, fatal.join("\n")).toEqual([])
  })
})
