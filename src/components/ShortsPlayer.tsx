import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
    MdThumbUp, MdComment, MdShare, MdMoreVert,
    MdVolumeOff, MdVolumeUp, MdPause, MdPlayArrow, MdStar,
    MdOutlineThumbUp, MdStarOutline, MdVisibility, MdVisibilityOff, MdDelete
} from 'react-icons/md';
import { API_BASE_URL } from '@/lib/config';
import { CommentsModal } from './CommentsModal';
import { RatingModal } from './RatingModal';
import { getThumbnailUrl, getOptimizedVideoUrl } from '@/utils/videoUtils';

// --- Types ---

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
    isActive?: boolean;
    secUser: {
        id: string;
        name?: string;
        phone: string;
        store?: { storeName: string; city: string; };
        region?: string;
    };
}

type FeedItem =
    | { type: 'video'; data: Video; id: string }
    | { type: 'ad'; data: { imageUrl: string }; id: string };

interface ShortsPlayerProps {
    videos?: Video[];
    onVideoChange?: (video: Video) => void;
    startingVideoId?: string;
    onVideoStatsUpdate?: (videoId: string, updates: any) => void;
    currentUserId?: string;
    currentUser?: any;
}

// --- Helper Functions ---

const formatCount = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
};

const getUploaderHandle = (video: Video) => {
    const name = video.secUser?.name || 'secuser';
    return `@${name.toLowerCase().replace(/\s+/g, '_')}`;
};

// --- Sub-Components ---

interface VideoSlideProps {
    video: Video;
    isActive: boolean;
    muted: boolean;
    toggleMute: () => void;
    onLike: (id: string, currentlyLiked: boolean) => void;
    onComment: (id: string) => void;
    onRating: (id: string) => void;
    onShare: (video: Video) => void;
    currentUserId?: string;
    currentUser?: any;
    onAdminAction: (type: 'delete' | 'toggle', video: Video) => void;
    onView: (id: string) => void;
}

