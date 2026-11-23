import type { ToolDefinition } from '../types.js';
import type { Estate } from '../estate.js';
/** THE AUTHORED-DOC CAP (tool-context audit F5, 2026-11-22): the
 *  authored body was the one UNBOUNDED path into the context — a
 *  later melite_skill_read returns it WHOLE, so growth was
 *  disk-content-bound end to end. The write door refuses past 32KB
 *  (the load seat's own budget, estate-queue loadPlane.ts MAX_BYTES,
 *  is the house precedent): the read door never meets a doc this
 *  door did not bound. */
export declare const AUTHORED_BODY_CAP_BYTES: number;
export declare function skillWrite(estate: Estate): ToolDefinition;
//# sourceMappingURL=skill-write.d.ts.map
