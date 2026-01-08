import React, { useState, useEffect, useRef } from 'react';
import {
    MdThumbUp, MdThumbDown, MdComment, MdShare, MdMoreVert,
    MdVolumeOff, MdVolumeUp, MdPause, MdPlayArrow
} from 'react-icons/md';
import { API_BASE_URL } from '@/lib/config';

interface Video {
    id: string;
    title?: string;
    fileName: string;
    url: string;
    thumbnailUrl?: string;
    views: number;
    likes: number;
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
}

export const ShortsPlayer: React.FC<ShortsPlayerProps> = ({ 
    videos: propVideos, 
    onVideoChange,
    startingVideoId
}) => {
    const [videos, setVideos] = useState<Video[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [muted, setMuted] = useState(true);
    const [playing, setPlaying] = useState(true);
    const containerRef = useRef<HTMLDivElement>(null);
    const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);

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

    // Set starting video index based on startingVideoId
    useEffect(() => {
        if (videos.length > 0 && startingVideoId) {
            const startIndex = videos.findIndex(video => video.id === startingVideoId);
            if (startIndex !== -1) {
                setCurrentIndex(startIndex);
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
    }, [videos.length]);

    // Intersection Observer to auto-play videos when they come into view
    useEffect(() => {
        if (!containerRef.current || videos.length === 0) return;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    const videoElement = entry.target as HTMLVideoElement;
                    const videoIndex = videoRefs.current.findIndex(ref => ref === videoElement);
                    
                    if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
                        // Video is more than 50% visible - play it
                        setCurrentIndex(videoIndex);
                        videoElement.muted = muted;
                        videoElement.play().catch(console.error);
                        
                        // Pause all other videos
                        videoRefs.current.forEach((video, index) => {
                            if (video && index !== videoIndex && !video.paused) {
                                video.pause();
                            }
                        });
                    } else if (!entry.isIntersecting) {
                        // Video is not visible - pause it
                        videoElement.pause();
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
        };
    }, [videos, muted]);

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
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                goToPrevious();
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                goToNext();
            } else if (e.key === ' ') {
                e.preventDefault();
                togglePlayPause();
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
        try {
            const response = await fetch(`${API_BASE_URL}/pitch-sultan/videos/${videoId}/like`, {
                method: 'PUT'
            });
            const data = await response.json();
            
            if (data.success) {
                // Update local state
                setVideos(prev => prev.map(video => 
                    video.id === videoId 
                        ? { ...video, likes: data.data.likes }
                        : video
                ));
            }
        } catch (error) {
            console.error('❌ Error liking video:', error);
        }
    };

    const handleView = async (videoId: string) => {
        try {
            await fetch(`${API_BASE_URL}/pitch-sultan/videos/${videoId}/view`, {
                method: 'PUT'
            });
        } catch (error) {
            console.error('❌ Error recording view:', error);
        }
    };

    // Record view when video starts playing
    useEffect(() => {
        if (videos.length > 0 && currentIndex < videos.length) {
            const currentVideo = videos[currentIndex];
            handleView(currentVideo.id);
        }
    }, [currentIndex, videos]);

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

                        {/* Overlay Controls */}
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/60 flex flex-col justify-between p-4">
                            
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
                                        {video.title || video.fileName}
                                    </p>
                                    
                                    <div className="text-white/80 text-xs flex items-center gap-4">
                                        <span>{formatCount(video.views)} views</span>
                                        {video.secUser?.store && (
                                            <span>{video.secUser.store.storeName}</span>
                                        )}
                                        {video.secUser?.region && (
                                            <span>{video.secUser.region}</span>
                                        )}
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex flex-col items-center gap-4">
                                    <button
                                        onClick={() => handleLike(video.id)}
                                        className="flex flex-col items-center"
                                    >
                                        <div className="p-3 bg-black/30 rounded-full backdrop-blur-sm hover:bg-black/50 transition">
                                            <MdThumbUp className="text-2xl text-white" />
                                        </div>
                                        <span className="text-white text-xs font-semibold mt-1">
                                            {formatCount(video.likes)}
                                        </span>
                                    </button>

                                    <button className="flex flex-col items-center">
                                        <div className="p-3 bg-black/30 rounded-full backdrop-blur-sm hover:bg-black/50 transition">
                                            <MdThumbDown className="text-2xl text-white" />
                                        </div>
                                        <span className="text-white text-xs font-semibold mt-1">
                                            Dislike
                                        </span>
                                    </button>

                                    <button className="flex flex-col items-center">
                                        <div className="p-3 bg-black/30 rounded-full backdrop-blur-sm hover:bg-black/50 transition">
                                            <MdComment className="text-2xl text-white" />
                                        </div>
                                        <span className="text-white text-xs font-semibold mt-1">
                                            Comment
                                        </span>
                                    </button>

                                    <button className="flex flex-col items-center">
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

                        {/* Video indicator */}
                        <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white/50 text-xs">
                            <div className="flex flex-col items-center gap-2">
                                <div className="w-1 h-8 bg-white/20 rounded-full">
                                    <div 
                                        className="w-full bg-white rounded-full transition-all duration-300"
                                        style={{ height: `${((index + 1) / videos.length) * 100}%` }}
                                    />
                                </div>
                                <span>{index + 1}/{videos.length}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Custom scrollbar styles */}
            <style jsx>{`
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