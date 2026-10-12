// runs-stop-pump.spec.ts — W11, THE STOP-PUMP CONTRACTS (2026-10-22,
// the D23 owed half): W8 pins the stopped words PURE; nothing drove
// the REAL pump end-to-end — press → stopFlag → the executor's stop
// probe (or the queued-stop skip) → settle → THE MIRROR → the draft
// row, with no browser tab alive. These walls boot the FULL estate
// glue (timer, queue, storage, drafts, runs, the comfyui host) over
// one mkdtemp state root, point the host at a PARKING fake ComfyUI
// (accepts /prompt, never leaves /queue, answers /interrupt, opens a
// silent ws), and drive both stop arms through RunsRuntimeService:
//   A. the RUNNING stop — the executor's stop probe interrupts, the
//      run settles stopped, the draft row flips with the run receipt;
//   B. the QUEUED stop — the flag is pressed while the row still sits
//      behind the serial pump; the queued-stop skip settles it with
//      NO engine touch and the mirror's run-word fallback flips the
//      row anyway (the hunt §1 wound, end-to-end).
// A regression that strands the row (a settle that never fires, a
// mirror that skips the stopped word, a pump that renders the queued
// stop anyway) goes RED here.
import { createServer, type Server, type IncomingMessage } from "node:http";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import type { Socket } from "node:net";
import { test } from "vitest";
import assert from "node:assert/strict";
import { Context, type Plugin } from "@deepseek-ai/cordis";
import timerPlugin from "@deepseek-ai/cordis-plugin-timer";
import draftsPlugin from "@melite/estate-drafts";
import Storage from "@deepseek-ai/dsh-storage";
import {
  apply as jsonApply, Config as JsonConfig, inject as jsonInject, name as jsonName,
} from "@deepseek-ai/dsh-storage-json";
import {
  apply as domainApply, Config as DomainConfig, inject as domainInject, name as domainName,
} from "@deepseek-ai/dsh-storage-domain";
import { comfyuiHostProvider } from "../../../../packages/engines/comfyui-cordis/src/comfyui-host.ts";
import queuePlugin, {
  cardRegistryProvider,
  runsRegistryPlugin,
} from "../../../../packages/harness/estate-queue/src/index.ts";
import type { RunsRuntimeService } from "../../../../packages/harness/estate-queue/src/runsRegistry.ts";
import { runsRemotePlugin } from "@melite/estate-runs";
import type { RunStartDoc } from "@melite/estate-runs";

const WS_GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";

/** The parking fake: the real protocol's reads, never a completion.
 *  /queue always carries the prompt (the wait loop never sees a left
 *  membership); /history answers the empty doc; /interrupt is a
 *  plain 200 (the stop door's bounded interrupt); the ws upgrade
 *  opens SILENT — connected (no transport-down streak) but no
 *  progress frames, so the stop must arrive through the probe, not
 *  the event stream. */
