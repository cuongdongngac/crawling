import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import PwaRegister from "@/components/PwaRegister";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "VPHA M&E – Quét hashtag",
  description:
    "Hệ thống giám sát M&E: quét hashtag/từ khóa trên mạng xã hội, theo dõi bài tương tác cao.",
  applicationName: "VPHA Quét",
  // Next tự gắn <link rel="manifest"> từ app/manifest.ts.
  appleWebApp: {
    capable: true,
    title: "VPHA Quét",
    statusBarStyle: "default",
  },
  icons: {
    // favicon.ico do Next tự gắn từ app/favicon.ico
    icon: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#1c1917",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="vi"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
