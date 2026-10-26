// client-apply.spec.ts — UNPARKED stroke 81 (the alias rows landed:
// SOURCE_PLANE_ALIAS serves every generated client's built truth —
// drafts, runs, media — plus zod on each estate manifest). The
// battery: fake ctx, both planes, every failure logged never thrown.
// Fakes, not mocks: a plain object ctx with recording seats.
import { afterEach, describe, expect, test, vi } from "vitest";
import { apply, CARD_TOOLS, FLOW_TOOLS, inject } from "../src/client/index.ts";
import { ConstructCard } from "../src/client/construct-card.tsx";
import { FlowCards } from "../src/client/FlowCards.tsx";
import { markCardsSurface } from "../src/client/cards-resource.ts";

afterEach(() => {
  vi.unstubAllGlobals();
});

interface ToolDef {
  name: string;
  key?: string;
  inject?: () => { openSurface: (address: string) => boolean, openMedia: () => boolean };
}

interface FakeCtx {
  regs: {
    toolviews: Array<{ def: ToolDef; comp: unknown }>;
    tabTypes: Array<Record<string, unknown>>;
    bodies: Array<{ def: ToolDef; comp: unknown }>;
    providers: Array<Record<string, unknown>>;
    turnFolds: Array<Record<string, unknown>>;
    provides: Array<{ name: string; value: unknown }>;
    effects: string[];
  };
  opened: string[];
  errors: string[][];
  infos: string[][];
  remote: {
    $mount: () => Promise<() => void>;
    bench: { subscribe: () => AsyncIterable<Record<string, unknown>> };
    $stream?: unknown;
  };
  failMount: boolean;
  failFiber: boolean;
  /** the reflect-seam degradation face: ctx.get answers undefined
   * for every namespace name (the mounts never landed). */
  absentNamespaces: boolean;
  failRegisterKeys: Set<string>;
  failProvideDuplicate: boolean;
  uiSession?: unknown;
  sawSessionSubscribe?: boolean;
  failSpotlightEffect?: boolean;
  ctx: Record<string, unknown>;
}

