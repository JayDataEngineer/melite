// skillRegistry.ts — the skills seat (REBUILD-16, 2026-09-10): the
// pure plane (skillPlane.ts — the index/read bodies + walkers)
// answers through a Service. The skill.read ledger ride uses the
// QUEUE seat's state root (the gateway ledger's own seam).
//
// Erasable-syntax TS only (node --experimental-strip-types).

import { Service } from "@deepseek-ai/cordis";
import { RemoteError } from "@deepseek-ai/dsh-typert-protocol";
import type { Context } from "@deepseek-ai/cordis";
import { resolveRepoRoot } from "@melite/comfyui-cordis";
import { buildSkillIndex, hSkillRead, hSkillWrite } from "./skillPlane.ts";
import type { SkillDraft } from "./skillAuthored.ts";
import type { FamilyModelsSeat } from "./flowsFamilyCompose.ts";
import type { FlowsSeat } from "./flowsData.ts";

// The authored-skill plane's failure codes, declared HERE (the
// producing seat, next to the throws — the drafts/runs recipe): a
// refusal is the CALLER's business failure, so the door answers its
// own class instead of the catch-all 502 every non-Error mapped to
// (the 2026-11-04 live burn: "model: Field required" surfaced as
// "no seat on this lane serves POST /v1/skills", telling the operator
// a mounted seat was absent).
declare module "@deepseek-ai/dsh-typert-protocol" {
  interface RemoteErrorDetailsMap {
    /** The writer refused the draft (its own verbatim voice). */
    "melite/skill-refused": Record<string, never>;
    /** No skill carries that id (the read door's absence). */
    "melite/skill-unknown": { readonly skillId: string };
  }
}

// ROLE (cookbook adding-a-package role table): Directory: index/read over skill docs. Key "meliteSkills" —
// renamed from "skills" (agent-trace audit, 2026-09-13): DSH core's own
// dsh-skill package registers `super(ctx, "skills")`, and in any
// dsh-base composition the core service OWNS the name — the tools'
// ctx.get('skills') probe resolved to the core service and
// `seats.skills.index is not a function` killed melite_skill_index/melite_skill_read
// in every real agent mount (the wall's bare composition had no core
// row, so the collision was invisible there). Namespaced seat names
// are the law for every estate service that could meet a core twin.
export class SkillDirectoryService extends Service {
  static inject = ["queue"];

  constructor(ctx: Context) {
    super(ctx, "meliteSkills");
  }

  /** GET /v1/skills — the index (count + wire rows, both planes).
   *  The selection rides the WRITER's root: the queue seat's state
   *  root is the same identity the composition derives the drafts
   *  writer's storage tree from (melite-estate index.ts:676), so a
   *  stateRoot-pinned or cold-profile lane serves the bench it
   *  actually writes — never the repo tree no producer writes
   *  (audit 2026-10-31 §8.3, the reader/root orphan). */
  index(): Record<string, unknown> {
    return buildSkillIndex(resolveRepoRoot(), this.ctx.queue.stateRoot);
  }

  /** GET /v1/skills/:id — the doc; 404s answer the door's voice
   *  ("no such skill: <id>"), the read ledgers skill.read. */
  read(sid: string, signal: AbortSignal): Record<string, unknown> {
    signal.throwIfAborted();
    const stateRoot: string = this.ctx.queue.stateRoot;
    // The flow skill bodies compose from the LANE's seat (the
    // lane-seat law): the same read the runs doors thread, so the
    // served body and the composed graph never diverge.
    const answer = hSkillRead(
      resolveRepoRoot(),
      stateRoot,
      sid,
      this.ctx.get("models") as FamilyModelsSeat | undefined,
      this.ctx.get("meliteFlows") as FlowsSeat | undefined,
    );
    if (answer.status === 200) return answer.payload as Record<string, unknown>;
    const err = answer.payload as { error?: unknown };
    const message: string =
      typeof err.error === "string"
        ? err.error
        : /* v8 ignore next -- the doors always shape { error: string }:
             the fallback never fires (2026-09-12) */ "skill read failed";
    // 404-class: the id names nothing (the door's absence, never a
    // transport failure)
    throw new RemoteError("melite/skill-unknown", message, { skillId: sid });
  }

  /** POST /v1/skills — the agent's write door (melite_skill_write):
   *  land one authored skill doc. The body is the WIRE (untyped JSON),
   *  so the fields are validated here, once; the plane's writer owns
   *  the law and speaks the refusal voice. The doc lands in the state
   *  root's authored plane and the same walk that serves tracked
   *  skills serves it — written and read are one law. */
  write(body: unknown): Record<string, unknown> {
    const draft: SkillDraft = parseDraft(body);
    const answer = hSkillWrite(resolveRepoRoot(), this.ctx.queue.stateRoot, draft);
    if (answer.status === 200) return answer.payload as Record<string, unknown>;
    const err = answer.payload as { error?: unknown };
    const message: string =
      typeof err.error === "string"
        ? err.error
        : /* v8 ignore next -- the writer always shapes { error: string } */
          "skill write failed";
    // 400-class: the draft is the caller's to fix (the writer's
    // voice rides verbatim)
    throw new RemoteError("melite/skill-refused", message, {});
  }
}

/** A wire string ("" for anything else — the writer refuses the
 *  empty required fields with its own voice). */
function wireStr(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

/** A wire string list (non-strings dropped rather than stringified:
 *  an example the caller did not state is never invented). */
function wireList(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  const out: string[] = [];
  for (const x of v) {
    if (typeof x !== "string") continue;
    const t: string = x.trim();
    if (t !== "") out.push(t);
  }
  return out;
}

/** The wire body as the draft the plane validates. */
function parseDraft(body: unknown): SkillDraft {
  const b = (typeof body === "object" && body !== null ? body : {}) as {
    model?: unknown;
    name?: unknown;
    description?: unknown;
    trigger_words?: unknown;
    examples?: unknown;
    body?: unknown;
    lora?: unknown;
    replace?: unknown;
  };
  return {
    model: wireStr(b.model),
    name: wireStr(b.name),
    description: wireStr(b.description),
    trigger_words: wireList(b.trigger_words),
    examples: wireList(b.examples),
    body: wireStr(b.body),
    lora: wireStr(b.lora),
    replace: b.replace === true,
  };
}

/** The skills row: gates on the queue seat (the ledger seam). */
export const skillProvider = {
  name: "estate-skills",
  inject: ["queue"] as const,
  apply(ctx: Context): void {
    new SkillDirectoryService(ctx);
  },
};

declare module "@deepseek-ai/cordis" {
  interface Context {
    meliteSkills: SkillDirectoryService;
  }
}
