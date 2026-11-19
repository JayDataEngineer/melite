// ci-parity.spec.ts — THE CI-PARITY WALL (the operator's 1:1 burn,
// 2026-11-19: "despite our 1:1 with github pipeline testing, the
// github testing flow ALWAYS FAIL"). The pre-push sentry was sold
// as running what GitHub runs; nobody ever diffed the two job
// lists, and the Secrets Scan workflow (gitleaks) had NO local
// counterpart while every push after the wave shipped the finding
// class CI caught and nothing local did. The battery's 2026-11-14
// parity wave cured knip/coverage/e2e/browser — as a COMMENT inside
// hook-full-battery.mjs ("the hook's set IS CI's set"), an
// assertion with no judge, and it went stale the day a workflow
// grew a job it did not cover. This wall is that judge: it parses
// the workflow files LIVE (never a frozen job list), takes every
// job in a push/pull_request-scoped workflow, and refuses unless
// each one maps to a parity row whose local seat is WIRED — an
// evidence literal in the seat's real file (a code shape like
// `await tier("knip"`, never a word a comment could keep alive) —
// or carries a ci_only row that names the lane that owns it. A new
// CI job without a row reds here; a deleted sentry job or battery
// tier reds here; a row for a job that no longer exists reds here.
import { describe, expect, it } from "vitest";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";

const ROOT = join(import.meta.dirname, "..", "..", "..", "..");
const WF_DIR = join(ROOT, ".github", "workflows");

/**
 * The parity table. Key: `<workflow-file>:<job-id>`.
 * - `seat` names the local seat (battery tier or lefthook job) and
 *   every divergence in plain words — a seat that judges LESS than
 *   its CI job says so here (the coverage delta-ratchet row is the
 *   standing example).
 * - `evidence` is a set of literals; EVERY entry must hold on the
 *   tree (file exists AND contains the literal) or the row reds.
 *   Literals are code shapes, not prose: a comment mentioning knip
 *   can never keep a deleted `tier("knip"` alive.
 * - `ci_only` names the lane that owns the job locally-absent work
 *   and why; a ci_only row without a reason reds (an escape hatch
 *   that explains nothing is how the 1:1 rotted the first time).
 */
