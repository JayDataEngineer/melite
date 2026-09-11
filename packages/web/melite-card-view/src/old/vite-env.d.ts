interface ImportMetaEnv { readonly [key: string]: string | boolean | undefined }
interface ImportMeta { readonly env: ImportMetaEnv }
interface ImportMetaGlobResult { [path: string]: () => Promise<unknown> }
interface ImportMeta {
  readonly env: ImportMetaEnv
  glob(pattern: string): ImportMetaGlobResult
  glob<T>(pattern: string): { [path: string]: () => Promise<T> }
}
