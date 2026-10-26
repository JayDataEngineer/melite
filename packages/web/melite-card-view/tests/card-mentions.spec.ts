/**
 * card-mentions — the id vocabulary fold and its chat resolver.
 *
 * The fold's law: only tool/result events PAIRED (by the result
 * message's source.callId) with a CARD_TOOLS tool/call contribute
 * ids, and only the ids the tool actually persisted (draft_id /
 * run_id in presentationMeta). A foreign tool's result, a card
 * result with no meta ids, and every other event leave the state
 * untouched. The resolver's law: an authored token resolves ONLY
 * when it exactly names an id that turn produced; both id kinds
 * open the Media page; a turn with no ids provides no resolver at
 * all (the prose stays inert code).
 */
import { describe, expect, test, vi } from "vitest";
import { buildChatFileMentions, meliteCardsTurnDefinition, type MeliteCardRow } from "../src/client/card-mentions.ts";
import type { ConversationNodeDefinition } from "@deepseek-ai/dsh-client-ui-conversation/client";
import { draftIdOf } from "@melite/contracts/benchStage";

type Event = { type: string; data: Record<string, unknown> };
type Def = ConversationNodeDefinition<{ turn: number; cardCalls: ReadonlyMap<string, string>; rows: readonly MeliteCardRow[] }>;
const def = meliteCardsTurnDefinition as unknown as Def;

const turnStart: Event = { type: "turn/start", data: { turn: 3 } };
const cardCall: Event = { type: "tool/call", data: { turn: 3, callId: "c1", name: "image_card", arguments: {} } };
const foreignCall: Event = { type: "tool/call", data: { turn: 3, callId: "c2", name: "web_search", arguments: {} } };
function cardResult(meta: Record<string, unknown> | undefined, callId = "c1"): Event {
  return { type: "tool/result", data: { turn: 3, message: { source: { callId } }, meta } };
}

/** The engine's match object: match() answers {id, role}; the engine
 *  wraps it with the event and its resolved location. */
function matchOf(event: Event): { role: string; location: { kind: 'session' }; event: Event } {
  const m = def.match(event as never);
  expect(m).not.toBeNull();
  return { role: m!.role, location: { kind: "session" }, event };
}
function startState(): { turn: number; cardCalls: ReadonlyMap<string, string>; rows: readonly MeliteCardRow[] } {
  return def.start(undefined as never, matchOf(turnStart) as never, undefined as never);
}
function update(state: ReturnType<typeof startState>, event: Event): ReturnType<typeof startState> {
  return def.update({ state } as never, matchOf(event) as never);
}

describe("the meliteCards fold (match / start / update)", () => {
  test("match claims turn starts, card-tool calls, and every result; nothing else", () => {
    expect(def.match(turnStart as never)).toEqual({ id: "3", role: "start" });
    expect(def.match(cardCall as never)).toEqual({ id: "3", role: "update" });
    expect(def.match(foreignCall as never)).toBeNull();
    expect(def.match(cardResult(undefined) as never)).toEqual({ id: "3", role: "update" });
    expect(def.match({ type: "message/user", data: {} } as never)).toBeNull();
  });

  test("start requires its turn/start match (the engine's own law)", () => {
    expect(() => def.start(undefined as never, matchOf(cardCall) as never, undefined as never)).toThrow();
  });

  test("a card result folds the ids its tool persisted", () => {
    let state = startState();
    state = update(state, cardCall);
    state = update(state, cardResult({ draft_id: "p_ab12", run_id: "run-9" }));
    expect(state.rows).toEqual([{ tool: "image_card", draftId: "p_ab12", runId: "run-9" }]);
  });

  test("a foreign tool's result never folds, and an id-less result neither", () => {
    // the foreign tool/call never even matches (the engine drops it)
    expect(def.match(foreignCall as never)).toBeNull();
    let state = startState();
    state = update(state, cardCall);
    state = update(state, cardResult({ path: "/tmp/x.png" }, "c2"));
    state = update(state, cardResult({ status: "queued" }));
    expect(state.rows).toEqual([]);
    // the unpaired callId was never recorded
    expect(state.cardCalls.has("c2")).toBe(false);
  });

  test("a card result without its call is ignored (replay order never guesses)", () => {
    let state = startState();
    state = update(state, cardResult({ draft_id: "p_1" }));
    expect(state.rows).toEqual([]);
  });

  test("error results still fold — a failed run's draft exists", () => {
    let state = startState();
    state = update(state, cardCall);
    state = update(state, cardResult({ draft_id: "p_err", status: "error" }));
    expect(state.rows).toEqual([{ tool: "image_card", draftId: "p_err", runId: null }]);
  });

  test("a result with no meta at all folds nothing (meta is optional on the wire)", () => {
    let state = startState();
    state = update(state, cardCall);
    state = update(state, cardResult(undefined));
    expect(state.rows).toEqual([]);
  });

  test("a replayed start event through update leaves the state untouched", () => {
    let state = startState();
    state = update(state, cardCall);
    const next = update(state, turnStart);
    expect(next).toBe(state);
  });
});

