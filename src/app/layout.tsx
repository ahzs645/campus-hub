import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Campus Hub - Digital Signage",
  description: "Modular digital signage for campus displays",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
