// bench-door.test.ts — THE BENCH WALL (the bench rework, 2026-09-10):
// one shared working flow per session over the drafts domain, with
// the append-only revision log, CAS, and author-filterable undo.
// docs/plans/bench-rework-2026-09-10.md §3 is the contract.
//
// Pinned shapes:
//   1. ENSURE — birth (created: true, rev 0, log empty) and the
//      idempotent read-back (created: false, same rev); load-with-
//      stages replaces rows and appends a "load" entry (snapshot
//      inverse). Refusals consume no rev (CAS is pre-append).
//   2. STAGE OPS — add_stage births runner-shaped rows (id, inputs
//      object, outputs default), refuses duplicate ids; rewire sets
//      {stage,output} refs and clears on absent from; remove_stage
//      splices with inverse.
//   3. PATCH + CAS — params merge over priors; a stale expect_rev
//      refuses 409 with current_rev (never merges); expect_rev
//      missing refuses 400 (the CAS law).
//   4. UNDO — walks the log tail-first over UNREVERTED entries:
//      patch undone (edited key restored, added key gone),
//      remove_stage undone (row restored at index), rewire undone,
//      add_stage undone (row leaves), n>1 chains, undo-of-undo;
//      the author filter never touches other authors' entries.
//   5. VOICES — unknown keys 400, missing bench 404 (ensure
//      first), stage-not-found 404, unrouted session shapes 404
//      (the framework's no-owner voice).
//   6. DURABILITY — a second boot on the SAME state root serves
//      the bench with its log intact (the domain persists; the
//      revision history is the truth, not the process).
//
// Run: node --experimental-strip-types --test tests/walls/ts/suites/bench-door.test.ts
import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { bootSandbox, http, parsed, reap } from "../helpers/boot.ts";
import type { Sandbox } from "../helpers/boot.ts";

const TOKEN = "wall-ts-bench-2026-09-10";

let sb: Sandbox;

before(async () => {
  sb = await bootSandbox({ token: TOKEN });
});

after(() => {
  reap(sb.proc);
});

function post(path: string, body: unknown) {
  return http(sb.port, "POST", path, {
    body: JSON.stringify(body),
    token: TOKEN,
    contentType: "application/json",
  });
}
function get(path: string) {
  return http(sb.port, "GET", path, { token: TOKEN });
}

// The op ledger (CAS is pre-append — refusals never move the rev):
//   ensure birth .............. rev 0 (no log entry)
//   load stages ............... rev 1   s_0 = image-gen(prompt "first")
//   add_stage upscale ......... rev 2   s_1 = image-upscale
//   (dup add refused — stays 2)
//   rewire set s_1.image ...... rev 3
//   rewire clear s_1.image .... rev 4
//   remove_stage s_1 .......... rev 5   stages = [s_0]
//   patch s_0 width=1024 ...... rev 6
//   (stale CAS refused — stays 6; missing CAS refused — stays 6)
//   undo n=1 .................. rev 7   reverts 6  (width gone)
//   undo n=1 .................. rev 8   reverts 5  (s_1 back)
//   undo n=1 .................. rev 9   reverts 4  (image ref back)
//   undo n=2 .................. rev 10  reverts 3,2 (wire cleared, s_1 gone)
//   user patch prompt ......... rev 11  (author user)
//   agent patch prompt ........ rev 12
//   undo n=1 author=agent ..... rev 13  reverts 12 — user row survives

