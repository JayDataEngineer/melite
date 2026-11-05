// store.spec.ts — the drafts store's own laws, unit-grain: the loud
// no-facility refusal, the per-facility open cache, the open-time
// replayed-refusal heal, and the failed-open purge (a rejected open
// clears the slot — the retry re-attempts).
//
// The facility fake registers the way the real one does —
// ctx.provide("storageDomain", plainObject) (dsh-storage-domain's own
// seam) — NOT a Service subclass: cordis exposes Service subclasses
// through per-access scoped proxies (unstable identity), while provided
// objects keep theirs, and the store's WeakMap keys on that identity.
import { test } from "vitest";
import assert from "node:assert/strict";
import { Context } from "@deepseek-ai/cordis";
import type { Domain } from "@deepseek-ai/dsh-storage-domain";
import { openDraftsDomain } from "../src/store.ts";
import type { DraftsDomainSpec } from "../src/spec.js";
import { DraftsDomainSeatService } from "../src/store.ts";

/** The minimal domain face the store touches: the docs table (the
 *  spec's own shape — no more, no fake extra). */
class FakeDomain {
  docs = new Map<string, unknown>();
  puts: { id: string; row: unknown }[] = [];
  table(name: string): FakeDomain {
    assert.equal(name, "docs", "the store reads the docs table only");
    return this;
  }
  get(id: string): unknown {
    return this.docs.get(id);
  }
  put(id: string, row: unknown): Promise<void> {
    this.puts.push({ id, row });
    this.docs.set(id, row);
    return Promise.resolve();
  }
  entries(): IterableIterator<[string, unknown]> {
    return this.docs.entries();
  }
}

/** The facility, provided like the real one: a plain object with
 * open(), countable and (on demand) failing the first attempt. */
interface FakeFacility {
  domain: FakeDomain;
  opens: number;
  failFirstOpen: boolean;
  open(): Promise<Domain<DraftsDomainSpec>>;
}

function mountFacility(ctx: Context): FakeFacility {
  const facility: FakeFacility = {
    domain: new FakeDomain(),
    opens: 0,
    failFirstOpen: false,
    open(): Promise<Domain<DraftsDomainSpec>> {
      facility.opens += 1;
      if (facility.failFirstOpen && facility.opens === 1) {
        return Promise.reject(new Error("storage/junit-first-open-fails"));
      }
      return Promise.resolve(facility.domain as unknown as Domain<DraftsDomainSpec>);
    },
  };
  ctx.provide("storageDomain", facility);
  return facility;
}

test("no storage facility mounted: the loud earliest refusal", async () => {
  const ctx = new Context();
  new DraftsDomainSeatService(ctx);
  await assert.rejects(
    () => openDraftsDomain(ctx),
    /storage domain facility not mounted/,
  );
});

test("no seat mounted: the open refuses LOUD (never a silent undefined domain)", async () => {
  // The seat IS the domain's only door (J5): a Context without
  // DraftsDomainSeatService has no drafts plane at all — the open
  // names the missing service and the constructor that mounts it,
  // so a mounting-order break dies at the first open, not at the
  // first use of undefined.
  const ctx = new Context();
  await assert.rejects(
    () => openDraftsDomain(ctx),
    /drafts domain seat not mounted \(new DraftsDomainSeatService\(ctx\)\)/,
  );
});

test("the same facility reuses the open (the cache hits)", async () => {
  const ctx = new Context();
  new DraftsDomainSeatService(ctx);
  const facility = mountFacility(ctx);
  await openDraftsDomain(ctx);
  await openDraftsDomain(ctx);
  assert.equal(facility.opens, 1, "cache hit — no re-open");
});

test("a rejected open purges the cache: the retry re-attempts", async () => {
  const ctx = new Context();
  new DraftsDomainSeatService(ctx);
  const facility = mountFacility(ctx);
  facility.failFirstOpen = true;
  await assert.rejects(
    () => openDraftsDomain(ctx),
    /storage\/junit-first-open-fails/,
  );
  // The slot was purged — the second call OPENS AGAIN (and succeeds).
  const drafts = await openDraftsDomain(ctx);
  assert.equal(facility.opens, 2, "the failed open did not poison the cache");
  assert.ok(drafts, "the retry returned the domain");
});

