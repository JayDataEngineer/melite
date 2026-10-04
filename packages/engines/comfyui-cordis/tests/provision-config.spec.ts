// provision-config endpoint law — the merged root (tracked
// inference.config.json + machine overlay) is the authority for
// engine url/port; the tracked comfyui_endpoint.json's value is the
// fallback. Override-first made every fresh clone talk to whatever
// runs at 127.0.0.1:8188 — the LIVE engine on the developer
// estate (its Manager answered each git-url install with an
// empty-body 400 "Already exists"), nothing on a stranger's box
// (the fresh-clone probe's pass-6 receipt).
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { engineField, mergeOverlay } from "../scripts/provision-config.ts";
import type { RootConfig } from "../scripts/provision-config.ts";

describe("engineField (root wins, endpoint file is the fallback)", () => {
  it("prefers the merged root's url over the tracked endpoint's", () => {
    const root = { engines: { comfyui: { url: "http://127.0.0.1:35455" } } };
    assert.equal(
      engineField(root, "url", "http://127.0.0.1:8188"),
      "http://127.0.0.1:35455");
  });
  it("falls back to the endpoint file when the root names no url", () => {
    assert.equal(
      engineField({}, "url", "http://127.0.0.1:8188"),
      "http://127.0.0.1:8188");
  });
  it("is blank only when both name none", () => {
    assert.equal(engineField({}, "url", undefined), "");
  });
  it("carries the same law for the port field", () => {
    const root = { engines: { comfyui: { port: 35455 } } };
    assert.equal(engineField(root, "port", 8188), "35455");
  });
});

describe("loadRoot + mergeOverlay (the overlay shadows keys, never the file)", () => {
  it("keeps tracked defaults for keys the overlay does not name", () => {
    const tracked = { models: { read_root: "data/models", download_root: "/abs" } };
    const overlay = { engines: { comfyui: { url: "http://127.0.0.1:9" } } };
    const merged = mergeOverlay(tracked, overlay) as RootConfig;
    assert.equal(merged.models?.read_root, "data/models");
    assert.equal(merged.engines?.comfyui?.url, "http://127.0.0.1:9");
  });
  it("a one-key overlay still yields a url the endpoint law can pin", () => {
    const tracked = { engines: { comfyui: { url: "http://127.0.0.1:8188" } } };
    const overlay = { engines: { comfyui: { url: "http://127.0.0.1:35455", port: 35455 } } };
    const merged = mergeOverlay(tracked, overlay) as RootConfig;
    assert.equal(
      engineField(merged, "url", "http://127.0.0.1:8188"),
      "http://127.0.0.1:35455");
  });
});
