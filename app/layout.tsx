import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "ARBE λ* — Spectral Colour Intelligence",
    template: "%s — ARBE λ*",
  },
  description:
    "Scientific reference, reference core, documentation and applications for the ARBE λ* Platform.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
