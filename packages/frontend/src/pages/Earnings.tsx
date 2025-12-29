import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { earningsAPI } from '../services/api';
import { format } from 'date-fns';

const Earnings: React.FC = () => {
  const [period, setPeriod] = useState('month');
  const [filter, setFilter] = useState('');

  const { data: summary } = useQuery({
    queryKey: ['earnings-summary', period],
    queryFn: async () => {
      const res = await earningsAPI.getSummary({ period });
      return res.data.data;
    },
  });

  const { data: earnings } = useQuery({
    queryKey: ['earnings'],
    queryFn: async () => {
      const res = await earningsAPI.getEarnings();
      return res.data.data;
    },
  });

  const filteredEarnings = earnings?.filter((e: any) =>
    filter ? e.earningType === filter : true
  ) || [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Earnings</h1>
          <p className="text-gray-600 mt-1">Track your income and transactions</p>
        </div>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="input w-40"
        >
          <option value="day">Today</option>
          <option value="week">This Week</option>
          <option value="month">This Month</option>
          <option value="year">This Year</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card bg-gradient-to-br from-green-500 to-green-600 text-white">
          <p className="text-sm opacity-90">Total Earnings</p>
          <p className="text-3xl font-bold mt-2">
            ${summary?.total?.toFixed(2) || '0.00'}
          </p>
          <p className="text-sm mt-2 opacity-75">
            {period === 'day' ? 'Today' : 
             period === 'week' ? 'This Week' :
             period === 'month' ? 'This Month' : 'This Year'}
          </p>
        </div>

        {summary?.summary?.slice(0, 2).map((item: any, index: number) => (
          <div key={index} className="card">
            <p className="text-sm text-gray-600">{item.earningType}</p>
            <p className="text-2xl font-bold mt-2">
              ${parseFloat(item.total).toFixed(2)}
            </p>
            <p className="text-sm text-gray-500 mt-2">
              {item.count} transactions
            </p>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Transaction History</h2>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="input w-48"
          >
            <option value="">All Types</option>
            <option value="ad_revenue">Ad Revenue</option>
            <option value="fan_subscription">Fan Subscription</option>
            <option value="stars">Stars</option>
            <option value="bonus">Bonus</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4">Date</th>
                <th className="text-left py-3 px-4">Account</th>
                <th className="text-left py-3 px-4">Type</th>
                <th className="text-left py-3 px-4">Transaction ID</th>
                <th className="text-right py-3 px-4">Amount</th>
                <th className="text-left py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredEarnings.map((earning: any) => (
                <tr key={earning.id} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4">
                    {format(new Date(earning.earningDate), 'MMM dd, yyyy')}
                  </td>
                  <td className="py-3 px-4">
                    <div>
                      <div className="font-medium">{earning.facebookAccount?.name}</div>
                      <div className="text-xs text-gray-500">
                        {earning.facebookAccount?.pageName}
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                      {earning.earningType}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-500">
                    {earning.transactionId || 'N/A'}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className="font-semibold text-green-600">
                      ${parseFloat(earning.amount).toFixed(2)}
                    </span>
                    <div className="text-xs text-gray-500">{earning.currency}</div>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      earning.status === 'completed'
                        ? 'bg-green-100 text-green-800'
                        : earning.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {earning.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredEarnings.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No earnings found for the selected filters
          </div>
        )}
      </div>
    </div>
  );
};

export default Earnings;
