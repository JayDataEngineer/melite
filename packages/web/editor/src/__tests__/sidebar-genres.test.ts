// sidebar-genres.test.ts — the ONE shared genre taxonomy for every sidebar.
//
// Locks the consolidation: ServicesSidebar and LibrarySidebar both consume
// SIDEBAR_GENRE_ORDER + SIDEBAR_GENRE_ICON + genreLabel from this module. A
// revert that re-introduces a divergent per-sidebar GENRE_ORDER would leave
// these tests green (they test the shared module, not the consumers), but
// they guard the contract the consumers depend on: the order is a superset,
// every ordered genre has an icon, and the label rule is deterministic.
import { describe, it, expect } from "vitest"
import {
  SIDEBAR_GENRE_ORDER,
  SIDEBAR_GENRE_ICON,
  genreLabel,
  sidebarBucket,
} from "@melite/formats"

describe("SIDEBAR_GENRE_ORDER — the superset taxonomy", () => {
  it("includes every genre both sidebars previously tracked", () => {
    // The media genres mirror CardGenre (ONE vocabulary — 'other' covers
    // input-stage tools; 'creature' was folded into '3d', 2026-09-04),
    // plus the studio display buckets. 'ai_generated' is GONE: demoted to
    // a CardTag — provenance is a tag, never a genre.
    const required = [
      "image", "video", "audio", "text", "motion", "3d",
      "other", "avatar", "creative", "specialized", "training",
      "external", "unknown",
    ]
    expect(SIDEBAR_GENRE_ORDER).not.toContain("ai_generated")
    expect(SIDEBAR_GENRE_ORDER).not.toContain("creature")
    for (const g of required) {
      expect(SIDEBAR_GENRE_ORDER).toContain(g)
    }
  })

  it("lists 'unknown' last (the catch-all 'More' bucket for catalog gaps)", () => {
    expect(SIDEBAR_GENRE_ORDER[SIDEBAR_GENRE_ORDER.length - 1]).toBe("unknown")
  })

  it("lists 'image' first (the primary genre)", () => {
    expect(SIDEBAR_GENRE_ORDER[0]).toBe("image")
  })

  it("has no duplicates", () => {
    const seen = new Set<string>()
    for (const g of SIDEBAR_GENRE_ORDER) {
      expect(seen.has(g)).toBe(false)
      seen.add(g)
    }
  })
})

describe("SIDEBAR_GENRE_ICON — coverage", () => {
  it("every genre in SIDEBAR_GENRE_ORDER has an icon (no fallback needed)", () => {
    // A missing icon would force the consumer into a ?? fallback, which is
    // drift waiting to happen. Every ordered genre resolves here.
    for (const g of SIDEBAR_GENRE_ORDER) {
      expect(SIDEBAR_GENRE_ICON[g]).toBeTruthy()
    }
  })
})

describe("genreLabel — deterministic display casing", () => {
  it("capitalizes the first letter of a plain genre", () => {
    expect(genreLabel("image")).toBe("Image")
    expect(genreLabel("video")).toBe("Video")
    expect(genreLabel("audio")).toBe("Audio")
    expect(genreLabel("motion")).toBe("Motion")
    expect(genreLabel("avatar")).toBe("Avatar")
    expect(genreLabel("creative")).toBe("Creative")
    expect(genreLabel("specialized")).toBe("Specialized")
    expect(genreLabel("training")).toBe("Training")
    expect(genreLabel("external")).toBe("External")
  })

  it("renders '3d' as '3D' (not '3d')", () => {
    expect(genreLabel("3d")).toBe("3D")
  })

  it("renders 'unknown' as 'More' (the LibrarySidebar convention for gaps)", () => {
    expect(genreLabel("unknown")).toBe("More")
  })

  it("renders 'other' as 'Other' (the input-stage tools genre)", () => {
    expect(genreLabel("other")).toBe("Other")
  })

  it("renders 'text' as 'Text' (the LLM Text card genre)", () => {
    expect(genreLabel("text")).toBe("Text")
  })

  it("still capitalizes an unknown backend genre (open union tail)", () => {
    // The (string & {}) tail lets new genres through; they get the default
    // capitalization rather than rendering as raw lowercase.
    expect(genreLabel("holography")).toBe("Holography")
  })
})

describe("sidebarBucket — niche-genre collapse for the Library sidebar", () => {
  // The Library sidebar groups capabilities into a few scannable sections.
  // Niche genres (motion, 3d) collapse into "other" so they don't get their
  // own section header — three primary genres + "Other" is simpler to
  // navigate than six top-level sections. The catalog keeps granular
  // genres; this is purely a sidebar display concern.

  it("collapses 'motion' into 'other'", () => {
    expect(sidebarBucket("motion")).toBe("other")
  })

  it("collapses '3d' into 'other'", () => {
    expect(sidebarBucket("3d")).toBe("other")
  })

  it("passes primary genres through verbatim (no collapse)", () => {
    expect(sidebarBucket("image")).toBe("image")
    expect(sidebarBucket("video")).toBe("video")
    expect(sidebarBucket("audio")).toBe("audio")
    expect(sidebarBucket("text")).toBe("text")
  })

  it("passes unknown genres through (no silent collapse)", () => {
    // A future backend genre that isn't motion/3d stays as-is — the
    // sidebar renders it under its own section (or "unknown" if the genre
    // is missing). sidebarBucket never silently swallows a genre.
    expect(sidebarBucket("avatar")).toBe("avatar")
    expect(sidebarBucket("holography")).toBe("holography")
  })
})
