import type { Metadata, Viewport } from "next";
import { Inter, Sora } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["300", "400", "500", "600"],
  display: "swap",
});

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-sora",
  weight: ["400", "600", "700", "800"],
  display: "swap",
});

// ── Viewport (themeColor lives here in Next.js 14+) ───────────────────────────
export const viewport: Viewport = {
  themeColor: "#050816",
  width: "device-width",
  initialScale: 1,
  colorScheme: "dark",
};

// ── Metadata ──────────────────────────────────────────────────────────────────
export const metadata: Metadata = {
  title: {
    default: "Aether Oncology | Diagnóstico Oncológico de Precisão",
    template: "%s | Aether Oncology",
  },
  description:
    "Aether Oncology — IA Preditiva de elite para Oncologia de Precisão. Ciência, tecnologia e design unidos pela vida.",
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: "Aether Oncology | AI Oncology Platform",
    description:
      "A plataforma de IA médica que está redefinindo o diagnóstico oncológico.",
    type: "website",
    locale: "pt_BR",
    siteName: "Aether Oncology",
  },
  twitter: {
    card: "summary_large_image",
    title: "Aether Oncology | AI Oncology Platform",
    description:
      "A plataforma de IA médica que está redefinindo o diagnóstico oncológico.",
  },
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${inter.variable} ${sora.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
