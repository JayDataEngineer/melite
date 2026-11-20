import { Service } from "@deepseek-ai/cordis";
import type { Context } from "@deepseek-ai/cordis";
declare module "@deepseek-ai/dsh-typert-protocol" {
    interface RemoteErrorDetailsMap {
        /** The writer refused the draft (its own verbatim voice). */
        "melite/skill-refused": Record<string, never>;
        /** No skill carries that id (the read door's absence). */
        "melite/skill-unknown": {
            readonly skillId: string;
        };
    }
}
export declare class SkillDirectoryService extends Service {
    static inject: string[];
    constructor(ctx: Context);
    /** GET /v1/skills — the index (count + wire rows, both planes).
     *  The selection rides the WRITER's root: the queue seat's state
     *  root is the same identity the composition derives the drafts
     *  writer's storage tree from (melite-estate index.ts:676), so a
     *  stateRoot-pinned or cold-profile lane serves the bench it
     *  actually writes — never the repo tree no producer writes
     *  (audit 2026-10-31 §8.3, the reader/root orphan). */
    index(): Record<string, unknown>;
    /** GET /v1/skills/:id — the doc; 404s answer the door's voice
     *  ("no such skill: <id>"), the read ledgers skill.read. */
    read(sid: string, signal: AbortSignal): Record<string, unknown>;
    /** POST /v1/skills — the agent's write door (melite_skill_write):
     *  land one authored skill doc. The body is the WIRE (untyped JSON),
     *  so the fields are validated here, once; the plane's writer owns
     *  the law and speaks the refusal voice. The doc lands in the state
     *  root's authored plane and the same walk that serves tracked
     *  skills serves it — written and read are one law. */
    write(body: unknown): Record<string, unknown>;
}
/** The skills row: gates on the queue seat (the ledger seam). */
export declare const skillProvider: {
    name: string;
    inject: readonly ["queue"];
    apply(ctx: Context): void;
};
declare module "@deepseek-ai/cordis" {
    interface Context {
        meliteSkills: SkillDirectoryService;
    }
}
//# sourceMappingURL=skillRegistry.d.ts.map