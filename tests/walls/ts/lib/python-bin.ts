// python-bin.ts — the vendored-layer AST probes need a python
// interpreter, and the interpreter's NAME is platform-dependent
// (class B R6 / class E E2, 2026-10-31: the probes spawned `python3`
// bare — on windows that name either misses or resolves to the
// Microsoft Store ALIAS, a stub that exits 9009 with a stderr ad).
// One resolution, every spawn site through it: probe the candidates
// with `--version`, return the first that actually runs, and REFUSE
// LOUD naming every candidate when none does — a probe that never
// ran must never look like a pass.
import { spawnSync } from "node:child_process";

let cached: string | null | undefined;

/** The runnable python interpreter for this host, or a throw naming
 *  every candidate tried (never a silent skip). */
export function pythonBin(spawn: typeof spawnSync = spawnSync): string {
  if (cached !== undefined) return cached;
  const candidates = process.platform === "win32" ? ["python", "python3"] : ["python3", "python"];
  const tried: string[] = [];
  for (const bin of candidates) {
    const r = spawn(bin, ["--version"], { encoding: "utf8", timeout: 15_000 });
    tried.push(`${bin}: ${r.error !== undefined ? String(r.error.message) : `exit ${String(r.status)}`}`);
    if (r.error === undefined && r.status === 0) {
      cached = bin;
      return bin;
    }
  }
  throw new Error(
    `no python interpreter for the vendored-layer probes (tried ${tried.join("; ")}) — ` +
    "install python3 (the Store alias does not count; it is the stub this helper exists to refuse)",
  );
}
