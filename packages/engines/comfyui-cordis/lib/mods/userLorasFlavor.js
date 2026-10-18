import { readUserLoraRows, userLoraFlavor, userLorasPath } from "../userLoras.js";
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
    const flavor = userLoraFlavor(file);
    if (flavor === null) {
        ctx.logger('user-loras').info(path + ' served no rows');
        return;
    }
    ctx.effect(() => ctx.comfyui.registerFlavor(flavor));
    ctx.logger('user-loras').info(flavor.rows.length + ' user row(s) for ' + flavor.families.join(', ') + ' served from ' + path);
}
//# sourceMappingURL=userLorasFlavor.js.map