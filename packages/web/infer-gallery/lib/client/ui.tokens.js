/**
 * Design tokens — every var(--dsw-alias-…) string in the media family
 * declared ONCE (audit F6). Numbered suffixes = same alias, different
 * fallback (opacity variants). Pinned by
 * tests/walls/ts/suites/media-sidebar.spec.ts (tokens single site).
 */
export const bgBase1 = 'var(--dsw-alias-bg-base, #000)';
export const bgBase2 = 'var(--dsw-alias-bg-base, #0b0e14)';
export const bgBase3 = 'var(--dsw-alias-bg-base, #422006)';
export const bgLayer1 = 'var(--dsw-alias-bg-layer-1, #1e293b)';
export const bgLayer2 = 'var(--dsw-alias-bg-layer-2, #0f172a)';
export const bgOverlay1 = 'var(--dsw-alias-bg-overlay, rgba(127,29,29,0.35))';
export const bgOverlay2 = 'var(--dsw-alias-bg-overlay, rgba(8,9,12,0.93))';
export const borderL1 = 'var(--dsw-alias-border-l1, rgba(148,163,184,0.18))';
export const borderL2 = 'var(--dsw-alias-border-l2, rgba(148,163,184,0.25))';
export const fillSubtle1 = 'var(--dsw-alias-fill-subtle, rgba(15,23,42,0.9))';
export const fillSubtle2 = 'var(--dsw-alias-fill-subtle, rgba(2,6,23,0.72))';
/** Caption-scrim weight of the same fill token (the full port's
 *  single-site fix: the old package restated this raw spelling inline
 *  in ui.tsx — one token, one site, three weights). */
export const fillSubtleCaption = 'var(--dsw-alias-fill-subtle, rgba(2,6,23,0.92))';
export const labelPrimary1 = 'var(--dsw-alias-label-primary, rgb(226,232,240))';
export const labelPrimary2 = 'var(--dsw-alias-label-primary, rgba(226,232,240,0.85))';
export const labelPrimary3 = 'var(--dsw-alias-label-primary, rgba(226,232,240,0.92))';
export const labelPrimary4 = 'var(--dsw-alias-label-primary, #e2e8f0)';
export const labelSecondary1 = 'var(--dsw-alias-label-secondary, rgb(203,213,225))';
export const labelSecondary2 = 'var(--dsw-alias-label-secondary, rgba(148,163,184,0.9))';
export const stateBusinessPrimary = 'var(--dsw-alias-state-business-primary, rgb(147,197,253))';
export const stateBusinessPrimaryBg1 = 'var(--dsw-alias-state-business-primary-bg, rgba(59,130,246,0.18))';
export const stateBusinessPrimaryBg2 = 'var(--dsw-alias-state-business-primary-bg, rgba(59,130,246,0.28))';
export const stateErrorPrimary1 = 'var(--dsw-alias-state-error-primary, rgba(248,113,113,0.4))';
export const stateErrorPrimary2 = 'var(--dsw-alias-state-error-primary, rgba(248,113,113,0.9))';
export const stateWarnPrimary1 = 'var(--dsw-alias-state-warn-primary, rgba(250,204,21,0.9))';
export const stateWarnPrimary2 = 'var(--dsw-alias-state-warn-primary, rgba(250,204,21,0.92))';
export const stateWarnPrimary3 = 'var(--dsw-alias-state-warn-primary, rgba(251,191,36,0.9))';
export const textTertiary1 = 'var(--dsw-alias-text-tertiary, rgba(148,163,184,0.55))';
export const textTertiary2 = 'var(--dsw-alias-text-tertiary, rgba(148,163,184,0.75))';
export const textTertiary3 = 'var(--dsw-alias-text-tertiary, rgba(148,163,184,0.8))';
//# sourceMappingURL=ui.tokens.js.map
