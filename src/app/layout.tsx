import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { Navbar } from '@/components/layout/Navbar';

export const metadata: Metadata = {
  title: 'JIT CodeArena - Jansons Institute of Technology Assessment Platform',
  description:
    'Institutional Python coding assessment and evaluation platform for Jansons Institute of Technology students.',
  icons: {
    icon: '/jit-logo.png',
    apple: '/jit-logo.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#070A12] text-slate-100 min-h-screen antialiased flex flex-col font-sans selection:bg-indigo-500/30 selection:text-indigo-200 relative">
        {/* Ambient background lighting */}
        <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
          <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-b from-indigo-600/10 via-violet-600/5 to-transparent blur-[140px] rounded-full" />
          <div className="absolute top-1/2 -left-60 w-[600px] h-[600px] bg-blue-600/5 blur-[160px] rounded-full" />
          <div className="absolute -bottom-40 -right-60 w-[600px] h-[600px] bg-indigo-600/5 blur-[160px] rounded-full" />
        </div>
        <AuthProvider>
          <Navbar>{children}</Navbar>
        </AuthProvider>
      </body>
    </html>
  );
}
