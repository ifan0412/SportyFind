import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        // Updated: slate-700/50 replaces bg-muted for dark theme consistency
        "animate-pulse rounded-md bg-slate-700/50",
        className
      )}
      {...props}
    />
  )
}

export { Skeleton }