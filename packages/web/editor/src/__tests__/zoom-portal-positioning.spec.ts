// zoom-portal-positioning.spec.ts — pins THE overlay positioning decision
// behind the 2026-08-22 "partially opaque background" bug. The overlay once
// rendered absolute inset-0 on document.body inside a TALL auto-height embed
// frame: absolute sizes to page coordinates, so mid-list the drilldown
// covered only part of the viewport (cards showed through the rest). The
// decision now lives in ONE exported function — this file pins both arms:
//
//   editor  ([data-workspace-content] exists) -> ABSOLUTE into that root
//   embed   (no workspace root)               -> FIXED onto body
import { describe, it, expect } from "vitest"
import { resolveZoomPortal } from "../surfaces/flow/flowCardZoom"

describe("resolveZoomPortal — the partially-opaque regression", () => {
  it("editor: workspace root present -> absolute overlay scoped INTO the content area", () => {
    const root = document.createElement("div")
    root.setAttribute("data-workspace-content", "")
    document.body.appendChild(root)
    try {
      const p = resolveZoomPortal(document)
      expect(p.target).toBe(root) // NOT body — sidebars/header stay outside
      expect(p.className.startsWith("absolute ")).toBe(true)
      expect(p.className).toContain("inset-0")
    } finally {
      root.remove()
    }
  })

  it("embed: no workspace root -> FIXED overlay on body (viewport cover at any scroll)", () => {
    // jsdom starts without [data-workspace-content]; make sure no other test
    // leaked one into the shared document.
    document.querySelectorAll("[data-workspace-content]").forEach((n) => n.remove())
    const p = resolveZoomPortal(document)
    expect(p.target).toBe(document.body)
    expect(p.className.startsWith("fixed ")).toBe(true)
    expect(p.className).toContain("inset-0")
  })
})
