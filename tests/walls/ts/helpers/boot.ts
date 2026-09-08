// helpers/boot.ts — hermetic sandbox-gateway boots for the walls plane.
//
// Every boot mints a FRESH state root (mkdtemp) plus a fixture repo root
// carrying only an inference.config.json — the real tree is never
// touched, the live PROD gateway (:33081) is never addressed (ephemeral
// port via the READY handshake), and ComfyUI native (:18466) is never
// called (fixture configs carry no endpoint url). Erasable syntax only.
import { spawn } from "node:child_process";
import type { ChildProcess } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here: string = dirname(fileURLToPath(import.meta.url));
/** helpers/ is four levels below the repo root (the uploads.ts pattern). */
export const REPO_ROOT: string = resolve(here, "..", "..", "..", "..");

export interface Sandbox {
  readonly port: number;
  readonly proc: ChildProcess;
  /** Fixture MELITE_REPO_ROOT (minimal config tree). */
  readonly repoRoot: string;
  /** Fresh MELITE_STATE_ROOT (dies with the OS tmp parent). */
  readonly stateRoot: string;
  readonly token: string;
}

export interface HttpOut {
  readonly status: number;
  readonly bytes: Buffer;
  readonly contentType: string;
}

function writeFixtureRepo(): string {
  const dir: string = mkdtempSync(join(tmpdir(), "wall-ts-repo-"));
  writeFileSync(
    join(dir, "inference.config.json"),
    JSON.stringify(
      { models: { read_root: join(dir, "models"), download_root: join(dir, "models") }, engines: {} },
      null,
      2,
    ),
  );
  return dir;
}

function readyPort(proc: ChildProcess, deadlineMs: number): Promise<number> {
  return new Promise((resolvePort, reject): void => {
    const timer: ReturnType<typeof setTimeout> = setTimeout((): void => {
      reject(new Error("gateway did not print READY in time"));
    }, deadlineMs);
    let buf = "";
    const onData = (chunk: Buffer): void => {
      buf += chunk.toString("utf-8");
      const m: RegExpMatchArray | null = /^READY (\d+)/m.exec(buf);
      if (m !== null) {
        clearTimeout(timer);
        (proc.stdout as unknown as { off(e: string, f: unknown): void }).off("data", onData);
        resolvePort(Number(m[1]));
      }
    };
    (proc.stdout as unknown as { on(e: string, f: unknown): void }).on("data", onData);
    proc.on("exit", (code: number | null): void => {
      clearTimeout(timer);
      reject(new Error("gateway exited before READY (rc=" + code + ")"));
    });
  });
}

/** Boot one sandbox gateway; the caller owns reaping (try/finally). */
export async function bootSandbox(opts: {
  mcpBin: string;
  token: string;
  /** Copy the product catalog data into the fixture repo so catalog
   *  legs hit the designed path (the fixture would otherwise ENOENT —
   *  a sandbox artifact, never the served shape). Read-only fixture
   *  use, exactly like the identical inference.config.json. */
  seedCatalog?: boolean;
}): Promise<Sandbox> {
  const repoRoot: string = writeFixtureRepo();
  if (opts.seedCatalog === true) {
    const rel = "packages/engines/comfyui/models/provisions.json";
    const dst: string = join(repoRoot, rel);
    mkdirSync(join(repoRoot, "packages", "engines", "comfyui", "models"), { recursive: true });
    copyFileSync(join(REPO_ROOT, rel), dst);
  }
  const stateRoot: string = mkdtempSync(join(tmpdir(), "wall-ts-state-"));
  const env: Record<string, string> = {};
  for (const [k, v] of Object.entries(process.env)) {
    if (v !== undefined) env[k] = v;
  }
  env["MELITE_STATE_ROOT"] = stateRoot;
  env["MELITE_REPO_ROOT"] = repoRoot;
  env["MELITE_COMFY_MCP_BIN"] = opts.mcpBin;
  env["DSH_GATEWAY_TOKEN"] = opts.token;
  delete env["GATEWAY_PORT"];
  const proc: ChildProcess = spawn(
    process.execPath,
    ["--experimental-strip-types", join(REPO_ROOT, "apps", "gateway", "src", "main.ts")],
    { cwd: REPO_ROOT, env, stdio: ["ignore", "pipe", "ignore"], detached: true },
  );
  try {
    const port: number = await readyPort(proc, 30000);
    // Boot wait (any HTTP status proves the listener is up).
    const deadline: number = Date.now() + 15000;
    for (;;) {
      try {
        await http(port, "GET", "/v1/health", { token: opts.token });
        break;
      } catch {
        if (Date.now() > deadline) throw new Error("sandbox gateway never served /v1/health");
        await new Promise((r: (v: unknown) => void): ReturnType<typeof setTimeout> => setTimeout(r, 200));
      }
    }
    return { port, proc, repoRoot, stateRoot, token: opts.token };
  } catch (e) {
    reap(proc);
    throw e;
  }
}

/** SIGTERM, bounded wait, kill — a deliberate teardown manufactures
 *  zero zombies (the tests/_bootstrap.py reap law). */
export function reap(proc: ChildProcess): void {
  try {
    proc.kill("SIGTERM");
  } catch {
    return;
  }
  const killer: ReturnType<typeof setTimeout> = setTimeout((): void => {
    try {
      proc.kill("SIGKILL");
    } catch {
      /* gone */
    }
  }, 15000);
  proc.on("exit", (): void => {
    clearTimeout(killer);
  });
}

export async function http(
  port: number,
  method: string,
  target: string,
  opts: { body?: string | Uint8Array; token?: string; contentType?: string } = {},
): Promise<HttpOut> {
  const headers: Record<string, string> = {};
  if (opts.token !== undefined) headers["authorization"] = "Bearer " + opts.token;
  if (opts.contentType !== undefined) headers["content-type"] = opts.contentType;
  const init: { method: string; headers: Record<string, string>; body?: unknown } = { method, headers };
  if (opts.body !== undefined) init.body = opts.body;
  const res: Response = await fetch(
    "http://127.0.0.1:" + port + target,
    init as unknown as Parameters<typeof fetch>[1],
  );
  return {
    status: res.status,
    bytes: Buffer.from(await res.arrayBuffer()),
    contentType: res.headers.get("content-type") ?? "",
  };
}

/** Parse-or-null (binary passthrough legs compare bytes instead). */
export function parsed(bytes: Buffer): unknown {
  try {
    return JSON.parse(bytes.toString("utf-8")) as unknown;
  } catch {
    return null;
  }
}
