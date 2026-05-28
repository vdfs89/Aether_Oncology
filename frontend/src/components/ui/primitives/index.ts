/**
 * components/ui/primitives/index.ts
 * 
 * Re-exports all Radix UI primitives used across the Design System.
 * Import from here to centralize dependency on @radix-ui packages.
 * 
 * Pattern: wrap Radix exports with our naming conventions and add
 * Aether-specific display names for React DevTools clarity.
 * 
 * Adding a new primitive:
 *   1. npm install @radix-ui/react-<primitive>
 *   2. Export it here
 *   3. Use it in the relevant ui/ component
 */

// Composition
export { Slot, Slottable } from "@radix-ui/react-slot"

// Coming in Fase 2 (install as needed):
// export * from "@radix-ui/react-dialog"       // Clinical modals
// export * from "@radix-ui/react-popover"      // Tooltip panels
// export * from "@radix-ui/react-tooltip"      // XAI hover cards
// export * from "@radix-ui/react-tabs"         // Dashboard tabs
// export * from "@radix-ui/react-select"       // Form controls
// export * from "@radix-ui/react-separator"    // Visual dividers
// export * from "@radix-ui/react-scroll-area"  // Patient timelines
// export * from "@radix-ui/react-progress"     // Inference progress
