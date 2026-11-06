import type { Metadata } from "next";
import "./globals.css";
import "lenis/dist/lenis.css";
import { SmoothScroll } from "@/components/SmoothScroll";

export const metadata: Metadata = {
  title: "Hypersep - AI-first cross-chain trade aggregator",
  description:
    "Compare MiniAMM pools on Portaldot V3 and Sepolia plus bridge paths, ranked by output, fees, gas, price impact and ETA.",
  icons: {
    icon: "/assets/icon.png",
    shortcut: "/assets/icon.png",
    apple: "/assets/icon.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SmoothScroll />
        {children}
      </body>
    </html>
  );
}
