import { Service } from "@deepseek-ai/cordis";
import type { Context } from "@deepseek-ai/cordis";
export declare class SkillDirectoryService extends Service {
    static inject: string[];
    constructor(ctx: Context);
    /** GET /v1/skills — the index (count + wire rows, both planes). */
    index(): Record<string, unknown>;
    /** GET /v1/skills/:id — the doc; 404s answer the door's voice
     *  ("no such skill: <id>"), the read ledgers skill.read. */
    read(sid: string, signal: AbortSignal): Record<string, unknown>;
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
