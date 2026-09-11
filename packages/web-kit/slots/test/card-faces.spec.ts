// card-faces.spec.ts — the thin typed faces over the uiSlot kernel: the
// card body seam plus the icon/preview/run element slots, the shell region
// slots, and the asset viewer slots. Each face is register/walk/version
// plumbing; behavior lives in uiSlotSeam (covered there).
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import {
  getCardBodiesVersion,
  registerCardBody,
  registeredCardBodyProviders,
  resolveCardBody,
  subscribeCardBodies,
} from "../src/cardBodySeam.ts";
import type { CardBody } from "../src/cardBodySeam.ts";
import { cardIconSlot, cardPreviewSlot, cardRunSlot } from "../src/cardElementSeams.ts";
import {
  chatInputRegionSlot,
  historyRegionSlot,
  sidebarRegionSlot,
} from "../src/regionSeams.ts";
import {
  audioViewerSlot,
  meshViewerSlot,
  motionViewerSlot,
  videoViewerSlot,
} from "../src/viewerSeams.ts";

function body(id: string): CardBody {
  return {
    body: () => null,
    writes: new Set([`${id}:param`]),
  };
}

describe("cardBodySeam", () => {
  it("an empty seam falls to null (the caller fail-safe renders)", () => {
    assert.equal(resolveCardBody({} as never), null);
  });

  it("registers, walks, lists, versions, and disposes providers", () => {
    let pings = 0;
    const unsub = subscribeCardBodies(() => {
      pings++;
    });
    try {
      const v0 = getCardBodiesVersion();
      const disposeQuiet = registerCardBody({
        id: "faces/quiet",
        precedence: 10,
        resolve: () => body("quiet"),
      });
      const disposeLoud = registerCardBody({
        id: "faces/loud",
        precedence: 90,
        resolve: () => null,
      });
      try {
        assert.equal(getCardBodiesVersion(), v0 + 2);
        assert.equal(pings, 2);
        // The loud provider defers: the quiet claim renders.
        assert.equal(resolveCardBody({} as never)?.writes.has("quiet:param"), true);
        assert.deepEqual(registeredCardBodyProviders(), ["90:faces/loud", "10:faces/quiet"]);
        disposeLoud();
        assert.equal(getCardBodiesVersion(), v0 + 3);
        disposeQuiet();
        assert.equal(resolveCardBody({} as never), null);
      } finally {
        disposeLoud();
        disposeQuiet();
      }
    } finally {
      unsub();
    }
  });

  it("duplicate ids and shared tiers are loud (kernel law, surfaced here)", () => {
    const dispose = registerCardBody({
      id: "faces/once",
      precedence: 11,
      resolve: () => body("once"),
    });
    try {
      assert.throws(
        () =>
          registerCardBody({ id: "faces/once", precedence: 12, resolve: () => null }),
        /already registered/,
      );
      assert.throws(
        () =>
          registerCardBody({ id: "faces/other", precedence: 11, resolve: () => null }),
        /precedence 11 is taken/,
      );
    } finally {
      dispose();
    }
  });
});

describe("card element slots", () => {
  it("icon / preview / run cells start unclaimed", () => {
    assert.equal(cardIconSlot.resolve({} as never), null);
    assert.equal(cardPreviewSlot.resolve({} as never), null);
    assert.equal(cardRunSlot.resolve({} as never), null);
  });

  it("claims render through the walk", () => {
    const disposeIcon = cardIconSlot.register({
      id: "faces/icon",
      precedence: 10,
      resolve: () => ({ Icon: () => null }),
    });
    const disposePreview = cardPreviewSlot.register({
      id: "faces/preview",
      precedence: 10,
      resolve: () => ({ Preview: () => null }),
    });
    const disposeRun = cardRunSlot.register({
      id: "faces/run",
      precedence: 10,
      resolve: () => ({ Run: () => null }),
    });
    try {
      assert.ok(cardIconSlot.resolve({} as never)?.Icon);
      assert.ok(cardPreviewSlot.resolve({} as never)?.Preview);
      assert.ok(cardRunSlot.resolve({} as never)?.Run);
    } finally {
      disposeIcon();
      disposePreview();
      disposeRun();
    }
  });
});

describe("region slots", () => {
  it("shell regions start unclaimed; claims render inside the chrome", () => {
    assert.equal(sidebarRegionSlot.resolve(null), null);
    assert.equal(historyRegionSlot.resolve(null), null);
    assert.equal(chatInputRegionSlot.resolve(null), null);
    const dispose = sidebarRegionSlot.register({
      id: "faces/sidebar",
      precedence: 10,
      resolve: () => ({ Sidebar: () => null }),
    });
    try {
      assert.ok(sidebarRegionSlot.resolve(null)?.Sidebar);
    } finally {
      dispose();
    }
  });
});

describe("viewer slots", () => {
  it("one slot per media kind; unclaimed renders the host fallback", () => {
    assert.equal(meshViewerSlot.resolve(null), null);
    assert.equal(motionViewerSlot.resolve(null), null);
    assert.equal(videoViewerSlot.resolve(null), null);
    assert.equal(audioViewerSlot.resolve(null), null);
    const dispose = meshViewerSlot.register({
      id: "faces/mesh",
      precedence: 10,
      resolve: () => ({ Viewer: () => null }),
    });
    try {
      assert.ok(meshViewerSlot.resolve(null)?.Viewer);
    } finally {
      dispose();
    }
  });
});
