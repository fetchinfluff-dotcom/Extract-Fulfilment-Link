import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: process.env.NEXT_PUBLIC_APP_NAME ?? "ListingForge",
  description: "Turn supplier links into source-supported product listing drafts."
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
