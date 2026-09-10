// transport-rot.test.ts — THE ANTI-ROT GATE (the degeneration the
// estate collapse found, made structurally impossible to recommit).
//
// The rot this suite forbids, with receipts: every card package once
// carried a hand-copied HTTP client block (`MELITE_GATEWAY_URL ||
// 'http://localhost:33081'`); the ledger graded the tier "aligned"
// while the entire structure was an HTTP-gateway connector to a
// second Loader that no longer exists. The transport law since R2b:
//   - DSH is the ONLY app. Same-origin relative /v1 fetches from
//     BROWSER faces are lawful (the estate doors mount on the host's
//     own webServer — E1's design); everything else calls the
//     in-process lanes or the Typert remotes.
//   - NO origin pins: :33081 (the retired second Loader) and the
//     MELITE_GATEWAY* env names may not appear in code.
//   - NO absolute-URL /v1 fetch: `fetch('http…/v1…')` and template
//     origins address a foreign server — the lanes own transport.
//
// Exemptions, both load-bearing:
//   - dead-marked history (provenance comments): a line that ALSO
//     says retired/deleted/RIP/second-Loader/was teaches history,
//     not authority (law-hygiene's own exemption, 1:1).
//   - this suite + docs/ + tests/ are out of scope (the gate may
//     name the forbidden tokens; the walls' GATEWAY_PORT refusal
//     names :33081 to REFUSE it).
//
// Plus the LEDGER-SYNC check (silence is a lie): every package under
// packages/ MUST appear by name in docs/CONFORMANCE_LEDGER.md — a
// package without a ledger row fails the gate, so unaudited code
// cannot hide behind an absent row again.
//
// Run: node --experimental-strip-types --test tests/walls/ts/suites/transport-rot.test.ts
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { REPO_ROOT } from "../helpers/boot.ts";
import { stripComments } from "../helpers/scan.ts";

const SCAN_ROOTS: readonly string[] = ["packages", "apps"];

function tsFiles(): string[] {
  const out: string[] = [];
  const walk = (dir: string): void => {
    for (const name of readdirSync(dir)) {
      if (name === "node_modules" || name.startsWith(".")) continue;
      // Production trees only: e2e/tests fixtures are out of scope
      // (law-hygiene precedent). Dead e2e specs against the retired
      // backend rot in place until their rewrite — tracked in the
      // ledger, not gated here.
      if (name === "e2e" || name === "tests" || name === "__tests__" || name === "test") continue;
      const p: string = join(dir, name);
      const st: unknown = statSync(p);
      if ((st as { isDirectory(): boolean }).isDirectory()) walk(p);
      else if ((st as { isFile(): boolean }).isFile() && (name.endsWith(".ts") || name.endsWith(".tsx"))) out.push(p);
    }
  };
  for (const root of SCAN_ROOTS) {
    const rp: string = join(REPO_ROOT, root);
    if (existsSync(rp)) walk(rp);
  }
  return out.sort();
}

/** Provenance exemption: the line dead-marks the token it names. */
function deadMarked(line: string): boolean {
  return /retired|deleted|was |RIP|second-Loader|purged|died with/i.test(line);
}

/** Forbidden code tokens (comments stripped before matching). */
const FORBIDDEN: readonly { re: RegExp; label: string }[] = [
  { re: /:33081\b/, label: "the retired second-Loader port" },
  { re: /\bMELITE_GATEWAY(?:_URL)?\b/, label: "the retired gateway env pin" },
  { re: /DEFAULT_GATEWAY_URL\s*=/, label: "a gateway URL default (URLs are config, never code)" },
];

describe("transport-rot — the anti-degeneration gate", () => {
  it("no source pins the retired transport (code, comments stripped)", () => {
    const offenders: string[] = [];
    for (const file of tsFiles()) {
      const code: string = stripComments(readFileSync(file, "utf8"));
      const lines: string[] = code.split("\n");
      lines.forEach((line: string, i: number): void => {
        for (const { re, label } of FORBIDDEN) {
          if (re.test(line)) offenders.push(`${file}:${i + 1} ${label}: ${line.trim().slice(0, 90)}`);
        }
      });
    }
    assert.deepEqual(offenders, [], `transport rot found (${offenders.length} sites):\n${offenders.join("\n")}`);
  });

  it("no absolute-URL /v1 fetch — the lanes own transport", () => {
    const offenders: string[] = [];
    const re: RegExp = /fetch\(\s*[`'"]https?:\/\/[^`'"]*\/v1/;
    for (const file of tsFiles()) {
      const code: string = stripComments(readFileSync(file, "utf8"));
      const lines: string[] = code.split("\n");
      lines.forEach((line: string, i: number): void => {
        if (re.test(line)) offenders.push(`${file}:${i + 1}: ${line.trim().slice(0, 90)}`);
      });
    }
    assert.deepEqual(offenders, [], `foreign /v1 origins found:\n${offenders.join("\n")}`);
  });

  it("dead-marked history is allowed (provenance, not authority)", () => {
    // The exemption is tested by construction: the census above runs
    // on comment-stripped code, so a provenance comment naming :33081
    // never reaches it. This test pins the contract: a live default
    // fails, a dead-marked comment passes.
    assert.equal(deadMarked("// the :33081 second Loader is retired"), true);
    assert.equal(deadMarked("const GATEWAY = 'http://localhost:33081'"), false);
  });

  it("ledger-sync: every package has a CONFORMANCE_LEDGER row (silence is a lie)", () => {
    const ledger: string = readFileSync(join(REPO_ROOT, "docs/CONFORMANCE_LEDGER.md"), "utf8");
    const missing: string[] = [];
    for (const genre of readdirSync(join(REPO_ROOT, "packages"))) {
      const gp: string = join(REPO_ROOT, "packages", genre);
      if (!statSync(gp).isDirectory()) continue;
      for (const name of readdirSync(gp)) {
        const pj: string = join(gp, name, "package.json");
        if (!existsSync(pj)) continue;
        const pkgName: string = (JSON.parse(readFileSync(pj, "utf8")) as { name?: string }).name ?? "";
        if (pkgName === "" || pkgName === undefined) continue;
        if (!ledger.includes(`| ${pkgName} `) && !ledger.includes(`| ${pkgName}|`) && !ledger.includes(pkgName)) {
          missing.push(pkgName);
        }
      }
    }
    assert.deepEqual(missing, [], `packages with NO ledger row (silence is a lie):\n${missing.join("\n")}`);
  });
});
