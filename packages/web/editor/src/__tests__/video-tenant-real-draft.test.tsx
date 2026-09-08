// video-tenant-real-draft — THE REGRESSION THE OPERATOR PAID FOR
// (2026-09-01: "you cannot add hidden regression every time"). The
// Cards tab hydrates the LAST draft and mounts this tenant; a bad
// film map (or any tenant crash) blanks the whole card view. This
// mounts the REAL tenant against the REAL served draft JSON — the
// exact production path, no fixture sugar.
import { describe, it, expect, beforeAll, vi } from "vitest"
import { render } from "@testing-library/react"
import { TooltipProvider } from "@melite/ui/tooltip"

beforeAll(() => {
  window.matchMedia ||= (() => ({
    matches: false, media: "", onchange: null,
    addListener: () => {}, removeListener: () => {},
    addEventListener: () => {}, removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia
  window.HTMLMediaElement.prototype.play = function () { return Promise.resolve() }
  window.HTMLMediaElement.prototype.pause = function () {}
})

describe("video timeline tenant against the REAL served draft", () => {
  it("mounts without crashing on the live draft JSON", { timeout: 30000 }, async () => {
    const draft = await import("./__fixtures__/draft-ramen.json", { with: { type: "json" } }).then(m => m.default)
    const stage = draft.stages[0]
    const film = stage.result?.metadata?.film
    // FILM MAP INVARIANTS — the data contract the bar projects from.
    let doc = 0
    for (const w of film.windows) {
      expect(w.docStart).toBe(doc)
      expect(w.docSpan).toBe(w.len - w.trim)
      doc += w.docSpan
    }
    expect(doc).toBe(film.totalFrames)
    // THE REAL MOUNT: the tenant that renders in the Cards view.
    const mod = await import("../../../../../packages/engines/comfyui/action_cards/video/h3-timeline/ui/studio/component")
    const Tenant = (mod.default ?? Object.values(mod)[0]) as React.ComponentType<Record<string, unknown>>
    // CardStage fields the adapter normally precomputes — the raw served
    // draft fixture carries neither; both are inert for the mount check.
    const stageFull = { ...stage, inputIndices: [] as number[], status: "done" as const }
    const consoleErrors: string[] = []
    const spy = vi.spyOn(console, "error").mockImplementation((...a: unknown[]) => {
      consoleErrors.push(a.map(String).join(" "))
    })
    let threw: unknown = null
    try {
      const r = render(<TooltipProvider><Tenant stage={stageFull} running={false} onSave={() => {}} /></TooltipProvider>)
      await new Promise((res) => setTimeout(res, 400))
      expect(r.container.innerHTML.length).toBeGreaterThan(100)
    } catch (e) { threw = e }
    spy.mockRestore()
    if (threw) throw threw
    const fatal = consoleErrors.filter((e) => /Minified React error|above the error boundary/i.test(e))
    expect(fatal, fatal.join("\n")).toEqual([])
  })
})
