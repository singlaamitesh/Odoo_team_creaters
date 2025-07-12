import React from 'react';

interface SkillTagProps {
  skill: string;
  type: 'offered' | 'wanted';
  size?: 'sm' | 'md';
  onClick?: () => void;
}

export default function SkillTag({ skill, type, size = 'md', onClick }: SkillTagProps) {
  const baseClasses = 'inline-flex items-center rounded-full font-medium transition-colors';
  
  const typeClasses = {
    offered: 'bg-green-100 text-green-800 border border-green-200',
    wanted: 'bg-blue-100 text-blue-800 border border-blue-200'
  };
  
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1 text-sm'
  };

  const hoverClasses = onClick ? 'cursor-pointer hover:opacity-80' : '';

  return (
    <span
      className={`${baseClasses} ${typeClasses[type]} ${sizeClasses[size]} ${hoverClasses}`}
      onClick={onClick}
    >
      {skill}
    </span>
  );
}