import type { Metadata } from "next";
import { Caveat, IBM_Plex_Mono, Noto_Sans_TC, Source_Serif_4 } from "next/font/google";
import "./globals.css";

const caveat = Caveat({
  subsets: ["latin"],
  weight: ["600"],
  variable: "--font-caveat",
});

const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  weight: ["500", "600"],
  variable: "--font-source-serif",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex-mono",
});

const notoSansTC = Noto_Sans_TC({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-noto-sans-tc",
});

export const metadata: Metadata = {
  title: "ajar — 每天，為英文留一道縫",
  description: "Keep your English ajar.",
};

/** 在 hydration 前套用主題，避免深色使用者看到閃白 */
const themeInit = `(function(){try{var t=localStorage.getItem("ajar-theme");if(!t&&matchMedia("(prefers-color-scheme: dark)").matches)t="dark";if(t)document.documentElement.dataset.theme=t}catch(e){}})()`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="zh-Hant"
      suppressHydrationWarning
      className={`${caveat.variable} ${sourceSerif.variable} ${plexMono.variable} ${notoSansTC.variable}`}
    >
      <body className="min-h-dvh bg-desk text-ink">
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
        {children}
      </body>
    </html>
  );
}
