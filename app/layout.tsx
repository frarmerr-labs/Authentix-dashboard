import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Authentix - Certificate Generation & Verification Platform",
  description: "Enterprise certificate generation, management, and verification platform",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-32x32.svg", type: "image/svg+xml", sizes: "32x32" },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#3ECF8E",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        {/* Unregister any stale service workers from other projects on the same origin */}
        <script
          dangerouslySetInnerHTML={{
            __html: `if('serviceWorker' in navigator){navigator.serviceWorker.getRegistrations().then(function(regs){regs.forEach(function(r){r.unregister()})})}`
          }}
        />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        {children}
        <Toaster richColors theme="dark" position="bottom-right" />
      </body>
    </html>
  );
}
