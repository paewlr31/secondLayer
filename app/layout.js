import { Fraunces, Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin", "latin-ext"],
  variable: "--font-sans",
});

const fraunces = Fraunces({
  subsets: ["latin", "latin-ext"],
  variable: "--font-serif",
});

export const metadata = {
  title: "Druga warstwa",
  description: "Uproszczenie tekstu, w którym każde zdanie wskazuje źródło.",
};

export const viewport = {
  themeColor: "#1b1914",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="pl">
      <body className={`${outfit.className} ${outfit.variable} ${fraunces.variable}`}>{children}</body>
    </html>
  );
}
