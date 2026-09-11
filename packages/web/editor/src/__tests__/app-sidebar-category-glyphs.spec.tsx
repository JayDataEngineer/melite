// app-sidebar-category-glyphs.spec.tsx — the Media drawer's section GLYPHS.
//
// WHAT IS PROVEN (2026-08-25): every Media-drawer category header carries
// its OWN lucide glyph — no two sections share one. The bug class pinned
// here: the ICONS map had `video: Image`, a literal copy of the images
// icon, so the Video and Images headers rendered IDENTICALLY and read as
// duplicates. The law is enforced twice:
//   1. EXACT TABLE — each header's glyph is the declared one (Video →
//      Film, Audio → Music note, …). An intentional re-skin updates this
//      table deliberately.
//   2. PAIRWISE UNIQUENESS — even if the table above were ever loosened,
//      two categories rendering the same glyph fails LOUDLY. This is the
//      invariant that actually caught the bug.
//
// HOW IT'S TESTED: SidebarBody rendered for real over a mocked transport
// carrying one artifact per bucket; only the network layer is stubbed.
// Section CONTENT stays collapsed — the assertions target the always-on
// CollapsibleTrigger headers, so no virtualizer/tile machinery mounts.
// Each trigger holds exactly TWO svgs (the category glyph + ChevronDown);
// the chevron is filtered and exactly ONE glyph must remain per header.
// Lucide svgs self-identify via the `lucide-<name>` class token
// (probed against the installed lucide-react).
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { render as renderBase, screen, cleanup } from "@testing-library/react"
import type { ReactElement } from "react"
import { TooltipProvider } from "@melite/ui/tooltip"

function renderWithTooltip(ui: ReactElement) {
  return renderBase(<TooltipProvider>{ui}</TooltipProvider>)
}

vi.mock("@melite/catalog/api", () => ({
  apiFetch: vi.fn(),
  apiJson: vi.fn(),
}))
vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() },
}))

import { apiFetch } from "@melite/catalog"
import { SidebarBody } from "../surfaces/shared/AppSidebar"
import { useMediaVersion } from "../surfaces/library/mediaVersion"

// One artifact PER bucket kind (incl. an unknown type → "other"), so all
// six section headers exist. Categories with zero artifacts return null —
// a missing fixture here would silently skip that header's assertions.
const RUNS = [
  { run_id: "r_img", status: "done", created_at: 600, thumbnail: "",
    artifacts: [{ url: "/a/i.png", type: "image", size: 1 }] },
  { run_id: "r_vid", status: "done", created_at: 500, thumbnail: "",
    artifacts: [{ url: "/a/v.mp4", type: "video", size: 1 }] },
  { run_id: "r_mesh", status: "done", created_at: 400, thumbnail: "",
    artifacts: [{ url: "/a/m.glb", type: "glb", size: 1 }] },
  { run_id: "r_mot", status: "done", created_at: 300, thumbnail: "",
    artifacts: [{ url: "/a/w.npz", type: "npz", size: 1 }] },
  { run_id: "r_aud", status: "done", created_at: 200, thumbnail: "",
    artifacts: [{ url: "/a/s.wav", type: "audio", size: 1 }] },
  { run_id: "r_oth", status: "done", created_at: 100, thumbnail: "",
    artifacts: [{ url: "/a/x.bin", type: "wat", size: 1 }] },
]

beforeEach(() => {
  useMediaVersion.setState({ version: 0 })
  // happy-dom zero-rect trap + missing getAnimations (same harness as
  // app-sidebar-delete.spec.tsx) — harmless here since nothing expands,
  // but the mount effects still fire.
  vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockImplementation(function (this: HTMLElement) {
    return this.getAttribute?.("data-slot") === "scroll-area-viewport" ? 256 : 0
  })
  vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockImplementation(function (this: HTMLElement) {
    return this.getAttribute?.("data-slot") === "scroll-area-viewport" ? 640 : 0
  })
  vi.stubGlobal("ResizeObserver", class {
    observe() {}
    unobserve() {}
    disconnect() {}
  })
  Element.prototype.getAnimations = () => []
  vi.mocked(apiFetch).mockImplementation(async (url: string) => {
    if (url === "/v1/flows/runs") {
      return { ok: true, json: async () => ({ runs: RUNS.map((r) => ({ ...r })) }) } as never
    }
    return { ok: true, json: async () => ({}) } as never
  })
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  delete (Element.prototype as { getAnimations?: unknown }).getAnimations
})

/** The section header's ONE category glyph, as its lucide name. The
 *  CollapsibleTrigger renders as a button containing the glyph svg + the
 *  ChevronDown svg — the chevron is excluded, and anything unexpected
 *  (zero or 2+ remaining icons) fails the helper instead of asserting
 *  against the wrong element. */
function headerGlyph(label: string): string {
  const btn = screen.getByText(label).closest("button")
  expect(btn).toBeTruthy()
  const names = Array.from(btn!.querySelectorAll("svg")).flatMap((s) =>
    (s.getAttribute("class") ?? "").split(/\s+/),
  )
  const glyphs = names.filter((n) => n.startsWith("lucide-") && n !== "lucide-chevron-down")
  expect(glyphs, `${label}: expected exactly one category glyph, got [${glyphs}]`).toHaveLength(1)
  return glyphs[0]
}

const EXPECTED_GLYPHS: Record<string, string> = {
  Images: "lucide-image",
  Video: "lucide-film",
  "3D": "lucide-box",
  Motion: "lucide-activity",
  Audio: "lucide-music",
  Other: "lucide-folder-open",
}

describe("SidebarBody — one distinct glyph per media category", () => {
  it("renders every bucket header under its honest name", async () => {
    renderWithTooltip(<SidebarBody />)
    await screen.findByText("Images")
    for (const label of ["Video", "3D", "Motion", "Audio", "Other"]) {
      expect(screen.getByText(label)).toBeTruthy()
    }
    // The rename regression rides here too: the audio section is named
    // "Audio" — a resurrected "Music" label breaks the loop above.
    expect(screen.queryByText("Music")).toBeNull()
  })

  it("each header carries ITS OWN declared glyph (exact table)", async () => {
    renderWithTooltip(<SidebarBody />)
    await screen.findByText("Images")
    for (const [label, glyph] of Object.entries(EXPECTED_GLYPHS)) {
      expect(headerGlyph(label)).toBe(glyph)
    }
  })

  it("NO two categories share a glyph — the video≡images bug class", async () => {
    renderWithTooltip(<SidebarBody />)
    await screen.findByText("Images")
    const byLabel = Object.keys(EXPECTED_GLYPHS).map((label) => ({
      label,
      glyph: headerGlyph(label),
    }))
    const seen = new Map<string, string>()
    for (const { label, glyph } of byLabel) {
      expect(seen.has(glyph), `duplicate glyph ${glyph}: ${label} renders identically to ${seen.get(glyph)}`).toBe(false)
      seen.set(glyph, label)
    }
    // THE regression, spelled out: video must not borrow the images icon.
    expect(headerGlyph("Video")).not.toBe(headerGlyph("Images"))
  })
})
