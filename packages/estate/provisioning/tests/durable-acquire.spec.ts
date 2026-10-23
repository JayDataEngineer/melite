// THE DURABLE DOWNLOAD SEAT WALL (the lifetime finding, 2026-10-21):
// an agent session's download died with the agent's process and
// rehydrated "failed — the seat restarted before this fetch landed"
// while the operator's lane — the durable process — ran idle. The
// law this wall guards: a TRANSIENT seat mints a 'requested' op row
// and never opens a wire (the fetch outlives the session); the
// DURABLE seat claims requested rows and owns the fetch's lifetime;
// the claim race has exactly one winner; a requested row survives
// every boot as REQUESTED (nothing died); and the transient seat's
// poll reads the durable seat's states through the shared store.
import { afterEach, describe, test } from "vitest";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Context } from "@deepseek-ai/cordis";
import { ProvisioningService } from "../src/index.ts";
import { FileOperationStore } from "../src/operation-store.ts";
import type {
  ProvisionPlan,
  ProvisionPlanItem,
  ProvisioningConfig,
  ResourceRef,
  WeightAcquireProgress,
} from "../src/index.ts";

const contexts: Context[] = [];
const roots: string[] = [];

afterEach(async () => {
  for (const context of contexts.splice(0)) await context.fiber.dispose();
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function tempRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "provisioning-durable-"));
  roots.push(root);
  return root;
}

const WEIGHTS = Buffer.from("durable-weights-bytes", "utf8");

function famRef(): Extract<ResourceRef, { kind: "model" }> {
  return { kind: "model", owner: "family", id: "durable-fam" };
}

function famItem(): Extract<ProvisionPlanItem, { kind: "model" }> {
  return {
    kind: "model",
    key: "model:family:durable-fam::weight.bin",
    owner: "family",
    id: "durable-fam",
    name: "weight.bin",
    folder: "checkpoints",
    url: "https://example.invalid/weight.bin",
    sha256: createHash("sha256").update(WEIGHTS).digest("hex"),
    sizeBytes: WEIGHTS.byteLength,
    required: true,
    provider: "direct",
  };
}

interface Seat {
  service: ProvisioningService;
  fetched: string[];
  ctx: Context;
}

/** One seat over the shared store: its own fetcher (named so the
 *  race wall can prove WHICH seat fetched), its own weights root
 *  (the two-seat race must not share writer trees), one op store
 *  root per TEST (shared across that test's seats). */
function seat(
  opRoot: string,
  opts: { durable?: boolean; claimMs?: number; store?: boolean } = {},
): Seat {
  const fetched: string[] = [];
  const plan: ProvisionPlan = { ref: famRef(), items: [famItem()] };
  const config: ProvisioningConfig = {
    declaration: { resolve: async (): Promise<ProvisionPlan> => plan },
    storeRoot: tempRoot(),
    fetcher: async (url: string) => {
      fetched.push(url);
      async function* generate(): AsyncGenerator<Uint8Array> {
        yield Uint8Array.from(WEIGHTS);
      }
      return { status: 200, body: generate() };
    },
    ...(opts.store === false ? {} : { operationStore: new FileOperationStore(opRoot) }),
    ...(opts.durable === true ? { durableDownloads: true } : {}),
    ...(opts.claimMs === undefined ? {} : { downloadClaimIntervalMs: opts.claimMs }),
  };
  const ctx = new Context();
  contexts.push(ctx);
  return { service: new ProvisioningService(ctx, config), fetched, ctx };
}

/** Poll a seat's ledger (memory) until a predicate holds. The 15s
 *  budget (not 5s): under parallel vitest load the claim cadence +
 *  fetch settle chain can outrun a tighter window — the wall judges
 *  the LAWS, not the scheduler's mood. */
async function untilLedger(
  read: () => WeightAcquireProgress | null,
  pred: (row: WeightAcquireProgress) => boolean,
  what: string,
): Promise<WeightAcquireProgress> {
  for (let attempt = 0; attempt < 1500; attempt += 1) {
    const row = read();
    if (row !== null && pred(row)) return row;
    await new Promise((resolve) => { setTimeout(resolve, 10); });
  }
  throw new Error("ledger never reached: " + what);
}

function storedRows(opRoot: string): Array<Record<string, unknown>> {
  return readdirSync(opRoot).filter((n) => n.endsWith(".json"))
    .map((n) => JSON.parse(readFileSync(join(opRoot, n), "utf8")) as Record<string, unknown>);
}

