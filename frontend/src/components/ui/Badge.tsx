import * as React from "react"
import { cn } from "@/lib/utils"

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "success" | "danger" | "ghost"
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        {
          "border-transparent bg-[var(--pink)]/10 text-[var(--pink)]": variant === "default",
          "border-transparent bg-[var(--success)]/10 text-[var(--success)]": variant === "success",
          "border-transparent bg-[var(--danger)]/10 text-[var(--danger)]": variant === "danger",
          "border-transparent bg-[var(--glass)] text-[var(--t2)]": variant === "ghost",
        },
        className
      )}
      {...props}
    />
  )
}

export { Badge }
