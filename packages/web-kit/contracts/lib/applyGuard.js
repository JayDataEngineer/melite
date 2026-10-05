export function createApplyGuard(label, opts = {}) {
    let claimed = false;
    return {
        claim() {
            if (claimed) {
                if (opts.warnOnRefusal === true) {
                    console.warn(`[${label}] apply called twice — second mount skipped`);
                }
                return false;
            }
            claimed = true;
            return true;
        },
        release() {
            claimed = false;
        },
    };
}
//# sourceMappingURL=applyGuard.js.map
