import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "윤호 AI",
  description: "말투 기반 개인 챗앱",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}