import { afterEach, describe, expect, test } from "vitest";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  ComfyUiManagerHttpClient,
  ComfyUiManagerProvider,
  FileOperationStore,
  InMemoryOperationStore,
  ManagerClientError,
  ManagerProviderError,
  postManagerPip,
  type ManagerInstallRequest,
  type ProvisionOperation,
} from "../src/index.ts";

const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function root(): string {
  const value = mkdtempSync(join(tmpdir(), "estate-provisioning-runtime-"));
  roots.push(value);
  return value;
}

function json(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json" },
  });
}

// The suite lib (ES2023 without DOM) has no global HeadersInit, and fetch
// headers arrive as a union (Headers | string[][] | record), so unwrap the
// content-type structurally through each union member.
function contentTypeOf(headers: unknown): string | undefined {
  if (headers === undefined) return undefined;
  if (headers instanceof Headers) return headers.get("content-type") ?? undefined;
  if (Array.isArray(headers)) {
    return headers.find(([name]) => name.toLowerCase() === "content-type")?.[1];
  }
  const record = headers as Record<string, string | undefined>;
  return record["content-type"] ?? record["Content-Type"];
}

function operation(): ProvisionOperation {
  return {
    operationId: "op-persisted",
    ref: { kind: "extension", id: "example-pack" },
    state: "active",
    outcome: "active",
    items: [{ key: "extension:example-pack", kind: "extension", state: "active" }],
    startedAt: 100,
    finishedAt: 200,
    detail: "persisted",
  };
}

describe("ComfyUI-Manager HTTP client", () => {
  test("surfaces HTTP refusal as a typed error", async () => {
    const client = new ComfyUiManagerHttpClient({
      baseUrl: "http://127.0.0.1:8188",
      requestTimeoutMs: 100,
      fetch: async (): Promise<Response> => json({ error: "allow_git_url_install" }, 403),
    });
    await assert.rejects(
      client.getJson("/customnode/installed"),
      (error: unknown) => error instanceof ManagerClientError
        && error.code === "http-refused"
        && error.status === 403
        && error.detail.includes("allow_git_url_install"),
    );
  });

  test("fails queue polling at the deadline", async () => {
    let polls = 0;
    const client = new ComfyUiManagerHttpClient({
      baseUrl: "http://127.0.0.1:8188",
      requestTimeoutMs: 20,
      fetch: async (): Promise<Response> => {
        polls += 1;
        return json({ total_count: 1, done_count: 0, in_progress_count: 0, is_processing: true });
      },
    });
    await assert.rejects(
      client.waitForQueue({ timeoutMs: 15, pollIntervalMs: 1 }),
      (error: unknown) => error instanceof ManagerClientError && error.code === "queue-timeout",
    );
    expect(polls).toBeGreaterThan(0);
  });
});

