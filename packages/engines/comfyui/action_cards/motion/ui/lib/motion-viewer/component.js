import { jsx as _jsx } from "react/jsx-runtime";
import { MotionPoster, MotionViewer } from "../viewers/index.js";
import styles from "./component.module.css";
export default function MotionViewerClaim({ url, mode, className }) {
    if (mode === "tile")
        return _jsx(MotionPoster, { url: url, className: className ?? styles.tileDefault });
    return _jsx(MotionViewer, { url: url, className: className ?? styles.fullDefault });
}
//# sourceMappingURL=component.js.map
