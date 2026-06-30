import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        // Base layout — unchanged
        "h-8 w-full min-w-0 rounded-lg px-2.5 py-1 text-base outline-none transition-colors md:text-sm",

        // Updated: slate dark theme bg + border
        "border border-slate-700 bg-slate-800/60 text-slate-100",

        // Updated: slate placeholder
        "placeholder:text-slate-500",

        // Updated: blue focus ring to match SportyFind brand
        "focus-visible:border-blue-500/50 focus-visible:ring-3 focus-visible:ring-blue-500/20",

        // File input styling — unchanged
        "file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-slate-300",

        // Disabled state
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-slate-800/30 disabled:opacity-50",

        // Error state
        "aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",

        className
      )}
      {...props}
    />
  )
}

export { Input }