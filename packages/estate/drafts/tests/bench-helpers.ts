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
import { openDraftsDomain } from "../src/store.ts";
import type { DraftsDomainSpec } from "../src/spec.js";

export const sig = new AbortController().signal;

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
  process.env["MELITE_STATE_ROOT"] = root;
  process.env["MELITE_STORAGE_ROOT"] = "";
  const ctx = new Context();
  await ctx.plugin(Storage as never);
  await ctx.plugin(
    { name: jsonName, inject: jsonInject, apply: jsonApply, Config: JsonConfig } as never,
    { root: join(root, "storage") },
  );
  await ctx.plugin(
    { name: domainName, inject: domainInject, apply: domainApply, Config: DomainConfig } as never,
    { backend: "json" },
  );
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
