import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect, afterAll } from "vitest";
import { RENDER_ROOT, enforcePairing, pairingVerdict } from "../bin/infer-provision.mjs";

// THE LANE-PAIRING FENCE WALL (registry provision-lane-pairing, 2026-11-24).
// The render is self-locating: repoRoot, the link: dependencies and the
// estate's runs root all pin the tree the provisioner runs from. A lane
// profile re-rendered from a foreign tree re-parents wholesale — the
// :3089 morning boot loop (a dev-workspace render pinned the lane at the
// dev estate's runs root; the gateway lock refused, the seats never
// settled, every preset naming a subagent tool failed session
// validation). The fence refuses the foreign-tree re-render at the
// render door. These arms judge the predicate matrix in-process and the
// REAL bin at its door for the firing arm.

const BIN = fileURLToPath(new URL("../bin/infer-provision.mjs", import.meta.url));
const FOREIGN_TREE = "/home/user/some-other-tree";
const tmpRoots: string[] = [];
const scratch = (): string => {
  const dir = mkdtempSync(join(tmpdir(), "lane-pairing-fence-"));
  tmpRoots.push(dir);
  return dir;
};
afterAll(() => { for (const d of tmpRoots) rmSync(d, { recursive: true, force: true }); });

/** Seed a profile dir whose provenance names `root` (renderer ours, so
 *  the fence — not the F1 foreign-file gate — is the judge in play). */
const seededProfile = (root: string): string => {
  const dst = join(scratch(), "profiles", "melite-test");
  mkdirSync(dst, { recursive: true });
  writeFileSync(join(dst, "render-provenance.json"), JSON.stringify({
    renderedAt: "2026-11-24T00:00:00.000Z",
    renderer: "infer-provision",
    provisioner: { name: "@melite/harness-provisioner", version: "0.3.0-rc.1" },
    source: { root, commit: null, dirty: false },
    profile: "melite-test",
    bundles: [],
    flags: {},
  }) + "\n");
  return dst;
};

describe("THE LANE-PAIRING FENCE — a lane profile never re-renders from a foreign tree", () => {
  it("the verdict matrix: first render and same-tree render pass, foreign tree refuses loud, --re-parent accepts loud", () => {
    expect(pairingVerdict(null, RENDER_ROOT)).toEqual({ ok: true, reParented: false });
    expect(pairingVerdict(RENDER_ROOT, RENDER_ROOT)).toEqual({ ok: true, reParented: false });
    const refused = pairingVerdict(FOREIGN_TREE, RENDER_ROOT);
    expect(refused.ok).toBe(false);
    expect(String(refused.refusal)).toContain(FOREIGN_TREE);
    expect(String(refused.refusal)).toContain(RENDER_ROOT);
    expect(String(refused.refusal)).toContain("--re-parent");
    expect(String(refused.refusal)).toContain("runs root");
    const reparented = pairingVerdict(FOREIGN_TREE, RENDER_ROOT, { reParent: true });
    expect(reparented).toEqual({ ok: true, reParented: true });
  });

  it("enforcePairing reads the seeded stamp, and treats an absent or foreign-renderer stamp as a first render", () => {
    const dst = seededProfile(FOREIGN_TREE);
    const verdict = enforcePairing(dst);
    expect(verdict.ok).toBe(false);
    expect(verdict.prevRoot).toBe(FOREIGN_TREE);
    const empty = join(scratch(), "profiles", "fresh");
    mkdirSync(empty, { recursive: true });
    expect(enforcePairing(empty)).toEqual({ ok: true, reParented: false, prevRoot: null });
    const hand = join(scratch(), "profiles", "hand");
    mkdirSync(hand, { recursive: true });
    writeFileSync(join(hand, "render-provenance.json"), JSON.stringify({ renderer: "someone-else", source: { root: FOREIGN_TREE } }));
    expect(enforcePairing(hand)).toEqual({ ok: true, reParented: false, prevRoot: null });
  });

  it("THE FIRING ARM — the real bin refuses a foreign-tree re-render at its own door, before any profile file lands", () => {
    const dst = seededProfile(FOREIGN_TREE);
    // --profile-rows points at a missing file so the ONLY possible
    // refusal is the fence's: when the fence is toggled out the render
    // sails past and answers the rows voice instead, reding this arm.
    const r = spawnSync(process.execPath, [BIN, "profile", "melite-test",
      "--dsh-home", join(dst, "..", ".."), "--profile-rows", "/nonexistent/studio-lane-rows.yml"],
    { encoding: "utf8", timeout: 60_000 });
    expect(r.status, `expected the pairing refusal, got status ${String(r.status)}:\n${r.stdout}\n${r.stderr}`).toBe(1);
    expect(r.stderr).toContain("refusing to re-render");
    expect(r.stderr).toContain(FOREIGN_TREE);
    expect(r.stderr).toContain(RENDER_ROOT);
    expect(r.stderr).toContain("--re-parent");
    expect(existsSync(join(dst, "cordis.patch.yml"))).toBe(false);
    expect(existsSync(join(dst, "package.json"))).toBe(false);
  }, 90_000);

  it("the control — a provenance naming THIS tree passes the fence and reaches the next gate", () => {
    const dst = seededProfile(RENDER_ROOT);
    const r = spawnSync(process.execPath, [BIN, "profile", "melite-test",
      "--dsh-home", join(dst, "..", ".."), "--profile-rows", "/nonexistent/studio-lane-rows.yml"],
    { encoding: "utf8", timeout: 60_000 });
    expect(r.status).toBe(1);
    expect(r.stderr).not.toContain("refusing to re-render");
    expect(r.stderr).toContain("--profile-rows: no such file");
  }, 90_000);

  it("the bin wires the exported fence (no copy): renderProfile enforces pairing before its writes and registers --re-parent", () => {
    const src = readFileSync(BIN, "utf8");
    const render = src.slice(src.indexOf("function renderProfile"));
    expect(render).toContain("enforcePairing(dst");
    expect(render.indexOf("enforcePairing(dst")).toBeLessThan(render.indexOf("writeFileAtomic"));
    expect(render).toContain("if (!pairing.ok) die(pairing.refusal)");
    expect(src).toContain("const RE_PARENT = argv.includes('--re-parent')");
    expect(src).toContain("export function pairingVerdict");
    expect(src).toContain("export function enforcePairing");
  });
});
