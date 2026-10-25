import { CartView } from '@/components/CartView';
export const metadata = { title: 'Your Cart' };
export default function CartPage() {
  return (
    <section className="container py-10 md:py-[56px]">
      <h1 className="mb-8 text-[32px] md:text-[40px]">Your Cart</h1>
      <CartView />
    </section>
  );
}
