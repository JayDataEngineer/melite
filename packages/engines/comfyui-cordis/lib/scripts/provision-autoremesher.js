// provision-autoremesher — the quad-remesh lane's engine binary (the
// AutoRemesher provision-sharing audit, 2026-10-03: the binary was
// reachable only through this box's gitignored
// references/autoremesher build — no declaration, no machine path a
// fresh clone could take, and the pack's refusal taught a cmake
// build in a tree that ships with no source).
//
// THE CURE (the T4 pattern, proven by provision-audiocore.ts): the
// binary is a pinned first-party RELEASE ARTIFACT — built from
// huxingyi/autoremesher at d9ef96bd, attached to
// github.com/JayDataEngineer/melite-autoremesher-nodes (the pack's
// own remote), and fetched by this step with the same url@tag+sha256
// law every declaration row rides. The install path is the estate's
// runtime tree (data/runtime/autoremesher/), and the managed boot
// line exports AUTOREMESHER_BIN pointing here (cmdBootCmd) so the
// pack's find_binary() resolves it with no hand-authored file.
//
// This is NOT an extension seat (the vendor law, 2026-10-15:
// Manager is the only vendor of EXTENSIONS): the binary is runtime
// infrastructure for the pack's subprocess, so it rides
// `provision sync` — the estate's own runtime-setup leg — beside
// the native audio core and the vendored manager.
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { chmodSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { REPO, die, info } from "./provision-shared.js";
/** The pinned artifact: upstream ref → release tag → asset URL. */
export const AUTOREMESHER_TAG = "autoremesher-d9ef96bd";
export const AUTOREMESHER_URL = "https://github.com/JayDataEngineer/melite-autoremesher-nodes/releases/download/" +
    AUTOREMESHER_TAG + "/autoremesher-asset";
/** sha256 of the release asset (verified on every fetch; a drifted
 * asset is a refusal, never a silent pass). */
export const AUTOREMESHER_SHA256 = "b84901ca07062a2c0ab7b1e0055e3d4c6fa2d5c6340b70576350ab542bc06161";
/** The install dir (inside the runtime tree the estate owns). */
export const AUTOREMESHER_DIR = join(REPO, "data", "runtime", "autoremesher");
/** The installed binary path — what AUTOREMESHER_BIN names. */
export const AUTOREMESHER_BIN = join(AUTOREMESHER_DIR, "autoremesher");
function sha256File(p) {
    return createHash("sha256").update(readFileSync(p)).digest("hex");
}
/** Fetch (if needed) and verify the quad-remesh binary. Present and
 * hash-matching is a no-op; anything else is a fetch + verify, and
 * a mismatch is a LOUD refusal naming both hashes. */
export function provisionAutoremesher() {
    if (existsSync(AUTOREMESHER_BIN) && sha256File(AUTOREMESHER_BIN) === AUTOREMESHER_SHA256) {
        info("autoremesher binary already at " + AUTOREMESHER_TAG + " (sha256 verified)");
        return;
    }
    info("fetching autoremesher " + AUTOREMESHER_TAG + " …");
    // the dir lands before curl writes (curl creates no parents)
    mkdirSync(AUTOREMESHER_DIR, { recursive: true });
    // curl under spawnSync (the same pattern the native audio core
    // rides): the step chain is synchronous, and the download is one
    // verified asset — 2MB through a pipe, not memory.
    const tmp = AUTOREMESHER_BIN + ".download";
    const r = spawnSync("curl", ["-fsSL", "--max-time", "600", AUTOREMESHER_URL, "-o", tmp], { stdio: "inherit" });
    if (r.error !== undefined) {
        die("curl failed to spawn — install it first: " + r.error.message);
    }
    if (r.status !== 0 || !existsSync(tmp)) {
        die("autoremesher fetch failed (curl " + (r.status ?? "signal") +
            ") — the release asset must exist at " + AUTOREMESHER_URL);
    }
    const got = sha256File(tmp);
    if (got !== AUTOREMESHER_SHA256) {
        die("autoremesher sha256 drift: expected " + AUTOREMESHER_SHA256 +
            ", asset hashes " + got + " — the release moved; re-pin AUTOREMESHER_TAG");
    }
    writeFileSync(AUTOREMESHER_BIN, readFileSync(tmp));
    chmodSync(AUTOREMESHER_BIN, 0o755);
    rmSync(tmp);
    info("autoremesher binary installed at " + AUTOREMESHER_BIN);
}
//# sourceMappingURL=provision-autoremesher.js.map
