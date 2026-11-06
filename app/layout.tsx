import type { Metadata } from "next";
import "./globals.css";
import "lenis/dist/lenis.css";
import { SmoothScroll } from "@/components/SmoothScroll";

export const metadata: Metadata = {
  title: "Hypersep - AI-first cross-chain trade aggregator",
  description:
    "Describe a trade. Hypersep reads every pool and bridge across Portaldot V3 and EVM chains, prices the whole path, and settles it.",
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
