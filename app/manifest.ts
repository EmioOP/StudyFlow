import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "StudyFlow",
    short_name: "StudyFlow",
    description: "Exam study manager: timetable, syllabus, topic todos and progress.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f8fafc",
    theme_color: "#6366f1",
    categories: ["education", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Study timer", url: "/timer", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Exam timetable", url: "/exams", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
