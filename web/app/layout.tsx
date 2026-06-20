import type { Metadata } from "next";
import { Big_Shoulders, Courier_Prime, Public_Sans } from "next/font/google";
import "./globals.css";

const displayFont = Big_Shoulders({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["600", "800"],
});

const monoFont = Courier_Prime({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
});

const bodyFont = Public_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

export const metadata: Metadata = {
  title: "uWarden",
  description: "The AI accountability extension that roasts your distractions.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${displayFont.variable} ${monoFont.variable} ${bodyFont.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