describe("the meliteCards turn-data publication", () => {
  test("publishes rows at turn scope only, keeping identity while unchanged", () => {
    let state = startState();
    state = update(state, cardCall);
    state = update(state, cardResult({ draft_id: "p_1" }));
    const ctx = { state } as never;
    expect(def.buildLocationData!(ctx, "step", null)).toBeNull();
    const published = def.buildLocationData!(ctx, "turn", null);
    expect(published).toMatchObject({ kind: "turn", turn: 3, key: "meliteCards", value: { rows: state.rows } });
    // an unchanged state returns the PREVIOUS value (identity-stable)
    expect(def.buildLocationData!(ctx, "turn", published)).toBe(published);
  });

  test("a state-less context publishes nothing", () => {
    expect(def.buildLocationData!({ state: undefined } as never, "turn", null)).toBeNull();
  });
});

describe("the chatFileMentions provider (the resolver's law)", () => {
  type Data = { rows: readonly MeliteCardRow[] };
  function ownerOf(data: Data | undefined): { turn: { data: { get(key: "meliteCards"): Data | undefined } } } {
    return { turn: { data: { get: () => data } } };
  }

  test("a turn with no published data provides no resolver", () => {
    const mentions = buildChatFileMentions(() => {});
    expect(mentions.forClosing(ownerOf(undefined) as never, "s1" as never)).toBeUndefined();
  });

  test("a turn whose rows carry no ids provides no resolver", () => {
    const mentions = buildChatFileMentions(() => {});
    expect(mentions.forClosing(ownerOf({ rows: [{ tool: "image_card", draftId: null, runId: null }] }) as never, "s1" as never)).toBeUndefined();
  });

  test("an exact id token resolves and opens the Media page", () => {
    const open = vi.fn();
    const mentions = buildChatFileMentions(open);
    const rows: readonly MeliteCardRow[] = [
      { tool: "image_card", draftId: draftIdOf("p_ab12"), runId: null },
      { tool: "melite_flow", draftId: null, runId: "run-9" },
    ];
    const resolver = mentions.forClosing(ownerOf({ rows }) as never, "s1" as never);
    expect(resolver).toBeDefined();
    const draft = resolver!.resolve("p_ab12");
    expect(draft).toMatchObject({ label: "p_ab12" });
    expect(draft!.title).toContain("draft");
    draft!.open();
    expect(open).toHaveBeenCalledTimes(1);
    const run = resolver!.resolve("run-9");
    expect(run!.title).toContain("run");
    run!.open();
    expect(open).toHaveBeenCalledTimes(2);
  });

  test("an unknown token stays inert code", () => {
    const mentions = buildChatFileMentions(() => {});
    const rows: readonly MeliteCardRow[] = [{ tool: "image_card", draftId: draftIdOf("p_ab12"), runId: null }];
    const resolver = mentions.forClosing(ownerOf({ rows }) as never, "s1" as never);
    expect(resolver!.resolve("p_ab13")).toBeUndefined();
    expect(resolver!.resolve("image_card")).toBeUndefined();
  });
});
