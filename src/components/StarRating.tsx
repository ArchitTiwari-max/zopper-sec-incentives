import React from 'react';
import { MdStar, MdStarHalf, MdStarBorder } from 'react-icons/md';

interface StarRatingProps {
  rating: number;
  maxStars?: number;
  size?: 'sm' | 'md' | 'lg';
  showNumber?: boolean;
  ratingCount?: number;
  className?: string;
}

export const StarRating: React.FC<StarRatingProps> = ({
  rating,
  maxStars = 5,
  size = 'md',
  showNumber = true,
  ratingCount,
  className = ''
}) => {
  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  };

  const renderStars = () => {
    const stars = [];
    
    for (let i = 1; i <= maxStars; i++) {
      if (rating >= i) {
        // Full star
        stars.push(
          <MdStar key={i} className={`text-yellow-400 ${sizeClasses[size]}`} />
        );
      } else if (rating >= i - 0.5) {
        // Half star
        stars.push(
          <MdStarHalf key={i} className={`text-yellow-400 ${sizeClasses[size]}`} />
        );
      } else {
        // Empty star
        stars.push(
          <MdStarBorder key={i} className={`text-gray-400 ${sizeClasses[size]}`} />
        );
      }
    }
    
    return stars;
  };

  const formatCount = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <div className="flex items-center">
        {renderStars()}
      </div>
      {showNumber && (
        <span className={`text-gray-300 ${sizeClasses[size]}`}>
          {rating.toFixed(1)}
        </span>
      )}
      {ratingCount && ratingCount > 0 && (
        <span className={`text-gray-500 ${size === 'sm' ? 'text-xs' : 'text-sm'}`}>
          ({formatCount(ratingCount)})
        </span>
      )}
    </div>
  );
};