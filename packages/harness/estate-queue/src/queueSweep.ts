// queueSweep.ts — sidecar sweeps (pure patch + boot fs half) (split from queue.ts 2026-09-18;
// pure move, zero logic changes — the queue.ts barrel re-exports
// every symbol, so the public surface is byte-identical).
//
// Erasable-syntax TS only (node --experimental-strip-types): no
// enums, import type for types, .ts specifiers for relative imports.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { appendLedger, atomicWriteJson } from "./queueLock.ts";
// ── sweeps (sweep_sidecar 2253-2291, sidecar_status 2412-2470) ────

export interface SweepResult {
  readonly touched: boolean;
  readonly wasQueued: boolean;
  readonly doc: Record<string, unknown>;
}

/** Patch a stale sidecar (pure half of sweep_sidecar): every
 *  running/queued status — top-level AND per-stage (any depth) —
 *  becomes failed. Idempotent (an already-swept file has no active
 *  statuses left → touched false, no write). A run still QUEUED
 *  never executed: its sweep note + error say so (queuedWhy)
 *  instead of implying a crash mid-run. */
export function sweepSidecar(
  doc: Record<string, unknown>,
  why: string,
  queuedWhy: string = "",
): SweepResult {
  const wasQueued: boolean = doc["status"] === "queued";
  let touched: boolean = false;
  const patch = (o: unknown): void => {
    if (Array.isArray(o)) {
      for (const v of o) patch(v);
      return;
    }
    if (typeof o === "object" && o !== null) {
      const rec = o as Record<string, unknown>;
      if (rec["status"] === "running" || rec["status"] === "queued") {
        rec["status"] = "failed";
        touched = true;
      }
      for (const v of Object.values(rec)) patch(v);
    }
  };
  patch(doc);
  if (!touched) return { touched: false, wasQueued, doc };
  const note: string = wasQueued && queuedWhy !== "" ? queuedWhy : why;
  doc["sweep"] = note;
  if (wasQueued && queuedWhy !== "") doc["error"] = queuedWhy;
  return { touched: true, wasQueued, doc };
}

/** Boot-sweep notes (boot_sweep 2402-2409). */
export const BOOT_SWEEP_WHY: string =
  "host restarted (boot sweep): stale active sidecar from a dead process";
export const BOOT_SWEEP_QUEUED_WHY: string =
  "host restarted before the run started (never executed) — resubmit";

/** Read-time sweep notes + response errors (sidecar_status
 *  2428-2451): the ledger state is ALWAYS "failed" (even for a
 *  queued zombie — the error TEXT carries the never-executed
 *  honesty), error "zombie swept at read time" mid-run. */
export const READ_SWEEP_WHY: string =
  "read-time sweep: stale running sidecar, no live registry entry";
export const READ_SWEEP_QUEUED_WHY: string =
  "run was still queued when the gateway vanished (never executed) — resubmit";
export const READ_SWEEP_RUNNING_ERROR: string = "zombie swept at read time";

/** Boot-time zombie sweep (boot_sweep 2378-2410, fs half): every
 *  sidecar still claiming running/queued belongs to a DEAD process
 *  — EXCEPT liveRunIds (boot_resurrect just re-queued those; their
 *  queued sidecar is resurrected work, not a zombie). Swept BEFORE
 *  traffic, so the ledger never shows phantom actives. Returns the
 *  swept run ids in sorted order. */
export function bootSweep(
  stateRoot: string,
  liveRunIds: readonly string[] = [],
  nowS: number = Math.floor(Date.now() / 1000),
): string[] {
  const swept: string[] = [];
  const live: Set<string> = new Set(liveRunIds);
  const outRoot: string = join(stateRoot, "output");
  let names: string[];
  try {
    names = readdirSync(outRoot);
  } catch {
    return swept;
  }
  for (const name of names.sort()) {
    if (!name.startsWith("run-")) continue;
    if (live.has(name)) continue;
    let pre: Record<string, unknown> = {};
    try {
      pre = JSON.parse(readFileSync(join(outRoot, name, "_flow.json"), "utf8")) as Record<
        string,
        unknown
      >;
      if (typeof pre !== "object" || pre === null || Array.isArray(pre)) {
        pre = {};
      }
    } catch {
      pre = {};
    }
    const wasQueued: boolean = pre["status"] === "queued";
    const path: string = join(outRoot, name, "_flow.json");
    let current: unknown = null;
    try {
      current = JSON.parse(readFileSync(path, "utf8"));
    } catch (e) {
      // ROW 28 (2026-09-10, census): an unreadable _flow.json must
      // not vanish from the sweep silently — the QUEUE LANE LAW
      // wants every boot disposition ledgered so the operator can
      // reconcile (the old bare continue left an unaudited row).
      appendLedger(
        stateRoot,
        "run.swept",
        { run_id: name, state: "unreadable", error: `boot sweep: _flow.json parse failed: ${e instanceof Error ? e.message : /* v8 ignore next -- JSON.parse throws Errors: the String fallback never fires (2026-09-12) */ String(e)}` },
        nowS,
      );
      continue;
    }
    if (typeof current !== "object" || current === null || Array.isArray(current)) {
      appendLedger(
        stateRoot,
        "run.swept",
        { run_id: name, state: "unreadable", error: "boot sweep: _flow.json is not an object" },
        nowS,
      );
      continue;
    }
    const res: SweepResult = sweepSidecar(
      current as Record<string, unknown>,
      BOOT_SWEEP_WHY,
      wasQueued ? BOOT_SWEEP_QUEUED_WHY : "",
    );
    if (!res.touched) continue;
    atomicWriteJson(path, res.doc);
    appendLedger(
      stateRoot,
      "run.swept",
      { run_id: name, state: wasQueued ? "queued_lost" : "failed", error: "boot sweep" },
      nowS,
    );
    swept.push(name);
  }
  return swept;
}
