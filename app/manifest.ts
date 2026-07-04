import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SportyFind 運動約戰網絡",
    short_name: "SportyFind",
    description: "一站式全能運動約戰與社群網絡",
    start_url: "/",
    display: "standalone", // 隱藏瀏覽器網址列，展現原生 App 介面
    background_color: "#020617",
    theme_color: "#020617",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: '512x512',
        type: "image/png",
      },
    ],
  };
}