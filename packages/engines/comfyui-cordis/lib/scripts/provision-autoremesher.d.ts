/** The pinned artifact: upstream ref → release tag → asset URL. */
export declare const AUTOREMESHER_TAG = "autoremesher-d9ef96bd";
export declare const AUTOREMESHER_URL: string;
/** sha256 of the release asset (verified on every fetch; a drifted
 * asset is a refusal, never a silent pass). */
export declare const AUTOREMESHER_SHA256 = "b84901ca07062a2c0ab7b1e0055e3d4c6fa2d5c6340b70576350ab542bc06161";
/** The install dir (inside the runtime tree the estate owns). */
export declare const AUTOREMESHER_DIR: string;
/** The installed binary path — what AUTOREMESHER_BIN names. */
export declare const AUTOREMESHER_BIN: string;
/** Fetch (if needed) and verify the quad-remesh binary. Present and
 * hash-matching is a no-op; anything else is a fetch + verify, and
 * a mismatch is a LOUD refusal naming both hashes. */
export declare function provisionAutoremesher(): void;
