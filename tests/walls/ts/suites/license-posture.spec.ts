// THE LICENSE POSTURE WALL (the 2026-10-27 relicense, operator order):
// the @melite package estate speaks ONE license — every melite-owned
// package.json declares exactly what the root LICENSE carries, and the
// canonical text under licenses/ is the single source the release
// plane injects. A package that drifts (a stale SSPL-1.0 field, a
// copy-pasted MIT) ships mixed terms silently: each tarball carries
// ITS manifest's license text, so the estate presents two contracts
// at once. Vendored workspace members (vendor/) keep their upstream
// licenses by design and are not ours to relicense — they are
// excluded, and the NOTICE names that carve-out.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const REPO = join(import.meta.dirname, "..", "..", "..", "..");
const ROOT_MANIFEST = JSON.parse(readFileSync(join(REPO, "package.json"), "utf8"));
const ESTATE_LICENSE = ROOT_MANIFEST.license;

/** Every melite-owned package: a directory under packages/ carrying a
 * package.json, EXCLUDING packages/vendor/ — the vendored workspace
 * members keep their upstream licenses by design (NOTICE names the
 * carve-out; typert-protocol is the DSH MIT copy whose identity law
 * requires the workspace seat). Derived from the tree, never frozen. */
function melitePackages(): string[] {
  return readdirSync(join(REPO, "packages")).flatMap((genre) => {
    if (genre === "vendor") return [];
    const genreDir = join(REPO, "packages", genre);
    if (!statSync(genreDir).isDirectory()) return [];
    return readdirSync(genreDir).filter((name) => {
      try {
        return statSync(join(genreDir, name, "package.json")).isFile();
      } catch {
        return false;
      }
    }).map((name) => join(genreDir, name));
  });
}

describe("the license posture (the estate speaks one license)", () => {
  it("the root declares AGPL-3.0-or-later (the relicense posture itself is pinned)", () => {
    assert.equal(ESTATE_LICENSE, "AGPL-3.0-or-later",
      `root package.json declares ${ESTATE_LICENSE} — the 2026-10-27 ` +
      "operator-ordered posture is AGPL-3.0-or-later; a root change is a " +
      "deliberate relicense decision, never a drive-by");
  });

  it("every melite package declares the root's license (a drift ships mixed terms)", () => {
    const pkgs = melitePackages();
    assert.ok(pkgs.length > 50, `derived roster suspiciously small (${pkgs.length}) — the walk broke`);
    const drift = pkgs.map((dir) => {
      const m = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
      return m.license === ESTATE_LICENSE ? null : `${dir.replace(REPO + "/", "")}: ${String(m.license)}`;
    }).filter((s): s is string => s !== null);
    assert.deepEqual(drift, [],
      `${drift.length} package(s) declare a license other than ` +
      `${ESTATE_LICENSE} — each tarball injects its OWN manifest's text, ` +
      "so the estate would present two contracts at once; relicense " +
      "deliberately or fix the drift");
  });

  it("the canonical text exists for the declared license (the release plane refuses without it)", () => {
    const canonical = readFileSync(join(REPO, "licenses", `${ESTATE_LICENSE}.txt`), "utf8");
    assert.match(canonical, /GNU AFFERO GENERAL PUBLIC LICENSE/,
      `licenses/${ESTATE_LICENSE}.txt does not carry the AGPL text — the release plane's injection gate would refuse every mint`);
    assert.equal(readFileSync(join(REPO, "LICENSE"), "utf8"), canonical,
      "the root LICENSE drifts from the canonical licenses/ text — one source, never two");
  });
});
