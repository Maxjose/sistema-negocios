import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Monii App",
    short_name: "Monii",
    description:
      "Control de ventas, productos, inventario y ganancias para pequeños negocios.",
    start_url: "/login",
    scope: "/",
    display: "standalone",
    background_color: "#f4f7f5",
    theme_color: "#176b4d",
    categories: ["business", "finance", "productivity"],
    lang: "es",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
