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
 *   3. NO TAG OUTLIVES ITS MINT — no local tag newer than the seat
 *      exists (root-named trees only: a nameless tree cannot be a
 *      door). Cutting a tag before its mint is the burn; the only
 *      green is mint-and-move-the-seat, or delete the tag.
 *   4. CENSUS COHERENCE — excluded keys are real tags, none is the
 *      seat, every exclusion carries a non-empty reason.
 *   5. LAW SENTENCE — both documents state the true selection law
 *      (minted assets, bare tags are not doors, the census ledger).
 *   6. NETWORK TRUTH (CI) — with GITHUB_TOKEN: the seat's release
 *      really carries assets, every excluded tag really 404s the
 *      tags endpoint, and THE SEAT IS THE NEWEST TAG ON THE REMOTE —
 *      a bare newer tag on the remote reds the wall from every clone;
 *      no local-only edit can green it. Skips loud where no token
 *      seats the probe.
 *   7. NO ABSOLUTION — no exclusion row may name a tag NEWER than
 *      the seat: an exclusion covers history (tags the seat
 *      superseded), never the future. A "reason" cannot excuse a
 *      bare tag that outranks the install door — the absolution hole
 *      (2026-11-14: rc.1/rc.2 excused while they were the newest
 *      tags on the remote, wall green) is closed.
 *   8. NOTES ARE THE DOOR'S FACE (CI) — with GITHUB_TOKEN, the seat
 *      release's BODY is consumer-grade: at least two markdown
 *      section headings, an install command, and 400+ characters of
 *      prose. The 2026-11-14 burn: the seat's body was four lines of
 *      internal ticket codes (W-1, F3-05, D3-02) — zero consumer
 *      meaning on the one page every install follows.
 *   9. ROSTER PROVISION (2026-11-19, run 44498457238) — the CI
 *      checkout's push-event fetch carries NO tags refspec
 *      (`fetch-tags: true` widens nothing at depth 1), so the local
 *      roster arms above refused a census the API arms proved true.
 *      tagList() now provisions the roster (one depth-1 tags fetch)
 *      under GITHUB_ACTIONS; this arm reproduces the checkout shape
 *      from a scratch bare repo, no network, and proves the fetch
 *      fills the empty roster.
 *
 * Run: npx vitest run tests/walls/ts/suites/readme-seat-pin.spec.ts
 */
