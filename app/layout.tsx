import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.JARVIS_SITE_ORIGIN || "http://localhost:3000"),
  title: {
    default: "Morrow | You say it. Your Mac gets to work.",
    template: "%s | Morrow",
  },
  description:
    "Meet Morrow, a voice-first Mac workspace for files and actions in supported apps. Connect your ChatGPT account and download Morrow for Mac.",
  applicationName: "Morrow",
  appleWebApp: { capable: true, title: "Morrow" },
  openGraph: {
    title: "Morrow | You say it. Your Mac gets to work.",
    description: "Your voice, your files, and work ready to review. Download Morrow for Mac.",
    type: "website",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FFFFFF" },
    { media: "(prefers-color-scheme: dark)", color: "#FFFFFF" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
