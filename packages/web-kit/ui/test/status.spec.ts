// status.spec.ts — the status → visual mapping: known keys resolve,
// unknown keys fall back to pending, helpers project one field.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import {
  statusBadge,
  statusDot,
  statusLabel,
  statusStyle,
} from "../src/status.ts";

describe("statusStyle", () => {
  it("resolves a known key to its full style row", () => {
    assert.deepEqual(statusStyle("done"), {
      dot: "bg-emerald-400",
      badge: "bg-emerald-500/15 text-emerald-300",
      label: "done",
      ring: "ring-emerald-500/30",
    });
  });
  it("keeps legacy aliases as their own rows", () => {
    assert.equal(statusStyle("failed").label, "failed");
    assert.equal(statusStyle("completed").label, "done");
    assert.equal(statusStyle("generating").label, "rendering");
  });
  it("falls back to pending for an unknown key", () => {
    assert.deepEqual(statusStyle("no-such-status"), statusStyle("pending"));
  });
  it("falls back to pending for an empty key", () => {
    assert.deepEqual(statusStyle(""), statusStyle("pending"));
  });
  it("every documented key carries all four fields non-empty", () => {
    const keys = [
      "pending",
      "running",
      "done",
      "error",
      "skipped",
      "stopped",
      "empty",
      "generating",
      "ready",
      "failed",
      "completed",
      "reused",
    ];
    for (const key of keys) {
      const row = statusStyle(key);
      assert.ok(row.dot.length > 0, `${key}.dot`);
      assert.ok(row.badge.length > 0, `${key}.badge`);
      assert.ok(row.label.length > 0, `${key}.label`);
      assert.ok(row.ring.length > 0, `${key}.ring`);
    }
  });
});

describe("statusDot", () => {
  it("projects the dot class of a known key", () => {
    assert.equal(statusDot("running"), "bg-brand");
  });
  it("falls back to the pending dot for an unknown key", () => {
    assert.equal(statusDot("bogus"), statusDot("pending"));
  });
});

describe("statusBadge", () => {
  it("projects the badge class of a known key", () => {
    assert.equal(statusBadge("error"), "bg-red-500/15 text-red-300");
  });
  it("falls back to the pending badge for an unknown key", () => {
    assert.equal(statusBadge("bogus"), statusBadge("pending"));
  });
});

describe("statusLabel", () => {
  it("projects the label of a known key", () => {
    assert.equal(statusLabel("skipped"), "off");
  });
  it("falls back to the pending label for an unknown key", () => {
    assert.equal(statusLabel("bogus"), statusLabel("pending"));
  });
});
