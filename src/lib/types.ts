export type Role = 'customer' | 'admin' | 'super_admin';

export type Permission = 'products' | 'orders' | 'reviews' | 'customers' | 'newsletter' | 'content';
export const ALL_PERMISSIONS: { id: Permission; label: string }[] = [
  { id: 'products', label: 'Products & inventory' },
  { id: 'orders', label: 'Orders, returns & refunds' },
  { id: 'reviews', label: 'Review moderation' },
  { id: 'customers', label: 'Customers & messages' },
  { id: 'newsletter', label: 'Newsletter' },
  { id: 'content', label: 'Website content & pages' },
];

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  role: Role;
  is_active: boolean;
  permissions: Permission[];
  marketing_opt_in: boolean;
  created_at: string;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  description: string | null;
  category_id: string | null;
  price_cents: number;
  sale_price_cents: number | null;
  currency: string;
  stock_quantity: number;
  is_active: boolean;
  is_featured: boolean;
  is_bestseller: boolean;
  tags: string[];
  skin_types: string[];
  concerns: string[];
  goals: string[];
  routine_step: string | null;
  routine_time: string | null;
  is_vegan: boolean;
  is_fragrance_free: boolean;
  rating_avg: number;
  rating_count: number;
  categories?: { name: string; slug: string } | null;
  product_images?: { url: string; alt: string | null; sort_order: number }[];
}

export interface CartLine {
  productId: string;
  variantId?: string | null;
  quantity: number;
}

export const ORDER_STATUSES = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'] as const;