describe("bench door — ensure + read-back", () => {
  it("births the bench at rev 0 with an empty log", async () => {
    const r = await post("/v1/bench/ensure", { session: "alpha" });
    assert.equal(r.status, 200);
    const b = parsed(r.bytes) as Record<string, unknown>;
    assert.equal(b.created, true);
    assert.equal(b.rev, 0);
    assert.equal(b.draft_id, "bench-alpha");
    assert.deepEqual(b.stages, []);
    // Idempotent read-back.
    const r2 = await post("/v1/bench/ensure", { session: "alpha" });
    const b2 = parsed(r2.bytes) as Record<string, unknown>;
    assert.equal(b2.created, false);
    assert.equal(b2.rev, 0);
  });

  it("GET serves stages + log heads (no inverse payloads on the wire)", async () => {
    const r = await get("/v1/bench/alpha");
    assert.equal(r.status, 200);
    const b = parsed(r.bytes) as Record<string, unknown>;
    assert.equal(b.rev, 0);
    assert.deepEqual(b.log, []);
  });

  it("load-with-stages replaces rows and appends a load entry", async () => {
    const r = await post("/v1/bench/ensure", {
      session: "alpha",
      stages: [{ card: "image-gen", params: { prompt: "first" } }],
      expect_rev: 0,
    });
    assert.equal(r.status, 200);
    const b = parsed(r.bytes) as Record<string, unknown>;
    assert.equal(b.rev, 1);
    assert.equal(b.created, false);
    const stages = b.stages as Record<string, unknown>[];
    assert.equal(stages.length, 1);
    assert.equal(stages[0].card, "image-gen");
    assert.equal(stages[0].id, "s_0");
    const g = await get("/v1/bench/alpha");
    const log = (parsed(g.bytes) as Record<string, unknown>).log as Record<string, unknown>[];
    assert.equal(log.length, 1);
    assert.equal(log[0].kind, "load");
    assert.equal(log[0].author, "agent");
    // No inverse payload on the read wire.
    assert.equal(log[0].inverse, undefined);
  });
});

describe("bench door — stage ops", () => {
  it("add_stage births runner-shaped rows; duplicate ids refuse without moving the rev", async () => {
    const r = await post("/v1/bench/alpha/add_stage", {
      card: "image-upscale",
      expect_rev: 1,
    });
    assert.equal(r.status, 200);
    const b = parsed(r.bytes) as Record<string, unknown>;
    assert.equal(b.rev, 2);
    assert.equal(b.stage, "s_1");
    const g = await get("/v1/bench/alpha");
    const st = ((parsed(g.bytes) as Record<string, unknown>).stages as Record<string, unknown>[])
      .find((s: Record<string, unknown>) => s.id === "s_1") as Record<string, unknown>;
    assert.equal(st.card, "image-upscale");
    assert.deepEqual(st.inputs, {});
    assert.deepEqual(st.outputs, { default: "image" });
    // Duplicate id refuses; CAS is pre-append so rev stays 2.
    const dup = await post("/v1/bench/alpha/add_stage", {
      card: "image-upscale",
      id: "s_1",
      expect_rev: 2,
    });
    assert.equal(dup.status, 409);
    const g2 = await get("/v1/bench/alpha");
    assert.equal((parsed(g2.bytes) as Record<string, unknown>).rev, 2);
  });

  it("rewire sets a stage ref and clears on absent from", async () => {
    const set = await post("/v1/bench/alpha/rewire", {
      stage: "s_1",
      input: "image",
      from: { stage: "s_0", output: "default" },
      expect_rev: 2,
    });
    assert.equal(set.status, 200);
    let g = await get("/v1/bench/alpha");
    let st = ((parsed(g.bytes) as Record<string, unknown>).stages as Record<string, unknown>[])
      .find((s: Record<string, unknown>) => s.id === "s_1") as Record<string, unknown>;
    assert.deepEqual(st.inputs, { image: { stage: "s_0", output: "default" } });
    // Clear.
    const clear = await post("/v1/bench/alpha/rewire", {
      stage: "s_1",
      input: "image",
      expect_rev: 3,
    });
    assert.equal(clear.status, 200);
    g = await get("/v1/bench/alpha");
    st = ((parsed(g.bytes) as Record<string, unknown>).stages as Record<string, unknown>[])
      .find((s: Record<string, unknown>) => s.id === "s_1") as Record<string, unknown>;
    assert.deepEqual(st.inputs, {});
  });

  it("remove_stage splices and logs the row for restore", async () => {
    const r = await post("/v1/bench/alpha/remove_stage", {
      stage: "s_1",
      expect_rev: 4,
    });
    assert.equal(r.status, 200);
    const g = await get("/v1/bench/alpha");
    const stages = (parsed(g.bytes) as Record<string, unknown>).stages as Record<string, unknown>[];
    assert.equal(stages.length, 1);
    assert.equal(stages[0].id, "s_0");
  });
});

