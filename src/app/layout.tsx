import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Knexus.Ai: Custos",
  description: "From Origin to Outcome—Custos Watches",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">
        <header className="sticky top-0 z-50 border-b border-white/10 bg-black/30 backdrop-blur px-4 py-3">
          <div className="mx-auto max-w-6xl flex items-center justify-between">
            <div className="text-xl font-semibold tracking-wide">Custos</div>
            <nav className="flex gap-3 text-sm">
              <a href="/" className="hover:underline">
                Prompt
              </a>
              <a href="/map" className="hover:underline">
                Map
              </a>
              <a href="/dashboard" className="hover:underline">
                Summary
              </a>
            </nav>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-white/10 px-4 py-6 text-xs text-white/60">
          <div className="mx-auto max-w-6xl">
            Knexus.Ai © {new Date().getFullYear()} Custos: From Origin to
            Outcome—Custos Watches
          </div>
        </footer>
      </body>
    </html>
  );
}
