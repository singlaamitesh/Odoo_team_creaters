import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import { skillsAPI, usersAPI } from '../services/api';
import { Plus, Edit2, Trash2, MapPin, Clock, Star } from 'lucide-react';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import SkillTag from '../components/profile/SkillTag';
import LoadingSpinner from '../components/ui/LoadingSpinner';

interface Skill {
  id: number;
  name: string;
  type: 'offered' | 'wanted';
  description?: string;
  proficiency_level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
}

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const { addNotification } = useNotifications();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isAddingSkill, setIsAddingSkill] = useState(false);
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null);
  const [userRatings, setUserRatings] = useState<any>(null);

  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    location: user?.location || '',
    availability: user?.availability || 'weekends',
    is_public: user?.is_public || true
  });

  const [skillForm, setSkillForm] = useState({
    name: '',
    type: 'offered' as 'offered' | 'wanted',
    description: '',
    proficiency_level: 'intermediate' as 'beginner' | 'intermediate' | 'advanced' | 'expert'
  });

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const [skillsResponse, ratingsResponse] = await Promise.all([
        skillsAPI.getSkills(),
        user ? fetch(`/api/ratings/user/${user.id}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }).then(res => res.json()) : Promise.resolve(null)
      ]);

      setSkills(skillsResponse.data);
      setUserRatings(ratingsResponse);
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to load profile data'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await usersAPI.updateProfile(profileForm);
      updateUser(profileForm);
      setIsEditingProfile(false);
      addNotification({
        type: 'success',
        title: 'Success',
        message: 'Profile updated successfully'
      });
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to update profile'
      });
    }
  };

  const handleSkillSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingSkill) {
        await skillsAPI.updateSkill(editingSkill.id, skillForm);
        setSkills(prev => prev.map(skill => 
          skill.id === editingSkill.id ? { ...skill, ...skillForm } : skill
        ));
        addNotification({
          type: 'success',
          title: 'Success',
          message: 'Skill updated successfully'
        });
      } else {
        const response = await skillsAPI.addSkill(skillForm);
        setSkills(prev => [...prev, response.data.skill]);
        addNotification({
          type: 'success',
          title: 'Success',
          message: 'Skill added successfully'
        });
      }
      
      setIsAddingSkill(false);
      setEditingSkill(null);
      setSkillForm({
        name: '',
        type: 'offered',
        description: '',
        proficiency_level: 'intermediate'
      });
    } catch (error: any) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: error.response?.data?.error || 'Failed to save skill'
      });
    }
  };

  const handleDeleteSkill = async (skillId: number) => {
    if (!confirm('Are you sure you want to delete this skill?')) return;

    try {
      await skillsAPI.deleteSkill(skillId);
      setSkills(prev => prev.filter(skill => skill.id !== skillId));
      addNotification({
        type: 'success',
        title: 'Success',
        message: 'Skill deleted successfully'
      });
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to delete skill'
      });
    }
  };

  const openEditSkill = (skill: Skill) => {
    setSkillForm({
      name: skill.name,
      type: skill.type,
      description: skill.description || '',
      proficiency_level: skill.proficiency_level
    });
    setEditingSkill(skill);
    setIsAddingSkill(true);
  };

  if (loading) {
    return <LoadingSpinner className="min-h-screen" />;
  }

  const offeredSkills = skills.filter(skill => skill.type === 'offered');
  const wantedSkills = skills.filter(skill => skill.type === 'wanted');

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Profile Header */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
          <Button
            onClick={() => setIsEditingProfile(true)}
            icon={Edit2}
            variant="outline"
          >
            Edit Profile
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="flex items-center space-x-4 mb-4">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center">
                <span className="text-primary-600 font-bold text-2xl">
                  {user?.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <h2 className="text-2xl font-semibold text-gray-900">{user?.name}</h2>
                <p className="text-gray-600">{user?.email}</p>
              </div>
            </div>

            <div className="space-y-2 text-sm text-gray-600">
              {user?.location && (
                <div className="flex items-center space-x-2">
                  <MapPin className="w-4 h-4" />
                  <span>{user.location}</span>
                </div>
              )}
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4" />
                <span>Available: {user?.availability}</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`w-2 h-2 rounded-full ${user?.is_public ? 'bg-green-500' : 'bg-gray-400'}`} />
                <span>{user?.is_public ? 'Public Profile' : 'Private Profile'}</span>
              </div>
            </div>
          </div>

          {userRatings && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Ratings & Reviews</h3>
              {userRatings.avg_rating ? (
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Star className="w-5 h-5 text-yellow-400 fill-current" />
                    <span className="text-xl font-bold text-gray-900">
                      {userRatings.avg_rating}
                    </span>
                    <span className="text-gray-600">
                      ({userRatings.total_ratings} {userRatings.total_ratings === 1 ? 'review' : 'reviews'})
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-gray-600">No ratings yet</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Skills Section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold text-gray-900">My Skills</h2>
          <Button
            onClick={() => setIsAddingSkill(true)}
            icon={Plus}
          >
            Add Skill
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Offered Skills */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              Skills I Offer ({offeredSkills.length})
            </h3>
            {offeredSkills.length > 0 ? (
              <div className="space-y-3">
                {offeredSkills.map((skill) => (
                  <div key={skill.id} className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <SkillTag skill={skill.name} type="offered" />
                      <div className="flex space-x-1">
                        <button
                          onClick={() => openEditSkill(skill)}
                          className="p-1 text-gray-400 hover:text-primary-600 transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteSkill(skill.id)}
                          className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-1">
                      Level: <span className="font-medium">{skill.proficiency_level}</span>
                    </p>
                    {skill.description && (
                      <p className="text-sm text-gray-700">{skill.description}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 italic">No skills offered yet</p>
            )}
          </div>

          {/* Wanted Skills */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              Skills I Want ({wantedSkills.length})
            </h3>
            {wantedSkills.length > 0 ? (
              <div className="space-y-3">
                {wantedSkills.map((skill) => (
                  <div key={skill.id} className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <SkillTag skill={skill.name} type="wanted" />
                      <div className="flex space-x-1">
                        <button
                          onClick={() => openEditSkill(skill)}
                          className="p-1 text-gray-400 hover:text-primary-600 transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteSkill(skill.id)}
                          className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-1">
                      Desired level: <span className="font-medium">{skill.proficiency_level}</span>
                    </p>
                    {skill.description && (
                      <p className="text-sm text-gray-700">{skill.description}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 italic">No skills wanted yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      <Modal
        isOpen={isEditingProfile}
        onClose={() => setIsEditingProfile(false)}
        title="Edit Profile"
      >
        <form onSubmit={handleProfileSubmit} className="space-y-4">
          <Input
            label="Name"
            value={profileForm.name}
            onChange={(e) => setProfileForm(prev => ({ ...prev, name: e.target.value }))}
            required
          />
          
          <Input
            label="Location"
            value={profileForm.location}
            onChange={(e) => setProfileForm(prev => ({ ...prev, location: e.target.value }))}
            placeholder="City, Country"
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Availability
            </label>
            <select
              value={profileForm.availability}
              onChange={(e) => setProfileForm(prev => ({ ...prev, availability: e.target.value }))}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="weekdays">Weekdays</option>
              <option value="weekends">Weekends</option>
              <option value="evenings">Evenings</option>
              <option value="flexible">Flexible</option>
            </select>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              checked={profileForm.is_public}
              onChange={(e) => setProfileForm(prev => ({ ...prev, is_public: e.target.checked }))}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <label className="ml-2 block text-sm text-gray-700">
              Make my profile public
            </label>
          </div>

          <div className="flex space-x-3 pt-4">
            <Button type="submit" className="flex-1">
              Save Changes
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEditingProfile(false)}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add/Edit Skill Modal */}
      <Modal
        isOpen={isAddingSkill}
        onClose={() => {
          setIsAddingSkill(false);
          setEditingSkill(null);
          setSkillForm({
            name: '',
            type: 'offered',
            description: '',
            proficiency_level: 'intermediate'
          });
        }}
        title={editingSkill ? 'Edit Skill' : 'Add New Skill'}
      >
        <form onSubmit={handleSkillSubmit} className="space-y-4">
          <Input
            label="Skill Name"
            value={skillForm.name}
            onChange={(e) => setSkillForm(prev => ({ ...prev, name: e.target.value }))}
            placeholder="e.g., JavaScript, Photography, Guitar"
            required
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type
            </label>
            <select
              value={skillForm.type}
              onChange={(e) => setSkillForm(prev => ({ ...prev, type: e.target.value as 'offered' | 'wanted' }))}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="offered">I can teach this</option>
              <option value="wanted">I want to learn this</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Proficiency Level
            </label>
            <select
              value={skillForm.proficiency_level}
              onChange={(e) => setSkillForm(prev => ({ ...prev, proficiency_level: e.target.value as any }))}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
              <option value="expert">Expert</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description (Optional)
            </label>
            <textarea
              value={skillForm.description}
              onChange={(e) => setSkillForm(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe your experience or what you'd like to learn..."
              rows={3}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          <div className="flex space-x-3 pt-4">
            <Button type="submit" className="flex-1">
              {editingSkill ? 'Update Skill' : 'Add Skill'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsAddingSkill(false);
                setEditingSkill(null);
              }}
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