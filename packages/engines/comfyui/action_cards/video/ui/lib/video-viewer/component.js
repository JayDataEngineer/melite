import { jsx as _jsx } from "react/jsx-runtime";
import { VideoPlayer } from "../viewers/index.js";
import styles from "./component.module.css";
export default function VideoViewerClaim({ url, mode, className }) {
    // Both modes render the transport; the host sizes the cell.
    void mode;
    return _jsx(VideoPlayer, { src: url, className: className ?? styles.fullDefault });
}
//# sourceMappingURL=component.js.map
