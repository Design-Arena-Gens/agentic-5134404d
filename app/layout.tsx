export const metadata = {
  title: "AI Trading & Chart Agent",
  description: "Automatic S/R levels, reactions, and signals",
};

import "./globals.css";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
