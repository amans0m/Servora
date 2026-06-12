import type { Metadata } from 'next';

import '@/styles/globals.css';
import { Providers } from '@/components/providers';

export const metadata: Metadata = {
  title: 'Servora — Verified IT engineers, dispatched in minutes',
  description:
    'On-demand marketplace connecting businesses with verified IT engineers for network, cloud, security, sys-admin and helpdesk work. Pay on completion.',
  metadataBase: new URL('https://servora.app'),
  openGraph: {
    title: 'Servora — IT services on demand',
    description: 'Qualified IT engineers, dispatched in minutes. Pay only when the job is done.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