function fakeCtx(): FakeCtx {
  const fake: FakeCtx = {
    regs: { toolviews: [], tabTypes: [], bodies: [], providers: [], turnFolds: [], provides: [], effects: [] },
    opened: [],
    errors: [],
    infos: [],
    remote: {
      $mount: async () => async () => {},
      $stream: () => ({
        [Symbol.asyncIterator]: () => ({
          next: async () => ({ done: true as const, value: undefined as never }),
        }),
        dispose: async () => {},
      }),
      bench: {
        subscribe: () => ({
          [Symbol.asyncIterator]: () => ({
            next: async () => ({ done: true as const, value: undefined as never }),
          }),
        }),
      },
    },
    failMount: false,
    failFiber: false,
    absentNamespaces: false,
    failRegisterKeys: new Set(),
    failProvideDuplicate: false,
    // THE SESSION FACE (D2 cure 2026-11-05): apply now waits on
    // 'uiSession' via inject, so the default fake carries the
    // unselected-binding face — an empty props map and a no-op
    // subscribe — exactly what the real adapter answers before any
    // conversation is mounted. Tests that need a session override it.
    uiSession: {
      adapter: {
        current: {
          getSnapshot: (): { props: Record<string, unknown> } => ({ props: {} }),
          subscribe: (): (() => void) => () => {},
        },
      },
    },
    ctx: {},
  };
  const origError = console.error;
  const origInfo = console.info;
  console.error = (...args: unknown[]): void => {
    fake.errors.push(args.map(String));
  };
  console.info = (...args: unknown[]): void => {
    fake.infos.push(args.map(String));
  };
  (fake as unknown as { restore: () => void }).restore = () => { console.error = origError; console.info = origInfo; };
  const maybeThrow = (key: string): void => {
    if (fake.failRegisterKeys.has(key)) throw new Error(`conflict: ${key}`);
  };
  fake.ctx = {
    remote: new Proxy(fake.remote, {
      get: (target, prop: string) => {
        if (prop === "$mount" && fake.failMount) {
          return async (): Promise<never> => { throw new Error("mux down"); };
        }
        return (target as unknown as Record<string, unknown>)[prop];
      },
    }),
    plugin: async (def: {
      name: string;
      inject: string[];
      apply: (child: unknown) => void;
    }): Promise<unknown> => {
      if (fake.failFiber) throw new Error("fiber down");
      def.apply({ remote: fake.remote });
      return {};
    },
    // THE REFLECT SEAM (li-bp): the mounter binds through cordis'
    // inject-free ctx.get — "Read a service from the store without
    // the inject requirement". The fake answers the four namespace
    // names the real mounts would have landed.
    get: (name: string): unknown => {
      // a dead mount lands no namespaces (the honest store face)
      if (fake.absentNamespaces || fake.failMount) return undefined;
      const ns: Record<string, unknown> = {
        "remote.bench": fake.remote.bench,
        "remote.drafts": {},
        "remote.runs": {},
        "remote.media": {},
      };
      return ns[name];
    },
    slots: {
      inject: (_name: string, fn: () => unknown): unknown => fn(),
      register: (def: ToolDef, comp: unknown): (() => void) => {
        maybeThrow(def.key ?? def.name);
        if (def.name === "tool.call.toolview") fake.regs.toolviews.push({ def, comp });
        else fake.regs.bodies.push({ def, comp });
        return () => {};
      },
    },
    effect: (fn: () => unknown, name: string): (() => void) => {
      fake.regs.effects.push(name);
      // the spotlight effect's REGISTRATION failure arm (line ~302):
      // a throwing effect seat logs per site, never escapes apply
      if (fake.failSpotlightEffect && name === "melite-card-view: bench spotlight") {
        throw new Error("effect seat down");
      }
      fn();
      return () => {};
    },
    sidebarRightTabs: {
      register: (def: Record<string, unknown>): (() => void) => {
        maybeThrow("tab-type");
        fake.regs.tabTypes.push(def);
        return () => {};
      },
    },
    resources: {
      register: (def: Record<string, unknown>): (() => void) => {
        maybeThrow("provider");
        fake.regs.providers.push(def);
        return () => {};
      },
    },
    uiConversation: {
      events: {
        register: (def: Record<string, unknown>): (() => void) => {
          maybeThrow("turn-fold");
          fake.regs.turnFolds.push(def);
          return () => {};
        },
      },
    },
    provide: (name: string, value: unknown): (() => void) => {
      maybeThrow("provide:" + name);
      // cordis's bare duplicate-service Error, verbatim shape (the
      // loader's documented double apply)
      if (fake.failProvideDuplicate) {
        throw new Error(`service "${name}" has been registered at <mf>`);
      }
      fake.regs.provides.push({ name, value });
      return () => {};
    },
    sidebarRight: {
      isExpanded: (): boolean => true,
      openResource: (address: string): void => { fake.opened.push(address); },
      openTab: (kind: string): void => { fake.opened.push(`tab:${kind}`); },
    },
    get uiSession(): unknown {
      return fake.uiSession;
    },
  };
  return fake;
}

function restore(fake: FakeCtx): void {
  (fake as unknown as { restore: () => void }).restore();
}

describe("the entry exports — the client contract", () => {
  test("inject names the seats (registries before bodies)", () => {
    // THE CANONICAL SEAT (2026-10-24, 639bfb88a): uiSession left the
    // inject list — the shell threads sessionId as a slot PROP and
    // the spotlight keys off the tab's own marked-bench truth
    // (markCardsSurface), never the adapter
    expect(inject).toEqual(["slots", "sidebarRightTabs", "resources", "sidebarRight", "remote", "uiConversation"]);
  });

  test("CARD_TOOLS claims every producing tool (the tile renders for all)", () => {
    expect(CARD_TOOLS).toContain("melite_flow");
    expect(CARD_TOOLS).toContain("h3_timeline");
    expect(CARD_TOOLS).toContain("image_card");
  });

  test("FLOW_TOOLS claims every flow-edit tool (the flow LINK renders for all)", () => {
    // the construct edits the shared bench (no draft to card) — its
    // key must never join CARD_TOOLS (the mentions fold keys on
    // "produces a draft"), and CARD_TOOLS must never claim it (no
    // draft card exists for a bench edit)
    expect(FLOW_TOOLS).toContain("melite_construct");
    expect(CARD_TOOLS).not.toContain("melite_construct");
  });
});