import { describe, it, expect } from "vitest";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
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
  const roster = (): string[] =>
    execFileSync("git", ["tag", "-l"], { cwd: ROOT, encoding: "utf8" })
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
  const tags = roster();
  if (tags.length > 0 && process.env.GITHUB_ACTIONS !== "true") return tags;
  // THE CI CHECKOUT PITFALL (run 44498457238, 2026-11-19): the
  // runner's ACTUAL fetch command on a push event is
  //   git fetch --prune --no-recurse-submodules --depth=1 \
  //     origin +<sha>:refs/remotes/origin/main
  // — `fetch-tags: true` on a shallow push-event checkout carries NO
  // tags refspec (the flag only widens the fetch at fetch-depth 0),
  // so `git tag -l` here is [] and the roster arms below refused a
  // census the API arms had just proven true on the remote. The wall
  // provisions its own roster where that checkout shape seats it.
  //
  // THE PARTIAL-ROSTER BURN (run 44534605455, 2026-11-19, the
  // v0.3.0-alpha release): the same depth-1 tags fetch landed a
  // PARTIAL roster on the runner — ARM 2 green (the seat tag made
  // it), ARM 4 red on an old excluded tag — while the identical
  // fetch fills a scratch repo full (ARM 9's own proof). Roster
  // COMPLETENESS cannot ride shallow-fetch mechanics at all: names
  // are NETWORK TRUTH, and one ls-remote answers every name. The
  // fetch below still runs FIRST, best-effort, because the
  // read-at-tag arms (rootNameAt) need OBJECTS seated locally; the
  // union then guarantees the roster holds every remote name.
  if (process.env.GITHUB_ACTIONS === "true") {
    try {
      execFileSync(
        "git",
        ["fetch", "--depth=1", "--prune", "--no-recurse-submodules", "origin", "+refs/tags/*:refs/tags/*"],
        { cwd: ROOT, encoding: "utf8" },
      );
    } catch {
      // object seating is best-effort; the roster below is still
      // complete — a tag whose objects did not land reads as
      // nameless at rootNameAt, and ARM 6's network arms hold the
      // remote truth regardless.
    }
    const remote = execFileSync("git", ["ls-remote", "--tags", "origin"], { cwd: ROOT, encoding: "utf8" })
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((l) => l.split("\t")[1]!)
      .filter((r) => r.startsWith("refs/tags/") && !r.endsWith("^{}"))
      .map((r) => r.slice("refs/tags/".length));
    return [...new Set([...roster(), ...remote])].sort();
  }
  return tags;
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

  it("ARM 3 — NO TAG OUTLIVES ITS MINT: no local tag newer than the seat", () => {
    const newer = tagList().filter((t) => {
      if (!/^v\d/.test(t)) return false;
      if (cmpTag(t, census.seat) <= 0) return false;
      // Only tags that COULD seat (root manifest carries a package
      // name) are doors; a nameless tree cannot be the install door.
      return rootNameAt(t) !== null;
    });
    expect(
      newer,
      "tags newer than the seat with no mint — the newest tag IS the install door: mint its release and move census.seat to it, or delete the tag. An exclusion row cannot excuse it (ARM 7).",
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
    const remoteTags = execFileSync("git", ["ls-remote", "--tags", "origin"], { cwd: ROOT, encoding: "utf8" })
      .split("\n")
      .map((l) => l.split("\t")[1] ?? "")
      .filter((ref) => ref.startsWith("refs/tags/") && !ref.endsWith("^{}"))
      .map((ref) => ref.slice("refs/tags/".length))
      .filter((t) => /^v\d/.test(t));
    // THE GESTURE WINDOW: a mint is a two-push gesture (tag up, then
    // release + assets). While the seat tag is NOT yet on the remote,
    // the public door does not exist and this arm skips LOUD — the
    // tag-mint-gate already refuses pushing the tag unrecorded. The
    // moment the tag IS public, the full law binds: release exists,
    // assets aboard, and nothing newer outranks the seat.
    if (!remoteTags.includes(census.seat)) {
      console.warn(`[seat-pin] seat ${census.seat} not on the remote yet — the mint gesture is open; skipping the settled-state arms`);
    } else {
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
      // THE REMOTE-NEWEST LAW: the seat is the newest tag on the remote.
      // The burn lived HERE — bare rc tags on the remote outranked the
      // install door and no local edit could say otherwise. This arm
      // cannot be absolved by any census row; only a real mint (and seat
      // move) or deleting the remote tag greens it. No local-roster
      // filter: a remote-only bare tag still outranks the door.
      const newer = remoteTags.filter((t) => cmpTag(t, census.seat) > 0);
      expect(
        newer,
        `remote carries tags newer than the seat with no mint: ${newer.join(", ")} — the newest tag IS the install door. Mint its release and move census.seat, or delete the remote tag. No census row excuses this.`,
      ).toEqual([]);
    }
  });

  it("ARM 7 — NO ABSOLUTION: no exclusion names a tag newer than the seat", () => {
    const absolved = Object.keys(census.excluded).filter((t) => cmpTag(t, census.seat) > 0);
    expect(
      absolved,
      "exclusion rows outranking the seat — an exclusion covers history (tags the seat superseded), never the future: mint the release and move the seat, or delete the tag. A reason string is not a mint.",
    ).toEqual([]);
  });

  it("ARM 8 — NOTES ARE THE DOOR'S FACE (CI): the seat body is consumer-grade", { timeout: 60_000 }, async () => {
    const token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
    if (!token) {
      console.warn("[seat-pin] no GITHUB_TOKEN — skipping the notes arm (CI owns this judgment)");
      return;
    }
    const remoteTagged = execFileSync("git", ["ls-remote", "--tags", "origin"], { cwd: ROOT, encoding: "utf8" })
      .split("\n")
      .some((l) => (l.split("\t")[1] ?? "") === `refs/tags/${census.seat}`);
    if (!remoteTagged) {
      console.warn(`[seat-pin] seat ${census.seat} not on the remote yet — the mint gesture is open; skipping the notes arm until the release exists`);
      return;
    }
    const res = await fetch(`https://api.github.com/repos/JayDataEngineer/melite/releases/tags/${census.seat}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
    });
    expect(res.status, `the seat ${census.seat} must have a GitHub release`).toBe(200);
    const body = ((await res.json()) as { body?: string }).body ?? "";
    const headings = [...body.matchAll(/^##\s+\S/gm)].length;
    expect(
      headings,
      `the seat's release body carries ${headings} section headings — the body is the one page every install follows; internal ticket codes are not consumer notes (2026-11-14 burn: a 411-char code-soup body sat on the seat)`,
    ).toBeGreaterThanOrEqual(2);
    expect(
      body,
      "the seat's release body must carry an install command",
    ).toContain("dsh plugin --profile");
    expect(
      body.length,
      `the seat's release body is ${body.length} chars — real notes, not a stub`,
    ).toBeGreaterThanOrEqual(400);
  });

  it("ARM 9 — THE ROSTER PROVISION: the CI checkout shape (SHA-only shallow fetch, no tags) is filled by the wall's own tags fetch", () => {
    // Run 44498457238 (2026-11-19): every unit leg's checkout carried
    // `fetch-tags: true` yet `git tag -l` was [], because the actual
    // push-event fetch names only the SHA refspec. This arm REBUILDS
    // that exact shape from a scratch bare repo (no network): a
    // commit, a tag, then `git init` + explicit-SHA fetch — verbatim
    // the runner's command — and asserts the roster is empty. The
    // provisioning fetch (+refs/tags/*:refs/tags/* --depth=1, the
    // same command tagList() runs under GITHUB_ACTIONS) must then
    // fill it. If the provisioning line is ever deleted, this arm
    // reds — and on CI the roster arms above red with it, which is
    // how the burn announced itself.
    const scratch = mkdtempSync(join(tmpdir(), "seat-pin-roster-"));
    try {
      const git = (args: string[], cwd: string): string =>
        execFileSync("git", args, { cwd, encoding: "utf8" });
      git(["-c", "user.email=t@t", "-c", "user.name=t", "init", "--bare", "-q", join(scratch, "bare.git")], scratch);
      git(["-c", "user.email=t@t", "-c", "user.name=t", "init", "-q", join(scratch, "work")], scratch);
      writeFileSync(join(scratch, "work", "package.json"), '{"name":"t"}\n');
      git(["add", "."], join(scratch, "work"));
      git(["-c", "user.email=t@t", "-c", "user.name=t", "commit", "-q", "-m", "tagged base"], join(scratch, "work"));
      // The tag rides an OLDER commit, outside the depth-1 slice the
      // runner fetches — the real roster's shape (rc.4 sits below
      // main's tip). A tag AT the tip would ride git's auto-follow
      // into any fetch and the fixture would prove nothing.
      git(["tag", "v9.9.9-test"], join(scratch, "work"));
      writeFileSync(join(scratch, "work", "later.txt"), "tip\n");
      git(["add", "."], join(scratch, "work"));
      git(["-c", "user.email=t@t", "-c", "user.name=t", "commit", "-q", "-m", "untagged tip"], join(scratch, "work"));
      git(["branch", "-M", "main"], join(scratch, "work"));
      const sha = git(["rev-parse", "HEAD"], join(scratch, "work")).trim();
      git(["push", "-q", join(scratch, "bare.git"), "main"], join(scratch, "work"));
      git(["push", "-q", join(scratch, "bare.git"), "v9.9.9-test"], join(scratch, "work"));
      // The runner's shape: init + remote + explicit-SHA shallow
      // fetch, exactly as actions/checkout performed it in the log.
      git(["init", "-q", join(scratch, "clone")], scratch);
      git(["remote", "add", "origin", join(scratch, "bare.git")], join(scratch, "clone"));
      git(
        ["-c", "protocol.version=2", "fetch", "--prune", "--no-recurse-submodules", "--depth=1", "origin", `+${sha}:refs/remotes/origin/main`],
        join(scratch, "clone"),
      );
      expect(
        git(["tag", "-l"], join(scratch, "clone")).trim(),
        "the checkout shape must carry NO tags — if this goes green the fixture lost the burn shape",
      ).toBe("");
      // The provisioning (verbatim tagList()'s CI branch): the fetch
      // seats objects best-effort...
      git(
        ["fetch", "--depth=1", "--prune", "--no-recurse-submodules", "origin", "+refs/tags/*:refs/tags/*"],
        join(scratch, "clone"),
      );
      expect(git(["tag", "-l"], join(scratch, "clone")).trim(), "the tags fetch must fill the roster the checkout left empty").toContain("v9.9.9-test");
      // ...and the roster's COMPLETENESS leg (verbatim tagList()'s
      // CI union): ls-remote answers every name the shallow fetch
      // may have dropped (the v0.3.0-alpha partial-roster burn —
      // delete this leg and ARM 4 reds on the runner while every
      // local face stays green).
      const remoteNames = execFileSync("git", ["ls-remote", "--tags", "origin"], { cwd: join(scratch, "clone"), encoding: "utf8" })
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((l) => l.split("\t")[1]!)
        .filter((r) => r.startsWith("refs/tags/") && !r.endsWith("^{}"))
        .map((r) => r.slice("refs/tags/".length));
      expect(remoteNames, "the ls-remote union leg must name every remote tag — the roster's completeness truth").toContain("v9.9.9-test");
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  });
});
