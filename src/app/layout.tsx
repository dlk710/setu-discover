import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SETU - DISCOVER",
  description: "Manual opportunity discovery portal for SETU profile building.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
