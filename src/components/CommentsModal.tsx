import React, { useState, useEffect } from 'react';
import { MdClose, MdSend, MdPerson } from 'react-icons/md';
import { API_BASE_URL } from '@/lib/config';

interface Comment {
  id: string;
  comment: string;
  createdAt: string;
  user: {
    id: string;
    name?: string;
    phone: string;
  };
}

interface CommentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoId: string;
  currentUserId?: string;
}

export const CommentsModal: React.FC<CommentsModalProps> = ({
  isOpen,
  onClose,
  videoId,
  currentUserId
}) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && videoId) {
      fetchComments();
    }
  }, [isOpen, videoId]);

  const fetchComments = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/pitch-sultan/videos/${videoId}/comments`);
      const data = await response.json();
      
      if (data.success) {
        setComments(data.data);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newComment.trim() || !currentUserId) return;

    try {
      setSubmitting(true);
      const response = await fetch(`${API_BASE_URL}/pitch-sultan/videos/${videoId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: currentUserId,
          comment: newComment.trim()
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setComments(prev => [data.data, ...prev]);
        setNewComment('');
      } else {
        alert('Failed to add comment');
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      alert('Failed to add comment');
    } finally {
      setSubmitting(false);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getUserDisplayName = (user: Comment['user']) => {
    return user.name || `SEC ${user.phone.slice(-4)}`;
  };

  const getUserAvatar = (user: Comment['user']) => {
    const name = getUserDisplayName(user);
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&size=32`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-end justify-center z-[200] md:items-center">
      <div className="bg-[#282828] w-full max-w-lg h-[80vh] md:h-[70vh] md:rounded-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-white font-semibold text-lg">Comments</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition p-1"
          >
            <MdClose className="text-2xl" />
          </button>
        </div>

        {/* Comments List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 border-2 border-gray-600 border-t-white rounded-full animate-spin"></div>
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <MdPerson className="text-4xl mx-auto mb-2 opacity-50" />
              <p>No comments yet</p>
              <p className="text-sm">Be the first to comment!</p>
            </div>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="flex gap-3">
                <img
                  src={getUserAvatar(comment.user)}
                  alt="Avatar"
                  className="w-8 h-8 rounded-full flex-shrink-0"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-white font-medium text-sm">
                      {getUserDisplayName(comment.user)}
                    </span>
                    <span className="text-gray-500 text-xs">
                      {formatTimeAgo(comment.createdAt)}
                    </span>
                  </div>
                  <p className="text-gray-300 text-sm leading-relaxed">
                    {comment.comment}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Comment Input */}
        {currentUserId ? (
          <form onSubmit={handleSubmitComment} className="p-4 border-t border-gray-700">
            <div className="flex gap-3">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                className="flex-1 bg-gray-700 text-white placeholder-gray-400 px-4 py-2 rounded-full outline-none focus:ring-2 focus:ring-blue-500"
                maxLength={500}
                disabled={submitting}
              />
              <button
                type="submit"
                disabled={!newComment.trim() || submitting}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white p-2 rounded-full transition"
              >
                {submitting ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <MdSend className="text-xl" />
                )}
              </button>
            </div>
            <div className="text-xs text-gray-500 mt-2">
              {newComment.length}/500 characters
            </div>
          </form>
        ) : (
          <div className="p-4 border-t border-gray-700 text-center text-gray-400">
            <p>Please log in to comment</p>
          </div>
        )}
      </div>
    </div>
  );
};