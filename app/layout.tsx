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
  title: "TTB Label Checker",
  description: "AI-assisted alcohol label compliance verification prototype",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-paper text-ink">
        {/* Header band */}
        <header className="w-full border-b-4 border-bark bg-parchment">
          <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
            <h1
              className="text-2xl font-bold text-ink"
              style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
            >
              TTB Label Checker
            </h1>
            <span className="rounded border border-bark px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-bark">
              Prototype
            </span>
          </div>
        </header>

        {/* Page content */}
        <div className="flex-1">{children}</div>

        {/* Footer */}
        <footer className="w-full py-6 text-center text-sm text-bark">
          Prototype built for a take-home assessment. Labels are processed in memory and never stored.
        </footer>
      </body>
    </html>
  );
}
