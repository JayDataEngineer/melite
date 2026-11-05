// press-refused-echo.spec.ts — THE REFUSED-PRESS ECHO WALL (the
// lost sfx run's recovery half, 2026-11-03): a press that refuses
// at the runs door registers NOTHING — the intent lived only in the
// GUI's transient state and the work was unrecoverable exactly. The
// echo law: every refused press leaves one append-only
// `press.refused` ledger row with the refusal's code + voice and a
// capped echo of the pressed body — "what did I press and why did
// it die" is one grep away forever.
// @contract gates-press-refused-echo
import { describe, it, expect, afterEach } from "vitest";
import { mkdtempSync, rmSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Context, Service } from "@deepseek-ai/cordis";
import { RemoteError } from "@deepseek-ai/dsh-typert-protocol";
import { RunsRuntimeService } from "../src/runsRegistry.ts";
import { QueueCore } from "../src/queue.ts";
import { FlowsSeatService } from "../src/flowsData.ts";

let TMP = "";
afterEach(() => {
  if (TMP !== "") {
    rmSync(TMP, { recursive: true, force: true });
    TMP = "";
  }
});
const tmp = (): string => {
  const d = mkdtempSync(join(tmpdir(), "press-refused-echo-"));
  TMP = d;
  return d;
};

class ModelsSeatFake extends Service {
  constructor(ctx: Context) {
    super(ctx, "models");
  }
  allDecls(): unknown[] {
    return [];
  }
}

/** THE MINIMAL SEAT: the runs door + a queue seat with a real
 *  stateRoot. The refusal arms below all fire BEFORE the card plane
 *  composes (envelope, draft probe, strict body), so no card seat is
 *  needed — the wall judges the ECHO, not the refusal's own law. */
const seat = (): { svc: RunsRuntimeService; stateRoot: string } => {
  const stateRoot = tmp();
  const ctx = new Context();
  new FlowsSeatService(ctx);
  const core = new QueueCore();
  (ctx as unknown as { queue: unknown }).queue = { core, stateRoot };
  new ModelsSeatFake(ctx);
  // the draft seat: every probe answers not-found (the presses in
  // these arms all die at the draft gate — the wall judges the
  // echo, not the draft law)
  (ctx as unknown as { draftsRemote: unknown }).draftsRemote = {
    get: async (): Promise<never> => {
      throw new RemoteError("draft/not-found", "no doc", { draftId: "d" });
    },
  };
  const svc = new RunsRuntimeService(ctx);
  return { svc, stateRoot };
};

const ledgerRows = (stateRoot: string): Array<Record<string, unknown>> =>
  readFileSync(join(stateRoot, "output", "_ledger.jsonl"), "utf8")
    .split("\n")
    .filter((l) => l !== "")
    .map((l) => JSON.parse(l) as Record<string, unknown>);

const refused = (stateRoot: string): Array<Record<string, unknown>> =>
  ledgerRows(stateRoot)
    .filter((r) => r["event"] === "press.refused")
    .map((r) => (r["data"] ?? {}) as Record<string, unknown>);

const expectRemote = async (fn: () => Promise<unknown>): Promise<void> => {
  try {
    await fn();
  } catch (e) {
    expect(e instanceof RemoteError, "a RemoteError, got " + String(e)).toBe(true);
    return;
  }
  throw new Error("the press never refused");
};

