import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  // Komari server replaces these exact strings in dist/index.html
  title: "Komari Monitor",
  description: "A simple server monitor tool.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="color-scheme" content="light dark" />
        <meta name="theme-color" content="#0f172a" media="(prefers-color-scheme: dark)" />
        <meta name="theme-color" content="#e2e8f0" media="(prefers-color-scheme: light)" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var a=localStorage.getItem("appearance")||"system";var d=a==="dark"||(a!=="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches);var r=document.documentElement;r.classList.toggle("dark",d);r.style.colorScheme=d?"dark":"light";r.dataset.blur="on";}catch(e){document.documentElement.classList.add("dark");}})();`,
          }}
        />
      </head>
      <body>
        <div id="theme-background" aria-hidden="true" />
        {children}
      </body>
    </html>
  );
}
