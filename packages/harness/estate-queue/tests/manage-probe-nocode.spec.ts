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
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
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
    throwAt: { readdir: "", readSidecar: "", statSidecar: "" },
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
    statSync: (p: string, ...rest: unknown[]) => {
      if (throwAt.statSidecar !== "" && p === throwAt.statSidecar) {
        throw new Error("weird volume error on stat — no errno attached");
      }
      return (realFs.statSync as unknown as (p: string, ...rest: unknown[]) => import("node:fs").Stats)(p, ...rest);
    },
  };
});

const { activeRuns, settleStaleClaims } = await import("../src/manageProbe.ts");

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

// ── engineQueueView (audit N-S2): the caller's abort is never a
// probe answer — a cancelled caller cancels, it does not degrade to
// "no corroboration". The fold to null stays reserved for genuine
// probe failures (malformed body, refused connection).
describe("engineQueueView — the caller abort rethrows, the probe failure folds", () => {
  const ctxWith = (signal: AbortSignal): Parameters<typeof import("../src/manageProbe.ts").engineQueueView>[0] =>
    ({ endpoint: () => ({ url: "http://127.0.0.1:9" }), signal }) as never;

  it("a caller abort mid-queue-fetch rethrows the abort reason (never null)", async () => {
    const { engineQueueView } = await import("../src/manageProbe.ts");
    const c = new AbortController();
    const realFetch = globalThis.fetch;
    // the fetch contract: reject with the signal's reason on abort
    globalThis.fetch = ((_url: unknown, init?: { signal?: AbortSignal }): Promise<unknown> =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(init.signal?.reason), { once: true });
      })) as typeof fetch;
    try {
      const pending = engineQueueView(ctxWith(c.signal));
      c.abort(new Error("caller went"));
      await expect(pending).rejects.toThrow(/caller went/);
    } finally {
      globalThis.fetch = realFetch;
    }
  });

  it("a genuine probe failure still folds to null (no corroboration)", async () => {
    const { engineQueueView } = await import("../src/manageProbe.ts");
    const realFetch = globalThis.fetch;
    globalThis.fetch = (async (): Promise<unknown> => {
      throw new Error("connect ECONNREFUSED");
    }) as typeof fetch;
    try {
      const view = await engineQueueView(ctxWith(new AbortController().signal));
      expect(view).toBeNull();
    } finally {
      globalThis.fetch = realFetch;
    }
  });
});

// ── settleStaleClaims rides the same seam as the census: a sidecar
// whose stat fails AFTER the read succeeded cannot be aged, so the
// sweep names it "(stat unreadable)" and leaves it active — exactly
// like the census still reads it. Real fs cannot produce this seat
// (a file this user can read always stats); it is the fs-shim /
// network-volume shape the targeted throws above model.
describe("settleStaleClaims — a sidecar that reads but cannot stat is named and left active", () => {
  it("a stat failure after a successful read names the row and settles nothing", () => {
    const runDir = join(seat.outputRoot, "run-stat");
    mkdirSync(runDir, { recursive: true });
    const sidecar = join(runDir, "_flow.json");
    writeFileSync(sidecar, JSON.stringify({ status: "running" }), "utf8");
    seat.throwAt.statSidecar = sidecar;
    try {
      const outcome = settleStaleClaims([seat.stateRoot], (name) => name === "run-stat");
      expect(outcome.settled, "a row that cannot be aged is never rewritten").toEqual([]);
      expect(outcome.skipped).toEqual(["run-stat (stat unreadable)"]);
    } finally {
      seat.throwAt.statSidecar = "";
    }
    expect(readFileSync(sidecar, "utf8")).toContain('"running"');
    expect(activeRuns([seat.stateRoot]), "the census still reads it ACTIVE — fail-closed on both planes").toContain("run-stat");
  });
});
