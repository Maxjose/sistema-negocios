import type { Metadata, Viewport } from "next";

import { ServiceWorkerRegister } from "@/components/pwa/service-worker-register";
import { AppLaunchScreen } from "@/components/pwa/app-launch-screen";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Monii App",
    template: "%s | Monii App",
  },
  description:
    "Control de ventas, productos, inventario y ganancias para pequeños negocios.",
  applicationName: "Monii App",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Monii App",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icons/icon-32.png?v=3", sizes: "32x32", type: "image/png", media: "(prefers-color-scheme: light)" },
      { url: "/icons/icon-dark-32.png?v=3", sizes: "32x32", type: "image/png", media: "(prefers-color-scheme: dark)" },
    ],
    apple: [
      {
        url: "/icons/apple-touch-icon.png?v=3",
        sizes: "180x180",
        type: "image/png",
      },
      {
        url: "/icons/apple-touch-icon-dark.png?v=3",
        sizes: "180x180",
        type: "image/png",
        media: "(prefers-color-scheme: dark)",
      },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#005bf2" },
    { media: "(prefers-color-scheme: dark)", color: "#202126" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `try{const t=localStorage.getItem("theme");document.documentElement.classList.toggle("dark",t==="dark"||(!t&&matchMedia("(prefers-color-scheme: dark)").matches))}catch{}` }} />
      </head>
      <body className="flex min-h-full flex-col">
        <AppLaunchScreen />
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
