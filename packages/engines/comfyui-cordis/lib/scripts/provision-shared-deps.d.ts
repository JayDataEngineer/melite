/** The vendored pack whose requirements file is the estate's pinned
 * record (byte-identical across the audio triple, repo-walled). */
export declare const RECORD_PACK = "melite-audio-nodes";
/** Parse a requirements.txt into its EXACTLY-pinned pairs (`name==version`
 * rows; comments and blank lines skipped, floating rows deliberately not
 * recorded — the guard judges pins, the engine base env owns the floats).
 * @param text the requirements.txt contents.
 * @returns the name→version map of `==` pins (bare names). */
export declare function parseRequirementPins(text: string): Map<string, string>;
/** Parse a requirements.txt into the dep NAMES it would install —
 * every requirement row (pinned or floating), never comments.
 * @param text the requirements.txt contents.
 * @returns the lowercase name set of mentioned deps. */
export declare function parseRequirementMentions(text: string): Set<string>;
/** The shared-dep deltas of one pack's requirements against the record:
 * every record-pinned dep the pack pins DIFFERENTLY (upgrade or
 * downgrade — both move the live venv under an engine), plus every
 * record-pinned dep the pack MENTIONS but leaves unpinned (pip would
 * float it). A pack that never mentions a record dep installs nothing
 * for it — clean by construction.
 * @param packText the pack's requirements.txt contents.
 * @param recordPins the record pack's exactly-pinned set.
 * @returns one refusal line per delta, empty when the pack agrees. */
export declare function sharedDepDeltas(packText: string, recordPins: Map<string, string>): string[];
/** The record's pinned set, read from the vendored record pack.
 * @param vendorRoot the vendored extensions tree
 * (`vendor/comfyui_extensions`).
 * @returns the record's exactly-pinned name→version map.
 * @throws when the record pack or its requirements file is absent — a
 * missing record is a loud failure, never a vacuous pass. */
export declare function recordPinnedSet(vendorRoot: string): Map<string, string>;
/** The guard's verdict for one provision row: the pack's shared-dep
 * deltas against the record, read from the pack's vendored twin (the
 * at-pin content of record — the vendored tree IS what the pin names).
 * A row with NO vendored twin carries no readable at-pin truth here and
 * answers empty (the Manager door's own stranger path — this guard
 * judges the estate's packs).
 * @param vendorRoot the vendored extensions tree.
 * @param packDir the pack's directory name (the url's last segment).
 * @returns the refusal lines, empty when the pack agrees with the
 * record or has no vendored twin. */
export declare function rowSharedDepDeltas(vendorRoot: string, packDir: string): string[];
