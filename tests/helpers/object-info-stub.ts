// object-info-stub.ts — the keyless CENSUS SERVER for specs that
// spawn the compose door as a real SUBPROCESS (cli.spec.ts,
// real-card-wire.spec.ts). The door's boot fetches /object_info from
// the engine (cli.ts's boot line), and a fresh clone has no engine:
// the subprocess died on "fetch failed" before its own law could be
// judged. This helper launches a dedicated responder PROCESS (see
// object-info-stub-child.mjs for why it cannot live in this event
// loop: spawnSync freezes the caller, deadlocking any in-loop
// server) serving the tracked boot double
// (tests/walls/fixtures/object_info.boot.json — the same census the
// in-process hermetic engine rides, tests/helpers/hermetic-engine.ts)
// on a 127.0.0.1 free port. The caller points COMFYUI_URL at the
// returned URL before spawning: resolveEngineBaseUrl reads the env
// FIRST (src/comfyui-config.ts), so the subprocess resolves the stub
// and the spec's law is the thing under judgment, never the machine's
// engine seat. Keyless everywhere; the in-process vi.mock seam stays
// the walls' primary cure — this is only for the process boundary.
import { spawn, type ChildProcess } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

let STUB: ChildProcess | null = null;
let URL_ = "";

/** Launch the census responder and resolve to its base URL (no
 *  trailing slash). Idempotent: a second call returns the live URL. */
export function startObjectInfoStub(): Promise<string> {
  if (URL_ !== "" && STUB !== null) return Promise.resolve(URL_);
  const censusPath = fileURLToPath(
    new URL("../walls/fixtures/object_info.boot.json", import.meta.url),
  );
  // fail fast if the fixture is missing — never a silent empty census
  readFileSync(censusPath, "utf8");
  const childScript = fileURLToPath(
    new URL("./object-info-stub-child.mjs", import.meta.url),
  );
  return new Promise<string>((resolve, reject) => {
    const child = spawn(process.execPath, [childScript, censusPath], {
      stdio: ["ignore", "pipe", "inherit"],
    });
    let out = "";
    const onData = (d: Buffer): void => {
      out += d.toString();
      const line = out.split("\n").find((l) => l.startsWith("http://"));
      if (line !== undefined) {
        child.stdout?.off("data", onData);
        STUB = child;
        URL_ = line.trim();
        resolve(URL_);
      }
    };
    child.stdout?.on("data", onData);
    child.on("error", reject);
    child.on("exit", (code) => {
      if (URL_ === "") reject(new Error(`census stub exited before serving (code ${String(code)})`));
    });
  });
}

/** Kill the responder process. Safe when nothing was started. */
export function stopObjectInfoStub(): void {
  if (STUB === null) return;
  const dead = STUB;
  STUB = null;
  URL_ = "";
  dead.kill();
}
