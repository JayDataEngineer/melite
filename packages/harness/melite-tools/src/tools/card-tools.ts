/**
 * card-tools.ts — the PLUGIN SYSTEM registrar (2026-08-30).
 *
 * Complex cards OWN their tools: packages/<owner>/cards/<card>/tool.json
 * (beside the card's form) declares name/description/model + the params
 * schema + a small constraint vocabulary. This module fetches
 * GET /v1/card-tools and registers ONE DSH tool per manifest — the
 * executor validates against the DECLARED schema/constraints and lands
 * a draft via the drafts door. Adding a complex card = adding its dir
 * + tool.json; the model receives the tool with ZERO DSH-side code.
 * No godfile: the timeline tool lives where the timeline is defined.
 */

const MANIFEST_TIMEOUT_MS = 15e3
const DRAFT_TIMEOUT_MS = 15e3

// (N-window law, 2026-08-31) MAX_CALLS_PER_RUN=4 IS DELETED. It was a
// THIRD 4-cap living in this executor — the gateway and the manifest
// said one-card-one-run while this layer quietly computed a split plan
// (runPlan/chainedRuns/continueFromPrevRun) and TAUGHT it to the agent
// in the tool's own output. The agent obeyed, the film split, and the
// failure looked like the agent's decision. Untraceable-in-effect
// poison: exactly the class the lane rework exists to make impossible.
// There is no batching. ONE card = ONE run.

interface CardManifest {
	name: string
	version?: number
	kind?: string
	model: string
	stage_title?: string
	description: string
	params_schema: Record<string, any>
	constraints?: Record<string, any>
}

type Tool = ReturnType<typeof buildFlowLike>

// minimal structural twin of the build-flow tool shape so this file
// stays self-contained against the host's tool registry
function buildFlowLike(): any { return {} }

async function gwJson(gatewayUrl: string, method: string, path: string, body: any, signal: AbortSignal | undefined, timeoutMs: number): Promise<any> {
	const ctl = new AbortController()
	const t = setTimeout(() => ctl.abort(), timeoutMs)
	if (signal) signal.addEventListener('abort', () => ctl.abort(), { once: true })
	// lane sessions identify themselves so the gateway can enforce the
	// one-card law server-side (a second compose 409s, a direct flow
	// start 403s). The header is provenance, not authority.
	const sessionHdr: Record<string, string> = { 'content-type': 'application/json' }
	if (process.env.INF_AGENT_SESSION) sessionHdr['x-agent-session'] = process.env.INF_AGENT_SESSION
	try {
		const r = await fetch(gatewayUrl.replace(/\/$/, '') + path, {
			method,
			headers: sessionHdr,
			body: body === undefined ? undefined : JSON.stringify(body),
			signal: ctl.signal,
		})
		const text = await r.text()
		if (!r.ok) throw new Error('gateway ' + String(r.status) + ': ' + text.slice(0, 300))
		return JSON.parse(text)
	} finally { clearTimeout(t) }
}

function fail(tool: string, msg: string): never { throw new Error(tool + ': ' + msg) }

