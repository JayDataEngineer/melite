// THE READDIR→LSTAT RACE ARM (the coverage-honesty pass, 2026-11-17):
// FileOperationStore.list() walks readdir(root) then pathKind(path) —
// a row deleted by another seat INSIDE that window lstats ENOENT and
// must skip silently, never error the whole list. Faces A–D covered
// that continue only by scheduler luck (one arm flipped between face
// pairs); this arm pins it deterministically: readdir answers a ghost
// name no file backs, lstat answers 'missing', list() answers [].
// The mock is the narrowest honest seam — node:fs/promises.readdir is
// wrapped to APPEND the ghost to the real directory's names; every
// other export (lstat, readFile, mkdir, rename, unlink) stays real,
// so the skip is judged on the store's own walk, not a stubbed one.
import { describe, expect, test, vi } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const ghostReaddir = vi.hoisted(() => vi.fn());
vi.mock("node:fs/promises", async (importOriginal) => {
  const real = await importOriginal<typeof import("node:fs/promises")>();
  return {
    ...real,
    readdir: ghostReaddir.mockImplementation(async (path: string) => {
      const names = await real.readdir(path);
      // the ghost: a name readdir saw whose file is gone by lstat
      return [...(names as string[]), "ghost-op.json"];
    }),
  };
});

describe("FileOperationStore.list — the readdir→lstat race (2026-11-17)", () => {
  test("a row deleted between readdir and lstat is skipped, never an error", async () => {
    const { FileOperationStore } = await import("../src/operation-store.ts");
    const root = mkdtempSync(join(tmpdir(), "provisioning-toctou-"));
    try {
      const store = new FileOperationStore(root);
      // the directory is EMPTY: the only name the walk sees is the
      // ghost the seam injects — lstat answers ENOENT ('missing'),
      // the continue runs, and the list answers empty, not a throw
      const rows = await store.list();
      expect(rows).toEqual([]);
      expect(ghostReaddir).toHaveBeenCalled();
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
