import React from "react"
import { Button } from "@/components/ui/Button"
import Link from "next/link"

export function SoonPage({ title }: { title: string }) {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4 relative">
      <div className="absolute inset-0 ambient" aria-hidden="true">
        <div className="mesh-blob mesh-blob--1" />
        <div className="mesh-blob mesh-blob--3" />
      </div>
      <div className="relative z-10 space-y-6">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-[var(--t1)]">
          {title}
        </h1>
        <p className="text-lg text-[var(--t2)] max-w-md mx-auto">
          Esta área da plataforma está atualmente em desenvolvimento como parte do roadmap Aether Oncology.
        </p>
        <div className="pt-4">
          <Button asChild>
            <Link href="/">Voltar para a Home</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
