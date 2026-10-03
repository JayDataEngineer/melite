# melite-tts-nodes — the TTS half of the audio-core split (2026-09-04).
# Carved from melite-audio-nodes (the all-in-one was too heavy for a
# master pack): Qwen3-TTS synthesis, voice embeddings, and the Voice
# Studio (.qvoice creation/preview). Class names unchanged — the split
# installs replace the all-in-one without touching graphs.
from .nodes import (LoadAudiocoreModel, UnloadAudiocoreModel,
                    AudiocoreFamilyInfo, AudiocoreTTS,
                    AudiocoreVoiceEmbedding, AudiocoreVoiceStudio)
NODE_CLASS_MAPPINGS = {
    "LoadAudiocoreModel": LoadAudiocoreModel,
    "UnloadAudiocoreModel": UnloadAudiocoreModel,
    "AudiocoreFamilyInfo": AudiocoreFamilyInfo,
    "AudiocoreTTS": AudiocoreTTS,
    "AudiocoreVoiceEmbedding": AudiocoreVoiceEmbedding,
    "AudiocoreVoiceStudio": AudiocoreVoiceStudio,
}
__all__ = list(NODE_CLASS_MAPPINGS)
