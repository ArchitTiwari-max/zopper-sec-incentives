import React, { useState, useEffect, useRef } from 'react';
import {
    MdThumbUp, MdThumbDown, MdComment, MdShare, MdMoreVert,
    MdVolumeOff, MdVolumeUp, MdPause, MdPlayArrow, MdStar,
    MdOutlineThumbUp, MdStarOutline, MdVisibility, MdVisibilityOff, MdDelete
} from 'react-icons/md';
import { API_BASE_URL } from '@/lib/config';
import { CommentsModal } from './CommentsModal';
import { RatingModal } from './RatingModal';
import { StarRating } from './StarRating';
import { isSultanAdmin } from '@/lib/auth';
import { getThumbnailUrl, getOptimizedVideoUrl } from '@/utils/videoUtils';

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

interface AdSlide {
    id: string;
    type: 'ad';
    imageUrl: string;
}

type ContentItem = Video | AdSlide;

interface ShortsPlayerProps {
    videos?: Video[];
    onVideoChange?: (video: Video) => void;
    startingVideoId?: string; // Add this to start from a specific video
    onVideoStatsUpdate?: (videoId: string, updates: { views?: number, likes?: number, commentsCount?: number, rating?: number, ratingCount?: number }) => void;
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
    const [contentItems, setContentItems] = useState<ContentItem[]>([]); // Combined videos and ads
    const [adImageUrl, setAdImageUrl] = useState<string | null>(null); // Ad image URL
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [muted, setMuted] = useState(true);
    const [videoPlayingStates, setVideoPlayingStates] = useState<{ [key: string]: boolean }>({}); // Track playing state per video
    const [isProgrammaticScroll, setIsProgrammaticScroll] = useState(false);
    const [viewedVideos, setViewedVideos] = useState<Set<string>>(new Set()); // Track which videos have been viewed
    const [videoProgress, setVideoProgress] = useState<{ [key: string]: number }>({}); // Track progress for each video
    const [userInteractions, setUserInteractions] = useState<{ [key: string]: { hasLiked: boolean, userRating: number | null } }>({}); // Track user interactions
    const [likeAnimations, setLikeAnimations] = useState<{ [key: string]: boolean }>({}); // Track like animations
    const [floatingHearts, setFloatingHearts] = useState<{ [key: string]: boolean }>({}); // Track floating heart animations
    const [showCommentsModal, setShowCommentsModal] = useState(false);
    const [showRatingModal, setShowRatingModal] = useState(false);
    const [selectedVideoForModal, setSelectedVideoForModal] = useState<string | null>(null);
    const [showAdminMenu, setShowAdminMenu] = useState(false);
    const [showUserTooltip, setShowUserTooltip] = useState<string | null>(null); // For user tooltip (changed from hoveredUser)
    const [isLayoutReady, setIsLayoutReady] = useState(false); // Track layout readiness
    const [audioUnlocked, setAudioUnlocked] = useState(false); // Track site-wide audio permission
    const [isHeld, setIsHeld] = useState(false); // Track when video is being held to pause
    const containerRef = useRef<HTMLDivElement>(null);
    const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
    const viewTimers = useRef<Map<string, NodeJS.Timeout>>(new Map()); // Track view timers
    const holdTimeoutRef = useRef<NodeJS.Timeout | null>(null); // Track hold timer
    const programmaticScrollVideoId = useRef<string | null>(null); // Track which video was programmatically scrolled to
    const audioContextRef = useRef<AudioContext | null>(null); // Audio context for site-wide permission

    // Fetch videos if not provided as props
    useEffect(() => {
        if (propVideos) {
            setVideos(propVideos);
            setLoading(false);
        } else {
            fetchVideos();
        }
    }, [propVideos]);

