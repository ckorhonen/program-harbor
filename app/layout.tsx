import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Program Harbor — event program operations",
  description: "An open-source event program desk for CFPs, speakers, reviews, and schedules.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
