"""infer-daisy-studio — FastHTML + daisyUI studio for the inference.cpp flow system.

Operate (lanes/forms/validate/start), chat (LLM agent wrapping the
DeepSeek harness Python package), gallery (runs grid). See README.md.
"""

from .app import build_app
from .chat import ChatAgent, ChatError, EchoAgent, HarnessAgent
from .gateway_client import (
    Draft, GatewayClient, GatewayError, Lane, ParamSchema, QueueStatus, Run,
)

__all__ = [
    "build_app",
    "ChatAgent", "ChatError", "EchoAgent", "HarnessAgent",
    "Draft", "GatewayClient", "GatewayError", "Lane",
    "ParamSchema", "QueueStatus", "Run",
]

__version__ = "0.1.0"
