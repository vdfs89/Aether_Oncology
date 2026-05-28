/**
 * components/ui/Button.tsx
 * 
 * Design System primitive — enterprise-grade Button with:
 * - asChild pattern via @radix-ui/react-slot (never leaks to DOM)
 * - Full variant + size system
 * - forwardRef for composability
 * - Works with Next.js <Link>, <a>, and any polymorphic child
 * 
 * Usage:
 *   <Button variant="primary" size="lg">Click me</Button>
 *   <Button asChild><Link href="/platform">Go</Link></Button>
 *   <Button asChild variant="ghost"><a href="/docs">Docs</a></Button>
 */
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cn } from "@/lib/utils"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * When true, Button renders its child as the root element,
   * merging all props (className, onClick, etc.) into it.
   * The `asChild` prop itself is NEVER passed to the DOM.
   */
  asChild?: boolean
  variant?: "primary" | "ghost"
  size?: "default" | "sm" | "lg"
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "default",
      asChild = false,
      ...props  // asChild is destructured above — clean spread, no DOM leak
    },
    ref
  ) => {
    // Slot merges all props into the child element when asChild=true.
    // When asChild=false, renders a plain <button>.
    const Comp = asChild ? Slot : "button"

    return (
      <Comp
        // ref is only valid when Comp is "button" — Slot handles it transparently
        ref={ref as React.Ref<HTMLButtonElement>}
        className={cn(
          "btn",
          {
            "btn--primary": variant === "primary",
            "btn--ghost":   variant === "ghost",
            "btn--sm":      size === "sm",
            "btn--lg":      size === "lg",
          },
          className
        )}
        {...props}
      />
    )
  }
)

Button.displayName = "Button"

export { Button }
