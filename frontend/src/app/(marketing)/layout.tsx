export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex flex-col w-full relative">
      {/* 
        Here we can place a shared Navbar/Footer if desired,
        but for now, the sections can render them individually or we can wrap the marketing pages.
      */}
      {children}
    </div>
  )
}