const VideoSlide = ({
    video,
    isActive,
    muted,
    toggleMute,
    onLike,
    onComment,
    onRating,
    onShare,
    currentUserId,
    currentUser,
    onAdminAction,
    onView
}: VideoSlideProps) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isPlaying, setIsPlaying] = useState(true);
    const [progress, setProgress] = useState(0);
    const [showAdminMenu, setShowAdminMenu] = useState(false);
    const [localInteractions, setLocalInteractions] = useState<{ hasLiked?: boolean; userRating?: any }>({
        hasLiked: (video as any).hasLiked,
        userRating: (video as any).userRating
    });
    const viewRecordedRef = useRef(false);
    const fetchedInteractionsRef = useRef<string | null>((video as any).hasLiked !== undefined ? video.id : null);

    // Debug: Log when video element is created/destroyed
    useEffect(() => {
        console.log(`🎥 [${video.id.slice(-4)}] VideoSlide mounted, isActive=${isActive}`);
        return () => console.log(`🎥 [${video.id.slice(-4)}] VideoSlide unmounted`);
    }, [video.id]);

    // 1. Fetch interactions ON-DEMAND only when active
    useEffect(() => {
        if (isActive && currentUserId && fetchedInteractionsRef.current !== video.id) {
            console.log(`📡 [${video.id.slice(-4)}] Fetching interactions on-demand...`);
            fetch(`${API_BASE_URL}/pitch-sultan/videos/${video.id}/user-interactions?userId=${currentUserId}`)
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        setLocalInteractions(data.data);
                        fetchedInteractionsRef.current = video.id;
                    }
                })
                .catch(err => console.error("Failed to fetch interactions:", err));
        }
    }, [isActive, video.id, currentUserId]);

    // 2. Handle Play/Pause and View Recording
    useEffect(() => {
        if (isActive && videoRef.current) {
            console.log(`🎬 [${video.id.slice(-4)}] Attempting play at:`, new Date().toISOString());

            const playPromise = videoRef.current.play();
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    console.log("⚠️ Autoplay blocked:", error.name);
                    // Mobile fix: If unmuted play failed, try to mute and play
                    if (!muted) {
                        console.log("🔇 Falling back to muted playback...");
                        toggleMute();
                    }
                    setIsPlaying(false);
                });
            }

            // Record view only once per video
            if (!viewRecordedRef.current) {
                const viewTimer = setTimeout(() => {
                    onView(video.id);
                    viewRecordedRef.current = true;
                }, 3000);
                return () => clearTimeout(viewTimer);
            }
        } else if (videoRef.current && !isActive) {
            // Just pause, don't clear src (will be cleared on unmount)
            videoRef.current.pause();
            viewRecordedRef.current = false;
        }
    }, [isActive, video.id, muted]);

    const [showMuteIcon, setShowMuteIcon] = useState(false);
    const muteTimerRef = useRef<NodeJS.Timeout | null>(null);

    const handleVideoTap = (e: React.MouseEvent) => {
        // Stop bubbling so we don't trigger container events
        e.stopPropagation();

        // Toggle mute
        toggleMute();

        // Show feedback icon
        setShowMuteIcon(true);
        if (muteTimerRef.current) clearTimeout(muteTimerRef.current);
        muteTimerRef.current = setTimeout(() => setShowMuteIcon(false), 800);
    };

    const handleLikeClick = () => {
        const newLikeStatus = !localInteractions.hasLiked;
        setLocalInteractions(prev => ({ ...prev, hasLiked: newLikeStatus })); // Optimistic update
        onLike(video.id, localInteractions.hasLiked || false);
    };

    return (
        <div className="relative w-full h-full bg-black flex-shrink-0 snap-start cursor-pointer" onClick={handleVideoTap}>
            {/* 1. Video Player - Only render when active to avoid empty src errors */}
            {isActive && (
                <video
                    ref={videoRef}
                    src={getOptimizedVideoUrl(video.url)}
                    poster={getThumbnailUrl(video.url, video.thumbnailUrl)}
                    className="w-full h-full object-cover"
                    loop
                    autoPlay
                    muted={muted}
                    playsInline
                    preload="auto"
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    onTimeUpdate={(e) => setProgress((e.currentTarget.currentTime / e.currentTarget.duration) * 100)}
                    onLoadStart={() => console.log(`📥 [${video.id.slice(-4)}] Video element STARTED loading`)}
                    onLoadedMetadata={() => console.log(`📊 [${video.id.slice(-4)}] Metadata loaded`)}
                    onCanPlay={() => console.log(`✅ [${video.id.slice(-4)}] Can play`)}
                    onPlaying={() => console.log(`▶️ [${video.id.slice(-4)}] Playing`)}
                    onWaiting={() => console.log(`⏳ [${video.id.slice(-4)}] Buffering`)}
                    onError={(e) => {
                        const error = e.currentTarget.error;
                        if (error && error.code !== 4) { // Ignore MEDIA_ERR_SRC_NOT_SUPPORTED when src is empty
                            console.error(`❌ [${video.id.slice(-4)}] Video error:`, error.message);
                        }
                    }}
                />
            )}
            
            {/* Show thumbnail when inactive or video not loaded */}
            {!isActive && (
                <img
                    src={getThumbnailUrl(video.url, video.thumbnailUrl)}
                    className="w-full h-full object-cover"
                    alt="Thumbnail"
                />
            )}

            {/* Play/Pause/Mute Feedback Icons */}
            {showMuteIcon && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
                    <div className="bg-black/50 p-6 rounded-full animate-ping-once transition-all scale-150">
                        {muted ? <MdVolumeOff className="text-white text-5xl" /> : <MdVolumeUp className="text-white text-5xl" />}
                    </div>
                </div>
            )}

            {!isPlaying && isActive && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/20" onClick={(e) => { e.stopPropagation(); videoRef.current?.play(); }}>
                    <MdPlayArrow className="text-white text-6xl opacity-80" />
                </div>
            )}

            {/* Progress Bar */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20 z-50">
                <div className="h-full bg-white transition-all duration-100" style={{ width: `${progress}%` }} />
            </div>

            {/* Overlay UI */}
            <div className="absolute inset-0 p-4 flex flex-col justify-between pointer-events-none">
                <div className="flex justify-between items-start pointer-events-auto">
                    <span className="text-white font-bold text-lg drop-shadow-md">Shorts</span>
                    {currentUser?.isSultanAdmin && (
                        <div className="relative">
                            <button onClick={(e) => { e.stopPropagation(); setShowAdminMenu(!showAdminMenu); }} className="p-2 bg-black/20 rounded-full">
                                <MdMoreVert className="text-white text-2xl" />
                            </button>
                            {showAdminMenu && (
                                <div className="absolute right-0 top-10 bg-[#282828] rounded-lg shadow-xl py-2 w-48 z-50 border border-gray-700">
                                    <button onClick={() => onAdminAction('toggle', video)} className="w-full px-4 py-2 text-left text-white hover:bg-white/10 flex items-center gap-2">
                                        {video.isActive !== false ? <MdVisibilityOff /> : <MdVisibility />}
                                        {video.isActive !== false ? 'Deactivate' : 'Activate'}
                                    </button>
                                    <button onClick={() => onAdminAction('delete', video)} className="w-full px-4 py-2 text-left text-red-500 hover:bg-white/10 flex items-center gap-2">
                                        <MdDelete /> Delete
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="flex justify-between items-end mb-4 pointer-events-auto">
                    <div className="flex-1 pr-4">
                        <div className="flex items-center gap-2 mb-2">
                            <img src={`https://ui-avatars.com/api/?name=${video.secUser.name}&background=ffd700`} className="w-9 h-9 rounded-full border border-white/20" alt="avatar" />
                            <span className="text-white font-bold">{getUploaderHandle(video)}</span>
                        </div>
                        <h3 className="text-white text-sm line-clamp-2 mb-2">{video.title || video.fileName}</h3>
                        <div className="flex gap-3 text-white/80 text-xs">
                            <span>{formatCount(video.views)} views</span>
                            {video.secUser.store && <span>{video.secUser.store.storeName}</span>}
                        </div>
                    </div>

                    <div className="flex flex-col gap-5 items-center">
                        <button onClick={(e) => { e.stopPropagation(); handleLikeClick(); }} className="flex flex-col items-center">
                            <div className={`p-3 rounded-full transition-colors ${localInteractions.hasLiked ? 'bg-red-500' : 'bg-black/40 backdrop-blur-md'}`}>
                                <MdThumbUp className={`text-2xl ${localInteractions.hasLiked ? 'text-white' : 'text-white/90'}`} />
                            </div>
                            <span className="text-white text-xs mt-1 font-bold">{formatCount(video.likes)}</span>
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); onComment(video.id); }} className="flex flex-col items-center">
                            <div className="p-3 bg-black/40 backdrop-blur-md rounded-full"><MdComment className="text-2xl text-white" /></div>
                            <span className="text-white text-xs mt-1 font-bold">{formatCount(video.commentsCount || 0)}</span>
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); onRating(video.id); }} className="flex flex-col items-center">
                            <div className="p-3 bg-black/40 backdrop-blur-md rounded-full">
                                {localInteractions.userRating ? <MdStar className="text-2xl text-yellow-400" /> : <MdStarOutline className="text-2xl text-white" />}
                            </div>
                            <span className="text-white text-xs mt-1 font-bold">{video.rating ? `${video.rating.toFixed(1)}★` : 'Rate'}</span>
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); onShare(video); }} className="flex flex-col items-center">
                            <div className="p-3 bg-black/40 backdrop-blur-md rounded-full"><MdShare className="text-2xl text-white" /></div>
                            <span className="text-white text-xs mt-1 font-bold">Share</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const AdSlide = ({ data }: any) => (
    <div className="relative w-full h-full bg-black flex-shrink-0 snap-start flex items-center justify-center">
        <img src={data.imageUrl} className="w-full h-full object-fill" alt="Sponsored" />
        <div className="absolute top-4 right-4 bg-yellow-500 text-black px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">Sponsored</div>
        <div className="absolute bottom-10 left-4">
            <h4 className="text-white font-bold text-xl drop-shadow-lg">Featured Partner</h4>
            <p className="text-white/80 text-sm">Swipe up to resume</p>
        </div>
    </div>
);

