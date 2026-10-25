import { NotificationList } from '@/components/dashboard/NotificationList';
import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

export const metadata = { title: 'Notifications' };

export default async function NotificationsPage() {
  const { userId } = await requireUser('/dashboard/notifications');
  const { data } = await (await createClient()).from('notifications').select('id,title,body,link,read_at,created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(100);
  return (
    <div className="rounded-2xl bg-white p-5 shadow-soft md:p-6">
      <h2 className="mb-4 text-[22px]">Notifications</h2>
      <NotificationList userId={userId} initial={data ?? []} />
    </div>
  );
}
