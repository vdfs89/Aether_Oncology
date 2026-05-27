"use client"

import { Button } from "@/components/ui/Button"
import { motion } from "framer-motion"
import { fadeUp } from "@/animations/fade"
import Link from "next/link"

export function HeroCTA() {
  return (
    <motion.div 
      className="hero-ctas"
      variants={fadeUp}
      initial="hidden"
      animate="visible"
    >
      <Button asChild size="lg">
        <Link href="/platform">
          Agendar Demonstração
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true" className="ml-2">
            <path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </Link>
      </Button>
      <Button asChild variant="ghost" size="lg">
        <Link href="/research">Ver Evidência Científica</Link>
      </Button>
    </motion.div>
  )
}
