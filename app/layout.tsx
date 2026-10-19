import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./redesign.css";

export const metadata: Metadata = {
  title: "WORLD",
  applicationName: "WORLD",
  description: "언어를 배울수록, 나의 세계가 넓어진다. 영어와 일본어 단어·문장 학습.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/icons/apple-touch-icon.png",
  },
  appleWebApp: { capable: true, title: "WORLD", statusBarStyle: "default" },
};

export const viewport: Viewport = { themeColor: "#007346", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased">{children}</body>
    </html>
  );
}
