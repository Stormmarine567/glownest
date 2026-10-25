import { ActionForm } from '@/components/dashboard/ActionForm';
import { BrandIcon } from '@/components/BrandIcon';
import { ImageUploader } from '@/components/dashboard/ImageUploader';
import { requireSuperAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { deleteSocialAction, saveSettingsAction, saveSocialAction } from './actions';

export const metadata = { title: 'Settings' };
export const dynamic = 'force-dynamic';

const PLATFORMS = ['instagram', 'facebook', 'tiktok', 'pinterest', 'youtube', 'x'];
const box = 'rounded-2xl bg-white p-5 shadow-soft md:p-6';

function SocialFields({ s }: { s?: { id: string; platform: string; url: string; sort_order: number; is_active: boolean } }) {
  return (<div className="grid items-end gap-3 md:grid-cols-[150px_1fr_80px_auto]">{s && <input type="hidden" name="id" value={s.id} />}
    <div><label className="label">Platform</label><select name="platform" defaultValue={s?.platform ?? 'instagram'} className="input capitalize">{PLATFORMS.map((p) => <option key={p}>{p}</option>)}</select></div>
    <div><label className="label">Profile link</label><input name="url" type="url" required defaultValue={s?.url} placeholder="https://" className="input" /></div>
    <div><label className="label">Order</label><input name="sort_order" inputMode="numeric" defaultValue={s?.sort_order ?? 0} className="input" /></div>
    <label className="flex h-11 items-center gap-2 text-[13px]"><input type="checkbox" name="is_active" defaultChecked={s?.is_active ?? true} />Visible</label></div>);
}

export default async function AdminSettings() {
  await requireSuperAdmin();
  const sb = await createClient();
  const [{ data: rows }, { data: social }] = await Promise.all([sb.from('site_settings').select('key,value'), sb.from('social_links').select('*').order('sort_order')]);
  const m = Object.fromEntries((rows ?? []).map((r) => [r.key, r.value])) as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  const b = m.business ?? {}, br = m.branding ?? {}, st = m.store ?? {}, seo = m.seo ?? {}, rec = (m.notification_recipients ?? []) as string[];
  return (
    <div className="space-y-6">
      <h2 className="text-[26px]">Settings</h2>
      <ActionForm action={saveSettingsAction} submit="Save business info" className={box}><input type="hidden" name="section" value="business" /><h3 className="text-[18px]">Business information</h3>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div><label className="label" htmlFor="name">Business name</label><input id="name" name="name" required defaultValue={b.name} className="input" /></div>
          <div><label className="label" htmlFor="tagline">Tagline</label><input id="tagline" name="tagline" defaultValue={b.tagline} className="input" /></div>
          <div><label className="label" htmlFor="email">Contact email</label><input id="email" name="email" type="email" required defaultValue={b.email} className="input" /></div>
          <div><label className="label" htmlFor="phone">Phone</label><input id="phone" name="phone" defaultValue={b.phone} className="input" /></div>
          <div><label className="label" htmlFor="address_lines">Address (one line per row)</label><textarea id="address_lines" name="address_lines" defaultValue={(b.address_lines ?? []).join('\n')} className="textarea min-h-[80px]" /></div>
          <div><label className="label" htmlFor="hours">Opening hours (one per row)</label><textarea id="hours" name="hours" defaultValue={(b.hours ?? []).join('\n')} className="textarea min-h-[80px]" /></div>
          <div><label className="label" htmlFor="map_url">Map link</label><input id="map_url" name="map_url" defaultValue={b.map_url} className="input" /></div>
          <div><label className="label" htmlFor="support_note">Support note</label><input id="support_note" name="support_note" defaultValue={b.support_note} className="input" /></div>
        </div></ActionForm>

      <ActionForm action={saveSettingsAction} submit="Save branding" className={box}><input type="hidden" name="section" value="branding" /><h3 className="text-[18px]">Logo & favicon</h3>
        <div className="mt-4 grid gap-6 md:grid-cols-2"><div><span className="label">Logo</span><ImageUploader name="logo_url" bucket="branding" folder="logo" initialUrl={br.logo_url} label="Upload logo" fallbackNote="Without a logo the GLOWNEST wordmark is shown." /></div><div><span className="label">Favicon</span><ImageUploader name="favicon_url" bucket="branding" folder="favicon" initialUrl={br.favicon_url} label="Upload favicon" /></div></div></ActionForm>

      <section className={box}><h3 className="text-[18px]">Social media links</h3><p className="mt-1 text-[12px] text-muted">Shown as brand icons in the footer. Hidden or empty platforms are not displayed.</p>
        <div className="mt-4 space-y-4">{(social ?? []).map((s) => <div key={s.id} className="rounded-xl border border-line p-3"><div className="mb-2 flex items-center gap-2 text-[12px] capitalize text-muted"><BrandIcon platform={s.platform} className="h-4 w-4" />{s.platform}</div>
          <ActionForm action={saveSocialAction} submit="Save" small><SocialFields s={s} /></ActionForm><ActionForm action={deleteSocialAction} submit="Remove" danger small confirm="Remove this link?" className="mt-1"><input type="hidden" name="id" value={s.id} /></ActionForm></div>)}</div>
        <ActionForm action={saveSocialAction} submit="Add link" resetOnSuccess className="mt-5 border-t border-line pt-5"><SocialFields /></ActionForm></section>

      <ActionForm action={saveSettingsAction} submit="Save store settings" className={box}><input type="hidden" name="section" value="store" /><h3 className="text-[18px]">Store</h3>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div><label className="label" htmlFor="currency">Currency</label><input id="currency" name="currency" maxLength={3} defaultValue={st.currency} className="input uppercase" /></div>
          <div><label className="label" htmlFor="tax_percent">Tax (%)</label><input id="tax_percent" name="tax_percent" inputMode="decimal" defaultValue={st.tax_percent} className="input" /></div>
          <div><label className="label" htmlFor="low_stock_default">Default low-stock alert</label><input id="low_stock_default" name="low_stock_default" inputMode="numeric" defaultValue={st.low_stock_default} className="input" /></div>
          <div className="md:col-span-3"><label className="label" htmlFor="newsletter_discount">Newsletter offer text</label><input id="newsletter_discount" name="newsletter_discount" defaultValue={st.newsletter_discount} className="input" /></div>
        </div><label className="mt-4 flex items-center gap-2 text-[13px]"><input type="checkbox" name="maintenance_mode" defaultChecked={st.maintenance_mode} />Maintenance mode (visitors see a “back soon” page; admins can still sign in)</label></ActionForm>

      <ActionForm action={saveSettingsAction} submit="Save SEO" className={box}><input type="hidden" name="section" value="seo" /><h3 className="text-[18px]">SEO & analytics</h3>
        <div className="mt-4 grid gap-4"><div><label className="label" htmlFor="seo_title">Site title</label><input id="seo_title" name="title" defaultValue={seo.title} className="input" /></div><div><label className="label" htmlFor="seo_desc">Description</label><textarea id="seo_desc" name="description" defaultValue={seo.description} className="textarea min-h-[70px]" /></div><div className="max-w-xs"><label className="label" htmlFor="aid">Google Analytics ID</label><input id="aid" name="analytics_id" placeholder="G-XXXXXXXXXX" defaultValue={seo.analytics_id} className="input" /></div></div></ActionForm>

      <ActionForm action={saveSettingsAction} submit="Save recipients" className={box}><input type="hidden" name="section" value="recipients" /><h3 className="text-[18px]">Admin notification emails</h3><p className="mt-1 text-[12px] text-muted">Extra addresses (one per line) that receive new-order, review and contact emails. Active admins always get dashboard notifications.</p>
        <textarea name="emails" aria-label="Notification recipients" defaultValue={rec.join('\n')} className="textarea mt-3 min-h-[80px]" /></ActionForm>
    </div>
  );
}
