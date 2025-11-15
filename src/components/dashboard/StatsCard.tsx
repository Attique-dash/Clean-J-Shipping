import { ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/outline';

interface StatsCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ReactNode;
}

export function StatsCard({ title, value, change, icon }: StatsCardProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-2xl font-semibold text-gray-900">{value}</p>
          {change !== undefined && (
            <div className={`mt-2 flex items-center ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {change >= 0 ? (
                <ArrowUpIcon className="h-4 w-4 mr-1" />
              ) : (
                <ArrowDownIcon className="h-4 w-4 mr-1" />
              )}
              <span className="text-sm font-medium">{Math.abs(change)}% from last month</span>
            </div>
          )}
        </div>
        <div className="p-3 rounded-full bg-blue-50">
          {icon}
        </div>
      </div>
    </div>
  );
}
