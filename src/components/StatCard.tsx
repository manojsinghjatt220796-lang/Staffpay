import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  subtext: string;
  icon: LucideIcon;
  tone?: 'default' | 'positive' | 'warning';
  onClick?: () => void;
}

export function StatCard({
  label,
  value,
  subtext,
  icon: Icon,
  tone = 'default',
  onClick,
}: StatCardProps) {
  const toneColor =
    tone === 'positive'
      ? 'text-emerald-600'
      : tone === 'warning'
        ? 'text-amber-600'
        : 'text-slate-500';

  const Wrapper = onClick ? 'button' : 'div';

  return (
    <Wrapper
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`w-full text-left bg-white border border-gray-200 rounded-xl p-5 transition-colors ${
        onClick
          ? 'hover:border-gray-300 hover:bg-gray-50/60 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500'
          : ''
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <span className="text-sm font-medium text-slate-500">{label}</span>
        <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4 text-blue-600" />
        </div>
      </div>

      <div className="mt-3 text-3xl font-semibold text-slate-900 font-mono tabular-nums tracking-tight">
        {value}
      </div>

      <p className={`mt-2 text-xs font-medium ${toneColor}`}>{subtext}</p>
    </Wrapper>
  );
}
