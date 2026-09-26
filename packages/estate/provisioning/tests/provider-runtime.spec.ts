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
  PinnedGitExtensionProvider,
  type GitCommandRunner,
  type ManagerInstallRequest,
  type PinnedGitExtensionPort,
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
            contentType: init?.headers?.["content-type"] as string | undefined,
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
          contentType: init?.headers?.["content-type"] as string | undefined,
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
      calls.push({ path, body, contentType: init?.headers?.["content-type"] as string | undefined });
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

  test("routes a requested ref only to the pinned git provider", async () => {
    let httpCalls = 0;
    const client = new ComfyUiManagerHttpClient({
      baseUrl: "http://127.0.0.1:8188",
      fetch: async (): Promise<Response> => {
        httpCalls += 1;
        return json({}, 500);
      },
    });
    let received: ManagerInstallRequest | undefined;
    const git: PinnedGitExtensionPort = {
      canInstall: async (request): Promise<boolean> => request.ref === "release/2.0.0",
      install: async (request): Promise<{ installed: boolean; detail: string }> => {
        received = request;
        return { installed: true, detail: "pinned" };
      },
    };
    const provider = new ComfyUiManagerProvider(client, { git });
    const request: ManagerInstallRequest = {
      id: "example-pack",
      url: "https://github.com/example/pack.git",
      ref: "release/2.0.0",
      registry: "comfy.org/example",
    };
    expect(await provider.canInstall(request)).toBe(true);
    expect((await provider.install(request)).installed).toBe(true);
    expect(received?.ref).toBe("release/2.0.0");
    expect(httpCalls).toBe(0);
  });

  test("fetches a URL/ref row at that exact ref", async () => {
    const customNodesRoot = join(root(), "custom_nodes");
    const calls: string[][] = [];
    const runner: GitCommandRunner = {
      run: async (args): Promise<{ stdout: string; stderr: string }> => {
        calls.push([...args]);
        if (args[0] === "init") {
          const temporary = args.at(-1);
          assert.ok(temporary);
          mkdirSync(temporary);
        }
        return {
          stdout: args.includes("rev-parse") ? "a".repeat(40) : "",
          stderr: "",
        };
      },
    };
    const provider = new PinnedGitExtensionProvider({ customNodesRoot, runner });
    const result = await provider.install({
      id: "example-pack",
      url: "https://github.com/example/pack.git",
      ref: "release/2.0.0",
    });
    expect(result.installed).toBe(true);
    expect(existsSync(join(customNodesRoot, "example-pack"))).toBe(true);
    const fetch = calls.find((args) => args.includes("fetch"));
    expect(fetch).toContain("release/2.0.0");
    expect(calls.flat()).not.toContain("latest");
    expect(calls.flat()).not.toContain("master");
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
