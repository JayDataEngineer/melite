export interface Feed<T> {
    data: T;
    loading: boolean;
    error: string;
    reload: () => void;
    setData: (v: T) => void;
}
export declare function useFeed<T>(url: string, decode: (json: unknown) => T, initial: T): Feed<T>;
//# sourceMappingURL=useFeed.d.ts.map
