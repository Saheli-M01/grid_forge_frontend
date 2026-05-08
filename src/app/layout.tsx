import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: "GridWar — Claim Your Territory",
    template: "%s | GridWar",
  },
  description:
    "A real-time multiplayer grid where you fight for territory. Click cells to claim them, build streaks, use bombs, and dominate the map — all live with other players.",
  keywords: ["gridwar", "real-time game", "multiplayer", "territory", "websocket", "grid"],
  authors: [{ name: "GridWar" }],
  creator: "GridWar",

  icons: {
    icon: [{ url: "/logo.png", type: "image/png" }],
    apple: "/logo.png",
    shortcut: "/logo.png",
  },

  openGraph: {
    type: "website",
    url: APP_URL,
    title: "GridWar — Claim Your Territory",
    description:
      "Real-time multiplayer territory game. Claim cells, build streaks, drop bombs. Fight for the grid — live.",
    siteName: "GridWar",
    images: [{ url: "/brand.png", width: 854, height: 180, alt: "GridWar" }],
  },

  twitter: {
    card: "summary_large_image",
    title: "GridWar — Claim Your Territory",
    description: "Real-time multiplayer territory game. Claim cells, build streaks, drop bombs.",
    images: ["/brand.png"],
  },

  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#030712",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-dvh antialiased`}
    >
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes, viewport-fit=cover" />
      </head>
      <body className="h-dvh flex flex-col bg-gray-950 text-white overflow-hidden">
        {children}
      </body>
    </html>
  );
}