// GENERATED from py/gateway.py ROUTES (the wire SSOT) by
// tools/gen_gateway_doors.py — DO NOT EDIT. Regenerate after every
// route change; tests/walls/suites/test_gateway_doors.py refuses
// staleness.
//
// THE HARD GATE: apiJson/apiFetch accept ONLY GatewayDoorUrl. A
// frontend fetch of a door the gateway does not serve is a COMPILE
// ERROR here — the loras incident (2026-09-05) shipped exactly that
// gap to the operator as "No LoRAs installed" over 12 declared
// rows. If tsc refuses your path, either the door is missing from
// ROUTES (build it) or the call site is dead (delete it).

/** Query-string tail: every door may carry one. */
export type DoorTail = "" | `?${string}`


/** Every door the gateway serves, as fetchable URLs. */
export type GatewayDoorUrl =
  | `/v1/flows/start${DoorTail}`
  | `/v1/flows/validate${DoorTail}`
  | `/v1/queue${DoorTail}`
  | `/v1/flows/status/${string}${DoorTail}`
  | `/v1/flows/stop/${string}${DoorTail}`
  | `/v1/flows/events/${string}${DoorTail}`
  | `/v1/flows/events?run_id=${string}${DoorTail}`
  | `/v1/flows/runs${DoorTail}`
  | `/v1/flows/runs/${string}${DoorTail}`
  | `/v1/assets${DoorTail}`
  | `/v1/ledger${DoorTail}`
  | `/v1/assets/runs/${string}${DoorTail}`
  | `/v1/studios/${string}${DoorTail}`
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
  | `/v1/flows/families/${string}${DoorTail}`
  | `/v1/flows/drafts${DoorTail}`
  | `/v1/flows/drafts/${string}${DoorTail}`
  | `/v1/manage${DoorTail}`
  | `/poser/${string}${DoorTail}`
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
