import type { Metadata } from "next";
import "@/app/globals.css";

export const metadata: Metadata = {
  title: "Qasir Modern",
  description: "Aplikasi kasir modern untuk UMKM"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
