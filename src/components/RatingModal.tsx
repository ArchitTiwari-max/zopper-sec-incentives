import React, { useState, useEffect } from 'react';
import { MdClose, MdStar, MdStarBorder } from 'react-icons/md';
import { API_BASE_URL } from '@/lib/config';

interface RatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoId: string;
  currentUserId?: string;
  videoTitle?: string;
  onRatingUpdate?: (newRating: number, ratingCount: number) => void;
}

export const RatingModal: React.FC<RatingModalProps> = ({
  isOpen,
  onClose,
  videoId,
  currentUserId,
  videoTitle,
  onRatingUpdate
}) => {
  const [selectedRating, setSelectedRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [currentUserRating, setCurrentUserRating] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && videoId && currentUserId) {
      fetchUserRating();
    }
  }, [isOpen, videoId, currentUserId]);

  const fetchUserRating = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${API_BASE_URL}/pitch-sultan/videos/${videoId}/user-interactions?userId=${currentUserId}`
      );
      const data = await response.json();
      
      if (data.success && data.data.userRating) {
        setCurrentUserRating(data.data.userRating);
        setSelectedRating(data.data.userRating);
      }
    } catch (error) {
      console.error('Error fetching user rating:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitRating = async () => {
    if (!selectedRating || !currentUserId) return;

    try {
      setSubmitting(true);
      const response = await fetch(`${API_BASE_URL}/pitch-sultan/videos/${videoId}/rating`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: currentUserId,
          rating: selectedRating
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setCurrentUserRating(selectedRating);
        
        // Update parent component with new rating stats
        if (onRatingUpdate) {
          onRatingUpdate(
            data.data.videoRating.rating,
            data.data.videoRating.ratingCount
          );
        }
        
        // Show success message briefly then close
        setTimeout(() => {
          onClose();
        }, 1000);
      } else {
        alert('Failed to submit rating');
      }
    } catch (error) {
      console.error('Error submitting rating:', error);
      alert('Failed to submit rating');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStarClick = (rating: number) => {
    setSelectedRating(rating);
  };

  const handleStarHover = (rating: number) => {
    setHoveredRating(rating);
  };

  const handleStarLeave = () => {
    setHoveredRating(0);
  };

  const getRatingText = (rating: number) => {
    switch (rating) {
      case 1: return 'Poor';
      case 2: return 'Fair';
      case 3: return 'Good';
      case 4: return 'Very Good';
      case 5: return 'Excellent';
      default: return 'Rate this video';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[200] p-4">
      <div className="bg-[#282828] rounded-xl w-full max-w-md p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-white font-semibold text-lg">Rate Video</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition p-1"
          >
            <MdClose className="text-2xl" />
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-8 h-8 border-2 border-gray-600 border-t-white rounded-full animate-spin"></div>
          </div>
        ) : (
          <>
            {/* Video Title */}
            {videoTitle && (
              <div className="mb-6">
                <p className="text-gray-300 text-sm line-clamp-2">
                  {videoTitle}
                </p>
              </div>
            )}

            {/* Current Rating Display */}
            {currentUserRating && (
              <div className="mb-4 text-center">
                <p className="text-gray-400 text-sm">
                  Your current rating: {currentUserRating} star{currentUserRating !== 1 ? 's' : ''}
                </p>
              </div>
            )}

            {/* Star Rating */}
            <div className="text-center mb-6">
              <div className="flex justify-center gap-2 mb-4">
                {[1, 2, 3, 4, 5].map((star) => {
                  const isActive = star <= (hoveredRating || selectedRating);
                  return (
                    <button
                      key={star}
                      onClick={() => handleStarClick(star)}
                      onMouseEnter={() => handleStarHover(star)}
                      onMouseLeave={handleStarLeave}
                      className="text-4xl transition-all duration-200 hover:scale-110"
                      disabled={submitting}
                    >
                      {isActive ? (
                        <MdStar className="text-yellow-400" />
                      ) : (
                        <MdStarBorder className="text-gray-500 hover:text-gray-400" />
                      )}
                    </button>
                  );
                })}
              </div>
              
              <p className="text-white font-medium">
                {getRatingText(hoveredRating || selectedRating)}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 px-6 rounded-full transition"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitRating}
                disabled={!selectedRating || submitting}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-full transition flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Submitting...
                  </>
                ) : (
                  currentUserRating ? 'Update Rating' : 'Submit Rating'
                )}
              </button>
            </div>

            {/* Help Text */}
            <div className="mt-4 text-center">
              <p className="text-gray-500 text-xs">
                Rate this video to help others discover great content
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};