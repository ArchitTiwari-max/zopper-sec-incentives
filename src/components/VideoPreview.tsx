import React, { useState } from 'react';
import { MdPlayArrow, MdMoreVert, MdShare, MdFlag } from 'react-icons/md';
import { VideoStats } from './VideoStats';
import { getThumbnailUrl, getSignedVideoUrl } from '@/utils/videoUtils';
import { API_BASE_URL } from '@/lib/config';

interface VideoPreviewProps {
  video: {
    id: string;
    title?: string;
    fileName: string;
    url: string;
    serialNumber?: number;
    thumbnailUrl?: string;
    views: number;
    likes: number;
    commentsCount?: number;
    rating?: number;
    ratingCount?: number;
    uploadedAt: string;
    isActive?: boolean; // Add isActive field
    secUser: {
      id: string;
      name?: string;
      phone: string;
      store?: {
        storeName: string;
        city: string;
      };
      region?: string;
    };
  };
  onVideoClick?: (video: any) => void;
  showMenu?: boolean;
  currentUser?: any; // Add currentUser prop
  onVideoStatsUpdate?: (videoId: string, updates: any) => void;
  onVideoDelete?: (videoId: string) => void;
}

export const VideoPreview: React.FC<VideoPreviewProps> = ({
  video,
  onVideoClick,
  showMenu = false,
  currentUser,
  onVideoStatsUpdate,
  onVideoDelete
}) => {
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [adminLoading, setAdminLoading] = useState(false);
  const [resolvedThumbnailUrl, setResolvedThumbnailUrl] = useState<string>('');

  // Resolve signed S3 URL for thumbnail dynamically
  React.useEffect(() => {
    let isCurrent = true;
    const loadThumbnail = async () => {
      const rawThumbnail = getThumbnailUrl(video.url, video.thumbnailUrl);
      try {
        const signed = await getSignedVideoUrl(rawThumbnail);
        if (isCurrent) {
          setResolvedThumbnailUrl(signed);
        }
      } catch (err) {
        console.error("Failed to load signed thumbnail URL:", err);
        if (isCurrent) {
          setResolvedThumbnailUrl(rawThumbnail);
        }
      }
    };
    loadThumbnail();
    return () => {
      isCurrent = false;
    };
  }, [video.url, video.thumbnailUrl]);

  const uploaderName = video.secUser?.name || `SEC ${video.secUser?.phone?.slice(-4) || 'User'}`;
  const uploaderAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(uploaderName)}&background=ffd700&color=000`;

  const formatTimeAgo = (date: string) => {
    const now = new Date();
    const uploaded = new Date(date);
    const diffMs = now.getTime() - uploaded.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays < 7) return `${diffDays} days ago`;
    return uploaded.toLocaleDateString();
  };

  const handleVideoClick = () => {
    if (onVideoClick) {
      onVideoClick(video);
    }
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: video.title || video.fileName,
          text: `Check out this video by ${uploaderName} on Pitch Sultan!`,
          url: window.location.href
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        alert('Link copied to clipboard!');
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
    setShowOptionsMenu(false);
  };

  const handleReport = () => {
    alert('Report functionality would be implemented here');
    setShowOptionsMenu(false);
  };

  const handleAdminAction = async (type: 'delete' | 'toggle') => {
    const token = localStorage.getItem('token');
    if (!token) return;

    if (type === 'delete' && !window.confirm('Are you sure you want to delete this video?')) return;

    setAdminLoading(true);
    const url = `${API_BASE_URL}/pitch-sultan/videos/${video.id}${type === 'toggle' ? '/toggle-active' : ''}`;
    const method = type === 'delete' ? 'DELETE' : 'PATCH';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        if (type === 'delete') {
          onVideoDelete?.(video.id);
          alert('Video deleted successfully');
        } else {
          onVideoStatsUpdate?.(video.id, { isActive: data.data.isActive });
          alert(`Video ${data.data.isActive ? 'activated' : 'deactivated'} successfully`);
        }
      } else {
        alert(data.error || 'Action failed');
      }
    } catch (err) {
      console.error(err);
      alert('Action failed due to server error');
    } finally {
      setAdminLoading(false);
      setShowOptionsMenu(false);
    }
  };

  return (
    <div className="flex flex-col mb-6 cursor-pointer group" onClick={handleVideoClick}>
      <div className="relative w-full aspect-video bg-gray-800 overflow-hidden rounded-lg">
        {/* Render video tag as preview if the thumbnail is an MP4/MOV, otherwise render an image */}
        {resolvedThumbnailUrl && (resolvedThumbnailUrl.toLowerCase().includes('.mp4') || resolvedThumbnailUrl.toLowerCase().includes('.mov') || resolvedThumbnailUrl.toLowerCase().includes('.webm')) ? (
          <video
            src={resolvedThumbnailUrl}
            preload="metadata"
            muted
            playsInline
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
            style={{ objectPosition: 'center 20%' }}
          />
        ) : (
          <img
            src={resolvedThumbnailUrl || getThumbnailUrl(video.url, video.thumbnailUrl)}
            alt={video.title || 'Video thumbnail'}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
            style={{ objectPosition: 'center 20%' }}
            loading="lazy"
            onError={(e) => {
              const target = e.currentTarget;
              target.style.display = 'none';
            }}
          />
        )}

        {/* Sultan Admin Status Banner */}
        {currentUser && currentUser.isSultanAdmin === true && (
          <div className={`absolute top-2 left-2 px-2 py-1 rounded text-xs font-bold ${video.isActive === false
            ? 'bg-red-600 text-white'
            : 'bg-green-600 text-white'
            }`}>
            {video.isActive === false ? 'INACTIVE' : 'ACTIVE'}
          </div>
        )}

        {/* Play overlay */}
        <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <div className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center">
            <MdPlayArrow className="text-black text-3xl ml-1" />
          </div>
        </div>
      </div>

      <div className="flex gap-3 mt-3 px-3 md:px-0">
        <img src={uploaderAvatar} alt="" className="w-9 h-9 rounded-full mt-1 flex-shrink-0" />
        <div className="flex flex-col flex-1">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              {video.serialNumber && (
                <div className="text-sm font-bold text-gray-400 mb-0.5">
                  #{video.serialNumber}
                </div>
              )}
              <h3 className="text-white text-sm md:text-base font-semibold line-clamp-2 leading-tight">
                {video.title || video.fileName || 'Untitled Video'}
              </h3>
            </div>

            {showMenu && (
              <div className="relative ml-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowOptionsMenu(!showOptionsMenu);
                  }}
                  className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-gray-800 transition"
                >
                  <MdMoreVert className="text-xl" />
                </button>

                {showOptionsMenu && (
                  <>
                    {/* Backdrop */}
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowOptionsMenu(false)}
                    />

                    {/* Menu */}
                    <div className="absolute right-0 top-8 mt-2 w-48 bg-[#282828] rounded-lg shadow-lg border border-gray-700 z-20">
                      <div className="py-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleShare();
                          }}
                          className="w-full px-4 py-2 text-left text-white hover:bg-gray-700 transition-colors flex items-center gap-2 text-sm"
                        >
                          <MdShare className="text-base" />
                          Share
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleReport();
                          }}
                          className="w-full px-4 py-2 text-left text-red-400 hover:bg-red-900/20 transition-colors flex items-center gap-2 text-sm"
                        >
                          <MdFlag className="text-base" />
                          Report
                        </button>

                        {/* Admin Controls */}
                        {currentUser?.isSultanAdmin && (
                          <div className="border-t border-gray-700 mt-1 pt-1">
                            <button
                              disabled={adminLoading}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAdminAction('toggle');
                              }}
                              className="w-full px-4 py-2 text-left text-amber-400 hover:bg-amber-950/20 transition-colors flex items-center gap-2 text-sm font-semibold disabled:opacity-50"
                            >
                              <span>⚙️</span>
                              {video.isActive === false ? 'Activate Video' : 'Deactivate Video'}
                            </button>
                            <button
                              disabled={adminLoading}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAdminAction('delete');
                              }}
                              className="w-full px-4 py-2 text-left text-red-500 hover:bg-red-950/20 transition-colors flex items-center gap-2 text-sm font-semibold disabled:opacity-50"
                            >
                              <span>🗑️</span>
                              Delete Video
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="text-gray-400 text-xs mt-1">
            {uploaderName} • {formatTimeAgo(video.uploadedAt)}
          </div>

          <VideoStats
            views={video.views || 0}
            likes={video.likes || 0}
            comments={video.commentsCount || 0}
            rating={video.rating}
            ratingCount={video.ratingCount}
            className="mt-2"
          />

          {/* Store info */}
          {video.secUser?.store && (
            <div className="text-gray-500 text-xs mt-1">
              {video.secUser.store.storeName}, {video.secUser.store.city}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};