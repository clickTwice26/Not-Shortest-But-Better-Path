import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import InitColorSchemeScript from '@mui/material/InitColorSchemeScript';
import Providers from './providers';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });

export const metadata: Metadata = {
  title: 'Poth — cheaper ways across Dhaka',
  description:
    'Google Maps tells you the fastest way. Poth tells you that CNG to Farmgate then metro saves you ৳270 and costs you 9 minutes.',
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F9FBF9' },
    { media: '(prefers-color-scheme: dark)', color: '#101413' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <body style={{ margin: 0 }}>
        <InitColorSchemeScript attribute="class" defaultMode="system" />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
