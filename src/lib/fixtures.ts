// Demo data used ONLY when Supabase is not configured (local preview) — mirrors supabase/migrations/0004_seed.sql.
import type { Product } from '@/lib/types';

const cat = (slug: string, name: string) => ({ slug, name });
const mk = (
  i: number, slug: string, name: string, tagline: string, c: [string, string], price: number,
  o: Partial<Product>,
): Product => ({
  id: `demo-${i}`, slug, name, tagline, description: o.description ?? null, category_id: `cat-${c[0]}`,
  price_cents: price, sale_price_cents: null, currency: 'USD', stock_quantity: 100, is_active: true,
  is_featured: false, is_bestseller: false, tags: [], skin_types: [], concerns: [], goals: [],
  routine_step: null, routine_time: null, is_vegan: true, is_fragrance_free: false,
  rating_avg: 4.9, rating_count: 1000, categories: cat(c[0], c[1]),
  product_images: [{ url: `/images/products/${slug}.svg`, alt: name, sort_order: 0 }], ...o,
});

export const FIXTURE_CATEGORIES = [
  { id: 'cat-serums', slug: 'serums', name: 'Serums' },
  { id: 'cat-cleansers', slug: 'cleansers', name: 'Cleansers' },
  { id: 'cat-moisturizers', slug: 'moisturizers', name: 'Moisturizers' },
  { id: 'cat-sun-care', slug: 'sun-care', name: 'Sun Care' },
];

export const FIXTURE_PRODUCTS: Product[] = [
  mk(1, 'hyaluronic-acid-serum', 'Hyaluronic Acid Serum', 'Intense Hydration', ['serums', 'Serums'], 4400, { is_featured: true, rating_count: 1100, skin_types: ['dry','normal','combination','sensitive'], concerns: ['dehydration','dullness'], goals: ['hydrate'], routine_step: 'treat', routine_time: 'both', description: 'Formulated with clean, clinically-proven ingredients, our hyaluronic acid serum is designed to deliver visible results. Suitable for all skin types and dermatologist-tested.' }),
  mk(2, 'vitamin-c-serum', 'Vitamin C Serum', 'Antioxidant Protection', ['serums', 'Serums'], 4600, { is_featured: true, rating_count: 1200, skin_types: ['normal','combination','oily'], concerns: ['dullness','dark_spots','aging'], goals: ['brighten','protect'], routine_step: 'treat', routine_time: 'am', description: 'A brightening antioxidant serum that helps defend skin against daily environmental stress while evening out tone.' }),
  mk(3, 'glow-serum', 'Glow Serum', 'Brightening & Radiance', ['serums', 'Serums'], 4800, { is_featured: true, rating_count: 1200, skin_types: ['normal','dry','combination'], concerns: ['dullness','dark_spots'], goals: ['brighten'], routine_step: 'treat', routine_time: 'both', description: 'A lightweight radiance serum that boosts luminosity and refines the look of uneven skin tone.' }),
  mk(4, 'hydra-moisturizer', 'Hydra Moisturizer', 'Deep Hydration', ['moisturizers', 'Moisturizers'], 4200, { is_featured: true, rating_count: 1100, skin_types: ['dry','normal','sensitive','combination'], concerns: ['dehydration'], goals: ['hydrate'], routine_step: 'moisturize', routine_time: 'both', description: 'A cushiony daily moisturizer that seals in deep, all-day hydration without heaviness.' }),
  mk(5, 'daily-cleanser', 'Daily Cleanser', 'Gentle & Hydrating', ['cleansers', 'Cleansers'], 2800, { is_bestseller: true, rating_avg: 4.8, rating_count: 856, skin_types: ['dry','normal','sensitive','combination','oily'], concerns: ['dehydration','redness'], goals: ['hydrate','clear'], routine_step: 'cleanse', routine_time: 'both', description: 'A gentle gel-cream cleanser that removes impurities while leaving skin soft and balanced.' }),
  mk(6, 'niacinamide-10-serum', 'Niacinamide 10% Serum', 'Pore Minimizer', ['serums', 'Serums'], 3800, { is_bestseller: true, rating_count: 982, skin_types: ['oily','combination','normal'], concerns: ['acne','redness'], goals: ['clear'], routine_step: 'treat', routine_time: 'both', description: 'A high-strength niacinamide serum that visibly minimizes pores and balances excess oil.' }),
  mk(7, 'sun-shield-spf-50', 'Sun Shield SPF 50', 'Broad Spectrum', ['sun-care', 'Sun Care'], 3200, { is_bestseller: true, rating_avg: 4.7, rating_count: 654, skin_types: ['dry','normal','combination','oily','sensitive'], concerns: ['aging','dark_spots'], goals: ['protect'], routine_step: 'protect', routine_time: 'am', description: 'A silky broad-spectrum SPF 50 that protects against UVA/UVB with no white cast.' }),
  mk(8, 'collagen-cream', 'Collagen Cream', 'Anti-Aging Formula', ['moisturizers', 'Moisturizers'], 4200, { is_bestseller: true, rating_avg: 4.8, rating_count: 876, skin_types: ['dry','normal','combination'], concerns: ['aging'], goals: ['firm','hydrate'], routine_step: 'moisturize', routine_time: 'pm', description: 'A rich night cream that supports firmness and visibly softens the look of fine lines.' }),
];

