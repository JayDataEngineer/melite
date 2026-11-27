// systemd-fake.ts — the specs' own systemd (S1, 2026-11-27). The
// status face and the settle_stale judge read the engine unit's own
// start (ExecMainStartTimestamp) through `systemctl --user show`; a
// spec whose ctx names a unit a real systemd knows would leak the
// test box's boot into the row it judges. The helper seats two
// #!/bin/sh fakes on PATH — systemctl answering the settled shape
// with the start the test states, journalctl answering nothing —
// and owns PATH's restore. The stamp is systemd's own spelling
// under LC_ALL=C / TZ=UTC, the one form the census parses.
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

/** @param ms - the instant.
 *  @returns systemd's `Fri 2026-11-27 11:00:20 UTC` word for it. */
export function systemdStamp(ms: number): string {
  const d = new Date(ms);
  return DAYS[d.getUTCDay()] + " " + d.toISOString().slice(0, 19).replace("T", " ") + " UTC";
}

export interface FakeSystemd {
  /** Re-seat the unit: `startedMs` is the main process's start, or
   *  null for a unit with no running main process (empty stamp). */
  seat(startedMs: number | null): void;
  /** Drop the fakes and restore PATH. */
  rm(): void;
  /** The fake bin directory (a test may add bins beside the two). */
  dir: string;
}

/** @returns a seated fake (no start stamp) — PATH already points at
 *  it; call {@link FakeSystemd.rm} in afterAll. */
export function fakeSystemd(): FakeSystemd {
  const realPath = process.env.PATH ?? "";
  const dir = mkdtempSync(join(tmpdir(), "systemd-fake-"));
  const write = (name: string, body: string): void => {
    writeFileSync(join(dir, name), "#!/bin/sh\n" + body, "utf8");
    chmodSync(join(dir, name), 0o755);
  };
  const seat = (startedMs: number | null): void => {
    write("systemctl", "cat <<'PROPS'\nNRestarts=0\nExecMainStatus=0\nExecMainCode=n/a\nExecMainStartTimestamp=" + (startedMs === null ? "" : systemdStamp(startedMs)) + "\nPROPS\nexit 0\n");
    process.env.PATH = dir + ":" + realPath;
  };
  write("journalctl", "exit 0\n");
  seat(null);
  return {
    seat,
    dir,
    rm: (): void => {
      process.env.PATH = realPath;
      rmSync(dir, { recursive: true, force: true });
    },
  };
}
