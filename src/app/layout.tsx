import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { TopNav } from "~/components/nav/top-nav";
import { Footer } from "~/components/nav/footer";
import { Providers } from "./providers";
import "./globals.css";

const inter = Inter({ subsets: ["latin", "latin-ext"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: {
    default: "Sněmovna ČR — otevřená data",
    template: "%s · Sněmovna ČR",
  },
  description:
    "Civic-tech aplikace pro transparentní sledování Poslanecké sněmovny: hlasování, poslanci, návrhy zákonů, AI asistent a petice.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  applicationName: "Sněmovna ČR",
  keywords: ["sněmovna", "psp", "čr", "transparentnost", "hlasování", "poslanci", "zákony", "civic-tech"],
  authors: [{ name: "Sněmovna ČR" }],
  openGraph: {
    type: "website",
    locale: "cs_CZ",
    siteName: "Sněmovna ČR",
    title: "Sněmovna ČR — otevřená data",
    description: "Civic-tech aplikace pro transparentní sledování Poslanecké sněmovny.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Sněmovna ČR — otevřená data",
    description: "Civic-tech aplikace pro transparentní sledování Poslanecké sněmovny.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="cs" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans flex min-h-screen flex-col`}>
        <Providers>
          <TopNav />
          <main className="flex-1">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}