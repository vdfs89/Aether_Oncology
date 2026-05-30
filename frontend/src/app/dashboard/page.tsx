import type { Metadata } from "next"
import { PrecisionDashboard } from "@/components/dashboard/PrecisionDashboard"

export const metadata: Metadata = {
  title: "Precision Dashboard",
  description:
    "Aether Oncology — painel de precisão do classificador de risco de câncer oral: recall, calibração, fairness e drift.",
}

export default function DashboardPage() {
  return <PrecisionDashboard />
}
