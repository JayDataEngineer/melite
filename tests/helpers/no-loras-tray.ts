// no-loras-tray.ts — THE HERMETIC TRAY for unit censuses (2026-11-04).
// The loras tray serves whatever sits in the RESOLVED loras dir, so a
// census of DECLARED lora rows must pin an EMPTY dir: the operator's
// own disk never decides a unit test's count (the tray's inclusion is
// judged by the tray wall, which uses the real dir on purpose).
//
// Import this BEFORE any models boot — the boot composes the mod
// plane, so a pin set after the imports have hoisted is too late.
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { rmSync } from "node:fs";
import { afterAll } from "vitest";

const pinned = mkdtempSync(join(tmpdir(), "melite-no-loras-"));
const before = process.env["MELITE_COMFYUI_LORAS_DIR"];
process.env["MELITE_COMFYUI_LORAS_DIR"] = pinned;

// THE RESTORE (2026-11-04): a worker serves several spec files, so a
// pin left behind would decide the NEXT file's boot — the same
// machine-state leak one level up.
afterAll(() => {
  if (before === undefined) delete process.env["MELITE_COMFYUI_LORAS_DIR"];
  else process.env["MELITE_COMFYUI_LORAS_DIR"] = before;
  rmSync(pinned, { recursive: true, force: true });
});
