import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PortalX — Cross-Chain Liquidity Aggregator",
  description:
    "Discover and compare the best cross-chain swap routes across Portaldot V3 and external EVM chains.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
