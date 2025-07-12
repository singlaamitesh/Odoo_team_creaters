import React, { useState, useEffect } from 'react';
import { swapsAPI, ratingsAPI } from '../services/api';
import { useNotifications } from '../contexts/NotificationContext';
import { RefreshCw, Clock, CheckCircle, XCircle, Star, MessageCircle, Calendar } from 'lucide-react';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import LoadingSpinner from '../components/ui/LoadingSpinner';

interface SwapRequest {
  id: number;
  requester_id: number;
  provider_id: number;
  offered_skill_name: string;
  wanted_skill_name: string;
  requester_name: string;
  provider_name: string;
  status: 'pending' | 'accepted' | 'rejected' | 'completed' | 'cancelled';
  message?: string;
  created_at: string;
  updated_at: string;
  is_requester: boolean; // Whether the current user is the requester
}

export default function SwapRequestsPage() {
  const [swapRequests, setSwapRequests] = useState<SwapRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'sent' | 'received'>('sent');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [ratingModal, setRatingModal] = useState<{ isOpen: boolean; swapId: number | null }>({
    isOpen: false,
    swapId: null
  });
  const [ratingForm, setRatingForm] = useState({ rating: 5, feedback: '' });
  const { addNotification } = useNotifications();

  useEffect(() => {
    fetchSwapRequests();
  }, [filter, statusFilter]);

  const fetchSwapRequests = async () => {
    try {
      setLoading(true);
      const params: any = {};
      
      // Always filter by the selected type (sent or received)
      params.type = filter;
      
      // Apply status filter if selected
      if (statusFilter) {
        params.status = statusFilter;
      }

      const response = await swapsAPI.getSwapRequests(params);
      
      // Map the API response to match our frontend interface
      const mappedSwaps = response.data.map((swap: any) => ({
        ...swap,
        requester_name: swap.requesterName,
        provider_name: swap.providerName,
        requester_id: swap.requesterId,
        provider_id: swap.providerId,
        offered_skill_name: swap.offeredSkillName,
        wanted_skill_name: swap.wantedSkillName,
        created_at: swap.createdAt,
        updated_at: swap.updatedAt,
        // Add a field to identify if the current user is the requester
        is_requester: swap.requesterId === parseInt(localStorage.getItem('userId') || '0')
      }));
      
      // If 'all' is selected, we need to ensure we're showing both sent and received requests
      // The backend should handle this with the type parameter, but we'll double-check here
      setSwapRequests(mappedSwaps);
      
      // Log for debugging
      console.log('Fetched swaps:', {
        filter,
        statusFilter,
        params,
        mappedSwaps: mappedSwaps.map(s => ({
          id: s.id,
          requester: s.requester_name,
          provider: s.provider_name,
          is_requester: s.is_requester,
          status: s.status
        }))
      });
      
    } catch (error) {
      console.error('Error fetching swap requests:', error);
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to fetch swap requests'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (swapId: number, status: string) => {
    try {
      await swapsAPI.updateSwapStatus(swapId, { status });
      
      setSwapRequests(prev => prev.map(swap => 
        swap.id === swapId ? { 
          ...swap, 
          status: status as any, 
          updated_at: new Date().toISOString() 
        } : swap
      ));
      
      addNotification({
        type: 'success',
        title: 'Success',
        message: `Swap request ${status} successfully`
      });
    } catch (error: any) {
      console.error('Error updating swap status:', error);
      
      addNotification({
        type: 'error',
        title: 'Error',
        message: error.response?.data?.error || `Failed to ${status} swap request`
      });
    }
  };

  const handleDeleteRequest = async (swapId: number) => {
    if (!confirm('Are you sure you want to delete this swap request?')) return;

    try {
      await swapsAPI.deleteSwapRequest(swapId);
      setSwapRequests(prev => prev.filter(swap => swap.id !== swapId));
      
      addNotification({
        type: 'success',
        title: 'Success',
        message: 'Swap request deleted successfully'
      });
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to delete swap request'
      });
    }
  };

  const handleRatingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ratingModal.swapId) return;

    try {
      console.log('Submitting rating for swap:', ratingModal.swapId);
      console.log('Rating data:', ratingForm);
      
      // Make sure we're sending the correct data format
      const ratingData = {
        rating: ratingForm.rating,
        feedback: ratingForm.feedback || undefined // Send undefined instead of empty string
      };

      await ratingsAPI.addRating(ratingModal.swapId, ratingData);
      
      // Reset form and close modal
      setRatingForm({ rating: 5, feedback: '' });
      setRatingModal({ isOpen: false, swapId: null });
      
      // Refresh the swap requests to show the updated status
      fetchSwapRequests();
      
      addNotification({
        type: 'success',
        title: 'Success',
        message: 'Rating submitted successfully'
      });
    } catch (error: any) {
      console.error('Error submitting rating:', error);
      console.error('Error details:', error.response?.data);
      
      addNotification({
        type: 'error',
        title: 'Error',
        message: error.response?.data?.error || 'Failed to submit rating. Please try again.'
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'accepted':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-blue-500" />;
      case 'rejected':
      case 'cancelled':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  // Format date to a readable format
  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { 
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Kolkata', // Set to Indian Standard Time
      timeZoneName: 'short' // This will show 'IST' in the output
    };
    
    try {
      // Convert the date string to a Date object
      const date = new Date(dateString);
      
      // Format the date in Indian timezone
      return date.toLocaleString('en-IN', options);
    } catch (error) {
      console.error('Error formatting date:', error);
      return dateString; // Return original string if there's an error
    }
  };

  // Get status label with proper capitalization
  const getStatusLabel = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  // Get appropriate styling for status badges
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
      case 'accepted':
        return 'bg-green-100 text-green-800 border border-green-200';
      case 'completed':
        return 'bg-blue-100 text-blue-800 border border-blue-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border border-red-200';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800 border border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border border-gray-200';
    }
  };

  if (loading) {
    return <LoadingSpinner className="min-h-screen" />;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Swap Requests</h1>
        <Button onClick={fetchSwapRequests} icon={RefreshCw} variant="outline">
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Request Type
            </label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as 'sent' | 'received')}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="sent">Sent by Me</option>
              <option value="received">Received by Me</option>
            </select>
          </div>

          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="accepted">Accepted</option>
              <option value="completed">Completed</option>
              <option value="rejected">Rejected</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Swap Requests */}
      {swapRequests.length > 0 ? (
        <div className="space-y-4">
          {swapRequests.map((swap) => (
            <div key={swap.id} className="bg-white rounded-lg shadow-md p-6">
              <div className="space-y-4">
                {/* Header with skill swap and status */}
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="space-y-1">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {swap.offered_skill_name} ↔ {swap.wanted_skill_name}
                    </h3>
                    <div className="space-y-2">
                      {filter === 'sent' ? (
                        // For sent requests (you are the requester)
                        <>
                          <p className="text-sm text-gray-700">
                            You want to learn <span className="font-medium text-blue-600">{swap.wanted_skill_name}</span> from 
                            <span className="font-medium"> {swap.provider_name}</span>
                          </p>
                          <p className="text-sm text-gray-700">
                            You will teach them: <span className="font-medium text-blue-600">{swap.offered_skill_name}</span>
                          </p>
                        </>
                      ) : (
                        // For received requests (you are the provider)
                        <>
                          <p className="text-sm text-gray-700">
                            <span className="font-medium">{swap.requester_name}</span> wants to learn 
                            <span className="font-medium text-blue-600"> {swap.wanted_skill_name}</span> from you
                          </p>
                          <p className="text-sm text-gray-700">
                            They will teach you: <span className="font-medium text-blue-600">{swap.offered_skill_name}</span>
                          </p>
                        </>
                      )}
                      <p className="text-sm text-gray-600">
                        Status: <span className="font-medium">{getStatusLabel(swap.status)}</span>
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                      <div className="flex items-center">
                        <Calendar className="w-3.5 h-3.5 mr-1 flex-shrink-0" />
                        <span>Created: {formatDate(swap.created_at)}</span>
                      </div>
                      <div className="flex items-center">
                        <RefreshCw className="w-3.5 h-3.5 mr-1 flex-shrink-0" />
                        <span>Updated: {formatDate(swap.updated_at)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(swap.status)}`}>
                      {getStatusLabel(swap.status)}
                    </span>
                    {getStatusIcon(swap.status)}
                  </div>
                </div>

                {/* Message if available */}
                {swap.message && (
                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <p className="text-sm text-gray-700 flex items-start">
                      <MessageCircle className="w-4 h-4 mt-0.5 mr-2 flex-shrink-0" />
                      <span>{swap.message}</span>
                    </p>
                  </div>
                )}
              </div>

              {/* Actions */}

              {/* Actions */}
              <div className="flex flex-wrap gap-2">
                {swap.status === 'pending' && (
                  <div className="flex items-center gap-2">
                    {/* Show delete button for sent requests */}
                    {filter === 'sent' && (
                      <>
                        <Button
                          onClick={() => handleDeleteRequest(swap.id)}
                          size="sm"
                          variant="outline"
                          className="border-red-200 text-red-700 hover:bg-red-50"
                        >
                          Delete Request
                        </Button>
                      </>
                    )}
                    
                    {/* Show accept/reject for received requests */}
                    {filter === 'received' && (
                      <>
                        <Button
                          onClick={() => handleStatusUpdate(swap.id, 'accepted')}
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                        >
                          Accept
                        </Button>
                        <Button
                          onClick={() => handleStatusUpdate(swap.id, 'rejected')}
                          size="sm"
                          variant="danger"
                        >
                          Reject
                        </Button>
                      </>
                    )}
                  </div>
                )}

                {swap.status === 'accepted' && (
                  <Button
                    onClick={() => handleStatusUpdate(swap.id, 'completed')}
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    Mark as Completed
                  </Button>
                )}

                {swap.status === 'completed' && (
                  <Button
                    onClick={() => setRatingModal({ isOpen: true, swapId: swap.id })}
                    size="sm"
                    icon={Star}
                    variant="outline"
                  >
                    Rate Experience
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <RefreshCw className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            No swap requests found
          </h3>
          <p className="text-gray-600">
            {filter === 'sent' 
              ? "You haven't sent any swap requests yet"
              : filter === 'received'
              ? "You haven't received any swap requests yet"
              : "No swap requests available"
            }
          </p>
        </div>
      )}

      {/* Rating Modal */}
      <Modal
        isOpen={ratingModal.isOpen}
        onClose={() => setRatingModal({ isOpen: false, swapId: null })}
        title="Rate Your Experience"
      >
        <form onSubmit={handleRatingSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Rating
            </label>
            <div className="flex space-x-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRatingForm(prev => ({ ...prev, rating: star }))}
                  className={`w-8 h-8 ${
                    star <= ratingForm.rating ? 'text-yellow-400' : 'text-gray-300'
                  } hover:text-yellow-400 transition-colors`}
                >
                  <Star className="w-full h-full fill-current" />
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Feedback (Optional)
            </label>
            <textarea
              value={ratingForm.feedback}
              onChange={(e) => setRatingForm(prev => ({ ...prev, feedback: e.target.value }))}
              placeholder="Share your experience..."
              rows={3}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          <div className="flex space-x-3 pt-4">
            <Button type="submit" className="flex-1">
              Submit Rating
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setRatingModal({ isOpen: false, swapId: null })}
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