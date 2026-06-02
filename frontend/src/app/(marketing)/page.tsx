import { Hero } from "@/components/landing/Hero/Hero"
import { NavHub } from "@/components/landing/Hub/NavHub"
import { Benefits } from "@/components/landing/Benefits/Benefits"
import { DatasetShowcase } from "@/components/landing/Dataset/DatasetShowcase"
import { AIInsights } from "@/components/landing/AI/AIInsights"
import { CTASection } from "@/components/landing/CTA/CTASection"
import { Footer } from "@/components/landing/Footer/Footer"

export default function HomePage() {
  return (
    <>
      <Hero />
      <NavHub />
      <Benefits />
      <DatasetShowcase />
      <AIInsights />
      <CTASection />
      <Footer />
    </>
  )
}
