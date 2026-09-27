import { afterEach, describe, test, vi } from "vitest";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Context } from "@deepseek-ai/cordis";

const urlState = vi.hoisted(() => ({ start: "" }));

vi.mock("node:url", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:url")>();
  return {
    ...actual,
    fileURLToPath: (value: string | URL): string => urlState.start || actual.fileURLToPath(value),
  };
});

import {
  CARD_BUILD_PREFIX,
  apply as mediaApply,
  cardBuildStamps,
  repoRootOf,
} from "@melite/estate-media";

type Handler = (req: { method?: string; url?: string }, res: {
  writeHead(status: number, headers: Record<string, string>): void;
  end(body?: unknown): void;
}) => void | Promise<void>;

const roots: string[] = [];

afterEach(() => {
  urlState.start = "";
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function root(): string {
  const value = mkdtempSync(join(tmpdir(), "estate-media-edges-"));
  roots.push(value);
  return value;
}

async function cardHandler(): Promise<Handler> {
  const ctx = new Context();
  const rows: Array<{ path: string; handler: Handler }> = [];
  const original = ctx.get.bind(ctx);
  ctx.get = ((name: string, optional?: boolean) => name === "webServer"
    ? { register: (row: { path: string; handler: Handler }) => { rows.push(row); return () => undefined; } }
    : original(name, optional)) as typeof ctx.get;
  const load = ctx.plugin as unknown as (plugin: unknown) => PromiseLike<unknown>;
  await load({ name: "media-edge-probe", apply: mediaApply } as never);
  const row = rows.find((entry) => entry.path === CARD_BUILD_PREFIX);
  assert.ok(row !== undefined);
  return row.handler;
}

describe("estate media remaining paths", () => {
  test("cardBuildStamps skips package files and missing package roots", () => {
    const withFile = root();
    mkdirSync(join(withFile, "packages"), { recursive: true });
    writeFileSync(join(withFile, "packages", "not-a-directory"), "x");
    assert.deepEqual(cardBuildStamps(withFile), {});
    assert.deepEqual(cardBuildStamps(root()), {});
  });

  test("repoRootOf exhausts its bounded walk without a manifest", () => {
    const deep = root();
    let start = deep;
    for (let index = 0; index < 10; index += 1) start = join(start, "nested");
    assert.equal(repoRootOf(join(start, "index.js")), null);
  });

  test("the card-build route serves an empty stamp map outside a workspace", async () => {
    const deep = root();
    let start = deep;
    for (let index = 0; index < 10; index += 1) start = join(start, "nested");
    urlState.start = join(start, "index.js");
    const handler = await cardHandler();
    const seen = { status: 0, body: "" };
    await handler({ method: "GET", url: CARD_BUILD_PREFIX }, {
      writeHead(status): void { seen.status = status; },
      end(body): void { if (body !== undefined) seen.body = String(body); },
    });
    assert.equal(seen.status, 200);
    assert.deepEqual(JSON.parse(seen.body), { stamps: {} });
  });
});
