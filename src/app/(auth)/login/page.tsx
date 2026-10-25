import type { Metadata } from 'next';
import { LogIn } from 'lucide-react';
import { AuthForm } from '@/components/AuthForm';

export const metadata: Metadata = { title: 'Log in' };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  return (
    <div className="flex w-full flex-col items-center pt-0">
      <div className="mt-0 flex h-14 w-14 items-center justify-center rounded-2xl bg-navy text-white"><LogIn className="h-6 w-6" strokeWidth={1.7} /></div>
      <h1 className="mt-5 text-[30px]">Welcome back</h1>
      <p className="mb-9 mt-2 text-[14px] text-muted">Log in to your GLOWNEST account</p>
      {error && <p role="alert" className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-[13px] text-red-700">We could not sign you in. Please try again.</p>}
      <AuthForm mode="login" next={next} />
    </div>
  );
}
