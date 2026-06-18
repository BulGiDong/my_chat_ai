import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "윤호 AI",
    short_name: "윤호AI",
    description: "말투 기반 개인 채팅 앱",
    start_url: "/",
    display: "standalone",
    background_color: "#9bbbd4",
    theme_color: "#FEE500",
    lang: "ko-KR",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}