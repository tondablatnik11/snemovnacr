import type { Metadata } from "next";
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
  openGraph: {
    type: "website",
    locale: "cs_CZ",
    siteName: "Sněmovna ČR",
  },
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