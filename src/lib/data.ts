import 'server-only';
import { cache } from 'react';
import defaults from '@/lib/default-content.json';
import { createClient } from '@/lib/supabase/server';
import {
  FIXTURE_BLOG, FIXTURE_CATEGORIES, FIXTURE_FAQS, FIXTURE_JOBS, FIXTURE_PRODUCTS, FIXTURE_SETTINGS, FIXTURE_SOCIAL,
} from '@/lib/fixtures';
import type { Product } from '@/lib/types';

export const hasBackend = () => Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

/* eslint-disable @typescript-eslint/no-explicit-any */
type Any = any;
const D = defaults as { content: Record<string, Any>; pages: Record<string, Any> };

export const getSite = cache(async () => {
  if (!hasBackend()) return { ...FIXTURE_SETTINGS, social: FIXTURE_SOCIAL };
  const sb = await createClient();
  const [{ data: settings }, { data: social }] = await Promise.all([
    sb.from('site_settings').select('key,value'),
    sb.from('social_links').select('id,platform,url').eq('is_active', true).order('sort_order'),
  ]);
  const m = Object.fromEntries((settings ?? []).map((s: Any) => [s.key, s.value]));
  return {
    business: { ...FIXTURE_SETTINGS.business, ...m.business },
    branding: { ...FIXTURE_SETTINGS.branding, ...m.branding },
    store: { ...FIXTURE_SETTINGS.store, ...m.store },
    seo: { ...FIXTURE_SETTINGS.seo, ...m.seo },
    social: (social ?? []) as Any[],
  };
});

/** Editable content block. The database value wins; the bundled default means a missing row never breaks a page. */
export const getContent = cache(async (key: string): Promise<Any> => {
  if (!hasBackend()) return D.content[key];
  const sb = await createClient();
  const { data } = await sb.from('site_content').select('data').eq('key', key).maybeSingle();
  return data?.data ?? D.content[key];
});

export const getPage = cache(async (slug: string) => {
  if (hasBackend()) {
    const sb = await createClient();
    const { data } = await sb.from('pages').select('slug,title,summary,body,updated_at').eq('slug', slug).eq('is_published', true).maybeSingle();
    if (data) return data as Any;
    return null;
  }
  const p = D.pages[slug];
  return p ? { slug, ...p } : null;
});

const PRODUCT_SELECT = '*, categories(name,slug), product_images(url,alt,sort_order)';

export const getCategories = cache(async () => {
  if (!hasBackend()) return FIXTURE_CATEGORIES;
  const sb = await createClient();
  const { data } = await sb.from('categories').select('id,slug,name').eq('is_active', true).order('sort_order');
  return (data ?? []) as Any[];
});

export async function getProducts(opts: { category?: string; filter?: string; limit?: number } = {}): Promise<Product[]> {
  if (!hasBackend()) {
    let list = FIXTURE_PRODUCTS.filter((p) => !opts.category || opts.category === 'all' || p.categories?.slug === opts.category);
    if (opts.filter === 'bestsellers') list = list.filter((p) => p.is_bestseller);
    return opts.limit ? list.slice(0, opts.limit) : list;
  }
  const sb = await createClient();
  let q = sb.from('products').select(PRODUCT_SELECT).eq('is_active', true).order('sort_order').order('created_at');
  if (opts.filter === 'bestsellers') q = q.eq('is_bestseller', true);
  if (opts.filter === 'new') q = q.order('created_at', { ascending: false });
  if (opts.limit) q = q.limit(opts.limit);
  const { data } = await q;
  let list = (data ?? []) as Product[];
  if (opts.category && opts.category !== 'all') list = list.filter((p) => p.categories?.slug === opts.category);
  return list;
}

export const getFeatured = cache(async () => {
  if (!hasBackend()) return FIXTURE_PRODUCTS.filter((p) => p.is_featured);
  const sb = await createClient();
  const { data } = await sb.from('products').select(PRODUCT_SELECT).eq('is_active', true).eq('is_featured', true).order('sort_order').limit(8);
  return (data ?? []) as Product[];
});

export const getBestsellers = cache(async () => getProducts({ filter: 'bestsellers' }));

export async function getProduct(slug: string): Promise<Product | null> {
  if (!hasBackend()) return FIXTURE_PRODUCTS.find((p) => p.slug === slug) ?? null;
  const sb = await createClient();
  const { data } = await sb.from('products').select(PRODUCT_SELECT).eq('slug', slug).eq('is_active', true).maybeSingle();
  return (data as Product) ?? null;
}

export async function getReviews(productId: string) {
  if (!hasBackend()) return [] as Any[];
  const sb = await createClient();
  const { data } = await sb.from('reviews')
    .select('id,display_name,rating,title,body,images,is_verified_purchase,created_at,user_id')
    .eq('product_id', productId).eq('status', 'approved').order('created_at', { ascending: false }).limit(50);
  return (data ?? []) as Any[];
}

export const getFaqs = cache(async () => {
  if (!hasBackend()) return FIXTURE_FAQS as Any[];
  const sb = await createClient();
  const { data } = await sb.from('faqs').select('*').eq('is_published', true).order('sort_order');
  return (data ?? []) as Any[];
});

export const getJobs = cache(async () => {
  if (!hasBackend()) return FIXTURE_JOBS as Any[];
  const sb = await createClient();
  const { data } = await sb.from('job_postings').select('*').eq('is_open', true).order('created_at', { ascending: false });
  return (data ?? []) as Any[];
});

export async function getBlogPosts() {
  if (!hasBackend()) return FIXTURE_BLOG as Any[];
  const sb = await createClient();
  const { data } = await sb.from('blog_posts').select('*').eq('is_published', true).order('published_at', { ascending: false });
  return (data ?? []) as Any[];
}

export async function getBlogPost(slug: string) {
  const all = await getBlogPosts();
  return (all.find((p: Any) => p.slug === slug) ?? null) as Any;
}
