import type { Metadata, Viewport } from "next";
import { Cinzel, Cormorant_Garamond, Spectral, Mulish } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const cinzel = Cinzel({
  variable: "--font-cinzel",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  style: ["italic"],
  weight: ["400", "600"],
});

const spectral = Spectral({
  variable: "--font-spectral",
  subsets: ["latin"],
  weight: ["400", "600"],
});

const mulish = Mulish({
  variable: "--font-mulish",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

export const metadata: Metadata = {
  title: "Arcane Athenaeum",
  description:
    "A personal library catalog — every book you own, every book you want.",
};

export const viewport: Viewport = {
  themeColor: "#F4ECCF",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${cinzel.variable} ${cormorant.variable} ${spectral.variable} ${mulish.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* Themed to match the Makers Arcane palette (see app/globals.css's
            @theme block) rather than Clerk's default look. Only the handful
            of variables Clerk exposes are set here; the sign-in/sign-up
            pages layer further per-element overrides for the exact chrome
            (see app/(auth)/sign-in and sign-up). */}
        <ClerkProvider
          appearance={{
            variables: {
              colorPrimary: "#A24634",
              colorPrimaryForeground: "#FDFAE2",
              colorBackground: "#FDFAE2",
              colorForeground: "#2A2118",
              colorMutedForeground: "#6B5F4E",
              colorInput: "#FDFAE2",
              colorInputForeground: "#2A2118",
              colorDanger: "#A24634",
              borderRadius: "8px",
              fontFamily: "var(--font-mulish), system-ui, sans-serif",
            },
          }}
        >
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}
