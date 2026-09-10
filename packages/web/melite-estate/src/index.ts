// index.ts — the estate bundle's host row (docs/plans/
// estate-collapse-2026-09-10.md).
//
// DSH is the only web app. This row mounts the estate's wire plane INTO
// the DSH host as child plugins — the loader's own composition
// mechanism (ctx.plugin, the first-plugin tutorial's basis) — instead
// of the retired second Loader boot (apps/gateway + its DSH-mirror
// rows: webserver/typert/connection/storage) that ray-card-deck then
// proxied /v1 into. The doors are unchanged cordis plugins that inject
// [gatewayError, webServer, storageDomain, runs, cardRegistry, comfyui,
// models, timer] and register their /v1 routes on the HOST's
// webServer; the host's base rows already provide webServer, the
// storage stack, and timer — this row supplies the estate's own
// service tier (the error envelopes + the engine rows + the doors +
// the wire Remote) and nothing else.
//
// Erasable-syntax TS only (node 24 native stripping — same discipline
// as every gateway package): no enums, `import type` for types, .ts
// specifiers never needed here (bare package specifiers only).
//
// Config posture (unchanged from the estate process): the artifacts
// tree rides MELITE_STATE_ROOT (data/runs default) and the engine
// rides COMFYUI_URL — both env, resolved by the same code that always
// resolved them. DSH_GATEWAY_TOKEN unset = open loopback (bearerOk's
// empty-token arm) — the transitional posture; E5 moves auth onto the
// host connection's trust fence.

import type { Context } from "@deepseek-ai/cordis";
import type { Plugin } from "@deepseek-ai/cordis";

import { gatewayErrors } from "@melite/gateway-core";
import modelsProvider from "@melite/comfyui-cordis/catalog-registry";
import comfyuiHost from "@melite/comfyui-cordis/comfyui-host";
import uploadsDoors from "@melite/gateway-doors/uploads";
import cardRegistry from "@melite/gateway-doors/card-registry";
import validateDoors from "@melite/gateway-doors/validate";
import runsRegistry from "@melite/gateway-doors/runs-registry";
import flowsStart from "@melite/gateway-doors/flows-start";
import flowsStatus from "@melite/gateway-doors/flows-status";
import flowsStop from "@melite/gateway-doors/flows-stop";
import flowsResume from "@melite/gateway-queue/flows-resume";
import flowsReproduce from "@melite/gateway-queue/flows-reproduce";
import bridgesDoors from "@melite/gateway-doors/bridges";
import discoveryDoors from "@melite/gateway-doors/discovery";
import runsDoors from "@melite/gateway-doors/runs";
import chromeDoors from "@melite/gateway-doors/chrome";
import discloseDoors from "@melite/gateway-doors/disclose";
import assetsDoors from "@melite/gateway-doors/assets";
import draftsDoors from "@melite/gateway-doors/drafts";
import benchDoors from "@melite/gateway-doors/bench";
import studiosDoors from "@melite/gateway-doors/studios";
import planesDoors from "@melite/gateway-doors/planes";
import gatewayWire from "@melite/gateway-wire";

/** The estate composition, in dispatch order (advisory — inject
 *  resolution is the real ordering contract; the shell leaf's order,
 *  verbatim, minus everything the DSH host already provides). */
const rows: readonly Plugin[] = [
  gatewayErrors,
  modelsProvider,
  comfyuiHost,
  uploadsDoors,
  cardRegistry,
  validateDoors,
  runsRegistry,
  flowsStart,
  flowsStatus,
  flowsStop,
  flowsResume,
  flowsReproduce,
  bridgesDoors,
  discoveryDoors,
  runsDoors,
  chromeDoors,
  discloseDoors,
  assetsDoors,
  draftsDoors,
  benchDoors,
  studiosDoors,
  planesDoors,
  gatewayWire,
];

export const name = "melite-estate";

export function apply(ctx: Context): void {
  for (const row of rows) ctx.plugin(row);
}
