// manage-probe-nocode.spec.ts — THE NO-CODE ERROR SEATS (the
// coverage queue's manageProbe batch, 2026-10-16). activeRuns'
// fail-closed walk names every unreadable root and sidecar with its
// errno — but an error thrown with NO string `code` (a plain Error
// from a fs shim, an EIO surfaced as a bare exception) must still
// name the seat, never crash the census and never fail open. The
// two `?? "?"` legs answer "?" for exactly that shape. The fs mocks
// are per-path passthroughs (everything real except the two
// targeted throws), pinned to a private state root so the walk
// reads only this fixture's tree.
import { describe, it, expect, vi } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// hoisted: vi.mock's factory runs before module scope initializes;
// the factory imports the real fs itself (async factory is allowed)
const seat = vi.hoisted(() => {
  const { mkdtempSync } = require("node:fs") as typeof import("node:fs");
  const { tmpdir } = require("node:os") as typeof import("node:os");
  const { join } = require("node:path") as typeof import("node:path");
  const stateRoot = mkdtempSync(join(tmpdir(), "probe-nocode-"));
  return {
    stateRoot,
    outputRoot: join(stateRoot, "output"),
    throwAt: { readdir: "", readSidecar: "" },
  };
});

vi.mock("node:fs", async (importOriginal) => {
  const realFs = await importOriginal<typeof import("node:fs")>();
  const { throwAt } = seat;
  return {
    ...(realFs as object),
    readdirSync: (p: string, ...rest: unknown[]) => {
      if (throwAt.readdir !== "" && p === throwAt.readdir) {
        throw new Error("weird volume error — no errno attached");
      }
      return (realFs.readdirSync as (p: string, ...rest: unknown[]) => string[])(p, ...rest);
    },
    readFileSync: (p: string, ...rest: unknown[]) => {
      if (throwAt.readSidecar !== "" && p === throwAt.readSidecar) {
        throw new Error("weird sidecar error — no errno attached");
      }
      return (realFs.readFileSync as (p: string, ...rest: unknown[]) => string)(p, ...rest);
    },
  };
});

const { activeRuns } = await import("../src/manageProbe.ts");

// the walk's roots arrive as call data (J12: the queue seat's
// stateRoots manifest — no env seam) — pinned to this fixture so
// the census reads ONLY this tree, never the repo's live runs
const ROOTS = [seat.stateRoot] as const;

describe("activeRuns — errors with no errno code answer '?', still fail closed", () => {
  it("a root readdir throwing a code-less error names the root with '?'", () => {
    mkdirSync(seat.outputRoot, { recursive: true });
    seat.throwAt.readdir = seat.outputRoot;
    try {
      expect(activeRuns(ROOTS)).toEqual([
        `(unreadable root: ${seat.outputRoot} ?)`,
      ]);
    } finally {
      seat.throwAt.readdir = "";
    }
  });

  it("a sidecar read throwing a code-less error counts the run ACTIVE with '?'", () => {
    const runDir = join(seat.outputRoot, "run-42");
    mkdirSync(runDir, { recursive: true });
    writeFileSync(join(runDir, "_flow.json"), JSON.stringify({ status: "running" }), "utf8");
    seat.throwAt.readSidecar = join(runDir, "_flow.json");
    try {
      expect(activeRuns(ROOTS)).toContain("run-42 (state unreadable: ?)");
    } finally {
      seat.throwAt.readSidecar = "";
    }
  });
});
