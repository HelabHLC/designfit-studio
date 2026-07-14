import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "ARBE.org — Reference-bound colour intelligence",
    template: "%s — ARBE.org",
  },
  description:
    "Scientific reference, documentation and development status for ARBE reference-bound spectral colour intelligence.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
