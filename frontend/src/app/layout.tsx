import type { Metadata } from "next";
import { Inter, Sora } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["300", "400", "500", "600"],
});

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-sora",
  weight: ["400", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Aether Oncology | Diagnóstico Oncológico de Precisão",
  description: "Aether Oncology — IA Preditiva de elite para Oncologia de Precisão. Ciência, tecnologia e design unidos pela vida.",
  themeColor: "#050816",
  openGraph: {
    title: "Aether Oncology | AI Oncology Platform",
    description: "A plataforma de IA médica que está redefinindo o diagnóstico oncológico.",
    type: "website",
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
