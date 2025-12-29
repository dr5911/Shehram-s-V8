import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { earningsAPI, facebookAPI } from '../services/api';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { FaDollarSign, FaChartLine, FaUsers, FaFacebook } from 'react-icons/fa';

const Dashboard: React.FC = () => {
  const { data: summary } = useQuery({
    queryKey: ['earnings-summary'],
    queryFn: async () => {
      const res = await earningsAPI.getSummary({ period: 'month' });
      return res.data.data;
    },
  });

  const { data: accounts } = useQuery({
    queryKey: ['facebook-accounts'],
    queryFn: async () => {
      const res = await facebookAPI.getAccounts();
      return res.data.data;
    },
  });

  const { data: earnings } = useQuery({
    queryKey: ['recent-earnings'],
    queryFn: async () => {
      const res = await earningsAPI.getEarnings();
      return res.data.data;
    },
  });

  const stats = [
    {
      title: 'Total Earnings (30d)',
      value: `$${summary?.total?.toFixed(2) || '0.00'}`,
      icon: FaDollarSign,
      color: 'bg-green-500',
    },
    {
      title: 'Active Accounts',
      value: accounts?.filter((a: any) => a.isActive).length || 0,
      icon: FaFacebook,
      color: 'bg-blue-500',
    },
    {
      title: 'Total Transactions',
      value: earnings?.length || 0,
      icon: FaChartLine,
      color: 'bg-purple-500',
    },
    {
      title: 'Growth Rate',
      value: '+12.5%',
      icon: FaUsers,
      color: 'bg-orange-500',
    },
  ];

  const chartData = earnings?.slice(0, 7).reverse().map((e: any) => ({
    date: new Date(e.earningDate).toLocaleDateString(),
    amount: parseFloat(e.amount),
  })) || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-gray-600 mt-1">Welcome back! Here's your earnings overview.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{stat.title}</p>
                <p className="text-2xl font-bold mt-1">{stat.value}</p>
              </div>
              <div className={`${stat.color} p-3 rounded-lg text-white`}>
                <stat.icon size={24} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-xl font-bold mb-4">Earnings Trend</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="amount" stroke="#3b82f6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h2 className="text-xl font-bold mb-4">Earnings by Type</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={summary?.summary || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="earningType" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="total" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card">
        <h2 className="text-xl font-bold mb-4">Recent Earnings</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4">Date</th>
                <th className="text-left py-3 px-4">Account</th>
                <th className="text-left py-3 px-4">Type</th>
                <th className="text-right py-3 px-4">Amount</th>
              </tr>
            </thead>
            <tbody>
              {earnings?.slice(0, 10).map((earning: any) => (
                <tr key={earning.id} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4">
                    {new Date(earning.earningDate).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4">{earning.facebookAccount?.name}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                      {earning.earningType}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-semibold text-green-600">
                    ${parseFloat(earning.amount).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
