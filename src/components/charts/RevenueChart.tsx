// src/components/charts/RevenueChart.tsx
'use client';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface RevenueData {
  month: string;
  revenue: number;
  packages: number;
}

interface RevenueChartProps {
  data: RevenueData[];
}

export const RevenueChart = ({ data }: RevenueChartProps) => {
  // Format data for the chart
  const formattedData = data.map(item => ({
    month: item.month,
    Revenue: item.revenue,
    Packages: item.packages
  }));

  // Calculate Y-axis domain for better display - show $0, $100, $200, etc.
  const maxRevenue = Math.max(...formattedData.map(d => d.Revenue), 0);
  const yAxisMax = Math.ceil(maxRevenue / 100) * 100; // Round up to nearest 100
  const yAxisTicks = [];
  // Generate ticks in increments of $100: $0, $100, $200, etc.
  for (let i = 0; i <= yAxisMax; i += 100) {
    yAxisTicks.push(i);
  }

  if (!formattedData || formattedData.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400">
        <p>No data available</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart
        data={formattedData}
        margin={{ top: 10, right: 30, left: 20, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis 
          dataKey="month" 
          stroke="#6b7280"
          style={{ fontSize: '12px' }}
        />
        <YAxis 
          stroke="#6b7280"
          style={{ fontSize: '12px' }}
          domain={[0, yAxisMax]}
          ticks={yAxisTicks}
          tickFormatter={(value) => `$${value.toLocaleString()}`}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          }}
          formatter={(value: number | string | undefined, name?: string) => [
            name === 'Revenue' ? `$${Number(value || 0).toLocaleString()}` : value,
            name || ''
          ]}
        />
        <Legend 
          wrapperStyle={{ paddingTop: '20px' }}
          iconType="line"
        />
        <Line
          type="monotone"
          dataKey="Revenue"
          stroke="#3b82f6"
          strokeWidth={3}
          dot={{ fill: '#3b82f6', r: 4 }}
          activeDot={{ r: 6 }}
        />
        <Line
          type="monotone"
          dataKey="Packages"
          stroke="#10b981"
          strokeWidth={3}
          dot={{ fill: '#10b981', r: 4 }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};