    // Fetch Ad Image
    useEffect(() => {
        const fetchAd = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/pitch-sultan/ad`);
                const data = await res.json();
                console.log('🔍 Shorts Ad fetch response:', data);
                if (data.success && data.url) {
                    setAdImageUrl(data.url);
                    console.log('✅ Shorts Ad image set:', data.url);
                } else {
                    console.log('❌ No ad image found for shorts');
                }
            } catch (e) {
                console.error("Failed to fetch ad for shorts", e);
            }
        };
        fetchAd();
    }, []);

    // Create content items (videos + ads) when videos or ad changes
    useEffect(() => {
        if (videos.length > 0) {
            const items: ContentItem[] = [];
            
            videos.forEach((video, index) => {
                items.push(video);
                
                // Insert ad after every 8 videos (index 7, 15, 23, etc.)
                if ((index + 1) % 8 === 0 && adImageUrl) {
                    items.push({
                        id: `ad-${Math.floor(index / 8)}`,
                        type: 'ad',
                        imageUrl: adImageUrl
                    });
                    console.log(`🎯 Inserted ad after video ${index + 1}`);
                }
            });
            
            setContentItems(items);
            console.log(`📋 Created ${items.length} content items (${videos.length} videos + ${items.length - videos.length} ads)`);
        }
    }, [videos, adImageUrl]);

    // Layout readiness check - ensure DOM is stable before positioning
    useEffect(() => {
        const checkLayoutReady = () => {
            // Check if header exists and is in position
            const header = document.querySelector('[class*="fixed"][class*="top-0"]');
            const hasHeader = header && header.getBoundingClientRect().top === 0;

            if (hasHeader) {
                // Wait for next frame to ensure layout is complete
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        setIsLayoutReady(true);
                    });
                });
            } else {
                // Retry if header not ready
                setTimeout(checkLayoutReady, 50);
            }
        };

        // Small delay to ensure header and other elements are in final position
        const timer = setTimeout(checkLayoutReady, 100);
        return () => clearTimeout(timer);
    }, []);

    // Initialize AudioContext for site-wide audio permission
    const unlockAudio = async () => {
        try {
            if (!audioContextRef.current) {
                audioContextRef.current = new AudioContext();
            }

            if (audioContextRef.current.state === 'suspended') {
                await audioContextRef.current.resume();
            }

            setAudioUnlocked(true);
            console.log('🔊 Audio unlocked for entire site');
            return true;
        } catch (error) {
            console.error('❌ Audio unlock failed:', error);
            return false;
        }
    };

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

    // Reset scroll ref when startingVideoId changes
    useEffect(() => {
        hasScrolledRef.current = false;
    }, [startingVideoId]);

    // Set starting video index based on startingVideoId and scroll to it
    useEffect(() => {
        if (contentItems.length > 0 && startingVideoId && !hasScrolledRef.current && isLayoutReady) {
            const startIndex = contentItems.findIndex(item => 
                item.type !== 'ad' && (item as Video).id === startingVideoId
            );
            console.log('🎯 Looking for video ID:', startingVideoId, 'Found at index:', startIndex);

            if (startIndex !== -1) {
                console.log('🎯 Setting up programmatic scroll to index:', startIndex, 'for video ID:', startingVideoId);
                hasScrolledRef.current = true;
                setCurrentIndex(startIndex);
                setIsProgrammaticScroll(true);
                programmaticScrollVideoId.current = startingVideoId; // Track which video we're scrolling to
                console.log('🔧 isProgrammaticScroll set to TRUE for video:', startingVideoId);

                // Clear all view timers during programmatic scroll to prevent false views
                viewTimers.current.forEach(timer => clearTimeout(timer));
                viewTimers.current.clear();

                // Wait for layout to be fully stable before scrolling
                setTimeout(() => {
                    if (containerRef.current) {
                        // Use scrollIntoView for more reliable scrolling
                        const targetVideo = containerRef.current.children[startIndex] as HTMLElement;
                        if (targetVideo) {
                            targetVideo.scrollIntoView({
                                behavior: 'smooth',
                                block: 'start'
                            });
                            console.log('📍 Scrolled to content element:', startIndex);

                            // Reset programmatic scroll flag when scroll animation completes
                            // Use a longer timeout to ensure all intersection observer events complete
                            setTimeout(() => {
                                console.log('🔧 isProgrammaticScroll set to FALSE (scroll complete)');
                                setIsProgrammaticScroll(false);
                            }, 3000); // Increased to 3 seconds
                        } else {
                            // Fallback to manual scroll calculation
                            const scrollTop = startIndex * containerRef.current.clientHeight;
                            containerRef.current.scrollTo({
                                top: scrollTop,
                                behavior: 'smooth'
                            });
                            console.log('📍 Fallback scroll to position:', scrollTop);

                            // Reset programmatic scroll flag when scroll animation completes
                            setTimeout(() => {
                                console.log('🔧 isProgrammaticScroll set to FALSE (fallback complete)');
                                setIsProgrammaticScroll(false);
                            }, 3000); // Increased to 3 seconds
                        }
                    }
                }, 300); // Increased delay to ensure DOM and layout are fully ready
            }
        }
    }, [contentItems, startingVideoId, isLayoutReady]);

    // Handle video change
    useEffect(() => {
        if (contentItems.length > 0 && onVideoChange) {
            const currentItem = contentItems[currentIndex];
            if (currentItem && currentItem.type !== 'ad') {
                onVideoChange(currentItem as Video);
            }
        }
    }, [currentIndex, contentItems, onVideoChange]);

    // Initialize playing states for all videos when content items change
    useEffect(() => {
        if (contentItems.length > 0) {
            videoRefs.current = videoRefs.current.slice(0, contentItems.length);
            const initialPlayingStates: { [key: string]: boolean } = {};
            contentItems.forEach(item => {
                if (item.type !== 'ad') {
                    const video = item as Video;
                    // If we already have a state for this video, keep it
                    if (videoPlayingStates[video.id] === undefined) {
                        initialPlayingStates[video.id] = false; // Default to not playing
                    }
                }
            });
            if (Object.keys(initialPlayingStates).length > 0) {
                setVideoPlayingStates(prev => ({ ...prev, ...initialPlayingStates }));
            }
        }
    }, [contentItems]);

    // Intersection Observer to auto-play videos when they come into view
    useEffect(() => {
        if (!containerRef.current || contentItems.length === 0 || !isLayoutReady) return;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    const element = entry.target as HTMLElement;
                    const itemIndex = Array.from(containerRef.current?.children || []).findIndex(child => child === element);
                    const contentItem = contentItems[itemIndex];

                    if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
                        console.log('🎯 Content intersecting:', itemIndex, 'type:', contentItem?.type, 'isProgrammaticScroll:', isProgrammaticScroll);

                        // Content is more than 50% visible
                        // Don't update currentIndex if we're doing programmatic scrolling
                        if (!isProgrammaticScroll) {
                            setCurrentIndex(itemIndex);
                        }

                        // Only handle video logic for actual videos, not ads
                        if (contentItem && contentItem.type !== 'ad') {
                            const video = contentItem as Video;
                            const videoElement = element.querySelector('video') as HTMLVideoElement;
                            
                            if (videoElement) {
                                // Check if this is the video we programmatically scrolled to
                                const isTargetVideo = programmaticScrollVideoId.current === video.id;

                                // Only reset video to beginning if not during programmatic scroll OR not the target video
                                if (!isProgrammaticScroll && !isTargetVideo) {
                                    console.log('🔄 Resetting video to 0 (normal scroll)');
                                    // Reset video to start from beginning
                                    videoElement.currentTime = 0;
                                    // Reset progress
                                    setVideoProgress(prev => ({
                                        ...prev,
                                        [video.id]: 0
                                    }));
                                } else {
                                    console.log('⏭️ Skipping reset (programmatic scroll or target video)');
                                    // If this is the target video and we're done with programmatic scroll, clear the ref
                                    if (isTargetVideo && !isProgrammaticScroll) {
                                        programmaticScrollVideoId.current = null;
                                        console.log('🧹 Cleared programmaticScrollVideoId');
                                    }
                                }

                                // Ensure mute state is properly applied
                                videoElement.muted = muted;

                                videoElement.play().then(() => {
                                    // Double-check mute state after play starts
                                    videoElement.muted = muted;

                                    // Update playing state for this video
                                    setVideoPlayingStates(prev => ({
                                        ...prev,
                                        [video.id]: true
                                    }));
                                    // Start view timer when video actually starts playing
                                    startViewTimer(video.id);
                                }).catch(console.error);
                            }
                        }

                        // Pause all other videos, reset them to beginning, and stop their view timers
                        contentItems.forEach((otherItem, index) => {
                            if (otherItem.type !== 'ad' && index !== itemIndex) {
                                const otherVideo = otherItem as Video;
                                const otherElement = containerRef.current?.children[index] as HTMLElement;
                                const otherVideoElement = otherElement?.querySelector('video') as HTMLVideoElement;
                                
                                if (otherVideoElement && !otherVideoElement.paused) {
                                    otherVideoElement.pause();
                                    // Update playing state for other videos
                                    setVideoPlayingStates(prev => ({
                                        ...prev,
                                        [otherVideo.id]: false
                                    }));
                                    
                                    // Only reset to beginning if not during programmatic scroll
                                    if (!isProgrammaticScroll) {
                                        otherVideoElement.currentTime = 0; // Reset to beginning
                                        setVideoProgress(prev => ({
                                            ...prev,
                                            [otherVideo.id]: 0
                                        }));
                                    }
                                    stopViewTimer(otherVideo.id);
                                }
                            }
                        });
                    } else if (!entry.isIntersecting && contentItem && contentItem.type !== 'ad') {
                        // Content is not visible - pause video if it's a video
                        const video = contentItem as Video;
                        const videoElement = element.querySelector('video') as HTMLVideoElement;
                        
                        if (videoElement) {
                            videoElement.pause();

                            // Update playing state when video goes out of view
                            setVideoPlayingStates(prev => ({
                                ...prev,
                                [video.id]: false
                            }));

                            // Only reset to beginning when not doing programmatic scroll
                            if (!isProgrammaticScroll) {
                                videoElement.currentTime = 0; // Reset to beginning when leaving
                                // Reset progress
                                setVideoProgress(prev => ({
                                    ...prev,
                                    [video.id]: 0
                                }));
                            }

                            stopViewTimer(video.id);
                        }
                    }
                });
            },
            {
                root: containerRef.current,
                threshold: [0.5], // Trigger when 50% of content is visible
            }
        );

        // Observe all content elements
        if (containerRef.current) {
            Array.from(containerRef.current.children).forEach((element) => {
                observer.observe(element);
            });
        }

        return () => {
            observer.disconnect();
            // Clear all view timers when component unmounts
            viewTimers.current.forEach(timer => clearTimeout(timer));
            viewTimers.current.clear();

            // Cleanup AudioContext
            if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
                audioContextRef.current.close();
            }
        };
    }, [contentItems.length, isProgrammaticScroll, isLayoutReady]); // Add isLayoutReady dependency

    // Handle mute/unmute for all videos
    useEffect(() => {
        contentItems.forEach((item, index) => {
            if (item.type !== 'ad') {
                const element = containerRef.current?.children[index] as HTMLElement;
                const videoElement = element?.querySelector('video') as HTMLVideoElement;
                if (videoElement) {
                    videoElement.muted = muted;
                    // Force update for the current video to ensure it's properly synced
                    if (index === currentIndex) {
                        // Small delay to ensure video element is ready
                        setTimeout(() => {
                            if (videoElement && !videoElement.paused) {
                                videoElement.muted = muted;
                            }
                        }, 100);
                    }
                }
            }
        });
    }, [muted, currentIndex, contentItems]); // Add contentItems dependency

    // Handle scroll/swipe navigation
    useEffect(() => {
        const goToPrevious = () => {
            if (currentIndex > 0 && containerRef.current) {
                const prevIndex = currentIndex - 1;
                const targetElement = containerRef.current.children[prevIndex] as HTMLElement;
                if (targetElement) {
                    targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }
        };

        const goToNext = () => {
            if (currentIndex < contentItems.length - 1 && containerRef.current) {
                const nextIndex = currentIndex + 1;
                const targetElement = containerRef.current.children[nextIndex] as HTMLElement;
                if (targetElement) {
                    targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
                // Only toggle play/pause for videos, not ads
                const currentItem = contentItems[currentIndex];
                if (currentItem && currentItem.type !== 'ad') {
                    togglePlayPause(currentIndex);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentIndex, contentItems.length]);

    const togglePlayPause = (itemIndex: number) => {
        const contentItem = contentItems[itemIndex];
        if (contentItem && contentItem.type !== 'ad') {
            const video = contentItem as Video;
            const element = containerRef.current?.children[itemIndex] as HTMLElement;
            const videoElement = element?.querySelector('video') as HTMLVideoElement;
            
            if (videoElement) {
                if (videoElement.paused) {
                    videoElement.play().catch(console.error);
                    // State will be updated by onPlay listener
                } else {
                    videoElement.pause();
                    // State will be updated by onPause listener
                }
            }
        }
    };

    const handleHoldStart = (itemIndex: number) => {
        const contentItem = contentItems[itemIndex];
        if (contentItem && contentItem.type !== 'ad') {
            // Wait 200ms before pausing to ensure it's a "hold" and not a "tap"
            if (holdTimeoutRef.current) clearTimeout(holdTimeoutRef.current);

            holdTimeoutRef.current = setTimeout(() => {
                const element = containerRef.current?.children[itemIndex] as HTMLElement;
                const videoElement = element?.querySelector('video') as HTMLVideoElement;
                if (videoElement && !videoElement.paused) {
                    videoElement.pause();
                    setIsHeld(true);
                }
            }, 200);
        }
    };

    const handleHoldEnd = (itemIndex: number) => {
        const contentItem = contentItems[itemIndex];
        if (contentItem && contentItem.type !== 'ad') {
            // Clear the timer so it doesn't pause if the user already let go (it was a tap)
            if (holdTimeoutRef.current) {
                clearTimeout(holdTimeoutRef.current);
                holdTimeoutRef.current = null;
            }

            if (isHeld) {
                const element = containerRef.current?.children[itemIndex] as HTMLElement;
                const videoElement = element?.querySelector('video') as HTMLVideoElement;
                if (videoElement) {
                    videoElement.play().catch(console.error);
                }
                setIsHeld(false);
            }
        }
    };

    const toggleMute = async () => {
        // First mute button click unlocks audio for entire site
        if (!audioUnlocked) {
            const success = await unlockAudio();
            if (!success) {
                console.warn('⚠️ Failed to unlock audio');
            }
        }

        const newMutedState = !muted;
        setMuted(newMutedState);

        // Apply to current video immediately if it's a video (not ad)
        const currentItem = contentItems[currentIndex];
        if (currentItem && currentItem.type !== 'ad') {
            const element = containerRef.current?.children[currentIndex] as HTMLElement;
            const videoElement = element?.querySelector('video') as HTMLVideoElement;
            if (videoElement) {
                videoElement.muted = newMutedState;
            }
        }
    };

    const handleLike = async (videoId: string) => {
        if (!currentUserId) {
            alert('Please log in to like videos');
            return;
        }

        // Trigger animations
        setLikeAnimations(prev => ({ ...prev, [videoId]: true }));
        setFloatingHearts(prev => ({ ...prev, [videoId]: true }));
        
        // Reset animations
        setTimeout(() => {
            setLikeAnimations(prev => ({ ...prev, [videoId]: false }));
        }, 600);
        
        setTimeout(() => {
            setFloatingHearts(prev => ({ ...prev, [videoId]: false }));
        }, 1500);

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

    const handleCommentCountUpdate = (newCount?: number) => {
        // Update the comment count for the selected video
        if (selectedVideoForModal) {
            const currentVideo = videos.find(v => v.id === selectedVideoForModal);
            if (!currentVideo) return;

            // Use provided count, or if not provided, just keep the current count (don't auto-increment)
            // This prevents the "delete increments count" bug because we now pass the correct count from CommentsModal
            const finalCount = newCount !== undefined ? newCount : currentVideo.commentsCount;

            // Update local state
            setVideos(prevVideos =>
                prevVideos.map(video =>
                    video.id === selectedVideoForModal
                        ? { ...video, commentsCount: finalCount }
                        : video
                )
            );

            // Notify parent component to update its state
            if (onVideoStatsUpdate) {
                onVideoStatsUpdate(selectedVideoForModal, { commentsCount: finalCount });
            }
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

    // Delete video (Sultan Admin only)
    const handleDeleteVideo = async (videoId: string) => {
        const confirmDelete = window.confirm('Are you sure you want to delete this video? This action cannot be undone.');
        
        if (!confirmDelete) {
            return;
        }

        try {
            const token = localStorage.getItem('token');
            if (!token) {
                alert('Authentication required');
                return;
            }

            const response = await fetch(`${API_BASE_URL}/pitch-sultan/videos/${videoId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();

            if (data.success) {
                // Remove the video from local state
                setVideos(prevVideos => prevVideos.filter(video => video.id !== videoId));
                alert('Video deleted successfully!');
                setShowAdminMenu(false);
                
                // If we're currently viewing the deleted video, navigate to the next one
                const currentItem = contentItems[currentIndex];
                if (currentItem && currentItem.type !== 'ad' && (currentItem as Video).id === videoId) {
                    // Navigate to next video or previous if this was the last one
                    const nextIndex = currentIndex < contentItems.length - 1 ? currentIndex : currentIndex - 1;
                    if (nextIndex >= 0 && containerRef.current) {
                        const targetElement = containerRef.current.children[nextIndex] as HTMLElement;
                        if (targetElement) {
                            targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }
                    }
                }
            } else {
                alert(data.error || 'Failed to delete video');
            }
        } catch (error) {
            console.error('Error deleting video:', error);
            alert('Failed to delete video');
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

        // Also update parent component (home feed) so it shows the new rating
        if (onVideoStatsUpdate) {
            onVideoStatsUpdate(videoId, { rating: newRating, ratingCount });
        }
    };

    const handleView = async (videoId: string) => {
        try {
            const response = await fetch(`${API_BASE_URL}/pitch-sultan/videos/${videoId}/view`, {
                method: 'PUT'
            });
            const data = await response.json();

            if (data.success && data.data) {
                const updatedViews = data.data.views;

                // Update local state
                setVideos(prevVideos =>
                    prevVideos.map(video =>
                        video.id === videoId
                            ? { ...video, views: updatedViews }
                            : video
                    )
                );

                // Notify parent component
                if (onVideoStatsUpdate) {
                    onVideoStatsUpdate(videoId, { views: updatedViews });
                }
            }
        } catch (error) {
            console.error('❌ Error recording view:', error);
        }
    };

    const startViewTimer = (videoId: string) => {
        // Check if timer already exists and is still running
        const existingTimer = viewTimers.current.get(videoId);
        if (existingTimer) {
            // Timer already running for this video, don't start another
            return;
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

    if (loading || !isLayoutReady) {
        return (
            <div className="fixed inset-0 bg-black flex items-center justify-center" style={{ paddingTop: '56px', paddingBottom: '60px' }}>
                <div className="w-full max-w-[400px] h-full bg-black flex items-center justify-center">
                    <div className="w-12 h-12 border-4 border-gray-700 border-t-white rounded-full animate-spin"></div>
                </div>
            </div>
        );
    }

    if (contentItems.length === 0) {
        return (
            <div className="fixed inset-0 bg-black flex items-center justify-center" style={{ paddingTop: '56px', paddingBottom: '60px' }}>
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

    const currentItem = contentItems[currentIndex];
    const currentVideo = currentItem && currentItem.type !== 'ad' ? currentItem as Video : null;

    return (
        <div className="fixed inset-0 bg-black flex items-center justify-center overflow-hidden" style={{ paddingTop: '56px', paddingBottom: '60px' }}>
            {/* Vertical scrollable container */}
            <div
                ref={containerRef}
                className="relative w-full max-w-[400px] h-full bg-black overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
                {/* Render all content items (videos + ads) */}
                {contentItems.map((item, index) => (
                    <div
                        key={item.id}
                        className="relative w-full h-full flex-shrink-0 snap-start"
                        style={{ aspectRatio: '9/16' }}
                    >
                        {item.type === 'ad' ? (
                            /* Ad Slide */
                            <div className="relative w-full h-full bg-black flex items-center justify-center">
                                <img
                                    src={(item as AdSlide).imageUrl}
                                    alt="Sponsored"
                                    className="w-full h-full object-cover"
                                    onError={() => console.log('❌ Ad image failed to load')}
                                    onLoad={() => console.log('✅ Ad image loaded successfully')}
                                />
                                
                                {/* Ad Label */}
                                <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded-md text-xs font-bold text-yellow-500 border border-yellow-500/40 z-10 shadow-lg pointer-events-none">
                                    Sponsored
                                </div>
                                
                                {/* Ad Overlay */}
                                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/60 flex flex-col justify-between p-4 pb-1 pointer-events-none">
                                    {/* Top Controls */}
                                    <div className="flex justify-between items-start pointer-events-auto">
                                        <div className="text-white text-sm font-medium">
                                            Shorts
                                        </div>
                                    </div>
                                    
                                    {/* Bottom Content */}
                                    <div className="flex items-end justify-between mb-1">
                                        <div className="flex-1 pr-4">
                                            <p className="text-white text-base sm:text-lg font-bold mb-2">
                                                Sponsored Content
                                            </p>
                                            <p className="text-white/80 text-xs sm:text-sm">
                                                Swipe up to continue watching
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            /* Video Slide */
                            <>
                                {(() => {
                                    const video = item as Video;
                                    return (
                                        <>
                                            {/* Video Player */}
                                            <video
                                                src={getOptimizedVideoUrl(video.url)}
                                                poster={getThumbnailUrl(video.url, video.thumbnailUrl)}
                                                className="w-full h-full object-cover"
                                                loop
                                                muted={muted}
                                                playsInline
                                                preload="metadata"
                                                onClick={toggleMute}
                                                onPointerDown={() => handleHoldStart(index)}
                                                onPointerUp={() => handleHoldEnd(index)}
                                                onPointerLeave={() => handleHoldEnd(index)}
                                                onTimeUpdate={(e) => {
                                                    const v = e.currentTarget;
                                                    if (v.duration) {
                                                        setVideoProgress(prev => ({
                                                            ...prev,
                                                            [video.id]: (v.currentTime / v.duration) * 100
                                                        }));
                                                    }
                                                }}
                                                onLoadedMetadata={() => {
                                                    setVideoProgress(prev => ({
                                                        ...prev,
                                                        [video.id]: 0
                                                    }));
                                                }}
                                                onPlay={() => {
                                                    setVideoPlayingStates(prev => ({
                                                        ...prev,
                                                        [video.id]: true
                                                    }));
                                                }}
                                                onPause={() => {
                                                    setVideoPlayingStates(prev => ({
                                                        ...prev,
                                                        [video.id]: false
                                                    }));
                                                }}
                                            />

                                            {/* Serial Number Overlay */}
                                            {video.serialNumber && (
                                                <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded-md text-xs font-bold text-yellow-500 border border-yellow-500/40 z-10 shadow-lg pointer-events-none">
                                                    #{video.serialNumber}
                                                </div>
                                            )}

                                            {/* Progress Bar - positioned at the very bottom */}
                                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/50 z-50">
                                                <div
                                                    className="h-full bg-white transition-all duration-100 ease-linear"
                                                    style={{
                                                        width: `${videoProgress[video.id] || 0}%`
                                                    }}
                                                />
                                            </div>

                                            {/* Overlay Controls */}
                                            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/60 flex flex-col justify-between p-4 pb-1 pointer-events-none">

                                                {/* Top Controls */}
                                                <div className="flex justify-between items-start pointer-events-auto">
                                                    <div className="text-white text-sm font-medium">
                                                        Shorts
                                                    </div>
                                                    <div className="flex gap-2">
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
                                                                                
                                                                                {/* Delete Video Option */}
                                                                                <button
                                                                                    onClick={() => handleDeleteVideo(video.id)}
                                                                                    className="w-full px-4 py-2 text-left text-red-400 hover:bg-red-900/20 transition-colors flex items-center gap-2 text-sm"
                                                                                >
                                                                                    <MdDelete className="text-base" />
                                                                                    Delete Video
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    </>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Center Play/Pause - only show for current video when not just being held */}
                                                {index === currentIndex && videoPlayingStates[video.id] === false && !isHeld && (
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
                                                <div className="flex items-end justify-between mb-1">
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
                                                                            className="fixed inset-0 z-[150]"
                                                                            onClick={() => setShowUserTooltip(null)}
                                                                        />

                                                                        {/* Tooltip */}
                                                                        <div className="absolute bottom-full left-0 mb-2 w-64 bg-black/95 backdrop-blur-md text-white text-xs rounded-lg p-3 shadow-lg border border-gray-600 z-[151]">
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
                                                            <div className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-bold mb-2 ${video.isActive === false
                                                                ? 'bg-red-600/20 text-red-400 border border-red-600/40'
                                                                : 'bg-green-600/20 text-green-400 border border-green-600/40'
                                                                }`}>
                                                                <div className={`w-2 h-2 rounded-full ${video.isActive === false ? 'bg-red-400' : 'bg-green-400'
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
                                                            className="flex flex-col items-center relative"
                                                        >
                                                            {/* Floating Hearts Animation */}
                                                            {floatingHearts[video.id] && userInteractions[video.id]?.hasLiked && (
                                                                <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 pointer-events-none">
                                                                    <div className="floating-hearts">
                                                                        <span className="text-red-400 text-lg">❤️</span>
                                                                        <span className="text-pink-400 text-sm">💖</span>
                                                                        <span className="text-red-500 text-base">💕</span>
                                                                    </div>
                                                                </div>
                                                            )}
                                                            
                                                            <div className={`p-3 rounded-full backdrop-blur-sm transition-all duration-300 ${
                                                                userInteractions[video.id]?.hasLiked 
                                                                    ? 'bg-red-500/20 ring-2 ring-red-400/50' 
                                                                    : 'bg-black/30 hover:bg-black/50'
                                                            } ${
                                                                likeAnimations[video.id] 
                                                                    ? 'like-heartbeat like-pulse' 
                                                                    : ''
                                                            }`}>
                                                                {userInteractions[video.id]?.hasLiked ? (
                                                                    <MdThumbUp className="text-2xl text-red-400 drop-shadow-lg" />
                                                                ) : (
                                                                    <MdOutlineThumbUp className="text-2xl text-white/80" />
                                                                )}
                                                            </div>
                                                            <span className={`text-white text-xs font-semibold mt-1 transition-all duration-300 ${
                                                                likeAnimations[video.id] ? 'scale-110 text-red-300' : 'scale-100'
                                                            }`}>
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
                                        </>
                                    );
                                })()}
                            </>
                        )}
                    </div>
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
                onCommentAdded={handleCommentCountUpdate}
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

            {/* Custom scrollbar styles and animations */}
            <style>{`
                .scrollbar-hide {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
                .scrollbar-hide::-webkit-scrollbar {
                    display: none;
                }
                
                /* Custom like animation */
                @keyframes likeHeartBeat {
                    0% { transform: scale(1); }
                    25% { transform: scale(1.2); }
                    50% { transform: scale(1.1); }
                    75% { transform: scale(1.25); }
                    100% { transform: scale(1); }
                }
                
                .like-heartbeat {
                    animation: likeHeartBeat 0.6s ease-in-out;
                }
                
                /* Pulse effect for liked state */
                @keyframes likePulse {
                    0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
                    70% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
                }
                
                .like-pulse {
                    animation: likePulse 0.6s ease-out;
                }
                
                /* Floating hearts animation */
                @keyframes floatUp {
                    0% { 
                        opacity: 1; 
                        transform: translateY(0) scale(0.8); 
                    }
                    50% { 
                        opacity: 0.8; 
                        transform: translateY(-20px) scale(1); 
                    }
                    100% { 
                        opacity: 0; 
                        transform: translateY(-40px) scale(0.6); 
                    }
                }
                
                .floating-hearts {
                    display: flex;
                    gap: 8px;
                    animation: floatUp 1.5s ease-out;
                }
                
                .floating-hearts span {
                    animation: floatUp 1.5s ease-out;
                }
                
                .floating-hearts span:nth-child(1) {
                    animation-delay: 0s;
                }
                
                .floating-hearts span:nth-child(2) {
                    animation-delay: 0.2s;
                }
                
                .floating-hearts span:nth-child(3) {
                    animation-delay: 0.4s;
                }
            `}</style>
        </div >
    );
};