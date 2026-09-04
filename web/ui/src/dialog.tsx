"use client"

import * as React from "react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { XIcon } from "lucide-react"

import { cn } from "./utils"
import { Button } from "./button"

// Migrated from @radix-ui/react-dialog to @base-ui/react/dialog on
// 2026-07-17. Base UI is the codebase's direction (12 components already
// migrated: avatar, badge, button, collapsible, input, navigation-menu,
// scroll-area, select, separator, sheet, slider, tabs).
//
// FUNCTIONAL BUG THAT FORCED THE MIGRATION: the schema-driven ModifiersModal
// stacks a Base UI <Select> inside this Dialog. Radix Dialog's focus trap
// and Base UI Select's portal are incompatible — the Radix Dialog steals
// focus back from the Select's portal (rendered at document root, outside
// the Dialog's subtree), dismissing the dropdown within ~200ms of open.
// Symptom: dropdown opens, options render, then the portal auto-closes
// before the user (or Playwright) can click an option. Same library for
// Dialog + Select = no focus-trap conflict.
//
// API mapping (Radix → Base UI):
//   Dialog.Root        → Dialog.Root           (identical)
//   Dialog.Trigger     → Dialog.Trigger        (identical)
//   Dialog.Portal      → Dialog.Portal         (identical)
//   Dialog.Close       → Dialog.Close          (identical)
//   Dialog.Overlay     → Dialog.Backdrop       (RENAMED)
//   Dialog.Content     → Dialog.Popup          (RENAMED)
//   Dialog.Title       → Dialog.Title          (identical)
//   Dialog.Description → Dialog.Description    (identical)
//
// CSS animation attributes also changed: Radix's `data-[state=open]` /
// `data-[state=closed]` became Base UI's `data-starting-style` (entering)
// and `data-ending-style` (exiting). See sheet.tsx for the same pattern.

function Dialog({ ...props }: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}
function DialogTrigger({ ...props }: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}
function DialogPortal({ ...props }: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}
function DialogClose({ ...props }: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}
function DialogOverlay({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Backdrop>) {
  return (
    <DialogPrimitive.Backdrop
      data-slot="dialog-overlay"
      className={cn(
        // z-[100] — above the card zoom overlay's z-[80] (FlowCard's
        // createPortal layer). The Dialog portals to document.body but the
        // zoom overlay ALSO portals (to [data-workspace-content] ?? body),
        // so at body level z-80 beat the old z-50 and hid the Dialog behind
        // the overlay's solid background (2026-08-09: "+ Mod only changes
        // some colors, no modal popup").
        "fixed inset-0 z-[100] bg-black/50 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0",
        className,
      )}
      {...props}
    />
  )
}
function DialogContent({ className, children, showCloseButton = true, ...props }: React.ComponentProps<typeof DialogPrimitive.Popup> & { showCloseButton?: boolean }) {
  return (
    <DialogPortal data-slot="dialog-portal">
      <DialogOverlay />
      <DialogPrimitive.Popup
        data-slot="dialog-content"
        className={cn(
          "fixed top-[50%] left-[50%] z-[100] grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border bg-background p-6 shadow-lg outline-none transition duration-200 data-ending-style:opacity-0 data-ending-style:scale-95 data-starting-style:opacity-0 data-starting-style:scale-95 sm:max-w-lg",
          className,
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                className="absolute top-4 right-4 opacity-70 transition-opacity hover:opacity-100 [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0"
              />
            }
          >
            <XIcon />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Popup>
    </DialogPortal>
  )
}
function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="dialog-header" className={cn("flex flex-col gap-2 text-center sm:text-left", className)} {...props} />
}
function DialogFooter({ className, showCloseButton = false, children, ...props }: React.ComponentProps<"div"> & { showCloseButton?: boolean }) {
  return (
    <div data-slot="dialog-footer" className={cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)} {...props}>
      {children}
      {showCloseButton && (
        <DialogPrimitive.Close render={<Button variant="outline">Close</Button>} />
      )}
    </div>
  )
}
function DialogTitle({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return <DialogPrimitive.Title data-slot="dialog-title" className={cn("font-semibold text-lg leading-none", className)} {...props} />
}
function DialogDescription({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return <DialogPrimitive.Description data-slot="dialog-description" className={cn("text-muted-foreground text-sm", className)} {...props} />
}
export { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogOverlay, DialogPortal, DialogTitle, DialogTrigger }