describe("THE REFUSED-PRESS ECHO — every refused press is journalled (the lost sfx run's recovery half, 2026-11-03)", () => {
  it("a refused press leaves ONE press.refused row with the code, the voice and the pressed body", async () => {
    const { svc, stateRoot } = seat();
    // the silent-pass burn's own shape: a MODEL-LESS body (no model
    // key) whose compose would refuse — the envelope walk refuses it
    // here at the draft probe (no draft seat), which is enough: the
    // wall judges the echo, and every refusal arm rides the same
    // seam
    await expectRemote(() => svc.start({ prompt: "sharp metallic clang", duration: 6 }, new AbortController().signal));
    const rows = refused(stateRoot);
    expect(rows.length).toBe(1);
    expect(typeof rows[0]!["code"]).toBe("string");
    expect(String(rows[0]!["voice"])).toContain("draft");
    expect(String(rows[0]!["request"])).toContain("sharp metallic clang");
    expect(rows[0]!["draft_id"]).toBe(null);
    // the echo row exists and the run dir does NOT — the press
    // registered nothing, exactly the burn's unrecoverable shape
    expect(existsSync(join(stateRoot, "output", "run-" + String(rows[0]!["code"])))).toBe(false);
  });

  it("a draft-bearing body names its draft in the row (the bench-born press is identifiable)", async () => {
    const { svc, stateRoot } = seat();
    await expectRemote(() => svc.start({ draft_id: "bench-session-x", test: false, model: "sfx", prompt: "clang" }, new AbortController().signal));
    const rows = refused(stateRoot);
    expect(rows.length).toBe(1);
    expect(rows[0]!["draft_id"]).toBe("bench-session-x");
    expect(String(rows[0]!["request"])).toContain('"model":"sfx"');
  });

  it("a capped body truncates with a marker (an inline doc never floods the journal)", async () => {
    const { svc, stateRoot } = seat();
    const big = "x".repeat(9000);
    await expectRemote(() => svc.start({ draft_id: "bench-session-big", test: false, flow_inline: { pad: big } }, new AbortController().signal));
    const rows = refused(stateRoot);
    expect(rows.length).toBe(1);
    const echoed = String(rows[0]!["request"]);
    expect(echoed.length).toBeLessThan(4100);
    expect(echoed.endsWith("…+trunc")).toBe(true);
  });

  it("a non-object body echoes with draft_id null (a primitive press is journalled, never crashed on)", async () => {
    const { svc, stateRoot } = seat();
    await expectRemote(() => svc.start("just a string" as never, new AbortController().signal));
    const rows = refused(stateRoot);
    expect(rows.length).toBe(1);
    expect(rows[0]!["draft_id"]).toBe(null);
    expect(String(rows[0]!["request"])).toContain("just a string");
  });

  it("an unserializable body echoes as the marker, never a missing row (the journal never depends on JSON.stringify)", async () => {
    const { svc, stateRoot } = seat();
    // a function body: JSON.stringify returns undefined — the echo
    // row still lands, with the marker in place of a body
    await expectRemote(() => svc.start((() => "x") as never, new AbortController().signal));
    const rows = refused(stateRoot);
    expect(rows.length).toBe(1);
    expect(rows[0]!["request"]).toBe("unserializable");
    expect(rows[0]!["draft_id"]).toBe(null);
  });

  it("a refused REPLAY press carries replay_of (the boot-resurrect attempt is identifiable)", async () => {
    const { svc, stateRoot } = seat();
    // the internal three-arg wire (stroke 83 boot resurrect): the
    // replay marker rides the echo row, so a dead process's re-press
    // greps to the run it tried to resurrect
    await expectRemote(() => svc.start({ model: "sfx", prompt: "clang" }, new AbortController().signal, { runId: "run-ghost-83" as never }));
    const rows = refused(stateRoot);
    expect(rows.length).toBe(1);
    expect(rows[0]!["replay_of"]).toBe("run-ghost-83");
  });

  it("a non-refusal throw (an aborted press) is echoed with code throw — the journal never misses a dead press", async () => {
    const { svc, stateRoot } = seat();
    const ac = new AbortController();
    ac.abort();
    // the abort throws BEFORE the envelope walk — not a door
    // refusal, but the press is just as dead and just as ghosted
    // without the echo; the row's code says "throw", the voice the
    // abort's own
    await svc.start({ model: "sfx", prompt: "clang" }, ac.signal).then(
      () => { throw new Error("the aborted press never threw"); },
      () => undefined,
    );
    const rows = refused(stateRoot);
    expect(rows.length).toBe(1);
    expect(rows[0]!["code"]).toBe("throw");
    expect(String(rows[0]!["request"])).toContain('"prompt":"clang"');
    // and the journal holds no run.queued row — nothing registered
    expect(ledgerRows(stateRoot).filter((r) => r["event"] === "run.queued").length).toBe(0);
  });
});