test("the open HEALS a poisoned row: an unstated-required refusal never stays a terminal failure", async () => {
  // THE REPLAYED-REFUSAL ROW (2026-09-14 carry, cured 2026-10-18):
  // the old carry wrote the refusal for a word not yet typed onto
  // the stage row as runStatus 'failed' — every later drill open
  // replayed it. The open rewrites the row to the never-ran face.
  const ctx = new Context();
  new DraftsDomainSeatService(ctx);
  const facility = mountFacility(ctx);
  facility.domain.docs.set("bench-s1", {
    updated_at: 100,
    doc: {
      draft_id: "bench-s1", status: "live", createdAt: 1, completedAt: null,
      intent: "bench",
      stages: [
        {
          id: "s_0",
          runStatus: "failed",
          result: {
            error:
              "card_compose phase 1: lane 'krea-2/turbo' refuses the state: " +
              "this lane requires 'prompt' — 'prompt' is not stated — " +
              "every image lane states WHAT the picture is — write the prompt",
          },
        },
      ],
    },
  });
  const drafts = (await openDraftsDomain(ctx)) as unknown as FakeDomain;
  const healed = (drafts.docs.get("bench-s1") as { doc: { stages: Array<Record<string, unknown>> } })
    .doc.stages[0]!;
  assert.equal(healed["runStatus"], "", "the poison died at open");
  assert.deepEqual(healed["result"], {}, "the refusal voice is gone from the row");
  assert.equal(drafts.puts.length, 1, "exactly the one poisoned doc rewritten");
});

test("the heal skips the persisted-boundary degenerates (a durable row that is not a bench shape never crashes the open)", async () => {
  // THE PERSISTED BOUNDARY (store.ts:33-49): the domain holds
  // durable JSON, not typed rows — the heal walks it defensively and
  // every degenerate arm SKIPS (no crash, no put). Tonight's battery
  // debt: the arms never fired in any suite, so the file rode below
  // its floor while the healthy arms greened.
  const ctx = new Context();
  new DraftsDomainSeatService(ctx);
  const facility = mountFacility(ctx);
  const docs = facility.domain.docs;
  // a record that is not an object (the 36:69 else arm)
  docs.set("bench-x", 7 as unknown as never);
  // a record whose doc is absent (the 37 if-true arm)
  docs.set("bench-y", { updated_at: 1 } as never);
  // a doc whose stages is not an array (the 38:61 else arm)
  docs.set("bench-z", {
    updated_at: 1,
    doc: { draft_id: "bench-z", stages: "nope" },
  } as never);
  // a stages row that is not an object (the 41 if-true arm)
  docs.set("bench-w", {
    updated_at: 1,
    doc: {
      draft_id: "bench-w",
      stages: [
        "a bare string stage",
        { id: "s_0", runStatus: "failed", result: "a non-object result" },
      ],
    },
  } as never);
  const drafts = (await openDraftsDomain(ctx)) as unknown as FakeDomain;
  // the one WALKABLE row (result non-object, the 49:13 else arm)
  // carries no readable refusal — it stays verbatim, nothing healed
  const w = (drafts.docs.get("bench-w") as { doc: { stages: Array<Record<string, unknown>> } })
    .doc.stages[1] as Record<string, unknown>;
  assert.equal(w["runStatus"], "failed", "a result that is not an object carries no refusal to heal");
  assert.equal(drafts.puts.length, 0, "no degenerate row ever touched disk");
});

test("the open heals the 'error' word too, and leaves a stated-wrong failure untouched", async () => {
  const ctx = new Context();
  new DraftsDomainSeatService(ctx);
  const facility = mountFacility(ctx);
  facility.domain.docs.set("bench-a", {
    updated_at: 100,
    doc: {
      draft_id: "bench-a", status: "live", createdAt: 1, completedAt: null,
      intent: "bench",
      stages: [
        { id: "s_0", runStatus: "error", result: { error: "lane refuses: this lane requires 'style'" } },
      ],
    },
  });
  facility.domain.docs.set("bench-b", {
    updated_at: 100,
    doc: {
      draft_id: "bench-b", status: "live", createdAt: 1, completedAt: null,
      intent: "bench",
      stages: [
        { id: "s_0", runStatus: "failed", result: { error: "card_compose phase 1: unknown quant 'xq'" } },
      ],
    },
  });
  const drafts = (await openDraftsDomain(ctx)) as unknown as FakeDomain;
  const a = (drafts.docs.get("bench-a") as { doc: { stages: Array<Record<string, unknown>> } }).doc.stages[0]!;
  const b = (drafts.docs.get("bench-b") as { doc: { stages: Array<Record<string, unknown>> } }).doc.stages[0]!;
  assert.equal(a["runStatus"], "", "the 'error' word heals with the class");
  assert.equal(b["runStatus"], "failed", "a stated-wrong failure is authored state — it stays");
  assert.equal(drafts.puts.length, 1, "only the matching doc touched disk");
});

