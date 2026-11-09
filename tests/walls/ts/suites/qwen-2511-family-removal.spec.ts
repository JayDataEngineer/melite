/**
 * QWEN-IMG-EDIT-2511 FAMILY REMOVAL (2026-11-09 — the operator's
 * order: "Just remove 2511 from melite, that model is too old").
 *
 * THE LAW: melite carries ZERO 2511 seats — the family package is
 * deleted, no card boards it, no facts row serves it, no tsconfig
 * path alias resurrects it, no served doc teaches it. The edit
 * image card composes qwen-img-edit-21 (the edit lane) and
 * fibo2-edit (the alternate); a legacy draft naming the dead family
 * refuses at the write door naming the living successors — the
 * tolerance that once let old drafts carry it retired WITH the
 * model (a hidden lane that still composes on explicit naming was
 * the truth-home conflict this removal closes).
 *
 * THE SWEEP (LAW 4 DEPTH — derived rosters over hand lists), each
 * seat its own firing arm:
 *   1. the package plane — packages/models/qwen-img-edit-2511 does
 *      not exist on disk;
 *   2. the TS src plane (packages/**\/src) — zero spellings of the
 *      family id, in any casing/separator form; retirement
 *      narration is NOT tolerated (the operator's word was remove,
 *      not eulogize — prose that names the dead family teaches an
 *      agent to call it);
 *   3. the config plane — every tsconfig under packages/ carries
 *      zero path aliases into the deleted package (an alias whose
 *      target no longer exists is a corpse that reds typecheck on
 *      the next cold clone);
 *   4. the served-docs plane (packages/**\/src/agents/**) — zero
 *      mentions (same law as arm 2, its own arm because a served
 *      doc is the agent's vocabulary, the seat a burn rides first);
 *   5. the facts/registration plane — model-facts.json serves no
 *      family row whose id or routes name it, and the image-edit
 *      card's BOARDED roster names only the living lanes;
 *   6. the control arm (a removal never breaks the living doors):
 *      the image-edit card's declared families all resolve to real
 *      packages and the boarded roster is non-empty.
 *
 * tests/ (package suites and walls) are OUTSIDE every sweep: they
 * may name the dead family to prove a refusal — the retirement
 * arms are the law's firing teeth, and this wall is the law plane.
 *
 * Run: npx vitest run tests/walls/ts/suites/qwen-2511-family-removal.spec.ts
 */
import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE: string = dirname(fileURLToPath(import.meta.url));
const REPO: string = join(HERE, "..", "..", "..", "..");

/** Every spelling the family can hide behind: the kebab package id,
 *  the camel TS import, the bare 2511 suffix on a qwen-edit name,
 *  and the constant-cased decl id. */
const FAMILY_SPELLINGS: RegExp =
  /qwen[-_]img[-_]edit[-_]2511|qwenImgEdit2511|QWEN_IMG_EDIT_2511|qwen-img-edit-2511/i;

/** Every TS/TSX source file under packages/ (no lib, no tests —
 *  package suites carry retirement arms that name the dead family
 *  on purpose, under either dir spelling: `tests/` and melite-tools'
 *  singular `test/`; tests/walls is the law plane). */
function tsSrcFiles(): string[] {
  const out: string[] = [];
  const walk = (dir: string): void => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) {
        if (e.name === "node_modules" || e.name === "lib" || e.name === "tests" || e.name === "test") continue;
        walk(p);
      } else if (/\.(ts|tsx)$/.test(e.name) && !e.name.endsWith(".d.ts")) {
        out.push(p);
      }
    }
  };
  walk(join(REPO, "packages"));
  return out;
}

/** Every tsconfig under packages/ (the path-alias seats). */
function tsconfigFiles(): string[] {
  const out: string[] = [];
  const walk = (dir: string): void => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) {
        if (e.name === "node_modules" || e.name === "lib") continue;
        walk(p);
      } else if (e.name.startsWith("tsconfig") && e.name.endsWith(".json")) {
        out.push(p);
      }
    }
  };
  walk(join(REPO, "packages"));
  return out;
}

describe("the qwen-img-edit-2511 family removal (operator 2026-11-09)", () => {
  it("ARM 1 — the package plane: the family package does not exist", () => {
    expect(
      existsSync(join(REPO, "packages", "models", "qwen-img-edit-2511")),
      "packages/models/qwen-img-edit-2511 must not exist — the family was removed, not hidden",
    ).toBe(false);
  });

  it("ARM 2 — the TS src plane: zero spellings (retirement narration included)", () => {
    const offenders: string[] = [];
    for (const f of tsSrcFiles()) {
      if (FAMILY_SPELLINGS.test(readFileSync(f, "utf8"))) offenders.push(f);
    }
    expect(
      offenders,
      `src files still spelling the dead family (prose counts: narration teaches agents to call it)`,
    ).toEqual([]);
  });

  it("ARM 3 — the config plane: zero tsconfig path aliases into the dead package", () => {
    const offenders: string[] = [];
    for (const f of tsconfigFiles()) {
      if (FAMILY_SPELLINGS.test(readFileSync(f, "utf8"))) offenders.push(f);
    }
    expect(offenders, `tsconfigs still aliasing the dead package (a corpse that reds cold clones)`).toEqual([]);
  });

  it("ARM 4 — the served-docs plane: zero mentions in agents trees", () => {
    const offenders = servedDocs().filter((f) => FAMILY_SPELLINGS.test(readFileSync(f, "utf8")));
    expect(offenders, "served agent docs still teach the dead family").toEqual([]);
  });

  it("ARM 5 — the facts/registration plane: no family row served", () => {
    const factsPath = join(REPO, "packages", "engines", "comfyui-cordis", "data", "model-facts.json");
    const facts: unknown = JSON.parse(readFileSync(factsPath, "utf8"));
    expect(FAMILY_SPELLINGS.test(JSON.stringify(facts)), "model-facts.json still serves the dead family").toBe(false);
  });

  it("ARM 6 — the control (the real door, never a source regex): the card's boarded families are the living set on real packages", async () => {
    const card = await import(join(REPO, "packages", "image", "image-edit", "src", "card.ts"));
    const boarded: readonly string[] = card.BOARDED;
    expect(Array.isArray(boarded), "BOARDED serves as a roster array").toBe(true);
    expect(boarded.length, "the boarded roster is non-empty — a removal never empties the card").toBeGreaterThan(0);
    for (const id of boarded) {
      expect(FAMILY_SPELLINGS.test(id), `boarded family ${id} is the dead family`).toBe(false);
      expect(
        existsSync(join(REPO, "packages", "models", id)),
        `boarded family ${id} resolves to no package — a dead door`,
      ).toBe(true);
    }
  });
});

/** The served-docs plane: every file under packages/**\/src/agents. */
function servedDocs(): string[] {
  const out: string[] = [];
  const walk = (dir: string): void => {
    let entries: ReturnType<typeof readdirSync>;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const p = join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else out.push(p);
    }
  };
  walk(join(REPO, "packages"));
  return out.filter((f) => f.split(/[\\/]/).includes("agents"));
}
