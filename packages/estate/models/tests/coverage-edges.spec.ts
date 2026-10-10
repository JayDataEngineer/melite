import { afterEach, describe, test } from "vitest";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable } from "node:stream";
import {
  ModelsDoorError,
  apply,
  createHandler,
  createVerifyCache,
  resolveDest,
  type DoorDeps,
  type DoorResponse,
  type FetchFn,
} from "../src/index.ts";
import type { ProvisionResult, ProvisioningServiceDefinition } from "@melite/estate-provisioning";
import type { ProvisionRow } from "@melite/comfyui-cordis/model-contract";

const roots: string[] = [];
const BYTES = Buffer.from("estate-models-coverage");
const SHA = createHash("sha256").update(BYTES).digest("hex");
const BAD = Buffer.from("bad-models-coverage");

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function root(): string {
  const value = mkdtempSync(join(tmpdir(), "estate-models-edges-"));
  roots.push(value);
  return value;
}

function row(over: Partial<ProvisionRow> = {}): ProvisionRow {
  return {
    name: "artifact.bin",
    url: "https://example.invalid/artifact.bin",
    folder: "folder",
    sha256: SHA,
    ...over,
  };
}

function body(bytes: Buffer): ReadableStream<Uint8Array> {
  return Readable.toWeb(Readable.from([bytes])) as ReadableStream<Uint8Array>;
}

function response(over: Partial<DoorResponse> = {}): DoorResponse & { readonly seen: { status: number; body: string; destroyed: boolean } } {
  const seen = { status: 0, body: "", destroyed: false };
  return {
    headersSent: false,
    writeHead(status): void { seen.status = status; },
    // a fake door consumes every chunk whole: the write answers
    // "drained", and drain() resolves at once (the backpressure arm
    // is exercised where a real consumer answers false)
    write(chunk: Uint8Array): boolean {
      seen.body += Buffer.isBuffer(chunk) ? chunk.toString() : Buffer.from(chunk).toString();
      return true;
    },
    drain: async (): Promise<void> => { /* nothing is buffered here */ },
    end(value): void { if (value !== undefined) seen.body = Buffer.isBuffer(value) ? value.toString() : String(value); },
    destroy(): void { seen.destroyed = true; },
    seen,
    ...over,
  };
}

function result(over: Partial<ProvisionResult> = {}): ProvisionResult {
  return {
    operationId: "models-op",
    ref: { kind: "model", owner: "family", id: "family" },
    state: "active",
    outcome: "active",
    operationState: "active",
    items: [],
    restartRequired: false,
    ...over,
  };
}

function provisioning(value: ProvisionResult): ProvisioningServiceDefinition {
  return {
    inspect: async () => { throw new Error("unexpected inspect"); },
    plan: async () => { throw new Error("unexpected plan"); },
    ensure: async () => value,
    activate: async () => { throw new Error("unexpected activate"); },
    acquireExternal: async () => { throw new Error("unexpected external"); },
    reconcile: async () => [],
    stateOf: () => "unknown",
    operationOf: () => undefined,
    isLocked: () => false,
  };
}

function deps(over: Partial<DoorDeps> = {}): DoorDeps {
  return {
    cache: over.cache ?? createVerifyCache(),
    storeRoot: over.storeRoot ?? (() => root()),
    provisions: over.provisions ?? (async () => [row()]),
    fetchFn: over.fetchFn ?? (async () => ({ status: 200, body: body(BYTES) })),
    ...over,
  };
}

async function request(handler: ReturnType<typeof createHandler>, method = "GET", path = "/v1/models/family/provisions/artifact.bin"): Promise<ReturnType<typeof response>["seen"]> {
  const res = response();
  await handler({ method, url: path }, res);
  return res.seen;
}

describe("estate models remaining paths", () => {
  test("acquisition wraps non-Error and non-hash writer failures", async () => {
    const throwingSource = Object.create(null) as ReadableStream<Uint8Array>;
    Object.defineProperty(throwingSource, Symbol.asyncIterator, {
      get(): never { throw "raw source failure"; },
    });
    await assert.rejects(
      createVerifyCache().acquireRow(row(), join(root(), "artifact.bin"), async () => ({ status: 200, body: throwingSource })),
      (error: unknown) => error instanceof ModelsDoorError && error.code === "models/acquire-refused",
    );
    const errorSource = {
      async *[Symbol.asyncIterator](): AsyncIterator<Uint8Array> {
        throw new Error("source error");
      },
    } as AsyncIterable<Uint8Array>;
    await assert.rejects(
      createVerifyCache().acquireRow(row(), join(root(), "error.bin"), async () => ({ status: 200, body: errorSource as unknown as ReadableStream<Uint8Array> })),
      (error: unknown) => error instanceof ModelsDoorError && error.code === "models/acquire-refused",
    );
  });

  test("serveTarget refuses unavailable provisioning and non-active results", async () => {
    const noService = await request(createHandler(deps({
      provisioning: undefined,
      storeRoot: () => root(),
    })));
    assert.equal(noService.status, 503);
    const blocked = await request(createHandler(deps({
      storeRoot: () => root(),
      provisioning: provisioning(result({ state: "blocked", detail: "blocked detail" })),
    })));
    assert.equal(blocked.status, 502);
    assert.match(blocked.body, /blocked detail/);
    const failed = await request(createHandler(deps({
      storeRoot: () => root(),
      provisioning: provisioning(result({ state: "failed" })),
    })));
    assert.equal(failed.status, 502);
    assert.match(failed.body, /did not become active/);
  });

  test("serveTarget re-checks declared bytes after provisioning", async () => {
    const store = root();
    const dest = resolveDest(store, row().folder, row().name);
    mkdirSync(join(store, row().folder), { recursive: true });
    writeFileSync(dest, BAD);
    const seen = await request(createHandler(deps({
      storeRoot: () => store,
      provisioning: provisioning(result()),
    })));
    assert.equal(seen.status, 502);
    // the single-open re-verify names the path whose bytes disagree
    // (the old voice said only "did not produce the declared bytes")
    assert.match(seen.body, /do not match the declared sha256/);
  });

  test("apply warns and stays unmounted without provisioning", () => {
    const rows: unknown[] = [];
    const warnings: string[] = [];
    let effects = 0;
    const context = {
      get(name: string): unknown {
        if (name === "webServer") return { register: (row: unknown) => { rows.push(row); return () => undefined; } };
        return undefined;
      },
      effect(): () => void {
        effects += 1;
        return () => undefined;
      },
      logger: {
        info: (): void => undefined,
        warn: (message: string): void => { warnings.push(message); },
      },
    };
    apply(context as never);
    assert.equal(rows.length, 0);
    assert.equal(effects, 0);
    assert.equal(warnings.length, 1);
  });
});
