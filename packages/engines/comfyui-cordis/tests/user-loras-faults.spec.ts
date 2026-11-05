// user-loras-faults.spec.ts — FAULT-INJECTION arms for the stat race.
//
// installUserLora stats its source AFTER existsSync passed: between the
// two syscalls a vanishing file is a real prod race (a concurrent clean,
// a network mount blinking), and the door's refusal must name the file,
// never throw. A single-threaded test cannot interleave the two calls,
// so this file faults the seam with a whole-file node:fs mock — any
// source path ending in the sentinel below EXISTS at the existsSync
// check and is GONE at the stat, exactly the race the catch at
// userLoras.ts:437 was written for. The mock rides importOriginal, so
// every other fs call in this file is the real one; NOTHING else in the
// package mocks node:fs, which is why the fault lives in its own spec
// file instead of beside the real-fs suites.
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { installUserLora } from "../src/userLoras.ts";

vi.mock("node:fs", async (importOriginal) => {
  const real = await importOriginal<typeof import("node:fs")>();
  const SENTINEL = "vanished-between-checks.safetensors";
  const isSentinel = (p: unknown): boolean => typeof p === "string" && p.endsWith(SENTINEL);
  return {
    ...real,
    existsSync: (p: string): boolean => (isSentinel(p) ? true : real.existsSync(p)),
    statSync: (p: string): unknown => {
      if (isSentinel(p)) {
        const err = new Error(`ENOENT: no such file or directory, stat '${p}'`) as NodeJS.ErrnoException;
        err.code = "ENOENT";
        throw err;
      }
      return real.statSync(p);
    },
  };
});

describe("installUserLora — the stat race (a source vanishing between existsSync and statSync)", () => {
  let root = "";

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "melite-lora-faults-"));
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it("a source vanishing between the existence check and the stat refuses by name, never throws", () => {
    // the sentinel never lands on disk: existsSync answers true (the
    // file was there at the check), statSync throws ENOENT (it is gone
    // at the read) — the door names the file in its refusal.
    const vanished = join(root, "vanished-between-checks.safetensors");
    const out = installUserLora(vanished, join(root, "loras"));
    expect(out.ok).toBe(false);
    if (!out.ok) {
      expect(out.reason).toBe(`cannot read ${vanished}: ENOENT: no such file or directory, stat '${vanished}'`);
    }
  });
});
