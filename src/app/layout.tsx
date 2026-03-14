import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import TopNav from "@/components/top-nav";
import SiteFooter from "@/components/site-footer";
import BackgroundParallax from "@/components/background-parallax";
import { getAuthCookieName, verifySessionToken } from "@/lib/auth";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NaijaProperty Hub | Land and House Sales",
  description: "Browse and publish verified land and house listings across Nigeria.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const token = cookieStore.get(getAuthCookieName())?.value;
  const sessionUser = token ? verifySessionToken(token) : null;

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} flex min-h-screen flex-col antialiased`}
      >
        <BackgroundParallax />
        <div className="relative z-10 flex min-h-screen flex-col">
          <TopNav initialUser={sessionUser} />
          <div className="flex-1">{children}</div>
          <SiteFooter initialUser={sessionUser} />
        </div>
      </body>
    </html>
  );
}
