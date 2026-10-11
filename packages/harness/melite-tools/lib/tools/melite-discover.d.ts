import type { ToolDefinition } from '../types.ts';
import type { EstateRequest } from '../estate.ts';
/** Flow summary line (the discover tier — routes, never bodies). */
export interface DiscoverFlowLine {
    name: string;
    title: string;
    description: string;
    stages: number;
    skillRefs: string[];
}
/** Card summary line (tags are card-declared retrieval metadata). */
export interface DiscoverCardLine {
    id: string;
    label: string;
    description: string;
    tags: string[];
}
export declare function meliteDiscover(request: EstateRequest, expandEstateDoors: () => void): ToolDefinition;
//# sourceMappingURL=melite-discover.d.ts.map