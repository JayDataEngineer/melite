/** Wire types for the manage remote — the public type subpath the
 *  typert generator requires of Remote boundary types (a boundary
 *  type must live in a public non-root type subpath, the runs
 *  package's law). */
/** A JSON wire value (the remote boundary carries JSON only — the
 *  typert generator refuses unconstrained unknown at Remote seams,
 *  and the door already serializes through JSON today). */
export type ManageJsonValue =
  | null
  | string
  | number
  | boolean
  | readonly ManageJsonValue[]
  | { readonly [key: string]: ManageJsonValue };

/** The manage act wire doc: the action name plus its action-specific
 *  JSON params (the dispatcher validates the params per action; the
 *  wire boundary carries the JSON envelope only). */
export interface ManageActDoc {
  readonly action: string;
  readonly [key: string]: ManageJsonValue;
}

/** The manage seat's answer: the SSOT envelope's WIRE row (every
 *  field of estate-queue's ManageEnvelope, JSON-constrained — the
 *  strict result codec refuses any extra key, so the row must mirror
 *  the SSOT exactly; a refusal never happens here; the seat THROWS
 *  manage/refused carrying the same envelope in RemoteError
 *  details). */
export interface ManageEnvelopeRow {
  readonly action: string;
  readonly ok: boolean;
  readonly detail: string;
  readonly data?: ManageJsonValue;
  readonly status?: number;
  readonly code?: string;
  readonly state?: string;
  readonly next_action?: string;
  readonly operation_id?: string;
  readonly operations?: readonly ManageJsonValue[];
  readonly items?: readonly ManageJsonValue[];
  readonly rows?: readonly ManageJsonValue[];
  readonly requested?: readonly string[];
  readonly succeeded?: readonly string[];
  readonly missed?: readonly string[];
  readonly misses?: readonly string[];
  readonly partial?: boolean;
  readonly restart_required?: boolean;
}
