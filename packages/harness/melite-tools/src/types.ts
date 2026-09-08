/**
 * Registry type surface — re-exported from the vendored src-copy.
 *
 * S3 (2026-09-08): the hand-rolled structural mirror died here. Import
 * from `./vendored/dsh-tool-types.ts` (verbatim upstream @141eb6f with a
 * declared-adaptation ledger); this module stays only so the thirteen
 * tool files' `from '../types.ts'` imports don't churn.
 */
export type {
  GenericCallView,
  GenericResultView,
  JsonSchemaNode,
  JsonSchemaScalar,
  JsonSchemaType,
  JsonValue,
  TextBlock,
  ToolCallKind,
  ToolDefinition,
  ToolExec,
  ToolOutputDefinition,
  ToolResult,
  ToolSchema,
} from './vendored/dsh-tool-types.ts';
