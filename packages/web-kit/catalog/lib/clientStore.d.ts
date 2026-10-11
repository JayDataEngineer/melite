export type SetState<T> = (partial: Partial<T> | ((state: T) => Partial<T>), replace?: boolean) => void;
export type GetState<T> = () => T;
export type Subscribe<T> = (listener: (state: T, prevState: T) => void) => () => void;
export interface StoreApi<T> {
    setState: SetState<T>;
    getState: GetState<T>;
    getInitialState: GetState<T>;
    subscribe: Subscribe<T>;
    destroy: () => void;
}
/** Build the initial record with the same set/get the callers will use. The
 *  record it returns is the store's `getInitialState()`.
 *  @param setState - shallow-merge or whole-record write.
 *  @param getState - current record.
 *  @param api - the full store surface, for slices that need `subscribe`.
 *  @returns the initial record.
 */
export type StateCreator<T> = (setState: SetState<T>, getState: GetState<T>, api: StoreApi<T>) => T;
export interface BoundStore<T> extends StoreApi<T> {
    (): T;
    <U>(selector: (state: T) => U, equalityFn?: (a: U, b: U) => boolean): U;
}
/**
 * Create a module-level client store.
 * @param init - the initial record.
 * @returns the bound store (hook + zustand-classic statics).
 */
export declare function createClientStore<T>(init: T): BoundStore<T>;
/**
 * Create a module-level client store whose initial record is built through the
 * same set/get the store exposes.
 * @param initializer - receives set/get/api and returns the initial record.
 * @returns the bound store (hook + zustand-classic statics).
 */
export declare function createClientStore<T>(initializer: StateCreator<T>): BoundStore<T>;
//# sourceMappingURL=clientStore.d.ts.map
