// @contract infra-manage-plane-status-truth
// manage-plane-status-truth.spec.ts — the D3-02 / R-2 walls: the
// status face consults the engine-unit census (a restart/oom loop
// reads `degraded`, never `up` — the F3-09 green lie), the logs door
// names its source honestly (journalctl unit + why; wrapper lines
// never titled as application output; the managed app log answers
// with a liveness stamp, no invented app log). systemctl / journalctl
// ride the real exec seam (fake bins on PATH), the endpoint rides the
// mocked fetch — never frozen literals over the truth.
import { describe, it, afterEach } from "vitest";
import assert from "node:assert/strict";
import { chmodSync, mkdirSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { dispatchManage } from "../src/managePlane.ts";
import type { ManageCtx } from "../src/managePlane.ts";
import { countOomLines } from "../src/manageProbe.ts";

const realPath = process.env.PATH ?? "";
const realFetch = globalThis.fetch;

const json = (v: unknown): Response => new Response(JSON.stringify(v), { status: 200 });

let ROOT = "";
const mkRoot = (): string => {
  ROOT = mkdtempSync(join(tmpdir(), "manage-truth-"));
  return ROOT;
};
const rmRoot = (): void => {
  rmSync(ROOT, { recursive: true, force: true });
};

type Route = (url: string) => Response | Promise<Response>;
let ROUTE: Route = () => json({});
const route = (fn: Route): void => {
  ROUTE = fn;
  globalThis.fetch = (async (url: unknown) => ROUTE(String(url))) as typeof fetch;
};

// The engine answers every door: /system_stats (the reachability
// probe), /queue (the corroboration), the Manager urls (status's
// version/queue reads).
const routeEngineUp = (): void => {
  route((url) => {
    if (url.endsWith("/system_stats")) return json({ system: { comfyui_version: "0.3.4" }, devices: [] });
    if (url.endsWith("/queue")) return json({ queue_running: [], queue_pending: [] });
    return json({});
  });
};

// fake bins via a quoted heredoc — the burn's journal carries single
// quotes (`Failed with result 'oom-kill'.`); the heredoc never
// re-quotes them.
let BINS: string | null = null;
const fakeBin = (scripts: Record<string, { out?: string; err?: string; code: number }>): void => {
  const bin = mkdtempSync(join(tmpdir(), "truthbin-"));
  for (const [name, s] of Object.entries(scripts)) {
    writeFileSync(
      join(bin, name),
      "#!/bin/sh\n" +
        (s.err ? "cat >&2 <<'TRUTHERR'\n" + s.err + "\nTRUTHERR\n" : "") +
        (s.out ? "cat <<'TRUTHOUT'\n" + s.out + "\nTRUTHOUT\n" : "") +
        "exit " + s.code + "\n",
    );
    chmodSync(join(bin, name), 0o755);
  }
  BINS = bin;
  process.env.PATH = bin + ":" + realPath;
};

// THE BURN'S JOURNAL (FRICTION_3 W-P2-3a / cure map §1): systemd
// wrapper lines and kernel oom kills — zero application output.
const WRAPPER_JOURNAL =
  "estate-comfyui.service: Main process exited, code=killed, status=9/KILL\n" +
  "estate-comfyui.service: Failed with result 'oom-kill'.\n" +
  "estate-comfyui.service: Scheduled restart job, restart counter is at 3.\n" +
  "kernel: Out of memory: Killed process 4821 (python) total-vm:48000000kB\n";

const DEGRADED_SHOW =
  "NRestarts=3\nExecMainStatus=9\nExecMainCode=killed\nExecMainExitTimestamp=Tue 2026-11-04 17:35:12 UTC\n";

const SETTLED_SHOW = "NRestarts=0\nExecMainStatus=0\nExecMainCode=n/a\n";

const CTX = (over: Record<string, unknown> = {}): ManageCtx =>
  ({
    repoRoot: ROOT,
    stateRoots: [ROOT],
    comfyUnit: "estate-comfyui.service",
    endpoint: () => ({ provision: "managed", url: "http://127.0.0.1:8289" }),
    autoProvision: false,
    models: { allDecls: () => [] } as unknown as ManageCtx["models"],
    timeout: (cb: () => void, ms: number): (() => void) => {
      const timer = setTimeout(cb, ms);
      return () => { clearTimeout(timer); };
    },
    ...over,
  }) as unknown as ManageCtx;

const manage = (doc: unknown, ctx?: ManageCtx): Promise<[number, { ok: boolean; detail: string; action: string; state?: string; data?: unknown }]> =>
  dispatchManage(doc, ctx ?? CTX()) as unknown as Promise<
    [number, { ok: boolean; detail: string; action: string; state?: string; data?: unknown }]
  >;

interface StatusData {
  state: string;
  engine_unit: {
    known: boolean;
    unit: string;
    restarts?: number;
    last_exit_status?: number;
    last_exit_code?: string;
    last_exit_at?: string;
    oom_kills?: number;
    verdict: string;
    note?: string;
  };
  engine_boot: Record<string, unknown>;
}

interface LogsData {
  source: { kind: string; unit: string; why: string };
  app_log: { known: boolean; verdict: string; path?: string; last_write?: string; age_seconds?: number; note?: string; lines?: string[] };
  lines: string[];
}

afterEach(() => {
  globalThis.fetch = realFetch;
  process.env.PATH = realPath;
  if (BINS !== null) rmSync(BINS, { recursive: true, force: true });
  BINS = null;
  rmRoot();
});

describe("the status truth — the census consult (D3-02 / R-2)", () => {
  it("a reachable engine inside a restart/oom loop reads degraded, never up (the F3-09 green lie)", async () => {
    mkRoot();
    fakeBin({
      systemctl: { out: DEGRADED_SHOW, code: 0 },
      journalctl: { out: WRAPPER_JOURNAL, code: 0 },
    });
    routeEngineUp();
    const [code, env] = await manage({ action: "status" });
    assert.equal(code, 200);
    assert.equal(env.state, "degraded");
    assert.match(env.detail, /server degraded \(restarts 3, last exit 9\/KILL/);
    assert.match(env.detail, /oom 2/);
    assert.doesNotMatch(env.detail, /server up/);
    const data = env.data as unknown as StatusData;
    assert.equal(data.state, "degraded");
    assert.equal(data.engine_unit.known, true);
    assert.equal(data.engine_unit.unit, "estate-comfyui.service");
    assert.equal(data.engine_unit.restarts, 3);
    assert.equal(data.engine_unit.last_exit_status, 9);
    assert.equal(data.engine_unit.last_exit_code, "killed");
    assert.equal(data.engine_unit.last_exit_at, "Tue 2026-11-04 17:35:12 UTC");
    assert.equal(data.engine_unit.oom_kills, 2);
    assert.equal(data.engine_unit.verdict, "degraded");
  });

  it("an unanswerable census is honest absence — the answer never invents a degradation", async () => {
    mkRoot();
    fakeBin({
      systemctl: { err: "Failed to connect to bus", code: 1 },
      journalctl: { err: "Failed to connect to bus", code: 1 },
    });
    routeEngineUp();
    const [code, env] = await manage({ action: "status" });
    assert.equal(code, 200);
    assert.equal(env.state, "up");
    assert.equal(env.detail, "server up");
    const data = env.data as unknown as StatusData;
    assert.equal(data.engine_unit.known, false);
    assert.equal(data.engine_unit.verdict, "unknown");
    assert.match(String(data.engine_unit.note), /cannot answer/);
  });

  it("a dead engine inside the loop names WHY — the down voice carries the census words", async () => {
    mkRoot();
    fakeBin({
      systemctl: { out: DEGRADED_SHOW, code: 0 },
      journalctl: { out: WRAPPER_JOURNAL, code: 0 },
    });
    route(() => {
      throw new TypeError("fetch failed");
    });
    const [code, env] = await manage({ action: "status" });
    assert.equal(code, 200);
    assert.equal(env.state, "down");
    assert.match(env.detail, /server not reachable — the unit keeps dying/);
    assert.match(env.detail, /restarts 3, last exit 9\/KILL/);
  });

  it("a settled census keeps the plain up voice — no cry-wolf degradation", async () => {
    mkRoot();
    fakeBin({
      systemctl: { out: SETTLED_SHOW, code: 0 },
      journalctl: { out: "INFO: engine ready\nINFO: loaded krea-2\n", code: 0 },
    });
    routeEngineUp();
    const [code, env] = await manage({ action: "status" });
    assert.equal(code, 200);
    assert.equal(env.state, "up");
    assert.equal(env.detail, "server up");
    const data = env.data as unknown as StatusData;
    assert.equal(data.engine_unit.known, true);
    assert.equal(data.engine_unit.restarts, 0);
    assert.equal(data.engine_unit.verdict, "settled");
  });
});

describe("the logs truth — the source stamp (D3-02 / R-2)", () => {
  const appLog = (): string => join(ROOT, "data", "runtime", "comfyui", "user", "comfyui_8289.log");

  it("wrapper-only tails are named as the unit's capture with a STALE app-log verdict — never as application output", async () => {
    mkRoot();
    fakeBin({ journalctl: { out: WRAPPER_JOURNAL, code: 0 } });
    mkdirSync(join(ROOT, "data", "runtime", "comfyui", "user"), { recursive: true });
    writeFileSync(appLog(), "INFO: old application output\n");
    const stale = new Date(Date.now() - 2 * 3_600_000);
    utimesSync(appLog(), stale, stale);
    const [code, env] = await manage({ action: "logs" });
    assert.equal(code, 200);
    assert.match(env.detail, /source: systemd unit estate-comfyui\.service/);
    assert.match(env.detail, /NOT the engine's application log/);
    assert.match(env.detail, /3 systemd wrapper line\(s\), 2 oom-kill line\(s\)/);
    assert.match(env.detail, /engine application log: STALE/);
    assert.match(env.detail, /no live application output is reachable through this door/);
    const data = env.data as unknown as LogsData;
    assert.equal(data.source.kind, "journal");
    assert.equal(data.source.unit, "estate-comfyui.service");
    assert.match(data.source.why, /systemd's capture/);
    assert.equal(data.app_log.verdict, "stale");
    assert.equal(data.app_log.known, true);
    assert.match(String(data.app_log.path), /comfyui_8289\.log$/);
    assert.equal(typeof data.app_log.last_write, "string");
    assert.ok((data.app_log.age_seconds ?? 0) >= 7000);
    assert.equal(data.app_log.lines, undefined, "a stale app log is never served as live output");
    assert.deepEqual(data.lines, [
      "estate-comfyui.service: Main process exited, code=killed, status=9/KILL",
      "estate-comfyui.service: Failed with result 'oom-kill'.",
      "estate-comfyui.service: Scheduled restart job, restart counter is at 3.",
      "kernel: Out of memory: Killed process 4821 (python) total-vm:48000000kB",
    ]);
  });

  it("a fresh managed app log falls through — its tail is served under the app_log row", async () => {
    mkRoot();
    fakeBin({ journalctl: { out: WRAPPER_JOURNAL, code: 0 } });
    mkdirSync(join(ROOT, "data", "runtime", "comfyui", "user"), { recursive: true });
    writeFileSync(appLog(), "INFO: engine ready\nINFO: loaded krea-2\nINFO: got prompt\n");
    const [code, env] = await manage({ action: "logs", tail: 2 });
    assert.equal(code, 200);
    assert.match(env.detail, /engine application log: fresh/);
    assert.match(env.detail, /its tail is attached below/);
    const data = env.data as unknown as LogsData;
    assert.equal(data.app_log.verdict, "fresh");
    assert.deepEqual(data.app_log.lines, ["INFO: loaded krea-2", "INFO: got prompt"], "the tail clamps to the request");
  });

  it("a managed lane with no app log says so — no invented application output", async () => {
    mkRoot();
    fakeBin({ journalctl: { out: "l1\n", code: 0 } });
    const [code, env] = await manage({ action: "logs" });
    assert.equal(code, 200);
    assert.match(env.detail, /engine application log: no engine application log on disk/);
    const data = env.data as unknown as LogsData;
    assert.equal(data.app_log.verdict, "absent");
    assert.match(String(data.app_log.path), /comfyui_8289\.log$/);
    assert.match(String(data.app_log.note), /never application output/);
    assert.deepEqual(data.lines, ["l1"]);
  });

  it("a byo endpoint keeps journal-only with the honest no-app-log verdict", async () => {
    mkRoot();
    fakeBin({ journalctl: { out: "l1\n", code: 0 } });
    const [code, env] = await manage({ action: "logs" }, CTX({ endpoint: () => ({ url: "http://127.0.0.1:8188" }) }));
    assert.equal(code, 200);
    const data = env.data as unknown as LogsData;
    assert.equal(data.app_log.known, false);
    assert.equal(data.app_log.verdict, "unknown");
    assert.match(String(data.app_log.note), /byo endpoint's engine tree is user-owned/);
    assert.deepEqual(data.lines, ["l1"]);
  });
});

describe("countOomLines — the oom census's one parse", () => {
  it("counts systemd's result word, the cgroup event, and the kernel killer — nothing else", () => {
    assert.equal(countOomLines([
      "estate-comfyui.service: Failed with result 'oom-kill'.",
      "kernel: Out of memory: Killed process 4821 (python)",
      "cgroup: oom_kill event for the engine",
      "INFO: engine ready",
      "estate-comfyui.service: Main process exited, code=killed, status=9/KILL",
    ]), 3);
  });
});