describe("bench door — patch + CAS", () => {
  it("merges params over priors (old keys survive)", async () => {
    const r = await post("/v1/bench/alpha/patch", {
      stage: "s_0",
      params: { width: 1024 },
      expect_rev: 5,
    });
    assert.equal(r.status, 200);
    const g = await get("/v1/bench/alpha");
    const st = (parsed(g.bytes) as Record<string, unknown>).stages[0] as Record<string, unknown>;
    const params = st.params as Record<string, unknown>;
    assert.equal(params.prompt, "first");
    assert.equal(params.width, 1024);
  });

  it("a stale expect_rev refuses 409 with current_rev — never merges", async () => {
    const r = await post("/v1/bench/alpha/patch", {
      stage: "s_0",
      params: { width: 2048 },
      expect_rev: 5, // bench is at 6 now
    });
    assert.equal(r.status, 409);
    const b = parsed(r.bytes) as Record<string, unknown>;
    assert.equal(b.current_rev, 6);
    const g = await get("/v1/bench/alpha");
    const st = (parsed(g.bytes) as Record<string, unknown>).stages[0] as Record<string, unknown>;
    assert.equal((st.params as Record<string, unknown>).width, 1024);
  });

  it("missing expect_rev refuses 400 (the CAS law)", async () => {
    const r = await post("/v1/bench/alpha/patch", {
      stage: "s_0",
      params: { width: 2048 },
    });
    assert.equal(r.status, 400);
  });
});

describe("bench door — undo", () => {
  it("undoes a patch: edited key restored, added key gone", async () => {
    const r = await post("/v1/bench/alpha/undo", { n: 1, expect_rev: 6 });
    assert.equal(r.status, 200);
    const b = parsed(r.bytes) as Record<string, unknown>;
    assert.deepEqual(b.undone, [6]);
    const g = await get("/v1/bench/alpha");
    const st = (parsed(g.bytes) as Record<string, unknown>).stages[0] as Record<string, unknown>;
    const params = st.params as Record<string, unknown>;
    assert.equal(params.prompt, "first");
    assert.equal(params.width, undefined);
  });

  it("undoes remove_stage: the row restores at its index", async () => {
    const r = await post("/v1/bench/alpha/undo", { n: 1, expect_rev: 7 });
    assert.equal(r.status, 200);
    assert.deepEqual((parsed(r.bytes) as Record<string, unknown>).undone, [5]);
    const g = await get("/v1/bench/alpha");
    const stages = (parsed(g.bytes) as Record<string, unknown>).stages as Record<string, unknown>[];
    assert.equal(stages.length, 2);
    assert.equal(stages[1].id, "s_1");
    assert.equal(stages[1].card, "image-upscale");
  });

  it("undoes a rewire clear: the binding restores", async () => {
    const r = await post("/v1/bench/alpha/undo", { n: 1, expect_rev: 8 });
    assert.equal(r.status, 200);
    const g = await get("/v1/bench/alpha");
    const st = ((parsed(g.bytes) as Record<string, unknown>).stages as Record<string, unknown>[])
      .find((s: Record<string, unknown>) => s.id === "s_1") as Record<string, unknown>;
    assert.deepEqual(st.inputs, { image: { stage: "s_0", output: "default" } });
  });

  it("n>1 chains: wire + add revert in one entry; s_1 leaves", async () => {
    const r = await post("/v1/bench/alpha/undo", { n: 2, expect_rev: 9 });
    assert.equal(r.status, 200);
    const b = parsed(r.bytes) as Record<string, unknown>;
    assert.deepEqual(b.undone, [2, 3]);
    const g = await get("/v1/bench/alpha");
    const stages = (parsed(g.bytes) as Record<string, unknown>).stages as Record<string, unknown>[];
    assert.equal(stages.length, 1);
  });

  it("the author filter never touches other authors' entries", async () => {
    const p1 = await post("/v1/bench/alpha/patch", {
      stage: "s_0",
      params: { prompt: "user edit" },
      expect_rev: 10,
      author: "user",
    });
    assert.equal(p1.status, 200);
    const p2 = await post("/v1/bench/alpha/patch", {
      stage: "s_0",
      params: { prompt: "agent edit" },
      expect_rev: 11,
    });
    assert.equal(p2.status, 200);
    // Undo ONLY agent entries: the agent's rev-12 edit reverts; the
    // user's rev-11 edit survives underneath.
    const r = await post("/v1/bench/alpha/undo", { n: 1, author: "agent", expect_rev: 12 });
    assert.equal(r.status, 200);
    assert.deepEqual((parsed(r.bytes) as Record<string, unknown>).undone, [12]);
    const g = await get("/v1/bench/alpha");
    const st = (parsed(g.bytes) as Record<string, unknown>).stages[0] as Record<string, unknown>;
    assert.equal((st.params as Record<string, unknown>).prompt, "user edit");
  });
});

