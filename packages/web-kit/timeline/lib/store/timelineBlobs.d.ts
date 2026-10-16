/**
 * store/timelineBlobs — IndexedDB blob storage + blob-ref helpers (split
 * from timelineStore.ts; pure move, no logic changes).
 */
export declare const TL_DB_NAME = "TechNoirTimelineDB";
export declare const TL_DB_VERSION = 1;
export declare const TL_STORE = "blobs";
export declare let tlDbPromise: Promise<IDBDatabase> | null;
export declare function getTLDB(): Promise<IDBDatabase>;
export declare function tlSave(key: string, value: string): Promise<void>;
export declare function tlLoad(key: string): Promise<string | null>;
export declare function _tlDelete(key: string): Promise<void>;
export declare function tlClearAll(): Promise<void>;
export declare const BLOB_FIELDS: readonly ["videoUrl", "firstFrameB64", "lastFrameB64", "thumbnailUrl"];
export declare function isDataUrl(val: unknown): val is string;
export declare const BLOB_PREFIX = "TLB:";
export declare function blobKey(segId: string, field: string): string;
export declare function isBlobRef(val: unknown): val is string;
//# sourceMappingURL=timelineBlobs.d.ts.map
