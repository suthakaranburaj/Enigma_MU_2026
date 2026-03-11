import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { AuthProvider } from "@/contexts/auth-context";
import { Toaster } from "@/components/ui/sonner";
import { Analytics } from "@vercel/analytics/next";

export const metadata: Metadata = {
  title: "FutureOS",
  description: "FutureOS workspace",
  icons: {
    icon: "/logo14.png",
    shortcut: "/logo14.png",
    apple: "/logo14.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="h-full">
      <body
        className="antialiased h-full"
        style={
          {
            "--font-epilogue": "system-ui, -apple-system, Segoe UI, sans-serif",
            "--font-geist-mono": "ui-monospace, SFMono-Regular, Menlo, monospace",
            "--font-playfair": "Georgia, 'Times New Roman', serif",
            "--font-silkscreen": "monospace",
          } as React.CSSProperties
        }
        suppressHydrationWarning
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
        >
          <div className="relative min-h-full">
            <AuthProvider>
              {children}
              <Toaster position="top-center" richColors />
              <Analytics />
            </AuthProvider>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