describe("bench door — voices", () => {
  it("unknown keys refuse with the allowed list", async () => {
    const r = await post("/v1/bench/alpha/patch", {
      stage: "s_0",
      params: {},
      expect_rev: 13,
      bogus: 1,
    });
    assert.equal(r.status, 400);
    assert.match(
      (parsed(r.bytes) as Record<string, unknown>).error as string,
      /unknown bench key/,
    );
  });

  it("unroutable session shapes answer the framework's no-owner 404", async () => {
    // The route regex gates [A-Za-z0-9_-]{1,64}; anything else
    // never reaches the door (the door's own session gate is
    // defense-in-depth for internal calls).
    const r = await get("/v1/bench/bad%20session");
    assert.equal(r.status, 404);
  });

  it("missing bench refuses 404 (ensure first)", async () => {
    const r = await post("/v1/bench/ghost/patch", {
      stage: "s_0",
      params: {},
      expect_rev: 0,
    });
    assert.equal(r.status, 404);
    assert.match((parsed(r.bytes) as Record<string, unknown>).error as string, /ensure first/);
  });

  it("stage-not-found refuses 404", async () => {
    const r = await post("/v1/bench/alpha/patch", {
      stage: "s_nope",
      params: { a: 1 },
      expect_rev: 13,
    });
    assert.equal(r.status, 404);
  });
});

describe("bench door — durability", () => {
  it("a second boot on the same state root serves the bench + log intact", async () => {
    const root = mkdtempSync(join(tmpdir(), "wall-ts-bench-"));
    {
      const sb2 = await bootSandbox({ token: TOKEN, stateRoot: root });
      try {
        const r = await http(sb2.port, "POST", "/v1/bench/ensure", {
          body: JSON.stringify({
            session: "persist",
            stages: [{ card: "image-gen", params: { prompt: "keep" } }],
          }),
          token: TOKEN,
          contentType: "application/json",
        });
        assert.equal(r.status, 200);
        assert.equal((parsed(r.bytes) as Record<string, unknown>).rev, 0);
        const add = await http(sb2.port, "POST", "/v1/bench/persist/add_stage", {
          body: JSON.stringify({ card: "image-upscale", expect_rev: 0 }),
          token: TOKEN,
          contentType: "application/json",
        });
        assert.equal(add.status, 200);
      } finally {
        reap(sb2.proc);
      }
    }
    {
      const sb3 = await bootSandbox({ token: TOKEN, stateRoot: root });
      try {
        const g = await http(sb3.port, "GET", "/v1/bench/persist", { token: TOKEN });
        assert.equal(g.status, 200);
        const b = parsed(g.bytes) as Record<string, unknown>;
        assert.equal(b.rev, 1);
        assert.equal((b.stages as unknown[]).length, 2);
        assert.equal((b.log as unknown[]).length, 1);
        const log = b.log as Record<string, unknown>[];
        assert.equal(log[0].kind, "add_stage");
        const params = (b.stages as Record<string, unknown>[])[0].params as Record<string, unknown>;
        assert.equal(params.prompt, "keep");
      } finally {
        reap(sb3.proc);
      }
    }
  });
});