const PARITY: Record<string, {
  seat?: string;
  evidence?: Array<{ file: string; contains: string }>;
  ci_only?: string;
}> = {
  "tests.yml:unit": {
    seat: "battery walls tier (vitest run, all projects — the same fleet CI's ubuntu leg runs as `pnpm run test`) + the tsc tier + the lib-sync drift arm. The macos/windows legs ride CI only: no local hardware exists, and the portability class is owned locally by the skipIf seats (OS-gated arms) instead.",
    evidence: [
      { file: "tools/hook-full-battery.mjs", contains: 'await tier("walls"' },
      { file: "tools/hook-full-battery.mjs", contains: 'await tier("tsc"' },
      { file: "tools/hook-full-battery.mjs", contains: "**/lib/**" },
    ],
  },
  "tests.yml:typecheck": {
    seat: "the same wall spec CI runs (typecheck-gate.spec.ts), executed inside the battery's walls tier, plus the battery's own tsc-per-package tier.",
    evidence: [
      { file: "tools/hook-full-battery.mjs", contains: 'await tier("tsc"' },
      { file: "tests/walls/ts/suites/typecheck-gate.spec.ts", contains: "the test tier typechecks clean" },
    ],
  },
  "tests.yml:arch-lint": {
    seat: "the lefthook arch-lint job fires the same tool on every push.",
    evidence: [{ file: "lefthook.yml", contains: "tools/arch-lint.ts" }],
  },
  "tests.yml:knip": {
    seat: "the battery's knip tier (tools/knip-budget.mjs).",
    evidence: [{ file: "tools/hook-full-battery.mjs", contains: 'await tier("knip"' }],
  },
  "tests.yml:pytest": {
    seat: "the battery's pytest tier (`python3 -m pytest tests/ -q`). Divergence: this box carries torch, so the torch-gated arm runs LOCALLY and self-skips in CI — the local seat judges a superset.",
    evidence: [{ file: "tools/hook-full-battery.mjs", contains: 'await tier("pytest"' }],
  },
  "tests.yml:coverage": {
    seat: "the battery's coverage tier (tools/coverage-ratchet.mjs) runs the full CI coverage suite INSIDE the ratchet. DIVERGENCE, stated: CI judges the raw per-file floors; the local ratchet judges the DELTA (growth reds, shrink moves the row) because the estate carries roadmapped per-file debt that made the raw gate deadlock every push. When the debt hits zero the ratchet becomes the raw gate.",
    evidence: [{ file: "tools/hook-full-battery.mjs", contains: 'await tier("coverage"' }],
  },
  "tests.yml:tiers": {
    seat: "battery tiers: e2e (pnpm run test:e2e, VRAM-admission seat), expected, bench, snapshot, web (the four vitest.*.config.ts runs) and browser (test:web:browser, skip-loud where playwright is absent). The studio step (E2E_STUDIO_REQUIRE=1) is NOT covered locally: it installs a GLOBAL dsh runtime and playwright chromium from the network — the release lane's cold-runner conditions; locally it is opt-in via `pnpm run test:e2e:studio`.",
    evidence: [
      { file: "tools/hook-full-battery.mjs", contains: 'await tier("e2e"' },
      { file: "tools/hook-full-battery.mjs", contains: "vitest.expected.config.ts" },
      { file: "tools/hook-full-battery.mjs", contains: "vitest.bench.config.ts" },
      { file: "tools/hook-full-battery.mjs", contains: "vitest.snapshot.config.ts" },
      { file: "tools/hook-full-battery.mjs", contains: "vitest.web.config.ts" },
      { file: "tools/hook-full-battery.mjs", contains: 'await tier("browser"' },
      // The browser tier's PREREQUISITE is part of the parity: CI
      // installs playwright browsers as its own step on every runner;
      // the local seat must too. The 2026-11-19 push-kill: the rc.5
      // playwright bump moved the expected chromium build, the box
      // cache was stale, and every journey died at 0ms while a
      // `playwright --version` probe stayed green — a CLI probe can
      // never certify an executable.
      { file: "tools/hook-full-battery.mjs", contains: '"playwright", "install", "chromium"' },
    ],
  },
  "tests.yml:cold-start-proof": {
    ci_only: "the container face seats a naked node container against the PUBLIC remote tag (the release lane's consumer truth — docker + a published tag; tools/cold-start-proof.mjs runs locally on demand with --container-only).",
  },
  "secrets-scan.yml:gitleaks": {
    seat: "the lefthook gitleaks job: same binary, same .gitleaks.toml, same push-range shape as gitleaks-action's push event. FAIL-LOUD when the binary is absent — a skip here is the exact gap that burned the operator.",
    evidence: [
      { file: "lefthook.yml", contains: "gitleaks (secrets scan parity)" },
      { file: "lefthook.yml", contains: "detect --redact --exit-code=2 --config .gitleaks.toml" },
    ],
  },
  "docs.yml:build": {
    seat: "the lefthook docs job (DOCS_REPO_SLUG set to the repo slug, the env CI gets from GITHUB_REPOSITORY).",
    evidence: [
      { file: "lefthook.yml", contains: "docs (vitepress build parity)" },
      { file: "lefthook.yml", contains: "docs:build" },
    ],
  },
  "docs.yml:deploy": {
    ci_only: "Pages deployment consumes the uploaded artifact inside the Pages environment — a deploy step has no local seat by construction.",
  },
};

/** Trigger names a workflow fires on, across YAML shapes: a bare
 *  string (`on: push`), a list, or a mapping with config bodies. */
function triggersOf(doc: Record<string, unknown>): string[] {
  const on = (doc.on ?? doc.true ?? doc.True) as unknown;
  if (typeof on === "string") return [on];
  if (Array.isArray(on)) return on.map(String);
  if (on && typeof on === "object") return Object.keys(on as Record<string, unknown>);
  return [];
}

/** Every workflow file with its parsed document. A workflow that
 *  fails YAML parsing fails the walk loudly — a silently skipped
 *  workflow is a silently unjudged job set. */