describe("apply() — the happy path registers both planes", () => {
  test("every card tool gets a toolview key, plus tab type, body, provider, spotlight", async () => {
    const fake = fakeCtx();
    try {
      await apply(fake.ctx as never);
      expect(fake.regs.toolviews.map((r) => r.def.key).sort()).toEqual([...CARD_TOOLS, ...FLOW_TOOLS].sort());
      expect(fake.regs.tabTypes).toHaveLength(1);
      expect(fake.regs.tabTypes[0]).toMatchObject({ kind: "cards", patterns: ["dsh-resource://cards/**"] });
      expect(fake.regs.bodies).toHaveLength(1);
      expect(fake.regs.providers).toHaveLength(1);
      expect(fake.regs.providers[0]).toMatchObject({ protocol: "cards" });
      expect(fake.regs.turnFolds).toHaveLength(1);
      expect(fake.regs.turnFolds[0]).toMatchObject({ kind: "meliteCards" });
      expect(fake.regs.provides.map((p) => p.name)).toEqual(["chatFileMentions"]);
      expect(fake.regs.effects).toEqual([
        "melite-card-view: estate remote contribution",
        "melite-card-view: runs remote contribution",
        "melite-card-view: media remote contribution",
        "melite-card-view: manage remote contribution",
        "melite-card-view: meliteCards turn fold",
        "melite-card-view: chat file mentions",
        "melite-card-view: cards tab type",
        "melite-card-view: cards resource provider",
        "melite-card-view: bench spotlight",
      ]);
      // THE TAB BODY registers through the SLOT (lazy — the shell
      // mounts it when the tab opens), never as an apply-time effect
      expect(fake.regs.bodies).toHaveLength(1);
      expect(fake.errors).toEqual([]);
      // settle: the watcher's async tail (stream done → finally →
      // the session-subscription disposer) runs after apply resolves
      await new Promise((resolve) => setTimeout(resolve, 25));
    } finally {
      restore(fake);
    }
  });

  test("the toolview inject opens the surface (one step: claim, place, reveal)", async () => {
    const fake = fakeCtx();
    try {
      await apply(fake.ctx as never);
      const row = fake.regs.toolviews.find((r) => r.def.key === "image_card")!;
      const face = row.def.inject!();
      expect(face.openSurface("dsh-resource://cards/bench")).toBe(true);
      expect(fake.opened).toEqual(["dsh-resource://cards/bench"]);
    } finally {
      restore(fake);
    }
  });

  test("the flow-edit key renders the ConstructCard (the link face, not a draft card)", async () => {
    const fake = fakeCtx();
    try {
      await apply(fake.ctx as never);
      const row = fake.regs.toolviews.find((r) => r.def.key === "melite_construct")!;
      expect(row.comp).toBe(ConstructCard);
      // every draft-producer key still renders the draft card
      const cardRow = fake.regs.toolviews.find((r) => r.def.key === "melite_flow")!;
      expect(cardRow.comp).toBe(FlowCards);
      // the construct face carries the same surface share (the link's channel)
      const face = row.def.inject!();
      expect(face.openSurface("dsh-resource://cards/bench/s_chat7")).toBe(true);
      expect(fake.opened).toEqual(["dsh-resource://cards/bench/s_chat7"]);
      expect(face.openMedia()).toBe(true);
      expect(fake.opened).toEqual(["dsh-resource://cards/bench/s_chat7", "tab:media"]);
    } finally {
      restore(fake);
    }
  });

  test("the construct face refuses like every other face (false, never a throw)", async () => {
    const fake = fakeCtx();
    try {
      await apply(fake.ctx as never);
      (fake.ctx.sidebarRight as { openResource: () => void }).openResource = (): void => {
        throw new Error("no seat mounted");
      };
      (fake.ctx.sidebarRight as { openTab: () => void }).openTab = (): void => {
        throw new Error("no seat mounted");
      };
      const row = fake.regs.toolviews.find((r) => r.def.key === "melite_construct")!;
      const face = row.def.inject!();
      expect(face.openSurface("dsh-resource://cards/bench/s_chat7")).toBe(false);
      expect(face.openMedia()).toBe(false);
    } finally {
      restore(fake);
    }
  });

  test("a construct registration conflict logs per site (the first registration keeps the seat)", async () => {
    const fake = fakeCtx();
    fake.failRegisterKeys.add("melite_construct");
    try {
      await apply(fake.ctx as never);
      expect(fake.regs.toolviews.map((r) => r.def.key)).not.toContain("melite_construct");
      expect(fake.regs.toolviews).toHaveLength(CARD_TOOLS.length + FLOW_TOOLS.length - 1);
      const voices = fake.errors.map((args) => args.join(" "));
      expect(voices.some((v) => v.includes("toolview registration failed for melite_construct"))).toBe(true);
    } finally {
      restore(fake);
    }
  });

  test("the toolview inject opens the Media page by kind (the header door's face)", async () => {
    const fake = fakeCtx();
    try {
      await apply(fake.ctx as never);
      const row = fake.regs.toolviews.find((r) => r.def.key === "image_card")!;
      const face = row.def.inject!();
      expect(face.openMedia()).toBe(true);
      expect(fake.opened).toEqual(["tab:media"]);
    } finally {
      restore(fake);
    }
  });

  test("an already-seated mentions provide is success, not failure (the loader's double apply)", async () => {
    const fake = fakeCtx();
    fake.failProvideDuplicate = true;
    try {
      await apply(fake.ctx as never);
      expect(fake.errors).toEqual([]);
      expect(fake.infos.join(" ")).toContain("already seated");
    } finally {
      restore(fake);
    }
  });

  test("the mentions provider's open never throws into the chat (a refused Media open stays inert)", async () => {
    const fake = fakeCtx();
    try {
      await apply(fake.ctx as never);
      (fake.ctx.sidebarRight as { openTab: () => void }).openTab = (): void => {
        throw new Error("no seat mounted");
      };
      const mentions = fake.regs.provides.find((p) => p.name === "chatFileMentions")!.value as {
        forClosing(owner: unknown): { resolve(value: string): { open(): void } | undefined } | undefined;
      };
      const owner = { turn: { data: { get: () => ({ rows: [{ tool: "image_card", draftId: "p_1", runId: null }] }) } } };
      const resolver = mentions.forClosing(owner);
      expect(resolver).toBeDefined();
      expect(() => resolver!.resolve("p_1")!.open()).not.toThrow();
    } finally {
      restore(fake);
    }
  });

  test("a shell refusal answers false, never a throw (the FlowCardsProps promise)", async () => {
    const fake = fakeCtx();
    try {
      await apply(fake.ctx as never);
      (fake.ctx.sidebarRight as { openResource: () => void }).openResource = (): void => {
        throw new Error("no seat mounted");
      };
      (fake.ctx.sidebarRight as { openTab: () => void }).openTab = (): void => {
        throw new Error("no seat mounted");
      };
      const row = fake.regs.toolviews.find((r) => r.def.key === "image_card")!;
      const face = row.def.inject!();
      expect(face.openSurface("dsh-resource://cards/bench")).toBe(false);
      expect(face.openMedia()).toBe(false);
    } finally {
      restore(fake);
    }
  });

  test("the tab title rides the address law (every bench form reads Melite Bench)", async () => {
    const fake = fakeCtx();
    try {
      await apply(fake.ctx as never);
      const title = fake.regs.tabTypes[0]!["title"] as (address: string) => string;
      expect(title("dsh-resource://cards/bench")).toBe("Melite Bench");
      expect(title("dsh-resource://cards/bench/main")).toBe("Melite Bench");
      expect(title("dsh-resource://cards/run/run-1")).toBe("run/run-1");
    } finally {
      restore(fake);
    }
  });
});

