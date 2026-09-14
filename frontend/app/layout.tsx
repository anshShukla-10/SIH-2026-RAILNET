import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

import { QueryProvider } from "@/components/providers/query-provider";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/sidebar";
import { Separator } from "@/components/ui/separator";
import { HealthIndicator } from "@/components/layout/health-indicator";

const saans = localFont({
  src: [
    {
      path: "../public/fonts/saans-font-family/Saans-TRIAL-Light.otf",
      weight: "300",
      style: "normal",
    },
    {
      path: "../public/fonts/saans-font-family/Saans-TRIAL-LightItalic.otf",
      weight: "300",
      style: "italic",
    },
    {
      path: "../public/fonts/saans-font-family/Saans-TRIAL-Regular.otf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../public/fonts/saans-font-family/Saans-TRIAL-RegularItalic.otf",
      weight: "400",
      style: "italic",
    },
    {
      path: "../public/fonts/saans-font-family/Saans-TRIAL-Medium.otf",
      weight: "500",
      style: "normal",
    },
    {
      path: "../public/fonts/saans-font-family/Saans-TRIAL-MediumItalic.otf",
      weight: "500",
      style: "italic",
    },
    {
      path: "../public/fonts/saans-font-family/Saans-TRIAL-SemiBold.otf",
      weight: "600",
      style: "normal",
    },
    {
      path: "../public/fonts/saans-font-family/Saans-TRIAL-SemiBoldItalic.otf",
      weight: "600",
      style: "italic",
    },
    {
      path: "../public/fonts/saans-font-family/Saans-TRIAL-Bold.otf",
      weight: "700",
      style: "normal",
    },
    {
      path: "../public/fonts/saans-font-family/Saans-TRIAL-BoldItalic.otf",
      weight: "700",
      style: "italic",
    },
    {
      path: "../public/fonts/saans-font-family/Saans-TRIAL-Heavy.otf",
      weight: "800",
      style: "normal",
    },
    {
      path: "../public/fonts/saans-font-family/Saans-TRIAL-HeavyItalic.otf",
      weight: "800",
      style: "italic",
    },
  ],
  variable: "--font-sans",
  display: "swap",
});

const saansMono = localFont({
  src: [
    {
      path: "../public/fonts/saans-font-family/SaansMono-TRIAL-Light.otf",
      weight: "300",
      style: "normal",
    },
    {
      path: "../public/fonts/saans-font-family/SaansMono-TRIAL-LightItalic.otf",
      weight: "300",
      style: "italic",
    },
    {
      path: "../public/fonts/saans-font-family/SaansMono-TRIAL-Regular.otf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../public/fonts/saans-font-family/SaansMono-TRIAL-RegularItalic.otf",
      weight: "400",
      style: "italic",
    },
    {
      path: "../public/fonts/saans-font-family/SaansMono-TRIAL-Medium.otf",
      weight: "500",
      style: "normal",
    },
    {
      path: "../public/fonts/saans-font-family/SaansMono-TRIAL-MediumItalic.otf",
      weight: "500",
      style: "italic",
    },
    {
      path: "../public/fonts/saans-font-family/SaansMono-TRIAL-SemiBold.otf",
      weight: "600",
      style: "normal",
    },
    {
      path: "../public/fonts/saans-font-family/SaansMono-TRIAL-SemiBoldItalic.otf",
      weight: "600",
      style: "italic",
    },
    {
      path: "../public/fonts/saans-font-family/SaansMono-TRIAL-Bold.otf",
      weight: "700",
      style: "normal",
    },
    {
      path: "../public/fonts/saans-font-family/SaansMono-TRIAL-BoldItalic.otf",
      weight: "700",
      style: "italic",
    },
    {
      path: "../public/fonts/saans-font-family/SaansMono-TRIAL-Heavy.otf",
      weight: "800",
      style: "normal",
    },
    {
      path: "../public/fonts/saans-font-family/SaansMono-TRIAL-HeavyItalic.otf",
      weight: "800",
      style: "italic",
    },
  ],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "RAILNET-AI — AI-Powered Automatic Block Planning System",
  description:
    "Ministry of Railways · Smart India Hackathon 2026 (SIH26027). Intelligent corridor maintenance block scheduling, conflict detection, and CP-SAT optimization.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${saans.variable} ${saansMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans bg-background text-foreground">
        <QueryProvider>
          <SidebarProvider>
            <AppSidebar />
            <SidebarInset className="flex flex-col min-h-screen bg-muted/20">
              <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between gap-2 border-b bg-background/95 px-4 backdrop-blur supports-backdrop-filter:bg-background/60">
                <div className="flex items-center gap-2">
                  <SidebarTrigger className="-ml-1" />
                  <Separator orientation="vertical" className="mr-2 h-4" />
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="font-semibold text-foreground">RAILNET-AI</span>
                    <span>/</span>
                    <span className="text-xs uppercase tracking-wider font-mono text-muted-foreground/80">
                      SIH26027
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <HealthIndicator showDetails={true} className="hidden sm:flex" />
                </div>
              </header>

              <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">
                {children}
              </main>
            </SidebarInset>
          </SidebarProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
