import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Certificate Verification | Authentix',
  description: 'Verify the authenticity of a certificate issued through Authentix',
};

export default function VerifyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
