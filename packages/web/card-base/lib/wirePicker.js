import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { IconLinkOutlineRegular, Modal } from '@deepseek-ai/dsh-client-ui-primitives';
import { clsx } from "clsx";
import { isImageUrl } from "./square.js";
import { t } from "./locales/square.js";
import styles from "./card.module.css";
/** The wire picker — prior stages by ARRAY INDEX, including ones that
 * haven't run yet ("not run yet" — wire BEFORE the upstream runs).
 *
 * Named outputs: when an upstream stage produced >1 named artifact
 * (input_prep → media + mask), it expands into ONE ROW PER output so the
 * user can wire mask → lanpaint_mask specifically. Upstreams with 0–1
 * named artifacts render as a single row (legacy — primary via
 * assetUrls[0]). The output name rides onPick → setSlotInput →
 * inputOutputs → collectUpstreamResults. */
export function WirePickerModal({ slot, priorStages, currentId, currentOutput, onPick, onUnwire, onClose, }) {
    return (_jsx(Modal, { open: true, onClose: onClose, title: t('wireTitle', { slot }), closeLabel: t('closeWirePicker'), className: styles.wireDialog, children: _jsxs("div", { "data-wire-modal": true, children: [currentId && (_jsx("button", { type: "button", onClick: onUnwire, "data-wire-unwire": true, className: styles.wireUnwire, children: t('unwire') })), _jsxs("ul", { className: styles.wireList, children: [priorStages.length === 0 && (_jsx("li", { className: styles.wireEmpty, children: t('noEarlierCards') })), priorStages.map((u, i) => {
                            // Named artifacts the upstream produced (media, mask, …). When
                            // >1, expand into per-output rows; else a single primary row.
                            const named = u.result?.artifacts ?? {};
                            const namedEntries = Object.entries(named);
                            const multi = namedEntries.length > 1;
                            const rows = multi
                                ? namedEntries.map(([name, url]) => ({ outputName: name, thumb: url, label: name }))
                                : [{ outputName: null, thumb: u.result?.assetUrls[0], label: t('primaryOutput') }];
                            return rows.map((row, ri) => {
                                const selected = u.id === currentId && (currentOutput ?? null) === (row.outputName ?? null);
                                return (_jsx("li", { children: _jsxs("button", { type: "button", onClick: () => onPick(u.id, row.outputName), "data-wire-option": row.outputName ?? "primary", className: clsx(styles.wireOption, selected && styles.wireSelected), children: [_jsx("span", { className: styles.wireIdx, children: String(i + 1).padStart(2, "0") }), row.thumb && isImageUrl(row.thumb) ? (_jsx("img", { src: row.thumb, alt: "", className: styles.wireThumb })) : (_jsx("div", { className: styles.wireThumbFallback, children: _jsx(IconLinkOutlineRegular, { className: styles.sz14 }) })), _jsxs("div", { className: styles.wireMeta, children: [_jsxs("div", { className: styles.wireTitle, children: [u.title, multi && _jsxs("span", { className: styles.wireOut, children: ["\u00B7 ", row.label] })] }), _jsx("div", { className: styles.wireSub, children: u.result ? (row.thumb ?? t('noArtifacts')) : t('notRunYet') })] }), selected && _jsx("span", { className: styles.wiredTag, children: t('wired') })] }) }, u.id + (ri > 0 ? `:${row.outputName}` : "")));
                            });
                        })] })] }) }));
}
//# sourceMappingURL=wirePicker.js.map
