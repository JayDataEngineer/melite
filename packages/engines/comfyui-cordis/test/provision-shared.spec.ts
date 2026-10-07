// provision-shared.spec.ts — the repo()-derivation wall (batch T):
// the provisioning CLI's every data/ and infra/ path hangs off repo(),
// and the module executes from two layouts one directory apart in
// depth (src/scripts under the source plane, lib/scripts as the
// built artifact a plain-`node` subprocess runs). The counted-hop
// derivation mis-derived the built plane to <repo>/packages and the
// healthy-runtime check died in ENOENT — this wall pins the marker
// law: repo() is the workspace root, wherever the module loads from.
import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { repo } from "../scripts/provision-shared.ts";

describe("provision repo() derivation (the two-layout law)", () => {
  test("repo() is the workspace root — the pnpm-workspace.yaml marker sits in it", () => {
    expect(existsSync(join(repo(), "pnpm-workspace.yaml")), `repo()=${repo()} must carry pnpm-workspace.yaml`).toBe(true)
  })

  test("repo() carries the estate layout the provisioner writes into", () => {
    expect(existsSync(join(repo(), "packages", "engines", "comfyui-cordis", "package.json")), "the engine package resolves through repo()").toBe(true)
  })
})
