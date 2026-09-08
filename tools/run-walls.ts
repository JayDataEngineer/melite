#!/usr/bin/env node --experimental-strip-types
// run-walls — the per-suite isolation runner (TS port of
// tools/run_walls.py, deleted at the NO-ESTATE-PYTHON cut,
// 2026-09-08).
//
// WHY THIS EXISTS (the incident): one pytest process over
// tests/walls/suites/ cross-pollutes — suites share a live estate
// (gateway ports, data/runs/, GPU claims) and a suite dying mid-run
// leaves its litter for the NEXT suite to trip over. Never again:
// ISOLATION IS THE CONTRACT (one pytest process per suite, fresh
// interpreter, no shared fixtures, no shared CWD state).
//
// Usage:
//   node --experimental-strip-types tools/run-walls.ts
//   node --experimental-strip-types tools/run-walls.ts --suite fit_card
//   node --experimental-strip-types tools/run-walls.ts --mark gpu
//   node --experimental-strip-types tools/run-walls.ts --timeout 570
//   node --experimental-strip-types tools/run-walls.ts --list
//
// Exit code: 0 iff every suite exited 0. The per-suite ritual
// (pytest <suite> -p no:randomly -q --no-header) is the same one
// the estate's verification commands have used since the wall era
// began; this tool makes it impossible to "just run the directory".
//
// The interpreter is RUN_WALLS_PY (default "python3") — the old
// tool used its own sys.executable; here the driver is node, so the
// suite interpreter is deployment config, never guessed twice.
//
// Erasable-syntax TS only: no enums, no namespaces.

import { spawnSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE: string = dirname(fileURLToPath(import.meta.url));
const REPO: string = resolve(HERE, "..");
const SUITE_DIR: string = join(REPO, "tests", "walls", "suites");
const CONFTEST: string = join(REPO, "tests", "walls", "conftest.py");
const PY: string = (process.env.RUN_WALLS_PY ?? "").trim() || "python3";

function scriptStyleSuites(): Set<string> {
  // The conftest's collect_ignore_glob is THE collection authority:
  // suites listed there execute at import (module-level sys.exit —
  // their check()/exit-code/stdout discipline IS the contract).
  // Running those under pytest is a category error (INTERNALERROR
  // on the exit); they run as plain `<py> <suite>` and the exit
  // code is the verdict. Parsed as text — never executed.
  const text = readFileSync(CONFTEST, "utf8");
  const m = /collect_ignore_glob\s*=\s*\[([\s\S]*?)\]/.exec(text);
  if (!m) {
    console.error("cannot read collect_ignore_glob from " + CONFTEST);
    process.exit(2);
  }
  const out = new Set<string>();
  for (const q of m[1].matchAll(/["']([^"']+)["']/g)) {
    out.add("tests/walls/" + q[1]);
  }
  return out;
}

function suites(filterSub: string): string[] {
  const rows = readdirSync(SUITE_DIR)
    .filter((f) => f.startsWith("test_") && f.endsWith(".py") &&
      f !== "__init__.py")
    .sort()
    .map((f) => join(SUITE_DIR, f));
  if (filterSub) return rows.filter((p) => p.includes(filterSub));
  return rows;
}

function main(): number {
  const argv = process.argv.slice(2);
  let filterSub = "";
  let mark = "";
  let timeout = 570;
  let list = false;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--suite") filterSub = argv[++i] ?? "";
    else if (argv[i] === "--mark") mark = argv[++i] ?? "";
    else if (argv[i] === "--timeout") timeout = parseInt(argv[++i] ?? "", 10);
    else if (argv[i] === "--list") list = true;
    else {
      console.error("unknown arg " + JSON.stringify(argv[i]));
      return 2;
    }
  }

  const rows = suites(filterSub);
  if (rows.length === 0) {
    console.log("no suites match " + JSON.stringify(filterSub) +
      " under " + SUITE_DIR);
    return 2;
  }
  if (list) {
    for (const p of rows) {
      console.log(p.slice(p.lastIndexOf("/") + 1, -3));
    }
    return 0;
  }

  const red: Array<[string, number]> = [];
  const gated: string[] = [];
  const scriptStyle = scriptStyleSuites();
  const t0 = Date.now();
  rows.forEach((path, idx) => {
    const stem = path.slice(path.lastIndexOf("/") + 1, -3);
    const rel = "tests/walls/suites/" + stem + ".py";
    const isScript = scriptStyle.has(rel);
    const cmd = isScript
      ? [PY, path]
      : [PY, "-m", "pytest", path, "-p", "no:randomly", "-q", "--no-header"];
    if (mark && !isScript) cmd.push("-m", mark);
    const t1 = Date.now();
    let rc: number;
    try {
      const r = spawnSync(cmd[0], cmd.slice(1),
        { cwd: REPO, timeout: timeout * 1000, stdio: "ignore" });
      rc = r.status ?? (r.error ? 124 : 0);
    } catch {
      rc = 124;
    }
    const dt = (Date.now() - t1) / 1000;
    // pytest rc=5 (no tests collected): a marker-gated suite run
    // without its mark — a gate, not a failure
    let flag: string;
    if (rc === 5 && !mark && !isScript) {
      gated.push(stem);
      flag = "gate";
    } else {
      flag = rc === 0 ? "ok " : "RED ";
    }
    const n = String(idx + 1).padStart(2) + "/" + String(rows.length).padStart(2);
    console.log("[" + n + "] " + flag + " " + stem.padEnd(42) +
      " rc=" + String(rc).padEnd(3) + " " + dt.toFixed(1) + "s" +
      (isScript ? "  (script-style)" : ""));
    if (rc !== 0 && flag !== "gate") red.push([stem, rc]);
  });

  const total = ((Date.now() - t0) / 1000).toFixed(0);
  console.log("--- " + rows.length + " suites, " + red.length + " red, " +
    gated.length + " gated, " + total + "s total");
  for (const stem of gated) {
    console.log("gate " + stem.padEnd(42) +
      " 0 collected without --mark (marker-gated by design)");
  }
  for (const [stem, rc] of red) {
    console.log("RED " + stem.padEnd(42) + " rc=" + rc);
  }
  return red.length > 0 ? 1 : 0;
}

process.exit(main());
