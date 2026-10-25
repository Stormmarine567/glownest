'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type { ActionState } from '@/lib/action-types';
import { bool, fail, json, ok, optStr, run, str } from '@/lib/admin-action';
import defaults from '@/lib/default-content.json';
import { createClient } from '@/lib/supabase/server';

const KEYS = Object.keys(defaults.content);
const PAGE_SLUGS = Object.keys(defaults.pages);
const refresh = () => revalidatePath('/', 'layout');

export async function saveContentAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run('content', async ({ userId }) => {
    const key = str(fd, 'key');
    if (!KEYS.includes(key)) return fail('Unknown content block.');
    const raw = str(fd, 'data');
    if (raw.length > 200_000) return fail('Content is too large.');
    const data = json<unknown>(fd, 'data', undefined);
    if (data === undefined || typeof data !== 'object' || data === null) return fail('Content is not valid.');
    const { error } = await (await createClient()).from('site_content').upsert({ key, data, updated_by: userId, updated_at: new Date().toISOString() });
    if (error) return fail(error.message);
    refresh();
    return ok('Saved. The change is live.');
  });
}

export async function resetContentAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const res = await run('content', async () => {
    const key = str(fd, 'key');
    if (!KEYS.includes(key)) return fail('Unknown content block.');
    const { error } = await (await createClient()).from('site_content').delete().eq('key', key);
    if (error) return fail(error.message);
    refresh();
    return ok('Restored to the original text.');
  });
  if (res?.ok) redirect(`/admin/content/${str(fd, 'key')}`);
  return res;
}

export async function savePageAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run('content', async ({ userId }) => {
    const slug = str(fd, 'slug');
    if (!PAGE_SLUGS.includes(slug) && slug !== 'faq') return fail('Unknown page.');
    const title = str(fd, 'title');
    if (title.length < 2) return fail('Enter a page title.');
    const body = json<unknown>(fd, 'body', {});
    if (typeof body !== 'object' || body === null) return fail('Page content is not valid.');
    const { error } = await (await createClient()).from('pages').upsert({ slug, title, summary: optStr(fd, 'summary'), body, is_published: bool(fd, 'is_published'), updated_by: userId, updated_at: new Date().toISOString() });
    if (error) return fail(error.message);
    refresh();
    return ok('Page saved.');
  });
}

/* FAQs */
const faqRow = (fd: FormData) => ({ category: str(fd, 'category') || 'General', question: str(fd, 'question'), answer: str(fd, 'answer'), sort_order: parseInt(str(fd, 'sort_order'), 10) || 0, is_published: bool(fd, 'is_published') });
export async function saveFaqAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run('content', async () => {
    const row = faqRow(fd);
    if (row.question.length < 3 || row.answer.length < 2) return fail('Enter a question and an answer.');
    const sb = await createClient(); const id = str(fd, 'id');
    const { error } = id ? await sb.from('faqs').update(row).eq('id', id) : await sb.from('faqs').insert(row);
    if (error) return fail(error.message);
    refresh(); revalidatePath('/admin/faqs');
    return ok(id ? 'FAQ saved.' : 'FAQ added.');
  });
}
export async function deleteFaqAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run('content', async () => {
    const { error } = await (await createClient()).from('faqs').delete().eq('id', str(fd, 'id'));
    if (error) return fail(error.message);
    refresh(); revalidatePath('/admin/faqs');
    return ok('Deleted.');
  });
}

/* Jobs */
export async function saveJobAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run('content', async () => {
    const row = { title: str(fd, 'title'), department: optStr(fd, 'department'), location: optStr(fd, 'location'), employment_type: optStr(fd, 'employment_type'), description: str(fd, 'description'), how_to_apply: optStr(fd, 'how_to_apply'), is_open: bool(fd, 'is_open') };
    if (row.title.length < 2 || row.description.length < 5) return fail('Enter a job title and description.');
    const sb = await createClient(); const id = str(fd, 'id');
    const { error } = id ? await sb.from('job_postings').update(row).eq('id', id) : await sb.from('job_postings').insert(row);
    if (error) return fail(error.message);
    refresh(); revalidatePath('/admin/jobs');
    return ok(id ? 'Job saved.' : 'Job added.');
  });
}
export async function deleteJobAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run('content', async () => {
    const { error } = await (await createClient()).from('job_postings').delete().eq('id', str(fd, 'id'));
    if (error) return fail(error.message);
    refresh(); revalidatePath('/admin/jobs');
    return ok('Deleted.');
  });
}

/* Blog */
export async function saveBlogAction(_: ActionState, fd: FormData): Promise<ActionState> {
  let created: string | null = null;
  const res = await run('content', async () => {
    const title = str(fd, 'title');
    if (title.length < 3) return fail('Enter a title.');
    const slug = (str(fd, 'slug') || title).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const row = { title, slug, excerpt: optStr(fd, 'excerpt'), body: optStr(fd, 'body'), category: optStr(fd, 'category'), cover_url: optStr(fd, 'cover_url'), read_minutes: Math.max(1, parseInt(str(fd, 'read_minutes'), 10) || 4), is_featured: bool(fd, 'is_featured'), is_published: bool(fd, 'is_published') };
    const sb = await createClient(); const id = str(fd, 'id');
    if (id) {
      const { error } = await sb.from('blog_posts').update(row).eq('id', id);
      if (error) return fail(error.code === '23505' ? 'That URL slug is already used.' : error.message);
    } else {
      const { data, error } = await sb.from('blog_posts').insert(row).select('id').single();
      if (error || !data) return fail(error?.code === '23505' ? 'That URL slug is already used.' : error?.message ?? 'Could not save.');
      created = data.id;
    }
    refresh(); revalidatePath('/admin/blog');
    return ok('Post saved.');
  });
  if (created) redirect(`/admin/blog/${created}`);
  return res;
}
export async function deleteBlogAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const res = await run('content', async () => {
    const { error } = await (await createClient()).from('blog_posts').delete().eq('id', str(fd, 'id'));
    if (error) return fail(error.message);
    refresh();
    return ok('Deleted.');
  });
  if (res?.ok) redirect('/admin/blog');
  return res;
}
