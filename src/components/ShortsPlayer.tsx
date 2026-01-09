import React, { useState, useEffect, useRef } from 'react';
import {
    MdThumbUp, MdThumbDown, MdComment, MdShare, MdMoreVert,
    MdVolumeOff, MdVolumeUp, MdPause, MdPlayArrow, MdStar,
    MdOutlineThumbUp, MdStarOutline, MdVisibility, MdVisibilityOff
} from 'react-icons/md';
import { API_BASE_URL } from '@/lib/config';
import { CommentsModal } from './CommentsModal';
import { RatingModal } from './RatingModal';
import { StarRating } from './StarRating';
import { isSultanAdmin } from '@/lib/auth';

interface Video {
    id: string;
    title?: string;
    serialNumber?: number;
    fileName: string;
    url: string;
    thumbnailUrl?: string;
    views: number;
    likes: number;
    rating?: number;
    ratingCount?: number;
    commentsCount?: number;
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
}

interface ShortsPlayerProps {
    videos?: Video[];
    onVideoChange?: (video: Video) => void;
    startingVideoId?: string; // Add this to start from a specific video
    onVideoStatsUpdate?: (videoId: string, updates: { views?: number, likes?: number, commentsCount?: number }) => void;
    currentUserId?: string; // Add current user ID for interactions
    currentUser?: any; // Add current user data for sultanadmin check
}

