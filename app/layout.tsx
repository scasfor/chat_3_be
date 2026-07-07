import type { Metadata } from "next";
import { AppAntdRegistry } from "./antd-registry";
import "./globals.css";

export const metadata: Metadata = {
  title: "COI Bot Admin",
  description: "Panel de administración y backend del chatbot COI.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>
        <AppAntdRegistry>{children}</AppAntdRegistry>
      </body>
    </html>
  );
}
