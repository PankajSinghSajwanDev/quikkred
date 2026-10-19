'use client';

export type SegmentTab<T extends string> = {
  id: T;
  label: string;
  count?: number;
};

type Props<T extends string> = {
  tabs: SegmentTab<T>[];
  value: T;
  onChange: (id: T) => void;
};

export function SegmentTabs<T extends string>({
  tabs,
  value,
  onChange,
}: Props<T>) {
  return (
    <div className="inline-flex rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] p-1">
      {tabs.map((tab) => {
        const active = tab.id === value;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`rounded-lg px-3.5 py-2 text-sm font-semibold transition ${
              active
                ? 'bg-white text-[#2f9a74] shadow-sm'
                : 'text-[#6B7280] hover:text-[#1F2937]'
            }`}
          >
            {tab.label}
            {typeof tab.count === 'number' ? (
              <span className={`ml-1.5 text-xs ${active ? 'text-[#3EB489]' : 'text-[#9CA3AF]'}`}>
                {tab.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
