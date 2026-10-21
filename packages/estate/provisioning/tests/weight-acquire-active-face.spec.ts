// @contract infra-provision-active-face
//
// weight-acquire-active-face.spec.ts — THE PROVISIONING ACTIVE FACE
// (the moss popup loop's last parent, operator burn 2026-11-09/10:
// the operator's face rendered "(active:recheck) — run again when
// ready" forever on operation cd085c9ba5624217fefc0af665822787 whose
// item carried integrity "declared-sha256" — sha-verified, exact
// size, bytes on disk — and every re-accept minted a NEW operation
// for the same weight: THREE completed VAE ops exist in
// data/runtime/provisioning/ (cd085c9b, 9dfe1a72, f634607f).
//
// THE TWO LAWS:
//
// 1. THE ACCEPTANCE LAW — the store's own vocabulary says
//    outcome "active" IS success (service.ts aggregateOutcome filters
//    outcome==="active"/"restart_required" as the succeeded set), yet
//    the acquire face never accepted its own success word: the
//    operation's LEDGER row kept the live-flight phase word ("recheck"
//    — the present-file re-check voice) after the operation SETTLED,
//    and the door's "(state:phase)" composition minted
//    "(active:recheck)" — a settled row wearing a live-flow word. A
//    face that reads the phase waits for a transition that never
//    comes. THE CURE AT THE TRUTH SOURCE: a settled row sheds the
//    phase — the phase belongs to the flight, not the landing — so
//    every face composing from the row renders the ready voice.
//
// 2. THE NO-RE-MINT LAW — a poll or popup accept may never mint a NEW
//    operation for a weight an already-settled op covers: the mint
//    door returns the EXISTING settled operation id when the ask is
//    covered by settled SUCCESS items (outcome active/restart_required
//    with integrity declared-sha256 or size-checked). A settled
//    FAILED op still mints fresh (the retry law, weight-acquire-stuck
//    ARM 5); a discarded row still mints fresh (the delete exit).
//
// REAL SERVICE, FAKED TRANSPORT (the weight-streams boundary — the
// proven harness of weight-acquire-phase.spec.ts).
import { afterEach, describe, expect, test } from "vitest";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Context } from "@deepseek-ai/cordis";
import { FileOperationStore, ProvisioningService } from "../src/index.ts";
import type {
  ArtifactWriterPort,
  ProvisionPlan,
  ProvisioningConfig,
  ResourceRef,
} from "../src/index.ts";

const contexts: Context[] = [];
const roots: string[] = [];

