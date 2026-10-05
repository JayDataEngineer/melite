/**
 * card-tools — CARD_TOOLS, the wire-name list every card seat keys on.
 * Its own module because two seats need it at eval time: the client
 * entry (the toolview registrations) and card-mentions (the
 * conversation fold — which tool results carry a draft). Importing
 * card-mentions from the entry would otherwise be a cycle.
 */
/** Every card tool that produces a draft — the card tile renders for ALL of them. */
export declare const CARD_TOOLS: readonly ["melite_flow", "image_card", "tts_card", "video_card", "music_card", "sfx_card", "three_d_card", "motion_card", "body_card", "image_edit_card", "h3_timeline_card", "creature_flow", "humanoid_flow", "non_humanoid_flow", "prop_flow", "sprite_sheet", "h3_timeline"];
//# sourceMappingURL=card-tools.d.ts.map
