// cards-registry-prime-bound.spec.ts — primeObjectInfo's bound
// (the gate-37 production wound, 2026-11-07): the boot census was
// the ONLY unbounded fetch on the estate boot path, so a wedged
// engine hung every boot behind it forever. These arms pin the
// bound against REAL sockets (a hanging server, a live one) — no
// barrel mock: the deadline lives in the transport's oiFuse, and
// a mock would bypass the very door under judgment (the
// acquire-weight fixture-socket precedent). Toggle the
// boundMs passthrough out of primeObjectInfo and the wedged arm
// hangs to the vitest timeout — that is the firing proof.
import { describe, expect, it } from "vitest";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { Context } from "@deepseek-ai/cordis";
import { CardRegistryService } from "../src/cardsRegistry.ts";
import { FlowsSeatService } from "../src/flowsData.ts";

async function serve(handler: (res: import("node:http").ServerResponse) => void): Promise<{ srv: Server; base: string }> {
  const srv = createServer((_req, res) => handler(res));
  await new Promise<void>((resolve) => srv.listen(0, "127.0.0.1", resolve));
  const addr = srv.address() as AddressInfo;
  return { srv, base: "http://127.0.0.1:" + String(addr.port) };
}

function bootSvc(): CardRegistryService {
  const ctx = new Context();
  new FlowsSeatService(ctx);
  return new CardRegistryService(ctx);
}

describe("primeObjectInfo's bound (a wedged census degrades, never hangs)", () => {
  it("a hanging /object_info degrades in boundMs — false, null doc, finite wait", async () => {
    const { srv, base } = await serve(() => {
      // never responds: the wedged engine
    });
    const prev = process.env["COMFYUI_URL"];
    process.env["COMFYUI_URL"] = base;
    try {
      const svc = bootSvc();
      const started = Date.now();
      expect(await svc.primeObjectInfo(50)).toBe(false);
      expect(Date.now() - started).toBeLessThan(5_000);
      expect(svc.objectInfo()).toBeNull();
    } finally {
      if (prev === undefined) delete process.env["COMFYUI_URL"];
      else process.env["COMFYUI_URL"] = prev;
      srv.close();
    }
  });

  it("a live census inside the bound still primes true", async () => {
    const { srv, base } = await serve((res) => {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ BoundNode: { input: { required: {} }, output: [], output_name: [] } }));
    });
    const prev = process.env["COMFYUI_URL"];
    process.env["COMFYUI_URL"] = base;
    try {
      const svc = bootSvc();
      expect(await svc.primeObjectInfo(5_000)).toBe(true);
      expect(svc.objectInfo()).not.toBeNull();
    } finally {
      if (prev === undefined) delete process.env["COMFYUI_URL"];
      else process.env["COMFYUI_URL"] = prev;
      srv.close();
    }
  });
});
