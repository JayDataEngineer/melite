// comfy-step-tap.spec.ts — THE STEP-FRAME CONTRACTS (2026-10-22,
// the operator's "merged submit (1 stages, 10 nodes)" with no steps,
// round two): the executor-side liveness walls prove fold→seam with
// a FAKE engine; nothing proved the REAL ComfyUI wire → REAL tap →
// fold half. These walls drive executeSingle against a fake engine
// that speaks the REAL protocol (POST /prompt, GET /queue, GET
// /history, and a hand-rolled RFC6455 ws at /ws?clientId= serving
// real JSON frames). A regression that freezes the tile with zero
// step folds goes RED here — small, in-process, no engine.
import { describe, it, expect, vi } from "vitest";
import { createServer, type Server, type IncomingMessage } from "node:http";
import type { Socket } from "node:net";
import { createHash } from "node:crypto";
import { executeSingle } from "../../../../packages/engines/comfyui-cordis/src/comfyui-execute.ts";
import type { EngineJson } from "../../../../packages/engines/comfyui-cordis/src/comfyui-types.ts";

const PROMPT_ID = "p-step-tap-1";
const WS_GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";

interface Frame { type: string; data: Record<string, unknown> }

/** One RFC6455 TEXT frame, server→client (unmasked). Payloads stay
 *  under 125 bytes so the single-byte length form holds. */
const wsFrame = (payload: string): Buffer => {
  const body = Buffer.from(payload, "utf8");
  expect(body.length).toBeLessThan(126);
  return Buffer.concat([Buffer.from([0x81, body.length]), body]);
};

interface FakeEngineOpts {
  /** ws frames pushed the moment the socket opens (default: the real
   *  protocol's step trio). `null` connects but stays silent — the
   *  replay arm. */
  frames?: Array<Frame> | null;
  /** queue polls that still carry the prompt before it leaves. */
  runningPolls?: number;
  /** refuse the upgrade entirely (the additive-law arm). */
  refuseWs?: boolean;
}

interface FakeEngine {
  url: string;
  close: () => void;
  promptBodies: Array<Record<string, unknown>>;
}

const startFakeEngine = (opts: FakeEngineOpts = {}): Promise<FakeEngine> =>
  new Promise((done) => {
    const runningPolls = opts.runningPolls ?? 2;
    let polls = 0;
    const promptBodies: Array<Record<string, unknown>> = [];
    const server = createServer((req, res): void => {
      const path = (req.url ?? "").split("?")[0];
      if (req.method === "POST" && path === "/prompt") {
        let body = "";
        req.on("data", (c: Buffer) => { body += String(c); });
        req.on("end", (): void => {
          promptBodies.push(JSON.parse(body) as Record<string, unknown>);
          res.setHeader("content-type", "application/json");
          res.end(JSON.stringify({ prompt_id: PROMPT_ID, node_errors: {} }));
        });
        return;
      }
      if (path === "/queue") {
        polls++;
        const row = { prompt: [0, PROMPT_ID, [], {}, []] };
        const running = polls <= runningPolls ? [row] : [];
        res.setHeader("content-type", "application/json");
        res.end(JSON.stringify({ queue_running: running, queue_pending: [] }));
        return;
      }
      if (path === "/history/" + PROMPT_ID || path === "/history") {
        // the keyed doc serves both the prompt-keyed read (rawHistoryEntry)
        // and the SDK's own list poll (/history?max_items=N)
        res.setHeader("content-type", "application/json");
        res.end(JSON.stringify({
          [PROMPT_ID]: {
            status: { status_str: "success", completed: true },
            outputs: {},
          },
        }));
        return;
      }
      if (path === "/prompt" && req.method === "GET") {
        // the SDK's queue-poll fallback read
        res.setHeader("content-type", "application/json");
        res.end(JSON.stringify({ queue_running: [], queue_pending: [], exec_info: { queue_remaining: 0 } }));
        return;
      }
      if (path === "/system_stats") {
        res.setHeader("content-type", "application/json");
        res.end(JSON.stringify({ system: { os: "test" } }));
        return;
      }
      res.statusCode = 404;
      res.end("{}");
    });
    if (!opts.refuseWs) {
      server.on("upgrade", (req: IncomingMessage, socket: Socket): void => {
        const key = String(req.headers["sec-websocket-key"] ?? "");
        const accept = createHash("sha1").update(key + WS_GUID).digest("base64");
        socket.write(
          "HTTP/1.1 101 Switching Protocols\r\n" +
          "Upgrade: websocket\r\nConnection: Upgrade\r\n" +
          "Sec-WebSocket-Accept: " + accept + "\r\n\r\n",
        );
        const frames = opts.frames === undefined
          ? [
              { type: "progress", data: { value: 3, max: 10, node: "1", prompt_id: PROMPT_ID } },
              { type: "progress", data: { value: 9, max: 10, node: "1", prompt_id: PROMPT_ID } },
              { type: "executing", data: { node: "9", prompt_id: PROMPT_ID } },
              { type: "progress_text", data: { text: "sampler step 4", prompt_id: PROMPT_ID, node: "9" } },
              { type: "executing", data: { node: null, prompt_id: PROMPT_ID } },
            ]
          : opts.frames;
        // after the handshake the SDK has its listeners attached (the
        // tap hooks synchronously, the open event lands later), so
        // pumping here is the real engine's order.
        // null is the SILENT variant — a late upgrade against a
        // stopped engine answers the open, never a frame (an
        // unhandled TypeError here reds the whole tier's tail).
        for (const f of frames ?? []) socket.write(wsFrame(JSON.stringify(f)));
        socket.on("data", (): void => { /* client frames (close) ignored */ });
      });
    } else {
      server.on("upgrade", (_req: IncomingMessage, socket: Socket): void => {
        socket.write("HTTP/1.1 404 Not Found\r\n\r\n");
        socket.destroy();
      });
    }
    server.listen(0, "127.0.0.1", (): void => {
      const addr = server.address();
      const url = "http://127.0.0.1:" + (typeof addr === "object" && addr ? addr.port : 0);
      done({
        url,
        close: (): void => { server.close(); },
        promptBodies,
      });
    });
  });

