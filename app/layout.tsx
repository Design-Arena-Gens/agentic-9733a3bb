import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Conversational Agent",
  description: "A friendly web agent ready to chat with you."
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
