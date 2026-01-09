import React, { useState, useEffect, useRef } from 'react';
import {
    MdThumbUp, MdThumbDown, MdComment, MdShare, MdMoreVert,
    MdVolumeOff, MdVolumeUp, MdPause, MdPlayArrow, MdStar
} from 'react-icons/md';
import { API_BASE_URL } from '@/lib/config';
import { CommentsModal } from './CommentsModal';
import { RatingModal } from './RatingModal';
import { StarRating } from './StarRating';

interface Video {
    id: string;
    title?: string;
    fileName: string;
    url: string;
    thumbnailUrl?: string;
    views: number;
    likes: number;
    rating?: number;
    ratingCount?: number;
    commentsCount?: number;
    uploadedAt: string;
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
    onVideoStatsUpdate?: (videoId: string, updates: { views?: number, likes?: number }) => void;
    currentUserId?: string; // Add current user ID for interactions
}

export const ShortsPlayer: React.FC<ShortsPlayerProps> = ({
    videos: propVideos,
    onVideoChange,
    startingVideoId,
    onVideoStatsUpdate,
    currentUserId
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
            const response = await fetch(`${API_BASE_URL}/pitch-sultan/videos?limit=50`);
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
    useEffect(() => {
        if (videos.length > 0 && startingVideoId) {
            const startIndex = videos.findIndex(video => video.id === startingVideoId);
            console.log('🎯 Looking for video ID:', startingVideoId, 'Found at index:', startIndex);

            if (startIndex !== -1) {
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
    }, [videos.length, muted, isProgrammaticScroll]); // Use videos.length instead of full videos array

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
                // Reset to beginning before playing
                video.currentTime = 0;
                video.play().catch(console.error);
                setPlaying(true);
            } else {
                video.pause();
                // Reset to beginning when pausing
                video.currentTime = 0;
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

    const getUploaderAvatar = (video: Video) => {
        const name = getUploaderName(video);
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=ffd700&color=000`;
    };

    if (loading) {
        return (
            <div className="h-[calc(100vh-100px)] w-full bg-black flex items-center justify-center">
                <div className="w-full max-w-[400px] h-full bg-black flex items-center justify-center">
                    <div className="w-12 h-12 border-4 border-gray-700 border-t-white rounded-full animate-spin"></div>
                </div>
            </div>
        );
    }

    if (videos.length === 0) {
        return (
            <div className="h-[calc(100vh-100px)] w-full bg-black flex items-center justify-center">
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
        <div className="h-[calc(100vh-100px)] w-full bg-black flex items-center justify-center overflow-hidden">
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
                            src={video.url}
                            className="w-full h-full object-cover"
                            loop
                            muted={muted}
                            playsInline
                            preload="metadata"
                            onClick={() => togglePlayPause(index)}
                        />

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
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/60 flex flex-col justify-between p-4 pb-12">

                            {/* Top Controls */}
                            <div className="flex justify-between items-start">
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
                                    <button className="p-2 bg-black/30 rounded-full backdrop-blur-sm">
                                        <MdMoreVert className="text-white text-xl" />
                                    </button>
                                </div>
                            </div>

                            {/* Center Play/Pause - only show for current video */}
                            {index === currentIndex && !playing && (
                                <div className="flex items-center justify-center">
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
                                        <img
                                            src={getUploaderAvatar(video)}
                                            alt="Profile"
                                            className="w-8 h-8 rounded-full"
                                        />
                                        <span className="text-white font-semibold text-sm">
                                            {getUploaderHandle(video)}
                                        </span>
                                        <button className="bg-white text-black text-xs font-bold px-3 py-1 rounded-full">
                                            Follow
                                        </button>
                                    </div>

                                    <p className="text-white text-sm line-clamp-2 mb-2">
                                        {video.title || video.fileName || 'Untitled Video'}
                                    </p>

                                    <div className="text-white/80 text-xs flex items-center gap-4">
                                        <span>{formatCount(video.views)} views</span>
                                        {video.secUser?.store && (
                                            <span>{video.secUser.store.storeName}</span>
                                        )}
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex flex-col items-center gap-4">
                                    <button
                                        onClick={() => handleLike(video.id)}
                                        className="flex flex-col items-center"
                                    >
                                        <div className={`p-3 rounded-full backdrop-blur-sm hover:bg-black/50 transition ${userInteractions[video.id]?.hasLiked
                                            ? 'bg-red-600/80'
                                            : 'bg-black/30'
                                            }`}>
                                            <MdThumbUp className={`text-2xl ${userInteractions[video.id]?.hasLiked
                                                ? 'text-white'
                                                : 'text-white'
                                                }`} />
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
                                        <div className={`p-3 rounded-full backdrop-blur-sm hover:bg-black/50 transition ${userInteractions[video.id]?.userRating
                                            ? 'bg-yellow-600/80'
                                            : 'bg-black/30'
                                            }`}>
                                            <MdStar className={`text-2xl ${userInteractions[video.id]?.userRating
                                                ? 'text-yellow-400'
                                                : 'text-white'
                                                }`} />
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


                    </div>
                ))}
            </div>

            {/* Comments Modal */}
            <CommentsModal
                isOpen={showCommentsModal}
                onClose={() => {
                    setShowCommentsModal(false);
                    setSelectedVideoForModal(null);
                }}
                videoId={selectedVideoForModal || ''}
                currentUserId={currentUserId}
            />

            {/* Rating Modal */}
            <RatingModal
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
        </div>
    );
};