interface Fold { at: number; updates: Record<string, EngineJson> }

const runAgainstFake = async (
  opts: FakeEngineOpts,
): Promise<{ folds: Fold[]; replaySuspect: boolean; engine: FakeEngine }> => {
  const engine = await startFakeEngine(opts);
  const folds: Fold[] = [];
  try {
    const out = await executeSingle(
      "/tmp/comfy-step-tap-run/x",
      { workflow: { "1": { class_type: "X", inputs: {} } } } as Record<string, EngineJson>,
      {},
      {
        report: (updates: Record<string, EngineJson>): void => {
          folds.push({ at: Date.now(), updates });
        },
      },
      engine.url,
    );
    return { folds, replaySuspect: out.replaySuspect, engine };
  } catch (e) {
    engine.close();
    throw e;
  }
};

describe("THE STEP-FRAME CONTRACTS (real engine wire, real tap)", () => {
  it("real ws progress frames fold into report steps before settle — the tile's steps, pinned", async () => {
    const { folds, replaySuspect, engine } = await runAgainstFake({});
    engine.close();
    // the three step voices, folded from the REAL ws protocol frames
    const voices = folds.map((f) => String(f.updates["activity"] ?? ""));
    expect(voices).toContain("sampling 3/10");
    expect(voices).toContain("sampling 9/10");
    expect(voices).toContain("node 9");
    expect(voices).toContain("sampler step 4");
    // the progress fold carries the shape the executor fold + UI consume
    const withProgress = folds.find((f) => f.updates["progress"] !== undefined);
    expect(withProgress?.updates["progress"]).toEqual({ value: 3, max: 10, node: "1" });
    // steps folded while the engine ran — the fold is mid-run, not post-hoc
    expect(folds.length).toBeGreaterThanOrEqual(4);
    expect(replaySuspect).toBe(false);
  }, 15000);

  it("ADDITIVE LAW: a refused ws never kills the run — the voiced warn rides, polls settle", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation((): void => {});
    const { folds, replaySuspect, engine } = await runAgainstFake({ refuseWs: true, runningPolls: 14 });
    engine.close();
    const voiced = warn.mock.calls.some((c) =>
      String(c[0] ?? "").includes("progress tap unavailable"),
    );
    warn.mockRestore();
    expect(voiced).toBe(true);
    expect(folds.length).toBe(0); // no socket, no folds — never a killed run
    expect(replaySuspect).toBe(false); // a DEAD tap withholds the verdict
  }, 15000);

  it("THE REPLAY VERDICT: a seated, silent tap with a completed run is named", async () => {
    const { replaySuspect, engine } = await runAgainstFake({ frames: null });
    engine.close();
    expect(replaySuspect).toBe(true); // alive tap + zero events = memo'd outputs
  }, 15000);
});
