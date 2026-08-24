import type { Metadata } from "next";
import { Geist, Playfair_Display } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Angel Bakery 天使牌 · 2026 Moon Cake Order Form",
  description:
    "Order handmade mooncakes from Angel Bakery — Shanghai Moon Cake, Salted Egg Yolk Pastry, 3QMuaji, Vegetarian Pastry & Kuih Lapis. 100% handmade, no preservatives.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${playfair.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
