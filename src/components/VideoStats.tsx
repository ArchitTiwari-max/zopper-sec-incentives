import React from 'react';
import { MdRemoveRedEye, MdThumbUp, MdComment, MdStar } from 'react-icons/md';


interface VideoStatsProps {
  views: number;
  likes: number;
  comments: number;
  rating?: number;
  ratingCount?: number;
  className?: string;
}

export const VideoStats: React.FC<VideoStatsProps> = ({
  views,
  likes,
  comments,
  rating,
  ratingCount,
  className = ''
}) => {
  const formatCount = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  return (
    <div className={`flex items-center gap-4 text-sm text-gray-400 ${className}`}>
      {/* Views */}
      <div className="flex items-center gap-1">
        <MdRemoveRedEye className="text-base" />
        <span>{formatCount(views)}</span>
      </div>

      {/* Likes */}
      <div className="flex items-center gap-1">
        <MdThumbUp className="text-base" />
        <span>{formatCount(likes)}</span>
      </div>

      {/* Comments */}
      <div className="flex items-center gap-1">
        <MdComment className="text-base" />
        <span>{formatCount(comments)}</span>
      </div>

      {/* Rating */}
      {(rating || 0) > 0 && (
        <div className="flex items-center gap-1">
          <MdStar className="text-base text-yellow-500" />
          <span>{rating!.toFixed(1)}</span>
          {ratingCount && ratingCount > 0 && <span>({formatCount(ratingCount)})</span>}
        </div>
      )}
    </div>
  );
};