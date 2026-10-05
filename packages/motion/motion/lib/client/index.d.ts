import { runCompiledGeneration } from '@melite/catalog';
import { type StageViewOwnerProps } from '@melite/contracts';
/** The built-in registration (the ui-tool law, verbatim — the module
 * namespace IS the plugin: the loader consumes name/inject/apply). */
export declare const name = "motionStudio";
export interface MotionStudioInjected {
    runCompiledGeneration: typeof runCompiledGeneration;
}
export declare const inject: string[];
export declare const apply: (ctx: {
    slots: {
        inject: (seam: string, callback: () => void) => unknown;
        register: (descriptor: {
            name: "cards.stage.view";
            key: string;
            inject?: (() => {
                runCompiledGeneration: typeof runCompiledGeneration;
            }) | undefined;
        }, component: (props: StageViewOwnerProps & {
            runCompiledGeneration: typeof runCompiledGeneration;
        }) => unknown) => unknown;
    };
    get: (name: string) => unknown;
}) => void;
//# sourceMappingURL=index.d.ts.map
