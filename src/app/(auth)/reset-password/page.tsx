import { ResetForm } from '@/components/ResetForm';
export const metadata = { title: 'Choose a new password' };
export default function Page() {
  return (
    <div className="mx-auto mt-24 w-full max-w-[420px]">
      <h1 className="text-[28px]">Choose a new password</h1>
      <p className="mb-6 mt-2 text-[14px] text-muted">Pick something long and unique.</p>
      <ResetForm />
    </div>
  );
}
