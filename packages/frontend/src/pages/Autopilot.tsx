import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { autopilotAPI, facebookAPI } from '../services/api';
import { toast } from 'react-toastify';
import { FaRobot, FaLightbulb, FaCalendar, FaHashtag } from 'react-icons/fa';

const Autopilot: React.FC = () => {
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [contentTopic, setContentTopic] = useState('');
  const [contentText, setContentText] = useState('');
  const queryClient = useQueryClient();

  const { data: accounts } = useQuery({
    queryKey: ['facebook-accounts'],
    queryFn: async () => {
      const res = await facebookAPI.getAccounts();
      return res.data.data;
    },
  });

  const { data: settings } = useQuery({
    queryKey: ['autopilot-settings', selectedAccount],
    queryFn: async () => {
      if (!selectedAccount) return null;
      const res = await autopilotAPI.getSettings(selectedAccount);
      return res.data.data;
    },
    enabled: !!selectedAccount,
  });

  const { data: trends } = useQuery({
    queryKey: ['trends'],
    queryFn: async () => {
      const res = await autopilotAPI.getTrends({ minScore: 70 });
      return res.data.data;
    },
  });

  const { data: scheduledPosts } = useQuery({
    queryKey: ['scheduled-posts', selectedAccount],
    queryFn: async () => {
      const res = await autopilotAPI.getScheduledPosts({ 
        accountId: selectedAccount,
        status: 'pending'
      });
      return res.data.data;
    },
    enabled: !!selectedAccount,
  });

  const updateSettingsMutation = useMutation({
    mutationFn: (data: any) => autopilotAPI.updateSettings(selectedAccount, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['autopilot-settings'] });
      toast.success('Settings updated successfully!');
    },
  });

  const researchTrendsMutation = useMutation({
    mutationFn: () => autopilotAPI.researchTrends(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trends'] });
      toast.success('Trends researched successfully!');
    },
  });

  const generateContentMutation = useMutation({
    mutationFn: (topic: string) => autopilotAPI.generateContent({ topic }),
    onSuccess: (response) => {
      toast.success('Content ideas generated!');
      console.log(response.data.data);
    },
  });

  const generateHashtagsMutation = useMutation({
    mutationFn: (content: string) => autopilotAPI.generateHashtags({ content }),
    onSuccess: (response) => {
      toast.success('Hashtags generated!');
      console.log(response.data.data);
    },
  });

  const scheduleAutoPostsMutation = useMutation({
    mutationFn: () => autopilotAPI.scheduleAutoPosts(selectedAccount),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-posts'] });
      toast.success('Auto-posts scheduled!');
    },
  });

  const handleToggleAutopilot = async (enabled: boolean) => {
    await updateSettingsMutation.mutateAsync({
      ...settings,
      autoPostEnabled: enabled,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-800">Autopilot</h1>
        <p className="text-gray-600 mt-1">Automate your content strategy with AI</p>
      </div>

      <div className="card">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Facebook Account
        </label>
        <select
          value={selectedAccount}
          onChange={(e) => setSelectedAccount(e.target.value)}
          className="input"
        >
          <option value="">Choose an account...</option>
          {accounts?.map((account: any) => (
            <option key={account.id} value={account.id}>
              {account.name} - {account.pageName || 'No page connected'}
            </option>
          ))}
        </select>
      </div>

      {selectedAccount && settings && (
        <>
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Autopilot Settings</h2>
              <button
                onClick={() => handleToggleAutopilot(!settings.autoPostEnabled)}
                className={`px-4 py-2 rounded-lg font-medium ${
                  settings.autoPostEnabled
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-200 text-gray-700'
                }`}
              >
                {settings.autoPostEnabled ? 'Enabled' : 'Disabled'}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Posts Per Day
                </label>
                <input
                  type="number"
                  value={settings.postsPerDay}
                  onChange={(e) =>
                    updateSettingsMutation.mutate({
                      ...settings,
                      postsPerDay: parseInt(e.target.value),
                    })
                  }
                  className="input"
                  min="1"
                  max="10"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Posting Strategy
                </label>
                <select
                  value={settings.postingStrategy}
                  onChange={(e) =>
                    updateSettingsMutation.mutate({
                      ...settings,
                      postingStrategy: e.target.value,
                    })
                  }
                  className="input"
                >
                  <option value="conservative">Conservative</option>
                  <option value="moderate">Moderate</option>
                  <option value="aggressive">Aggressive</option>
                </select>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.contentResearchEnabled}
                  onChange={(e) =>
                    updateSettingsMutation.mutate({
                      ...settings,
                      contentResearchEnabled: e.target.checked,
                    })
                  }
                  className="rounded"
                />
                <span className="text-sm">Content Research</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.autoHashtags}
                  onChange={(e) =>
                    updateSettingsMutation.mutate({
                      ...settings,
                      autoHashtags: e.target.checked,
                    })
                  }
                  className="rounded"
                />
                <span className="text-sm">Auto Hashtags</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.performancePrediction}
                  onChange={(e) =>
                    updateSettingsMutation.mutate({
                      ...settings,
                      performancePrediction: e.target.checked,
                    })
                  }
                  className="rounded"
                />
                <span className="text-sm">Performance Prediction</span>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card">
              <div className="flex items-center gap-2 mb-4">
                <FaLightbulb className="text-yellow-500" size={24} />
                <h2 className="text-xl font-bold">Trending Topics</h2>
              </div>
              
              <button
                onClick={() => researchTrendsMutation.mutate()}
                disabled={researchTrendsMutation.isPending}
                className="btn-primary w-full mb-4"
              >
                {researchTrendsMutation.isPending ? 'Researching...' : 'Research New Trends'}
              </button>

              <div className="space-y-3 max-h-96 overflow-y-auto">
                {trends?.map((trend: any) => (
                  <div key={trend.id} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-start">
                      <h3 className="font-semibold">{trend.topic}</h3>
                      <span className="text-sm bg-primary-100 text-primary-700 px-2 py-1 rounded">
                        Score: {trend.trendScore}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{trend.description}</p>
                    <div className="flex gap-2 mt-2 flex-wrap">
                      {trend.suggestedHashtags?.slice(0, 3).map((tag: string, i: number) => (
                        <span key={i} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <div className="flex items-center gap-2 mb-4">
                <FaRobot className="text-purple-500" size={24} />
                <h2 className="text-xl font-bold">Content Generator</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Topic
                  </label>
                  <input
                    type="text"
                    value={contentTopic}
                    onChange={(e) => setContentTopic(e.target.value)}
                    className="input"
                    placeholder="e.g., Social media marketing tips"
                  />
                </div>

                <button
                  onClick={() => generateContentMutation.mutate(contentTopic)}
                  disabled={generateContentMutation.isPending || !contentTopic}
                  className="btn-primary w-full"
                >
                  {generateContentMutation.isPending ? 'Generating...' : 'Generate Content Ideas'}
                </button>

                <div className="border-t pt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Generate Hashtags
                  </label>
                  <textarea
                    value={contentText}
                    onChange={(e) => setContentText(e.target.value)}
                    className="input"
                    rows={3}
                    placeholder="Enter your content text..."
                  />
                  <button
                    onClick={() => generateHashtagsMutation.mutate(contentText)}
                    disabled={generateHashtagsMutation.isPending || !contentText}
                    className="btn-secondary w-full mt-2"
                  >
                    <FaHashtag className="inline mr-2" />
                    {generateHashtagsMutation.isPending ? 'Generating...' : 'Generate Hashtags'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <FaCalendar className="text-green-500" size={24} />
                <h2 className="text-xl font-bold">Scheduled Posts</h2>
              </div>
              <button
                onClick={() => scheduleAutoPostsMutation.mutate()}
                disabled={scheduleAutoPostsMutation.isPending}
                className="btn-primary"
              >
                {scheduleAutoPostsMutation.isPending ? 'Scheduling...' : 'Schedule Auto Posts'}
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">Scheduled For</th>
                    <th className="text-left py-3 px-4">Content Preview</th>
                    <th className="text-left py-3 px-4">Type</th>
                    <th className="text-left py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {scheduledPosts?.map((post: any) => (
                    <tr key={post.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        {new Date(post.scheduledFor).toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        {post.content.substring(0, 50)}...
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                          {post.contentType}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">
                          {post.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Autopilot;
