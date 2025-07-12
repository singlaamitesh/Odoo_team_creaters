import React, { useState, useEffect } from 'react';
import { Search, Filter, Users, TrendingUp } from 'lucide-react';
import { usersAPI, skillsAPI } from '../services/api';
import { useNotifications } from '../contexts/NotificationContext';
import ProfileCard from '../components/profile/ProfileCard';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import LoadingSpinner from '../components/ui/LoadingSpinner';

interface User {
  id: number;
  name: string;
  location?: string;
  profile_photo?: string;
  availability: string;
  offered_skills: string[];
  wanted_skills: string[];
  avg_rating: number | null;
  total_ratings: number;
}

interface PopularSkill {
  name: string;
  count: number;
}

export default function HomePage() {
  const [users, setUsers] = useState<User[]>([]);
  const [popularSkills, setPopularSkills] = useState<PopularSkill[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchLoading, setSearchLoading] = useState(false);
  const { addNotification } = useNotifications();

  const USERS_PER_PAGE = 12;

  useEffect(() => {
    fetchUsers();
    fetchPopularSkills();
  }, [currentPage]);

  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      if (searchTerm !== '') {
        handleSearch();
      } else {
        fetchUsers();
      }
    }, 500);

    return () => clearTimeout(delayedSearch);
  }, [searchTerm]);

  const fetchUsers = async () => {
    try {
      setSearchLoading(true);
      const response = await usersAPI.searchUsers({
        page: currentPage,
        limit: USERS_PER_PAGE,
        ...(searchTerm && { skill: searchTerm })
      });

      setUsers(response.data.users);
      setTotalPages(response.data.pagination.totalPages);
    } catch (error: any) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to fetch users'
      });
    } finally {
      setLoading(false);
      setSearchLoading(false);
    }
  };

  const fetchPopularSkills = async () => {
    try {
      const response = await skillsAPI.getPopularSkills();
      setPopularSkills(response.data.slice(0, 10));
    } catch (error) {
      console.error('Failed to fetch popular skills:', error);
    }
  };

  const handleSearch = () => {
    setCurrentPage(1);
    fetchUsers();
  };

  const handleSkillClick = (skillName: string) => {
    setSearchTerm(skillName);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) {
    return <LoadingSpinner className="min-h-screen" />;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Discover Skills & Connect
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Find people with the skills you need and share your expertise with others.
          Build meaningful connections through skill exchange.
        </p>
      </div>

      {/* Search Section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="flex-1 w-full">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                type="text"
                placeholder="Search by skill (e.g., JavaScript, Photography, Guitar)"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <Button
            onClick={handleSearch}
            loading={searchLoading}
            icon={Search}
            className="w-full md:w-auto"
          >
            Search
          </Button>
        </div>

        {/* Popular Skills */}
        {popularSkills.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center space-x-2 mb-3">
              <TrendingUp className="w-5 h-5 text-primary-600" />
              <h3 className="text-lg font-semibold text-gray-900">Popular Skills</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {popularSkills.map((skill) => (
                <button
                  key={skill.name}
                  onClick={() => handleSkillClick(skill.name)}
                  className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm hover:bg-primary-200 transition-colors"
                >
                  {skill.name} ({skill.count})
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Users className="w-5 h-5 text-gray-600" />
          <h2 className="text-2xl font-semibold text-gray-900">
            {searchTerm ? `Search Results for "${searchTerm}"` : 'All Users'}
          </h2>
        </div>
        <span className="text-gray-600">
          {users.length} {users.length === 1 ? 'user' : 'users'} found
        </span>
      </div>

      {/* Users Grid */}
      {searchLoading ? (
        <LoadingSpinner className="py-12" />
      ) : users.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {users.map((user) => (
            <ProfileCard key={user.id} user={user} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            No users found
          </h3>
          <p className="text-gray-600">
            {searchTerm 
              ? `No users found with skills matching "${searchTerm}"`
              : 'No users available at the moment'
            }
          </p>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center space-x-2">
          <Button
            variant="outline"
            onClick={() => handlePageChange(currentPage - 1)}
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
                onClick={() => handlePageChange(page)}
              >
                {page}
              </Button>
            );
          })}
          
          <Button
            variant="outline"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}