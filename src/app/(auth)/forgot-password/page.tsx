import { ForgotForm } from '@/components/ForgotForm';
export const metadata = { title: 'Reset your password' };
export default function Page() {
  return (
    <div className="mx-auto mt-24 w-full max-w-[420px]">
      <h1 className="text-[28px]">Reset your password</h1>
      <p className="mb-6 mt-2 text-[14px] text-muted">Enter your email and we will send you a link.</p>
      <ForgotForm />
    </div>
  );
}
