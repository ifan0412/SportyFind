import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  // Base: focus ring updated to blue slate, error states adjusted
  "group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-blue-500/50 focus-visible:ring-3 focus-visible:ring-blue-500/20 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-red-500/50 aria-invalid:ring-3 aria-invalid:ring-red-500/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        // ── Shadcn base variants (updated for dark slate) ───────────────

        // Updated: slate-600 bg to replace primary token on dark bg
        default:
          "bg-slate-600 text-slate-100 hover:bg-slate-500",

        // Updated: slate border/bg/hover for dark outline button
        outline:
          "border-slate-700 bg-slate-800/60 text-slate-300 hover:bg-slate-700 hover:text-slate-100 aria-expanded:bg-slate-700 aria-expanded:text-slate-100",

        // Updated: slate-700 secondary with slate-300 text
        secondary:
          "bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-slate-100 aria-expanded:bg-slate-700 aria-expanded:text-slate-300",

        // Updated: ghost hover in slate
        ghost:
          "text-slate-300 hover:bg-slate-700 hover:text-slate-100 aria-expanded:bg-slate-700 aria-expanded:text-slate-100",

        // Updated: red tones consistent with badge + sonner destructive
        destructive:
          "bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20 focus-visible:border-red-500/40 focus-visible:ring-red-500/20",

        // Updated: blue-400 link consistent with badge link + sonner info
        link:
          "text-blue-400 underline-offset-4 hover:underline",

        // ── SportyFind custom variants (already dark-theme ready) ───────

        // Primary CTA — gradient blue to violet
        brand:
          "bg-gradient-to-r from-blue-600 to-violet-600 text-white hover:from-blue-500 hover:to-violet-500 shadow-lg shadow-blue-500/20",

        // Subtle bordered variant for secondary actions
        "brand-outline":
          "border-blue-500/30 bg-blue-500/5 text-blue-400 hover:bg-blue-500/10 hover:border-blue-500/50",

        // Verified/success actions e.g. confirm, join team
        success:
          "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20",

        // Muted/inactive states in filters or toggles
        muted:
          "bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700 hover:text-slate-300",
      },
      size: {
        // ── Sizes: unchanged ────────────────────────────────────────────
        default:
          "h-8 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        xs:
          "h-6 gap-1 rounded-[min(var(--radius-md),10px)] px-2 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm:
          "h-7 gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg:
          "h-9 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        icon: "size-8",
        "icon-xs":
          "size-6 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-7 rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-lg",
        "icon-lg": "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }