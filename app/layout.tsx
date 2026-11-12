import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { SITE_NAME, SITE_URL } from "@/lib/site";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta", display: "swap" });

// Indexing stays off until the client says go (NEXT_PUBLIC_INDEXING=on).
const indexing = process.env.NEXT_PUBLIC_INDEXING === "on";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `${SITE_NAME} | Bank property auctions in one place`, template: `%s | ${SITE_NAME}` },
  description: "Browse bank e-auctions for houses, flats, plots, shops and commercial property across India, gathered from the official portal and kept up to date. Bid on the original website.",
  openGraph: { type: "website", siteName: SITE_NAME, locale: "en_IN", images: ["/brand/logo.png"] },
  robots: indexing ? undefined : { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#0b1324", viewportFit: "cover" };

// every page shows live data (and the layout reads the database), so nothing is built ahead of time
export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN" className={jakarta.variable}>
      <body className="flex min-h-dvh flex-col">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-white">
          Skip to content
        </a>
        <Header />
        <main id="main" className="flex-1">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
