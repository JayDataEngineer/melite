import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * RailTabs — THE reusable tab strip for card-studio rails (operator
 * order, 2026-09-06: Shape's "3 sub menus… should look like the
 * 'CHARACTER' and 'RENDER', just have them under the above bigger
 * menus. Reusing components").
 *
 * TWO levels, ONE component:
 *   top    the rail's big sections (Character / Render / Import)
 *   dense  a nested sub-menu (Shape's Phenotype / Body / Face) —
 *          smaller, indented under its parent, same DNA.
 *
 * This is the STRIP only — a controlled id/value/onChange trio. It
 * deliberately does not own tab state or panes: the rail mounts it on
 * its own useState; BodyShapePanel mounts it INSIDE its kit <Tabs>
 * (value/onValueChange stay the Tabs' — TabsContent keeps working).
 * role=tablist/tab + aria-selected so the semantics are one shape at
 * every level.
 */
import { Button } from "@deepseek-ai/dsh-client-ui-primitives";
import styles from "./railTabs.module.css";
const TONE = {
    emerald: styles.badgeEmerald,
    amber: styles.badgeAmber,
    fuchsia: styles.badgeFuchsia,
};
export function RailTabs({ tabs, value, onChange, ariaLabel, dense = false }) {
    return (_jsx("div", { role: "tablist", "aria-label": ariaLabel, className: `${styles.strip} ${dense ? styles.stripDense : styles.stripTop}`, children: tabs.map((t) => (_jsxs(Button, { variant: "ghost", type: "button", role: "tab", "aria-selected": value === t.id, onClick: () => onChange(t.id), className: dense
                ? `${styles.tabDense} ${value === t.id ? styles.tabActive : styles.tabIdle}`
                : `${styles.tab} ${value === t.id ? styles.tabActive : styles.tabIdle}`, children: [t.label, t.badge !== undefined && t.badge > 0 && (_jsx("span", { className: `${styles.badge} ${TONE[t.badgeTone ?? "emerald"]}`, children: t.badge }))] }, t.id))) }));
}
//# sourceMappingURL=railTabs.js.map
