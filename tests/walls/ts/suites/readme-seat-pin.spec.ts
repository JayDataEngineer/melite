/**
 * THE SEAT-PIN WALL — the consumer install door names a real, minted
 * seat (the README drift burn: the seat law sentence went false the
 * day a tag was cut without its mint, three bare tags accumulated, and
 * ZERO tests judged the README).
 *
 * THE LAW: the README and the install guide pin ONE seat tag, and the
 * seat is the newest tag whose mint completed — release assets exist
 * on the tag's GitHub release. A bare tag is not an install door. The
 * in-tree ledger of tags cut without mints is `tools/seat-census.json`
 * (the operator's release decisions; no offline test can see GitHub,
 * so the census IS the recorded truth and this wall judges it for
 * coherence against the derived tag roster).
 *
 * ARMS (each fires on its own path):
 *   1. MIRROR — every seat line in README.md and docs/guide/install.md
 *      names census.seat (README exactly two, install exactly one).
 *   2. SEAT REALITY — the seat is a real tag and its tree carries a
 *      root manifest package name (the pnpm github-ref refusal guard).
 *   3. STALE TRIPWIRE — every tag NEWER than the seat whose tree
 *      carries a root package name is recorded in the census as
 *      excluded, or the wall reds naming the unrecorded tag: cutting a
 *      tag without recording its mint state is the burn this wall
 *      exists for.
 *   4. CENSUS COHERENCE — excluded keys are real tags, none is the
 *      seat, every exclusion carries a non-empty reason.
 *   5. LAW SENTENCE — both documents state the true selection law
 *      (minted assets, bare tags are not doors, the census ledger).
 *   6. NETWORK TRUTH (CI) — with GITHUB_TOKEN, the seat's release
 *      really carries assets and every excluded tag really 404s the
 *      tags endpoint; the census may not lie about GitHub. Skips loud
 *      where no token seats the probe.
 *
 * Run: npx vitest run tests/walls/ts/suites/readme-seat-pin.spec.ts
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");
const read = (p: string) => readFileSync(resolve(ROOT, p), "utf8");

const census = JSON.parse(read("tools/seat-census.json")) as {
  seat: string;
  excluded: Record<string, string>;
};

const SEAT_RE = /dsh plugin --profile melite add "github:JayDataEngineer\/melite#([^"]+)"/g;

function seatRefs(doc: string): string[] {
  return [...doc.matchAll(SEAT_RE)].map((m) => m[1]!);
}

function tagList(): string[] {
  return execFileSync("git", ["tag", "-l"], { cwd: ROOT, encoding: "utf8" })
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Root-manifest package name at a tag, or null (tag absent or nameless). */
function rootNameAt(tag: string): string | null {
  try {
    const txt = execFileSync("git", ["show", `${tag}:package.json`], {
      cwd: ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    const name = (JSON.parse(txt) as { name?: unknown }).name;
    return typeof name === "string" && name.length > 0 ? name : null;
  } catch {
    return null;
  }
}

/** Semver precedence compare (prerelease < release; rc/alpha compared identifier-wise). */
function cmpTag(a: string, b: string): number {
  const parse = (t: string) => {
    const m = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/.exec(t);
    if (!m) return null;
    return { core: [+m[1]!, +m[2]!, +m[3]!], pre: m[4] ?? null };
  };
  const pa = parse(a);
  const pb = parse(b);
  if (!pa || !pb) return a.localeCompare(b);
  for (let i = 0; i < 3; i++) {
    if (pa.core[i]! < pb.core[i]!) return -1;
    if (pa.core[i]! > pb.core[i]!) return 1;
  }
  if (pa.pre === null && pb.pre === null) return 0;
  if (pa.pre === null) return 1;
  if (pb.pre === null) return -1;
  const ia = pa.pre.split(".");
  const ib = pb.pre.split(".");
  for (let i = 0; i < Math.max(ia.length, ib.length); i++) {
    const xa = ia[i];
    const xb = ib[i];
    if (xa === undefined) return -1;
    if (xb === undefined) return 1;
    const na = /^\d+$/.test(xa) ? Number(xa) : null;
    const nb = /^\d+$/.test(xb) ? Number(xb) : null;
    if (na !== null && nb !== null) {
      if (na < nb) return -1;
      if (na > nb) return 1;
    } else {
      const c = xa.localeCompare(xb);
      if (c !== 0) return c;
    }
  }
  return 0;
}

describe("the seat pin (README + install guide + census)", () => {
  it("ARM 1 — every seat line names census.seat (README exactly two, install exactly one)", () => {
    const readme = seatRefs(read("README.md"));
    const install = seatRefs(read("docs/guide/install.md"));
    expect(readme, "README must carry exactly the two seat lines (install + quick start)").toHaveLength(2);
    expect(install, "docs/guide/install.md must carry exactly one seat line").toHaveLength(1);
    for (const ref of [...readme, ...install]) {
      expect(ref, "a seat line drifted from tools/seat-census.json").toBe(census.seat);
    }
  });

  it("ARM 2 — the seat is a real tag whose tree carries a root manifest package name", () => {
    const tags = tagList();
    expect(tags, `census names seat ${census.seat} which is not a tag`).toContain(census.seat);
    expect(rootNameAt(census.seat), "the seat's root manifest carries no package name — pnpm refuses the github ref").not.toBeNull();
  });

  it("ARM 3 — THE STALE TRIPWIRE: every newer root-named tag is census-recorded", () => {
    const unrecorded = tagList().filter((t) => {
      if (!/^v\d/.test(t)) return false;
      if (cmpTag(t, census.seat) <= 0) return false;
      // Only tags that COULD seat (root manifest carries a package name)
      // owe a census row; a nameless tree cannot be the install door.
      return rootNameAt(t) !== null && !(t in census.excluded);
    });
    expect(
      unrecorded,
      "tags cut without a recorded mint decision — record each in tools/seat-census.json (or mint it and move the seat in the same change)",
    ).toEqual([]);
  });

  it("ARM 4 — census coherence: real tags, none is the seat, every exclusion reasoned", () => {
    const tags = new Set(tagList());
    for (const key of Object.keys(census.excluded)) {
      expect(tags.has(key), `census excludes ${key} which is not a tag`).toBe(true);
      expect(key === census.seat, "the seat cannot be its own exclusion").toBe(false);
      expect(
        typeof census.excluded[key] === "string" && census.excluded[key]!.length > 0,
        `exclusion ${key} carries no reason`,
      ).toBe(true);
    }
  });

  it("ARM 5 — the law sentence: minted assets, bare tags are not doors, the census ledger", () => {
    // Wrap-tolerant phrase pins: prose reflow must not red the wall —
    // content must. Whitespace normalizes to single spaces both sides.
    const norm = (s: string) => s.replace(/\s+/g, " ");
    for (const doc of ["README.md", "docs/guide/install.md"]) {
      const text = norm(read(doc));
      expect(text, `${doc} must state the minted-assets selection law`).toContain("names the newest tag with minted release assets");
      expect(text, `${doc} must state a bare tag is not an install door`).toContain("a bare tag is not an install door");
      expect(text, `${doc} must point at the census ledger`).toContain("tools/seat-census.json");
    }
  });

  it("ARM 6 — NETWORK TRUTH (CI): the census may not lie about GitHub", { timeout: 60_000 }, async () => {
    const token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
    if (!token) {
      console.warn("[seat-pin] no GITHUB_TOKEN — skipping the network arm (CI owns this judgment)");
      return;
    }
    const api = async (tag: string) =>
      await fetch(`https://api.github.com/repos/JayDataEngineer/melite/releases/tags/${tag}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
      });
    const seatRes = await api(census.seat);
    expect(seatRes.status, `the seat ${census.seat} must have a GitHub release`).toBe(200);
    const seatJson = (await seatRes.json()) as { assets?: unknown[] };
    expect(Array.isArray(seatJson.assets) && seatJson.assets.length > 0, `the seat ${census.seat} release carries no assets`).toBe(true);
    for (const key of Object.keys(census.excluded)) {
      const res = await api(key);
      expect(res.status, `census excludes ${key} but its release exists — mint it and move the seat, or drop the row`).toBe(404);
    }
  });
});
