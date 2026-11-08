import type { StateCreator } from "@melite/catalog/clientStore";
export type { GetState, SetState, StateCreator, StoreApi, Subscribe, } from "@melite/catalog/clientStore";
export type { BoundStore } from "@melite/catalog/clientStore";
/** The bound store shape `create` returns: the selector hook plus the
 *  zustand-classic statics. */
export interface UseBoundStore<T> {
    (): T;
    <U>(selector: (state: T) => U, equalityFn?: (a: U, b: U) => boolean): U;
    setState: (partial: Partial<T> | ((state: T) => Partial<T>), replace?: boolean) => void;
    getState: () => T;
    getInitialState: () => T;
    subscribe: (listener: (state: T, prevState: T) => void) => () => void;
    destroy: () => void;
}
export declare function create<T>(initializer: StateCreator<T>): UseBoundStore<T>;
//# sourceMappingURL=createStore.d.ts.map