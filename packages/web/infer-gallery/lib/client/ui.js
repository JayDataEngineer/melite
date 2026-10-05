import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Button, Input } from '@deepseek-ai/dsh-client-ui-primitives';
import { bgLayer1, bgLayer2, bgOverlay1, fillSubtleCaption, labelPrimary1, labelSecondary2, stateErrorPrimary1, stateWarnPrimary1, } from "./ui.tokens.js";
export const FONT = 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
export const MONO = 'ui-monospace, monospace';
/** The stage every non-image tile/card sits on. */
export const gradientStage = `linear-gradient(160deg, ${bgLayer1} 0%, ${bgLayer2} 100%)`;
/** Caption scrim over posters. */
export const gradientCaption = `linear-gradient(to top, ${fillSubtleCaption}, transparent)`;
export function PanelShell({ dataAttr, children }) {
    return (_jsx("div", { ['data-' + dataAttr]: '1', style: {
            padding: 14, fontFamily: FONT, color: labelPrimary1,
            height: '100%', overflowY: 'auto', boxSizing: 'border-box',
        }, children: children }));
}
export function Stat({ children }) {
    return _jsx("span", { style: { fontSize: 11, color: labelSecondary2 }, children: children });
}
export function SearchInput({ value, onChange, placeholder }) {
    // DSH Input (passthrough value/onChange/placeholder/style onto the
    // native input; the DSW module CSS owns the chrome — the handrolled
    // bordered-input replica died here).
    return (_jsx(Input, { value: value, onChange: (e) => { onChange(e.target.value); }, placeholder: placeholder, style: { width: 170 } }));
}
export function RefreshButton({ loading, onClick }) {
    // DSH Button outline/sm — the transparent-bordered small-button
    // replica died here (disabled + children passthrough are native).
    return (_jsx(Button, { variant: "outline", size: "sm", onClick: onClick, disabled: loading, children: loading ? 'loading\u2026' : 'refresh' }));
}
export function Empty({ children }) {
    return _jsx("div", { style: { color: labelSecondary2, fontSize: 13, padding: 20 }, children: children });
}
export function ErrorBanner({ children }) {
    return (_jsx("div", { style: {
            padding: 14, borderRadius: 8, background: bgOverlay1,
            border: '1px solid ' + stateErrorPrimary1, fontSize: 13,
        }, children: children }));
}
/** Per-gateway notes: transport failures, door drops and dedupe overlap
 * all ride the same errors channel — the message says which. */
export function GatewayErrors({ errors }) {
    if (errors.length === 0)
        return null;
    return (_jsx(_Fragment, { children: errors.map((e) => (_jsxs("div", { style: { fontSize: 11, color: stateWarnPrimary1, marginBottom: 4 }, children: ["gateway ", e.gateway, ": ", e.message] }, e.gateway + e.message))) }));
}
//# sourceMappingURL=ui.js.map
