/**
 * h3-timeline client entry — the card package's OWN cards.stage.view
 * surface (2026-09-12, the composition-root correction: a card's
 * studio registers from ITS package, never from the bench host —
 * adding a card never touches the host, the DSH plugin contract).
 *
 * THE MOUNT LAW (the studio removal, 2026-08-19: a card is a SEAM and
 * whatever renders its authoring surface is INJECTED): the h3-timeline
 * card's authoring surface is this package's own studio —
 * src/ui/studio/component.tsx (VideoTimelineStudio, the 26-file
 * three-layer NLE tenant the family serves as studio.tenant
 * "video/h3-timeline"). This module is the ADAPTER that mounts it on
 * the bench slot — never a second definition site: props translate
 * 1:1 onto the tenant contract {stage, running, onSave, upstreams?};
 * the document rides stage.params; writes ride onSave → onPatch
 * (patchStageParams' partial merge — the E4 write channel, observed ⊆
 * the family's declared writes); the run rides the host drill's own
 * Run row.
 */
import { createElement as h } from 'react';
import { type StageViewOwnerProps } from '@melite/contracts';
/** The registration (the ui-tool law): the card package registers its
 * own shipped studio's view under its card key. */
/** The built-in registration (the ui-tool law, verbatim — the
 * module namespace IS the plugin: the loader consumes name/inject/apply). */
export declare const name = "h3TimelineStudio";
export declare const inject: string[];
export declare const apply: (ctx: {
    slots: {
        inject: (seam: string, callback: () => void) => unknown;
        register: (descriptor: {
            name: "cards.stage.view";
            key: string;
            inject?: (() => object) | undefined;
        }, component: (props: StageViewOwnerProps & object) => unknown) => unknown;
    };
    get: (name: string) => unknown;
}) => void;
/** The timeline surface — registered under key 'h3-timeline'. The
 * ADAPTER: the tenant mounted verbatim, one translate layer, zero
 * paraphrase. */
export declare function H3TimelineStudio(props: StageViewOwnerProps): ReturnType<typeof h>;
//# sourceMappingURL=index.d.ts.map
