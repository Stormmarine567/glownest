const COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800', unpaid: 'bg-amber-100 text-amber-800', requested: 'bg-amber-100 text-amber-800',
  confirmed: 'bg-blue-100 text-blue-800', processing: 'bg-indigo-100 text-indigo-800', shipped: 'bg-sky-100 text-sky-800',
  delivered: 'bg-green-100 text-green-800', paid: 'bg-green-100 text-green-800', approved: 'bg-green-100 text-green-800', completed: 'bg-green-100 text-green-800', sent: 'bg-green-100 text-green-800', subscribed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800', failed: 'bg-red-100 text-red-800', rejected: 'bg-red-100 text-red-800', dead: 'bg-red-100 text-red-800', suppressed: 'bg-red-100 text-red-800',
  refunded: 'bg-purple-100 text-purple-800', partially_refunded: 'bg-purple-100 text-purple-800', unsubscribed: 'bg-gray-100 text-gray-700', draft: 'bg-gray-100 text-gray-700', scheduled: 'bg-blue-100 text-blue-800', sending: 'bg-indigo-100 text-indigo-800', processing_q: 'bg-indigo-100 text-indigo-800',
};
export function StatusBadge({ value }: { value: string }) {
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold capitalize ${COLORS[value] ?? 'bg-gray-100 text-gray-700'}`}>{value.replace('_', ' ')}</span>;
}
