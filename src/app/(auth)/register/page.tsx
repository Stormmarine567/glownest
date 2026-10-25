import type { Metadata } from 'next';
import { UserPlus } from 'lucide-react';
import { AuthForm } from '@/components/AuthForm';

export const metadata: Metadata = { title: 'Create your account' };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <>
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-navy text-white"><UserPlus className="h-6 w-6" strokeWidth={1.7} /></div>
      <h1 className="mt-5 text-[30px]">Create your account</h1>
      <p className="mb-9 mt-2 text-[14px] text-muted">Sign up to get started</p>
      <AuthForm mode="register" next={next} />
    </>
  );
}
