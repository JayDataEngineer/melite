/**
 * readFile — THE one read path for every slot-shaped attach, ported
 * native from the retired kit's SlotSquare (2026-09-12, the kit
 * retirement). A plain FileReader promise — no UI dependency owns a
 * file read.
 */
/** Read a File / Blob and resolve its data: URL. */
export function readAsDataURL(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error ?? new Error("read failed"));
        reader.readAsDataURL(file);
    });
}
//# sourceMappingURL=readFile.js.map