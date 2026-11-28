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
import { chmodSync, existsSync, mkdirSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { dispatchManage } from "../src/managePlane.ts";
import type { ManageCtx } from "../src/managePlane.ts";
import { censusEnv, countOomLines, systemdStampIso } from "../src/manageProbe.ts";
import { SYSTEMD_FAKE_SEATS, systemdStamp } from "./systemd-fake.ts";

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
    engineQuiesceMs: 0,
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

// No systemd/journal where the #!/bin/sh fakes cannot execute: the
// census consult (systemctl) and the journal tails (journalctl)
// ride fake bins on PATH — every arm consulting them is gated on
// this (the seat is the fake's own, one home), while the pure-parse
// arms judge on every lane.
const WIN_NO_SYSTEMD = !SYSTEMD_FAKE_SEATS;

interface StatusData {
  state: string;
  engine_unit: {
    known: boolean;
    unit: string;
    restarts?: number;
    last_exit_status?: number;
    last_exit_code?: string;
    last_exit_at?: string;
    started_at?: string;
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
  it.skipIf(WIN_NO_SYSTEMD)("a reachable engine inside a restart/oom loop reads degraded, never up (the F3-09 green lie)", async () => {
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
    // W-4 (2026-11-15, degraded-with-cause): the verdict NAMES its
    // cause and the maker's lever — never a bare "degraded" the
    // reader must cross-join themselves (the burn: "still degraded:
    // restarts 3, oom-kill 4 while serving").
    assert.match(String(data.engine_unit.note), /degraded by the restart loop \(>= 2\) and a SIGKILL last exit and kernel oom evidence/);
    assert.match(String(data.engine_unit.note), /memory pressure/);
    assert.match(String(data.engine_unit.note), /2\.33 s = 56 f/);
  });

  it.skipIf(WIN_NO_SYSTEMD)("W-4 — a restart-only degradation names the restart loop, never the oom lever", async () => {
    mkRoot();
    fakeBin({
      systemctl: { out: "NRestarts=3\nExecMainStatus=0\nExecMainCode=n/a\n", code: 0 },
      journalctl: { out: "INFO: engine ready\nINFO: loaded krea-2\n", code: 0 },
    });
    routeEngineUp();
    const [_code, env] = await manage({ action: "status" });
    const data = env.data as unknown as StatusData;
    assert.equal(data.engine_unit.verdict, "degraded");
    assert.match(String(data.engine_unit.note), /degraded by the restart loop \(>= 2\)/);
    assert.match(String(data.engine_unit.note), /journal tail/);
    assert.doesNotMatch(String(data.engine_unit.note), /memory pressure/);
    assert.doesNotMatch(String(data.engine_unit.note), /2\.33 s = 56 f/);
  });

  // ── S1 (2026-11-27): the boot time is the unit's own word ──────────
  // The status face read `engine boot: 2026-11-24 · age 297640s` (3 d
  // 10 h) over a unit the journal showed started six hours earlier:
  // the restart receipt only knows the boots the estate's own door
  // issued, and every other rester left it stale.
  const receiptAt = (ms: number, source = "estate restart"): void => {
    const dir = join(ROOT, "data", "runtime", "comfyui");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, ".estate-engine-boot.json"), JSON.stringify({ boot_at: ms, source }));
  };
  const SETTLED_PROPS = (startWord: string): string =>
    "NRestarts=0\nExecMainStatus=0\nExecMainCode=n/a\nExecMainStartTimestamp=" + startWord + "\n";

  it.skipIf(WIN_NO_SYSTEMD)("the boot time is the unit's own start — a stale restart receipt never states the age (S1)", async () => {
    mkRoot();
    // the stamp carries seconds; the row states the instant it names
    const startedMs = Math.floor((Date.now() - 3_600_000) / 1000) * 1000;
    receiptAt(Date.now() - 3 * 86_400_000);
    fakeBin({
      systemctl: { out: SETTLED_PROPS(systemdStamp(startedMs)), code: 0 },
      journalctl: { out: "INFO: engine ready\n", code: 0 },
    });
    routeEngineUp();
    const [_code, env] = await manage({ action: "status" });
    const data = env.data as unknown as StatusData;
    assert.equal(data.engine_boot.known, true);
    assert.equal(data.engine_boot.boot_at, new Date(startedMs).toISOString());
    assert.equal(data.engine_boot.source, "systemd: estate-comfyui.service ExecMainStartTimestamp");
    const age = data.engine_boot.age_seconds as number;
    assert.ok(age >= 3_599 && age <= 3_605, "one hour, not three days: " + String(age));
    assert.equal(data.engine_unit.started_at, new Date(startedMs).toISOString());
  });

  it.skipIf(WIN_NO_SYSTEMD)("a unit with no running main process keeps the restart receipt as the witness (S1)", async () => {
    mkRoot();
    receiptAt(Date.now() - 93_000);
    fakeBin({
      systemctl: { out: SETTLED_PROPS(""), code: 0 },
      journalctl: { out: "INFO: engine ready\n", code: 0 },
    });
    routeEngineUp();
    const [_code, env] = await manage({ action: "status" });
    const data = env.data as unknown as StatusData;
    assert.equal(data.engine_boot.source, "estate restart");
    assert.ok((data.engine_boot.age_seconds as number) >= 93);
    assert.equal(data.engine_unit.started_at, undefined);
  });

  it("systemd's stamp word converts to ISO, and nothing else does (the parse never invents an instant)", () => {
    assert.equal(systemdStampIso("Fri 2026-11-27 11:00:20 UTC"), "2026-11-27T11:00:20.000Z");
    assert.equal(systemdStampIso(""), undefined);
    assert.equal(systemdStampIso("n/a"), undefined);
    assert.equal(systemdStampIso("Fr. 2026-11-27 11:00:20 UTC"), undefined, "a locale's spelling is not the parsed form");
    assert.equal(systemdStampIso(undefined), undefined);
  });

  it.skipIf(WIN_NO_SYSTEMD)("an unparseable answer names the runtime dir the execs rode (S1)", async () => {
    mkRoot();
    fakeBin({
      systemctl: { out: "", code: 0 },
      journalctl: { out: "", code: 0 },
    });
    routeEngineUp();
    const [_code, env] = await manage({ action: "status" });
    const data = env.data as unknown as StatusData;
    assert.equal(data.engine_unit.known, false);
    assert.match(String(data.engine_unit.note), /systemd answered nothing parseable \(XDG_RUNTIME_DIR=.+\)/);
  });

  it.skipIf(WIN_NO_SYSTEMD || !existsSync("/run/user/" + String(process.getuid?.())))("a scrubbed env finds the user bus by the uid rule (S1)", async () => {
    mkRoot();
    // the fake systemctl reports the runtime dir it was handed
    // through a property the census carries verbatim
    const bin = mkdtempSync(join(tmpdir(), "truthbus-"));
    writeFileSync(
      join(bin, "systemctl"),
      "#!/bin/sh\necho \"ExecMainExitTimestamp=saw_$XDG_RUNTIME_DIR\"\necho NRestarts=0\necho ExecMainCode=n/a\nexit 0\n",
    );
    chmodSync(join(bin, "systemctl"), 0o755);
    writeFileSync(join(bin, "journalctl"), "#!/bin/sh\nexit 0\n");
    chmodSync(join(bin, "journalctl"), 0o755);
    process.env.PATH = bin + ":" + realPath;
    const savedXdg = process.env.XDG_RUNTIME_DIR;
    const savedBus = process.env.DBUS_SESSION_BUS_ADDRESS;
    delete process.env.XDG_RUNTIME_DIR;
    delete process.env.DBUS_SESSION_BUS_ADDRESS;
    try {
      routeEngineUp();
      const [_code, env] = await manage({ action: "status" });
      const data = env.data as unknown as StatusData;
      assert.equal(data.engine_unit.known, true);
      assert.equal(data.engine_unit.last_exit_at, "saw_/run/user/" + String(process.getuid?.()));
    } finally {
      if (savedXdg === undefined) delete process.env.XDG_RUNTIME_DIR; else process.env.XDG_RUNTIME_DIR = savedXdg;
      if (savedBus === undefined) delete process.env.DBUS_SESSION_BUS_ADDRESS; else process.env.DBUS_SESSION_BUS_ADDRESS = savedBus;
      rmSync(bin, { recursive: true, force: true });
    }
  });

  it.skipIf(WIN_NO_SYSTEMD)("a census whose systemctl never ran names the spawn's own message and the unset runtime dir (S1)", async () => {
    mkRoot();
    // journalctl alone is seated and PATH carries nothing else: the
    // systemctl exec rejects with ENOENT — an error with no stderr
    // to quote, so the note speaks the spawn's own message
    fakeBin({ journalctl: { out: "", code: 0 } });
    process.env.PATH = BINS ?? realPath;
    const savedXdg = process.env.XDG_RUNTIME_DIR;
    const savedBus = process.env.DBUS_SESSION_BUS_ADDRESS;
    const savedGetuid = process.getuid;
    delete process.env.XDG_RUNTIME_DIR;
    delete process.env.DBUS_SESSION_BUS_ADDRESS;
    // a uid with no /run/user seat: the uid rule derives nothing, so
    // the note's runtime-dir word is the honest `unset`
    process.getuid = () => 4294967294;
    try {
      routeEngineUp();
      const [code, env] = await manage({ action: "status" });
      assert.equal(code, 200);
      const data = env.data as unknown as StatusData;
      assert.equal(data.engine_unit.known, false);
      assert.equal(data.engine_unit.verdict, "unknown");
      assert.equal(
        String(data.engine_unit.note),
        "the unit census cannot answer on this lane: spawn systemctl ENOENT (XDG_RUNTIME_DIR=unset)",
      );
    } finally {
      if (savedXdg === undefined) delete process.env.XDG_RUNTIME_DIR; else process.env.XDG_RUNTIME_DIR = savedXdg;
      if (savedBus === undefined) delete process.env.DBUS_SESSION_BUS_ADDRESS; else process.env.DBUS_SESSION_BUS_ADDRESS = savedBus;
      process.getuid = savedGetuid;
    }
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

  it.skipIf(WIN_NO_SYSTEMD)("a dead engine inside the loop names WHY — the down voice carries the census words", async () => {
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

  it.skipIf(WIN_NO_SYSTEMD)("a settled census keeps the plain up voice — no cry-wolf degradation", async () => {
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
    // W-4: health stays SILENT — the cause note is the degraded
    // verdict's own voice, never noise on a settled row.
    assert.equal(data.engine_unit.note, undefined);
  });

  // ── the census WORDS' sparse shapes (D3-02's map spelling): the
  // degraded voice composes only the fields the row actually carries —
  // no invented restarts, the raw signal named when the map misses it,
  // a word-form exit code carried with its status. Same real exec
  // seam, byte-exact detail faces.
  it.skipIf(WIN_NO_SYSTEMD)("an oom-only degradation carries no restarts word — absent fields stay absent", async () => {
    mkRoot();
    fakeBin({
      // no NRestarts printed, no exit status: the restart/exit words
      // have nothing to compose from, the oom evidence alone degrades
      systemctl: { out: "ExecMainCode=n/a\n", code: 0 },
      journalctl: { out: WRAPPER_JOURNAL, code: 0 },
    });
    routeEngineUp();
    const [code, env] = await manage({ action: "status" });
    assert.equal(code, 200);
    assert.equal(env.state, "degraded");
    assert.equal(env.detail, "server degraded (oom 2)");
    const data = env.data as unknown as StatusData;
    assert.equal(data.engine_unit.restarts, undefined);
    assert.equal(data.engine_unit.last_exit_status, undefined);
    assert.equal(data.engine_unit.oom_kills, 2);
    assert.equal(data.engine_unit.verdict, "degraded");
  });

  it.skipIf(WIN_NO_SYSTEMD)("a killed exit outside the signal map spells the raw SIG number — never a bare number", async () => {
    mkRoot();
    fakeBin({
      // signal 31 (SIGSYS) is a real kill the 1-15 map does not name
      systemctl: { out: "NRestarts=3\nExecMainStatus=31\nExecMainCode=killed\n", code: 0 },
      journalctl: { out: "INFO: engine ready\n", code: 0 },
    });
    routeEngineUp();
    const [code, env] = await manage({ action: "status" });
    assert.equal(code, 200);
    assert.equal(env.state, "degraded");
    assert.equal(env.detail, "server degraded (restarts 3, last exit 31/SIG31)");
    const data = env.data as unknown as StatusData;
    assert.equal(data.engine_unit.last_exit_status, 31);
    assert.equal(data.engine_unit.last_exit_code, "killed");
  });

  it.skipIf(WIN_NO_SYSTEMD)("a word-form exit code rides its status — `last exit 1/exited`, never the killed spelling", async () => {
    mkRoot();
    fakeBin({
      systemctl: { out: "NRestarts=3\nExecMainStatus=1\nExecMainCode=exited\n", code: 0 },
      journalctl: { out: "INFO: engine ready\n", code: 0 },
    });
    routeEngineUp();
    const [code, env] = await manage({ action: "status" });
    assert.equal(code, 200);
    assert.equal(env.state, "degraded");
    assert.equal(env.detail, "server degraded (restarts 3, last exit 1/exited)");
    const data = env.data as unknown as StatusData;
    assert.equal(data.engine_unit.last_exit_status, 1);
    assert.equal(data.engine_unit.last_exit_code, "exited");
  });
});

// ── the census's unset words and silent journal (the unset-enum
// THE UID RULE ITSELF (S1): the unit judge is pure — the process
// env and getuid are its only inputs — so the arms state them
// directly: what is kept, what is derived, and what is never
// invented. These judge on every lane (a Windows leg has no getuid
// at all, which is the no-uid arm by nature).
describe("censusEnv — the user bus's seat (S1): the exec env the census rides", () => {
  const realXdg = process.env.XDG_RUNTIME_DIR;
  const realBus = process.env.DBUS_SESSION_BUS_ADDRESS;
  const realGetuid = process.getuid;
  // no /run/user/<uid> directory carries this uid
  const NO_SEAT_UID = 4294967294;
  const restore = (): void => {
    if (realXdg === undefined) delete process.env.XDG_RUNTIME_DIR; else process.env.XDG_RUNTIME_DIR = realXdg;
    if (realBus === undefined) delete process.env.DBUS_SESSION_BUS_ADDRESS; else process.env.DBUS_SESSION_BUS_ADDRESS = realBus;
    process.getuid = realGetuid;
  };
  const scrub = (): void => {
    delete process.env.XDG_RUNTIME_DIR;
    delete process.env.DBUS_SESSION_BUS_ADDRESS;
  };
  afterEach(restore);

  it("a runtime dir already on the env is kept; the locale pins ride regardless", () => {
    process.env.XDG_RUNTIME_DIR = "/run/user/kept";
    const env = censusEnv();
    assert.equal(env["XDG_RUNTIME_DIR"], "/run/user/kept");
    assert.equal(env["DBUS_SESSION_BUS_ADDRESS"], realBus, "a kept dir derives no bus");
    assert.equal(env["LC_ALL"], "C");
    assert.equal(env["TZ"], "UTC");
  });

  it("no runtime dir and a uid with no /run/user seat: nothing is derived, nothing invented", () => {
    scrub();
    process.getuid = () => NO_SEAT_UID;
    const env = censusEnv();
    assert.equal(env["XDG_RUNTIME_DIR"], undefined);
    assert.equal(env["DBUS_SESSION_BUS_ADDRESS"], undefined);
  });

  it("no uid at all (a lane without getuid): the uid rule has nothing to derive from", () => {
    scrub();
    process.getuid = undefined;
    const env = censusEnv();
    assert.equal(env["XDG_RUNTIME_DIR"], undefined);
    assert.equal(env["DBUS_SESSION_BUS_ADDRESS"], undefined);
  });

  const uidSeat = "/run/user/" + String(process.getuid?.());
  it.skipIf(WIN_NO_SYSTEMD || !existsSync(uidSeat))("the uid rule seats the runtime dir and its bus where systemd's own seat exists", () => {
    scrub();
    const env = censusEnv();
    assert.equal(env["XDG_RUNTIME_DIR"], uidSeat);
    assert.equal(env["DBUS_SESSION_BUS_ADDRESS"], "unix:path=" + uidSeat + "/bus");
  });

  it.skipIf(WIN_NO_SYSTEMD || !existsSync(uidSeat))("a bus address already on the env is kept while the runtime dir is derived", () => {
    delete process.env.XDG_RUNTIME_DIR;
    process.env.DBUS_SESSION_BUS_ADDRESS = "unix:path=/tmp/kept-bus";
    const env = censusEnv();
    assert.equal(env["XDG_RUNTIME_DIR"], uidSeat);
    assert.equal(env["DBUS_SESSION_BUS_ADDRESS"], "unix:path=/tmp/kept-bus");
  });
});

// law's other half): a property systemd did not print stays ABSENT on
// the row (no invented 0/0 pair, no invented restart count), and a
// journal tail that cannot be read is NAMED — never silent oom
// evidence, never a merged claim. Same real exec seam (fake bins on
// PATH), same status door as the consult walls above. Every arm
// here consults the census or the journal — win-gated as a block.
describe.skipIf(WIN_NO_SYSTEMD)("the census's unset words and silent journal — noise is never dressed as data", () => {
  it("a settled unit whose journal tail cannot be read names the absence — oom silence is never invented", async () => {
    mkRoot();
    fakeBin({
      systemctl: { out: SETTLED_SHOW, code: 0 },
      journalctl: { err: "Failed to connect to bus", code: 1 },
    });
    routeEngineUp();
    const [code, env] = await manage({ action: "status" });
    assert.equal(code, 200);
    assert.equal(env.state, "up", "a silent journal is absence, not degradation");
    assert.equal(env.detail, "server up");
    const data = env.data as unknown as StatusData;
    assert.equal(data.engine_unit.known, true);
    assert.equal(data.engine_unit.verdict, "settled");
    assert.equal(data.engine_unit.oom_kills, undefined, "a journal that cannot answer leaves the oom count ABSENT, not zero");
    assert.match(String(data.engine_unit.note), /the journal tail could not be read for oom lines/);
    assert.match(String(data.engine_unit.note), /Command failed: journalctl/);
    assert.doesNotMatch(String(data.engine_unit.note), /degraded/);
  });

  it("a degraded unit with a silent journal appends the absence to the cause note — the two words never merge into one claim", async () => {
    mkRoot();
    fakeBin({
      systemctl: { out: DEGRADED_SHOW, code: 0 },
      journalctl: { err: "Failed to connect to bus", code: 1 },
    });
    routeEngineUp();
    const [code, env] = await manage({ action: "status" });
    assert.equal(code, 200);
    assert.equal(env.state, "degraded");
    const data = env.data as unknown as StatusData;
    assert.equal(data.engine_unit.verdict, "degraded");
    assert.match(
      String(data.engine_unit.note),
      /degraded by the restart loop \(>= 2\) and a SIGKILL last exit — systemd restarted the engine; read the journal tail for the death cause \(the journal tail could not be read for oom lines/,
    );
    assert.equal(data.engine_unit.oom_kills, undefined, "the degraded row carries no invented oom count either");
  });

  it("THE UNSET-ENUM LAW — an exit code word with no status number carries the code alone, never a 0/0 pair", async () => {
    mkRoot();
    fakeBin({
      systemctl: { out: "ExecMainCode=exited\n", code: 0 },
      journalctl: { out: "INFO: engine ready\n", code: 0 },
    });
    routeEngineUp();
    const [code, env] = await manage({ action: "status" });
    assert.equal(code, 200);
    assert.equal(env.state, "up", "absent words alone never degrade");
    const data = env.data as unknown as StatusData;
    assert.equal(data.engine_unit.known, true);
    assert.equal(data.engine_unit.restarts, undefined, "no restart word — no invented restart count");
    assert.equal(data.engine_unit.last_exit_code, "exited");
    assert.equal(data.engine_unit.last_exit_status, undefined, "a word-form code with no status number carries the code alone");
    assert.equal(data.engine_unit.oom_kills, 0, "the journal answered clean — the count is carried as zero, honestly");
    assert.equal(data.engine_unit.verdict, "settled");
    assert.equal(data.engine_unit.note, undefined);
  });

  it("a restart counter with no exit words settles without exit noise", async () => {
    mkRoot();
    fakeBin({
      systemctl: { out: "NRestarts=1\n", code: 0 },
      journalctl: { out: "INFO: engine ready\n", code: 0 },
    });
    routeEngineUp();
    const [code, env] = await manage({ action: "status" });
    assert.equal(code, 200);
    assert.equal(env.state, "up");
    const data = env.data as unknown as StatusData;
    assert.equal(data.engine_unit.known, true);
    assert.equal(data.engine_unit.restarts, 1);
    assert.equal(data.engine_unit.last_exit_code, undefined, "no exit word — no exit code invented");
    assert.equal(data.engine_unit.last_exit_status, undefined);
    assert.equal(data.engine_unit.verdict, "settled");
    assert.equal(data.engine_unit.note, undefined);
  });

  it("a SIGKILL last exit degrades on its own — below the restart floor the loop cause is not claimed", async () => {
    mkRoot();
    fakeBin({
      systemctl: { out: "NRestarts=1\nExecMainStatus=9\nExecMainCode=killed\n", code: 0 },
      journalctl: { out: "INFO: engine ready\nINFO: loaded krea-2\n", code: 0 },
    });
    routeEngineUp();
    const [code, env] = await manage({ action: "status" });
    assert.equal(code, 200);
    assert.equal(env.state, "degraded");
    assert.match(env.detail, /server degraded \(restarts 1, last exit 9\/KILL/);
    const data = env.data as unknown as StatusData;
    assert.equal(data.engine_unit.verdict, "degraded");
    assert.match(
      String(data.engine_unit.note),
      /degraded by a SIGKILL last exit — systemd restarted the engine; read the journal tail for the death cause/,
    );
    assert.doesNotMatch(String(data.engine_unit.note), /restart loop/, "one restart never claims the loop law");
    assert.doesNotMatch(String(data.engine_unit.note), /memory pressure/, "a clean journal never claims the oom lever");
  });
});

describe.skipIf(WIN_NO_SYSTEMD)("the logs truth — the source stamp (D3-02 / R-2)", () => {
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
    assert.match(env.detail, /engine application log: no engine application log at/);
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
    assert.match(String(data.app_log.note), /byo endpoint's user-owned engine tree named one/);
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
