import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "webgl-scroll Next basic"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
