import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { facebookAPI } from '../services/api';
import { toast } from 'react-toastify';
import { FaSync, FaCheckCircle, FaTimesCircle } from 'react-icons/fa';

const Accounts: React.FC = () => {
  const queryClient = useQueryClient();

  const { data: accounts } = useQuery({
    queryKey: ['facebook-accounts'],
    queryFn: async () => {
      const res = await facebookAPI.getAccounts();
      return res.data.data;
    },
  });

  const syncMutation = useMutation({
    mutationFn: (accountId: string) => facebookAPI.syncAccount(accountId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['facebook-accounts'] });
      toast.success('Account synced successfully!');
    },
    onError: () => {
      toast.error('Failed to sync account');
    },
  });

  const handleConnectFacebook = () => {
    const clientId = process.env.REACT_APP_FACEBOOK_APP_ID;
    const redirectUri = `${window.location.origin}/facebook/callback`;
    const scope = 'pages_show_list,pages_read_engagement,pages_manage_posts,pages_read_user_content';
    
    window.location.href = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Facebook Accounts</h1>
          <p className="text-gray-600 mt-1">Manage your connected accounts</p>
        </div>
        <button
          onClick={handleConnectFacebook}
          className="btn-primary"
        >
          Connect Facebook Account
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {accounts?.map((account: any) => (
          <div key={account.id} className="card">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-bold">{account.name}</h3>
                {account.pageName && (
                  <p className="text-sm text-gray-600 mt-1">
                    Page: {account.pageName}
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-2">
                  ID: {account.facebookId}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {account.isActive ? (
                  <FaCheckCircle className="text-green-500" title="Active" />
                ) : (
                  <FaTimesCircle className="text-red-500" title="Inactive" />
                )}
              </div>
            </div>

            <div className="mt-4 pt-4 border-t">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Monetization</p>
                  <p className="font-semibold">
                    {account.monetizationEnabled ? (
                      <span className="text-green-600">Enabled</span>
                    ) : (
                      <span className="text-gray-400">Disabled</span>
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Token Expiry</p>
                  <p className="font-semibold text-xs">
                    {account.tokenExpiry
                      ? new Date(account.tokenExpiry).toLocaleDateString()
                      : 'Never'}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                onClick={() => syncMutation.mutate(account.id)}
                disabled={syncMutation.isPending}
                className="flex-1 btn-primary flex items-center justify-center gap-2"
              >
                <FaSync className={syncMutation.isPending ? 'animate-spin' : ''} />
                {syncMutation.isPending ? 'Syncing...' : 'Sync Data'}
              </button>
              <button className="flex-1 btn-secondary">
                View Details
              </button>
            </div>
          </div>
        ))}
      </div>

      {(!accounts || accounts.length === 0) && (
        <div className="card text-center py-12">
          <p className="text-gray-500 mb-4">No accounts connected yet</p>
          <button
            onClick={handleConnectFacebook}
            className="btn-primary"
          >
            Connect Your First Account
          </button>
        </div>
      )}
    </div>
  );
};

export default Accounts;
