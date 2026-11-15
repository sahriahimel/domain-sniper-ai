import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Domain Sniper AI",
  description: "Find a handful of category-killer domains, verify they are available, and get a ready-to-list Afternic pack.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-zinc-950 font-sans text-zinc-200 antialiased">{children}</body>
    </html>
  );
}
