"""Chat tests - EchoAgent records, HarnessAgent degrades loudly without SDK."""

from __future__ import annotations

import pytest

from infer_daisy_studio.chat import ChatError, EchoAgent, HarnessAgent, build_agent_from_env


def test_echo_records_and_prefixes() -> None:
    a = EchoAgent()
    assert a.reply("hi", "s1") == "echo: hi"
    assert a.calls == [("hi", "s1")]


def test_harness_refuses_empty_prompt_without_touching_sdk() -> None:
    a = HarnessAgent.__new__(HarnessAgent)
    a.provider, a.model, a.cwd, a.dsh_home, a.profile, a.max_tokens = "p", "m", ".", "", "e", 8
    try:
        a.reply("   ", "s")
    except ChatError as e:
        assert "empty prompt" in str(e)
    else:
        raise AssertionError("empty prompt must refuse")


def test_harness_missing_sdk_refuses_loudly(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setitem(__import__("sys").modules, "deepseek_harness", None)
    assert HarnessAgent.available() is False
    a = HarnessAgent(provider="p", model="m")
    try:
        a.reply("hello", "s")
    except ChatError as e:
        assert "not installed" in str(e)
    else:
        raise AssertionError("missing SDK must refuse loudly")


def test_env_off_forces_echo(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("STUDIO_CHAT", "off")
    assert isinstance(build_agent_from_env(), EchoAgent)


def test_env_default_builds_harness(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("STUDIO_CHAT", raising=False)
    assert isinstance(build_agent_from_env(), HarnessAgent)