/** Enforce the DECLARED constraint vocabulary. Machinery, not prompts. */
function validateCardArgs(m: CardManifest, args: Record<string, any>): { params: Record<string, any>; calls: any[] | null; fps: number } {
	const name = m.name
	const sch: any = m.params_schema ?? {}
	const props: Record<string, any> = sch.properties ?? {}
	const req: string[] = sch.required ?? []
	for (const k of req) if (args[k] === undefined) fail(name, '"' + k + '" is required')
	if (sch.additional_properties === false) {
		for (const k of Object.keys(args)) if (!(k in props)) fail(name, 'unknown field "' + k + '" (allowed: ' + Object.keys(props).join(', ') + ')')
	}
	const out: Record<string, any> = {}
	for (const [k, def] of Object.entries(props)) {
		const v = args[k] === undefined ? def.default : args[k]
		if (v === undefined) continue
		const t = def.type
		if (t === 'integer' && !(typeof v === 'number' && Number.isInteger(v))) fail(name, k + ' must be an integer')
		if (t === 'number' && typeof v !== 'number') fail(name, k + ' must be a number')
		if (t === 'string' && typeof v !== 'string') fail(name, k + ' must be a string')
		if (t === 'boolean' && typeof v !== 'boolean') fail(name, k + ' must be a boolean')
		if (typeof v === 'number' && def.min !== undefined && v < def.min) fail(name, k + ' must be >= ' + String(def.min))
		if (typeof v === 'number' && def.max !== undefined && v > def.max) fail(name, k + ' must be <= ' + String(def.max))
		if (def.artifact_name === true && typeof v === 'string' && (/^https?:\/\//.test(v) || v.includes('/'))) fail(name, k + ' must be an artifact NAME (no URLs, no paths)')
		out[k] = v
	}
	const cons: any = m.constraints ?? {}
	const callsProp: any = props.calls
	// FLAT vs CALLS cards (the 2026-09-01 image_card regression): a card
	// whose manifest declares NO `calls` property is FLAT — its declared
	// params (prompt, width, seed…) ride the stage doc directly. Only
	// timeline-style cards (h3_timeline_card, video_card) declare calls.
	// Demanding calls[] from a flat card made every dedicated card tool
	// throw "calls[] is required" — unusable.
	if (callsProp === undefined) return { params: out, calls: null, fps: 0 }
	const calls: any[] = Array.isArray(args.calls) ? args.calls : fail(name, 'calls[] is required')
	if (callsProp?.min_items !== undefined && calls.length < callsProp.min_items) fail(name, 'calls needs at least ' + String(callsProp.min_items) + ' entry')
	if (callsProp?.max_items !== undefined && calls.length > callsProp.max_items) fail(name, 'calls exceeds ' + String(callsProp.max_items) + ' entries')
	const itemProps: Record<string, any> = callsProp?.items?.properties ?? {}
	const itemReq: string[] = callsProp?.items?.required ?? []
	if (cons.xor_fields) {
		for (const group of cons.xor_fields as string[][]) {
			const present = group.filter((f2) => args.calls?.some?.((c2: any) => c2[f2] !== undefined))
			for (let i = 0; i < calls.length; i++) {
				const got = group.filter((f2) => calls[i][f2] !== undefined)
				if (got.length === 0) fail(name, 'calls[' + String(i) + '] needs one of: ' + group.join(' / '))
				if (got.length > 1) fail(name, 'calls[' + String(i) + '] has both ' + got.join(' + ') + ' — exactly one')
			}
			void present
		}
	}
	for (let i = 0; i < calls.length; i++) {
		const c2 = calls[i]
		if (typeof c2 !== 'object' || c2 === null) fail(name, 'calls[' + String(i) + '] must be an object')
		for (const k of itemReq) if (c2[k] === undefined) fail(name, 'calls[' + String(i) + '].' + k + ' is required')
		if (callsProp?.items?.additional_properties === false) {
			for (const k of Object.keys(c2)) if (!(k in itemProps)) fail(name, 'calls[' + String(i) + '] unknown field "' + k + '"')
		}
		for (const [k, def] of Object.entries(itemProps)) {
			const v = c2[k]
			if (v === undefined) continue
			if (def.type === 'integer' && !(typeof v === 'number' && Number.isInteger(v))) fail(name, 'calls[' + String(i) + '].' + k + ' must be an integer')
			if (def.type === 'number' && typeof v !== 'number') fail(name, 'calls[' + String(i) + '].' + k + ' must be a number')
			if (typeof v === 'number' && def.min !== undefined && v < def.min) fail(name, 'calls[' + String(i) + '].' + k + ' must be >= ' + String(def.min))
			if (typeof v === 'number' && def.max !== undefined && v > def.max) fail(name, 'calls[' + String(i) + '].' + k + ' must be <= ' + String(def.max))
			if (def.artifact_name === true && typeof v === 'string' && (/^https?:\/\//.test(v) || v.includes('/'))) fail(name, 'calls[' + String(i) + '].' + k + ' must be an artifact NAME')
		}
		if (cons.first_item_forbidden && i === 0) {
			for (const k of cons.first_item_forbidden as string[]) if (c2[k] !== undefined) fail(name, 'calls[0] must NOT set ' + k + ' — there is no previous window')
		}
	}
	if (cons.tile) {
		const t2 = cons.tile as any
		if (t2.from_zero && calls[0][t2.start] !== 0) fail(name, 'calls[0].' + String(t2.start) + ' must be 0 (the timeline starts at 0)')
		for (let i = 1; i < calls.length; i++) {
			if (calls[i][t2.start] !== calls[i - 1][t2.end]) fail(name, 'calls[' + String(i) + '].start_frame ' + String(calls[i][t2.start]) + ' does not tile: previous ends at ' + String(calls[i - 1][t2.end]))
		}
	}
	if (cons.span) {
		const s2 = cons.span as any
		for (let i = 0; i < calls.length; i++) {
			const span = calls[i].end_frame - calls[i].start_frame
			if (span < s2.min) fail(name, 'calls[' + String(i) + '] span ' + String(span) + 'f under the ' + String(s2.min) + 'f floor')
			if (span > s2.max) fail(name, 'calls[' + String(i) + '] span ' + String(span) + 'f exceeds one window (' + String(s2.max) + 'f) — split the shot')
		}
	}
	const fps = typeof out.fps === 'number' ? out.fps : 24
	return { params: out, calls, fps }
}

/**
 * Fetch manifests + build one DSH tool per card.
 *
 * OWNERSHIP TRANSFER (M2′, 2026-09-09): card packages now emit
 * their own tools where the composing host provides a tools service
 * (clothing-placement first). This registrar only serves MODEL
 * cards (rows with model null are filtered below) and dies when the
 * remaining 7 model-card packages land.
 */
export async function cardTools(gatewayUrl: string, signal?: AbortSignal, lane?: string): Promise<Tool[]> {
	// lane mode: the gateway serves EXACTLY the lane's manifest. A lane
	// session must never see another card's tool — impossibility by
	// mounting, not by instruction.
	const path = lane ? '/v1/card-tools?lane=' + encodeURIComponent(lane) : '/v1/card-tools'
	const manifests: CardManifest[] = await gwJson(gatewayUrl, 'GET', path, undefined, signal, MANIFEST_TIMEOUT_MS)
	if (!Array.isArray(manifests) || manifests.length === 0) {
		if (lane) throw new Error('card-tools: lane "' + lane + '" has no manifest on the gateway')
		return []
	}
	if (lane && manifests.length !== 1) throw new Error('card-tools: lane "' + lane + '" resolved ' + String(manifests.length) + ' manifests (must be exactly 1)')

	// ALLOWLIST: only these card tools are exposed to the agent.
	// motion_card (2026-09-06, the kimodo 502 stroke): the comfyui
	// motion lane (model kimodo) is THE kimodo agent tool — the
	// native ggml text-to-motion lane retired the same day
	// (ONE-implementation rule; the wrap won).
	const ALLOWED_CARDS = new Set([
		'h3_timeline_card',
		'voice_lock_card',
		'tts_card',
		'music_card',
		'image_edit_card',
		'motion_card',
	])

	const tools: Tool[] = []
	for (const m of manifests) {
		if (typeof m?.name !== 'string' || !m.name || typeof m.model !== 'string' || !m.model) continue
		if (!ALLOWED_CARDS.has(m.name)) continue
		const toolName = m.name
		const model = m.model
		const stageTitle = typeof m.stage_title === 'string' && m.stage_title ? m.stage_title : model
		tools.push({
			name: toolName,
			description: String(m.description ?? toolName),
			parameters: m.params_schema,
			output: {
				schema: { type: 'object', additionalProperties: true, properties: { card: { type: 'string' }, draftId: { type: 'string' } }, required: ['card', 'draftId'] },
				render: (_a: any, v: any) => [{ type: 'text', text: 'card ' + String(v?.draftId ?? '?') + ' (' + model + ') — '
				+ (Array.isArray(v?.stages) && v.stages.length > 0 ? String(v.stages.length) + ' stage' : String(v?.shots ?? 1) + ' shot') + ', 1 run' }],
			},
			async execute(args: any, exec: any) {
				const a = args ?? {}
				const { params, calls, fps } = validateCardArgs(m, a)
				const intent = typeof a.intent === 'string' && a.intent ? a.intent : fail(toolName, 'intent is required')
				let doc: Record<string, any>
				if (calls === null) {
					// FLAT card: every declared param rides the stage doc as-is.
					doc = {}
					for (const [k, v] of Object.entries(params)) if (k !== 'intent') doc[k] = v
				} else {
					doc = { calls: JSON.stringify(calls), fps, intent }
					for (const [k, v] of Object.entries(params)) if (k !== 'calls' && k !== 'intent') doc[k] = v
				}
				const draft = await gwJson(gatewayUrl, 'POST', '/v1/flows/drafts', {
					intent,
					stages: [{ title: stageTitle, kind: 'generation', service: model, params: doc }],
				}, exec?.signal, DRAFT_TIMEOUT_MS)
				if (typeof draft.draftId !== 'string' || draft.draftId === '') fail(toolName, 'gateway draft POST returned no draftId')
			const clean = (x: any): any => { if (Array.isArray(x)) return x.map(clean); if (x && typeof x === 'object') { const o: any = {}; for (const [k, v] of Object.entries(x)) { const c4 = clean(v); if (c4 !== undefined) o[k] = c4 } return o } if (typeof x === 'function' || x === undefined) return undefined; return x }
				if (calls === null) {
					return clean({
						card: 'draft', draftId: draft.draftId, model, title: stageTitle,
						// ONE card = ONE run. The gateway expands to N windows.
						runs: 1,
						stages: Array.isArray(draft.stages) ? draft.stages : [],
					})
				}
				const totalFrames = calls[calls.length - 1].end_frame
				const seams = calls.filter((c3: any) => c3.first_frame_prev_sec !== undefined).length
					return clean({
					card: 'draft', draftId: draft.draftId, model,
					shots: calls.length, totalFrames,
					durationSec: Math.round((totalFrames / fps) * 100) / 100,
					motionSeams: seams, hardCuts: calls.length - 1 - seams,
					// ONE card = ONE run. The gateway expands to N windows.
					// There is no split plan. There is no chaining.
					runs: 1,
					stages: Array.isArray(draft.stages) ? draft.stages : [],
				})
			},
		} as Tool)
	}
	return tools
}
