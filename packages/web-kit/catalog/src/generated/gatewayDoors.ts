// HAND-MAINTAINED browser door table (2026-09-10 — the gateway died
// with its route table and the generator with it, so there is nothing
// left to generate FROM: the lanes live as string literals on the
// estate seats now). Every member is a path the owning DSH serves to
// the editor over HTTP. Add/remove a member BY HAND with the door;
// the serve side is guarded by the runs-remote wall + the e2e census
// (helpers/wire.ts), not by a freshness check anymore.
//
// THE HARD GATE: apiJson/apiFetch accept ONLY EstateDoorUrl. A
// frontend fetch of a door the estate does not serve is a COMPILE
// ERROR here — the loras incident (2026-09-05) shipped exactly that
// gap to the operator as "No LoRAs installed" over 12 declared
// rows. If tsc refuses your path, either the door is missing from
// the estate (build it, then list it here) or the call site is dead
// (delete it).

/** Query-string tail: every door may carry one. */
export type DoorTail = "" | `?${string}`


/** Every door the estate serves to the browser, as fetchable URLs. */
export type EstateDoorUrl =
  | `/v1/flows/start${DoorTail}`
  | `/v1/flows/validate${DoorTail}`
  | `/v1/queue${DoorTail}`
  | `/v1/flows/status/${string}${DoorTail}`
  | `/v1/flows/stop/${string}${DoorTail}`
  | `/v1/flows/resume/${string}${DoorTail}`
  | `/v1/flows/events/${string}${DoorTail}`
  | `/v1/flows/events?run_id=${string}${DoorTail}`
  | `/v1/flows/runs${DoorTail}`
  | `/v1/flows/runs/${string}${DoorTail}`
  | `/v1/assets${DoorTail}`
  | `/v1/ledger${DoorTail}`
  | `/v1/metrics${DoorTail}`
  | `/v1/assets/runs/${string}${DoorTail}`
  | `/v1/assets/inputs/${string}${DoorTail}`
  | `/v1/uploads${DoorTail}`
  | `/v1/studios/${string}${DoorTail}`
  | `/v1/models/${string}${DoorTail}`
  | `/v1/lanes${DoorTail}`
  | `/v1/kinds${DoorTail}`
  | `/v1/card-tools${DoorTail}`
  | `/v1/cards/${string}${DoorTail}`
  | `/v1/skills${DoorTail}`
  | `/v1/skills/${string}${DoorTail}`
  | `/v1/model-catalog${DoorTail}`
  | `/v1/model-catalog/${string}${DoorTail}`
  | `/v1/forms${DoorTail}`
  | `/v1/form-spec${DoorTail}`
  | `/v1/loras${DoorTail}`
  | `/v1/flows/families/param-schemas${DoorTail}`
  | `/v1/schema${DoorTail}`
  | `/v1/flows/families/${string}${DoorTail}`
  | `/v1/flows/drafts${DoorTail}`
  | `/v1/flows/drafts/${string}${DoorTail}`
  | `/v1/manage${DoorTail}`
  | `/poser/${string}${DoorTail}`
  | `/v1/flows/reproduce/${string}${DoorTail}`
  | `/v1/agent/boot${DoorTail}`
  | `/v1/health${DoorTail}`
  | `/v1/themes${DoorTail}`
  | `/v1/tags${DoorTail}`
  | `/v1/services${DoorTail}`
  | `/v1/right-panes${DoorTail}`
  | `/v1/ui-slots${DoorTail}`
  | `/v1/tools${DoorTail}`
  | `/v1/shell${DoorTail}`
  | `/v1/plugins${DoorTail}`
  | `/v1/models${DoorTail}`
