/**
 * @melite/map-client — the MAP (Melite Agent Protocol v0) client SDK.
 *
 * DSH-shaped vocabulary: discover a card of typed tools, submit ONE task
 * through THE door, then poll/long-poll until terminal — artifacts come
 * back by reference (path + URL), never base64.
 *
 * Spec: docs/reference/MAP-SPEC.md. Zero dependencies; Bun and Node >= 18
 * both work (global fetch).
 */

export interface MapCardTool {
  id: string;
  label: string;
  genre: string | null;
  plugin: string | null;
  profiles: string[];
  models: string[];
  default_model: string;
  parameters: Record<string, unknown>;
  schema_ref: string;
}

export interface MapCard {
  protocol: string;
  agent: { id: string; name: string; description?: string };
  endpoints: Record<string, string>;
  artifact_kinds: string[];
  limits: { max_wait_seconds: number };
  tools: MapCardTool[];
}

export interface MapArtifact {
  name: string;
  stage: string | null;
  kind: string;
  path: string;
  url: string | null;
  size: number;
}

export interface MapTask {
  protocol: string;
  task_id: string;
  pipeline_run_id: string;
  name: string | null;
  status: string;
  terminal: boolean;
  progress: { completed: number; total: number };
  elapsed_s: number;
  artifacts: MapArtifact[];
  metrics: Record<string, unknown>;
  log_tail: string;
  error: string | null;
  links?: { self: string };
}

export interface SubmitInput {
  /** Rail form tag, e.g. "form_generate". Optional when `model` is given. */
  tool?: string;
  /** Model override; defaults to the tool's default_model. */
  model?: string;
  /** Generation params (untrusted server-side; family validates at run). */
  params: Record<string, unknown>;
  /** Bounded long-poll seconds (server clamps to limits.max_wait_seconds). */
  wait_seconds?: number;
}

export class MapError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body: unknown,
  ) {
    super(message);
    this.name = "MapError";
  }
}

export interface ClientOptions {
  apiKey?: string;
  fetchImpl?: typeof fetch;
}

export class MeliteMediaAgent {
  private readonly base: string;
  private readonly apiKey?: string;
  private readonly f: typeof fetch;

  constructor(baseUrl: string, opts: ClientOptions = {}) {
    this.base = baseUrl.replace(/\/+$/, "");
    this.apiKey = opts.apiKey;
    this.f = opts.fetchImpl ?? globalThis.fetch.bind(globalThis);
  }

  private headers(): Record<string, string> {
    return this.apiKey ? { authorization: `Bearer ${this.apiKey}` } : {};
  }

  private async req<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await this.f(this.base + path, {
      ...init,
      headers: { "content-type": "application/json", ...this.headers(), ...(init?.headers ?? {}) },
    });
    const text = await res.text();
    let body: unknown = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = { raw: text };
    }
    if (!res.ok) {
      const msg =
        body && typeof body === "object" && "error" in (body as Record<string, unknown>)
          ? String((body as Record<string, unknown>).error)
          : `HTTP ${res.status}`;
      throw new MapError(msg, res.status, body);
    }
    return body as T;
  }

  card(): Promise<MapCard> {
    return this.req<MapCard>("/v1/agent/card");
  }

  toolSchema(tool: string, model?: string): Promise<Record<string, unknown>> {
    const q = model ? `?model=${encodeURIComponent(model)}` : "";
    return this.req(`/v1/agent/tools/${encodeURIComponent(tool)}/schema${q}`);
  }

  async submit(input: SubmitInput): Promise<MapTask> {
    const body = await this.req<Record<string, unknown>>("/v1/agent/tasks", {
      method: "POST",
      body: JSON.stringify(input),
    });
    return body as unknown as MapTask;
  }

  status(taskId: string): Promise<MapTask> {
    return this.req<MapTask>(`/v1/agent/tasks/${encodeURIComponent(taskId)}`);
  }

  stop(taskId: string): Promise<{ task_id: string; status: string }> {
    return this.req(`/v1/agent/tasks/${encodeURIComponent(taskId)}/stop`, { method: "POST" });
  }

  list(limit = 50): Promise<{ count: number; tasks: Array<Record<string, unknown>> }> {
    return this.req(`/v1/agent/tasks?limit=${limit}`);
  }

  /** Poll until terminal. intervalMs default 1500. */
  async wait(
    taskId: string,
    opts: { timeoutMs?: number; intervalMs?: number } = {},
  ): Promise<MapTask> {
    const timeoutMs = opts.timeoutMs ?? 15 * 60_000;
    const intervalMs = opts.intervalMs ?? 1500;
    const deadline = Date.now() + timeoutMs;
    for (;;) {
      const task = await this.status(taskId);
      if (task.terminal) return task;
      if (Date.now() >= deadline) {
        throw new MapError(`timeout waiting for task ${taskId} (last status: ${task.status})`, 0, task);
      }
      await new Promise((r) => setTimeout(r, intervalMs));
    }
  }

  /** Submit + wait — the one-call convenience most agents use. */
  run(input: SubmitInput, waitOpts?: { timeoutMs?: number; intervalMs?: number }): Promise<MapTask> {
    return this.submit(input).then((t) =>
      t.terminal ? t : this.wait(t.task_id, waitOpts),
    );
  }

  /** Download an artifact's bytes to disk (Bun/Node 18+: node:fs/promises). */
  async saveArtifacts(task: MapTask, dir: string): Promise<string[]> {
    const { mkdirSync, writeFileSync } = await import("node:fs");
    mkdirSync(dir, { recursive: true });
    const saved: string[] = [];
    for (const art of task.artifacts) {
      const src = art.url
        ? this.base + art.url
        : art.path.startsWith("/") && typeof process !== "undefined"
          ? "file://" + art.path
          : null;
      if (!src || src.startsWith("file://")) {
        // same-machine caller: copy straight off the store path
        const bytes = await import("node:fs").then((fs) => fs.readFileSync(art.path));
        const dest = `${dir}/${task.task_id}-${art.name}${art.path.slice(art.path.lastIndexOf("."))}`;
        writeFileSync(dest, bytes);
        saved.push(dest);
        continue;
      }
      const res = await this.f(src, { headers: this.headers() });
      if (!res.ok) throw new MapError(`artifact fetch failed: ${res.status}`, res.status, null);
      const buf = Buffer.from(await res.arrayBuffer());
      const dest = `${dir}/${task.task_id}-${art.name}${art.path.slice(art.path.lastIndexOf("."))}`;
      writeFileSync(dest, buf);
      saved.push(dest);
    }
    return saved;
  }
}
