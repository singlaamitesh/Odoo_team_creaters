import React, { useState, useEffect } from 'react';
import { adminAPI } from '../services/api';
import { useNotifications } from '../contexts/NotificationContext';
import { 
  Users, 
  RefreshCw, 
  Ban, 
  CheckCircle, 
  BarChart3, 
  MessageSquare,
  Search,
  Download
} from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import LoadingSpinner from '../components/ui/LoadingSpinner';

interface AdminUser {
  id: number;
  email: string;
  name: string;
  location?: string;
  is_public: boolean;
  is_banned: boolean;
  created_at: string;
  skills_count: number;
  swap_requests_count: number;
  avg_rating: number | null;
}

interface AdminSwap {
  id: number;
  requester_name: string;
  requester_email: string;
  provider_name: string;
  provider_email: string;
  offered_skill_name: string;
  wanted_skill_name: string;
  status: string;
  created_at: string;
}

interface PlatformStats {
  total_users: { count: number };
  active_users: { count: number };
  total_skills: { count: number };
  total_swaps: { count: number };
  pending_swaps: { count: number };
  completed_swaps: { count: number };
  total_ratings: { count: number };
  avg_platform_rating: { avg: number | null };
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'users' | 'swaps' | 'stats' | 'messages'>('stats');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [swaps, setSwaps] = useState<AdminSwap[]>([]);
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [messageForm, setMessageForm] = useState({
    title: '',
    content: '',
    type: 'announcement' as 'announcement' | 'maintenance' | 'update'
  });
  const { addNotification } = useNotifications();

  useEffect(() => {
    fetchData();
  }, [activeTab, currentPage, searchTerm]);

