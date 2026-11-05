import { boardUserLoraRows, readUserLoraRows, userLoraFlavor, userLorasPath } from "../userLoras.js";
export const inject = ['comfyui'];
export function apply(ctx) {
    const path = userLorasPath();
    const file = readUserLoraRows(path);
    if (file.absent) {
        // the shipped state: absent is opt-in, not an error — and it
        // must not log per compose (composeOnce runs per request)
        return;
    }
    for (const problem of file.problems) {
        ctx.logger('user-loras').warn('row refused — ' + problem);
    }
    // THE BOARDING GUARD (the poison cure, 2026-11-15): a row naming
    // a family that does not board the loras pack DROPS here — a
    // junk row in the rows file must never take the boot (or the
    // good rows) down; the drop is named, never silent
    const { rows, dropped } = boardUserLoraRows(file.rows, new Set(ctx.comfyui.lorasBoardingFamilies()));
    for (const drop of dropped) {
        ctx.logger('user-loras').warn('row dropped — ' + drop);
    }
    const flavor = userLoraFlavor({ ...file, rows });
    if (flavor === null) {
        ctx.logger('user-loras').info(path + ' served no rows');
        return;
    }
    ctx.effect(() => ctx.comfyui.registerFlavor(flavor));
    ctx.logger('user-loras').info(flavor.rows.length + ' user row(s) for ' + flavor.families.join(', ') + ' served from ' + path);
}
//# sourceMappingURL=userLorasFlavor.js.map
