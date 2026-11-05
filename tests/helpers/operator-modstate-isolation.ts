// tests/helpers/operator-modstate-isolation.ts — THE OPERATOR-STATE
// FIREWALL (the poison cure's test-side half, 2026-11-15). Two files
// on this machine are OPERATOR STATE, never fixture, and a suite
// that boots the real plane must judge the DECLARED plane plus its
// own fixtures — never what the operator installed last Tuesday:
//
// 1. data/loras/user-loras.json — the seated picker rows. The
//    pixel-anim burn seated a real anima row there and the next
//    battery had mod-liveness's "anima serves the honest empty"
//    premise red on machine state.
// 2. the engine's own loras shelf (resolveEngineLorasDir — the
//    tray's dir). The incident's anima/ drop made the boot tray
//    register an anima row, anima's catalog went row-ful, and T7's
//    burn cell lost its row-less-catalog fallback to krea-2
//    (unknown-lora instead of foreign-family-value) — the wall
//    judged the operator's shelf, not the law.
//
// boot-models.ts calls this before cascadeInit: every suite that
// imports the boot brick reads an ABSENT rows file and an EMPTY tray
// unless it states otherwise. Suites with their own shelf or rows
// fixture (or a seat-through-the-door arm) set MELITE_USER_LORAS /
// MELITE_COMFYUI_LORAS_DIR themselves; this guard never overrides a
// stated value. Suites that compose the mod plane directly without
// the boot brick call this at module scope.
//
// GPU-lane e2e that must see the REAL shelf states its own
// MELITE_COMFYUI_LORAS_DIR — the wall tier never does.
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/** Bind the two operator-state reads to empty temp seats when
 *  unset: the booted plane serves no operator rows by default. The
 *  temp dirs are per-process (concurrent workers never share a
 *  seat); the rows file itself is never created here — absence is
 *  the shipped state — and the shelf dir stays empty — the tray
 *  walks zero files. */
export function isolateOperatorModState(): void {
  if (process.env["MELITE_USER_LORAS"] === undefined) {
    const rows = mkdtempSync(join(tmpdir(), "melite-rows-iso-"));
    process.env["MELITE_USER_LORAS"] = join(rows, "user-loras.json");
  }
  if (process.env["MELITE_COMFYUI_LORAS_DIR"] === undefined) {
    process.env["MELITE_COMFYUI_LORAS_DIR"] = mkdtempSync(join(tmpdir(), "melite-shelf-iso-"));
  }
}
