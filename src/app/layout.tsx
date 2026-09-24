import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { Navbar } from '@/components/layout/Navbar';

export const metadata: Metadata = {
  title: 'JIT CodeArena - Jansons Institute of Technology Assessment Platform',
  description:
    'Institutional Python coding assessment and evaluation platform for Jansons Institute of Technology students.',
  icons: {
    icon: [
      { url: '/jit-logo.png', sizes: 'any', type: 'image/png' },
      { url: '/icon.png', type: 'image/png' },
      { url: '/favicon.ico' },
    ],
    shortcut: '/jit-logo.png',
    apple: '/jit-logo.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/jit-logo.png" type="image/png" sizes="any" />
        <link rel="shortcut icon" href="/jit-logo.png" type="image/png" />
        <link rel="apple-touch-icon" href="/jit-logo.png" />
      </head>
      <body className="bg-[#F7F9FC] text-slate-900 min-h-screen antialiased flex flex-col font-sans selection:bg-indigo-100 selection:text-indigo-800 relative">
        {/* Ambient background lighting */}
        <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
          <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-b from-indigo-100/70 via-blue-50/50 to-transparent blur-[120px] rounded-full" />
          <div className="absolute top-1/3 -left-60 w-[600px] h-[600px] bg-sky-100/50 blur-[140px] rounded-full" />
          <div className="absolute -bottom-40 -right-60 w-[600px] h-[600px] bg-indigo-50/60 blur-[140px] rounded-full" />
        </div>
        <AuthProvider>
          <Navbar>{children}</Navbar>
        </AuthProvider>
      </body>
    </html>
  );
}
