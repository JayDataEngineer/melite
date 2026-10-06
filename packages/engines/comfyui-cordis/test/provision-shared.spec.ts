// provision-shared.spec.ts — the REPO-derivation wall (batch T):
// the provisioning CLI's every data/ and infra/ path hangs off REPO,
// and the module executes from two layouts one directory apart in
// depth (src/scripts under the source plane, lib/scripts as the
// built artifact a plain-`node` subprocess runs). The counted-hop
// derivation mis-derived the built plane to <repo>/packages and the
// healthy-runtime check died in ENOENT — this wall pins the marker
// law: REPO is the workspace root, wherever the module loads from.
import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { REPO } from "../scripts/provision-shared.ts";

describe("provision REPO derivation (the two-layout law)", () => {
  test("REPO is the workspace root — the pnpm-workspace.yaml marker sits in it", () => {
    expect(existsSync(join(REPO, "pnpm-workspace.yaml")), `REPO=${REPO} must carry pnpm-workspace.yaml`).toBe(true)
  })

  test("REPO carries the estate layout the provisioner writes into", () => {
    expect(existsSync(join(REPO, "packages", "engines", "comfyui-cordis", "package.json")), "the engine package resolves through REPO").toBe(true)
  })
})