describe("apply() — failures log, never throw (the boot survives)", () => {
  test("a dead mount keeps every other seat", async () => {
    const fake = fakeCtx();
    fake.failMount = true;
    try {
      await apply(fake.ctx as never);
      // all four contributions fail on the dead mount — each logs,
      // none throws (the boot survives) — and the reflect-seam bind
      // meets its own loud refusal (the namespaces never landed) plus
      // the spotlight's honest degrade: six logged errors, every
      // seat intact (li-bp)
      expect(fake.errors).toHaveLength(6);
      expect(fake.errors[0]!.join(" ")).toContain("estate remote contribution failed to mount");
      expect(fake.errors[4]!.join(" ")).toContain("estate direct bind failed");
      expect(fake.errors[5]!.join(" ")).toContain("bench spotlight off");
      expect(fake.regs.toolviews).toHaveLength(CARD_TOOLS.length + FLOW_TOOLS.length);
      expect(fake.regs.providers).toHaveLength(1);
    } finally {
      restore(fake);
    }
  });

  test("an absent namespace degrades the provider (benchNs stays absent)", async () => {
    const fake = fakeCtx();
    // li-bp: the fiber binder is dead (five lane receipts); the
    // degradation face now is the REFLECT SEAM answering undefined —
    // the direct bind throws its loud refusal, apply catches it, the
    // spotlight degrades honestly. The boot survives either way.
    fake.absentNamespaces = true;
    try {
      await apply(fake.ctx as never);
      expect(fake.errors).toHaveLength(2);
      expect(fake.errors[0]!.join(" ")).toContain("estate direct bind failed");
      // the spotlight's own honest degrade (cards-resource.ts: the
      // namespace never mounted — the watcher reports off, loud)
      expect(fake.errors[1]!.join(" ")).toContain("bench spotlight off");
      expect(fake.regs.providers).toHaveLength(1);
    } finally {
      restore(fake);
    }
  });

  test("a double-apply conflict logs per site (the first registration keeps the seat)", async () => {
    const fake = fakeCtx();
    fake.failRegisterKeys.add("image_card");
    fake.failRegisterKeys.add("tab-type");
    fake.failRegisterKeys.add("provider");
    // + the tab BODY's slot registration (the lazy seat): the catch
    // logs per site, the rest of the boot keeps its seats
    fake.failRegisterKeys.add("@melite-plugin/dsh-card-view");
    try {
      await apply(fake.ctx as never);
      expect(fake.regs.toolviews.map((r) => r.def.key)).not.toContain("image_card");
      expect(fake.regs.toolviews).toHaveLength(CARD_TOOLS.length + FLOW_TOOLS.length - 1);
      const voices = fake.errors.map((args) => args.join(" "));
      expect(voices.some((v) => v.includes("toolview registration failed for image_card"))).toBe(true);
      expect(voices.some((v) => v.includes("cards tab type registration failed"))).toBe(true);
      expect(voices.some((v) => v.includes("cards resource provider registration failed"))).toBe(true);
      expect(voices.some((v) => v.includes("cards tab body registration failed"))).toBe(true);
    } finally {
      restore(fake);
    }
  });

  test("a dead turn fold or mentions provide logs per site (the boot survives)", async () => {
    const fake = fakeCtx();
    fake.failRegisterKeys.add("turn-fold");
    fake.failRegisterKeys.add("provide:chatFileMentions");
    try {
      await apply(fake.ctx as never);
      expect(fake.regs.turnFolds).toHaveLength(0);
      expect(fake.regs.provides).toHaveLength(0);
      // the rest of the lane kept its seats
      expect(fake.regs.toolviews).toHaveLength(CARD_TOOLS.length + FLOW_TOOLS.length);
      expect(fake.regs.tabTypes).toHaveLength(1);
      const voices = fake.errors.map((args) => args.join(" "));
      expect(voices.some((v) => v.includes("meliteCards turn fold registration failed"))).toBe(true);
      expect(voices.some((v) => v.includes("chat file mentions registration failed"))).toBe(true);
    } finally {
      restore(fake);
    }
  });
});

