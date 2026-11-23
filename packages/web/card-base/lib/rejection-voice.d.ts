/** The voice for a caught rejection, lossless by the estate's
 * failureText law: an Error speaks its message; any other thrown
 * value (transports and test fakes throw plain strings and
 * objects) surfaces verbatim — `String(e)` — never a fixed
 * fallback literal that masks the thrower's words. Every catch
 * face in this package voices through here (the R4 unmask,
 * f2d9c36f-style); card-view's thirty-seven call sites ride the
 * re-export shim at its src/client/rejection-voice.ts.
 * @param e the caught value
 * @returns the thrower's own words */
export declare function rejectionVoice(e: unknown): string;
//# sourceMappingURL=rejection-voice.d.ts.map