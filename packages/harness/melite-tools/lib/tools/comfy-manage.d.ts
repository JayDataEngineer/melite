import type { ToolDefinition } from '../types.js';
import type { Estate } from '../estate.js';
/** The manage seat's refusal code (the envelope rides the details —
 *  the same declaration manageRegistry makes at the seat; repeated
 *  here because this tool compiles without the seat's module graph —
 *  the cards-resource 'cards/unclassified' pattern). */
declare module '@deepseek-ai/dsh-typert-protocol' {
    interface RemoteErrorDetailsMap {
        'manage/refused': {
            readonly action?: string;
            readonly status?: number;
            readonly code?: string;
            readonly data?: unknown;
        };
    }
}
export declare function comfyManage(estate: Estate): ToolDefinition;
//# sourceMappingURL=comfy-manage.d.ts.map
