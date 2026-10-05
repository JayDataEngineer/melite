/** The pinned artifact: fork ref → release tag → asset URL. */
export declare const AUDIOCORE_TAG = "libaudiocore-3938031";
export declare const AUDIOCORE_URL: string;
/** sha256 of the release asset (verified on every fetch; a drifted
 * asset is a refusal, never a silent pass). */
export declare const AUDIOCORE_SHA256 = "4a7069054ba608ce3bd099e09106d6036984023e657fdf60de8ff3394e18a590";
/** The install dir (inside the runtime tree the estate owns). */
export declare const AUDIOCORE_DIR: string;
/** The installed .so path — what AUDIOCORE_NATIVE_LIB names. */
export declare const AUDIOCORE_LIB: string;
/** Fetch (if needed) and verify the native audio core. Present and
 * hash-matching is a no-op; anything else is a fetch + verify, and
 * a mismatch is a LOUD refusal naming both hashes. */
export declare function provisionAudiocore(): void;
