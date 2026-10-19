import Image from 'next/image';

type Props = {
  size?: 'sm' | 'md' | 'lg';
  /** `badge` keeps the official dark plate; `inline` is tighter for sidebar. */
  variant?: 'badge' | 'inline';
};

const sizes = {
  sm: { w: 132, h: 32 },
  md: { w: 168, h: 40 },
  lg: { w: 210, h: 50 },
};

export function QuikkredLogo({ size = 'md', variant = 'badge' }: Props) {
  const { w, h } = sizes[size];

  if (variant === 'inline') {
    return (
      <Image
        src="/quikkred-logo.png"
        alt="Quikkred"
        width={w}
        height={h}
        className="h-auto w-auto object-contain"
        style={{ height: h, width: 'auto' }}
        priority
      />
    );
  }

  return (
    <div
      className="inline-flex items-center justify-center overflow-hidden rounded-2xl bg-black shadow-sm ring-1 ring-black/10"
      style={{ height: h + 16, paddingInline: 14 }}
    >
      <Image
        src="/quikkred-logo.png"
        alt="Quikkred"
        width={w}
        height={h}
        className="object-contain"
        style={{ height: h, width: 'auto' }}
        priority
      />
    </div>
  );
}
