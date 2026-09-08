"""infer-daisy-studio entrypoint (uv run infer-daisy-studio).

Parses argv / env, builds the FastHTML+daisyUI app, hands it to uvicorn.

Env (CLI flags override env):
  MELITE_GATEWAY     gateway endpoint. Required unless STUDIO_ALLOW_LOCAL=1
                     (or legacy FLOATER_ALLOW_LOCAL=1) permits the canonical
                     fallback http://localhost:33081.
  STUDIO_HOST        bind host. Default 127.0.0.1 (FLOATER_HOST compat).
  STUDIO_PORT        bind port. Default 33092 (FLOATER_PORT compat).
                     NOT 33081 (gateway) and NOT 33091 (flow tavern).
  STUDIO_CHAT        off forces the echo stand-in (no LLM spend).
  STUDIO_RELOAD      1 (or --reload): dev hot reload, server and browser.
                     OFF by default for tailnet-https safety (see --help).
  DSH_PROVIDER/DSH_MODEL  harness route for chat turns.

LAW HONOR: QUEUE LANE LAW (no hardcoded endpoint — the launcher passes a
configured base_url; the client validates it) and PROVISIONING LAW (uv run).
"""

from __future__ import annotations

import argparse
import os
import sys

import uvicorn

from .app import _make_client_factory, build_app
from .chat import build_agent_from_env
from .gateway_client import GatewayClient, GatewayError

CANONICAL_GATEWAY = "http://localhost:33081"


def _env(name: str, *fallbacks: str, default: str = "") -> str:
    for key in (name, *fallbacks):
        val = os.environ.get(key, "").strip()
        if val:
            return val
    return default


def _parse(argv: list[str]) -> argparse.Namespace:
    p = argparse.ArgumentParser(
        prog="infer-daisy-studio",
        description="FastHTML + daisyUI studio for the inference.cpp flow system",
    )
    p.add_argument("--gateway", "-g", default=_env("MELITE_GATEWAY"),
        help="Gateway base URL (default: $MELITE_GATEWAY). Required unless "
             "STUDIO_ALLOW_LOCAL=1 is set.")
    p.add_argument("--host", default=_env("STUDIO_HOST", "FLOATER_HOST", default="127.0.0.1"),
        help="Bind host (default: 127.0.0.1).")
    p.add_argument("--port", type=int,
        default=int(_env("STUDIO_PORT", "FLOATER_PORT", default="33092")),
        help="Bind port (default: 33092). NOT 33081 (gateway), NOT 33091 (tavern).")
    p.add_argument("--reload", action="store_true",
        default=os.environ.get("STUDIO_RELOAD") == "1",
        help="Dev hot reload: uvicorn process reload AND the browser"
             " live-reload script. OFF by default - the script opens"
             " ws://live-reload, which is mixed-content-blocked (and"
             " reconnect-storms) on https-served pages.")
    p.add_argument("--log-level", default=os.environ.get("STUDIO_LOG_LEVEL", "info"),
        help="uvicorn log level (default: info).")
    return p.parse_args(argv)


def main() -> None:
    args = _parse(sys.argv[1:])
    base_url = (args.gateway or "").strip()
    allow_local = os.environ.get("STUDIO_ALLOW_LOCAL") == "1" or os.environ.get("FLOATER_ALLOW_LOCAL") == "1"
    if not base_url and allow_local:
        base_url = CANONICAL_GATEWAY
    try:
        client = GatewayClient(base_url) if base_url else None
    except GatewayError as e:
        print("infer-daisy-studio: " + str(e), file=sys.stderr)
        sys.exit(2)
    if client is None:
        print(
            "infer-daisy-studio: GATEWAY_URL is not set. Export MELITE_GATEWAY "
            "or pass --gateway http://host:port (STUDIO_ALLOW_LOCAL=1 enables "
            "the http://localhost:33081 canonical fallback).",
            file=sys.stderr,
        )
        sys.exit(2)
    try:
        h = client.health()
    except GatewayError as e:
        print("infer-daisy-studio: gateway health check failed: " + str(e), file=sys.stderr)
        sys.exit(3)
    factory = _make_client_factory(client._base)  # noqa: SLF001
    agent = build_agent_from_env()
    app = build_app(factory, lambda: agent, live=args.reload)
    print("infer-daisy-studio: gateway " + client._base + " OK (" + str(h.get("status", "?")) + ")")  # noqa: SLF001
    print("infer-daisy-studio: serving on http://" + str(args.host) + ":" + str(args.port))
    uvicorn.run(app, host=args.host, port=args.port, log_level=args.log_level, reload=args.reload)


if __name__ == "__main__":
    main()
