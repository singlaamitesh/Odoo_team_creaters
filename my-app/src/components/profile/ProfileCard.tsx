import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Clock, Star, MessageCircle } from 'lucide-react';
import SkillTag from './SkillTag';
import Button from '../ui/Button';

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

interface ProfileCardProps {
  user: User;
}

export default function ProfileCard({ user }: ProfileCardProps) {
  const availabilityLabels: Record<string, string> = {
    weekdays: 'Weekdays',
    weekends: 'Weekends',
    evenings: 'Evenings',
    flexible: 'Flexible'
  };

  return (
    <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden">
      {/* Profile Header */}
      <div className="p-6">
        <div className="flex items-center space-x-4 mb-4">
          <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
            {user.profile_photo ? (
              <img
                src={user.profile_photo}
                alt={user.name}
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <span className="text-primary-600 font-semibold text-lg">
                {user.name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 truncate">
              {user.name}
            </h3>
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              {user.location && (
                <div className="flex items-center space-x-1">
                  <MapPin className="w-4 h-4" />
                  <span className="truncate">{user.location}</span>
                </div>
              )}
              <div className="flex items-center space-x-1">
                <Clock className="w-4 h-4" />
                <span>{availabilityLabels[user.availability] || user.availability}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Rating */}
        {user.avg_rating && (
          <div className="flex items-center space-x-2 mb-4">
            <div className="flex items-center space-x-1">
              <Star className="w-4 h-4 text-yellow-400 fill-current" />
              <span className="text-sm font-medium text-gray-900">
                {user.avg_rating}
              </span>
            </div>
            <span className="text-sm text-gray-600">
              ({user.total_ratings} {user.total_ratings === 1 ? 'review' : 'reviews'})
            </span>
          </div>
        )}

        {/* Skills Offered */}
        {user.offered_skills.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Offers</h4>
            <div className="flex flex-wrap gap-1">
              {user.offered_skills.slice(0, 3).map((skill) => (
                <SkillTag key={skill} skill={skill} type="offered" size="sm" />
              ))}
              {user.offered_skills.length > 3 && (
                <span className="text-xs text-gray-500 px-2 py-1">
                  +{user.offered_skills.length - 3} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* Skills Wanted */}
        {user.wanted_skills.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Wants</h4>
            <div className="flex flex-wrap gap-1">
              {user.wanted_skills.slice(0, 3).map((skill) => (
                <SkillTag key={skill} skill={skill} type="wanted" size="sm" />
              ))}
              {user.wanted_skills.length > 3 && (
                <span className="text-xs text-gray-500 px-2 py-1">
                  +{user.wanted_skills.length - 3} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex space-x-2">
          <Link to={`/user/${user.id}`} className="flex-1">
            <Button variant="outline" className="w-full" size="sm">
              View Profile
            </Button>
          </Link>
          <Link to={`/user/${user.id}?action=swap`} className="flex-1">
            <Button className="w-full" size="sm" icon={MessageCircle}>
              Request Swap
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}