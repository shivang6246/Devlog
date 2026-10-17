import { Bodoni_Moda, Inter, JetBrains_Mono } from 'next/font/google';
import Link from 'next/link';
import 'highlight.js/styles/github-dark.css';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import Navbar from '@/components/Navbar';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const display = Bodoni_Moda({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  variable: '--font-display-serif',
  display: 'swap',
});
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono-code', display: 'swap' });

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  title: { default: 'DevLog — stories written in code', template: '%s · DevLog' },
  description: 'Write, publish and read developer articles with Markdown and syntax highlighting.',
};

export const viewport = { themeColor: '#050506' };

// Runs before first paint so the saved theme never flashes. Default: dark (the site's signature look).
const themeScript = `(function(){try{var t=localStorage.getItem('devlog-theme');if(t!=='light'&&t!=='dark')t='dark';var d=document.documentElement;d.dataset.theme=t;d.style.colorScheme=t;var m=document.querySelector('meta[name="theme-color"]');if(m)m.content=t==='light'?'#fafaf8':'#050506';}catch(e){}})();`;

function Footer() {
  return (
    <footer className="relative z-10 mt-24 overflow-hidden border-t border-white/10">
      <div className="shell flex flex-col gap-6 pt-12 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-slate-500">DevLog — est. 2026</p>
          <p className="mt-3 max-w-xs text-sm text-slate-400">
            A quiet place for developers to write, publish and read well-crafted technical stories.
          </p>
        </div>
        <nav className="flex gap-6 text-[11px] font-medium uppercase tracking-[0.25em] text-slate-400">
          <Link href="/" className="hover:text-white">Stories</Link>
          <Link href="/tags" className="hover:text-white">Topics</Link>
          <Link href="/editor/new" className="hover:text-white">Write</Link>
        </nav>
      </div>
      <p
        aria-hidden="true"
        className="pointer-events-none select-none px-3 pt-6 text-center font-display text-[24vw] leading-[0.78] text-transparent [-webkit-text-stroke:1px_color-mix(in_oklab,var(--n-ink)_12%,transparent)] sm:text-[19vw]"
      >
        DevLog
      </p>
    </footer>
  );
}

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      data-theme="dark"
      suppressHydrationWarning
      className={`${inter.variable} ${display.variable} ${mono.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="grain flex min-h-screen flex-col font-sans">
        <AuthProvider>
          <Navbar />
          <main className="shell relative z-10 flex-1 py-10 sm:py-14">
            {children}
          </main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
