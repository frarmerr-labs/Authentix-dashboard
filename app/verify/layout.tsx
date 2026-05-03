import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Certificate Verification | Authentix',
  description: 'Verify the authenticity of a digital certificate issued through Authentix.',
  robots: { index: false, follow: false },
};

export default function VerifyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
