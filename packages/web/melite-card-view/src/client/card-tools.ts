/**
 * card-tools — CARD_TOOLS, the wire-name list every card seat keys on.
 * Its own module because two seats need it at eval time: the client
 * entry (the toolview registrations) and card-mentions (the
 * conversation fold — which tool results carry a draft). Importing
 * card-mentions from the entry would otherwise be a cycle.
 */

/** Every card tool that produces a draft — the card tile renders for ALL of them. */
export const CARD_TOOLS = [
  'melite_flow',
  'image_card', 'tts_card', 'video_card', 'music_card', 'sfx_card',
  'three_d_card', 'motion_card', 'body_card', 'image_edit_card',
  'h3_timeline_card',
  'creature_flow', 'humanoid_flow', 'non_humanoid_flow', 'prop_flow',
  'sprite_sheet',
  // TOOL-PLANE names (the DSH plain-id convention — h3-timeline
  // tool.ts: "the card id, hyphens→underscores, no suffix"): the
  // chat harness calls the tool by THIS name, so the toolview seat
  // must claim it for the conversation card to render (the registry
  // plane's h3_timeline_card is the composition wire name, a
  // different plane). Live-lane receipt 2026-09-12: an accepted
  // h3_timeline chat run rendered the generic tool card, no rows.
  'h3_timeline',
] as const

/** Every flow-edit tool — the chat face is the flow LINK, not a draft
 *  card (operator 2026-11-05: "when it edits a flow, the clickable
 *  link opens the right sidebar flow view"). melite_construct edits
 *  THE SHARED BENCH (no draft id exists to card), so its toolview is
 *  the ConstructCard: the Bench-verb title plus the link that opens
 *  the bench address in the Cards tab. Kept OUT of CARD_TOOLS on
 *  purpose: that list means "produces a draft" (the mentions fold
 *  keys on it), and construct produces none. */
export const FLOW_TOOLS = [
  'melite_construct',
] as const
