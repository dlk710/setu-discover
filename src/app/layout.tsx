import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Discover",
  description: "Opportunity discovery portal for profile building.",
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
