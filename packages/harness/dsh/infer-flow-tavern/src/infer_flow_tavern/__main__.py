"""`uv run infer-flow-tavern` entrypoint.

Parses argv / env, builds the FastHTML app, hands it to uvicorn.

Env (in priority order):
  MELITE_GATEWAY     the gateway endpoint. Required unless
                     FLOATER_ALLOW_LOCAL=1 (which permits the canonical
                     fallback http://localhost:33081).
  FLOATER_HOST       bind host. Default 127.0.0.1.
  FLOATER_PORT       bind port. Default 33091 (the gateway is on 33081;
                     we don't squat on the canonical inference port).
  FLOATER_LOG_LEVEL  uvicorn log level. Default info.
  FLOATER_RELOAD     set to 1 to enable FastHTML's live reload (dev).

CLI flags override env. --help prints the matrix.

LAW HONOR:

  QUEUE LANE LAW:  no hardcoded gateway endpoint. --gateway / -g is
                   the only place it lands; the GatewayClient refuses
                   empty / schemeless values.
  PROVISIONING LAW: this launcher is `uv run`-able; the plugin ships
                   its own pyproject and does not contaminate the
                   gateway's base env (the management plane stays
                   base; a UI is opt-in).
"""

from __future__ import annotations

import argparse
import os
import sys

import uvicorn

from .app import _make_client_factory, build_app
from .gateway_client import GatewayClient, GatewayError


def _parse(argv: list[str]) -> argparse.Namespace:
    p = argparse.ArgumentParser(
        prog="infer-flow-tavern",
        description="FastHTML + MonsterUI sidebar UI for the inference.cpp flow system",
    )
    p.add_argument(
        "--gateway", "-g", default=os.environ.get("MELITE_GATEWAY", ""),
        help="Gateway base URL (default: $MELITE_GATEWAY). Required unless "
             "FLOATER_ALLOW_LOCAL=1 is set.",
    )
    p.add_argument(
        "--host", default=os.environ.get("FLOATER_HOST", "127.0.0.1"),
        help="Bind host (default: 127.0.0.1, or $FLOATER_HOST).",
    )
    p.add_argument(
        "--port", type=int, default=int(os.environ.get("FLOATER_PORT", "33091")),
        help="Bind port (default: 33091, or $FLOATER_PORT). NOT 33081 — "
             "that's the gateway's canonical port.",
    )
    p.add_argument(
        "--reload", action="store_true",
        default=os.environ.get("FLOATER_RELOAD") == "1",
        help="Enable FastHTML live reload (development).",
    )
    p.add_argument(
        "--log-level", default=os.environ.get("FLOATER_LOG_LEVEL", "info"),
        help="uvicorn log level (default: info).",
    )
    return p.parse_args(argv)


def main() -> None:
    args = _parse(sys.argv[1:])
    base_url = (args.gateway or "").strip()
    if not base_url and os.environ.get("FLOATER_ALLOW_LOCAL") == "1":
        base_url = "http://localhost:33081"

    # Construct the client eagerly so a bad endpoint fails LOUD at boot
    # (RESILIENCE LAW: failures are documented at the front door, not
    # silently in the first request). The client itself refuses
    # empty/schemeless values.
    try:
        client = GatewayClient(base_url) if base_url else None
    except GatewayError as e:
        print(f"infer-flow-tavern: {e}", file=sys.stderr)
        sys.exit(2)
    if client is None:
        print(
            "infer-flow-tavern: GATEWAY_URL is not set. Export MELITE_GATEWAY or pass "
            "--gateway http://host:port (FLOATER_ALLOW_LOCAL=1 enables the "
            "http://localhost:33081 fallback).",
            file=sys.stderr,
        )
        sys.exit(2)
    # Verify reachability early so the operator sees a clear boot
    # message rather than the first request failing.
    try:
        h = client.health()
    except GatewayError as e:
        print(f"infer-flow-tavern: gateway health check failed: {e}", file=sys.stderr)
        sys.exit(3)

    factory = _make_client_factory(client._base)  # noqa: SLF001
    app = build_app(factory)

    print(f"infer-flow-tavern: gateway {client._base} OK  ({h.get('status', '?')})")  # noqa: SLF001
    print(f"infer-flow-tavern: serving on http://{args.host}:{args.port}")
    uvicorn.run(
        app,
        host=args.host,
        port=args.port,
        log_level=args.log_level,
        reload=args.reload,
    )


if __name__ == "__main__":
    main()
