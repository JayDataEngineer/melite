// The lazy bind the stage-view factory arms (see estate-remote.ts
// for the law and the four fiber receipts).
import { armEstateRemoteLazyBind } from "./estate-remote.js";
export function defineStageViewRegistration(key, view, inject) {
    return (ctx) => {
        // THE BUNDLE-SPLIT BIND (2026-09-29, the fifth receipt): a studio
        // bundle inlines its own card-base copy whose estate singleton is
        // unbound until this factory runs. Every cordis-fiber spelling
        // died on the lane (proxy refuse / INACTIVE / runner inspect sync
        // / loader-parked-forever — studios load BEFORE the mounter in
        // the plugin URL, and a static estate inject waits on the
        // mounter's own $mount). The order-proof wake is PLAIN JS: arm a
        // getter over the inject-free ctx.get seam; the FIRST verb pulls
        // it (estateRemote()), long after the mounter booted. A verb on a
        // host without the estates meets the loud wiring refusal.
        armEstateRemoteLazyBind(() => ({
            bench: ctx.get('remote.bench'),
            drafts: ctx.get('remote.drafts'),
            runs: ctx.get('remote.runs'),
            media: ctx.get('remote.media'),
        }));
        ctx.slots.inject('cards.stage.view', () => {
            ctx.slots.register({
                name: 'cards.stage.view',
                key,
                ...(inject === undefined ? {} : { inject }),
            }, view);
        });
    };
}
/** The seam ids, spelled once. Claims use these constants. */
export const CARD_SLOTS = {
    /** keyed by wire type: 'image' | 'file' | 'mesh' | 'select' | ... — the
     *  ATOM seam. The constructor renders every emitted field through
     *  the claim for its declared type; the base's built-in atom is
     *  the default, a card takes over its own type's atom. */
    field: 'melite.card.field',
    /** keyed by card id: the WHOLE-FORM takeover — a card's client
     *  half replaces the constructed form entirely (the studio law's
     *  form half; the drill consults this before constructing). */
    form: 'melite.card.form',
    /** keyed by card id: the BENCH stage view — a card's client half
     *  mounted on the bench slot (the studio law's bench half; the
     *  first-party studio surface every card package ships). */
    stageView: 'cards.stage.view',
    /** keyed by media kind ('video' | 'image'): THE PREVIEW SEAM —
     *  every card's rendered output previews through one shared slot
     *  (shared DSH primitives, hour-9 law); a card claims its kind's
     *  preview only to specialize, never to bespoke. */
    stagePreview: 'cards.stage.preview',
};
//# sourceMappingURL=slots.js.map