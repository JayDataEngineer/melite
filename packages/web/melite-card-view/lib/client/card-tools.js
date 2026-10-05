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
];
//# sourceMappingURL=card-tools.js.map
