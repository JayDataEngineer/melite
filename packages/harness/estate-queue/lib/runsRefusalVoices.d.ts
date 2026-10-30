import { RemoteError } from "@deepseek-ai/dsh-typert-protocol";
import type { CardArmError } from "./cardsArmError.js";
import type { QueueRefusal } from "./queue.js";
export declare function cardRefusal(err: CardArmError): QueueRefusal;
/** Fold a door refusal into the protocol's one error class. */
export declare function toRemoteError(r: QueueRefusal): RemoteError;
/** The preview-scope refusal (door posture). */
export declare function refusePreview(message: string): QueueRefusal;
//# sourceMappingURL=runsRefusalVoices.d.ts.map