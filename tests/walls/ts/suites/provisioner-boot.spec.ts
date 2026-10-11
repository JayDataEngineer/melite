// provisioner-boot.spec.ts — the profile COMPOSITION boots (the
// "no test caught it" autopsy, 2026-10-18: the operator's :3088
// lane booted with four plugins dead on `missed the module table`
// while the entire battery was green — every wall judged rendered
// FILES, and the browser e2e lane booted its own seed, a different
// composition that happened to carry the missing bundle. A render
// contract cannot see a boot; only a boot can.)
//
// The two arms here close the render-vs-boot gap the audits named:
//
// - B1 (melite-test only): render into a THROWAWAY home, boot the
//   real web serve on --port 0 (OS-picked — no collision with the
//   live 3080/3088 lanes by construction), wait for the tokenized
//   boot URL, fetch the page, and judge the SERVED graph — the
//   __DSH_BOOT__ entries the browser actually loads — plus the
//   boot log for every known activation-failure signature. A
//   roster-gap lane serves HTTP 200 with a CLEAN host log (proven
//   live in dev_docs/audits/testing/2026-10-18-render-vs-boot.md
//   §2b); the served graph is the only witness that cannot lie.
//
// - B0 (headless/estate): `--dump-config` exits 0 and its stderr
//   EQUALS the pinned benign warning set — bundle-resolution and
//   patch drift on the non-web mounts, deterministic and keyless.
//
// Skip laws (the suite's own class): a broken pnpm store skips the
// render (PNPM_OK, below); a missing or under-floor dsh skips the
// boot (the provisioner's own pin, 0.2.0-rc.1 — a bare PATH dsh
// below the floor is the banned class; the skip proves the
// external tool, never the product).
//
// Run: npx vitest run tests/walls/ts/suites/provisioner-boot.spec.ts
import { test } from "vitest";
import assert from "node:assert/strict";
import { spawn, spawnSync, execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir, homedir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { selfRegisteringWebFaces } from "./provisioner-census.ts";

const HERE: string = dirname(fileURLToPath(import.meta.url));
const REPO: string = join(HERE, "..", "..", "..", "..");
const BIN: string = join(REPO, "packages", "harness", "provisioner", "bin", "infer-provision.mjs");

// ---- preflight: pnpm (same law as provisioner-render.spec.ts) ----
function pnpmBin(): string {
  const candidates = [
    process.env["PNPM_BIN"],
    join(process.env["HOME"] ?? "", ".local/share/mise/installs/node/24.21.0/bin/pnpm"),
  ].filter((c): c is string => typeof c === "string" && c !== "");
  for (const c of candidates) if (existsSync(c)) return c;
  return "pnpm";
}
function pnpmHealthy(): boolean {
  try {
    const dir = mkdtempSync(join(tmpdir(), "pnpm-health-"));
    writeFileSync(join(dir, "package.json"), "{}");
    writeFileSync(join(dir, "pnpm-workspace.yaml"), 'packages:\n  - "."');
    execFileSync(pnpmBin(), ["install"], { cwd: dir, timeout: 90_000, stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}
const PNPM_OK = pnpmHealthy();

// ---- preflight: dsh on PATH at or above the provisioner's pin ----
// (the floor gate the e2e lane runs, e2e-studio-lane.sh:62-83: the
// mise 0.1.5-rc.2 burn — an under-floor registry refuses our codec
// shape and every symptom lands far from the cause. A version the
// regex cannot read fails the preflight loud, never boots.)
function dshFloorOk(): boolean {
  const res = spawnSync("dsh", ["--version"], { timeout: 15_000, encoding: "utf8" });
  if (res.status !== 0) return false;
  const m = /(\d+)\.(\d+)\.(\d+)(?:-rc\.(\d+))?/.exec((res.stdout ?? "").split("\n")[0] ?? "");
  if (m === null) return false;
  const rc = m[4] !== undefined ? Number(m[4]) : 10 ** 6;
  const cur: [number, number, number, number] = [Number(m[1]), Number(m[2]), Number(m[3]), rc];
  const floor: [number, number, number, number] = [0, 2, 0, 1];
  return !(cur < floor);
}
const DSH_OK = dshFloorOk();
const boot = test.skipIf(!PNPM_OK || !DSH_OK);
const dump = test.skipIf(!PNPM_OK || !DSH_OK);

/** Render one profile through the bin's own door into a fresh home. */
function render(home: string, profile: string, stateRoot?: string): void {
  execFileSync(process.execPath, [
    BIN, "profile", profile, "--dsh-home", home,
    ...(stateRoot !== undefined ? ["--estate-state-root", stateRoot] : []),
  ], {
    timeout: 120_000,
    stdio: "pipe",
  });
}

/** The boot-failure signatures (render-vs-boot audit §1 — each line
 *  a distinct class the dump/serve planes can emit). None is ever
 *  benign on a lane this repo ships. */
const FORBIDDEN: readonly string[] = [
  "skipping profile bundle",
  "cannot resolve",
  "patch: entry",
  "did not activate",
  "failed to import",
  "Cannot find module",
  "missed the module table",
  "client bundle not found",
  "failed to compose",
  "startup failed",
];

// THE SERVE-AND-FETCH PROBE (B1). The closure judged here is the
// served graph's own: every entry's `external` names another entry
// — the incident's exact shape (three plugins externalized
// three-client/client; the row was absent; the lane served 200).
boot("the melite-test profile serves a web boot whose client graph is closed (the boot probe)", { timeout: 120_000 }, async () => {
  const home: string = mkdtempSync(join(tmpdir(), "provisioner-boot-"));
  const logPath: string = join(home, "boot.log");
  let child: ReturnType<typeof spawn> | undefined;
  try {
    mkdirSync(join(home, "runs"), { recursive: true });
    render(home, "melite-test", join(home, "runs"));
    child = spawn("dsh", [
      "--profile", "melite-test", "--host", "127.0.0.1", "--port", "0", "--no-open",
    ], {
      env: { ...process.env, DSH_HOME: home },
      detached: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    const log: string[] = [];
    child.stdout?.on("data", (d: Buffer) => log.push(d.toString()));
    child.stderr?.on("data", (d: Buffer) => log.push(d.toString()));

    // wait for the tokenized boot URL (the lane's own readiness
    // signal — never a sleep; 90s bounds the wait)
    const deadline: number = Date.now() + 90_000;
    let url = "";
    for (;;) {
      const hit = /dsh web: (http:\/\/127\.0\.0\.1:\d+\/\?token=[A-Za-z0-9_-]+)/.exec(log.join(""));
      if (hit !== null) { url = hit[1]!; break; }
      if (child.exitCode !== null) {
        assert.fail(`the serve died before boot (exit ${child.exitCode}):\n${log.join("").slice(-2_000)}`);
      }
      if (Date.now() > deadline) {
        assert.fail(`no boot URL within 90s:\n${log.join("").slice(-2_000)}`);
      }
      await new Promise((r) => setTimeout(r, 250));
    }
    await new Promise((r) => setTimeout(r, 1_500)); // let the graph finish composing

    // fetch the page through the token door (303 → cookie → /)
    const r1 = await fetch(url, { redirect: "manual" });
    const cookies: string = (r1.headers.getSetCookie?.() ?? [])
      .map((c) => c.split(";")[0]).join("; ");
    const page = await fetch(new URL("/", url), { headers: { cookie: cookies } });
    assert.equal(page.status, 200, "the tokened page must serve");
    const html: string = await page.text();

    // the served graph is the only witness: parse __DSH_BOOT__
    const m = /__DSH_BOOT__"\] = (\{.*?\})(?:<\/script>|;)/s.exec(html);
    if (m === null) assert.fail("the served page carries no __DSH_BOOT__ graph");
    const graph = JSON.parse(m[1]!) as {
      entries: Array<{ id?: unknown; external?: unknown }>;
    };
    const entries = graph.entries ?? [];
    const ids: Set<string> = new Set(entries.map((e) => (typeof e.id === "string" ? e.id : "")).filter(Boolean));
    const dangling: string[] = [];
    for (const e of entries) {
      if (!Array.isArray(e.external)) continue;
      for (const raw of e.external) {
        const name = String(raw).split("/").slice(0, -1).join("/");
        if (name === "" || name.startsWith("@deepseek-ai/")) continue;
        if (!ids.has(name)) dangling.push(`${String(e.id)} externalizes ${String(raw)} — no served row names ${name}`);
      }
    }
    assert.deepEqual(dangling, [], "every served client external resolves to a served row (the incident's exact shape)");

    // THE FACE PLANE (the H3 composition audit F1, 2026-10-10): closure
    // is not the face. Nothing externalizes `h3-timeline/client`, so a
    // lane serving every external it names can still carry no studio
    // entry at all — the timeline bar simply absent, which is what the
    // operator saw. The renderer's manifest mirror installs every
    // self-registering web face as a dependency, so the profile's own
    // install set is the promise this plane must meet: every installed
    // face is SERVED, named by an entry the browser graph carries. The
    // render wall pins the same census in the patch plane (row names);
    // one census, two planes.
    const installed: string[] = Object.keys(
      (JSON.parse(readFileSync(join(home, "profiles", "melite-test", "package.json"), "utf8")) as {
        dependencies?: Record<string, string>;
      }).dependencies ?? {},
    );
    const faces = selfRegisteringWebFaces(REPO).filter((face) => installed.includes(face));
    assert.ok(faces.includes("@melite/card-base"),
      `the face scan meets the profile's install set (got: ${faces.join(", ")})`);
    const unserved = faces.filter((face) => !ids.has(face)).sort();
    assert.deepEqual(unserved, [],
      `every self-registering web face the profile installs is served (unserved: ${unserved.join(", ")})`);

    // the boot log carries no known failure signature
    const full: string = log.join("");
    const hits: string[] = FORBIDDEN.filter((f) => full.includes(f));
    assert.deepEqual(hits, [], `the boot log carries failure signatures: ${hits.join(" | ")}\n${full.slice(-1_500)}`);
  } finally {
    if (child !== undefined && child.exitCode === null) {
      try { process.kill(-child.pid!, "SIGKILL"); } catch { /* already gone */ }
      // reap before removing the home: rmSync racing a dying
      // child's open fds throws EBUSY/ENOTEMPTY — the one flake
      // this arm showed in four battery runs (kill returns before
      // the OS releases the log/session files the home holds)
      await new Promise<void>((resolve) => {
        const t = setTimeout(() => resolve(undefined), 5_000);
        child!.once("exit", () => { clearTimeout(t); resolve(undefined); });
      });
    }
    // a bounded retry: even reaped, the OS can hold fds a beat
    for (let attempt = 0; ; attempt++) {
      try { rmSync(home, { recursive: true, force: true }); break; } catch (err) {
        if (attempt >= 4 || !["EBUSY", "ENOTEMPTY", "EPERM"].includes((err as NodeJS.ErrnoException).code ?? "")) throw err;
        await new Promise((r) => setTimeout(r, 250));
      }
    }
  }
});

// THE OPERATOR'S FACES (B2, the "all green, history broken" cure,
// 2026-10-18): B1 proves the client graph closes; nothing proved the
// FACES the operator loads. The 3088 incident: every gate green while
// the rendered lane booted an unseated agent engine and an unpinned
// queue seat — the render wrote no config, and the wall itself leaned
// on the MELITE_STATE_ROOT crutch, so the lane could never have
// worked lawfully yet pass B1. This arm renders WITH the pin flags
// (a stub brain provider — seating enumerates the route, it never
// dials), boots, and asserts the three faces: the seated-brain boot
// line, the model catalog 200, and the runs feed 200 through the
// seats plane.
//
// THE HERMETIC ROOT rides config (J12): the queue plane is
// single-writer per state root (queueLock R2), and the rendered
// repoRoot pin names THIS repo — the same root the operator's live
// lane locks. --estate-state-root writes the estate row's stateRoot,
// so the wall renders its own root by the same config law the pin
// itself carries and never contends for the live lock.
boot("the rendered lane seats its brain and serves the operator's faces (runs, catalog)", { timeout: 240_000 }, async () => {
  const home: string = mkdtempSync(join(tmpdir(), "provisioner-faces-"));
  let child: ReturnType<typeof spawn> | undefined;
  try {
    // the stub brain: a provider row that exists but is never dialed
    // (baseURL port 9 — the discard port; seating reads the table)
    const rowsFile: string = join(home, "rows.yml");
    writeFileSync(rowsFile,
      "- id: llm-pi-ai\n"
      + "  name: \"@deepseek-ai/dsh-llm-pi-ai\"\n"
      + "  config:\n"
      + "    providers:\n"
      + "      wall-brain:\n"
      + "        apiKeyEnv: WALL_BRAIN_KEY\n"
      + "        api: openai-responses\n"
      + "        baseURL: http://127.0.0.1:9/v1\n"
      + "        models:\n"
      + "          - id: stub-model\n"
      + "            name: Stub Model\n"
      + "            contextWindow: 100000\n"
      + "            input: [text]\n",
    );
    execFileSync(process.execPath, [
      BIN, "profile", "melite-test", "--dsh-home", home,
      "--estate-agent-route", "wall-brain/stub-model",
      "--profile-rows", rowsFile,
      "--estate-state-root", join(home, "runs"),
    ], { timeout: 120_000, stdio: "pipe" });
    mkdirSync(join(home, "runs"), { recursive: true });
    child = spawn("dsh", [
      "--profile", "melite-test", "--host", "127.0.0.1", "--port", "0", "--no-open",
    ], {
      env: { ...process.env, DSH_HOME: home },
      detached: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    const log: string[] = [];
    child.stdout?.on("data", (d: Buffer) => log.push(d.toString()));
    child.stderr?.on("data", (d: Buffer) => log.push(d.toString()));

    const deadline: number = Date.now() + 90_000;
    let url = "";
    for (;;) {
      const hit = /dsh web: (http:\/\/127\.0\.0\.1:\d+\/\?token=[A-Za-z0-9_-]+)/.exec(log.join(""));
      if (hit !== null) { url = hit[1]!; break; }
      if (child.exitCode !== null) {
        assert.fail(`the serve died before boot (exit ${child.exitCode}):\n${log.join("").slice(-2_000)}`);
      }
      if (Date.now() > deadline) {
        assert.fail(`no boot URL within 90s:\n${log.join("").slice(-2_000)}`);
      }
      await new Promise((r) => setTimeout(r, 250));
    }
    // the seats mount AFTER the URL (composition completes behind
    // it): poll the runs feed until it answers or the estate's own
    // grace window (120s) exhausts — never a bare sleep. BOTH the
    // doors' 503 estate/pending AND the gallery row's 502
    // no_estate_seat are the boot race's WAIT voices (the seat
    // probe misses while composition is still running — observed
    // live under battery load); a 502 that still stands past the
    // window is the incident's exact voice and fails below
    const r1 = await fetch(url, { redirect: "manual" });
    const cookies: string = (r1.headers.getSetCookie?.() ?? [])
      .map((c) => c.split(";")[0]).join("; ");
    const feedDeadline: number = Date.now() + 100_000;
    let feedStatus = 0;
    let feedBody = "";
    for (;;) {
      const feed = await fetch(new URL("/infer-gallery/runs", url), { headers: { cookie: cookies } });
      feedStatus = feed.status;
      feedBody = await feed.text();
      const waiting: boolean = feedStatus === 503
        || (feedStatus === 502 && feedBody.includes("no_estate_seat"));
      if (!waiting || Date.now() > feedDeadline) break;
      await new Promise((r) => setTimeout(r, 500));
    }
    assert.equal(feedStatus, 200,
      `the runs feed must serve through the seats (the operator's history face):\n${feedBody.slice(0, 300)}`);
    const feed = JSON.parse(feedBody) as { runs?: unknown };
    assert.ok(Array.isArray(feed.runs), `the runs feed answers a runs list (got: ${feedBody.slice(0, 200)})`);

    const catalog = await fetch(new URL("/v1/model-catalog", url), { headers: { cookie: cookies } });
    assert.equal(catalog.status, 200, "the model catalog answers");
    const cat = await catalog.json() as { models?: Record<string, unknown> };
    assert.ok(cat.models !== undefined && Object.keys(cat.models).length > 0,
      "the catalog carries model families");

    const full: string = log.join("");
    assert.ok(full.includes("engine 'agent' seated: brain wall-brain/stub-model"),
      `the agent engine seats the pinned brain (the models face):\n${full.slice(-1_500)}`);
    const hits: string[] = FORBIDDEN.filter((f) => full.includes(f));
    assert.deepEqual(hits, [], `the boot log carries failure signatures: ${hits.join(" | ")}\n${full.slice(-1_500)}`);
  } finally {
    if (child !== undefined && child.exitCode === null) {
      try { process.kill(-child.pid!, "SIGKILL"); } catch { /* already gone */ }
      await new Promise<void>((resolve) => {
        const t = setTimeout(() => resolve(undefined), 5_000);
        child!.once("exit", () => { clearTimeout(t); resolve(undefined); });
      });
    }
    for (let attempt = 0; ; attempt++) {
      try { rmSync(home, { recursive: true, force: true }); break; } catch (err) {
        if (attempt >= 4 || !["EBUSY", "ENOTEMPTY", "EPERM"].includes((err as NodeJS.ErrnoException).code ?? "")) throw err;
        await new Promise((r) => setTimeout(r, 250));
      }
    }
  }
});

// THE DUMP PINS (B0): exit 0 and stderr EQUALS the benign set. The
// three `patch: entry not found` warnings are the renderer's own
// disables naming rows only WEB bundles contribute (the headless
// and estate mounts disable infer-card-view / ray-card-deck /
// infer-gallery by id; the rows land when card-view/deck/gallery
// mount, which server profiles never do). Pinning the exact set
// makes ANY change — a fourth warning, a renamed row, a silent
// renderer — fail here instead of on an operator's boot.
const BENIGN: readonly string[] = [
  'patch: entry "infer-card-view" not found',
  'patch: entry "ray-card-deck" not found',
  'patch: entry "infer-gallery" not found',
];
for (const profile of ["headless", "estate"] as const) {
  dump(`the ${profile} profile resolves its full composition at dump (exit 0, the pinned benign stderr)`, () => {
    const home: string = mkdtempSync(join(tmpdir(), "provisioner-dump-"));
    try {
      render(home, profile, join(home, "runs"));
      const res = spawnSync("dsh", ["--profile", profile, "--dump-config"], {
        env: { ...process.env, DSH_HOME: home },
        timeout: 60_000,
        encoding: "utf8",
      });
      assert.equal(res.status, 0, `dump exited ${res.status}:\n${res.stderr ?? ""}`);
      const lines: string[] = (res.stderr ?? "").split("\n").filter((l) => l.trim() !== "");
      const unexpected: string[] = lines.filter((l) => !BENIGN.some((b) => l.includes(b)));
      assert.deepEqual(unexpected, [],
        `the ${profile} dump carries warnings beyond the pinned benign set:\n${unexpected.join("\n")}`);
      for (const b of BENIGN) {
        assert.ok(lines.some((l) => l.includes(b)),
          `the ${profile} dump lost the pinned warning "${b}" — the renderer's disable set drifted`);
      }
    } finally {
      rmSync(home, { recursive: true, force: true });
    }
  });
}

// THE SINGLE-SETUP GUARD (operator law 2026-10-18: ONE home, ONE
// composition per lane — "no second way of making a dev setup").
// ~/.dsh-dev/profiles/melite-test was a stale Oct-5 estate-provision
// deploy (no three-client, no card-base) one `apply launch` away
// from re-breaking :3088 with every wall green. The deployed copy
// is quarantined; this arm fails if ANY future apply resurrects it.
// (Plain `test`, not skip-gated: absence everywhere is the pass —
// CI clones hold neither home.)
test("no second home carries a melite-test composition (the single-setup guard)", () => {
  const stale: string = join(homedir(), ".dsh-dev", "profiles", "melite-test");
  if (!existsSync(stale)) return; // absence everywhere is the pass
  // THE SANCTIONED DEV SEAT (the dev-DSH law, operator: estate-provision
  // is how dev DSH ships): the apply door provisions the dev lane under
  // ~/.dsh-dev with its own systemd-user unit. A second home is a
  // refusal unless THAT unit claims exactly it — DSH_HOME at the dev
  // root and --profile naming the lane. A hand-rolled copy (no unit,
  // or a unit pointing elsewhere) still reds.
  const unitPath = join(homedir(), ".config", "systemd", "user", "dsh-melite-test.service");
  const judge = (text: string): boolean =>
    text.includes(`DSH_HOME=${join(homedir(), ".dsh-dev")}`)
    && /--profile[= ]melite-test\b/.test(text);
  assert.ok(existsSync(unitPath),
    `${stale} exists but no dsh-melite-test.service claims it — a hand-rolled composition outside the ONE home (~/.dsh); quarantine it and re-ship through estate-provision apply`);
  const unit = readFileSync(unitPath, "utf8");
  assert.ok(judge(unit),
    `${stale} exists but dsh-melite-test.service does not claim it (DSH_HOME + --profile melite-test) — a hand-rolled composition; quarantine it and re-ship through estate-provision apply`);
  // THE REJECTION PATH: the judge refuses a unit that claims nothing
  assert.equal(judge("WorkingDirectory=/tmp\nExecStart=dsh"), false,
    "a unit claiming no dev home and no profile must not pass the guard");
});
