// Next.js Metadata type for SEO and page metadata configuration
import type { Metadata } from "next";
// Google Fonts Inter loader — loads the Inter font family at build time
import { Inter } from "next/font/google";
// Global CSS including Tailwind directives and custom theme tokens (--play, --shop, etc.)
import "./globals.css";

// Inter font instance — configured with the "latin" character subset to optimize file size
const inter = Inter({ subsets: ["latin"] });

// Exported Next.js App Router metadata object — sets page title & description for SEO
export const metadata: Metadata = {
  title: "Playmate | Play & Shop Sports",
  description:
    "Find sports venues, book courts, and shop for your favorite sports equipment. All in one place.",
};

/**
 * Root layout component — wraps every page in the application.
 * Defines the top-level HTML structure, applies the Inter font to <body>,
 * and renders the nested page content via the `children` prop.
 *
 * @param children - React node(s) representing the current route's page content
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // Root HTML element with English language attribute for accessibility & SEO
    <html lang="en">
      {/* Body applies the Inter font class globally to all text on the site */}
      <body className={inter.className}>{children}</body>
    </html>
  );
}
