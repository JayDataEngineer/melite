// melite_load — Melite load (the rework, 2026-09-09): open ONE
// card or flow discovered via melite_discover. Returns the bundle:
// agents md + tool-call signature + tier-1 skill lines (+ model
// hints on cards — the boarded families' DECL identity, data FOR
// the card; prompt craft is the agent's own via skill_read, and
// LLM-powered enhance is the user's ✦ door, never this bundle).
// Bodies stay behind skill_read; quote the bundle digest you hold
// and skip reload on a match. Thin door wrapper (gatewayRequest).
import type { ToolDefinition } from '../types.ts'
import { gatewayRequest } from '../gateway.ts'
import { jsonClean } from '../json-clean.ts'

const TIMEOUT_MS = 20_000

export function meliteLoad(gatewayUrl: string): ToolDefinition {
  return {
    name: 'melite_load',
    description:
      'Open ONE card or flow (discover it first with melite_discover). Args: name (the card id or flow name) + '
      + 'inference_type (card | flow — a card or a flow tool call; nothing else executes). Returns the bundle: '
      + 'agents md, the tool-call signature (params_schema for cards; the prebuilt simplified signature for flows), '
      + 'tier-1 skill lines for the underlying skills (bodies load via skill_read — write the prompts yourself from '
      + 'the craft you read), model hints on cards (the boarded families\' DECL identity — id/label/description), '
      + 'and a stable bundle digest — quote it and skip reload on a match.',
    parameters: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'The card id or flow name exactly as discovered.',
        },
        inference_type: {
          type: 'string',
          description: 'card | flow.',
        },
      },
      required: ['name', 'inference_type'],
    },
    presentCall(args) {
      const a = (args ?? {}) as { name?: unknown; inference_type?: unknown };
      const nm = typeof a.name === 'string' && a.name !== '' ? a.name : '?';
      return { card: 'generic', title: `Load ${nm}`, kind: 'search' };
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: true,
        properties: {
          bundle: {
            type: 'object',
            additionalProperties: true,
            description: 'The opened bundle (name/kind/signature/agents/skills + stages/refs on flows, model_hints on cards, digest).',
          },
        },
        required: ['bundle'],
      },
      render: (_args, value) => {
        const v = value as { bundle?: { name?: string; kind?: string; skills?: unknown[] }; error?: string }
        if (v && typeof v.error === 'string') return [{ type: 'text', text: 'melite_load REFUSED: ' + v.error }]
        const b = v?.bundle ?? {}
        const n = Array.isArray(b.skills) ? b.skills.length : 0
        return [{ type: 'text', text: `loaded ${String(b.kind ?? '?')} ${String(b.name ?? '?')} — ${n} skill lines` }]
      },
    },
    async execute(args, exec) {
      const a = (args ?? {}) as { name?: unknown; inference_type?: unknown }
      const name = typeof a.name === 'string' ? a.name : '';
      const inferenceType = typeof a.inference_type === 'string' ? a.inference_type : '';
      if (!name) return jsonClean({ error: 'name is required (discover it first)' });
      if (inferenceType !== 'card' && inferenceType !== 'flow') {
        return jsonClean({ error: 'inference_type must be card|flow — a card or a flow tool call; nothing else executes' });
      }
      const params = new URLSearchParams({ name, inference_type: inferenceType });
      try {
        const res = await gatewayRequest(
          gatewayUrl, 'GET', '/v1/load?' + params.toString(),
          undefined, exec.signal, TIMEOUT_MS,
        );
        return jsonClean(res);
      } catch (e) {
        const err = e as { body?: unknown; message?: string };
        return jsonClean({ error: typeof err.body === 'string' && err.body !== '' ? err.body : (err.message ?? 'load failed') });
      }
    },
  }
}
