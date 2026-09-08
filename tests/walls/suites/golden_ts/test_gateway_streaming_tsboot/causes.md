# causes.md — golden_ts/test_gateway_streaming_tsboot/

Date: 2026-09-08. Status: landed (oracle-death re-derivation).

## Why these vectors exist

ORACLE DEATH (operator order verbatim: "we do not need parity, we
need to migrate, not keep the old machinery"). Phase V of
test_gateway_streaming_tsboot.py captured every battery vector live
from a scratch boot of the py serving oracle
(`python/gateway.py`), then Phase T byte-compared the TS boot
against them. The oracle is deleted, so there is no second side to
agree with. Per the lane rule (py-bytes-vs-ts-bytes with no literals
→ freeze the TS side's current bytes), the vectors are frozen here
on 2026-09-08:

- hello — the bare-door subscribe ack on a fresh root
  (queue_depth 0, empty queued, null active).
- unknown — the hydrate answer for an unowned run id (path AND
  query forms answer these same bytes).
- terminal_run — the hydrate run frame for a completed stub run.
- terminal_patch — the hydrate stage patch for the completed stub
  stage (bare: id + status only — the stub completion carries no
  truthy progress/activity extras, so the truthy-extras omission
  rule yields the bare shape).
- fallback_status / fallback_body — the non-upgrade HTTP GET on the
  WS path (404 invalid_request — never no_such_route; the same body
  is pinned parsed in the queue-refusals wall's E01 leg).
- pong_hex — the re-framed pong wire bytes for a "ping-1" ping
  (8a 06 + "ping-1", RFC 6455 section 5.2 framing).
- close_echo_hex — the verbatim close echo for an empty client
  close (8800 — the _monitor_client/hold-loop posture).
- deny_status / deny_body — the pre-accept auth refusal (403
  Forbidden, empty body at upgrade).

No ids, no roots, no clock in any vector — nothing to normalize
(the live run ids never appear in these payloads: the bare-door
hello carries the empty registry, the specific-run sockets are
unstamped, and the per-run hydrate/run frames carry status only).

## Stability proof

Double-captured on 2026-09-08: capture 1 derived the four codec
payloads from a fresh node process importing doors/runs.ts
directly (helloFrame/runFrame/stageHydratePatch through
wsFrameBytes); capture 2 is the converted wall's own green run,
which re-reads every one of these vectors live off a fresh TS boot
+ fresh state root over a raw RFC 6455 socket (H2/H3/H4/H6a/H6b/F1/
C3/C1/A1–A4) — byte-identical, including the full stub-run
lifecycle behind terminal_run/terminal_patch. The pong/close/deny
wire bytes are hand literals per the RFC framing + the 403-empty
upgrade posture, confirmed live in the same run.

## Regolden rule

Regolden only for a deliberate TS stream-door behavior change,
with a dated note here. Never regolden to chase a red wall — the
wall failing against these bytes means the door moved.
