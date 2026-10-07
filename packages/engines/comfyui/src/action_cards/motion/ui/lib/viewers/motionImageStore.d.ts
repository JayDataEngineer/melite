export interface MotionImageState {
    images: Record<string, string>;
    setImage: (key: string, dataUrl: string) => void;
    clearImage: (key: string) => void;
}
export declare const useMotionImageStore: import("@melite/catalog/clientStore").BoundStore<MotionImageState>;
