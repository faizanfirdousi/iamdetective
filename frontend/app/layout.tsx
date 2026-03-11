import type { Metadata } from 'next';
import { Inter, IBM_Plex_Mono, Playfair_Display } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });
const mono = IBM_Plex_Mono({ weight: ['400', '600'], subsets: ['latin'], variable: '--font-mono' });
const serif = Playfair_Display({ subsets: ['latin'], variable: '--font-serif' });

export const metadata: Metadata = {
  title: 'I Am Detective | Case Explorer',
  description: 'Dark noir detective criminal case explorer.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} ${mono.variable} ${serif.variable} font-sans min-h-screen bg-zinc-950 text-zinc-100 antialiased`}>
        {/* Top Navbar */}
        <header className="sticky top-0 z-50 w-full border-b border-zinc-800 bg-zinc-950/80 backdrop-blur">
          <div className="container mx-auto flex h-14 items-center px-4">
            <a href="/" className="flex items-center space-x-2">
              <span className="font-serif text-xl font-bold italic tracking-wider text-zinc-100">
                I AM DETECTIVE.
              </span>
            </a>
            <nav className="ml-auto flex items-center space-x-6 text-sm font-medium">
              <a href="/cases" className="transition-colors hover:text-amber-400">All Cases</a>
              <a href="/indian-cases" className="transition-colors text-zinc-500 hover:text-orange-400 flex items-center gap-1">🇮🇳 Indian Cases</a>
              <a href="/ecourts" className="transition-colors text-zinc-500 hover:text-indigo-400 flex items-center gap-1">⚖️ eCourts</a>
            </nav>
          </div>
        </header>

        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
