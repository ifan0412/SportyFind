import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  // Base: unchanged layout, focus ring updated to blue slate
  "group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-4xl border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-all focus-visible:border-blue-500/50 focus-visible:ring-[3px] focus-visible:ring-blue-500/20 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-red-500/50 aria-invalid:ring-red-500/20 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        // Updated: slate-600 bg with slate-100 text for default
        default:
          "bg-slate-600 text-slate-100 [a]:hover:bg-slate-500",
        // Updated: slate-700 bg with slate-300 text for secondary
        secondary:
          "bg-slate-700 text-slate-300 [a]:hover:bg-slate-600",
        // Updated: red tones kept but adjusted for dark bg
        destructive:
          "bg-red-500/10 text-red-400 focus-visible:ring-red-500/20 [a]:hover:bg-red-500/20",
        // Updated: slate-700 border, slate-300 text for outline
        outline:
          "border-slate-700 text-slate-300 [a]:hover:bg-slate-700 [a]:hover:text-slate-400",
        // Updated: slate hover states for ghost
        ghost:
          "text-slate-300 hover:bg-slate-700 hover:text-slate-100",
        // Updated: blue-400 link colour for dark bg
        link:
          "text-blue-400 underline-offset-4 hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }