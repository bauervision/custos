import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ChatWidget from "@/components/chat/ChatWidget";
import { KustosProvider } from "@/lib/provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Knexus.Ai: Kustos",
  description: "From Origin to Outcome—Kustos Watches",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <KustosProvider>
        <body
          className="min-h-screen flex flex-col"
          style={{ scrollbarGutter: "stable both-edges" }}
        >
          <header className="sticky top-0 z-50 border-b border-white/10 bg-black/30 backdrop-blur px-4 py-3">
            <div className="mx-auto max-w-6xl flex items-center justify-between">
              {/* Brand → home */}
              <a
                href="/"
                aria-label="Go to Custos home"
                className="group inline-flex items-center gap-2 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
              >
                <span className="brand-custos" data-text="Custos">
                  Kustos
                </span>
              </a>

              {/* Nav */}
              <nav className="flex gap-1 text-sm">
                <a
                  href="/"
                  className="navlink"
                  aria-current={
                    typeof window !== "undefined" &&
                    window.location.pathname === "/"
                      ? "page"
                      : undefined
                  }
                >
                  Prompt
                </a>
                <a
                  href="/map"
                  className="navlink"
                  aria-current={
                    typeof window !== "undefined" &&
                    window.location.pathname.startsWith("/map")
                      ? "page"
                      : undefined
                  }
                >
                  Map
                </a>
                <a
                  href="/dashboard"
                  className="navlink"
                  aria-current={
                    typeof window !== "undefined" &&
                    window.location.pathname.startsWith("/dashboard")
                      ? "page"
                      : undefined
                  }
                >
                  Summary
                </a>
              </nav>
            </div>
          </header>

          <main className="flex-1">{children}</main>

          <ChatWidget />
          <footer className="border-t border-white/10 px-4 py-6 text-xs text-white/60">
            <div className="mx-auto max-w-6xl">
              Knexus.Ai © {new Date().getFullYear()} Kustos: From Origin to
              Outcome—Kustos Watches
            </div>
          </footer>
        </body>
      </KustosProvider>
    </html>
  );
}
