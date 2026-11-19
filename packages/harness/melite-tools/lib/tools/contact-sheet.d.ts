import type { Context } from '@deepseek-ai/cordis';
import { imageRefFromValue } from './melite-view.js';
import type { ToolDefinition } from '../types.js';
/** One run's row in the canonical value: the picked artifact when
 *  the run holds one (artifact/url/host), or `missing: true` when it
 *  does not (the gray cell — the failure is judgment data, so it is
 *  NAMED, never dropped). A type alias, not an interface: the tool
 *  registration bounds the run value by a JsonValue record, and
 *  aliases carry the implicit index signature interfaces lack. */
export type SheetRunRow = {
    run_id: string;
    artifact?: string;
    url?: string;
    host?: string;
    missing?: true;
};
/** The canonical value: per-run rows plus the committed sheet. Alias
 *  for the same JsonValue-record reason as SheetRunRow. */
export type ContactSheetValue = {
    runs: SheetRunRow[];
    image: NonNullable<Parameters<typeof imageRefFromValue>[0]>;
    columns: number;
    cell: number;
};
/** Build the melite_contact_sheet tool against the live cordis
 *  context (the seats: `attachments` — the durable store, `queue` —
 *  the runs tree root owner, `llm` — the route gate; all optional
 *  probes, the tool-fs inject law).
 *  @param ctx the host context.
 *  @returns the registered tool definition. */
export declare function meliteContactSheet(ctx: Context): ToolDefinition;
//# sourceMappingURL=contact-sheet.d.ts.map
