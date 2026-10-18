import "./globals.css";
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "StudyFlow",
  description: "Exam study management: timetable, syllabus, topic todos and progress.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "StudyFlow" },
};
export const viewport: Viewport = { themeColor: "#6366f1", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
