import type { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: string;
    positive: boolean;
  };
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'gray';
}

const colorMap: Record<string, { bg: string; icon: string }> = {
  blue: { bg: 'bg-primary-50', icon: 'text-primary-600' },
  green: { bg: 'bg-success-light', icon: 'text-success' },
  yellow: { bg: 'bg-warning-light', icon: 'text-warning' },
  red: { bg: 'bg-error-light', icon: 'text-error' },
  purple: { bg: 'bg-purple-50', icon: 'text-purple-600' },
  gray: { bg: 'bg-surface-tertiary', icon: 'text-text-secondary' },
};

export default function StatsCard({
  label,
  value,
  icon: Icon,
  trend,
  color = 'blue',
}: StatsCardProps) {
  const colors = colorMap[color] || colorMap.blue;

  return (
    <div className="bg-surface rounded-xl border border-border p-5 shadow-card hover:shadow-md transition-shadow duration-200">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-text-secondary">{label}</p>
          <p className="text-2xl font-bold text-text-primary tracking-tight">
            {value}
          </p>
          {trend && (
            <p
              className={`text-xs font-medium ${
                trend.positive ? 'text-success' : 'text-error'
              }`}
            >
              {trend.positive ? '↑' : '↓'} {trend.value}
            </p>
          )}
        </div>
        <div className={`${colors.bg} p-2.5 rounded-lg`}>
          <Icon className={`w-5 h-5 ${colors.icon}`} />
        </div>
      </div>
    </div>
  );
}
