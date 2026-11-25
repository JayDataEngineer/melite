// @contract provision-workspace-globs-posix (THE WORKSPACE-GLOB SEPARATOR
// LAW, 2026-11-25). THE BURN (CI 45492709450, unit on windows-latest): the
// provisioner's workspace scan sliced a repo-relative path out of a join()
// result and tested it against pnpm's POSIX globs. join() answers the
// platform separator, so on Windows the glob never matched, the name map
// came back empty, and every base bundle read "profile base mounts X but no
// workspace package carries that name" — no profile could render there. The
// lane-pairing fence wall's control arm was the first suite to run the real
// bin on Windows, and it died at that gate instead of its own.
//
// The law: the relative path the globs judge is POSIX on every platform.
// The arms compose the bin's REAL compiler with the REAL normalizer against
// the LIVE pnpm-workspace.yaml, then pin the wiring (a fixed helper nobody
// calls is no cure). The end-to-end proof off-platform is the fence wall's
// control arm, which reaches the profile-rows gate only when the name map
// resolves.
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { RENDER_ROOT, relPosix, workspaceGlobRegExp } from "../bin/infer-provision.mjs";

const BIN = fileURLToPath(new URL("../bin/infer-provision.mjs", import.meta.url));

/** The live workspace globs, read the way the bin reads them. */
function liveGlobs(): string[] {
  const yaml = readFileSync(join(RENDER_ROOT, "pnpm-workspace.yaml"), "utf8");
  return [...yaml.matchAll(/^\s*-\s*['"]?([^'"\s#]+)/gm)].map((m) => m[1]).filter((g) => !g.startsWith("!"));
}

describe("THE WORKSPACE-GLOB SEPARATOR LAW — the provisioner resolves base bundles on every platform", () => {
  it("a Windows-shaped package dir answers the POSIX relative the globs are written in", () => {
    expect(relPosix("C:\\repo", "C:\\repo\\packages\\web\\card-base")).toBe("packages/web/card-base");
  });

  it("a POSIX path passes through byte-identical (the Linux/macOS render never moves)", () => {
    expect(relPosix("/srv/repo", "/srv/repo/packages/web/card-base")).toBe("packages/web/card-base");
    expect(relPosix("/srv/repo", "/srv/repo/vendor/cordis_plugins/loader")).toBe("vendor/cordis_plugins/loader");
  });

  it("THE COMPOSED DOOR: Windows-shaped input matches the LIVE pnpm-workspace globs — the name map can no longer come back empty off-platform", () => {
    // The shape of the burn: the melite-test base mounts @melite/card-base.
    // This run ran green on Linux for the same reason it ran red on
    // Windows — the separator join() happened to answer.
    const globs = liveGlobs();
    expect(globs.length, "the live workspace file declares globs").toBeGreaterThan(0);
    const regexes = globs.map(workspaceGlobRegExp);
    const windowsShaped = relPosix("C:\\actions\\work\\melite\\melite", "C:\\actions\\work\\melite\\melite\\packages\\web\\card-base");
    expect(regexes.some((re) => re.test(windowsShaped)), `no live glob matches ${windowsShaped}`).toBe(true);
    // And the negated row the yaml carries is not a matcher (the bin filters it).
    expect(globs.some((g) => g.startsWith("!")), "negations stay filtered out of the matcher set").toBe(false);
  });

  it("THE WIRING: the scan routes its relative path through relPosix and its matcher through the one compiler — no raw slice or inline regex survives", () => {
    const src = readFileSync(BIN, "utf8");
    const scan = src.slice(src.indexOf("function workspacePackages()"));
    expect(scan).toContain("const rel = relPosix(root, full)");
    expect(scan).toContain("const re = workspaceGlobRegExp(g)");
    // the raw slice has exactly one home — inside relPosix — and none
    // in the scan that judged it
    expect(scan).not.toMatch(/full\.slice\(root\.length/);
    expect(src.split("full.slice(root.length").length - 1, "the slice has one home: the normalizer").toBe(1);
    // exactly one home for the glob grammar (a second copy drifts)
    expect(src.split("[^/]*").length - 1, "the one-segment wildcard grammar has one home").toBe(1);
  });
});
