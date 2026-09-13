// skillRegistry.ts — the skills seat (REBUILD-16, 2026-09-10): the
// pure plane (skillPlane.ts — the index/read bodies + walkers)
// answers through a Service. The skill.read ledger ride uses the
// QUEUE seat's state root (the gateway ledger's own seam).
//
// Erasable-syntax TS only (node --experimental-strip-types).

import { Service } from "@deepseek-ai/cordis";
import type { Context } from "@deepseek-ai/cordis";
import { resolveRepoRoot } from "@melite/comfyui-cordis";
import { buildSkillIndex, hSkillRead } from "./skillPlane.ts";

// ROLE (cookbook adding-a-package role table): Directory: index/read over skill docs. Key "meliteSkills" —
// renamed from "skills" (agent-trace audit, 2026-09-13): DSH core's own
// dsh-skill package registers `super(ctx, "skills")`, and in any
// dsh-base composition the core service OWNS the name — the tools'
// ctx.get('skills') probe resolved to the core service and
// `seats.skills.index is not a function` killed skill_index/skill_read
// in every real agent mount (the wall's bare composition had no core
// row, so the collision was invisible there). Namespaced seat names
// are the law for every estate service that could meet a core twin.
export class SkillDirectoryService extends Service {
  static inject = ["queue"];

  constructor(ctx: Context) {
    super(ctx, "meliteSkills");
  }

  /** GET /v1/skills — the index (count + wire rows, both planes). */
  index(): Record<string, unknown> {
    return buildSkillIndex(resolveRepoRoot());
  }

  /** GET /v1/skills/:id — the doc; 404s answer the door's voice
   *  ("no such skill: <id>"), the read ledgers skill.read. */
  read(sid: string, signal: AbortSignal): Record<string, unknown> {
    signal.throwIfAborted();
    const stateRoot: string = this.ctx.queue.stateRoot;
    const answer = hSkillRead(resolveRepoRoot(), stateRoot, sid);
    if (answer.status === 200) return answer.payload as Record<string, unknown>;
    const err = answer.payload as { error?: unknown };
    throw new Error(
      typeof err.error === "string"
        ? err.error
        : /* v8 ignore next -- the doors always shape { error: string }:
             the fallback never fires (2026-09-12) */ "skill read failed",
    );
  }
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
