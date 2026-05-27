import { Hero } from "@/components/landing/Hero/Hero"
import { Benefits } from "@/components/landing/Benefits/Benefits"
import { DatasetShowcase } from "@/components/landing/Dataset/DatasetShowcase"
import { AIInsights } from "@/components/landing/AI/AIInsights"
import { CTASection } from "@/components/landing/CTA/CTASection"
import { Footer } from "@/components/landing/Footer/Footer"

export default function HomePage() {
  return (
    <>
      <Hero />
      <Benefits />
      <DatasetShowcase />
      <AIInsights />
      <CTASection />
      <Footer />
    </>
  )
}
