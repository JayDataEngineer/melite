# melite-sfx-nodes — the SFX half of the audio-core split (2026-09-04).
# Carved from melite-audio-nodes: MOSS-SFX v2 sound-effect diffusion
# (the AudiocoreTTS node serves family moss_sfx_v2, task gen — its
# diffusion params drive the loop). Class names unchanged.
from .nodes import (LoadAudiocoreModel, UnloadAudiocoreModel,
                    AudiocoreFamilyInfo, AudiocoreTTS)
NODE_CLASS_MAPPINGS = {
    "LoadAudiocoreModel": LoadAudiocoreModel,
    "UnloadAudiocoreModel": UnloadAudiocoreModel,
    "AudiocoreFamilyInfo": AudiocoreFamilyInfo,
    "AudiocoreTTS": AudiocoreTTS,
}
__all__ = list(NODE_CLASS_MAPPINGS)
