/**
 * artifact-plane.spec.ts — THE ARTIFACT-PLANE LAW (F6, the nativity
 * audit 2026-11-05): this package serves what its manifest declares
 * and nothing else — `lib/**` (the tsc emit plane, owned by
 * tools/build-plane.mjs). The tracked `dist/` pair
 * (index.mjs + index.d.mts) was emitted by no build this repo runs,
 * consumed by nothing, and still absorbed dictionary growth in a dead
 * bundle (7b7425fd3) — the source plane and the artifact plane mixed.
 * This wall fires the moment a tracked file reappears outside lib/
 * or the manifest starts serving one.
 */
import { describe, expect, it } from "vitest"
import { execFileSync } from "node:child_process"
import { dirname, join } from "node:path"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

const PKG = join(dirname(fileURLToPath(import.meta.url)), "..")
const REPO = join(PKG, "../../..")

/** Every git-tracked file of this package, repo-relative. */
function tracked(): string[] {
  return execFileSync("git", ["ls-files", "--", "."], { cwd: PKG, encoding: "utf8" })
    .split("\n")
    .filter((f) => f.length > 0)
}

describe("the artifact-plane law (mask-studio serves lib/** and nothing else)", () => {
  it("every tracked artifact file lives under lib/ (no tracked dist/ plane — F6)", () => {
    // Non-source, non-test tracked files are the artifact plane.
    const artifacts = tracked().filter((f) => !/^(src|tests|README\.md)/.test(f) && f !== "package.json" && !/^tsconfig/.test(f))
    const offenders = artifacts.filter((f) => !f.startsWith("lib/"))
    expect(offenders, `tracked artifacts outside lib/ — no emitter and no consumer exist for them (F6's dead dist/ plane): ${offenders.join(", ")}`).toEqual([])
  })

  it("the manifest serves lib/** only (a served plane outside lib/ is named)", () => {
    const man = JSON.parse(readFileSync(join(PKG, "package.json"), "utf8")) as { files?: string[] }
    const offenders = (man.files ?? []).filter((f) => !f.startsWith("lib"))
    expect(offenders, `manifest files entries outside lib/: ${offenders.join(", ")}`).toEqual([])
  })
})
