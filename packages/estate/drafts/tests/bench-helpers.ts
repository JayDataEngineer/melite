// bench.spec.ts — the bench engine's own laws, function-grain over a
// REAL json+domain storage stack (no remote, no plugin): every
// refusal voice (bad-session/bad-body/CAS/stage-not-found/duplicate),
// the load path's normalize contract, every mutation arm's edge
// shapes, and the WHOLE undo-inverse table — including crafted log
// entries whose inverse payloads miss optional fields (the log is
// data; the applier is robust to older/hand-written entries).
import { onTestFinished } from "vitest";
import { mkdtempSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Context } from "@deepseek-ai/cordis";
import Storage from "@deepseek-ai/dsh-storage";
import {
  apply as jsonApply, Config as JsonConfig, inject as jsonInject, name as jsonName,
} from "@deepseek-ai/dsh-storage-json";
import {
  apply as domainApply, Config as DomainConfig, inject as domainInject, name as domainName,
} from "@deepseek-ai/dsh-storage-domain";
import type { Domain } from "@deepseek-ai/dsh-storage-domain";
import { remoteErrorOf } from "@deepseek-ai/dsh-typert-protocol";
import { openDraftsDomain } from "../src/store.ts";
import type { DraftsDomainSpec } from "../src/spec.js";

export const sig: AbortSignal = new AbortController().signal; // explicit: the inferred type names @types/node's internal web-globals module, which declaration emit cannot name

// TMP OWNERSHIP (stroke 13): every bootCtx tree is owned — the
// disposer runs through onTestFinished so a leaked tree can never
// outlive its test (the suite once minted ~a million /tmp inodes
// across iterate-run-fix loops).
export function mintRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "bench-spec-"));
  onTestFinished(() => rmSync(root, { recursive: true, force: true }));
  return root;
}

export async function bootCtx(): Promise<{ ctx: Context; domain: Domain<DraftsDomainSpec> }> {
  const root = mintRoot();
  mkdirSync(join(root, "storage"), { recursive: true });
  const ctx = new Context();
  // J12: the storage root rides the seat's config (the retired
  // MELITE_STATE_ROOT / MELITE_STORAGE_ROOT env seams' call data)
  new DraftsDomainSeatService(ctx, { storageRoot: join(root, "storage") });
  await ctx.plugin(Storage as never, undefined as never); // Storage takes no config; cordis Spread<GetPluginConfig> keeps the config arg positional
  await ctx.plugin(
    { name: jsonName, inject: jsonInject, apply: jsonApply, Config: JsonConfig } as never,
    { root: join(root, "storage") } as never, // the plugin is cast to never so its Config schema cannot name the static type; the backend validates the shape at mount
  );
  await ctx.plugin(
    { name: domainName, inject: domainInject, apply: domainApply, Config: DomainConfig } as never,
    { backend: "json" } as never, // same never-plugin law as the json backend above
  );
  // THE EVENT SEAT (the hand-roll row 1.2): the bench push spine is
  // the typed `bench.changed` event; every test tree installs the same
  // seam the plugin installs, so no test can pass by skipping the bus.
  installBenchChangeSeam(ctx);
  return { ctx, domain: await openDraftsDomain(ctx) };
}

export async function boot(): Promise<Domain<DraftsDomainSpec>> {
  return (await bootCtx()).domain;
}

/** One bench doc seeded straight into the domain (log = data). */
export async function seed(
  drafts: Domain<DraftsDomainSpec>,
  session: string,
  doc: Record<string, unknown>,
): Promise<void> {
  await drafts.table("docs").put("bench-" + session, {
    updated_at: 1,
    doc: {
      draft_id: "bench-" + session,
      intent: "seeded",
      status: "ready",
      createdAt: 1,
      completedAt: null,
      ...doc,
    } as never,
  });
}

/** A recovered Remote failure (code + message + the structured
 *  details the wire carries) — the cookbook's recovery shape
 *  (adding-a-remote-api §5: remoteErrorOf after catching). */
export type Failure = NonNullable<ReturnType<typeof remoteErrorOf>>;

/** Recover a refusal the cookbook's way: `remoteErrorOf` after
 *  catching — structural, so a throw from another module copy of the
 *  class still matches. A resolve or a non-Remote throw is a wall
 *  failure (NOT a string to regex): a local defect must crash the
 *  wall, never read as a bench voice. Use for code + details
 *  assertions; `codeOf` stays for the prose walls. */
export async function failureOf(p: Promise<unknown>): Promise<Failure> {
  let caught: unknown;
  try {
    await p;
  } catch (e) {
    caught = e;
  }
  if (caught === undefined) throw new Error("expected a refusal, the call resolved");
  const failure = remoteErrorOf(caught);
  if (failure === undefined) throw new Error(`not a Remote failure: ${String(caught)}`);
  return failure;
}

/** The sync refusal's recovery (getBench throws before any await). */
export function syncFailureOf(fn: () => unknown): Failure {
  let caught: unknown;
  try {
    fn();
  } catch (e) {
    caught = e;
  }
  if (caught === undefined) throw new Error("expected a refusal, the call resolved");
  const failure = remoteErrorOf(caught);
  if (failure === undefined) throw new Error(`not a Remote failure: ${String(caught)}`);
  return failure;
}

/** The refusal's code, or NO-REFUSAL on resolve. */
export async function codeOf(p: Promise<unknown>): Promise<string> {
  try {
    await p;
    return "NO-REFUSAL";
  } catch (e) {
    const err = e as { code?: string; message?: string };
    return (err.code ?? "NOT-REMOTE") + "|" + String(err.message);
  }
}

/** The sync refusal's code (getBench throws before any await). */
export function syncCodeOf(fn: () => unknown): string {
  try {
    fn();
    return "NO-REFUSAL";
  } catch (e) {
    const err = e as { code?: string; message?: string };
    return (err.code ?? "NOT-REMOTE") + "|" + String(err.message);
  }
}

import { installBenchChangeSeam } from "../src/remote.ts";
import { DraftsDomainSeatService } from "../src/store.ts";
