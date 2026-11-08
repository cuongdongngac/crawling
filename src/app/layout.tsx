import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import PwaRegister from "@/components/PwaRegister";
import { LangProvider } from "@/lib/i18n/client";
import { getLang } from "@/lib/i18n/server";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const en = (await getLang()) === "en";
  return {
    title: en ? "VPHA M&E – Hashtag monitoring" : "VPHA M&E – Quét hashtag",
    description: en
      ? "M&E monitoring system: scans hashtags/keywords on social media and tracks high-engagement posts."
      : "Hệ thống giám sát M&E: quét hashtag/từ khóa trên mạng xã hội, theo dõi bài tương tác cao.",
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
}

export const viewport: Viewport = {
  themeColor: "#1c1917",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const lang = await getLang();
  return (
    <html
      lang={lang}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <LangProvider lang={lang}>{children}</LangProvider>
        <PwaRegister />
      </body>
    </html>
  );
}
