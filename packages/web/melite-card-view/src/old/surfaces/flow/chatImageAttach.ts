/**
 * Extract the latest attached image from the legacy bridge chat messages.
 *
 * Shared between:
 *   - CopilotInteractions.tsx (present_and_generate — direct generate path)
 *   - agentApiTools.ts        (attach_chat_image tool — flow-build path)
 *
 * the legacy bridge stores uploaded images as multimodal content parts on user
 * messages. Each part:
 *   { type: "image", source: { type: "data", value: <base64>, mimeType } }
 * We scan backwards through the chat to find the most recent image and
 * convert it to a data URL the server understands as `input_image`.
 *
 * LAST-IMAGE HOLDER (1b, 2026-08-06):
 *   The attach_chat_image tool caches its extracted dataUrl here via
 *   rememberChatImage() so the instance facades (FlowStub.attachChatImage
 *   in rpc/editorClient.ts) can wire the SAME image into a stage without
 *   re-parsing the the legacy bridge message log. The tool has the agent context;
 *   the facades don't — the holder is the single bridge between them.
 *   One extraction, one source of truth.
 */
export interface ChatMessage {
  role?: string
  content?: unknown
}

export function extractLatestImageFromChat(
  messages: ChatMessage[] | undefined,
): string | null {
  if (!messages || !Array.isArray(messages)) return null
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i]
    if (msg.role !== "user") continue
    const content = msg.content
    if (!Array.isArray(content)) continue
    for (const part of content) {
      if (
        part &&
        typeof part === "object" &&
        (part as Record<string, unknown>).type === "image"
      ) {
        const src = (part as Record<string, unknown>).source as
          | Record<string, unknown>
          | undefined
        if (src?.type === "data" && typeof src.value === "string") {
          const mime = String(src.mimeType || "image/png")
          return `data:${mime};base64,${src.value}`
        }
      }
    }
  }
  return null
}

// ── Last-image holder ────────────────────────────────────────────────────

let _lastImage: string | null = null

/** Cache the dataUrl the attach_chat_image tool extracted from the chat. */
export function rememberChatImage(dataUrl: string): void {
  _lastImage = dataUrl
}

/** Clear the cached image (attach_chat_image failure / stage rejection). */
export function forgetChatImage(): void {
  _lastImage = null
}

/** The most recent chat image, if any (consumed by FlowStub.attachChatImage). */
export function getLastChatImage(): string | null {
  return _lastImage
}
