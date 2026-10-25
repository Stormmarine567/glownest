import { ActionForm } from '@/components/dashboard/ActionForm';
import { requireSuperAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { ALL_PERMISSIONS } from '@/lib/types';
import { formatDate } from '@/lib/utils';
import { inviteAdminAction, removeAdminAction, updateAdminAction } from './actions';

export const metadata = { title: 'Admins' };
export const dynamic = 'force-dynamic';

function PermChecks({ value = [] as string[] }) {
  return <div className="grid gap-2 sm:grid-cols-2">{ALL_PERMISSIONS.map((p) => <label key={p.id} className="flex items-center gap-2 text-[13px]"><input type="checkbox" name="permissions" value={p.id} defaultChecked={value.includes(p.id)} />{p.label}</label>)}</div>;
}

export default async function AdminsPage() {
  const { userId } = await requireSuperAdmin();
  const { data } = await (await createClient()).from('profiles').select('id,email,full_name,role,permissions,is_active,created_at').in('role', ['admin', 'super_admin']).order('role', { ascending: false }).order('created_at');
  const box = 'rounded-2xl bg-white p-5 shadow-soft md:p-6';
  return (
    <div className="space-y-6">
      <h2 className="text-[26px]">Admins</h2>
      <ActionForm action={inviteAdminAction} submit="Send invitation" resetOnSuccess className={box}>
        <h3 className="text-[18px]">Invite an admin</h3><p className="mt-1 text-[12px] text-muted">They receive an email to set their password. Admins can only use the areas you tick. The Super Admin role cannot be granted from here.</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2"><div><label className="label" htmlFor="ie">Email</label><input id="ie" name="email" type="email" required className="input" /></div><div><label className="label" htmlFor="in">Name (optional)</label><input id="in" name="full_name" className="input" /></div></div>
        <div className="mt-4"><span className="label">Permissions</span><PermChecks /></div>
      </ActionForm>
      {(data ?? []).map((a) => (
        <div key={a.id} className={box}>
          <div className="flex flex-wrap items-center justify-between gap-2"><div><b>{a.full_name || a.email}</b><span className="block text-[12px] text-muted">{a.email} · added {formatDate(a.created_at)}</span></div>
            <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${a.role === 'super_admin' ? 'bg-navy text-white' : 'bg-tint'}`}>{a.role === 'super_admin' ? 'Super Admin' : a.is_active ? 'Admin' : 'Deactivated'}</span></div>
          {a.role === 'admin' && a.id !== userId ? (<>
            <ActionForm action={updateAdminAction} submit="Save access" small className="mt-4"><input type="hidden" name="id" value={a.id} /><PermChecks value={a.permissions} /><label className="mt-3 flex items-center gap-2 text-[13px]"><input type="checkbox" name="is_active" defaultChecked={a.is_active} />Account active</label></ActionForm>
            <ActionForm action={removeAdminAction} submit="Remove admin access" danger small confirm="Remove this person's admin access?" className="mt-1"><input type="hidden" name="id" value={a.id} /></ActionForm></>)
            : <p className="mt-3 text-[12px] text-muted">{a.role === 'super_admin' ? 'Full access. Created through the secure setup script and protected from changes here.' : 'This is you.'}</p>}
        </div>
      ))}
    </div>
  );
}
