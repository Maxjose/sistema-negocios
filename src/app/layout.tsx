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
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      {
        url: "/icons/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#176b4d",
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
