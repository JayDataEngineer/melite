import type { GetState, SetState } from "./createStore.js";
import type { TimelineStore } from "./timelineStoreTypes.js";
export declare function createVariantSlice(set: SetState<TimelineStore>, get: GetState<TimelineStore>): Pick<TimelineStore, "addVariant" | "removeVariant" | "promoteVariant" | "setVariants">;
//# sourceMappingURL=timelineVariants.d.ts.map