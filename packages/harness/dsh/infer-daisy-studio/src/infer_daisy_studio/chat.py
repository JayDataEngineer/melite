"""Chat agents — the LLM loop for the daisy studio.

The insight this module exists for: the DeepSeek harness is ALREADY a
Python package (deepseek_harness.DeepSeekHarness — see
packages/harness/dsh/examples/server_turn.py). The studio wraps it
in-process instead of reimplementing an agent harness.

LAW HONOR:

  PROVISIONING LAW: deepseek-harness-sdk is NOT a hard dependency
    of this plugin (see pyproject.toml). The import lives INSIDE the
    methods below so the operator surface boots anywhere — rooms
    without the SDK get a disabled-chat banner, never a boot crash
    (RESILIENCE LAW: document the failure, then continue).
  PLUGIN ARCHITECTURE LAW: this module never imports py/ or
    packages/engines/* . The gateway owns lanes/cards; the harness
    owns the LLM turn; this module only glues them.
"""

from __future__ import annotations

import os
import queue
import threading
from collections.abc import Callable
from pathlib import Path
from types import TracebackType
from typing import Iterator, Protocol

# Decoded JSON subtrees (annotations only).
JsonValue = str | int | float | bool | None | list["JsonValue"] | dict[str, "JsonValue"]


class _HarnessResult(Protocol):
    """The turn-result surface the studio reads (one attribute)."""

    final_response: str


class _Harness(Protocol):
    """The DeepSeekHarness surface the studio exercises — context
    manager + run (the SDK stays an optional import; this Protocol is
    the studio's recorded expectation of its shape)."""

    def __enter__(self) -> _Harness: ...
    def __exit__(self, exc_type: type[BaseException] | None,
                 exc_value: BaseException | None,
                 tb: TracebackType | None) -> None: ...
    def run(self, prompt: str, session_id: str,
            on_notification: Callable[..., None] | None = ...) -> _HarnessResult: ...


class _Notification(Protocol):
    """The turn-notification surface _on probes (getattr-defensive)."""

    method: str | None
    payload: dict[str, JsonValue] | None


def _default_home() -> str:
    """The provisioned harness home (server_turn.py pattern): this
    plugin lives at packages/harness/dsh/<plugin>/src/... so the
    repo root is six parents up. Empty when not provisioned — the
    SDK then falls back to its own default home."""
    try:
        home = Path(__file__).resolve().parents[6] / "data" / "runtime" / "dsh-harness-home"
    except IndexError:
        return ""
    return str(home) if home.is_dir() else ""


class ChatError(RuntimeError):
    """Raised when a chat turn cannot run (SDK missing, turn failed)."""


class ChatAgent(Protocol):
    """Structural surface the routes exercise (fake agents in tests)."""

    def reply(self, prompt: str, session_id: str) -> str:
        ...


class EchoAgent:
    """No-LLM stand-in (tests, SDK-less dev). Records calls on the wire."""

    def __init__(self, prefix: str = "echo") -> None:
        self.prefix = prefix
        self.calls: list[tuple[str, str]] = []

    def reply(self, prompt: str, session_id: str) -> str:
        self.calls.append((prompt, session_id))
        return self.prefix + ': ' + prompt

    def stream(self, prompt: str, session_id: str) -> Iterator[str]:
        self.calls.append((prompt, session_id))
        for word in (self.prefix + ': ' + prompt).split(' '):
            yield word + ' '


