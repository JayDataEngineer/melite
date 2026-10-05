import { jsx as _jsx } from "react/jsx-runtime";
import { AudioWaveform, AudioPlayer } from "../viewers/index.js";
export default function AudioViewerClaim({ url, mode, className }) {
    if (mode === "tile")
        return _jsx(AudioWaveform, { audioUrl: url, height: 48, color: "#3b82f6", className: className });
    return _jsx(AudioPlayer, { src: url, className: className });
}
//# sourceMappingURL=component.js.map
