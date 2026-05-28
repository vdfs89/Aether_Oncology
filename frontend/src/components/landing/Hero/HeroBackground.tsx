export function HeroBackground() {
  return (
    <div className="ambient absolute inset-0 overflow-hidden z-0 pointer-events-none" aria-hidden="true">
      {/* Mesh blobs */}
      <div className="mesh-blob mesh-blob--1"></div>
      <div className="mesh-blob mesh-blob--2"></div>
      <div className="mesh-blob mesh-blob--3"></div>
      <div className="mesh-blob mesh-blob--4"></div>

      {/* Cinematic AI spatial grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-70" />
      
      {/* Subtle depth fog overlay at bottom to transition to page background */}
      <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-[#030409] to-transparent z-10" />

      <div className="grain"></div>
    </div>
  )
}