function workflows(): Array<{ file: string; doc: Record<string, unknown> }> {
  const out: Array<{ file: string; doc: Record<string, unknown> }> = [];
  for (const file of readdirSync(WF_DIR).filter((f) => f.endsWith(".yml"))) {
    const doc = parseYaml(readFileSync(join(WF_DIR, file), "utf8")) as Record<string, unknown>;
    if (!doc || typeof doc !== "object" || typeof doc.jobs !== "object" || doc.jobs === null) {
      throw new Error(`ci-parity: ${file} parsed without a jobs map — the walk refuses to judge a workflow it cannot read`);
    }
    out.push({ file, doc });
  }
  return out;
}

/** Jobs of every workflow that fires on push or pull_request — the
 *  parity scope. Event-driven lanes (workflow_dispatch, schedule,
 *  workflow_run) sit outside it: they fire on release and publish
 *  events, never on a plain push, so no push gate can mirror them. */
function scopedJobs(): Map<string, string> {
  const jobs = new Map<string, string>();
  for (const { file, doc } of workflows()) {
    const trig = triggersOf(doc);
    if (!trig.includes("push") && !trig.includes("pull_request")) continue;
    for (const id of Object.keys(doc.jobs as Record<string, unknown>)) {
      jobs.set(`${file}:${id}`, file);
    }
  }
  return jobs;
}

describe("THE CI-PARITY WALL — every push-gated CI job has a wired local seat or a named ci_only lane", () => {
  it("the parse is live, not vacuous: the three push-gated workflows and their known anchors are all present", () => {
    const jobs = scopedJobs();
    // If this arm reds, the workflow files moved or the YAML shapes
    // changed — every other arm's green would be vacuous.
    for (const anchor of ["tests.yml:unit", "tests.yml:typecheck", "tests.yml:arch-lint", "tests.yml:knip", "tests.yml:pytest", "tests.yml:coverage", "tests.yml:tiers", "tests.yml:cold-start-proof", "secrets-scan.yml:gitleaks", "docs.yml:build", "docs.yml:deploy"]) {
      expect(jobs.has(anchor), `${anchor} not found in the parsed push-gated job set — the workflow tree drifted`).toBe(true);
    }
    expect(jobs.size).toBeGreaterThanOrEqual(11);
  });

  it("NO SILENT GAPS: every push-gated CI job has a parity row (a new CI job reds until it is seated)", () => {
    const jobs = scopedJobs();
    const missing = [...jobs.keys()].filter((k) => !(k in PARITY));
    expect(missing, `push-gated CI jobs with no parity row — seat them in this wall's PARITY table or name their ci_only lane:\n  ${missing.join("\n  ")}`).toEqual([]);
  });

  it("NO DEAD ROWS: every parity row names a job that exists in a push-gated workflow (rows cannot outlive their jobs)", () => {
    const jobs = scopedJobs();
    const dead = Object.keys(PARITY).filter((k) => !jobs.has(k));
    expect(dead, `parity rows for jobs that no longer exist — delete the row:\n  ${dead.join("\n  ")}`).toEqual([]);
  });

  it("THE WIRING: every seat row's evidence literals hold on the tree (a deleted sentry job or battery tier reds here even if a comment survives)", () => {
    for (const [key, row] of Object.entries(PARITY)) {
      if (!row.evidence) continue;
      for (const ev of row.evidence) {
        const path = join(ROOT, ev.file);
        expect(existsSync(path), `${key}: evidence file ${ev.file} is gone`).toBe(true);
        const text = readFileSync(path, "utf8");
        expect(text.includes(ev.contains), `${key}: evidence literal ${JSON.stringify(ev.contains)} not found in ${ev.file} — the local seat is unwired`).toBe(true);
      }
    }
  });

  it("ci_only rows explain their lane (an unexplained exemption is how the 1:1 rotted)", () => {
    for (const [key, row] of Object.entries(PARITY)) {
      if (!("ci_only" in row) || row.ci_only === undefined) continue;
      expect(row.ci_only.length, `${key}: ci_only reason is too thin to be honest`).toBeGreaterThanOrEqual(40);
      expect(row.evidence, `${key}: a ci_only row carries no wiring evidence — pick one lane`).toBeUndefined();
    }
  });
});
