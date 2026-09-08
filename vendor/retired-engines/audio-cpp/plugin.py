"""plugin.py — audio-cpp plugin declaration (plugin.yaml flip, 2026-09-02)."""


class Plugin:
    id = "audio-cpp"
    label = "Audio.cpp"
    description = "Native C++ audio inference — TTS, SFX, music generation"
    engines = ("audio_cpp",)
    genres = ("audio",)
    webui = {
        "url": "http://127.0.0.1:8091",
        "label": "Audio Studio",
        "description": "TTS, SFX, music generation — 50+ audio model families",
        "features": (),
        "icon": "🎵",
    }
    dependencies = (
        {"source": "github.com/JayDataEngineer/audio.cpp",
         "description": "Audio inference engine (custom fork) — build from source with cmake",
         "cli": "build/bin/audiocpp_cli", "env": "AUDIO_CPP_CLI"},
        {"source": "huggingface", "repo_id": "ACE-Step/ACE-Step"},
        {"source": "huggingface", "repo_id": "Qwen/Qwen3-TTS"},
        {"source": "huggingface", "repo_id": "mistralai/MOSS-TTS"},
    )
