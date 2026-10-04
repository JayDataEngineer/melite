// provision-audiocore — the native audio core artifact (the TTS
// chain audit T4, 2026-10-15: the .so was reachable only through
// this box's hand-built fork — no source, no declaration, no
// machine path a fresh clone could take).
//
// THE CURE: the .so is a pinned first-party RELEASE ARTIFACT —
// built at the fork's ref, attached to
// github.com/JayDataEngineer/audio.cpp (the fork's own remote, a
// public first-party repo), and fetched by this step with the
// same url@ref+sha256 law every declaration row rides. The
// install path is the estate's runtime tree
// (data/runtime/audiocore/), and the managed boot line exports
// AUDIOCORE_NATIVE_LIB pointing here (cmdBootCmd) so the packs'
// ctypes loader finds it with no hand-authored file.
//
// This is NOT an extension seat (the vendor law, 2026-10-15:
// Manager is the only vendor of EXTENSIONS): the .so is runtime
// infrastructure for the audio packs' native loader, so it rides
// `provision sync` — the estate's own runtime-setup leg — beside
// the core checkout and the vendored manager.
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { chmodSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { REPO, die, info } from "./provision-shared.ts";

/** The pinned artifact: fork ref → release tag → asset URL. */
export const AUDIOCORE_TAG = "libaudiocore-3938031";
export const AUDIOCORE_URL =
  "https://github.com/JayDataEngineer/audio.cpp/releases/download/" +
  AUDIOCORE_TAG + "/libaudiocore_native.so";
/** sha256 of the release asset (verified on every fetch; a drifted
 * asset is a refusal, never a silent pass). */
export const AUDIOCORE_SHA256 =
  "4a7069054ba608ce3bd099e09106d6036984023e657fdf60de8ff3394e18a590";
/** The install dir (inside the runtime tree the estate owns). */
export const AUDIOCORE_DIR = join(REPO, "data", "runtime", "audiocore");
/** The installed .so path — what AUDIOCORE_NATIVE_LIB names. */
export const AUDIOCORE_LIB = join(AUDIOCORE_DIR, "libaudiocore_native.so");

function sha256File(p: string): string {
  return createHash("sha256").update(readFileSync(p)).digest("hex");
}

/** Fetch (if needed) and verify the native audio core. Present and
 * hash-matching is a no-op; anything else is a fetch + verify, and
 * a mismatch is a LOUD refusal naming both hashes. */
export function provisionAudiocore(): void {
  if (existsSync(AUDIOCORE_LIB) && sha256File(AUDIOCORE_LIB) === AUDIOCORE_SHA256) {
    info("audiocore native already at " + AUDIOCORE_TAG + " (sha256 verified)");
    return;
  }
  info("fetching libaudiocore_native.so " + AUDIOCORE_TAG + " …");
  // the dir lands before curl writes (curl creates no parents)
  mkdirSync(AUDIOCORE_DIR, { recursive: true });
  // curl under spawnSync (the same pattern the core checkout and uv
  // legs ride): the step chain is synchronous, and the download is
  // one verified asset — 77MB through a pipe, not memory.
  const tmp = AUDIOCORE_LIB + ".download";
  const r = spawnSync("curl",
    ["-fsSL", "--max-time", "600", AUDIOCORE_URL, "-o", tmp],
    { stdio: "inherit" });
  if (r.error !== undefined) {
    die("curl failed to spawn — install it first: " + r.error.message);
  }
  if (r.status !== 0 || !existsSync(tmp)) {
    die("audiocore native fetch failed (curl " + (r.status ?? "signal") +
      ") — the release asset must exist at " + AUDIOCORE_URL);
  }
  const got = sha256File(tmp);
  if (got !== AUDIOCORE_SHA256) {
    die("audiocore native sha256 drift: expected " + AUDIOCORE_SHA256 +
      ", asset hashes " + got + " — the release moved; re-pin AUDIOCORE_TAG");
  }
  writeFileSync(AUDIOCORE_LIB, readFileSync(tmp));
  chmodSync(AUDIOCORE_LIB, 0o755);
  rmSync(tmp);
  info("audiocore native installed at " + AUDIOCORE_LIB);
}