test("a MIXED carry (the stem joined with a stated-wrong half) never heals (the client-plane audit cure, 2026-10-18)", async () => {
  const ctx = new Context();
  new DraftsDomainSeatService(ctx);
  const facility = mountFacility(ctx);
  facility.domain.docs.set("bench-mixed", {
    updated_at: 100,
    doc: {
      draft_id: "bench-mixed", status: "live", createdAt: 1, completedAt: null,
      intent: "bench",
      stages: [
        {
          id: "s_0",
          runStatus: "failed",
          result: {
            error:
              "this lane requires 'prompt' — 'prompt' is not stated; " +
              "stated cfg 3.5 is OUTSIDE the route envelope for variant \"turbo\" — the declared envelope is [1, 2]",
          },
        },
      ],
    },
  });
  const drafts = (await openDraftsDomain(ctx)) as unknown as FakeDomain;
  const mixed = (drafts.docs.get("bench-mixed") as { doc: { stages: Array<Record<string, unknown>> } })
    .doc.stages[0]!;
  assert.equal(mixed["runStatus"], "failed", "the mixed carry keeps its failed face — only whole-stem texts heal");
  assert.equal(drafts.puts.length, 0, "the mixed doc never touched disk");
});

// THE RE-MOUNT LAW (incident
// dev_docs/audits/journey/2026-10-23-drafts-domain-wedge.md): the
// reserving fake models the REAL facility — a second open of a held
// name throws 'already open', and only Domain.close() frees it.
// The lenient fake above stays untouched: the store's open cache and
// the heal arms judge storage mechanics, not the reservation.
class ReservingDomain extends FakeDomain {
  closed = 0;
  failPut = false;
  constructor(private readonly releaseName: () => void) {
    super();
  }
  override put(id: string, row: unknown): Promise<void> {
    if (this.failPut) return Promise.reject(new Error("storage/junit-put-fails"));
    return super.put(id, row);
  }
  async close(): Promise<void> {
    this.closed += 1;
    this.releaseName();
  }
}

function mountReservingFacility(ctx: Context): {
  facility: { open(): Promise<Domain<DraftsDomainSpec>> };
  opens: () => number;
  domain: ReservingDomain;
  held: () => boolean;
} {
  let held = false;
  let opens = 0;
  const domain = new ReservingDomain(() => {
    held = false;
  });
  const facility = {
    open(): Promise<Domain<DraftsDomainSpec>> {
      if (held) return Promise.reject(new Error("domain 'drafts' is already open"));
      held = true;
      opens += 1;
      return Promise.resolve(domain as unknown as Domain<DraftsDomainSpec>);
    },
  };
  ctx.provide("storageDomain", facility);
  return { facility, opens: () => opens, domain, held: () => held };
}

test("seat unload closes its domains: a re-mounted seat re-opens (the 2026-10-23 wedge)", async () => {
  const ctxA = new Context();
  new DraftsDomainSeatService(ctxA);
  const rec = mountReservingFacility(ctxA);
  const first = await openDraftsDomain(ctxA);
  assert.ok(first !== undefined);
  assert.equal(rec.held(), true, "the name stays reserved while the seat lives");
  // the re-mount: A's fiber dies (reload), a new seat mounts against the same facility
  await ctxA.fiber.dispose();
  assert.equal(rec.domain.closed, 1, "unload closed the handle");
  assert.equal(rec.held(), false, "the reservation freed");
  const ctxB = new Context();
  new DraftsDomainSeatService(ctxB);
  ctxB.provide("storageDomain", rec.facility);
  const second = await openDraftsDomain(ctxB);
  assert.ok(second !== undefined, "the re-mounted seat opens");
  assert.equal(rec.opens(), 2, "exactly one open per seat — no leak, no wedge");
});

test("a post-open failure closes the handle: the retry re-opens (never 'already open')", async () => {
  const ctx = new Context();
  new DraftsDomainSeatService(ctx);
  const rec = mountReservingFacility(ctx);
  // The open's post-open work is the replayed-refusal heal — its
  // write is the failure the purge must survive.
  rec.domain.docs.set("bench-s1", {
    updated_at: 100,
    doc: {
      draft_id: "bench-s1", status: "live", createdAt: 1, completedAt: null,
      intent: "bench",
      stages: [
        {
          id: "s_0",
          runStatus: "failed",
          result: {
            error:
              "card_compose phase 1: lane 'krea-2/turbo' refuses the state: " +
              "this lane requires 'prompt' — 'prompt' is not stated — " +
              "every image lane states WHAT the picture is — write the prompt",
          },
        },
      ],
    },
  });
  rec.domain.failPut = true;
  await assert.rejects(() => openDraftsDomain(ctx), /storage\/junit-put-fails/);
  assert.equal(rec.domain.closed, 1, "the failed open's handle closed");
  assert.equal(rec.held(), false, "the name freed for the retry");
  rec.domain.failPut = false;
  const retry = await openDraftsDomain(ctx);
  assert.ok(retry !== undefined, "the retry opens against the freed name");
  assert.equal(rec.opens(), 2, "slot purged AND name freed — the retry is a real re-open");
});