const startParkingEngine = (): Promise<{ url: string; close: () => void; promptCount: () => number }> =>
  new Promise((done) => {
    let prompts = 0;
    const server: Server = createServer((req, res): void => {
      const path = (req.url ?? "").split("?")[0];
      if (req.method === "POST" && path === "/prompt") {
        let body = "";
        req.on("data", (c: Buffer) => { body += String(c); });
        req.on("end", (): void => {
          prompts++;
          res.setHeader("content-type", "application/json");
          res.end(JSON.stringify({ prompt_id: "p-stop-pump", node_errors: {} }));
        });
        return;
      }
      if (path === "/queue") {
        res.setHeader("content-type", "application/json");
        res.end(JSON.stringify({
          queue_running: [{ prompt: [0, "p-stop-pump", [], {}, []] }],
          queue_pending: [],
        }));
        return;
      }
      if (path.startsWith("/history")) {
        res.setHeader("content-type", "application/json");
        res.end(JSON.stringify({}));
        return;
      }
      if (req.method === "POST" && path === "/interrupt") {
        res.end("{}");
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
    server.on("upgrade", (req: IncomingMessage, socket: Socket): void => {
      const key = String(req.headers["sec-websocket-key"] ?? "");
      const accept = createHash("sha1").update(key + WS_GUID).digest("base64");
      socket.write(
        "HTTP/1.1 101 Switching Protocols\r\n" +
        "Upgrade: websocket\r\nConnection: Upgrade\r\n" +
        "Sec-WebSocket-Accept: " + accept + "\r\n\r\n",
      );
      // silence is the point — the probe owns the exit
      socket.on("data", (): void => { /* client frames ignored */ });
    });
    server.listen(0, "127.0.0.1", (): void => {
      const addr = server.address();
      done({
        url: "http://127.0.0.1:" + (typeof addr === "object" && addr ? addr.port : 0),
        close: (): void => { server.close(); },
        promptCount: (): number => prompts,
      });
    });
  });

interface Booted {
  ctx: Context;
  runs: RunsRuntimeService;
  fiber: { dispose(): Promise<void> };
}

/** The FULL estate glue (runs-remote.spec's boot) + the comfyui
 *  host provider pinned at the fake — the executor's engine seat
 *  resolves to the parking engine instead of the loud miswire. */
async function bootWithEngine(base: string): Promise<Booted> {
  const stateRoot = join(mkdtempSync(join(tmpdir(), "runs-stop-pump-")), "state");
  mkdirSync(join(stateRoot, "drafts"), { recursive: true });
  for (const id of ["d_ok", "d_two"]) {
    writeFileSync(join(stateRoot, "drafts", id + ".json"), JSON.stringify({
      draft_id: id,
      status: "draft",
      createdAt: 1700000000000,
      completedAt: null,
      intent: "test " + id,
      stages: [{ id: "s_0", inputs: [""], provenance: "agent" }],
    }));
  }
  const ctx = new Context();
  await ctx.plugin(timerPlugin as unknown as Plugin);
  await ctx.plugin(comfyuiHostProvider as unknown as Plugin, { url: base });
  const fiber = ctx.plugin(queuePlugin as unknown as Plugin, { stateRoot });
  await fiber;
  await ctx.plugin(Storage as unknown as Plugin);
  await ctx.plugin(
    { name: jsonName, inject: jsonInject, apply: jsonApply, Config: JsonConfig } as unknown as Plugin,
    { root: join(stateRoot, "storage") },
  );
  await ctx.plugin(
    { name: domainName, inject: domainInject, apply: domainApply, Config: DomainConfig } as unknown as Plugin,
    { backend: "json" },
  );
  await ctx.plugin(draftsPlugin as unknown as Plugin, { storageRoot: join(stateRoot, "storage") });
  await ctx.plugin(cardRegistryProvider as unknown as Plugin);
  await ctx.plugin(runsRegistryPlugin as unknown as Plugin);
  await ctx.plugin(runsRemotePlugin as unknown as Plugin);
  const runs = (ctx as unknown as { runs: RunsRuntimeService });
  return { ctx, runs: runs.runs, fiber };
}

/** One inline flow body (single comfyui stage) — the same shape the
 *  runs-remote walls submit. */
function inlineBody(draftId: string): RunStartDoc {
  return {
    draft_id: draftId,
    test: true,
    flow_inline: {
      id: "f_test",
      stages: [
        { id: "s_0", engine: "comfyui", params: { workflow: { "1": { class_type: "KSampler" } } } },
      ],
    },
  };
}

/** Poll a read until the word lands or the budget dies — the pump is
 *  async by design; a wall never sleeps a fixed guess. */
async function until(read: () => Promise<string>, want: string, ms: number, what: string): Promise<string> {
  const end = Date.now() + ms;
  let seen = "";
  while (Date.now() < end) {
    seen = await read();
    if (seen === want) return seen;
    await new Promise((r) => setTimeout(r, 50));
  }
  throw new Error("never reached " + JSON.stringify(want) + " (" + what + "): last " + JSON.stringify(seen));
}

const statusOf = async (runs: RunsRuntimeService, id: string, sig: AbortSignal): Promise<Record<string, unknown>> =>
  await runs.status(id, sig) as Record<string, unknown>;

test("W11 THE STOP-PUMP CONTRACTS: the running stop converges its draft row through the real settle; the queued stop settles engine-free and still flips its row — no tab alive", async () => {
  const base = await startParkingEngine();
  const { ctx, runs, fiber } = await bootWithEngine(base.url);
  const sig = new AbortController().signal;
  try {
    // A parks the serial pump on the fake engine — the row flips
    // running inside runOne before the merged submit hangs
    const a = await runs.start(inlineBody("d_ok"), sig);
    await until(async () => String((await statusOf(runs, a.run_id, sig))["status"]), "running", 20000, "A running");
    // B queues behind A and takes the stop press BEFORE its claim —
    // the flag rides, no render is ever paid
    const b = await runs.start(inlineBody("d_two"), sig);
    await until(async () => String((await statusOf(runs, b.run_id, sig))["status"]), "queued", 5000, "B queued");
    await runs.stop(b.run_id, sig);
    // A's stop: the row moves to stopping at the press; the
    // executor's stop probe (polled inside every wait iteration)
    // interrupts the parking engine and the catch arm settles
    await runs.stop(a.run_id, sig);
    await until(async () => String((await statusOf(runs, a.run_id, sig))["status"]), "stopped", 20000, "A stopped");
    // A settles → the pump loops → claims B → reads the flag → the
    // queued-stop skip settles B with zero engine calls
    await until(async () => String((await statusOf(runs, b.run_id, sig))["status"]), "stopped", 20000, "B stopped");

    // THE RUN FACES: A's stage carries the interrupted voice
    const stagesA = (await statusOf(runs, a.run_id, sig))["stages"] as Array<Record<string, unknown>>;
    assert.equal(stagesA[0]?.["status"], "stopped");
    assert.match(String(stagesA[0]?.["error"] ?? ""), /stop/i);

    // THE DRAFT FACES (the whole point — no client ever touched
    // these docs): both rows flipped terminal through the settle
    // mirror, each carrying its own run receipt
    for (const [doc, receipt] of [["d_ok", a], ["d_two", b]] as const) {
      let row: Record<string, unknown> = {};
      for (let i = 0; i < 100; i++) {
        const served = await ctx.draftsRemote.get(doc, sig) as Record<string, unknown>;
        row = ((served["stages"] as Array<Record<string, unknown>>).find((s) => s["id"] === "s_0"))!;
        if (row["runStatus"] === "stopped") break;
        await new Promise((r) => setTimeout(r, 50));
      }
      assert.equal(row["runStatus"], "stopped", doc + "'s row flipped without any tab");
      const face = row["result"] as Record<string, unknown>;
      assert.equal(face["run_id"], receipt.run_id, doc + "'s row names its run");
    }
    // THE ENGINE-TOUCH LAW: exactly ONE submit crossed the wire — A's
    // merged submit. B's stop was pressed while it sat queued; the
    // queued-stop skip settles it at claim time. A world without the
    // skip claims B and POSTs /prompt anyway (the executor probe
    // still converges the state — the render cost is the defect).
    assert.equal(base.promptCount(), 1, "the queued stop never costs an engine submit");
  } finally {
    await fiber.dispose();
    base.close();
  }
}, 90000);
