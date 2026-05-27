import { Variants } from "framer-motion"

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.75,
      ease: [0.16, 1, 0.3, 1], // Custom ease-out
    }
  }
}

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: {
      duration: 0.75,
      ease: "easeOut"
    }
  }
}
