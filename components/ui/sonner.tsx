"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: (
          // Updated: emerald to match badge/avatar success colour
          <CircleCheckIcon className="size-4 text-emerald-400" />
        ),
        info: (
          // Updated: blue-400 for info clarity on dark bg
          <InfoIcon className="size-4 text-blue-400" />
        ),
        warning: (
          // Updated: amber for visible warning contrast
          <TriangleAlertIcon className="size-4 text-amber-400" />
        ),
        error: (
          // Updated: red-400 for error visibility
          <OctagonXIcon className="size-4 text-red-400" />
        ),
        loading: (
          // Updated: slate-400 for subtle loading spinner
          <Loader2Icon className="size-4 animate-spin text-slate-400" />
        ),
      }}
      style={
        {
          // Updated: all CSS vars replaced with explicit slate dark values
          "--normal-bg": "#1e293b",           // slate-800
          "--normal-text": "#f1f5f9",         // slate-100
          "--normal-border": "#334155",       // slate-700
          "--success-bg": "#1e293b",          // slate-800
          "--success-text": "#34d399",        // emerald-400
          "--success-border": "#334155",      // slate-700
          "--info-bg": "#1e293b",             // slate-800
          "--info-text": "#60a5fa",           // blue-400
          "--info-border": "#334155",         // slate-700
          "--warning-bg": "#1e293b",          // slate-800
          "--warning-text": "#fbbf24",        // amber-400
          "--warning-border": "#334155",      // slate-700
          "--error-bg": "#1e293b",            // slate-800
          "--error-text": "#f87171",          // red-400
          "--error-border": "#334155",        // slate-700
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast",
          // Updated: explicit slate classes for toast container
          title: "text-slate-100 font-medium text-sm",
          description: "text-slate-400 text-sm",
          actionButton: "bg-slate-700 text-slate-100 hover:bg-slate-600 rounded-md px-2 py-1 text-xs",
          cancelButton: "bg-slate-800 text-slate-400 hover:text-slate-100 rounded-md px-2 py-1 text-xs",
          closeButton: "text-slate-400 hover:text-slate-100",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }