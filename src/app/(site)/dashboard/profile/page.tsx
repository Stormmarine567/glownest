import { ActionForm } from '@/components/dashboard/ActionForm';
import { AccountSecurity } from '@/components/dashboard/AccountSecurity';
import { ImageUploader } from '@/components/dashboard/ImageUploader';
import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { addAddressAction, deleteAddressAction, setDefaultAddressAction, updateProfileAction } from '../actions';

export const metadata = { title: 'My Profile' };

export default async function ProfilePage() {
  const { profile, userId } = await requireUser('/dashboard/profile');
  const sb = await createClient();
  const { data: addresses } = await sb.from('addresses').select('*').eq('user_id', userId).order('created_at');
  return (
    <div className="space-y-6">
      <ActionForm action={updateProfileAction} submit="Save profile" className="rounded-2xl bg-white p-5 shadow-soft md:p-6">
        <h2 className="text-[20px]">Personal information</h2>
        <div className="mt-5"><span className="label">Profile picture</span><ImageUploader name="avatar_url" bucket="avatars" folder={userId} initialUrl={profile.avatar_url} label="Upload photo" /></div>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div><label className="label" htmlFor="fn">Full name</label><input id="fn" name="full_name" defaultValue={profile.full_name ?? ''} maxLength={120} className="input" autoComplete="name" /></div>
          <div><label className="label" htmlFor="ph">Phone</label><input id="ph" name="phone" defaultValue={profile.phone ?? ''} maxLength={30} className="input" autoComplete="tel" /></div>
        </div>
      </ActionForm>

      <AccountSecurity email={profile.email} />

      <div className="rounded-2xl bg-white p-5 shadow-soft md:p-6">
        <h2 className="text-[20px]">Saved addresses</h2>
        <ul className="mt-4 grid gap-4 md:grid-cols-2">
          {(addresses ?? []).map((a) => (
            <li key={a.id} className="rounded-xl border border-line p-4 text-[13px]">
              <p className="font-bold">{a.label || a.full_name} {a.is_default_shipping && <span className="ml-1 rounded-full bg-tint px-2 py-0.5 text-[10px]">Default shipping</span>} {a.is_default_billing && <span className="ml-1 rounded-full bg-tint px-2 py-0.5 text-[10px]">Default billing</span>}</p>
              <p className="mt-1 leading-6 text-muted">{a.full_name}<br />{a.line1}{a.line2 ? `, ${a.line2}` : ''}<br />{a.city}{a.state ? `, ${a.state}` : ''} {a.postal_code}, {a.country}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {!a.is_default_shipping && <ActionForm action={setDefaultAddressAction} submit="Make default shipping" small submitClassName="btn btn-outline h-8 px-3 text-[12px]"><input type="hidden" name="id" value={a.id} /><input type="hidden" name="kind" value="shipping" /></ActionForm>}
                {!a.is_default_billing && <ActionForm action={setDefaultAddressAction} submit="Make default billing" small submitClassName="btn btn-outline h-8 px-3 text-[12px]"><input type="hidden" name="id" value={a.id} /><input type="hidden" name="kind" value="billing" /></ActionForm>}
                <ActionForm action={deleteAddressAction} submit="Remove" confirm="Remove this address?" small submitClassName="h-8 rounded-full px-3 text-[12px] text-red-600 hover:bg-red-50"><input type="hidden" name="id" value={a.id} /></ActionForm>
              </div>
            </li>
          ))}
        </ul>
        <ActionForm action={addAddressAction} submit="Add address" resetOnSuccess className="mt-6 border-t border-line pt-6">
          <h3 className="text-[16px]">Add a new address</h3>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div><label className="label" htmlFor="al">Label (optional)</label><input id="al" name="label" className="input" placeholder="Home, Office…" maxLength={40} /></div>
            <div><label className="label" htmlFor="an">Full name</label><input id="an" name="full_name" required className="input" /></div>
            <div><label className="label" htmlFor="ap">Phone</label><input id="ap" name="phone" className="input" /></div>
            <div><label className="label" htmlFor="a1">Address</label><input id="a1" name="line1" required className="input" /></div>
            <div><label className="label" htmlFor="a2">Apartment, suite (optional)</label><input id="a2" name="line2" className="input" /></div>
            <div><label className="label" htmlFor="ac">City</label><input id="ac" name="city" required className="input" /></div>
            <div><label className="label" htmlFor="as">State / Region</label><input id="as" name="state" className="input" /></div>
            <div><label className="label" htmlFor="az">Postal code</label><input id="az" name="postal_code" className="input" /></div>
            <div><label className="label" htmlFor="ao">Country (2-letter code)</label><input id="ao" name="country" required maxLength={2} defaultValue="NG" className="input uppercase" /></div>
          </div>
        </ActionForm>
      </div>
    </div>
  );
}
