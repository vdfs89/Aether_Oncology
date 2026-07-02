import type { Metadata } from "next"
import { SiteNav } from "@/components/landing/Nav/SiteNav"
import { DashboardContainer } from "@/components/dashboard/DashboardContainer"

export const metadata: Metadata = {
  title: "Precision Dashboard",
  description:
    "Aether Oncology — painel de precisão do classificador de risco de câncer oral: recall, calibração, fairness e drift.",
}

export default function DashboardPage() {
  return (
    <>
      {/* Mesmo componente de navegação do site (reuso, não cópia) — tira o dashboard do isolamento. */}
      <SiteNav />
      <DashboardContainer />
    </>
  )
}
