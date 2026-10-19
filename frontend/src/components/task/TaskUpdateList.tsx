'use client';

import { type TaskUpdateItem } from '@/lib/task';

type Props = {
  updates: TaskUpdateItem[];
};

function relativeTime(value?: string) {
  if (!value) return '';
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return '';
  const diff = Date.now() - then;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(value).toLocaleString();
}

export function TaskUpdateList({ updates }: Props) {
  return (
    <section className="rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-[0_8px_28px_rgba(15,23,42,0.06)] lg:p-6">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h3 className="text-base font-semibold text-[#111827]">Updates</h3>
        <p className="text-xs text-[#94A3B8]">
          {updates.length} note{updates.length === 1 ? '' : 's'}
        </p>
      </div>
      {updates.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#CBD5E0] bg-[#F8FAFC] px-4 py-10 text-center">
          <p className="text-sm font-semibold text-[#2D3748]">No updates yet</p>
          <p className="mt-1 text-sm text-[#718096]">
            Progress notes will show here for members and admin.
          </p>
        </div>
      ) : (
        <ol className="space-y-3">
          {updates.map((item) => (
            <li
              key={item.id}
              className="rounded-xl border border-[#EEF2F7] bg-[#F8FAFC] px-4 py-3.5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-[#111827]">
                  {item.actorName}
                  <span className="ml-2 rounded-full bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#64748B] ring-1 ring-[#E5E7EB]">
                    {item.actorType === 'admin' ? 'Admin' : 'Member'}
                  </span>
                </p>
                <p className="text-xs text-[#94A3B8]">{relativeTime(item.createdAt)}</p>
              </div>
              <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-[#334155]">
                {item.message}
              </p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
