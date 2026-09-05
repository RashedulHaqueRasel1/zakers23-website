import type { Metadata } from "next";
import { CompareFloatingBar } from "@/src/components/CompareFloatingBar";
import LenisProvider from "@/src/components/LenisProvider";
import { InquiryProvider } from "@/src/features/inquiry/components/inquiry-provider";
import "mapbox-gl/dist/mapbox-gl.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Miami New Development | Pre-Construction Condos & Luxury New Construction",
  description:
    "Explore Miami's best pre-construction condos and new developments. Market intelligence, floor plans, pricing, and private presentations from a top-ranked Miami luxury real estate advisor."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <LenisProvider>
          <InquiryProvider>
            {children}
          </InquiryProvider>
        </LenisProvider>
        <CompareFloatingBar />
      </body>
    </html>
  );
}
