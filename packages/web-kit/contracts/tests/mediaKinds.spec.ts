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
import { contentTypeForArtifact } from "../src/mediaKinds.ts";

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
