/**
 * src/features/ai/theme/index.ts
 * 
 * Theme tokens specific to the AI Clinical Copilot.
 * Ensures the Copilot has a distinct "intelligence console" feel,
 * separate from the marketing pages.
 */

export const copilotTheme = {
  colors: {
    // Backgrounds for the AI surface
    surface: "bg-[#0A0D14]",
    surfaceHover: "hover:bg-[#121622]",
    surfaceBorder: "border-[#1A2235]",
    
    // Bubble backgrounds
    userBubble: "bg-[#1E2536] border-[#2A344A]",
    aiBubble: "bg-transparent border-transparent",
    
    // Brand accents for AI
    primaryGlow: "shadow-[0_0_15px_rgba(34,211,238,0.15)]",
    primaryText: "text-cyan-400",
    
    // Text colors
    textBody: "text-neutral-300",
    textMuted: "text-neutral-500",
    textHighlight: "text-white",
  },
  spacing: {
    bubblePadding: "px-5 py-4",
    chatGutter: "gap-6",
    containerPadding: "px-4 md:px-8",
  },
  typography: {
    body: "text-[15px] leading-[1.6] tracking-[0.01em]",
    meta: "text-xs font-medium tracking-wide uppercase",
    code: "font-mono text-sm",
  },
  radii: {
    bubble: "rounded-2xl",
    card: "rounded-xl",
  }
}
