export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <main id="main" className="flex min-h-screen flex-col items-center bg-white px-5 pb-16 pt-0 md:pt-0">{children}</main>;
}
