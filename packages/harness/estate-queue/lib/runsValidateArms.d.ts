import type { Context } from "@deepseek-ai/cordis";
import type { FlowsValidateAnswer } from "./runsValidate.js";
export declare function validate(doc: unknown, signal: AbortSignal, ctx: Context): Promise<Record<string, unknown>>;
/** Map a CardArmError onto the refusal envelope (door-verbatim:
 *  the error verbatim + code + loc/expected/got only when set). */
export declare function modelValidateArm(body: Record<string, unknown>, ctx: Context): Promise<FlowsValidateAnswer>;
//# sourceMappingURL=runsValidateArms.d.ts.map