describe("ManagerPort provider", () => {
  test("installs the declared registry version without a latest fallback", async () => {
    const repository = "https://github.com/example/pack.git";
    const calls: Array<{ readonly path: string; readonly body: unknown }> = [];
    let queuePolls = 0;
    const fetcher: typeof globalThis.fetch = async (input, init): Promise<Response> => {
      const path = new URL(String(input)).pathname + new URL(String(input)).search;
      const body = typeof init?.body === "string" ? JSON.parse(init.body) as unknown : undefined;
      calls.push({ path, body });
      if (path === "/customnode/getlist?mode=cache&skip_update=true") {
        return json({
          channel: "default",
          node_packs: {
            "comfy.org/example": {
              id: "comfy.org/example",
              version: "1.0.0",
              repository,
              files: [repository],
              channel: "default",
              pip: [],
            },
          },
        });
      }
      if (path === "/customnode/versions/comfy.org%2Fexample") {
        return json([{ version: "1.0.0" }, { version: "2.0.0" }]);
      }
      if (path === "/manager/queue/install") return new Response(null, { status: 200 });
      if (path === "/manager/queue/start") return new Response(null, { status: 200 });
      if (path === "/manager/queue/status") {
        queuePolls += 1;
        return json({
          total_count: 1,
          done_count: queuePolls === 1 ? 0 : 1,
          in_progress_count: queuePolls === 1 ? 1 : 0,
          is_processing: queuePolls === 1,
        });
      }
      return json({ error: "not found" }, 404);
    };
    const provider = new ComfyUiManagerProvider(
      new ComfyUiManagerHttpClient({ baseUrl: "http://127.0.0.1:8188", fetch: fetcher }),
      { queue: { timeoutMs: 100, pollIntervalMs: 1 } },
    );
    const request: ManagerInstallRequest = {
      id: "example-pack",
      url: repository,
      registry: "comfy.org/example",
      version: "2.0.0",
    };
    expect(await provider.canInstall(request)).toBe(true);
    const result = await provider.install(request);
    const queued = calls.find((call) => call.path === "/manager/queue/install");
    assert.equal(result.installed, true);
    assert.deepEqual(queued?.body, {
      id: "comfy.org/example",
      version: "1.0.0",
      selected_version: "2.0.0",
      channel: "default",
      mode: "cache",
      ui_id: "example-pack",
      repository,
      files: [repository],
      pip: [],
      skip_post_install: false,
    });
  });

  test("accepts the Manager custom_nodes catalog shape", async () => {
    const repository = "https://github.com/example/legacy-pack.git";
    const fetcher: typeof globalThis.fetch = async (input): Promise<Response> => {
      const path = new URL(String(input)).pathname;
      if (path === "/customnode/getlist") {
        return json({
          custom_nodes: [{
            id: "comfy.org/legacy",
            reference: repository,
            version: "1.2.3",
            requirements: ["numpy"],
          }],
        });
      }
      if (path === "/customnode/versions/comfy.org%2Flegacy") {
        return json({ versions: [{ version: "1.2.3" }] });
      }
      return json({}, 404);
    };
    const provider = new ComfyUiManagerProvider(
      new ComfyUiManagerHttpClient({ baseUrl: "http://127.0.0.1:8188", fetch: fetcher }),
    );
    expect(await provider.canInstall({
      id: "legacy-pack",
      url: repository,
      registry: "comfy.org/legacy",
      version: "1.2.3",
    })).toBe(true);
  });

  test("routes an operator git URL through the Manager git endpoint", async () => {
    const calls: Array<{ path: string; body: unknown; contentType: string | undefined }> = [];
    const provider = new ComfyUiManagerProvider(
      new ComfyUiManagerHttpClient({
        baseUrl: "http://127.0.0.1:8188",
        fetch: async (input, init): Promise<Response> => {
          calls.push({
            path: new URL(String(input)).pathname,
            body: init?.body,
            contentType: contentTypeOf(init?.headers),
          });
          return new Response(null, { status: 200 });
        },
      }),
    );
    expect(await provider.canInstall({ id: "operator-pack", url: "https://github.com/example/operator-pack.git" })).toBe(true);
    expect((await provider.install({ id: "operator-pack", url: "https://github.com/example/operator-pack.git" })).installed).toBe(true);
    assert.deepEqual(calls, [{
      path: "/customnode/install/git_url",
      body: JSON.stringify({ url: "https://github.com/example/operator-pack.git" }),
      contentType: "application/json",
    }]);
  });

  test("posts declared pip requirements as the Manager JSON body", async () => {
    const calls: Array<{ path: string; body: unknown; contentType: string | undefined }> = [];
    const client = new ComfyUiManagerHttpClient({
      baseUrl: "http://127.0.0.1:8188",
      fetch: async (input, init): Promise<Response> => {
        calls.push({
          path: new URL(String(input)).pathname,
          body: init?.body,
          contentType: contentTypeOf(init?.headers),
        });
        return new Response(null, { status: 200 });
      },
    });
    await postManagerPip(client, ["numpy==2.0.0", "safetensors"]);
    assert.equal(calls.length, 1);
    assert.equal(calls[0]?.path, "/customnode/install/pip");
    assert.deepEqual(JSON.parse(String(calls[0]?.body)), { packages: "numpy==2.0.0 safetensors" });
    assert.equal(calls[0]?.contentType, "application/json");
  });

  test("installs the exact catalog-registered RT-DETR FP32 artifact through the Manager queue API", async () => {
    const url = "https://huggingface.co/Comfy-Org/SDPose/resolve/main/diffusion_models/rt_detr_v4-x-hgnet_fp32.safetensors";
    const catalogRow = {
      name: "Comfy-Org/SDPose RT-DETRv4 X FP32",
      type: "diffusion_model",
      base: "SDPose",
      save_path: "diffusion_models",
      url,
      filename: "rt_detr_v4-x-hgnet_fp32.safetensors",
    };
    const calls: Array<{ readonly path: string; readonly body: unknown; readonly contentType: string | undefined }> = [];
    let queuePolls = 0;
    const fetcher: typeof globalThis.fetch = async (input, init): Promise<Response> => {
      const requestUrl = new URL(String(input));
      const path = requestUrl.pathname + requestUrl.search;
      const body = typeof init?.body === "string" ? init.body : undefined;
      calls.push({ path, body, contentType: contentTypeOf(init?.headers) });
      if (path === "/externalmodel/getlist?mode=cache") return json({ models: [catalogRow] });
      if (path === "/manager/queue/install_model") return new Response(null, { status: 200 });
      if (path === "/manager/queue/start") return new Response(null, { status: 200 });
      if (path === "/manager/queue/status") {
        queuePolls += 1;
        return json({ total_count: 1, done_count: queuePolls === 1 ? 0 : 1, in_progress_count: queuePolls === 1 ? 1 : 0, is_processing: queuePolls === 1 });
      }
      return json({}, 404);
    };
    const provider = new ComfyUiManagerProvider(
      new ComfyUiManagerHttpClient({ baseUrl: "http://127.0.0.1:8188", fetch: fetcher }),
      { queue: { timeoutMs: 100, pollIntervalMs: 1 } },
    );
    const result = await provider.installModel({
      id: "model:card:mask:rt_detr_v4-x-hgnet_fp32.safetensors",
      name: "rt_detr_v4-x-hgnet_fp32.safetensors",
      savePath: "diffusion_models",
      url,
      filename: "rt_detr_v4-x-hgnet_fp32.safetensors",
    });
    assert.equal(result.installed, true);
    const queued = calls.find((call) => call.path === "/manager/queue/install_model");
    assert.deepEqual(JSON.parse(String(queued?.body)), {
      name: catalogRow.name,
      type: catalogRow.type,
      base: catalogRow.base,
      save_path: catalogRow.save_path,
      url,
      filename: catalogRow.filename,
      ui_id: "model:card:mask:rt_detr_v4-x-hgnet_fp32.safetensors",
    });
    assert.equal(queued?.contentType, "application/json");
  });

  test("refuses the unregistered RT-DETR FP32 artifact before queueing, even when only FP16 is listed", async () => {
    let queued = false;
    const fetcher: typeof globalThis.fetch = async (input): Promise<Response> => {
      const path = new URL(String(input)).pathname;
      if (path === "/externalmodel/getlist") {
        return json({
          models: [{
            name: "Comfy-Org/SDPose RT-DETRv4 X FP16",
            type: "diffusion_model",
            base: "SDPose",
            save_path: "diffusion_models",
            url: "https://huggingface.co/Comfy-Org/SDPose/resolve/main/diffusion_models/rt_detr_v4-x-hgnet_fp16.safetensors",
            filename: "rt_detr_v4-x-hgnet_fp16.safetensors",
          }],
        });
      }
      if (path === "/manager/queue/install_model") queued = true;
      return json({}, 200);
    };
    const provider = new ComfyUiManagerProvider(
      new ComfyUiManagerHttpClient({ baseUrl: "http://127.0.0.1:8188", fetch: fetcher }),
    );
    await assert.rejects(
      provider.installModel({
        id: "model:card:mask:rt_detr_v4-x-hgnet_fp32.safetensors",
        name: "rt_detr_v4-x-hgnet_fp32.safetensors",
        savePath: "diffusion_models",
        url: "https://huggingface.co/Comfy-Org/SDPose/resolve/main/diffusion_models/rt_detr_v4-x-hgnet_fp32.safetensors",
        filename: "rt_detr_v4-x-hgnet_fp32.safetensors",
      }),
      (error: unknown) => error instanceof ManagerProviderError
        && error.code === "model-unregistered"
        && /diffusion_models\/rt_detr_v4-x-hgnet_fp32\.safetensors/u.test(error.message),
    );
    assert.equal(queued, false, "no direct or queue download is attempted for an unregistered artifact");
  });

  test("queues a DECLARED row the catalog lacks, tagged for the manager-local model list", async () => {
    const url = "https://huggingface.co/fancyfeast/joytag/resolve/main/model.safetensors";
    const calls: Array<{ readonly path: string; readonly body: unknown }> = [];
    let queuePolls = 0;
    const fetcher: typeof globalThis.fetch = async (input, init): Promise<Response> => {
      const requestUrl = new URL(String(input));
      const path = requestUrl.pathname + requestUrl.search;
      const body = typeof init?.body === "string" ? init.body : undefined;
      calls.push({ path, body });
      if (path === "/externalmodel/getlist?mode=cache") return json({ models: [] });
      if (path === "/manager/queue/install_model") return new Response(null, { status: 200 });
      if (path === "/manager/queue/start") return new Response(null, { status: 200 });
      if (path === "/manager/queue/status") {
        queuePolls += 1;
        return json({ total_count: 1, done_count: queuePolls === 1 ? 0 : 1, in_progress_count: queuePolls === 1 ? 1 : 0, is_processing: queuePolls === 1 });
      }
      return json({}, 404);
    };
    const provider = new ComfyUiManagerProvider(
      new ComfyUiManagerHttpClient({ baseUrl: "http://127.0.0.1:8188", fetch: fetcher }),
      { queue: { timeoutMs: 100, pollIntervalMs: 1 } },
    );
    const result = await provider.installModel({
      id: "joytag/provision/model.safetensors",
      name: "model.safetensors",
      savePath: "taggers/joytag",
      url,
      filename: "model.safetensors",
      type: "melite",
      base: "melite",
    });
    assert.equal(result.installed, true);
    assert.match(result.detail ?? "", /declared row/u);
    const queued = calls.find((call) => call.path === "/manager/queue/install_model");
    assert.deepEqual(JSON.parse(String(queued?.body)), {
      name: "model.safetensors",
      type: "melite",
      base: "melite",
      save_path: "taggers/joytag",
      url,
      filename: "model.safetensors",
      ui_id: "joytag/provision/model.safetensors",
    });
  });

  test("a declared size raises the queue-drain budget past the extension-sized floor", async () => {
    // 8 GiB declared at the 1 MiB/s floor rate ⇒ a ~2.2 hour budget;
    // the queue below drains only on poll 5 (4 × 80ms = 320ms) — far
    // past the 150ms floor, far inside the sized budget.
    let queuePolls = 0;
    const fetcher: typeof globalThis.fetch = async (input): Promise<Response> => {
      const requestUrl = new URL(String(input));
      const path = requestUrl.pathname + requestUrl.search;
      if (path === "/externalmodel/getlist?mode=cache") return json({ models: [] });
      if (path === "/manager/queue/install_model" || path === "/manager/queue/start") {
        return new Response(null, { status: 200 });
      }
      if (path === "/manager/queue/status") {
        queuePolls += 1;
        return json({ total_count: 1, done_count: queuePolls >= 5 ? 1 : 0, in_progress_count: queuePolls >= 5 ? 0 : 1, is_processing: queuePolls < 5 });
      }
      return json({}, 404);
    };
    const provider = new ComfyUiManagerProvider(
      new ComfyUiManagerHttpClient({
        baseUrl: "http://127.0.0.1:8188",
        fetch: fetcher,
        queueTimeoutMs: 150,
        pollIntervalMs: 80,
      }),
    );
    const result = await provider.installModel({
      id: "big/provision/big.safetensors",
      name: "big.safetensors",
      savePath: "diffusion_models",
      url: "https://huggingface.co/x/big/resolve/main/big.safetensors",
      filename: "big.safetensors",
      type: "melite",
      base: "melite",
      sizeBytes: 8 * 1024 * 1024 * 1024,
    });
    assert.equal(result.installed, true);
    assert.equal(queuePolls, 5);

    // same queue, no declared size: the 150ms floor dies mid-drain
    let barePolls = 0;
    const bareFetcher: typeof globalThis.fetch = async (input): Promise<Response> => {
      const requestUrl = new URL(String(input));
      const path = requestUrl.pathname + requestUrl.search;
      if (path === "/externalmodel/getlist?mode=cache") return json({ models: [] });
      if (path === "/manager/queue/install_model" || path === "/manager/queue/start") {
        return new Response(null, { status: 200 });
      }
      if (path === "/manager/queue/status") {
        barePolls += 1;
        return json({ total_count: 1, done_count: barePolls >= 5 ? 1 : 0, in_progress_count: barePolls >= 5 ? 0 : 1, is_processing: barePolls < 5 });
      }
      return json({}, 404);
    };
    const bare = new ComfyUiManagerProvider(
      new ComfyUiManagerHttpClient({
        baseUrl: "http://127.0.0.1:8188",
        fetch: bareFetcher,
        queueTimeoutMs: 150,
        pollIntervalMs: 80,
      }),
    );
    await assert.rejects(
      bare.installModel({
        id: "big/provision/big.safetensors",
        name: "big.safetensors",
        savePath: "diffusion_models",
        url: "https://huggingface.co/x/big/resolve/main/big.safetensors",
        filename: "big.safetensors",
        type: "melite",
        base: "melite",
      }),
      (error: unknown) => error instanceof ManagerClientError && error.code === "queue-timeout",
    );
  });

  test("queues the Manager SAM2 row for the declared official Hugging Face URL", async () => {
    const declaredUrl = "https://huggingface.co/facebook/sam2.1-hiera-large/resolve/main/sam2.1_hiera_large.pt";
    const catalogUrl = "https://dl.fbaipublicfiles.com/segment_anything_2/092824/sam2.1_hiera_large.pt";
    const catalogRow = {
      name: "sam2.1_hiera_large.pt",
      type: "sam2.1",
      base: "SAM",
      save_path: "sams",
      url: catalogUrl,
      filename: "sam2.1_hiera_large.pt",
    };
    const calls: Array<{ path: string; body: unknown }> = [];
    const fetcher: typeof globalThis.fetch = async (input, init): Promise<Response> => {
      const requestUrl = new URL(String(input));
      const path = requestUrl.pathname + requestUrl.search;
      calls.push({ path, body: typeof init?.body === "string" ? JSON.parse(init.body) as unknown : undefined });
      if (path === "/externalmodel/getlist?mode=cache") return json({ models: [catalogRow] });
      if (path === "/manager/queue/install_model") return new Response(null, { status: 200 });
      if (path === "/manager/queue/start") return new Response(null, { status: 200 });
      if (path === "/manager/queue/status") {
        return json({ total_count: 1, done_count: 1, in_progress_count: 0, is_processing: false });
      }
      return json({}, 404);
    };
    const provider = new ComfyUiManagerProvider(
      new ComfyUiManagerHttpClient({ baseUrl: "http://127.0.0.1:8188", fetch: fetcher }),
      { queue: { timeoutMs: 100, pollIntervalMs: 1 } },
    );
    const result = await provider.installModel({
      id: "model:card:mask:sam2.1_hiera_large.pt",
      name: "sam2.1_hiera_large.pt",
      savePath: "models//sams/",
      url: declaredUrl,
      filename: "sam2.1_hiera_large.pt",
    });
    assert.equal(result.installed, true);
    assert.deepEqual(calls.find((call) => call.path === "/manager/queue/install_model")?.body, {
      name: catalogRow.name,
      type: "sam2.1",
      base: "SAM",
      save_path: "sams",
      url: catalogUrl,
      filename: catalogRow.filename,
      ui_id: "model:card:mask:sam2.1_hiera_large.pt",
    });
  });

  test("refuses an ambiguous external-model identity before queueing", async () => {
    let queued = false;
    const row = {
      name: "sam2.1_hiera_large.pt",
      type: "sam2.1",
      base: "SAM",
      save_path: "sams",
      url: "https://dl.fbaipublicfiles.com/segment_anything_2/092824/sam2.1_hiera_large.pt",
      filename: "sam2.1_hiera_large.pt",
    };
    const fetcher: typeof globalThis.fetch = async (input): Promise<Response> => {
      const path = new URL(String(input)).pathname + new URL(String(input)).search;
      if (path === "/externalmodel/getlist?mode=cache") {
        return json({ models: [row, { ...row, base: "SAM2" }] });
      }
      if (path === "/manager/queue/install_model") queued = true;
      return json({}, 200);
    };
    const provider = new ComfyUiManagerProvider(
      new ComfyUiManagerHttpClient({ baseUrl: "http://127.0.0.1:8188", fetch: fetcher }),
    );
    await assert.rejects(
      provider.installModel({
        id: "model:card:mask:sam2.1_hiera_large.pt",
        name: row.filename,
        savePath: "sams",
        url: row.url,
        filename: row.filename,
      }),
      (error: unknown) => error instanceof ManagerProviderError && error.code === "model-unregistered",
    );
    assert.equal(queued, false);
  });

  test("refuses incomplete catalog metadata before queueing", async () => {
    let queued = false;
    const fetcher: typeof globalThis.fetch = async (input): Promise<Response> => {
      const path = new URL(String(input)).pathname + new URL(String(input)).search;
      if (path === "/externalmodel/getlist?mode=cache") {
        return json({ models: [{
          name: "sam2.1_hiera_large.pt",
          type: "sam2.1",
          save_path: "sams",
          url: "https://dl.fbaipublicfiles.com/segment_anything_2/092824/sam2.1_hiera_large.pt",
          filename: "sam2.1_hiera_large.pt",
        }] });
      }
      if (path === "/manager/queue/install_model") queued = true;
      return json({}, 200);
    };
    const provider = new ComfyUiManagerProvider(
      new ComfyUiManagerHttpClient({ baseUrl: "http://127.0.0.1:8188", fetch: fetcher }),
    );
    await assert.rejects(
      provider.installModel({
        id: "model:card:mask:sam2.1_hiera_large.pt",
        name: "sam2.1_hiera_large.pt",
        savePath: "sams",
        url: "https://dl.fbaipublicfiles.com/segment_anything_2/092824/sam2.1_hiera_large.pt",
        filename: "sam2.1_hiera_large.pt",
      }),
      (error: unknown) => error instanceof ManagerProviderError && error.code === "model-metadata",
    );
    assert.equal(queued, false);
  });

  test("refuses an unavailable exact version before queueing", async () => {
    let queued = false;
    const fetcher: typeof globalThis.fetch = async (input): Promise<Response> => {
      const path = new URL(String(input)).pathname;
      if (path === "/customnode/getlist") {
        return json({
          node_packs: {
            pack: {
              id: "comfy.org/example",
              version: "1.0.0",
              repository: "https://github.com/example/pack.git",
            },
          },
        });
      }
      if (path === "/customnode/versions/comfy.org%2Fexample") {
        return json([{ version: "1.0.0" }]);
      }
      if (path === "/manager/queue/install") queued = true;
      return json({}, 200);
    };
    const provider = new ComfyUiManagerProvider(
      new ComfyUiManagerHttpClient({ baseUrl: "http://127.0.0.1:8188", fetch: fetcher }),
    );
    const supported = await provider.canInstall({
      id: "example-pack",
      url: "https://github.com/example/pack.git",
      registry: "comfy.org/example",
      version: "2.0.0",
    });
    expect(supported).toBe(false);
    expect(queued).toBe(false);
  });

  // THE SINGLE VENDOR (the extensions law, 2026-10-13). These two
  // tests REPLACE the pair that pinned the hand-rolled clone as
  // intended — one of them was literally named "routes a requested ref
  // only to the pinned git provider" and asserted httpCalls === 0, i.e.
  // that NO Manager request happened. The clone is gone: a declared ref
  // now rides Manager's git-url door and the estate verifies the
  // landed commit.
  test("a declared ref installs through Manager's git-url door with the pin in the url", async () => {
    const posts: Array<{ path: string; body: unknown }> = [];
    const gets: string[] = [];
    const client = new ComfyUiManagerHttpClient({
      baseUrl: "http://127.0.0.1:8188",
      fetch: async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
        const url = String(input);
        if (typeof init?.body === "string") posts.push({ path: url, body: JSON.parse(init.body) as unknown });
        else gets.push(url);
        if (url.endsWith("/customnode/installed")) {
          return json([{ aux_id: "https://github.com/example/pack", ver: "abc1234def5678" }]);
        }
        return json({ ok: true });
      },
    });
    const provider = new ComfyUiManagerProvider(client);
    const request: ManagerInstallRequest = {
      id: "example-pack",
      url: "https://github.com/example/pack.git",
      ref: "abc1234",
    };
    expect(await provider.canInstall(request)).toBe(true);
    const result = await provider.install(request);
    expect(result.installed).toBe(true);
    // the pin rides the url after '@' — Manager splits on the LAST '@'
    // and checks that commit out after a full clone
    expect(posts).toHaveLength(1);
    expect(posts[0]?.path).toContain("/customnode/install/git_url");
    expect(posts[0]?.body).toEqual({ url: "https://github.com/example/pack.git@abc1234" });
    // and the landed commit was verified, never assumed
    expect(gets.some((u) => u.endsWith("/customnode/installed"))).toBe(true);
    expect(result.detail).toContain("abc1234def5678");
  });

  test("a landed commit that is not the declared pin refuses head-mismatch", async () => {
    const client = new ComfyUiManagerHttpClient({
      baseUrl: "http://127.0.0.1:8188",
      fetch: async (input: string | URL | Request): Promise<Response> => {
        const url = String(input);
        if (url.endsWith("/customnode/installed")) {
          return json([{ aux_id: "https://github.com/example/pack", ver: "deadbeefdeadbeef" }]);
        }
        return json({ ok: true });
      },
    });
    const provider = new ComfyUiManagerProvider(client);
    await expect(provider.install({
      id: "example-pack",
      url: "https://github.com/example/pack.git",
      ref: "abc1234",
    })).rejects.toMatchObject({ code: "head-mismatch" });
  });

  test("a pack Manager installed with no commit cannot satisfy a declared pin", async () => {
    // a registry-zip install reports a VERSION, not a sha: the declared
    // ref is unverifiable by any means, and a lie about it must fail
    // closed rather than read as success
    const client = new ComfyUiManagerHttpClient({
      baseUrl: "http://127.0.0.1:8188",
      fetch: async (input: string | URL | Request): Promise<Response> => {
        const url = String(input);
        if (url.endsWith("/customnode/installed")) {
          return json([{ aux_id: "https://github.com/example/pack", ver: "8.28.3" }]);
        }
        return json({ ok: true });
      },
    });
    const provider = new ComfyUiManagerProvider(client);
    await expect(provider.install({
      id: "example-pack",
      url: "https://github.com/example/pack.git",
      ref: "abc1234",
    })).rejects.toMatchObject({ code: "ref-unverifiable" });
  });

  test("a branch name is refused at the declaration, before any request", async () => {
    let calls = 0;
    const client = new ComfyUiManagerHttpClient({
      baseUrl: "http://127.0.0.1:8188",
      fetch: async (): Promise<Response> => {
        calls += 1;
        return json({});
      },
    });
    const provider = new ComfyUiManagerProvider(client);
    const branch: ManagerInstallRequest = {
      id: "example-pack",
      url: "https://github.com/example/pack.git",
      ref: "main",
    };
    expect(await provider.canInstall(branch)).toBe(false);
    await expect(provider.install(branch)).rejects.toMatchObject({ code: "invalid-request" });
    expect(calls).toBe(0);
  });

  test("a malformed installed answer cannot satisfy a declared ref", async () => {
    // Manager's own door is a WIRE boundary: an answer that is not a
    // list, or a row with no identity, must read as "nothing landed"
    // rather than crashing or passing silently.
    for (const answer of [{ not: "a list" }, [{}]]) {
      const client = new ComfyUiManagerHttpClient({
        baseUrl: "http://127.0.0.1:8188",
        fetch: async (input: string | URL | Request): Promise<Response> => {
          const url = String(input);
          if (url.endsWith("/customnode/installed")) return json(answer);
          return json({ ok: true });
        },
      });
      const provider = new ComfyUiManagerProvider(client);
      await expect(provider.install({
        id: "example-pack",
        url: "https://github.com/example/pack.git",
        ref: "abc1234",
      })).rejects.toMatchObject({ code: "ref-unverifiable" });
    }
  });

  test("an installed row with no commit reads as unverifiable, not as a match", async () => {
    const client = new ComfyUiManagerHttpClient({
      baseUrl: "http://127.0.0.1:8188",
      fetch: async (input: string | URL | Request): Promise<Response> => {
        const url = String(input);
        if (url.endsWith("/customnode/installed")) {
          return json([{ aux_id: "https://github.com/example/pack" }]);
        }
        return json({ ok: true });
      },
    });
    const provider = new ComfyUiManagerProvider(client);
    await expect(provider.install({
      id: "example-pack",
      url: "https://github.com/example/pack.git",
      ref: "abc1234",
    })).rejects.toMatchObject({ code: "ref-unverifiable" });
  });

  test("an unpinned url installs with no verification and no ref", async () => {
    const posts: Array<{ path: string; body: unknown }> = [];
    const client = new ComfyUiManagerHttpClient({
      baseUrl: "http://127.0.0.1:8188",
      fetch: async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
        const url = String(input);
        if (typeof init?.body === "string") posts.push({ path: url, body: JSON.parse(init.body) as unknown });
        return json({ ok: true });
      },
    });
    const provider = new ComfyUiManagerProvider(client);
    const result = await provider.install({
      id: "example-pack",
      url: "https://github.com/example/pack.git",
    });
    expect(result.installed).toBe(true);
    expect(posts[0]?.body).toEqual({ url: "https://github.com/example/pack.git" });
  });
});

describe("operation stores", () => {
  test("persists an operation across file-store instances", async () => {
    const storeRoot = join(root(), "operations");
    const first = new FileOperationStore(storeRoot);
    const saved = operation();
    await first.save(saved);
    const loaded = await new FileOperationStore(storeRoot).load(saved.operationId);
    expect(loaded).toEqual(saved);
    Reflect.set(saved.items[0]!, "detail", "mutated");
    const isolated = await first.load(saved.operationId);
    expect(isolated?.items[0]?.detail).toBeUndefined();
  });

  test("keeps in-memory operation snapshots isolated", async () => {
    const store = new InMemoryOperationStore();
    const saved = operation();
    await store.save(saved);
    const loaded = await store.load(saved.operationId);
    expect(loaded).toEqual(saved);
    await store.remove(saved.operationId);
    expect(await store.load(saved.operationId)).toBeNull();
  });
});
