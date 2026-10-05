import { setContractToastSink } from '@melite/catalog';
import { useToastStore } from "../index.js";
export const name = '@melite/card-base';
export const inject = [];
/** No client-side effects: the row exists for the browser graph —
 *  its atoms reach every card through the loader's require. */
export function apply(_ctx) { }
setContractToastSink((type, message, action) => {
    useToastStore.getState().addToast(type, message, action);
});
export * from "../index.js";
//# sourceMappingURL=index.js.map
