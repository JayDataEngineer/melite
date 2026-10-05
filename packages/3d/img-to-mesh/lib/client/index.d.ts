/**
 * img-to-mesh-studio — the FIRST-PARTY cards.stage.view surface
 * (2026-09-12, the ui-tool built-in law: the host package ships the
 * shipped cards' views; third-party cards register additively).
 *
 * Primitive ④ (2026-09-21): this file is a DECLARATION + seam
 * registration — the card's ~5 lines of surface data. The machinery
 * (spec fetch, seeding, squares, patch-first run, polling, shell)
 * is the base's DeclarativeStudio; the studio owns ORGANIZATION
 * over the SAME form-spec SSOT, and organization is data now.
 */
import { createElement as h } from 'react';
import type { StageViewOwnerProps } from '@melite/contracts';
/** The studio surface component — registered under key 'img-to-mesh'. */
export declare function ImgToMeshStudio(props: StageViewOwnerProps): ReturnType<typeof h>;
/** The built-in registration (the ui-tool law, verbatim — the
 * module namespace IS the plugin: the loader consumes name/inject/apply). */
export declare const name = "imgToMeshStudio";
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
//# sourceMappingURL=index.d.ts.map