  const fetchData = async () => {
    setLoading(true);
    try {
      switch (activeTab) {
        case 'users':
          await fetchUsers();
          break;
        case 'swaps':
          await fetchSwaps();
          break;
        case 'stats':
          await fetchStats();
          break;
      }
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to fetch data'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    const response = await adminAPI.getUsers({
      page: currentPage,
      limit: 20,
      ...(searchTerm && { search: searchTerm })
    });
    setUsers(response.data.users);
    setTotalPages(response.data.pagination.totalPages);
  };

  const fetchSwaps = async () => {
    const response = await adminAPI.getSwaps({
      page: currentPage,
      limit: 20
    });
    setSwaps(response.data.swaps);
    setTotalPages(response.data.pagination.totalPages);
  };

  const fetchStats = async () => {
    const response = await adminAPI.getStats();
    setStats(response.data);
  };

  const handleBanUser = async (userId: number, isBanned: boolean) => {
    try {
      await adminAPI.banUser(userId, isBanned);
      setUsers(prev => prev.map(user => 
        user.id === userId ? { ...user, is_banned: isBanned } : user
      ));
      addNotification({
        type: 'success',
        title: 'Success',
        message: `User ${isBanned ? 'banned' : 'unbanned'} successfully`
      });
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: `Failed to ${isBanned ? 'ban' : 'unban'} user`
      });
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await adminAPI.sendMessage(messageForm);
      setIsMessageModalOpen(false);
      setMessageForm({ title: '', content: '', type: 'announcement' });
      addNotification({
        type: 'success',
        title: 'Success',
        message: 'Platform message sent successfully'
      });
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to send message'
      });
    }
  };

  const exportData = () => {
    const data = activeTab === 'users' ? users : swaps;
    const csv = [
      Object.keys(data[0] || {}).join(','),
      ...data.map(row => Object.values(row).join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeTab}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const tabs = [
    { id: 'stats', label: 'Statistics', icon: BarChart3 },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'swaps', label: 'Swaps', icon: RefreshCw },
    { id: 'messages', label: 'Messages', icon: MessageSquare },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <div className="flex space-x-2">
          <Button
            onClick={() => setIsMessageModalOpen(true)}
            icon={MessageSquare}
            variant="outline"
          >
            Send Message
          </Button>
          {(activeTab === 'users' || activeTab === 'swaps') && (
            <Button
              onClick={exportData}
              icon={Download}
              variant="outline"
            >
              Export Data
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => {
                  setActiveTab(id as any);
                  setCurrentPage(1);
                }}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {loading ? (
            <LoadingSpinner className="py-12" />
          ) : (
            <>
              {/* Statistics Tab */}
              {activeTab === 'stats' && stats && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-blue-50 rounded-lg p-6">
                    <div className="flex items-center">
                      <Users className="w-8 h-8 text-blue-600" />
                      <div className="ml-4">
                        <p className="text-sm font-medium text-blue-600">Total Users</p>
                        <p className="text-2xl font-semibold text-gray-900">
                          {stats.total_users.count}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-green-50 rounded-lg p-6">
                    <div className="flex items-center">
                      <CheckCircle className="w-8 h-8 text-green-600" />
                      <div className="ml-4">
                        <p className="text-sm font-medium text-green-600">Active Users</p>
                        <p className="text-2xl font-semibold text-gray-900">
                          {stats.active_users.count}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-purple-50 rounded-lg p-6">
                    <div className="flex items-center">
                      <BarChart3 className="w-8 h-8 text-purple-600" />
                      <div className="ml-4">
                        <p className="text-sm font-medium text-purple-600">Total Skills</p>
                        <p className="text-2xl font-semibold text-gray-900">
                          {stats.total_skills.count}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-yellow-50 rounded-lg p-6">
                    <div className="flex items-center">
                      <RefreshCw className="w-8 h-8 text-yellow-600" />
                      <div className="ml-4">
                        <p className="text-sm font-medium text-yellow-600">Total Swaps</p>
                        <p className="text-2xl font-semibold text-gray-900">
                          {stats.total_swaps.count}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-orange-50 rounded-lg p-6">
                    <div className="flex items-center">
                      <div className="ml-4">
                        <p className="text-sm font-medium text-orange-600">Pending Swaps</p>
                        <p className="text-2xl font-semibold text-gray-900">
                          {stats.pending_swaps.count}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-indigo-50 rounded-lg p-6">
                    <div className="flex items-center">
                      <div className="ml-4">
                        <p className="text-sm font-medium text-indigo-600">Completed Swaps</p>
                        <p className="text-2xl font-semibold text-gray-900">
                          {stats.completed_swaps.count}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-pink-50 rounded-lg p-6">
                    <div className="flex items-center">
                      <div className="ml-4">
                        <p className="text-sm font-medium text-pink-600">Total Ratings</p>
                        <p className="text-2xl font-semibold text-gray-900">
                          {stats.total_ratings.count}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-teal-50 rounded-lg p-6">
                    <div className="flex items-center">
                      <div className="ml-4">
                        <p className="text-sm font-medium text-teal-600">Avg Rating</p>
                        <p className="text-2xl font-semibold text-gray-900">
                          {stats.avg_platform_rating.avg 
                            ? stats.avg_platform_rating.avg.toFixed(1)
                            : 'N/A'
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Users Tab */}
              {activeTab === 'users' && (
                <div className="space-y-4">
                  <div className="flex items-center space-x-4">
                    <div className="flex-1">
                      <Input
                        placeholder="Search users by name or email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        icon={Search}
                      />
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            User
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Stats
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {users.map((user) => (
                          <tr key={user.id}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {user.name}
                                </div>
                                <div className="text-sm text-gray-500">{user.email}</div>
                                {user.location && (
                                  <div className="text-sm text-gray-500">{user.location}</div>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              <div>Skills: {user.skills_count}</div>
                              <div>Swaps: {user.swap_requests_count}</div>
                              <div>
                                Rating: {user.avg_rating ? user.avg_rating.toFixed(1) : 'N/A'}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="space-y-1">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  user.is_banned 
                                    ? 'bg-red-100 text-red-800' 
                                    : 'bg-green-100 text-green-800'
                                }`}>
                                  {user.is_banned ? 'Banned' : 'Active'}
                                </span>
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  user.is_public 
                                    ? 'bg-blue-100 text-blue-800' 
                                    : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {user.is_public ? 'Public' : 'Private'}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <Button
                                onClick={() => handleBanUser(user.id, !user.is_banned)}
                                size="sm"
                                variant={user.is_banned ? "outline" : "danger"}
                                icon={user.is_banned ? CheckCircle : Ban}
                              >
                                {user.is_banned ? 'Unban' : 'Ban'}
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Swaps Tab */}
              {activeTab === 'swaps' && (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Swap Details
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Participants
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {swaps.map((swap) => (
                        <tr key={swap.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {swap.offered_skill_name} ↔ {swap.wanted_skill_name}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              <div>Requester: {swap.requester_name}</div>
                              <div>Provider: {swap.provider_name}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              swap.status === 'completed' ? 'bg-green-100 text-green-800' :
                              swap.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              swap.status === 'accepted' ? 'bg-blue-100 text-blue-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {swap.status.charAt(0).toUpperCase() + swap.status.slice(1)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(swap.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination */}
              {(activeTab === 'users' || activeTab === 'swaps') && totalPages > 1 && (
                <div className="flex justify-center space-x-2 mt-6">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const page = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                    return (
                      <Button
                        key={page}
                        variant={currentPage === page ? 'primary' : 'outline'}
                        onClick={() => setCurrentPage(page)}
                      >
                        {page}
                      </Button>
                    );
                  })}
                  
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Send Message Modal */}
      <Modal
        isOpen={isMessageModalOpen}
        onClose={() => setIsMessageModalOpen(false)}
        title="Send Platform Message"
      >
        <form onSubmit={handleSendMessage} className="space-y-4">
          <Input
            label="Title"
            value={messageForm.title}
            onChange={(e) => setMessageForm(prev => ({ ...prev, title: e.target.value }))}
            required
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type
            </label>
            <select
              value={messageForm.type}
              onChange={(e) => setMessageForm(prev => ({ ...prev, type: e.target.value as any }))}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="announcement">Announcement</option>
              <option value="maintenance">Maintenance</option>
              <option value="update">Update</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Content
            </label>
            <textarea
              value={messageForm.content}
              onChange={(e) => setMessageForm(prev => ({ ...prev, content: e.target.value }))}
              rows={4}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              required
            />
          </div>

          <div className="flex space-x-3 pt-4">
            <Button type="submit" className="flex-1">
              Send Message
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsMessageModalOpen(false)}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}