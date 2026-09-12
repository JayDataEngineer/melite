/**
 * readAsDataURL — the one File→data:URL read path (verbatim copy
 * of the former kit slot helper; that kit import is dead).
 */
export function readAsDataURL(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error ?? new Error("read failed"))
    reader.readAsDataURL(file)
  })
}
