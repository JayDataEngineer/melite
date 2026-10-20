// @contract infra-manage-provision-runtime
// manage-provision-runtime.spec.ts — THE PROVISION_RUNTIME VERB
// (E2-2 Piece B, operator 2026-10-20): the manage plane seats the
// runtime-provision door the runtime banner fires — a SYMLINK from
// the engine tree's data/runtime/<name> to the repo's healthy seed,
// never a copy (the stuck-download law: zero moving bytes; the seed
// stays the source of truth). The verb NEVER re-provisions: the
// fresh-provision script is broken by law (chain files are placed by
// hand), so the only materialize arm is the link. The decision is
// the same one the press-time gate makes (cardsLanes runtimeLegMiss)
// — one env view (process env overlaid with the G3 lanes.env leg),
// one walk-up, one seed — so gate and verb can never disagree.
import { afterAll, beforeAll, describe, it } from "vitest";
import assert from "node:assert/strict";
import { existsSync, lstatSync, mkdirSync, readFileSync, readlinkSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { dispatchManage } from "../src/managePlane.ts";
import type { ManageCtx } from "../src/managePlane.ts";

const DIR = join(tmpdir(), "melite-provision-runtime-" + process.pid);
const REPO = join(DIR, "repo");
const SEED = join(REPO, "data", "runtime", "anny-estimator");
const ENGINE = join(DIR, "engine");
const TARGET = join(ENGINE, "data", "runtime", "anny-estimator");
const CFG = join(DIR, "endpoint.json");
const LANES = join(DIR, "lanes.env");

const PREV_CFG = process.env["COMFYUI_ENDPOINT_CONFIG"];
const PREV_ENV = process.env["ANNY_ESTIMATOR_ROOT"];

const SENTINELS = [
  "estimator_chain.py",
  join(".venv", "bin", "python"),
  join("SOMA-X", "tools", "mhr2soma.py"),
];

// The runtime row as the anny DECL declares it (model-contract
// DeclaredRuntime). The stub rides the same cast the manage walls
// use for ctx.models.
const RUNTIME_ROW = {
  name: "anny-estimator",
  env: "ANNY_ESTIMATOR_ROOT",
  rel: ["data", "runtime", "anny-estimator"],
  sentinel: SENTINELS,
  command: "pnpm run provision -- estimator",
  consuming_param: "body_image",
};
const DECL = { id: "anny", runtime: RUNTIME_ROW };

beforeAll(() => {
  mkdirSync(REPO, { recursive: true });
  writeEndpoint({ url: "http://127.0.0.1:8188", provision: "managed", engine_root: ENGINE, output_dir: "data/temp" });
  delete process.env["ANNY_ESTIMATOR_ROOT"];
});

afterAll(() => {
  if (PREV_CFG === undefined) delete process.env["COMFYUI_ENDPOINT_CONFIG"];
  else process.env["COMFYUI_ENDPOINT_CONFIG"] = PREV_CFG;
  if (PREV_ENV === undefined) delete process.env["ANNY_ESTIMATOR_ROOT"];
  else process.env["ANNY_ESTIMATOR_ROOT"] = PREV_ENV;
  rmSync(DIR, { recursive: true, force: true });
});

const writeEndpoint = (doc: Record<string, unknown>): void => {
  writeFileSync(CFG, JSON.stringify(doc));
  process.env["COMFYUI_ENDPOINT_CONFIG"] = CFG;
};

// A healthy runtime copy under any home: rel dir + every sentinel.
const placeRuntime = (root: string): string => {
  const home = root;
  for (const s of SENTINELS) {
    const f = join(home, s);
    mkdirSync(join(f, ".."), { recursive: true });
    writeFileSync(f, "x");
  }
  return home;
};

const placeSeed = (): string => placeRuntime(SEED);

const ctx = (): ManageCtx =>
  ({
    repoRoot: REPO,
    stateRoots: [REPO],
    comfyUnit: "dsh-melite-test.service",
    autoProvision: false,
    endpoint: () => JSON.parse(readFileSync(CFG, "utf8")) as Record<string, unknown>,
    models: { allDecls: () => [DECL] },
    timeout: (cb: () => void, ms: number): (() => void) => {
      const t = setTimeout(cb, ms);
      return () => {
        clearTimeout(t);
      };
    },
  }) as unknown as ManageCtx;

// THE PER-ARM RESET: every arm owns its env and its target — no
// state bleeds between arms (an env override or a landed link from a
// previous arm would silently re-decide later arms).
const arm = (endpoint: Record<string, unknown> = { url: "http://127.0.0.1:8188", provision: "managed", engine_root: ENGINE, output_dir: "data/temp" }): void => {
  delete process.env["ANNY_ESTIMATOR_ROOT"];
  rmSync(TARGET, { recursive: true, force: true });
  writeEndpoint(endpoint);
};

const call = (over: Record<string, unknown> = {}): Promise<{ status: number; ok: boolean; detail: string; action: string; data?: Record<string, unknown>; state?: string }> =>
  dispatchManage({ action: "provision_runtime", runtime: "anny-estimator", ...over }, ctx()).then(
    ([status, env]) => ({ status, ...(env as { ok: boolean; detail: string; action: string; data?: Record<string, unknown>; state?: string }) }),
  );

describe("THE PROVISION_RUNTIME VERB (the banner's firing door, E2-2 Piece B)", () => {
  it("a healthy repo seed with an absent engine target LINKS the seed (symlink, never a copy) and verifies the sentinels through the link", async () => {
    arm();
    placeSeed();
    const reply = await call();
    assert.equal(reply.status, 200, "the link succeeds: " + reply.detail);
    assert.equal(reply.ok, true);
    assert.equal(reply.state, "active");
    assert.equal(reply.data?.["runtime"], "anny-estimator");
    assert.deepEqual(reply.data?.["link"], { seed: SEED, target: TARGET });
    const st = lstatSync(TARGET);
    assert.equal(st.isSymbolicLink(), true, "the engine tree holds a SYMLINK — never a 7.4G copy");
    assert.equal(readlinkSync(TARGET), SEED, "the link aims at the repo seed (the source of truth)");
    for (const s of SENTINELS) assert.equal(existsSync(join(TARGET, s)), true, "sentinel rides the link: " + s);
    assert.equal(reply.data?.["restart_required"], false, "a link lands no engine restart — the walk-up re-reads per run");
    assert.match(reply.detail, /symlink/, "the receipt names the strategy");
    assert.match(reply.detail, /source of truth/, "the receipt states the seed stays source of truth");
    assert.match(reply.detail, /estimator_chain\.py/, "the verified sentinels ride the answer");
  });

  it("a second press answers already-present (idempotent — the walk-up reads the landed link, nothing re-made)", async () => {
    arm();
    placeSeed();
    await call();
    const before = readlinkSync(TARGET);
    const reply = await call();
    assert.equal(reply.status, 200);
    assert.match(reply.detail, /already present/);
    // The landed link sits under the engine root itself, so the
    // walk-up reads it before the target leg — the same
    // already-present answer either way, and the ordering is the
    // decision core's law.
    assert.equal(reply.data?.["source"], "walk-up");
    assert.equal(reply.data?.["home"], TARGET);
    assert.equal(reply.data?.["link"], undefined, "no second materialize arm ran");
    assert.equal(readlinkSync(TARGET), before, "the existing link is never re-made");
  });

  it("a healthy process-env override answers already-present (env) — the engine tree is never touched", async () => {
    arm();
    placeSeed();
    const home = placeRuntime(join(DIR, "env-home", "data", "runtime", "anny-estimator"));
    process.env["ANNY_ESTIMATOR_ROOT"] = home;
    const reply = await call();
    assert.equal(reply.status, 200, reply.detail);
    assert.equal(reply.data?.["source"], "env");
    assert.equal(reply.data?.["home"], home);
    assert.equal(existsSync(TARGET), false, "no link behind an override that already wins");
  });

  it("THE G3 LANES.ENV LEG: the endpoint's lanes_env_file overlays rt.env — comments/blanks ignored, LAST assignment wins, only rt.env is read", async () => {
    arm();
    placeSeed();
    const healthy = placeRuntime(join(DIR, "lanes-home", "data", "runtime", "anny-estimator"));
    // FIRST assignment points at a nonexistent tree: a first-wins read
    // would answer env-invalid and RED this arm — the pin is the
    // systemd order (later lines override earlier ones).
    writeFileSync(
      LANES,
      [
        "# the melite lane env (EnvironmentFile)",
        "",
        "ANNY_ESTIMATOR_ROOT=" + join(DIR, "dead", "path"),
        "  # indented comment",
        "OTHER_KEY=not-ours",
        "ANNY_ESTIMATOR_ROOT=" + healthy,
        "",
      ].join("\n"),
    );
    arm({ url: "http://127.0.0.1:8188", provision: "managed", engine_root: ENGINE, lanes_env_file: LANES });
    const reply = await call();
    assert.equal(reply.status, 200, reply.detail);
    assert.equal(reply.data?.["source"], "lanes.env");
    assert.equal(reply.data?.["home"], healthy, "the LAST assignment wins (systemd EnvironmentFile order)");
    assert.equal(existsSync(TARGET), false);
    assert.match(reply.detail, /lanes\.env/, "the answer names the file the value came from");
    assert.match(
      reply.detail,
      /restart the lane|EnvironmentFile/i,
      "the engine-visibility assumption is stated honestly (a lane started before the edit runs the old env)",
    );
  });

  it("THE MANAGED-ENGINE ARM: a managed output walks up to the repo seed itself — already-present, never a second seat", async () => {
    arm();
    placeSeed();
    const managedRoot = join(REPO, "data", "runtime", "comfyui");
    arm({ url: "http://127.0.0.1:8188", provision: "managed", engine_root: managedRoot });
    const reply = await call();
    assert.equal(reply.status, 200, reply.detail);
    assert.equal(reply.data?.["source"], "walk-up");
    assert.equal(reply.data?.["home"], SEED);
    assert.equal(
      existsSync(join(managedRoot, "data", "runtime", "anny-estimator")),
      false,
      "the verb never double-seats a managed engine — the walk-up already owns the seed",
    );
  });

  it("a healthy engine-tree target answers already-present from the TARGET leg (output_dir outside the engine tree) — left exactly as it stands", async () => {
    // The walk-up only reaches the target when the output dir sits
    // under the engine root; with the output on its own tree the
    // walk-up misses and the target leg answers. Both legs are the
    // same already-present law — this arm pins the target one.
    arm({ url: "http://127.0.0.1:8188", provision: "managed", engine_root: ENGINE, output_dir: join(DIR, "outside-output") });
    placeSeed();
    placeRuntime(TARGET);
    const reply = await call();
    assert.equal(reply.status, 200, reply.detail);
    assert.equal(reply.data?.["source"], "target");
    assert.equal(reply.data?.["home"], TARGET);
    assert.equal(lstatSync(TARGET).isSymbolicLink(), false, "a real healthy copy is left exactly as it stands");
  });

  it("no declared engine_root refuses 422-class (no-engine-root) — the estate cannot see that tree", async () => {
    arm({ url: "http://127.0.0.1:8188", provision: "managed" });
    placeSeed();
    const reply = await call();
    assert.equal(reply.status, 422);
    assert.equal(reply.ok, false);
    assert.equal(reply.data?.["kind"], "no-engine-root");
    assert.match(reply.detail, /engine_root/);
    assert.equal(existsSync(TARGET), false);
  });

  it("a broken seed refuses (broken-seed) voicing the repo provision command — never a link to a chipped tree", async () => {
    arm();
    placeSeed();
    rmSync(join(SEED, SENTINELS[0]!));
    const reply = await call();
    assert.equal(reply.status, 409, reply.detail);
    assert.equal(reply.data?.["kind"], "broken-seed");
    assert.match(reply.detail, /pnpm run provision -- estimator/);
    assert.equal(existsSync(TARGET), false, "no link lands on a broken seed");
  });

  it("a real foreign dir at the target refuses (target-blocked) and is NEVER clobbered", async () => {
    arm();
    placeSeed();
    mkdirSync(TARGET, { recursive: true });
    const foreign = join(TARGET, "operator-data.txt");
    writeFileSync(foreign, "keep me");
    const reply = await call();
    assert.equal(reply.status, 409, reply.detail);
    assert.equal(reply.data?.["kind"], "target-blocked");
    assert.match(reply.detail, /remove/i, "the refusal voices the removal");
    assert.equal(readFileSync(foreign, "utf8"), "keep me", "the foreign dir stands untouched");
    assert.equal(lstatSync(TARGET).isSymbolicLink(), false, "no clobber");
  });

  it("a STATED-INVALID env override refuses naming it (gate+verb agreement: the press gate refuses the same run)", async () => {
    arm();
    placeSeed();
    process.env["ANNY_ESTIMATOR_ROOT"] = join(DIR, "dead", "override");
    const reply = await call();
    assert.equal(reply.status, 422, reply.detail);
    assert.equal(reply.data?.["kind"], "env-invalid");
    assert.match(reply.detail, /ANNY_ESTIMATOR_ROOT/);
    assert.match(reply.detail, /dead/);
    assert.equal(existsSync(TARGET), false);
  });

  it("an unknown runtime name refuses 422 naming the declared runtimes (the client never knows families — names resolve server-side)", async () => {
    arm();
    const reply = await call({ runtime: "no-such-runtime" });
    assert.equal(reply.status, 422);
    assert.match(reply.detail, /no-such-runtime/);
    assert.match(reply.detail, /anny-estimator/, "the declared vocabulary rides the refusal");
  });

  it("a missing runtime field refuses 422 (provision_runtime requires: runtime)", async () => {
    arm();
    const [status, env] = await dispatchManage({ action: "provision_runtime" }, ctx());
    assert.equal(status, 422);
    assert.match((env as { detail: string }).detail, /provision_runtime requires: runtime/);
  });

  it("a BYO endpoint refuses 409 (the estate never touches a user-owned engine tree)", async () => {
    arm({ url: "http://127.0.0.1:8188", provision: "byo", engine_root: ENGINE });
    placeSeed();
    const reply = await call();
    assert.equal(reply.status, 409);
    assert.match(reply.detail, /byo endpoint/);
    assert.equal(existsSync(TARGET), false);
  });

  it("an ESCAPING sentinel (.. or empty) never reads outside its home — a declaration bug refuses broken-seed, never a filesystem escape (audit F3)", async () => {
    arm();
    placeSeed();
    // The decoy EXISTS on disk at the escaped path (outside the
    // seed): without the guard the seed would read healthy and LINK.
    writeFileSync(join(REPO, "data", "runtime", "escape.txt"), "x");
    const poisoned = { id: "anny", runtime: { ...RUNTIME_ROW, sentinel: ["../escape.txt", "", ...SENTINELS] } };
    const poisonedCtx = { ...ctx(), models: { allDecls: () => [poisoned] } } as unknown as ManageCtx;
    const [status, env] = await dispatchManage({ action: "provision_runtime", runtime: "anny-estimator" }, poisonedCtx);
    const reply = env as { ok: boolean; detail: string; data?: Record<string, unknown> };
    assert.equal(status, 409, reply.detail);
    assert.equal(reply.data?.["kind"], "broken-seed", "the escaping entries never hit, so the seed reads chipped");
    assert.equal(existsSync(TARGET), false, "no link lands on a declaration-bug seed");
  });
});
