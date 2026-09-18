import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { getCurrentOrganization } from "@/lib/tenant";
import "./globals.css";

// Sans for everything conversational (names, comments, descriptions);
// mono for everything measured (timecodes, file sizes, dates, status
// codes) — see the Stage 8 design plan in SETUP.md. Loaded as CSS
// variables, referenced from tailwind.config.ts's fontFamily.
const sans = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });

export const metadata: Metadata = {
  title: "Reel",
  description: "Client media CRM & review platform",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Org-branded theming (Section 9): resolved once per request and applied
  // as CSS custom properties consumed by tailwind.config.ts's brand colors.
  // Falls back to defaults on the base domain (no org context) or on a
  // resolution error, so a bad org lookup never takes the whole shell down.
  let brandStyle: React.CSSProperties = {};
  try {
    const org = await getCurrentOrganization();
    if (org) {
      brandStyle = {
        // @ts-expect-error -- CSS custom properties aren't in the CSSProperties type
        "--org-primary-color": org.primaryColor ?? undefined,
        "--org-secondary-color": org.secondaryColor ?? undefined,
      };
    }
  } catch {
    // Unresolvable org (bad subdomain) — let the page-level error boundary
    // handle it; the shell itself should still render.
  }

  return (
    <html lang="en" className={`dark ${sans.variable} ${mono.variable}`}>
      <body style={brandStyle} className="min-h-screen bg-neutral-950 font-sans text-neutral-100">
        {children}
      </body>
    </html>
  );
}
