import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Reading Radar | Cedar Grove Elementary",
  description: "A calm early-warning system for student reading progress.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
