import { TargetAndTransition } from "framer-motion"

export const glowHover = {
  initial: {
    scale: 1,
    boxShadow: "0 0 0 rgba(0, 229, 255, 0)"
  } as TargetAndTransition,
  hover: {
    scale: 1.01,
    boxShadow: "0 0 20px rgba(0, 229, 255, 0.15)",
    transition: {
      duration: 0.3,
      ease: "easeOut"
    }
  } as TargetAndTransition
}

export const glowHoverPink = {
  initial: {
    scale: 1,
    boxShadow: "0 0 0 rgba(255, 79, 216, 0)"
  } as TargetAndTransition,
  hover: {
    scale: 1.01,
    boxShadow: "0 0 20px rgba(255, 79, 216, 0.15)",
    transition: {
      duration: 0.3,
      ease: "easeOut"
    }
  } as TargetAndTransition
}
