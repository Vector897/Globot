import React, { useEffect, useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line 
} from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export function DashboardCharts({ data }) {
  if (!data) return <div className="text-gray-400">Loading charts...</div>;

  const { kpi, charts } = data;

  return (
    <div className="flex flex-col gap-6 w-full text-white">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard title="Total Users" value={kpi?.total_users} icon="👥" color="from-blue-500 to-cyan-500" />
        <KpiCard title="Total Tokens" value={kpi?.total_tokens?.toLocaleString()} icon="💎" color="from-purple-500 to-pink-500" />
        <KpiCard title="Avg Tokens/User" value={kpi?.avg_tokens_per_user?.toLocaleString()} icon="📊" color="from-orange-500 to-yellow-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Token Usage Bar Chart */}
        <ChartContainer title="Top Users by Token Usage">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={charts?.top_users} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis type="number" stroke="#94a3b8" />
                <YAxis dataKey="name" type="category" width={80} stroke="#94a3b8" />
                <Tooltip 
                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff' }} 
                    itemStyle={{ color: '#fff' }}
                />
                <Legend />
                <Bar dataKey="tokens" fill="#8884d8" name="Token Usage">
                  {charts?.top_users?.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
        </ChartContainer>

        {/* Location Pie Chart */}
        <ChartContainer title="User Distribution by City">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={charts?.location_distribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {charts?.location_distribution?.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff' }} />
              </PieChart>
            </ResponsiveContainer>
        </ChartContainer>

        {/* Registration Trend Line Chart */}
        <ChartContainer title="Registration Trend (Daily)" className="lg:col-span-2">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={charts?.registration_trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="date" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff' }} />
                <Legend />
                <Line type="monotone" dataKey="count" stroke="#82ca9d" name="New Users" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
        </ChartContainer>
      </div>
    </div>
  );
}

function KpiCard({ title, value, icon, color }) {
  return (
    <div className={`p-6 rounded-lg bg-gradient-to-br ${color} shadow-lg`}>
      <div className="flex justify-between items-center">
        <div>
          <p className="text-white text-opacity-80 text-sm font-medium uppercase tracking-wider">{title}</p>
          <p className="text-white text-3xl font-bold mt-1">{value !== undefined ? value : '-'}</p>
        </div>
        <div className="text-4xl opacity-50">{icon}</div>
      </div>
    </div>
  );
}

function ChartContainer({ title, children, className = "" }) {
  return (
    <div className={`bg-slate-800 p-5 rounded-xl border border-slate-700 shadow-sm ${className}`}>
      <h3 className="text-lg font-semibold text-cyan-400 mb-4 border-b border-slate-700 pb-2 flex items-center gap-2">
        <span className="w-2 h-6 bg-cyan-500 rounded-sm"></span>
        {title}
      </h3>
      {children}
    </div>
  );
}
