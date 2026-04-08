import type { Metadata } from "next";
import "./globals.css";
import ConsoleEasterEgg from "@/components/console-easter-egg";

export const metadata: Metadata = {
  title: "JobHunt AI",
  description: "AI-powered job search automation",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="h-full antialiased">
        <ConsoleEasterEgg />
        {children}
      </body>
    </html>
  );
}
