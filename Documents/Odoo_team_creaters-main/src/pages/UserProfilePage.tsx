import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { usersAPI, swapsAPI, ratingsAPI, skillsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import { MapPin, Clock, Star, MessageCircle, ArrowLeft } from 'lucide-react';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import SkillTag from '../components/profile/SkillTag';
import LoadingSpinner from '../components/ui/LoadingSpinner';

interface UserProfile {
  id: number;
  name: string;
  location?: string;
  profile_photo?: string;
  availability: string;
  skills: Array<{
    id: number;
    name: string;
    type: 'offered' | 'wanted';
    description?: string;
    proficiency_level: string;
  }>;
  avg_rating: number | null;
  total_ratings: number;
}

interface UserRatings {
  ratings: Array<{
    rating: number;
    feedback?: string;
    created_at: string;
    rater_name: string;
  }>;
  avg_rating: number | null;
  total_ratings: number;
}

export default function UserProfilePage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { addNotification } = useNotifications();
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [userRatings, setUserRatings] = useState<UserRatings | null>(null);
  const [mySkills, setMySkills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSwapModalOpen, setIsSwapModalOpen] = useState(false);
  const [swapForm, setSwapForm] = useState({
    offered_skill_id: '',
    wanted_skill_id: '',
    message: ''
  });

  useEffect(() => {
    if (id) {
      fetchUserProfile();
      fetchUserRatings();
      fetchMySkills();
    }

    // Auto-open swap modal if action=swap in URL
    if (searchParams.get('action') === 'swap') {
      setIsSwapModalOpen(true);
    }
  }, [id, searchParams]);

  const fetchUserProfile = async () => {
    try {
      const response = await usersAPI.getUserById(parseInt(id!));
      setProfile(response.data);
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to load user profile'
      });
    }
  };

  const fetchUserRatings = async () => {
    try {
      const response = await ratingsAPI.getUserRatings(parseInt(id!));
      setUserRatings(response.data);
    } catch (error) {
      console.error('Failed to fetch user ratings:', error);
    }
  };

  const fetchMySkills = async () => {
    try {
      const response = await skillsAPI.getSkills();
      setMySkills(response.data.filter((skill: any) => skill.type === 'offered'));
    } catch (error) {
      console.error('Failed to fetch my skills:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSwapRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!swapForm.offered_skill_id || !swapForm.wanted_skill_id) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Please select both skills for the swap'
      });
      return;
    }

    try {
      await swapsAPI.createSwapRequest({
        providerId: parseInt(id!),
        offeredSkillId: parseInt(swapForm.offered_skill_id),
        wantedSkillId: parseInt(swapForm.wanted_skill_id),
        message: swapForm.message
      });

      setIsSwapModalOpen(false);
      setSwapForm({ offered_skill_id: '', wanted_skill_id: '', message: '' });
      
      addNotification({
        type: 'success',
        title: 'Success',
        message: 'Swap request sent successfully!'
      });
    } catch (error: any) {
      console.error('Error creating swap request:', error);
      addNotification({
        type: 'error',
        title: 'Error',
        message: error.response?.data?.error || 'Failed to send swap request',
        details: error.response?.data?.details
      });
    }
  };

  if (loading) {
    return <LoadingSpinner className="min-h-screen" />;
  }

  if (!profile) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">User not found</h2>
        <p className="text-gray-600">The user profile you're looking for doesn't exist or is private.</p>
      </div>
    );
  }

  const offeredSkills = profile.skills.filter(skill => skill.type === 'offered');
  const wantedSkills = profile.skills.filter(skill => skill.type === 'wanted');

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Back Button */}
      <Button
        onClick={() => window.history.back()}
        variant="ghost"
        icon={ArrowLeft}
        className="mb-4"
      >
        Back
      </Button>

      {/* Profile Header */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center">
              {profile.profile_photo ? (
                <img
                  src={profile.profile_photo}
                  alt={profile.name}
                  className="w-16 h-16 rounded-full object-cover"
                />
              ) : (
                <span className="text-primary-600 font-bold text-2xl">
                  {profile.name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{profile.name}</h1>
              <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                {profile.location && (
                  <div className="flex items-center space-x-1">
                    <MapPin className="w-4 h-4" />
                    <span>{profile.location}</span>
                  </div>
                )}
                <div className="flex items-center space-x-1">
                  <Clock className="w-4 h-4" />
                  <span>Available: {profile.availability}</span>
                </div>
              </div>
            </div>
          </div>

          {user?.id !== profile.id && (
            <Button
              onClick={() => setIsSwapModalOpen(true)}
              icon={MessageCircle}
            >
              Request Swap
            </Button>
          )}
        </div>

        {/* Rating */}
        {profile.avg_rating && (
          <div className="flex items-center space-x-2 mb-4">
            <div className="flex items-center space-x-1">
              <Star className="w-5 h-5 text-yellow-400 fill-current" />
              <span className="text-lg font-semibold text-gray-900">
                {profile.avg_rating}
              </span>
            </div>
            <span className="text-gray-600">
              ({profile.total_ratings} {profile.total_ratings === 1 ? 'review' : 'reviews'})
            </span>
          </div>
        )}
      </div>

      {/* Skills */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Offered Skills */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Skills Offered ({offeredSkills.length})
          </h2>
          {offeredSkills.length > 0 ? (
            <div className="space-y-3">
              {offeredSkills.map((skill) => (
                <div key={skill.id} className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <SkillTag skill={skill.name} type="offered" />
                    <span className="text-xs text-gray-600 font-medium">
                      {skill.proficiency_level}
                    </span>
                  </div>
                  {skill.description && (
                    <p className="text-sm text-gray-700">{skill.description}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 italic">No skills offered</p>
          )}
        </div>

        {/* Wanted Skills */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Skills Wanted ({wantedSkills.length})
          </h2>
          {wantedSkills.length > 0 ? (
            <div className="space-y-3">
              {wantedSkills.map((skill) => (
                <div key={skill.id} className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <SkillTag skill={skill.name} type="wanted" />
                    <span className="text-xs text-gray-600 font-medium">
                      Desired: {skill.proficiency_level}
                    </span>
                  </div>
                  {skill.description && (
                    <p className="text-sm text-gray-700">{skill.description}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 italic">No skills wanted</p>
          )}
        </div>
      </div>

      {/* Reviews */}
      {userRatings && userRatings.ratings.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Reviews ({userRatings.total_ratings})
          </h2>
          <div className="space-y-4">
            {userRatings.ratings.slice(0, 5).map((rating, index) => (
              <div key={index} className="border-b border-gray-200 pb-4 last:border-b-0">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <div className="flex">
                      {Array.from({ length: 5 }, (_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${
                            i < rating.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-sm font-medium text-gray-900">
                      {rating.rater_name}
                    </span>
                  </div>
                  <span className="text-sm text-gray-500">
                    {new Date(rating.created_at).toLocaleDateString()}
                  </span>
                </div>
                {rating.feedback && (
                  <p className="text-sm text-gray-700">{rating.feedback}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Swap Request Modal */}
      <Modal
        isOpen={isSwapModalOpen}
        onClose={() => setIsSwapModalOpen(false)}
        title={`Request Skill Swap with ${profile.name}`}
        size="lg"
      >
        <form onSubmit={handleSwapRequest} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              I can offer:
            </label>
            <select
              value={swapForm.offered_skill_id}
              onChange={(e) => setSwapForm(prev => ({ ...prev, offered_skill_id: e.target.value }))}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              required
            >
              <option value="">Select a skill you can teach</option>
              {mySkills.map((skill) => (
                <option key={skill.id} value={skill.id}>
                  {skill.name} ({skill.proficiency_level})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              I want to learn:
            </label>
            <select
              value={swapForm.wanted_skill_id}
              onChange={(e) => setSwapForm(prev => ({ ...prev, wanted_skill_id: e.target.value }))}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              required
            >
              <option value="">Select a skill you want to learn</option>
              {offeredSkills.map((skill) => (
                <option key={skill.id} value={skill.id}>
                  {skill.name} ({skill.proficiency_level})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Message (Optional)
            </label>
            <textarea
              value={swapForm.message}
              onChange={(e) => setSwapForm(prev => ({ ...prev, message: e.target.value }))}
              placeholder="Introduce yourself and explain what you'd like to learn..."
              rows={4}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          <div className="flex space-x-3 pt-4">
            <Button type="submit" className="flex-1">
              Send Swap Request
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsSwapModalOpen(false)}
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