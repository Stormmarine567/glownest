'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { formatDate } from '@/lib/utils';

interface N { id: string; title: string; body: string | null; link: string | null; read_at: string | null; created_at: string }

export function NotificationList({ initial, userId, adminHome }: { initial: N[]; userId: string; adminHome?: boolean }) {
  const [items, setItems] = useState(initial);
  const router = useRouter();
  void adminHome;
  async function read(id: string) {
    const now = new Date().toISOString();
    await createClient().from('notifications').update({ read_at: now }).eq('id', id).eq('user_id', userId);
    setItems((l) => l.map((n) => (n.id === id ? { ...n, read_at: now } : n))); router.refresh();
  }
  async function readAll() {
    const now = new Date().toISOString();
    await createClient().from('notifications').update({ read_at: now }).eq('user_id', userId).is('read_at', null);
    setItems((l) => l.map((n) => ({ ...n, read_at: n.read_at ?? now }))); router.refresh();
  }
  const unread = items.filter((n) => !n.read_at).length;
  return (
    <div>
      <div className="mb-4 flex items-center justify-between"><p className="text-[13px] text-muted">{unread} unread</p>{unread > 0 && <button onClick={readAll} className="text-[13px] font-bold underline">Mark all as read</button>}</div>
      {items.length === 0 ? <p className="text-[14px] text-muted">No notifications yet.</p> : (
        <ul className="divide-y divide-line">
          {items.map((n) => (
            <li key={n.id} className={`flex items-start gap-3 py-4 ${n.read_at ? 'opacity-70' : ''}`}>
              <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${n.read_at ? 'bg-transparent' : 'bg-navy'}`} aria-label={n.read_at ? 'Read' : 'Unread'} />
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-bold">{n.title}</p>
                {n.body && <p className="text-[13px] text-muted">{n.body}</p>}
                <p className="mt-1 text-[11px] text-muted">{formatDate(n.created_at, { dateStyle: 'medium', timeStyle: 'short' })}</p>
              </div>
              <div className="flex shrink-0 gap-3 text-[12px]">
                {n.link && <Link href={n.link} onClick={() => !n.read_at && read(n.id)} className="font-bold underline">View</Link>}
                {!n.read_at && <button onClick={() => read(n.id)} className="text-muted underline">Mark read</button>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
