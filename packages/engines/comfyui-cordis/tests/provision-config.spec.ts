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
import { join, relative } from "node:path";
import { existsSync, mkdtempSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
const nodeFs = { existsSync, mkdtempSync, readdirSync, writeFileSync };
import { engineField, mergeOverlay, anchorDir, boundModelFolders } from "../scripts/provision-config.ts";
import { cmdInitStore, cmdPaths } from "../scripts/provision-instance-layout.ts";
import { REPO } from "../scripts/provision-shared.ts";
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

describe("anchorDir (explicit overrides anchor like the root config)", () => {
  it("anchors a relative value to the repository, not the caller's CWD", () => {
    assert.equal(anchorDir("data/models/store"),
      anchorDir(anchorDir("data/models/store")));
    assert.ok(anchorDir("data/x").endsWith(join("data", "x")));
  });
  it("keeps an absolute value unchanged", () => {
    assert.equal(anchorDir("/mnt/store"), "/mnt/store");
  });
  it("makes the endpointWritable round trip stable (ledger li-paths-idempotence)", () => {
    // absolute under repo -> stored repo-relative -> read back ->
    // anchored to the SAME absolute: the pointer never dangles
    const abs = anchorDir("data/models/image-gen");
    const written = relative(REPO, abs);
    assert.ok(abs.startsWith(REPO + "/"));
    assert.equal(anchorDir(written), abs);
  });
});

describe("boundModelFolders (unset endpoint overrides fall through to the root)", () => {
  it("derives base_path from models.read_root when the endpoint pins no storage", () => {
    // the wiring-roots audit (2026-10-13): anchorDir("") collapses to
    // the repository root — a truthy value that swallowed the ||
    // fallback and pointed every yaml category at the repo instead
    // of the configured store
    const cfg = { url: "http://127.0.0.1:8188" };
    const bound = boundModelFolders(cfg as never);
    // loadRoot merges the tracked config + machine overlay; on this
    // estate the overlay pins /mnt-style absolute store roots. The
    // LAW: the base is the configured store, never the repository
    // itself, and the fixed categories keep their identity mapping
    assert.ok(bound.base_path.length > 0 && bound.base_path !== REPO,
      "base_path fell back to the repo root (anchorDir(\"\") collapse): "
      + bound.base_path);
    assert.equal(bound.folders["checkpoints"], "checkpoints");
  });
  it("keeps an explicit endpoint override anchored exactly like the root", () => {
    const bound = boundModelFolders({
      url: "http://127.0.0.1:8188",
      model_base_path: "/explicit/store",
    } as never);
    assert.equal(bound.base_path, "/explicit/store");
    assert.equal(bound.download_path, "/explicit/store");
  });
});

describe("cmdPaths refuses a dead root (wiring re-audit F7, 2026-10-13)", () => {
  it("throws before writing anything when the resolved base does not exist", () => {
    // a typoed models.read_root sailed through: the yaml mounted a
    // path that does not exist, ComfyUI silently served empty enums
    // under it, and lanes refused at /prompt with the weights on
    // disk. The refusal is provision-time and side-effect-free —
    // it fires before the first mkdir/write.
    assert.throws(
      () => cmdPaths({
        url: "http://127.0.0.1:8188",
        model_base_path: "/nonexistent/store-root-for-the-refusal-spec",
      } as never),
      /base_path does not exist.*never guessed/s,
    );
  });
});

describe("init-store (the fresh-clone store door, 2026-10-17)", () => {
  // `paths`/`sync` refuse a store that does not exist — the
  // dead-root law — but a fresh clone has no store at all, and
  // the refusal's named action ("create the store") had no door:
  // every fresh clone died at sync. init-store IS the named
  // action, explicit, never called from inside `paths` (creating
  // a typoed root silently is the exact bug the refusal cures).
  it("lays the roots and every category dir, and is idempotent", () => {
    const { mkdtempSync, existsSync, readdirSync } = nodeFs;
    const base = mkdtempSync(join(tmpdir(), "init-store-spec-"));
    const store = join(base, "store");
    const cfg = { url: "http://127.0.0.1:8188", model_base_path: store } as never;
    cmdInitStore(cfg);
    assert.ok(existsSync(store), "base_path laid");
    const first = readdirSync(store).sort();
    assert.ok(first.includes("checkpoints") && first.includes("loras"),
      "category dirs laid under the download root");
    const before = readdirSync(store).sort();
    cmdInitStore(cfg); // second run: no throw, no change
    assert.deepEqual(readdirSync(store).sort(), before);
  });
  it("refuses a plain file sitting where a root belongs", () => {
    const { mkdtempSync, writeFileSync } = nodeFs;
    const base = mkdtempSync(join(tmpdir(), "init-store-file-spec-"));
    const store = join(base, "store");
    writeFileSync(store, "not a directory");
    assert.throws(
      () => cmdInitStore(
        { url: "http://127.0.0.1:8188", model_base_path: store } as never),
      /init-store.*is a file, not a directory.*never guessed/s,
    );
  });
});
