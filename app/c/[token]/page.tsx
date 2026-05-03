import { redirect } from 'next/navigation';

// Short URL alias: /c/TOKEN → /verify/TOKEN
// Use this in QR codes and social sharing for cleaner URLs.
// e.g. digicertificates.in/c/so29786l6keuhlcn8dpt48
export default function ShortCertLink({ params }: { params: { token: string } }) {
  redirect(`/verify/${params.token}`);
}
