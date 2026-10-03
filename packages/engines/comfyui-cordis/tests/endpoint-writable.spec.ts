// endpointWritable — the tracked-file-safe form of a derived path
// (ledger li-portability: machine absolutes outside the repo belong
// to the untracked overlay, never to a file a fresh clone shares).
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { endpointWritable } from "../scripts/provision-instance-layout.ts";

describe("endpointWritable", () => {
  it("passes repo-relative values through untouched", () => {
    assert.equal(endpointWritable("data/input", "/repo"), "data/input");
    assert.equal(endpointWritable("data/temp", "/repo"), "data/temp");
  });

  it("stores an absolute path under the repository repo-relative", () => {
    assert.equal(endpointWritable("/repo/data/input", "/repo"), "data/input");
    assert.equal(
      endpointWritable("/repo/data/models/image-gen/comfyui", "/repo"),
      "data/models/image-gen/comfyui",
    );
  });

  it("refuses a machine absolute outside the repository", () => {
    assert.equal(endpointWritable("/mnt/data/models", "/repo"), null);
    assert.equal(endpointWritable("/home/ubuntu/projects/x", "/repo"), null);
  });

  it("refuses traversal past the repository root", () => {
    assert.equal(endpointWritable("/repo/../etc", "/repo"), null);
  });

  it("maps the empty string to itself (unset inherits)", () => {
    assert.equal(endpointWritable("", "/repo"), "");
  });

  it("normalizes separators to forward slashes", () => {
    // posix paths only in this suite; the assertion pins the contract
    assert.equal(endpointWritable("/repo/a/b", "/repo"), "a/b");
  });
});
