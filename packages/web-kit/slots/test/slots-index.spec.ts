// slots-index.spec.ts — the @melite/slots barrel: every seam stays wired.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import * as barrel from "../src/index.ts";

describe("slots barrel", () => {
  it("re-exports the kernel, seams, and tools", () => {
    assert.equal(typeof barrel.createUiSlot, "function");
    assert.equal(typeof barrel.SlotCore, "function");
    assert.equal(typeof barrel.registerCardBody, "function");
    assert.equal(typeof barrel.resolveCardBody, "function");
    assert.ok(barrel.cardIconSlot);
    assert.ok(barrel.cardPreviewSlot);
    assert.ok(barrel.cardRunSlot);
    assert.equal(typeof barrel.registerCardKind, "function");
    assert.equal(typeof barrel.kindDef, "function");
    assert.ok(barrel.sidebarRegionSlot);
    assert.ok(barrel.historyRegionSlot);
    assert.ok(barrel.chatInputRegionSlot);
    assert.ok(barrel.meshViewerSlot);
    assert.ok(barrel.motionViewerSlot);
    assert.ok(barrel.videoViewerSlot);
    assert.ok(barrel.audioViewerSlot);
    assert.ok(barrel.StudioRailCtx);
    assert.equal(typeof barrel.StudioRail, "function");
    assert.ok(Array.isArray(barrel.STUDIO_CAPABILITIES));
    assert.equal(typeof barrel.registerClientTool, "function");
    assert.equal(typeof barrel.activeClientToolNames, "function");
    assert.equal(typeof barrel.registerStudioContextLoader, "function");
    assert.equal(typeof barrel.requestStudioOpen, "function");
    assert.equal(typeof barrel.renderSlotView, "function");
    assert.equal(typeof barrel.SlotOutlet, "function");
  });
});
