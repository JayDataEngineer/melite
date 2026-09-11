// sidebarGenres.spec.ts — the single ordered genre list + icon map.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import {
  SIDEBAR_GENRE_ICON,
  SIDEBAR_GENRE_ORDER,
  genreLabel,
  sidebarBucket,
} from "../src/sidebarGenres.ts";

describe("genreLabel", () => {
  it("renders the unknown bucket as More", () => {
    assert.equal(genreLabel("unknown"), "More");
  });

  it("renders 3d as 3D", () => {
    assert.equal(genreLabel("3d"), "3D");
  });

  it("capitalizes normal genres", () => {
    assert.equal(genreLabel("image"), "Image");
    assert.equal(genreLabel("motion"), "Motion");
    assert.equal(genreLabel("avatar"), "Avatar");
  });
});

describe("sidebarBucket", () => {
  it("collapses the niche motion/3d genres into other", () => {
    assert.equal(sidebarBucket("motion"), "other");
    assert.equal(sidebarBucket("3d"), "other");
  });

  it("passes every other genre through by identity", () => {
    for (const g of ["image", "video", "audio", "text", "other", "avatar", "unknown"] as const) {
      assert.equal(sidebarBucket(g), g);
    }
  });
});

describe("SIDEBAR_GENRE_ORDER / SIDEBAR_GENRE_ICON", () => {
  it("orders media genres first with the unknown catch-all at the tail", () => {
    assert.deepEqual([...SIDEBAR_GENRE_ORDER].slice(0, 7), [
      "image",
      "video",
      "audio",
      "text",
      "motion",
      "3d",
      "other",
    ]);
    assert.equal(SIDEBAR_GENRE_ORDER[SIDEBAR_GENRE_ORDER.length - 1], "unknown");
  });

  it("has an icon for every ordered genre", () => {
    assert.ok(SIDEBAR_GENRE_ORDER.length > 0);
    for (const g of SIDEBAR_GENRE_ORDER) {
      assert.ok(
        SIDEBAR_GENRE_ICON[g] != null,
        `genre ${String(g)} has no sidebar icon`,
      );
    }
  });

  it("keeps other (Shapes) distinct from the unknown (More) catch-all", () => {
    assert.notEqual(SIDEBAR_GENRE_ICON["other"], SIDEBAR_GENRE_ICON["unknown"]);
  });
});