export const FIXTURE_SETTINGS = {
  business: {
    name: 'GLOWNEST', tagline: 'Skincare', email: 'hello@glownest.com', phone: '+33 1 45 67 89 00',
    address_lines: ['42 Rue de la Beauté', '75008 Paris, France'], map_url: '',
    hours: ['Mon — Fri: 9am – 6pm CET', 'Sat: 10am – 4pm CET'], support_note: '',
  },
  branding: { logo_url: null as string | null, favicon_url: null as string | null },
  store: { currency: 'USD', tax_percent: 0, maintenance_mode: false, newsletter_discount: '10% off your first order' },
  seo: { title: 'GLOWNEST Skincare', description: 'Science-backed skincare solutions designed to reveal your natural glow.', analytics_id: '' },
};

export const FIXTURE_SOCIAL = [
  { id: '1', platform: 'instagram', url: 'https://instagram.com/' },
  { id: '2', platform: 'facebook', url: 'https://facebook.com/' },
  { id: '3', platform: 'tiktok', url: 'https://tiktok.com/' },
  { id: '4', platform: 'pinterest', url: 'https://pinterest.com/' },
];

export const FIXTURE_FAQS = [
  { id: '1', category: 'Products', question: 'Are your products suitable for sensitive skin?', answer: 'Yes. Our formulas are dermatologist-tested and free from parabens, sulfates and silicones. As with any new product we recommend a patch test first.' },
  { id: '2', category: 'Products', question: 'Are your products cruelty-free?', answer: 'Always. We never test on animals and are certified by Leaping Bunny.' },
  { id: '3', category: 'Products', question: 'How long will it take to see results?', answer: 'Hydration improves within days; brightening and firming typically take 4–8 weeks of consistent use.' },
  { id: '4', category: 'Products', question: 'Where are your products made?', answer: 'Our formulas are developed in Paris and produced with carefully selected, responsibly sourced ingredients.' },
  { id: '5', category: 'Orders & Shipping', question: 'How can I track my order?', answer: 'Once shipped you will receive an email and dashboard notification with your tracking number.' },
  { id: '6', category: 'Orders & Shipping', question: 'Can I cancel my order?', answer: 'You can request a cancellation from your dashboard before it ships.' },
  { id: '7', category: 'Returns', question: 'What is your return policy?', answer: 'You can request a return within 30 days of delivery. See our Returns page for details.' },
];

export const FIXTURE_BLOG = [
  { id: '1', slug: 'ultimate-guide-to-building-a-skincare-routine', title: 'The Ultimate Guide to Building a Skincare Routine', excerpt: 'Not sure where to start? We break down the essentials — from cleansing to SPF — so you can build a routine that actually works for your skin type.', category: 'SKINCARE TIPS', cover_url: '/images/routine-flatlay.svg', read_minutes: 5, is_featured: true, published_at: '2024-12-15', body: null as string | null },
  { id: '2', slug: 'why-vitamin-c-should-be-in-your-routine', title: 'Why Vitamin C Should Be in Your Routine', excerpt: "Discover the science behind this powerhouse ingredient and how it can transform your skin's brightness and...", category: 'INGREDIENTS', cover_url: '/images/treatment-model.svg', read_minutes: 4, is_featured: false, published_at: '2024-12-10', body: null },
  { id: '3', slug: 'how-to-layer-your-skincare-products', title: 'How to Layer Your Skincare Products', excerpt: 'The order you apply your products matters. Learn the right sequence for maximum absorption and results.', category: 'SKINCARE TIPS', cover_url: '/images/about-botanical.svg', read_minutes: 3, is_featured: false, published_at: '2024-12-05', body: null },
  { id: '4', slug: 'understanding-your-skin-type', title: 'Understanding Your Skin Type', excerpt: 'Oily, dry, combination, or sensitive? Knowing your skin type is the first step to finding the right products.', category: 'EDUCATION', cover_url: '/images/hero-model.svg', read_minutes: 6, is_featured: false, published_at: '2024-11-28', body: null },
];

export const FIXTURE_JOBS = [
  { id: '1', title: 'Customer Care Specialist', department: 'Support', location: 'Remote', employment_type: 'Full-time', description: 'Help our customers find the right routine and resolve order questions with warmth and speed.', how_to_apply: 'Email careers@glownest.com with your CV.' },
  { id: '2', title: 'Content & Community Lead', department: 'Marketing', location: 'Paris / Remote', employment_type: 'Full-time', description: 'Own our editorial voice across the blog, newsletter and social channels.', how_to_apply: 'Email careers@glownest.com with your CV and portfolio.' },
];
