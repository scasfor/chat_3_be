import type { Metadata } from "next";
import { AppAntdRegistry } from "./antd-registry";
import "./globals.css";

export const metadata: Metadata = {
  title: "COI Bot Admin",
  description: "Admin panel and chatbot backend for the COI chatbot.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AppAntdRegistry>{children}</AppAntdRegistry>
      </body>
    </html>
  );
}