export const ShortsPlayer: React.FC<ShortsPlayerProps> = ({
    videos: propVideos,
    onVideoChange,
    startingVideoId,
    onVideoStatsUpdate,
    currentUserId,
    currentUser
}) => {
    const [videos, setVideos] = useState<Video[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [muted, setMuted] = useState(true);
    const [playing, setPlaying] = useState(true);
    const [isProgrammaticScroll, setIsProgrammaticScroll] = useState(false);
    const [viewedVideos, setViewedVideos] = useState<Set<string>>(new Set()); // Track which videos have been viewed
    const [videoProgress, setVideoProgress] = useState<{ [key: string]: number }>({}); // Track progress for each video
    const [userInteractions, setUserInteractions] = useState<{ [key: string]: { hasLiked: boolean, userRating: number | null } }>({}); // Track user interactions
    const [showCommentsModal, setShowCommentsModal] = useState(false);
    const [showRatingModal, setShowRatingModal] = useState(false);
    const [selectedVideoForModal, setSelectedVideoForModal] = useState<string | null>(null);
    const [showAdminMenu, setShowAdminMenu] = useState(false);
    const [showUserTooltip, setShowUserTooltip] = useState<string | null>(null); // For user tooltip (changed from hoveredUser)
    const containerRef = useRef<HTMLDivElement>(null);
    const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
    const viewTimers = useRef<Map<string, NodeJS.Timeout>>(new Map()); // Track view timers

    // Fetch videos if not provided as props
    useEffect(() => {
        if (propVideos) {
            setVideos(propVideos);
            setLoading(false);
        } else {
            fetchVideos();
        }
    }, [propVideos]);

    const fetchVideos = async () => {
        try {
            setLoading(true);
            console.log('📡 Fetching videos for shorts:', `${API_BASE_URL}/pitch-sultan/videos`);
            
            // Include authorization header for sultan admin
            const token = localStorage.getItem('token');
            const headers: any = {};
            if (token) {
                headers.Authorization = `Bearer ${token}`;
            }
            
            const response = await fetch(`${API_BASE_URL}/pitch-sultan/videos?limit=50`, {
                headers
            });
            const data = await response.json();

            if (data.success && data.data.length > 0) {
                setVideos(data.data);
                console.log('✅ Loaded videos for shorts:', data.data.length);
            } else {
                console.warn('⚠️ No videos found for shorts');
                setVideos([]);
            }
        } catch (error) {
            console.error('❌ Error fetching videos for shorts:', error);
            setVideos([]);
        } finally {
            setLoading(false);
        }
    };

    // Set starting video index based on startingVideoId and scroll to it
    const hasScrolledRef = useRef(false);

    // Helpers for ImageKit optimization
    // 1. Get Thumbnail for poster (prevents black flash)
    const getThumbnailUrl = (url: string) => {
        if (!url) return '';
        if (url.includes('ik.imagekit.io')) {
            // Use the standard ik-thumbnail.jpg endpoint
            return `${url}/ik-thumbnail.jpg`;
        }
        return url;
    };

    // 2. Force MP4 format for iOS/Mobile compatibility
    const getOptimizedVideoUrl = (url: string) => {
        if (!url) return '';
        if (url.includes('ik.imagekit.io')) {
            const separator = url.includes('?') ? '&' : '?';
            // tr=f-mp4 forces conversion to MP4 format
            return `${url}${separator}tr=f-mp4`;
        }
        return url;
    };

    // Reset scroll ref when startingVideoId changes
    useEffect(() => {
        hasScrolledRef.current = false;
    }, [startingVideoId]);

    // Set starting video index based on startingVideoId and scroll to it
    useEffect(() => {
        if (videos.length > 0 && startingVideoId && !hasScrolledRef.current) {
            const startIndex = videos.findIndex(video => video.id === startingVideoId);
            console.log('🎯 Looking for video ID:', startingVideoId, 'Found at index:', startIndex);

            if (startIndex !== -1) {
                hasScrolledRef.current = true;
                setCurrentIndex(startIndex);
                setIsProgrammaticScroll(true);

                // Clear all view timers during programmatic scroll to prevent false views
                viewTimers.current.forEach(timer => clearTimeout(timer));
                viewTimers.current.clear();

                // Scroll to the specific video after a short delay to ensure DOM is ready
                setTimeout(() => {
                    if (containerRef.current) {
                        // Use scrollIntoView for more reliable scrolling
                        const targetVideo = containerRef.current.children[startIndex] as HTMLElement;
                        if (targetVideo) {
                            targetVideo.scrollIntoView({
                                behavior: 'smooth',
                                block: 'start'
                            });
                            console.log('📍 Scrolled to video element:', startIndex);
                        } else {
                            // Fallback to manual scroll calculation
                            const scrollTop = startIndex * containerRef.current.clientHeight;
                            containerRef.current.scrollTo({
                                top: scrollTop,
                                behavior: 'smooth'
                            });
                            console.log('📍 Fallback scroll to position:', scrollTop);
                        }

                        // Reset programmatic scroll flag after scroll completes
                        setTimeout(() => {
                            setIsProgrammaticScroll(false);
                        }, 1000);
                    }
                }, 200); // Increased delay to ensure DOM is fully ready
            }
        }
    }, [videos, startingVideoId]);

    // Handle video change
    useEffect(() => {
        if (videos.length > 0 && onVideoChange) {
            onVideoChange(videos[currentIndex]);
        }
    }, [currentIndex, videos, onVideoChange]);

    // Initialize video refs array when videos change
    useEffect(() => {
        videoRefs.current = videoRefs.current.slice(0, videos.length);

        // Add progress tracking to all videos
        videoRefs.current.forEach((video, index) => {
            if (video && videos[index]) {
                const videoId = videos[index].id;

                // Remove existing listeners to avoid duplicates
                if ((video as any).progressHandler) {
                    video.removeEventListener('timeupdate', (video as any).progressHandler);
                }
                if ((video as any).metadataHandler) {
                    video.removeEventListener('loadedmetadata', (video as any).metadataHandler);
                }

                // Add progress tracking
                const progressHandler = () => {
                    if (video.duration) {
                        const progress = (video.currentTime / video.duration) * 100;
                        setVideoProgress(prev => ({
                            ...prev,
                            [videoId]: progress
                        }));
                    }
                };

                // Reset progress when video metadata loads
                const metadataHandler = () => {
                    setVideoProgress(prev => ({
                        ...prev,
                        [videoId]: 0
                    }));
                };

                // Store handlers on video element for cleanup
                (video as any).progressHandler = progressHandler;
                (video as any).metadataHandler = metadataHandler;

                video.addEventListener('timeupdate', progressHandler);
                video.addEventListener('loadedmetadata', metadataHandler);
            }
        });

        // Cleanup function
        return () => {
            videoRefs.current.forEach(video => {
                if (video) {
                    if ((video as any).progressHandler) {
                        video.removeEventListener('timeupdate', (video as any).progressHandler);
                    }
                    if ((video as any).metadataHandler) {
                        video.removeEventListener('loadedmetadata', (video as any).metadataHandler);
                    }
                }
            });
        };
    }, [videos.length]); // Only depend on length, not the entire videos array

    // Intersection Observer to auto-play videos when they come into view
    useEffect(() => {
        if (!containerRef.current || videos.length === 0) return;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    const videoElement = entry.target as HTMLVideoElement;
                    const videoIndex = videoRefs.current.findIndex(ref => ref === videoElement);
                    const video = videos[videoIndex];

                    if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
                        // Video is more than 50% visible - play it
                        // Don't update currentIndex if we're doing programmatic scrolling
                        if (!isProgrammaticScroll) {
                            setCurrentIndex(videoIndex);
                        }

                        // Reset video to start from beginning
                        videoElement.currentTime = 0;
                        // Reset progress
                        setVideoProgress(prev => ({
                            ...prev,
                            [video.id]: 0
                        }));
                        videoElement.muted = muted;
                        videoElement.play().then(() => {
                            // Start view timer when video actually starts playing
                            if (video) {
                                startViewTimer(video.id);
                            }
                        }).catch(console.error);

                        // Pause all other videos, reset them to beginning, and stop their view timers
                        videoRefs.current.forEach((otherVideo, index) => {
                            if (otherVideo && index !== videoIndex && !otherVideo.paused) {
                                otherVideo.pause();
                                otherVideo.currentTime = 0; // Reset to beginning
                                const otherVideoData = videos[index];
                                if (otherVideoData) {
                                    // Reset progress
                                    setVideoProgress(prev => ({
                                        ...prev,
                                        [otherVideoData.id]: 0
                                    }));
                                    stopViewTimer(otherVideoData.id);
                                }
                            }
                        });
                    } else if (!entry.isIntersecting) {
                        // Video is not visible - pause it, reset to beginning, and stop view timer
                        videoElement.pause();
                        videoElement.currentTime = 0; // Reset to beginning when leaving
                        if (video) {
                            // Reset progress
                            setVideoProgress(prev => ({
                                ...prev,
                                [video.id]: 0
                            }));
                            stopViewTimer(video.id);
                        }
                    }
                });
            },
            {
                root: containerRef.current,
                threshold: [0.5], // Trigger when 50% of video is visible
            }
        );

        // Observe all video elements
        videoRefs.current.forEach((video) => {
            if (video) observer.observe(video);
        });

        return () => {
            observer.disconnect();
            // Clear all view timers when component unmounts
            viewTimers.current.forEach(timer => clearTimeout(timer));
            viewTimers.current.clear();
        };
    }, [videos.length, isProgrammaticScroll]); // Use videos.length instead of full videos array

    // Handle mute/unmute for all videos
    useEffect(() => {
        videoRefs.current.forEach((video) => {
            if (video) {
                video.muted = muted;
            }
        });
    }, [muted]);

    // Handle scroll/swipe navigation
    useEffect(() => {
        const goToPrevious = () => {
            if (currentIndex > 0 && containerRef.current) {
                const prevIndex = currentIndex - 1;
                const targetVideo = containerRef.current.children[prevIndex] as HTMLElement;
                if (targetVideo) {
                    targetVideo.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }
        };

        const goToNext = () => {
            if (currentIndex < videos.length - 1 && containerRef.current) {
                const nextIndex = currentIndex + 1;
                const targetVideo = containerRef.current.children[nextIndex] as HTMLElement;
                if (targetVideo) {
                    targetVideo.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            // Don't handle keyboard shortcuts when typing in input/textarea
            const activeElement = document.activeElement;
            const isTyping = activeElement?.tagName === 'INPUT' ||
                activeElement?.tagName === 'TEXTAREA' ||
                activeElement?.getAttribute('contenteditable') === 'true';

            if (isTyping) {
                return; // Allow normal typing in input fields
            }

            if (e.key === 'ArrowUp') {
                e.preventDefault();
                goToPrevious();
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                goToNext();
            } else if (e.key === ' ') {
                e.preventDefault();
                togglePlayPause(currentIndex);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentIndex, videos.length]);

    const togglePlayPause = (videoIndex: number) => {
        const video = videoRefs.current[videoIndex];
        if (video) {
            if (video.paused) {
                video.play().catch(console.error);
                setPlaying(true);
            } else {
                video.pause();
                setPlaying(false);
            }
        }
    };

    const toggleMute = () => {
        setMuted(!muted);
    };

    const handleLike = async (videoId: string) => {
        if (!currentUserId) {
            alert('Please log in to like videos');
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/pitch-sultan/videos/${videoId}/toggle-like`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ userId: currentUserId })
            });
            const data = await response.json();

            if (data.success) {
                // Update local user interactions state
                setUserInteractions(prev => ({
                    ...prev,
                    [videoId]: {
                        ...prev[videoId],
                        hasLiked: data.data.hasLiked
                    }
                }));

                // Update parent component state
                if (onVideoStatsUpdate) {
                    onVideoStatsUpdate(videoId, { likes: data.data.totalLikes });
                }
            }
        } catch (error) {
            console.error('❌ Error toggling like:', error);
        }
    };

    const handleComment = (videoId: string) => {
        if (!currentUserId) {
            alert('Please log in to comment on videos');
            return;
        }
        setSelectedVideoForModal(videoId);
        setShowCommentsModal(true);
    };

    const handleCommentAdded = (newCount?: number) => {
        // Update the comment count for the selected video
        if (selectedVideoForModal) {
            setVideos(prevVideos =>
                prevVideos.map(video =>
                    video.id === selectedVideoForModal
                        ? { ...video, commentsCount: newCount ?? ((video.commentsCount || 0) + 1) }
                        : video
                )
            );
        }
    };

    const handleRating = (videoId: string) => {
        if (!currentUserId) {
            alert('Please log in to rate videos');
            return;
        }
        setSelectedVideoForModal(videoId);
        setShowRatingModal(true);
    };

    const handleShare = async (video: Video) => {
        try {
            if (navigator.share) {
                await navigator.share({
                    title: video.title || video.fileName,
                    text: `Check out this video on Pitch Sultan!`,
                    url: window.location.href
                });
            } else {
                // Fallback: copy to clipboard
                await navigator.clipboard.writeText(window.location.href);
                alert('Link copied to clipboard!');
            }
        } catch (error) {
            console.error('Error sharing:', error);
            // Fallback: copy to clipboard
            try {
                await navigator.clipboard.writeText(window.location.href);
                alert('Link copied to clipboard!');
            } catch (clipboardError) {
                console.error('Clipboard error:', clipboardError);
            }
        }
    };

    // Toggle video active/inactive status (Sultan Admin only)
    const handleToggleVideoStatus = async (videoId: string, currentStatus: boolean) => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                alert('Authentication required');
                return;
            }

            const response = await fetch(`${API_BASE_URL}/pitch-sultan/videos/${videoId}/toggle-active`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();
            
            if (data.success) {
                // Update the video in local state
                setVideos(prevVideos => 
                    prevVideos.map(video => 
                        video.id === videoId 
                            ? { ...video, isActive: data.data.isActive }
                            : video
                    )
                );
                alert(`Video ${data.data.isActive ? 'activated' : 'deactivated'} successfully!`);
                setShowAdminMenu(false);
            } else {
                alert(data.error || 'Failed to toggle video status');
            }
        } catch (error) {
            console.error('Error toggling video status:', error);
            alert('Failed to toggle video status');
        }
    };

    // Fetch user interactions for current user
    const fetchUserInteractions = async (videoId: string) => {
        if (!currentUserId) return;

        try {
            const response = await fetch(
                `${API_BASE_URL}/pitch-sultan/videos/${videoId}/user-interactions?userId=${currentUserId}`
            );
            const data = await response.json();

            if (data.success) {
                setUserInteractions(prev => ({
                    ...prev,
                    [videoId]: data.data
                }));
            }
        } catch (error) {
            console.error('Error fetching user interactions:', error);
        }
    };

    // Load user interactions when videos change
    useEffect(() => {
        if (currentUserId && videos.length > 0) {
            videos.forEach(video => {
                if (!userInteractions[video.id]) {
                    fetchUserInteractions(video.id);
                }
            });
        }
    }, [currentUserId, videos]);

    const handleRatingUpdate = (videoId: string, newRating: number, ratingCount: number) => {
        // Update local videos state
        setVideos(prev => prev.map(video =>
            video.id === videoId
                ? { ...video, rating: newRating, ratingCount }
                : video
        ));
    };

    const handleView = async (videoId: string) => {
        // Only count view if video hasn't been viewed yet
        if (!viewedVideos.has(videoId)) {
            try {
                const response = await fetch(`${API_BASE_URL}/pitch-sultan/videos/${videoId}/view`, {
                    method: 'PUT'
                });
                const data = await response.json();

                if (data.success) {
                    // Mark video as viewed
                    setViewedVideos(prev => new Set([...prev, videoId]));
                    console.log('📊 View counted for video:', videoId);

                    // Only update parent component state, not local state
                    if (onVideoStatsUpdate) {
                        onVideoStatsUpdate(videoId, { views: data.data.views });
                    }
                }
            } catch (error) {
                console.error('❌ Error recording view:', error);
            }
        }
    };

    const startViewTimer = (videoId: string) => {
        // Clear any existing timer for this video
        const existingTimer = viewTimers.current.get(videoId);
        if (existingTimer) {
            clearTimeout(existingTimer);
        }

        // Start a new timer - count view after 3 seconds of watching
        const timer = setTimeout(() => {
            handleView(videoId);
        }, 3000);

        viewTimers.current.set(videoId, timer);
    };

    const stopViewTimer = (videoId: string) => {
        const timer = viewTimers.current.get(videoId);
        if (timer) {
            clearTimeout(timer);
            viewTimers.current.delete(videoId);
        }
    };

    const formatCount = (count: number) => {
        if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
        if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
        return count.toString();
    };

    const getUploaderName = (video: Video) => {
        return video.secUser?.name || `SEC ${video.secUser?.phone?.slice(-4) || 'User'}`;
    };

    const getUploaderHandle = (video: Video) => {
        const name = video.secUser?.name || 'secuser';
        return `@${name.toLowerCase().replace(/\s+/g, '_')}`;
    };

    const getUserTooltipInfo = (video: Video) => {
        const user = video.secUser;
        return {
            name: user?.name || 'Unknown User',
            phone: user?.phone || 'N/A',
            store: user?.store ? `${user.store.storeName}, ${user.store.city}` : 'No store info',
            region: video.secUser?.region || 'N/A'
        };
    };

    const getUploaderAvatar = (video: Video) => {
        const name = getUploaderName(video);
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=ffd700&color=000`;
    };

    if (loading) {
        return (
            <div className="h-[calc(100dvh-100px)] w-full bg-black flex items-center justify-center">
                <div className="w-full max-w-[400px] h-full bg-black flex items-center justify-center">
                    <div className="w-12 h-12 border-4 border-gray-700 border-t-white rounded-full animate-spin"></div>
                </div>
            </div>
        );
    }

    if (videos.length === 0) {
        return (
            <div className="h-[calc(100dvh-100px)] w-full bg-black flex items-center justify-center">
                <div className="w-full max-w-[400px] h-full bg-black flex items-center justify-center">
                    <div className="text-center text-white">
                        <div className="text-6xl mb-4">📹</div>
                        <h2 className="text-2xl font-bold mb-2">No Shorts Available</h2>
                        <p className="text-gray-400">Be the first to upload a video!</p>
                    </div>
                </div>
            </div>
        );
    }

    const currentVideo = videos[currentIndex];

    return (
        <div className="h-[calc(100dvh-100px)] w-full bg-black flex items-center justify-center overflow-hidden">
            {/* Vertical scrollable container */}
            <div
                ref={containerRef}
                className="relative w-full max-w-[400px] h-full bg-black overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
                {/* Render all videos */}
                {videos.map((video, index) => (
                    <div
                        key={video.id}
                        className="relative w-full h-full flex-shrink-0 snap-start"
                        style={{ aspectRatio: '9/16' }}
                    >
                        {/* Video Player */}
                        <video
                            ref={(el) => {
                                videoRefs.current[index] = el;
                            }}
                            src={getOptimizedVideoUrl(video.url)}
                            poster={getThumbnailUrl(video.thumbnailUrl || video.url)}
                            className="w-full h-full object-cover"
                            loop
                            muted={muted}
                            playsInline
                            preload="metadata"
                            onClick={() => togglePlayPause(index)}
                        />

                        {/* Serial Number Overlay */}
                        {video.serialNumber && (
                            <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded-md text-xs font-bold text-yellow-500 border border-yellow-500/40 z-[60] shadow-lg pointer-events-none">
                                #{video.serialNumber}
                            </div>
                        )}

                        {/* Progress Bar - positioned with bottom margin to stay visible */}
                        <div className="absolute bottom-4 left-0 right-0 h-1 bg-black/50 rounded-none z-50">
                            <div
                                className="h-full bg-white rounded-none transition-all duration-100 ease-linear"
                                style={{
                                    width: `${videoProgress[video.id] || 0}%`
                                }}
                            />
                        </div>

                        {/* Overlay Controls */}
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/60 flex flex-col justify-between p-4 pb-12 pointer-events-none">

                            {/* Top Controls */}
                            <div className="flex justify-between items-start pointer-events-auto">
                                <div className="text-white text-sm font-medium">
                                    Shorts
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setMuted(!muted)}
                                        className="p-2 bg-black/30 rounded-full backdrop-blur-sm"
                                    >
                                        {muted ? (
                                            <MdVolumeOff className="text-white text-xl" />
                                        ) : (
                                            <MdVolumeUp className="text-white text-xl" />
                                        )}
                                    </button>
                                    {currentUser && currentUser.isSultanAdmin === true && (
                                        <div className="relative">
                                            <button 
                                                className="p-2 bg-black/30 rounded-full backdrop-blur-sm"
                                                onClick={() => setShowAdminMenu(!showAdminMenu)}
                                            >
                                                <MdMoreVert className="text-white text-xl" />
                                            </button>
                                            
                                            {showAdminMenu && (
                                                <>
                                                    {/* Backdrop */}
                                                    <div
                                                        className="fixed inset-0 z-10"
                                                        onClick={() => setShowAdminMenu(false)}
                                                    />
                                                    
                                                    {/* Menu */}
                                                    <div className="absolute right-0 top-12 w-48 bg-[#282828] rounded-lg shadow-lg border border-gray-700 z-20">
                                                        <div className="py-2">
                                                            <button
                                                                onClick={() => handleToggleVideoStatus(video.id, video.isActive || true)}
                                                                className="w-full px-4 py-2 text-left text-white hover:bg-gray-700 transition-colors flex items-center gap-2 text-sm"
                                                            >
                                                                {video.isActive === false ? (
                                                                    <>
                                                                        <MdVisibility className="text-base" />
                                                                        Activate Video
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <MdVisibilityOff className="text-base" />
                                                                        Deactivate Video
                                                                    </>
                                                                )}
                                                            </button>
                                                        </div>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Center Play/Pause - only show for current video */}
                            {index === currentIndex && !playing && (
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-auto z-10">
                                    <button
                                        onClick={() => togglePlayPause(index)}
                                        className="p-4 bg-black/50 rounded-full backdrop-blur-sm"
                                    >
                                        <MdPlayArrow className="text-white text-4xl" />
                                    </button>
                                </div>
                            )}

                            {/* Bottom Content */}
                            <div className="flex items-end justify-between">
                                {/* Video Info */}
                                <div className="flex-1 pr-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="relative pointer-events-auto">
                                            <img
                                                src={getUploaderAvatar(video)}
                                                alt="Profile"
                                                className={`w-8 h-8 rounded-full pointer-events-auto ${currentUser && currentUser.isSultanAdmin === true ? 'cursor-pointer hover:ring-2 hover:ring-yellow-400' : ''}`}
                                                onClick={(e) => {
                                                    if (currentUser && currentUser.isSultanAdmin === true) {
                                                        e.stopPropagation();
                                                        e.preventDefault();
                                                        setShowUserTooltip(showUserTooltip === video.id ? null : video.id);
                                                        console.log('Profile clicked, showing tooltip for:', video.id);
                                                    }
                                                }}
                                            />
                                            
                                            {/* Sultan Admin User Tooltip */}
                                            {currentUser && currentUser.isSultanAdmin === true && showUserTooltip === video.id && (
                                                <>
                                                    {/* Backdrop to close tooltip */}
                                                    <div
                                                        className="fixed inset-0 z-[100]"
                                                        onClick={() => setShowUserTooltip(null)}
                                                    />
                                                    
                                                    {/* Tooltip */}
                                                    <div className="absolute bottom-full left-0 mb-2 w-64 bg-black/95 backdrop-blur-md text-white text-xs rounded-lg p-3 shadow-lg border border-gray-600 z-[101]">
                                                        <div className="space-y-2">
                                                            <div className="font-semibold text-yellow-400 border-b border-gray-600 pb-1">User Details</div>
                                                            <div><span className="text-gray-400">Name:</span> <span className="text-white">{getUserTooltipInfo(video).name}</span></div>
                                                            <div><span className="text-gray-400">Phone:</span> <span className="text-white">{getUserTooltipInfo(video).phone}</span></div>
                                                            <div><span className="text-gray-400">Store:</span> <span className="text-white">{getUserTooltipInfo(video).store}</span></div>
                                                            <div><span className="text-gray-400">Region:</span> <span className="text-white">{getUserTooltipInfo(video).region}</span></div>
                                                        </div>
                                                        {/* Tooltip arrow */}
                                                        <div className="absolute top-full left-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-black/95"></div>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                        
                                        <span 
                                            className={`text-white font-semibold text-sm pointer-events-auto ${currentUser && currentUser.isSultanAdmin === true ? 'cursor-pointer hover:text-yellow-400' : ''}`}
                                            onClick={(e) => {
                                                if (currentUser && currentUser.isSultanAdmin === true) {
                                                    e.stopPropagation();
                                                    e.preventDefault();
                                                    setShowUserTooltip(showUserTooltip === video.id ? null : video.id);
                                                    console.log('Username clicked, showing tooltip for:', video.id);
                                                }
                                            }}
                                        >
                                            {getUploaderHandle(video)}
                                        </span>
                                    </div>

                                    <p className="text-white text-sm line-clamp-2 mb-2">
                                        {video.title || video.fileName || 'Untitled Video'}
                                    </p>
                                    
                                    {/* Sultan Admin Status Info */}
                                    {currentUser && currentUser.isSultanAdmin === true && (
                                        <div className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-bold mb-2 ${
                                            video.isActive === false 
                                                ? 'bg-red-600/20 text-red-400 border border-red-600/40' 
                                                : 'bg-green-600/20 text-green-400 border border-green-600/40'
                                        }`}>
                                            <div className={`w-2 h-2 rounded-full ${
                                                video.isActive === false ? 'bg-red-400' : 'bg-green-400'
                                            }`}></div>
                                            {video.isActive === false ? 'Video Inactive' : 'Video Active'}
                                        </div>
                                    )}

                                    <div className="text-white/80 text-xs flex items-center gap-4">
                                        <span>{formatCount(video.views)} views</span>
                                        {video.secUser?.store && (
                                            <span>{video.secUser.store.storeName}</span>
                                        )}
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex flex-col items-center gap-4 pointer-events-auto">
                                    <button
                                        onClick={() => handleLike(video.id)}
                                        className="flex flex-col items-center"
                                    >
                                        <div className="p-3 bg-black/30 rounded-full backdrop-blur-sm hover:bg-black/50 transition">
                                            {userInteractions[video.id]?.hasLiked ? (
                                                <MdThumbUp className="text-2xl text-white" />
                                            ) : (
                                                <MdOutlineThumbUp className="text-2xl text-white/80" />
                                            )}
                                        </div>
                                        <span className="text-white text-xs font-semibold mt-1">
                                            {formatCount(video.likes)}
                                        </span>
                                    </button>

                                    <button
                                        onClick={() => handleComment(video.id)}
                                        className="flex flex-col items-center"
                                    >
                                        <div className="p-3 bg-black/30 rounded-full backdrop-blur-sm hover:bg-black/50 transition">
                                            <MdComment className="text-2xl text-white" />
                                        </div>
                                        <span className="text-white text-xs font-semibold mt-1">
                                            {formatCount(video.commentsCount || 0)}
                                        </span>
                                    </button>

                                    <button
                                        onClick={() => handleRating(video.id)}
                                        className="flex flex-col items-center"
                                    >
                                        <div className="p-3 bg-black/30 rounded-full backdrop-blur-sm hover:bg-black/50 transition">
                                            {userInteractions[video.id]?.userRating ? (
                                                <MdStar className="text-2xl text-yellow-400" />
                                            ) : (
                                                <MdStarOutline className="text-2xl text-white/80" />
                                            )}
                                        </div>
                                        <span className="text-white text-xs font-semibold mt-1">
                                            {video.rating && video.rating > 0
                                                ? `${video.rating.toFixed(1)}★ (${formatCount(video.ratingCount || 0)})`
                                                : video.ratingCount && video.ratingCount > 0
                                                    ? formatCount(video.ratingCount)
                                                    : 'Rate'
                                            }
                                        </span>
                                    </button>

                                    <button
                                        onClick={() => handleShare(video)}
                                        className="flex flex-col items-center"
                                    >
                                        <div className="p-3 bg-black/30 rounded-full backdrop-blur-sm hover:bg-black/50 transition">
                                            <MdShare className="text-2xl text-white" />
                                        </div>
                                        <span className="text-white text-xs font-semibold mt-1">
                                            Share
                                        </span>
                                    </button>
                                </div>
                            </div>
                        </div>


                    </div >
                ))}
            </div >

            {/* Comments Modal */}
            < CommentsModal
                isOpen={showCommentsModal}
                onClose={() => {
                    setShowCommentsModal(false);
                    setSelectedVideoForModal(null);
                }}
                videoId={selectedVideoForModal || ''}
                currentUserId={currentUserId}
                currentUser={currentUser}
                onCommentAdded={handleCommentAdded}
            />

            {/* Rating Modal */}
            < RatingModal
                isOpen={showRatingModal}
                onClose={() => {
                    setShowRatingModal(false);
                    setSelectedVideoForModal(null);
                }}
                videoId={selectedVideoForModal || ''}
                currentUserId={currentUserId}
                videoTitle={selectedVideoForModal ? videos.find(v => v.id === selectedVideoForModal)?.title || videos.find(v => v.id === selectedVideoForModal)?.fileName : undefined}
                onRatingUpdate={(newRating, ratingCount) => {
                    if (selectedVideoForModal) {
                        handleRatingUpdate(selectedVideoForModal, newRating, ratingCount);
                    }
                }}
            />

            {/* Custom scrollbar styles */}
            <style>{`
                .scrollbar-hide {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
                .scrollbar-hide::-webkit-scrollbar {
                    display: none;
                }
            `}</style>
        </div >
    );
};