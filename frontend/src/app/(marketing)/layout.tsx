import { SiteNav } from "@/components/landing/Nav/SiteNav"

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex flex-col w-full relative">
      <SiteNav />
      {children}
    </div>
  )
}