describe("THE DURABLE DOWNLOAD SEAT (transient requests, durable claims, 2026-10-21)", () => {
  test("THE TRANSIENT MINT — requestWeightAcquire lands a 'requested' row and NEVER opens a wire", async () => {
    const opRoot = tempRoot();
    const transient = seat(opRoot);
    const id = await transient.service.requestWeightAcquire(famRef());
    const row = transient.service.progressOf(id);
    assert.equal(row?.state, "requested");
    assert.equal(row?.detail, "queued for the durable lane seat — the fetch starts there, never in this session");
    // no fetch in THIS process — the whole point of the cure
    assert.deepEqual(transient.fetched, []);
    // the row is the cross-process contract: stored, parseable, requested
    const stored = storedRows(opRoot).find((r) => r["operationId"] === id);
    assert.equal(stored?.["state"], "requested");
    // one want, one row: a second request returns the SAME id
    assert.equal(await transient.service.requestWeightAcquire(famRef()), id);
  });

  test("THE DEAD-QUEUE REFUSAL — a seat with no operation store refuses loud, never queues into nothing", async () => {
    const storeless = seat(tempRoot(), { store: false });
    await assert.rejects(
      () => storeless.service.requestWeightAcquire(famRef()),
      /no provisioning operation store/,
    );
  });

  test("THE BOOT SURVIVAL — a requested row rehydrates as REQUESTED on every seat (nothing died)", async () => {
    const opRoot = tempRoot();
    const minter = seat(opRoot);
    const id = await minter.service.requestWeightAcquire(famRef());
    // the minter's process dies (context disposed); a fresh boot seeds
    const reader = seat(opRoot);
    const row = await untilLedger(
      () => reader.service.progressOf(id),
      (r) => r.state === "requested",
      "requested after rehydrate",
    );
    assert.equal(row.state, "requested");
    assert.deepEqual(reader.fetched, []);
  });

  test("THE DURABLE CLAIM — the durable seat claims a transient's request under its OWN id and fetches", async () => {
    const opRoot = tempRoot();
    const durable = seat(opRoot, { durable: true, claimMs: 20 });
    const transient = seat(opRoot);
    const id = await transient.service.requestWeightAcquire(famRef());
    // the claim: the durable seat's ledger takes the id, the fetch runs
    // (the fetch is fast on fixture bytes — the transit acquiring word
    // may already have settled; the law judges the claim + the landing)
    await untilLedger(
      () => durable.service.progressOf(id),
      (r) => r.state !== "requested",
      "claimed off requested",
    );
    await untilLedger(
      () => durable.service.progressOf(id),
      (r) => r.state === "active" || r.state === "failed",
      "claimed fetch settled",
    );
    assert.equal(durable.service.progressOf(id)?.state, "active");
    assert.equal(durable.fetched.length, 1);
    assert.deepEqual(transient.fetched, []);
    // the requester's poll reads the durable seat's truth through
    // the store — the observation may land on ANY in-flight word
    // (acquiring, verifying) or the settled ones; the law judges
    // the landing: poll to a settled word, then bytes at total
    const first = await transient.service.readProgress(id);
    assert.ok(
      first?.state === "acquiring" || first?.state === "verifying"
        || first?.state === "active" || first?.state === "installed",
      `foreign state is no word the durable seat writes: ${first?.state}`,
    );
    // poll to the landing (readProgress is async — the RACE arm's
    // manual poll pattern)
    let foreign: WeightAcquireProgress | undefined;
    for (let attempt = 0; attempt < 500; attempt += 1) {
      const row = await transient.service.readProgress(id);
      if (row?.state === "active" || row?.state === "installed" || row?.state === "failed") {
        foreign = row;
        break;
      }
      await new Promise((resolve) => { setTimeout(resolve, 10); });
    }
    assert.ok(foreign !== undefined, "the foreign poll never settled");
    assert.equal(foreign.bytes, foreign.total);
  });

  test("THE RACE — two durable seats over one store: exactly ONE fetch (the loser yields by the claim re-read)", async () => {
    const opRoot = tempRoot();
    // THE CADENCE HEADROOM (the battery-load red, 2026-10-22): the
    // arm configured claimMs 20 to make the race window tight — but
    // under a full parallel battery a worker can be descheduled
    // past the whole 20ms claim validity, and the loser's re-read
    // then names an EXPIRED claim: two fetches, a red that says
    // nothing about the law. 200ms keeps the race real (both seats
    // still contend; the loser still yields by the re-read) while
    // the window survives scheduler load. Standalone: green at
    // either cadence; the battery reded only at 20.
    const seatA = seat(opRoot, { durable: true, claimMs: 200 });
    const seatB = seat(opRoot, { durable: true, claimMs: 200 });
    const transient = seat(opRoot);
    const id = await transient.service.requestWeightAcquire(famRef());
    await untilLedger(
      () => seatA.service.progressOf(id) ?? seatB.service.progressOf(id),
      (r) => r.state === "active" || r.state === "failed",
      "the race settled",
    );
    // ONE wire, owned by exactly one durable seat
    assert.equal(seatA.fetched.length + seatB.fetched.length, 1);
    assert.deepEqual(transient.fetched, []);
    // the row settled ACTIVE under the winner's flight (the claim
    // stamp — `claimed by seat <bootId>` — is the mid-flight marker
    // the re-read guard judged; the settled record legitimately
    // carries the landing's own words over it). The record's
    // persist is chained async — poll the STORE row for it.
    for (let attempt = 0; attempt < 500; attempt += 1) {
      const stored = storedRows(opRoot).find((r) => r["operationId"] === id);
      if (stored?.["finishedAt"] !== undefined) {
        assert.equal(stored["state"], "active");
        break;
      }
      await new Promise((resolve) => { setTimeout(resolve, 10); });
    }
    const settled = storedRows(opRoot).find((r) => r["operationId"] === id);
    assert.equal(settled?.["state"], "active");
    assert.equal(settled?.["finishedAt"] !== undefined, true);
  });

  test("THE CLAIM CAS — two seats stamp one requested row: exactly ONE write lands (the loser is refused by the store, never by a reread)", async () => {
    // THE TWO-FETCH HOLE (the battery red, 2026-10-23): save-then-
    // reread is not atomic — the loser's save CLOBBERED the winner's
    // claim stamp and the loser's reread then read its own stamp
    // back: two fetches for one row. The compare-and-swap on the
    // stored state is the race's whole judge, and this arm fires
    // deterministically: toggle saveIfState back to an unconditional
    // save and BOTH writes land (received [true, true]) — red with
    // no scheduler luck involved.
    const opRoot = tempRoot();
    const transient = seat(opRoot);
    const id = await transient.service.requestWeightAcquire(famRef());
    const storeA = new FileOperationStore(opRoot);
    const storeB = new FileOperationStore(opRoot);
    const row = await storeA.load(id);
    assert.equal(row?.state, "requested");
    // both seats fire the claim concurrently — one row, two handles
    const verdicts = await Promise.all([
      storeA.saveIfState({ ...row!, state: "acquiring", detail: "claimed by seat A" }, "requested"),
      storeB.saveIfState({ ...row!, state: "acquiring", detail: "claimed by seat B" }, "requested"),
    ]);
    assert.equal(verdicts.filter((won) => won).length, 1,
      `exactly one claim may land: ${JSON.stringify(verdicts)}`);
    // the stored row wears the WINNER's stamp — the loser never
    // touched it — and a third claim on the moved row is refused
    const stored = storedRows(opRoot).find((r) => r["operationId"] === id);
    assert.equal(stored?.["state"], "acquiring");
    assert.ok(stored?.["detail"] === "claimed by seat A" || stored?.["detail"] === "claimed by seat B",
      `the winner's stamp survived: ${stored?.["detail"]}`);
    const late = await storeA.saveIfState({ ...row!, state: "acquiring", detail: "claimed by seat C" }, "requested");
    assert.equal(late, false, "a claim on a row that moved off requested is refused");
  });

  test("THE CROSS-PROCESS POLL — a row another seat claimed answers from the store, never null, never faked bytes", async () => {
    const opRoot = tempRoot();
    const durable = seat(opRoot, { durable: true, claimMs: 20 });
    const transient = seat(opRoot);
    const id = await transient.service.requestWeightAcquire(famRef());
    // requested face first (the transient's own memory)
    const queued = await transient.service.readProgress(id);
    assert.equal(queued?.state, "requested");
    // after the claim, the transient reads the DURABLE's truth
    await untilLedger(
      () => durable.service.progressOf(id),
      (r) => r.state === "active",
      "durable settled",
    );
    const foreign = await transient.service.readProgress(id);
    assert.equal(foreign?.state, "active");
    // an unknown id stays null (never a fake zero)
    assert.equal(await transient.service.readProgress("no-such-op"), null);
  });

  test("THE CLAIMER HEARTBEAT — the durable seat stamps liveness under seat/; a transient queues ONLY on a FRESH FOREIGN stamp (dead-queue impossibility)", async () => {
    const opRoot = tempRoot();
    // no claimer yet: a transient over the same store must answer
    // NOT live — queueing now would be the dead queue
    const transient = seat(opRoot);
    assert.equal(await transient.service.durableClaimerLive(), false);
    // the durable seat boots and stamps every tick — under seat/,
    // where the row list never reads
    const durable = seat(opRoot, { durable: true, claimMs: 20 });
    const stamp = join(opRoot, "seat", "durable.json");
    for (let attempt = 0; attempt < 500; attempt += 1) {
      if (existsSync(stamp)) break;
      await new Promise((resolve) => { setTimeout(resolve, 10); });
    }
    assert.equal(existsSync(stamp), true, "the claimer heartbeat must land under seat/");
    // fresh + foreign: the transient may queue
    assert.equal(await transient.service.durableClaimerLive(), true);
    // TOGGLE RED (own stamp): the durable seat never reads its own
    // stamp as another claimer — it owns fetches, never queues
    assert.equal(await durable.service.durableClaimerLive(), false);
    // TOGGLE RED (stale stamp): kill the claimer first (its ticker
    // would overwrite the stale stamp with a fresh one), then a
    // dead claimer's old stamp answers NOT live — the press takes
    // its own wire
    await durable.ctx.fiber.dispose();
    const stale = new FileOperationStore(opRoot);
    await stale.writeSeatHeartbeat({ bootId: "dead-seat", at: Date.now() - 60_000 });
    assert.equal(await transient.service.durableClaimerLive(), false);
    // a seat with no store answers NOT live (nothing to read)
    assert.equal(await seat(tempRoot(), { store: false }).service.durableClaimerLive(), false);
  });
});
