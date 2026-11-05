// THE RESHOOT PREVIEW LAW (operator burn 2026-11-15, audit
// dev_docs/audits/features/2026-11-04-reshoot-preview-audit.md): after
// a RESHOOT press the timeline card's OUTPUT PREVIEW showed the
// ORIGINAL video. The reshoot's product saves under the WINDOW
// spelling (`h3_t4_w1_00001_`) while the SOURCE CLIP sat beside it in
// the gallery under the upload plane's dedup stamp (`__<12hex>`, the
// estate harvest publishing the engine's LoadVideo preview row as an
// artifact — cured by the product law in comfyui-outputs.ts) — the
// stamp breaks the window regex, so the name-only tiers crowned the
// stamped SOURCE COPY the final cut while the estate's own hero
// pointer (`result.url`, the run's product) pointed at the reshoot.
//
// This wall rides the SAME derivation the card renders: filmstripOf is
// the pure function useDerivedView's memo calls (the hook is judged by
// its own package suite; here the invariants are the tiers' ORDER and
// their guards). The artifact set is run-bb1ce19bd192's, verbatim; the
// echo arms judge stored pre-cure results, which still carry it.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { filmstripOf } from "../../../../packages/video/h3-timeline/src/ui/studio/useDerivedView.ts";

const RUN = "https://r/run-bb1ce19bd192";
const PRODUCT = `${RUN}/h3-film/SaveVideo.0_h3_t4_w1_00001_.mp4`;
const TWIN = `${RUN}/h3-film/SaveVideo.0_h3_t4_w1_00001__e80f2bcec264.mp4`;
const WARP = `${RUN}/h3-film/SaveImage.0_reshoot_warp_00001_.png`;
const ORBIT = `${RUN}/h3-film/SaveImage.1_reshoot_orbit_00001_.png`;

/** The burn's own result row: the estate hero pointer IS the reshoot
 *  product; the stamped source twin sits beside it in the gallery. */
function burnResult(): Parameters<typeof filmstripOf>[0] {
  return {
    url: PRODUCT,
    artifacts: {
      "h3-film/SaveVideo.0_h3_t4_w1_00001_.mp4": PRODUCT,
      "h3-film/SaveImage.1_reshoot_orbit_00001_.png": ORBIT,
      "h3-film/SaveImage.0_reshoot_warp_00001_.png": WARP,
      "h3-film/SaveVideo.0_h3_t4_w1_00001__e80f2bcec264.mp4": TWIN,
    },
    assetUrls: [PRODUCT, ORBIT, WARP, TWIN],
    metadata: {},
  };
}

describe("the reshoot preview law", () => {
  it("the final cut is the estate hero pointer — never the dedup-stamped source copy", () => {
    const strip = filmstripOf(burnResult());
    assert.equal(strip.final, PRODUCT, "the run's own product is the cut");
    assert.notEqual(strip.final, TWIN, "the stamped source copy is never crowned");
    // clip loss can never hide: the twin stays WALKABLE, never the hero
    assert.ok(
      strip.windows.some((w) => w.url === TWIN),
      "the twin remains a window tile (visible, distinguishable)",
    );
  });

  it("an engine film name still outranks the pointer (the in-graph assembly is the cut by its own law)", () => {
    const film = `${RUN}/h3-film/SaveVideo.0_h3_t4_film_00001_.mp4`;
    const strip = filmstripOf({
      url: PRODUCT,
      artifacts: { "h3-film/SaveVideo.0_h3_t4_film_00001_.mp4": film },
      assetUrls: [film, PRODUCT],
      metadata: {},
    });
    assert.equal(strip.final, film);
  });

  it("a pointer at a non-video never becomes the cut (the tile law holds for the hero tier too)", () => {
    const strip = filmstripOf({
      url: `${RUN}/h3-film/still_00001_.png`,
      artifacts: { "h3-film/clip_00001_.mp4": `${RUN}/h3-film/clip_00001_.mp4` },
      assetUrls: [],
      metadata: {},
    });
    assert.equal(strip.final, `${RUN}/h3-film/clip_00001_.mp4`, "the name tiers answer, not a still");
  });

  it("a pre-pointer row (no url) still previews its named video", () => {
    const named = `${RUN}/h3-film/legacy_clip_00001_.mp4`;
    const strip = filmstripOf({
      artifacts: { "h3-film/legacy_clip_00001_.mp4": named },
      assetUrls: [named],
      metadata: {},
    });
    assert.equal(strip.final, named);
  });

  it("the SECOND burn — no hero pointer, a stored pre-cure echo in the gallery: the name tiers never crown the consumable", () => {
    // The estate's harvest published the LoadVideo preview row as an
    // artifact until the product law (comfyui-outputs.ts), so stored
    // results still carry the source echo. The operator's escalated
    // shape: the run's url is unset (the reload path can answer
    // without it) and the echo is the only NON-window video — the old
    // name tiers crowned it and the preview played the ORIGINAL. The
    // echo is a staged upload's name (`<basename>_<sha1[0,12]>`, the
    // double underscore its signature): a consumable is never a cut.
    const strip = filmstripOf({
      artifacts: {
        "h3-film/SaveVideo.0_h3_t4_w1_00001_.mp4": PRODUCT,
        "h3-film/SaveVideo.0_h3_t4_w1_00001__e80f2bcec264.mp4": TWIN,
      },
      assetUrls: [TWIN, PRODUCT],
      metadata: {},
    });
    assert.equal(strip.final, null, "the product is a window tile; the echo is refused, never crowned");
    assert.ok(strip.windows.some((w) => w.url === PRODUCT), "the product stays walkable as its window tile");
  });

  it("a hero pointer that names the consumable is refused like any other echo", () => {
    const strip = filmstripOf({
      url: TWIN,
      artifacts: { "h3-film/SaveVideo.0_h3_t4_w1_00001__e80f2bcec264.mp4": TWIN },
      assetUrls: [TWIN],
      metadata: {},
    });
    assert.equal(strip.final, null, "an echo can never be the estate hero — the tier falls through");
  });

  it("an absent result degrades to empty windows + null final (never a crash)", () => {
    assert.deepEqual(filmstripOf(undefined), { windows: [], final: null });
  });
});