class HarnessAgent:
    """Thin wrapper over deepseek_harness.DeepSeekHarness.

    One instance per process. Per-turn open/close for simplicity; a
    persistent-harness follow-up can hold one DeepSeekHarness open
    across turns when the operator asks.
    """

    def __init__(
        self,
        *,
        provider: str = "deepseek-official",
        model: str = "deepseek-v4-flash",
        cwd: str | None = None,
        dsh_home: str | None = None,
        profile: str = "estate",
        max_tokens: int = 8192,
    ) -> None:
        self.provider = provider
        self.model = model
        self.cwd = cwd or os.getcwd()
        self.dsh_home = dsh_home or os.environ.get("MELITE_DSH_HOME", "") or _default_home()
        self.profile = profile
        self.max_tokens = max_tokens

    @staticmethod
    def available() -> bool:
        """True when the harness SDK imports (chat can run for real)."""
        try:
            import deepseek_harness  # noqa: F401
        except ImportError:
            return False
        return True

    def _kwargs(self) -> dict[str, str | int]:
        kwargs: dict[str, str | int] = {
            "provider": self.provider,
            "model": self.model,
            "max_tokens": self.max_tokens,
            "cwd": self.cwd,
            "profile": self.profile,
        }
        if self.dsh_home:
            kwargs["dsh_home"] = self.dsh_home
        return kwargs

    def _harness_cls(self) -> Callable[..., _Harness]:
        try:
            from deepseek_harness import DeepSeekHarness
        except ImportError as e:
            raise ChatError(
                "chat unavailable: deepseek-harness-sdk is not installed "
                "in this env (run the studio from the estate base env)."
            ) from e
        return DeepSeekHarness

    def reply(self, prompt: str, session_id: str) -> str:
        if not prompt.strip():
            raise ChatError("chat: empty prompt — nothing to send.")
        cls = self._harness_cls()
        try:
            with cls(**self._kwargs()) as harness:
                result = harness.run(prompt, session_id=session_id)
        except Exception as e:
            raise ChatError("chat turn failed: " + str(e)) from e
        return result.final_response

    def stream(self, prompt: str, session_id: str) -> Iterator[str]:
        if not prompt.strip():
            raise ChatError("chat: empty prompt — nothing to send.")
        cls = self._harness_cls()
        out: queue.Queue = queue.Queue()

        def _on(notification: _Notification) -> None:
            try:
                if getattr(notification, 'method', None) != 'session.event':
                    return
                payload = getattr(notification, 'payload', None) or {}
                if payload.get('sessionId') != session_id:
                    return
                event = payload.get('event')
                if isinstance(event, dict) and event.get('type') == 'assistant/message':
                    text = _message_text(event)
                    if text:
                        out.put(('text', text))
            except Exception:
                pass

        def _work() -> None:
            try:
                with cls(**self._kwargs()) as harness:
                    result = harness.run(prompt, session_id=session_id, on_notification=_on)
                out.put(('final', result.final_response))
            except BaseException as e:
                out.put(('error', e))
            finally:
                out.put(('end', None))

        threading.Thread(target=_work, daemon=True).start()
        seen = ''
        while True:
            kind, val = out.get()
            if kind == 'end':
                return
            if kind == 'error':
                if isinstance(val, ChatError):
                    raise val
                raise ChatError("chat turn failed: " + str(val)) from val
            if kind == 'text' and isinstance(val, str) and val.startswith(seen):
                delta = val[len(seen):]
                seen = val
                if delta:
                    yield delta
            elif kind == 'final' and isinstance(val, str):
                if val.startswith(seen):
                    tail = val[len(seen):]
                    seen = val
                    if tail:
                        yield tail
                elif val and val != seen:
                    seen = val
                    yield val


def _message_text(event: dict[str, JsonValue]) -> str:
    data = event.get('data')
    if not isinstance(data, dict):
        return ''
    message = data.get('message')
    owner = message if isinstance(message, dict) else data
    content = owner.get('content')
    if not isinstance(content, list):
        return ''
    return ''.join(
        str(b.get('text') or '')
        for b in content
        if isinstance(b, dict) and b.get('type') == 'text'
    )


def iter_answer(agent: ChatAgent, prompt: str, session_id: str) -> Iterator[str]:
    prefer = getattr(agent, 'stream', None)
    if callable(prefer):
        yield from prefer(prompt, session_id)
    else:
        yield agent.reply(prompt, session_id)


def build_agent_from_env() -> ChatAgent:
    """Resolve the chat agent from env (routes call this at boot).

    STUDIO_CHAT=off forces the echo stand-in (operator surface
    without LLM spend). Otherwise a HarnessAgent is returned — it
    refuses LOUDLY per turn when the SDK is missing (never a silent
    wrong answer).
    """
    if os.environ.get("STUDIO_CHAT", "").strip().lower() == "off":
        return EchoAgent(prefix="chat-off")
    return HarnessAgent(
        provider=os.environ.get("DSH_PROVIDER", "deepseek-official"),
        model=os.environ.get("DSH_MODEL", "deepseek-v4-flash"),
        cwd=os.environ.get("STUDIO_CWD") or os.getcwd(),
        dsh_home=os.environ.get("MELITE_DSH_HOME", ""),
        profile=os.environ.get("DSH_PROFILE", "estate"),
    )
