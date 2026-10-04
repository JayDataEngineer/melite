// layDownloadPointers idempotence (ledger li-paths-idempotence):
// the second `paths` run must be a no-op, a dangling pointer is
// replaced (never EEXIST), real content migrates before the pointer
// is laid, and a stray plain file that blocks a category is removed.
import { describe, it, onTestFinished } from "vitest";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, readlinkSync, rmSync, symlinkSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { layDownloadPointers } from "../scripts/provision-instance-layout.ts";

const tempRoot = (): string => {
  const dir = mkdtempSync(join(tmpdir(), "pointers-"));
  onTestFinished(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
};

describe("layDownloadPointers", () => {
  it("lays a correct pointer and is idempotent on the second run", () => {
    const root = tempRoot();
    const store = join(root, "store");
    layDownloadPointers(store, { checkpoints: "checkpoints" }, join(root, "models"));
    assert.equal(readlinkSync(join(root, "models", "checkpoints")), join(store, "checkpoints"));
    // second run: correct pointer → skipped, no error, still points
    layDownloadPointers(store, { checkpoints: "checkpoints" }, join(root, "models"));
    assert.equal(readlinkSync(join(root, "models", "checkpoints")), join(store, "checkpoints"));
  });

  it("replaces a dangling pointer instead of dying EEXIST", () => {
    const root = tempRoot();
    const models = join(root, "models");
    mkdirSync(models, { recursive: true });
    symlinkSync(join(root, "gone", "checkpoints"), join(models, "checkpoints"));
    const store = join(root, "store");
    // under stat semantics this threw EEXIST on the relink; lstat
    // sees the dangling link itself and unlinks it first
    layDownloadPointers(store, { checkpoints: "checkpoints" }, models);
    assert.equal(readlinkSync(join(models, "checkpoints")), join(store, "checkpoints"));
  });

  it("migrates real content out of a category dir before pointing", () => {
    const root = tempRoot();
    const models = join(root, "models");
    mkdirSync(join(models, "checkpoints"), { recursive: true });
    writeFileSync(join(models, "checkpoints", "model.safetensors"), "bytes");
    layDownloadPointers(join(root, "store"), { checkpoints: "checkpoints" }, models);
    assert.ok(existsSync(join(root, "store", "checkpoints", "model.safetensors")));
    assert.equal(readlinkSync(join(models, "checkpoints")), join(root, "store", "checkpoints"));
  });

  it("re-points onto a moved store (stale healthy link converges)", () => {
    const root = tempRoot();
    const oldStore = join(root, "old-store");
    const newStore = join(root, "new-store");
    layDownloadPointers(oldStore, { loras: "loras" }, join(root, "models"));
    layDownloadPointers(newStore, { loras: "loras" }, join(root, "models"));
    assert.equal(readlinkSync(join(root, "models", "loras")), join(newStore, "loras"));
  });

  it("removes a stray plain file that blocks a category slot", () => {
    const root = tempRoot();
    const models = join(root, "models");
    mkdirSync(models, { recursive: true });
    writeFileSync(join(models, "checkpoints"), "not a directory");
    layDownloadPointers(join(root, "store"), { checkpoints: "checkpoints" }, models);
    assert.equal(readlinkSync(join(models, "checkpoints")), join(root, "store", "checkpoints"));
  });

  it("a migrated file already present at the target is not clobbered", () => {
    const root = tempRoot();
    const models = join(root, "models");
    mkdirSync(join(models, "vae"), { recursive: true });
    writeFileSync(join(models, "vae", "a.bin"), "new");
    mkdirSync(join(root, "store", "vae"), { recursive: true });
    writeFileSync(join(root, "store", "vae", "a.bin"), "existing");
    layDownloadPointers(join(root, "store"), { vae: "vae" }, models);
    assert.equal(
      readFileSync(join(root, "store", "vae", "a.bin"), "utf8"),
      "existing");
    assert.deepEqual(readdirSync(join(root, "store", "vae")), ["a.bin"]);
  });
});
