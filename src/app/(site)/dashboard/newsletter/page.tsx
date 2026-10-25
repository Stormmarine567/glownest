import { ActionForm } from '@/components/dashboard/ActionForm';
import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { setNewsletterAction } from '../actions';

export const metadata = { title: 'Newsletter Preferences' };

export default async function NewsletterPrefs() {
  const { userId, profile } = await requireUser('/dashboard/newsletter');
  const { data: sub } = await (await createClient()).from('newsletter_subscribers').select('status').eq('user_id', userId).maybeSingle();
  const subscribed = sub?.status === 'subscribed';
  return (
    <ActionForm action={setNewsletterAction} submit="Save preferences" className="rounded-2xl bg-white p-5 shadow-soft md:p-6">
      <h2 className="text-[22px]">Newsletter preferences</h2>
      <p className="mt-2 text-[14px] text-muted">Marketing emails go to {profile.email}. Essential order and security emails are always sent.</p>
      {sub?.status === 'suppressed' ? <p className="mt-5 rounded-xl bg-amber-50 p-4 text-[13px] text-amber-800">This address is on our suppression list. Contact support if you would like to receive marketing emails again.</p> : (
        <label className="mt-5 flex cursor-pointer items-center gap-3 rounded-xl border border-line p-4"><input type="checkbox" name="subscribe" defaultChecked={subscribed} className="h-4 w-4" /><span><span className="block text-[14px] font-medium">Send me skincare tips, launches and offers</span><span className="block text-[12px] text-muted">You can unsubscribe at any time.</span></span></label>
      )}
    </ActionForm>
  );
}
