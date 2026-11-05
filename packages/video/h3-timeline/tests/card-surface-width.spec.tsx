/**
 * card-surface-width — THE VIDEO TIMELINE CARD'S WIDTH LAW (the
 * 2026-11-01 operator burn: the timeline card rendered narrower than
 * sibling studio cards in the cards tab).
 *
 * The chain the burn rides, every link judged where its truth lives:
 *   declaration  the card def's surface row (size 'huge' + layout
 *                'studio' — the composition root's registry, the same
 *                object the discovery emission reads)
 *   serve        the estate's form-spec door derives doc.size verbatim
 *                from that row (judged in melite-tools'
 *                h3-surface-size.spec — the served truth)
 *   lift         the drill reports doc.size through onSurface
 *                (stage-drill; the envelope-lift pattern is walled in
 *                card-view's img-to-mesh-envelope.spec)
 *   consume      the zoom card's width law turns 'huge' into the
 *                full-page card (THIS file, arm 2)
 */
import "../../../../tests/helpers/boot-models.ts";
import { describe, expect, it } from "vitest";
import assert from "node:assert/strict";
import { loadCardDefs } from "@melite/comfyui-cordis";
import { zoomSizeFor, zoomWidthFor } from "../../../../packages/web/melite-card-view/src/client/zoom.tsx";

describe("card-surface-width (the timeline card fills the page like every studio sibling)", () => {
  it("ARM 1 — THE DECLARATION: the registry's h3-timeline card declares the studio huge surface", async () => {
    const def = (await loadCardDefs()).get("h3-timeline");
    assert.ok(def, "the composition root serves the h3-timeline card");
    // THE FULL-PAGE LAW'S SOURCE: size 'huge' is the estate's only
    // size class and the zoom's only full-page trigger; layout
    // 'studio' names the stage-view takeover. A declaration dropped
    // to a smaller size (or losing studio) reds HERE and at the
    // serve arm — the card falls back to the bounded 760px card,
    // which IS the burn.
    assert.deepEqual(def.surface, { size: "huge", layout: "studio" });
  });

  it("ARM 2 — THE CONSUMER: the zoom's huge class is the full-page card, everything else stays bounded", () => {
    // THE FULL-PAGE LAW (zoom.tsx zoomSizeFor, the operator's hour-7:
    // "the modal is not taking up the full page like before"): a
    // studio surface takes the page (94vw × 94vh — the pane keeps
    // its edge); ordinary cards keep the bounded ≈square law.
    expect(zoomSizeFor("huge")).toEqual({
      width: "min(94vw, 1720px)",
      maxWidth: "100%",
      height: "94vh",
      maxHeight: "94vh",
    });
    // THE BOUNDED LAW verbatim (the non-studio siblings): width caps
    // by vw (a vh cap clipped the right column once — 2026-09-12),
    // and NO height seat (the detail scrolls).
    expect(zoomSizeFor(null)).toEqual({ width: "min(760px, 94vw)", maxWidth: "100%" });
    expect(zoomSizeFor("")).toEqual({ width: "min(760px, 94vw)", maxWidth: "100%" });
    expect(zoomSizeFor("small")).toEqual({ width: "min(760px, 94vw)", maxWidth: "100%" });
    // THE WIDTH HELPERS' own rows (the envelope spec pins them for
    // img-to-mesh; the same words must hold for the timeline's
    // consumer).
    expect(zoomWidthFor("huge")).toBe("min(1160px, 94vw)");
    expect(zoomWidthFor(null)).toBe("min(760px, 94vw)");
  });
});
