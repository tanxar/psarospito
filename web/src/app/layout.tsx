import type { Metadata } from "next";
import { Geist_Mono, Inter } from "next/font/google";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { SavedListingsProvider } from "@/components/saved/use-saved";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Nestio",
  description: "Scandi minimal real estate search.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <SavedListingsProvider>
          <SiteHeader />
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            {children}
            <SiteFooter />
          </div>
        </SavedListingsProvider>
      </body>
    </html>
  );
}
