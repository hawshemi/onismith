import "./globals.css";
import type { Metadata, Viewport } from "next";
import AppShell from "@/components/app-shell";
import { I18nProvider } from "@/lib/i18n/i18n-context";
import { SaveSessionProvider } from "@/lib/save-session/save-session-context";

export const metadata: Metadata = {
  title: "Onismith",
  applicationName: "Onismith",
  description: "Web-based Oxygen Not Included save editor",
  manifest: "/brand/site.webmanifest",
  icons: {
    icon: [
      { url: "/brand/favicon-96x96.png", type: "image/png", sizes: "96x96" },
      { url: "/brand/favicon.svg", type: "image/svg+xml", sizes: "any" },
    ],
    shortcut: "/favicon.ico",
    apple: { url: "/brand/apple-touch-icon.png", sizes: "180x180" },
  },
  appleWebApp: { title: "Onismith" },
};

export const viewport: Viewport = {
  themeColor: "#11171b",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        <I18nProvider>
          <SaveSessionProvider>
            <AppShell>{children}</AppShell>
          </SaveSessionProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
