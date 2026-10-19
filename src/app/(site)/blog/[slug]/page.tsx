import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { getBlogPost } from '@/lib/data';
import { formatDate } from '@/lib/utils';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await getBlogPost((await params).slug);
  return p ? { title: p.title, description: p.excerpt } : { title: 'Article not found' };
}

/* eslint-disable @next/next/no-img-element */
export default async function BlogPostPage({ params }: Props) {
  const post = await getBlogPost((await params).slug);
  if (!post) notFound();
  // Article bodies are plain text written by staff; paragraphs are split on blank lines and rendered as text (never as HTML).
  const paragraphs = (post.body ?? post.excerpt ?? '').split(/\n{2,}/).filter(Boolean);
  return (
    <article className="container max-w-[760px] py-10 md:py-[56px]">
      <Link href="/blog" className="inline-flex items-center gap-2 text-[14px] text-muted hover:text-ink"><ArrowLeft className="h-4 w-4" />All articles</Link>
      <p className="mt-8 text-[12px] font-medium uppercase tracking-[0.06em] text-muted">{post.category}</p>
      <h1 className="mt-2 text-[34px] leading-[1.15] md:text-[42px]">{post.title}</h1>
      <p className="mt-3 text-[13px] text-muted">{formatDate(post.published_at)} · {post.read_minutes} min read</p>
      {post.cover_url && <img src={post.cover_url} alt="" className="mt-8 h-[280px] w-full rounded-2xl object-cover md:h-[380px]" />}
      <div className="mt-8 space-y-5 text-[15px] leading-8 text-[#4B5A73]">{paragraphs.map((t: string, i: number) => <p key={i}>{t}</p>)}</div>
    </article>
  );
}
