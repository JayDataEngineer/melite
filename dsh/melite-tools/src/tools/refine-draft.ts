/**
 * refine_draft — EDIT an existing action card in place.
 *
 * PATCH {gateway}/v1/pipelines/drafts/{id}/stages/{sid} with
 * {"params": {...}} — a key-wise MERGE into the stage's params. This is
 * the SAME persistence channel the card editor's Save button uses, so
 * the card tile in the conversation updates; nothing re-stacks.
 *
 * The refine loop: build_pipeline composes → the card renders → the
 * user says "make it snow / seed 42 / 5 shots instead" → refine_draft
 * merges exactly those keys → the SAME card carries the edit → the
 * user presses Run. No new card per tweak.
 */
import type { ToolDefinition } from '../types.ts'
import { gatewayRequest } from '../gateway.ts'
import { jsonClean } from '../json-clean.ts'

const TIMEOUT_MS = 15_000

interface StageRow {
  id?: unknown
  title?: unknown
  kind?: unknown
  service?: unknown
  params?: unknown
}

interface DraftDoc {
  draft_id?: unknown
  intent?: unknown
  stages?: StageRow[]
}

export function refineDraft(gatewayUrl: string): ToolDefinition {
  return {
    name: 'refine_draft',
    description:
      'EDIT an existing action card in place: key-wise MERGE params onto the draft\'s stage (the same PATCH channel '
      + 'the card editor\'s Save uses — the SAME card tile updates, nothing re-stacks). Use after build_pipeline when '
      + 'the user tweaks an existing card ("seed 42", "make it snow", "drop the music layer"). For a NEW generation or '
      + 'a different model, build_pipeline again instead. Args: draftId (from build_pipeline), params (the keys to '
      + 'merge — e.g. {"seed":42,"prompt":"..."}), optional stage id (default: the draft\'s first stage).',
    parameters: {
      type: 'object',
      properties: {
        draftId: {
          type: 'string',
          description: 'The draft id from build_pipeline (e.g. "draft-6a96...-1").',
        },
        params: {
          type: 'object',
          additionalProperties: true,
          description: 'The param keys to merge onto the card (e.g. {"seed":42} or {"prompt":"a red fox in snow"}). '
            + 'Unmentioned keys are left untouched.',
        },
        stage: {
          type: 'string',
          description: 'Optional stage id within the draft. Omit to target the first stage (the normal one-card case).',
        },
      },
      required: ['draftId', 'params'],
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: true,
        properties: {
          card: { type: 'string', description: 'Always "draft" — still a card, never a run.' },
          draftId: { type: 'string' },
          stage: { type: 'string', description: 'The stage id that was patched.' },
          params: { type: 'object', description: 'The stage\'s full merged params after the patch.' },
        },
        required: ['card', 'draftId', 'stage', 'params'],
      },
      render: (_args, value) => {
        const v = value as { draftId?: string; stage?: string }
        return [{
          type: 'text',
          text: 'refine_draft ' + String(v.draftId ?? '?') + ' (stage ' + String(v.stage ?? '?')
            + ') — card updated in place, the user presses Run when ready',
        }]
      },
    },
    async execute(args, exec) {
      const a = args as { draftId?: unknown; params?: unknown; stage?: unknown }
      if (typeof a.draftId !== 'string' || a.draftId.length === 0) {
        throw new Error('refine_draft: "draftId" is required (the draft id from build_pipeline)')
      }
      if (a.params === null || typeof a.params !== 'object' || Array.isArray(a.params)) {
        throw new Error('refine_draft: "params" is required (an object of keys to merge, e.g. {"seed":42})')
      }

      // Resolve the target stage: explicit sid, else the draft's first.
      let sid = typeof a.stage === 'string' && a.stage.length > 0 ? a.stage : ''
      if (!sid) {
        const doc = await gatewayRequest(
          gatewayUrl, 'GET', '/v1/pipelines/drafts/' + encodeURIComponent(a.draftId),
          undefined, exec.signal, TIMEOUT_MS,
        ) as DraftDoc
        const stages = Array.isArray(doc.stages) ? doc.stages : []
        if (stages.length === 0) {
          throw new Error('refine_draft: draft "' + a.draftId + '" has no stages to patch')
        }
        const first = stages[0]
        sid = typeof first.id === 'string' && first.id.length > 0 ? first.id : 's_0'
      }

      // CALLS-CARD COERCION (2026-09-01): timeline cards store `calls` as
      // a JSON STRING (compose-time shape from card-tools). An agent
      // refining a calls document passes an ARRAY — coerce it here so the
      // stored param keeps the shape the composer/consumer expects. Same
      // for any other array-valued calls key.
      const mergeParams: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(a.params as Record<string, unknown>)) {
        mergeParams[k] = k === 'calls' && Array.isArray(v) ? JSON.stringify(v) : v
      }

      // Key-wise MERGE via the editor's own persistence door.
      const updated = await gatewayRequest(
        gatewayUrl, 'PATCH',
        '/v1/pipelines/drafts/' + encodeURIComponent(a.draftId) + '/stages/' + encodeURIComponent(sid),
        { params: mergeParams },
        exec.signal, TIMEOUT_MS,
      ) as DraftDoc

      const stages = Array.isArray(updated.stages) ? updated.stages : []
      const patched = stages.find((s) => s.id === sid) ?? stages[0] ?? {}
      const params = (patched.params !== null && typeof patched.params === 'object')
        ? patched.params as Record<string, unknown>
        : {}
      return jsonClean({
        card: 'draft',
        draftId: updated.draft_id ?? a.draftId,
        stage: sid,
        intent: updated.intent ?? null,
        params,
      })
    },
  }
}
