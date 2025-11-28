import type React from "react"
import type { Metadata, Viewport } from "next"
import Script from "next/script"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { RemoveChildFix } from "@/components/remove-child-fix"
import { ErrorDisplay } from "@/components/error-display"
import "./globals.css"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "AutoDoc Mechanic AI",
  description: "AI-powered car diagnostic assistant",
  generator: "v0.app",
  icons: {
    icon: [
      {
        url: "/icon-light-32x32.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon-dark-32x32.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      },
    ],
    apple: "/apple-icon.png",
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#21808D",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ru">
      <body className={`font-sans antialiased`} suppressHydrationWarning>
        <Script
          id="removechild-fix"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              // Apply removeChild fix IMMEDIATELY before React loads
              (function() {
                if (typeof Node === 'undefined') return;
                
                const originalRemoveChild = Node.prototype.removeChild;
                Node.prototype.removeChild = function(child) {
                  try {
                    return originalRemoveChild.call(this, child);
                  } catch (error) {
                    // Suppress ALL NotFoundError for removeChild
                    // This is safe because if the node doesn't exist, we can't remove it anyway
                    if (error && error.name === 'NotFoundError') {
                      return child;
                    }
                    // Also suppress "The object can not be found here" errors
                    if (error && error.message && error.message.includes('can not be found')) {
                      return child;
                    }
                    throw error;
                  }
                };
              })();
            `,
          }}
        />
        <RemoveChildFix />
        {children}
        <ErrorDisplay />
        <Analytics />
      </body>
    </html>
  )
}