// --- Main Component ---

export const ShortsPlayer: React.FC<ShortsPlayerProps> = ({
    videos: propVideos,
    onVideoChange,
    startingVideoId,
    onVideoStatsUpdate,
    currentUserId,
    currentUser
}) => {
    const [videos, setVideos] = useState<Video[]>([]);
    const [adImageUrls, setAdImageUrls] = useState<string[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [muted, setMuted] = useState(true);
    const [modals, setModals] = useState({ comments: false, rating: false, videoId: '' });
    const isInitialLoadRef = useRef(true);

    const containerRef = useRef<HTMLDivElement>(null);

    // 1. Data Fetching
    useEffect(() => {
        if (propVideos) setVideos(propVideos);
        else {
            fetch(`${API_BASE_URL}/pitch-sultan/videos?limit=100`)
                .then(res => res.json())
                .then(data => data.success && setVideos(data.data));
        }

        fetch(`${API_BASE_URL}/pitch-sultan/ad`)
            .then(res => res.json())
            .then(data => data.success && setAdImageUrls(data.urls || [data.url]));
    }, [propVideos]);

    // 2. Pre-mixed Feed (The "Clean Feed" Logic)
    const feed = useMemo(() => {
        const result: FeedItem[] = [];
        videos.forEach((video, i) => {
            result.push({ type: 'video', data: video, id: video.id });
            if ((i + 1) % 8 === 0 && adImageUrls.length > 0) {
                const adUrl = adImageUrls[Math.floor(Math.random() * adImageUrls.length)];
                result.push({ type: 'ad', data: { imageUrl: adUrl }, id: `ad-${video.id}` });
            }
        });
        return result;
    }, [videos, adImageUrls]);

    // 3. Handle Initial Scroll to Start Video (only on first load)
    useEffect(() => {
        if (feed.length > 0 && startingVideoId && isInitialLoadRef.current) {
            const index = feed.findIndex(item => item.id === startingVideoId);
            if (index !== -1) {
                setCurrentIndex(index);
                setTimeout(() => {
                    containerRef.current?.scrollTo({ top: index * containerRef.current.clientHeight, behavior: 'auto' });
                    isInitialLoadRef.current = false; // Mark as done after scrolling
                }, 100);
            }
        }
    }, [feed, startingVideoId]);

    // 4. Scroll Intersection Logic with delay to prevent fast-scroll downloads
    useEffect(() => {
        const activationTimers = new Map<Element, NodeJS.Timeout>();
        
        const obs = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    const index = parseInt(entry.target.getAttribute('data-index') || '0');
                    
                    if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
                        // Skip delay for first video on initial load only
                        const delay = (isInitialLoadRef.current && index === 0) ? 0 : 300;
                        
                        const timer = setTimeout(() => {
                            setCurrentIndex(index);
                            const item = feed[index];
                            if (item?.type === 'video' && onVideoChange) onVideoChange(item.data);
                            isInitialLoadRef.current = false; // Mark initial load as done
                        }, delay);
                        activationTimers.set(entry.target, timer);
                    } else {
                        // Cancel activation if scrolled away before delay
                        const timer = activationTimers.get(entry.target);
                        if (timer) {
                            clearTimeout(timer);
                            activationTimers.delete(entry.target);
                        }
                    }
                });
            },
            { threshold: 0.5, root: containerRef.current }
        );

        if (containerRef.current) {
            Array.from(containerRef.current.children).forEach(el => obs.observe(el));
        }
        return () => {
            activationTimers.forEach(timer => clearTimeout(timer));
            obs.disconnect();
        };
    }, [feed, onVideoChange]);

    // 5. Shared Actions (Now only handles the network call, state is local to slide)
    const handleLike = async (id: string, currentlyLiked: boolean) => {
        if (!currentUserId) return alert('Please login');
        const res = await fetch(`${API_BASE_URL}/pitch-sultan/videos/${id}/toggle-like`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: currentUserId })
        });
        const data = await res.json();
        if (data.success) {
            // Update the main video list stats (likes count)
            setVideos(prev => prev.map(v => v.id === id ? { ...v, likes: data.data.totalLikes } : v));
            onVideoStatsUpdate?.(id, { likes: data.data.totalLikes });
        }
    };

    const handleView = async (id: string) => {
        const res = await fetch(`${API_BASE_URL}/pitch-sultan/videos/${id}/view`, { method: 'PUT' });
        const data = await res.json();
        if (data.success) {
            setVideos(prev => prev.map(v => v.id === id ? { ...v, views: data.data.views } : v));
            onVideoStatsUpdate?.(id, { views: data.data.views });
        }
    };

    const handleAdminAction = async (type: 'delete' | 'toggle', video: Video) => {
        const token = localStorage.getItem('token');
        if (!token) return;

        if (type === 'delete' && !window.confirm('Delete this video?')) return;

        const url = `${API_BASE_URL}/pitch-sultan/videos/${video.id}${type === 'toggle' ? '/toggle-active' : ''}`;
        const method = type === 'delete' ? 'DELETE' : 'PATCH';

        const res = await fetch(url, { method, headers: { 'Authorization': `Bearer ${token}` } });
        const data = await res.json();
        if (data.success) {
            if (type === 'delete') setVideos(prev => prev.filter(v => v.id !== video.id));
            else setVideos(prev => prev.map(v => v.id === video.id ? { ...v, isActive: data.data.isActive } : v));
            alert('Action successful');
        }
    };

    return (
        <div className="fixed inset-0 bg-black flex justify-center overflow-hidden" style={{ paddingTop: '56px', paddingBottom: '60px' }}>
            <div ref={containerRef} className="w-full max-w-[400px] h-full overflow-y-scroll snap-y snap-mandatory scrollbar-hide">
                {feed.map((item, index) => {
                    const isCurrentVideo = index === currentIndex;

                    return (
                        <div key={item.id} data-index={index} className="w-full h-full snap-start">
                            {item.type === 'video' ? (
                                <VideoSlide
                                    video={item.data}
                                    isActive={isCurrentVideo}
                                    muted={muted}
                                    toggleMute={() => setMuted(!muted)}
                                    onLike={handleLike}
                                    onComment={(id: string) => setModals({ ...modals, videoId: id, comments: true })}
                                    onRating={(id: string) => setModals({ ...modals, videoId: id, rating: true })}
                                    onShare={(v: Video) => navigator.share?.({ title: v.title, url: window.location.href }).catch(() => alert('Link copied'))}
                                    currentUserId={currentUserId}
                                    currentUser={currentUser}
                                    onAdminAction={handleAdminAction}
                                    onView={handleView}
                                />
                            ) : (
                                <AdSlide data={item.data} />
                            )}
                        </div>
                    );
                })}
            </div>

            <CommentsModal
                isOpen={modals.comments}
                onClose={() => setModals({ ...modals, comments: false })}
                videoId={modals.videoId}
                currentUserId={currentUserId}
                currentUser={currentUser}
                onCommentAdded={(count) => {
                    setVideos(prev => prev.map(v => v.id === modals.videoId ? { ...v, commentsCount: count } : v));
                    onVideoStatsUpdate?.(modals.videoId, { commentsCount: count });
                }}
            />

            <RatingModal
                isOpen={modals.rating}
                onClose={() => setModals({ ...modals, rating: false })}
                videoId={modals.videoId}
                currentUserId={currentUserId}
                videoTitle={videos.find(v => v.id === modals.videoId)?.title}
                onRatingUpdate={(avg, count) => {
                    setVideos(prev => prev.map(v => v.id === modals.videoId ? { ...v, rating: avg, ratingCount: count } : v));
                    onVideoStatsUpdate?.(modals.videoId, { rating: avg, ratingCount: count });
                    // Note: Local interaction state in VideoSlide will need a way to refresh or we just accept it's "rated"
                    // For now, since we re-fetch on active, it will be correct on next view
                }}
            />

            <style>{`.scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; } .scrollbar-hide::-webkit-scrollbar { display: none; }`}</style>
        </div>
    );
};