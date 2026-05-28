import { Variants } from "framer-motion"
import { DURATION, EASE } from "@/config/motion"

export const chartReveal: Variants = {
  hidden:  { opacity: 0, scale: 0.97, filter: "blur(6px)" },
  visible: {
    opacity: 1,
    scale:   1,
    filter:  "blur(0px)",
    transition: {
      duration: DURATION.medium,  // 0.55s — precise, not theatrical
      ease:     EASE.out,
    },
  },
}