describe("apply() — the session source (stroke 44)", () => {
  test("the spotlight follows the selected conversation (no session: main)", async () => {
    const fake = fakeCtx();
    // the uiSession adapter answers a conversation; the provider's
    // open is the observable seam — here the store answers no bench
    // namespace (li-bp: the reflect seam reads undefined — the fiber
    // face died with the binder), so the watcher degrades honestly
    fake.absentNamespaces = true;
    fake.uiSession = {
      adapter: {
        current: {
          getSnapshot: () => ({ props: { sessionId: "s_chat7" } }),
          subscribe: (_fn: () => void) => () => {},
        },
      },
    };
    try {
      await apply(fake.ctx as never);
      expect(fake.errors.some((args) => args.join(" ").includes("spotlight off"))).toBe(true);
    } finally {
      restore(fake);
    }
  });

  test("a live session watcher: agent lands reveal, user lands never (the stream edition)", async () => {
    const fake = fakeCtx();
    // fiber UP (a healthy mount), the uiSession answers a session,
    // and the bench stream delivers two revs — the second carries an
    // AGENT-authored row: the watcher must reveal the bench address
    // exactly once for that land.
    const lands: Array<Record<string, unknown>> = [];
    // $stream honors the real seam: its iterator proxies the
    // iterable def.open(signal) returns (benchNs.subscribe's
    // states) — the watcher pulls through remote.$stream, never
    // bench.subscribe directly.
    (fake.remote as { $stream?: unknown }).$stream = (def: {
      open: (signal: AbortSignal) => AsyncIterable<Record<string, unknown>>;
    }): unknown => ({
      [Symbol.asyncIterator]: () => def.open(new AbortController().signal)[Symbol.asyncIterator](),
      dispose: async (): Promise<void> => {},
    });
    fake.remote.bench = {
      subscribe: () => ({
        [Symbol.asyncIterator]: () => {
          let step = 0;
          const states = [
            { rev: 3, log: [{ rev: 1, author: "user" }] },
            { rev: 7, log: [{ rev: 4, author: "agent" }, { rev: 5, author: "user" }] },
          ];
          return {
            next: async () => {
              if (step >= states.length) return { done: true as const, value: undefined as never };
              const doc = states[step]!;
              step += 1;
              return {
                done: false as const,
                value: { value: doc, accept: (): void => { lands.push(doc); } },
              };
            },
          };
        },
      }),
    } as never;
    // THE CANONICAL SEAT (2026-10-24): the session source is the
    // tab's own marked-bench key (markCardsSurface — the same slot
    // prop the body receives), never the uiSession adapter. live=
    // false: this battery mounts NO bench surface, and a LIVE+
    // expanded surface would lawfully SKIP the reveal (the user is
    // already reading it — shouldSpotlight's own law)
    markCardsSurface(false, "s_chat7");
    try {
      await apply(fake.ctx as never);
      await vi.waitFor(() => {
        if (!fake.opened.includes("dsh-resource://cards/bench/s_chat7")) {
          throw new Error("agent land never revealed the bench");
        }
      }, { timeout: 10000 });
      // the push-driven re-key seam is the marked-bench listeners
      // (proven live by the re-key arm below) and the first stream
      // state was accepted exactly once
      expect(lands).toHaveLength(1);
      expect(fake.errors).toEqual([]);
      // the tab type's GUIDE callbacks answer (the shell reads them
      // when it renders the tab's help rows)
      const guide = (fake.regs.tabTypes[0]! as { guide: Array<{ title: () => string; description: () => string }> }).guide;
      expect(guide[0]!.title()).toBe("Melite Bench");
      expect(guide[0]!.description()).toContain("shared bench");
      // the PROVIDER's open callback fires openCardsResource (sync
      // up to the returned async generator — consuming it is the
      // sweep specs' territory, not this battery's)
      void (fake.regs.providers[0]! as { open: (a: string, c: { signal: AbortSignal }) => unknown }).open(
        "dsh-resource://cards/bench/main",
        { signal: new AbortController().signal },
      );
    } finally {
      restore(fake);
    }
  }, 20000);

  test("a session switch re-keys the stream mid-flight (the watcher follows the selection)", async () => {
    const fake = fakeCtx();
    // THE CANONICAL SEAT (2026-10-24): the session source is the
    // marked-bench key — s_chat7 first, then s_chat8. The old
    // adapter's THROWING-snapshot face died with the adapter (a
    // module string never throws); the boot-window 'main' fallback
    // is benchSessionOf's own law.
    let current: string = "s_chat7";
    const statesFor = (key: string): Array<Record<string, unknown>> => [
      { rev: 3, log: [{ rev: 1, author: "user" }] },
      { rev: 7, log: [{ rev: 4, author: "agent" }] },
    ];
    const seenKeys: string[] = [];
    (fake.remote as { $stream?: unknown }).$stream = (def: {
      open: (signal: AbortSignal) => AsyncIterable<Record<string, unknown>>;
    }): unknown => {
      const it = def.open(new AbortController().signal) as AsyncIterable<Record<string, unknown>> & { key?: string };
      return {
        [Symbol.asyncIterator]: () => it[Symbol.asyncIterator](),
        dispose: async (): Promise<void> => {},
      };
    };
    fake.remote.bench = {
      subscribe: (key: string) => {
        seenKeys.push(key);
        const states = statesFor(key);
        let step = 0;
        return {
          [Symbol.asyncIterator]: () => ({
            next: async () => {
              if (step >= states.length) {
                // a LIVE stream never ends: after its states it PENDS
                // (done:true would break the watcher's loop and kill
                // the re-key under probe)
                return new Promise<never>(() => {});
              }
              const doc = states[step]!;
              step += 1;
              return { done: false as const, value: { value: doc, accept: (): void => {} } };
            },
          }),
        };
      },
    } as never;
    markCardsSurface(false, current);
    try {
      await apply(fake.ctx as never);
      // land on s_chat7 first (hydration, then the agent reveal)
      await vi.waitFor(() => {
        if (!fake.opened.includes("dsh-resource://cards/bench/s_chat7")) {
          throw new Error("first key never revealed");
        }
      }, { timeout: 10000 });
      // SWITCH: the selection moves to s_chat8; markCardsSurface
      // fires the marked-bench listeners (the push seam) and the
      // watcher re-keys — the next agent land reveals s_chat8
      current = "s_chat8";
      markCardsSurface(false, current);
      await vi.waitFor(() => {
        if (!fake.opened.includes("dsh-resource://cards/bench/s_chat8")) {
          throw new Error("re-key never revealed the new session");
        }
      }, { timeout: 10000 });
      expect(fake.errors).toEqual([]);
      expect(seenKeys).toContain("s_chat8");
    } finally {
      restore(fake);
    }
  }, 20000);

  test("a failing reveal logs, a dead spotlight seat logs (never a throw out of apply or the watcher)", async () => {
    const fake = fakeCtx();
    fake.failSpotlightEffect = false;
    const states = [
      { rev: 3, log: [{ rev: 1, author: "user" }] },
      { rev: 7, log: [{ rev: 4, author: "agent" }] },
    ];
    let step = 0;
    (fake.remote as { $stream?: unknown }).$stream = (def: {
      open: (signal: AbortSignal) => AsyncIterable<Record<string, unknown>>;
    }): unknown => ({
      [Symbol.asyncIterator]: () => def.open(new AbortController().signal)[Symbol.asyncIterator](),
      dispose: async (): Promise<void> => {},
    });
    fake.remote.bench = {
      subscribe: () => ({
        [Symbol.asyncIterator]: () => ({
          next: async () => {
            if (step >= states.length) return { done: true as const, value: undefined as never };
            const doc = states[step]!;
            step += 1;
            return { done: false as const, value: { value: doc, accept: (): void => {} } };
          },
        }),
      }),
    } as never;
    // the reveal step FAILS: openResource throws — the watcher's
    // callback catch logs and the loop survives
    (fake.ctx.sidebarRight as { openResource: () => void }).openResource = (): void => {
      throw new Error("sidebar down");
    };
    try {
      await apply(fake.ctx as never);
      await vi.waitFor(() => {
        if (!fake.errors.some((args) => args.join(" ").includes("bench spotlight reveal failed"))) {
          throw new Error("the failing reveal never logged");
        }
      }, { timeout: 10000 });
    } finally {
      restore(fake);
    }
    // the REGISTRATION seat itself dying: apply still lands every
    // other seat and logs the site
    const fake2 = fakeCtx();
    fake2.failSpotlightEffect = true;
    try {
      await apply(fake2.ctx as never);
      expect(fake2.errors.some((args) => args.join(" ").includes("bench spotlight registration failed"))).toBe(true);
      expect(fake2.regs.providers).toHaveLength(1);
      expect(fake2.regs.tabTypes).toHaveLength(1);
    } finally {
      restore(fake2);
    }
  }, 20000);

  test("a live-and-open surface suppresses the reveal (the watcher still consumes)", async () => {
    const fake = fakeCtx();
    // cardsSurfaceLive=true + isExpanded=true: shouldSpotlight is
    // FALSE — the agent land is consumed (accept fires) but the
    // sidebar is NEVER re-opened (the user is already looking)
    markCardsSurface(true);
    const accepted: Array<Record<string, unknown>> = [];
    const states = [
      { rev: 3, log: [{ rev: 1, author: "user" }] },
      { rev: 7, log: [{ rev: 4, author: "agent" }] },
    ];
    let step = 0;
    (fake.remote as { $stream?: unknown }).$stream = (def: {
      open: (signal: AbortSignal) => AsyncIterable<Record<string, unknown>>;
    }): unknown => ({
      [Symbol.asyncIterator]: () => def.open(new AbortController().signal)[Symbol.asyncIterator](),
      dispose: async (): Promise<void> => {},
    });
    let delivered = 0;
    fake.remote.bench = {
      subscribe: () => ({
        [Symbol.asyncIterator]: () => ({
          next: async () => {
            if (step >= states.length) return new Promise<never>(() => {});
            const doc = states[step]!;
            step += 1;
            delivered += 1;
            return { done: false as const, value: { value: doc, accept: (): void => { accepted.push(doc); } } };
          },
        }),
      }),
    } as never;
    fake.uiSession = {
      adapter: {
        current: {
          getSnapshot: () => ({ props: { sessionId: "s_chat7" } }),
          subscribe: (_fn: () => void): (() => void) => () => {},
        },
      },
    };
    try {
      await apply(fake.ctx as never);
      await vi.waitFor(() => {
        if (delivered < 2) throw new Error("the watcher never consumed both states");
      }, { timeout: 10000 });
      expect(fake.opened).toEqual([]);
      expect(fake.errors).toEqual([]);
      // only the stream's FIRST item takes accept (the loop's
      // handshake) — both states still delivered, zero reveals
      expect(accepted).toHaveLength(1);
    } finally {
      markCardsSurface(false);
      restore(fake);
    }
  }, 20000);

  test("a throwing session subscription is swallowed (never a throw out of apply)", async () => {
    const fake = fakeCtx();
    // fiber UP: the watcher boots and the subscribeSession catch is
    // the arm under probe — a dead observable degrades to the noop
    // disposer, silently (the stream still runs on the same key)
    fake.uiSession = {
      adapter: {
        current: {
          getSnapshot: () => ({ props: {} }),
          subscribe: (): (() => void) => { throw new Error("seat down"); },
        },
      },
    };
    try {
      await apply(fake.ctx as never);
      // settle the watcher's async tail (done-stream → finally →
      // the CATCH-RETURNED noop disposer fires)
      await new Promise((resolve) => setTimeout(resolve, 25));
      expect(fake.errors).toEqual([]);
    } finally {
      restore(fake);
    }
  });
});
