import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "StudyFlow", short_name: "StudyFlow", start_url: "/", display: "standalone",
    background_color: "#f8fafc", theme_color: "#6366f1",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
