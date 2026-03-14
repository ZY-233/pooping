import type { Metadata, Viewport } from "next";

import { AuthProvider } from "@/components/auth/auth-provider";
import { ToastProvider } from "@/components/feedback/toast-provider";
import { PwaRegister } from "@/components/pwa/pwa-register";
import { getSiteUrl } from "@/lib/env";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: "今日顺顺",
    template: "%s | 今日顺顺",
  },
  description: "轻松记录每一天（非医疗用途）",
  applicationName: "今日顺顺",
  manifest: "/manifest.webmanifest",
  keywords: ["今日顺顺", "排便记录", "日常记录", "非医疗", "噗友"],
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/icons/icon-512.png", type: "image/png", sizes: "512x512" },
      { url: "/icons/icon-192.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
  },
  openGraph: {
    title: "今日顺顺",
    description: "轻松记录每一天（非医疗用途）",
    type: "website",
    locale: "zh_CN",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: "#d58b57",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">
        <AuthProvider>
          <ToastProvider>
            <PwaRegister />
            {children}
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
