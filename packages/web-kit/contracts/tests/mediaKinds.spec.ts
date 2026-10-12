// mediaKinds.spec.ts — the MIME table's own laws (the audio-seek
// stroke's one extension→content-type map, shared by the estate
// media route and the gallery artifact route).
//
// THE SVG LAW (the adversarial round, 2026-10-08): `svg` is
// DELIBERATELY ABSENT from the table — inline image/svg+xml is a
// same-origin script vector (an <svg> that runs JavaScript in the
// estate's origin). An x.svg artifact serves as
// application/octet-stream (a download), and this wall pins that
// absence: a future `svg: "image/svg+xml"` row must break HERE,
// loudly, before it can ship executable SVG.
import { describe, expect, test } from "vitest";
import { contentTypeForArtifact, isEstateSidecarName, mediaKindOf, mediaVocab } from "../src/mediaKinds.ts";

describe("THE TEXT KIND (the tagger stroke, 2026-10-24 — SaveText's own format set)", () => {
  test("txt/csv/md/json classify text and serve as text", () => {
    expect(mediaKindOf("SaveText.0_tags_00001.txt")).toBe("text");
    expect(mediaKindOf("tags.csv")).toBe("text");
    expect(mediaKindOf("README.md")).toBe("text");
    expect(mediaKindOf("result.json")).toBe("text");
    expect(contentTypeForArtifact("notes.txt")).toBe("text/plain; charset=utf-8");
    expect(contentTypeForArtifact("rows.csv")).toBe("text/csv; charset=utf-8");
    expect(contentTypeForArtifact("README.md")).toBe("text/markdown; charset=utf-8");
    expect(contentTypeForArtifact("result.json")).toBe("application/json; charset=utf-8");
  });

  test("galleryText mirrors the text family (every minted format lists)", () => {
    const v = mediaVocab();
    expect([...v.galleryText]).toEqual([...v.text]);
    expect(v.galleryText).toContain("txt");
  });

  test("THE SIDECAR NAME LAW — bookkeeping is `_`-prefixed and never media", () => {
    // json IS a text kind; the harness's `_request.json`/`_flow.json`
    // are refused BY NAME, so a real result.json keeps its extension.
    expect(isEstateSidecarName("_request.json")).toBe(true);
    expect(isEstateSidecarName("_flow.json")).toBe(true);
    expect(isEstateSidecarName("_poster.jpg")).toBe(true);
    expect(isEstateSidecarName("deep/_nested.json")).toBe(true);
    expect(isEstateSidecarName("result.json")).toBe(false);
    expect(isEstateSidecarName("SaveText.0_tags_00001.txt")).toBe(false);
  });
});

describe("contentTypeForArtifact: one MIME table for every artifact-serving route", () => {
  test("the audio six ride their real types (the octet-stream era is over)", () => {
    expect(contentTypeForArtifact("song.mp3")).toBe("audio/mpeg");
    expect(contentTypeForArtifact("take.WAV")).toBe("audio/wav");
    expect(contentTypeForArtifact("master.flac")).toBe("audio/flac");
    expect(contentTypeForArtifact("loop.ogg")).toBe("audio/ogg");
    expect(contentTypeForArtifact("voice.m4a")).toBe("audio/mp4");
    expect(contentTypeForArtifact("sting.aac")).toBe("audio/aac");
  });

  test("video, image, model, and text rows ride verbatim", () => {
    expect(contentTypeForArtifact("film.mp4")).toBe("video/mp4");
    expect(contentTypeForArtifact("clip.webm")).toBe("video/webm");
    expect(contentTypeForArtifact("still.png")).toBe("image/png");
    expect(contentTypeForArtifact("mesh.glb")).toBe("model/gltf-binary");
    expect(contentTypeForArtifact("notes.json")).toBe("application/json; charset=utf-8");
  });

  test("THE SVG LAW: svg is absent — an .svg serves as a download, never inline executable", () => {
    expect(contentTypeForArtifact("diagram.svg")).toBe("application/octet-stream");
    expect(contentTypeForArtifact("ICON.SVG")).toBe("application/octet-stream");
  });

  test("unknown and extensionless names fall back to octet-stream", () => {
    expect(contentTypeForArtifact("blob.weirdxyz")).toBe("application/octet-stream");
    expect(contentTypeForArtifact("noext")).toBe("application/octet-stream");
    expect(contentTypeForArtifact("trailingdot.")).toBe("application/octet-stream");
  });
});
