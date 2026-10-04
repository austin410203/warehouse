import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'WareTrack · Warehouse Digital Twin',
  description: 'Interactive inbound/outbound warehouse digital twin prototype (Next.js + React Three Fiber).',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