afterEach(async () => {
  for (const context of contexts.splice(0)) await context.fiber.dispose();
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function tempRoot(prefix: string): string {
  const root = mkdtempSync(join(tmpdir(), prefix));
  roots.push(root);
  return root;
}

const TOTAL = 249_521_340; // the burn's own declared VAE size
const FULL = Buffer.alloc(64, 7);
const DIGEST = createHash("sha256").update(FULL).digest("hex");

function ref(): Extract<ResourceRef, { kind: "model" }> {
  return { kind: "model", owner: "family", id: "moss-image" };
}

function item(name = "flux2-vae_small.safetensors"): Extract<NonNullable<ProvisionPlan["items"][number]>, { kind: "model" }> {
  return {
    kind: "model",
    key: `model:family:moss-image:::${name}`,
    owner: "family",
    id: "moss-image",
    name,
    folder: "vae",
    url: "https://example.invalid/" + name,
    sha256: DIGEST,
    sizeBytes: TOTAL,
    required: true,
    provider: "direct",
  };
}

function plan(items: ReturnType<typeof item>[]): ProvisionPlan {
  return { ref: ref(), items };
}

/** THE PRESENT STORE (the burn's shape): the declared bytes are
 *  already on disk and sha-verified — every acquire settles active
 *  without a fetch, exactly like op cd085c9b did. */
function presentWriter(): ArtifactWriterPort {
  return {
    inspect: async () => ({ present: true as const, sha256: DIGEST, sizeBytes: TOTAL }),
    write: async () => { throw new Error("a present verified file never writes"); },
  };
}

/** The missing-file writer + a fetch that lands the bytes: the
 *  two-call inspect sequence (pre-check miss, post-land confirm). */
function landingWriter(): ArtifactWriterPort {
  let calls = 0;
  return {
    inspect: async () => {
      calls += 1;
      return calls === 1 ? { present: false as const } : { present: true as const, sha256: DIGEST, sizeBytes: TOTAL };
    },
    write: async (request) => ({
      path: join(request.root, request.relativePath),
      sha256: DIGEST,
      sizeBytes: TOTAL,
      integrity: "declared-sha256",
    }),
  };
}

function config(root: string, writer: ArtifactWriterPort, over: Partial<ProvisioningConfig> = {}): ProvisioningConfig {
  return {
    declaration: { resolve: async (): Promise<ProvisionPlan> => plan([item()]) },
    storeRoot: root,
    artifactWriter: writer,
    fetcher: async () => ({
      status: 200,
      body: (async function* generate(): AsyncGenerator<Uint8Array> { yield FULL; })(),
    }),
    ...over,
  };
}

async function untilSettled(
  service: ProvisioningService,
  id: string,
): Promise<NonNullable<ReturnType<ProvisioningService["progressOf"]>>> {
  const deadline = Date.now() + 5_000;
  for (;;) {
    const row = service.progressOf(id);
    if (row !== null && row.state !== "acquiring" && row.state !== "verifying") return row;
    if (Date.now() >= deadline) {
      throw new Error("the flight never settled — the poll saw " + JSON.stringify(service.progressOf(id)));
    }
    await new Promise((resolve) => { setTimeout(resolve, 10); });
  }
}

/** THE DOOR'S OWN COMPOSITION (managePlane hAcquireWeight's poll
 *  voice): `(state)` or `(state:phase)` — every acquire face reads
 *  THIS sentence shape off the ledger row. */
function doorVoice(row: { state: string; phase?: string }): string {
  return "(" + row.state + (row.phase === undefined ? "" : ":" + row.phase) + ")";
}

describe("the provisioning active face (the acceptance law + the no-re-mint law)", () => {
  test("WALL A — a settled active+verified acquire renders the ready voice: the ledger row sheds the live phase, the door composition reads (active), never (active:recheck)", async () => {
    const context = new Context();
    contexts.push(context);
    const service = new ProvisioningService(context, config(tempRoot("provisioning-active-face-"), presentWriter()));

    const id = await service.startWeightAcquire(ref());
    const row = await untilSettled(service, id);
    assert.equal(row.state, "active", "the burn's op settled active — the store's own success word");
    assert.equal(row.bytes, TOTAL, "the confirmed present file counts its declared bytes (the F9 law)");
    assert.equal(row.total, TOTAL);
    expect(row.phase,
      "a SETTLED active+verified op still carries the live-flight phase on its ledger row — the door composes '(active:" +
      String(row.phase) + ")' from it and every phase-reading face waits for a recheck transition that never comes " +
      "(the operator's popup burned forever on exactly this row). The phase belongs to the flight, not the landing.",
    ).toBeUndefined();
    expect(doorVoice(row),
      "the door's status voice must read the ready word for a landed op — never a live-flow word on a settled row",
    ).toBe("(active)");

    // the persisted row IS the ready verdict (the store's vocabulary
    // accepts its own success word)
    const stored = service.operationOf(ref());
    assert.ok(stored !== undefined);
    assert.equal(stored.operationId, id);
    assert.equal(stored.state, "active");
    assert.equal(stored.outcome, "active");
    assert.ok(stored.finishedAt !== undefined, "a settled op is finished");
    for (const entry of stored.items) {
      assert.equal(entry.state, "active");
      assert.ok(
        entry.integrity === "declared-sha256" || entry.integrity === "size-checked",
        "the settled item carries a verified integrity word, never an unverified one",
      );
    }
  });

  test("WALL A2 — a fetched (not pre-present) landing sheds the phase too: the settled row of a real stream reads (active)", async () => {
    const context = new Context();
    contexts.push(context);
    const service = new ProvisioningService(context, config(tempRoot("provisioning-active-face-"), landingWriter()));

    const id = await service.startWeightAcquire(ref());
    const row = await untilSettled(service, id);
    assert.equal(row.state, "active");
    expect(row.phase,
      "a landed stream's settled row must not keep its last live phase (" + String(row.phase) + ") — same acceptance law",
    ).toBeUndefined();
  });

  test("WALL A3 — the blocking ensure path sheds the phase: the executeEnsure seed's recheck voice dies at the settle", async () => {
    const context = new Context();
    contexts.push(context);
    const service = new ProvisioningService(context, config(tempRoot("provisioning-active-face-"), presentWriter()));

    const result = await service.ensure(ref());
    assert.equal(result.state, "active");
    const row = service.progressOf(result.operationId);
    assert.ok(row !== null, "the blocking path seeds the ledger");
    expect(row.phase,
      "the blocking ensure's settled row carries the opening seed phase (" + String(row.phase) + ") — the same lie on the second door",
    ).toBeUndefined();
  });

  test("WALL A4 — a restart_required settle (the extension arm) sheds its live phase: no queue word rides the settled row", async () => {
    const context = new Context();
    contexts.push(context);
    const extensionPlan: ProvisionPlan = {
      ref: { kind: "extension", id: "pack" },
      items: [{
        kind: "extension",
        key: "extension:pack",
        id: "pack",
        url: "https://example.invalid/pack.git",
        required: true,
        provider: "manager",
      }],
    };
    const service = new ProvisioningService(context, {
      declaration: { resolve: async (): Promise<ProvisionPlan> => extensionPlan },
      storeRoot: tempRoot("provisioning-active-face-"),
      manager: { install: async () => ({ installed: true }) },
    });

    const result = await service.ensure({ kind: "extension", id: "pack" });
    assert.equal(result.state, "restart_required");
    const row = service.progressOf(result.operationId);
    assert.ok(row !== null);
    expect(row.phase,
      "a settled restart_required op keeps its drain phase (" + String(row.phase) + ") — restart IS the engine's success word, the face must render it settled",
    ).toBeUndefined();
  });

  test("WALL B — an accept against a settled op's weight returns the SAME operationId: the mint door dedupes, never a third duplicate", async () => {
    const context = new Context();
    contexts.push(context);
    const service = new ProvisioningService(context, config(tempRoot("provisioning-active-face-"), presentWriter()));

    const first = await service.startWeightAcquire(ref());
    await untilSettled(service, first);

    // the popup's re-accept: the SAME family + the SAME file ask
    const second = await service.startWeightAcquire(ref(), { items: ["flux2-vae_small.safetensors"] });
    expect(second,
      "the settled verified op covers this weight — a re-accept minted a NEW operation id (the burn minted three: cd085c9b, 9dfe1a72, f634607f for one VAE)",
    ).toBe(first);

    // the whole-family accept dedupes the same way
    const third = await service.startWeightAcquire(ref());
    expect(third).toBe(first);

    // and the settled op stays one: the store holds a single row for the ref
    assert.equal(service.operationOf(ref())?.operationId, first);
  });

  test("WALL B2 — the dedupe is bounded by real coverage: a one-file settled op does not cover a DIFFERENT file's ask", async () => {
    const context = new Context();
    contexts.push(context);
    const two = plan([item("flux2-vae_small.safetensors"), item("qwen3.5_9b_w4a8_gptq.safetensors")]);
    const service = new ProvisioningService(context, {
      ...config(tempRoot("provisioning-active-face-"), presentWriter()),
      declaration: { resolve: async (): Promise<ProvisionPlan> => two },
    });

    const first = await service.startWeightAcquire(ref(), { items: ["flux2-vae_small.safetensors"] });
    await untilSettled(service, first);

    // the settled op covered ONLY the VAE — the tokenizer ask is not covered
    const second = await service.startWeightAcquire(ref(), { items: ["qwen3.5_9b_w4a8_gptq.safetensors"] });
    expect(second,
      "a file the settled op never covered must mint its own fetch — coverage by key, never by ref alone",
    ).not.toBe(first);
    await untilSettled(service, second);

    // once THAT file settles verified too, its ask dedupes
    const third = await service.startWeightAcquire(ref(), { items: ["qwen3.5_9b_w4a8_gptq.safetensors"] });
    expect(third).toBe(second);
  });

  test("WALL B3 — the retry law stands: a settled FAILED op's accept mints a FRESH fetch, and a discarded row's accept mints fresh (the delete exit)", async () => {
    const context = new Context();
    contexts.push(context);
    let calls = 0;
    const failing: ArtifactWriterPort = {
      inspect: async () => {
        calls += 1;
        return calls <= 2 ? { present: false as const } : { present: true as const, sha256: DIGEST, sizeBytes: TOTAL };
      },
      write: async () => { throw new Error("the first fetch never lands"); },
    };
    const service = new ProvisioningService(context, config(tempRoot("provisioning-active-face-"), failing));

    const failedId = await service.startWeightAcquire(ref(), { items: ["flux2-vae_small.safetensors"] });
    const failedRow = await untilSettled(service, failedId);
    assert.equal(failedRow.state, "failed", "the fetch failed — the engine judged");

    const retried = await service.startWeightAcquire(ref(), { items: ["flux2-vae_small.safetensors"] });
    expect(retried,
      "a FAILED settle never covers a weight — the retry mints a fresh fetch (weight-acquire-stuck ARM 5's law)",
    ).not.toBe(failedId);
    await untilSettled(service, retried);

    // the delete exit: the operator discarded the settled success row
    service.discardAcquire(retried);
    assert.equal(service.progressOf(retried), null, "the discarded row is gone from the ledger");
    // an id the plane never held discards as a quiet no-op (the door's
    // idempotent delete — never a throw, never a coverage memory left)
    assert.doesNotThrow(() => { service.discardAcquire("never-minted-id"); });
    const afterDiscard = await service.startWeightAcquire(ref(), { items: ["flux2-vae_small.safetensors"] });
    expect(afterDiscard,
      "a discarded settled row covers nothing — the door mints fresh, the operator cleared the wedge",
    ).not.toBe(retried);
  });

  test("WALL B4 — the dedupe survives the restart: a settled verified store row rehydrates and the mint door answers its id", async () => {
    const storeRoot = tempRoot("provisioning-active-face-store-");
    const firstContext = new Context();
    contexts.push(firstContext);
    const first = new ProvisioningService(firstContext, config(storeRoot, presentWriter(), {
      operationStore: new FileOperationStore(storeRoot),
    }));
    const originalId = await first.startWeightAcquire(ref());
    await untilSettled(first, originalId);
    await firstContext.fiber.dispose();
    contexts.splice(contexts.indexOf(firstContext), 1);

    const secondContext = new Context();
    contexts.push(secondContext);
    const second = new ProvisioningService(secondContext, config(storeRoot, presentWriter(), {
      operationStore: new FileOperationStore(storeRoot),
    }));
    // the boot rehydrate is eventually-consistent by law (audit E3:
    // the boot never blocks on the store) — the accept rides the
    // seeded ledger, the same convention as weight-acquire-restart
    // ARMs 8/9
    const deadline = Date.now() + 5_000;
    while (second.progressOfRef(ref()) === null && Date.now() < deadline) {
      await new Promise((resolve) => { setTimeout(resolve, 10); });
    }
    // the boot rehydrate joins the settled row to the ledger
    const reaccept = await second.startWeightAcquire(ref());
    expect(reaccept,
      "the settled verified op survived the restart in the store — a re-accept after the restart must answer ITS id, never mint a duplicate",
    ).toBe(originalId);
  });

  test("WALL B5 — the coverage memory evicts with the row: past the settled cap the oldest rows are forgotten everywhere, so their asks mint fresh", async () => {
    const context = new Context();
    contexts.push(context);
    // a per-family declaration: each ref resolves its own one-item plan
    const families = Array.from({ length: 503 }, (_v, i) => `fam-${String(i).padStart(3, "0")}`);
    const service = new ProvisioningService(context, {
      declaration: {
        resolve: async (ask: ResourceRef): Promise<ProvisionPlan> => {
          if (ask.kind !== "model") throw new Error("model refs only");
          return {
            ref: ask,
            items: [{
              kind: "model",
              key: `model:family:${ask.id}:::weight.bin`,
              owner: "family",
              id: ask.id,
              name: "weight.bin",
              folder: "vae",
              url: "https://example.invalid/" + ask.id + "/weight.bin",
              sha256: DIGEST,
              sizeBytes: TOTAL,
              required: true,
              provider: "direct",
            }],
          };
        },
      },
      storeRoot: tempRoot("provisioning-active-face-"),
      artifactWriter: presentWriter(),
      fetcher: async () => ({ status: 200, body: (async function* generate(): AsyncGenerator<Uint8Array> { yield FULL; })() }),
    });

    // the blocking door settles synchronously, so 503 settles walk the
    // plane straight past MAX_SETTLED_ACQUIRES — the oldest rows evict
    const ids: string[] = [];
    for (const id of families) {
      const result = await service.ensure({ kind: "model", owner: "family", id });
      assert.equal(result.state, "active");
      ids.push(result.operationId);
    }
    // the oldest settled rows are evicted from the ledger
    assert.equal(service.progressOf(ids[0]!), null, "the oldest settled row is evicted past the cap");

    // THE NO-RE-MINT MEMORY EVICTS WITH THE ROW: the evicted row's ask
    // is forgotten — the accept mints a fresh fetch instead of
    // answering an id the ledger no longer holds (a 404 poll)
    const reaccept = await service.startWeightAcquire({ kind: "model", owner: "family", id: "fam-000" });
    expect(reaccept,
      "an accept onto an EVICTED id would 404 at the poll forever — the eviction must clear the dedupe memory too",
    ).not.toBe(ids[0]);
  });

  test("WALL B6 — an ask whose plan will not resolve proves no coverage: the dedupe skips and the fresh mint answers honestly", async () => {
    const context = new Context();
    contexts.push(context);
    let calls = 0;
    const service = new ProvisioningService(context, {
      declaration: {
        resolve: async (): Promise<ProvisionPlan> => {
          calls += 1;
          if (calls > 1) throw new Error("the declaration refuses the second resolve");
          return plan([item()]);
        },
      },
      storeRoot: tempRoot("provisioning-active-face-"),
      artifactWriter: presentWriter(),
    });

    const first = await service.startWeightAcquire(ref());
    await untilSettled(service, first);

    // the re-accept names a file but the plan resolve fails — coverage
    // cannot be proven against keys, so the dedupe must NOT answer the
    // settled id (a fake-ready answer); the fresh mint fails loud
    const second = await service.startWeightAcquire(ref(), { items: ["flux2-vae_small.safetensors"] });
    expect(second, "an unprovable ask never dedupes onto the settled id").not.toBe(first);
    const row = await untilSettled(service, second);
    assert.equal(row.state, "failed", "the declaration refusal lands as the fresh op's verdict");
  });

  test("WALL B7 — an ask that narrows to zero items covers nothing: the dedupe skips, the mint refuses item-not-found", async () => {
    const context = new Context();
    contexts.push(context);
    const service = new ProvisioningService(context, config(tempRoot("provisioning-active-face-"), presentWriter()));

    const first = await service.startWeightAcquire(ref());
    await untilSettled(service, first);

    const second = await service.startWeightAcquire(ref(), { items: ["unknown.bin"] });
    expect(second, "an empty narrow is not coverage — the mint runs and the ensure refuses").not.toBe(first);
    const row = await untilSettled(service, second);
    assert.equal(row.state, "blocked", "the empty selection is the ensure's loud refusal, never a silent no-op");
    const stored = service.operationOf(ref());
    assert.ok(stored !== undefined && stored.operationId === second);
    assert.equal(stored.outcome, "blocked");
  });

  test("WALL C — the store's success-vocabulary arm: the settled row's verdict IS the ready reading (active + verified integrity by ref)", async () => {
    const context = new Context();
    contexts.push(context);
    const service = new ProvisioningService(context, config(tempRoot("provisioning-active-face-"), presentWriter()));

    const id = await service.startWeightAcquire(ref());
    await untilSettled(service, id);

    // the store vocabulary arm: outcome active/restart_required IS the
    // succeeded set (service.ts aggregateOutcome) — the persisted row
    // reads as success, and the by-ref pointer serves it
    const byRef = service.progressOfRef(ref());
    assert.ok(byRef !== null, "the by-ref pointer serves the settled op");
    assert.equal(byRef.operationId, id);
    assert.equal(byRef.state, "active");
    const stored = service.operationOf(ref());
    assert.ok(stored !== undefined);
    assert.ok(
      stored.outcome === "active" || stored.outcome === "restart_required",
      "the store's success word rides the persisted row — the vocabulary arm stays green",
    );
  });
});
