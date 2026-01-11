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
    isAd?: boolean; // Add isAd flag
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
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [muted, setMuted] = useState(true);
    const [videoPlayingStates, setVideoPlayingStates] = useState<{ [key: string]: boolean }>({}); // Track playing state per video
    const [isProgrammaticScroll, setIsProgrammaticScroll] = useState(false);
    const [viewedVideos, setViewedVideos] = useState<Set<string>>(new Set()); // Track which videos have been viewed
    const [videoProgress, setVideoProgress] = useState<{ [key: string]: number }>({}); // Track progress for each video
    const [userInteractions, setUserInteractions] = useState<{ [key: string]: { hasLiked: boolean, userRating: number | null } }>({}); // Track user interactions
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
    const slideRefs = useRef<(HTMLDivElement | null)[]>([]);
    const viewTimers = useRef<Map<string, NodeJS.Timeout>>(new Map()); // Track view timers
    const holdTimeoutRef = useRef<NodeJS.Timeout | null>(null); // Track hold timer
    const programmaticScrollVideoId = useRef<string | null>(null); // Track which video was programmatically scrolled to
    const audioContextRef = useRef<AudioContext | null>(null); // Audio context for site-wide permission

    const AD_IMAGE_URL = 'https://vishal-zopper.s3.ap-south-1.amazonaws.com/videos/68f1c1880c5509d1d4467c65/download.png';
    const AD_INTERVAL = 8;

    // Helper to inject ads into the video list
    const injectAds = (videoList: Video[]) => {
        if (!videoList || videoList.length === 0) return [];

        const newList: Video[] = [];
        videoList.forEach((video, index) => {
            newList.push(video);

            // Inject an ad after every AD_INTERVAL videos
            if ((index + 1) % AD_INTERVAL === 0) {
                newList.push({
                    id: `ad-${index}`,
                    isAd: true,
                    url: AD_IMAGE_URL,
                    fileName: 'Sales Message',
                    views: 0,
                    likes: 0,
                    uploadedAt: new Date().toISOString(),
                    secUser: {
                        id: 'system',
                        name: 'Zopper Sultan',
                        phone: 'system',
                    }
                } as Video);
            }
        });
        return newList;
    };

    // Fetch videos if not provided as props
    useEffect(() => {
        if (propVideos) {
            setVideos(injectAds(propVideos));
            setLoading(false);
        } else {
            fetchVideos();
        }
    }, [propVideos]);

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
                setVideos(injectAds(data.data));
                console.log('✅ Loaded videos for shorts (including ads):', data.data.length);
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
        if (videos.length > 0 && startingVideoId && !hasScrolledRef.current && isLayoutReady) {
            const startIndex = videos.findIndex(video => video.id === startingVideoId);
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
                            console.log('📍 Scrolled to video element:', startIndex);

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
    }, [videos, startingVideoId, isLayoutReady]);

    // Handle video change
    useEffect(() => {
        if (videos.length > 0 && onVideoChange) {
            onVideoChange(videos[currentIndex]);
        }
    }, [currentIndex, videos, onVideoChange]);

    // Initialize playing states for all videos when videos change
    useEffect(() => {
        if (videos.length > 0) {
            videoRefs.current = videoRefs.current.slice(0, videos.length);
            const initialPlayingStates: { [key: string]: boolean } = {};
            videos.forEach(video => {
                // If we already have a state for this video, keep it
                if (videoPlayingStates[video.id] === undefined) {
                    initialPlayingStates[video.id] = false; // Default to not playing
                }
            });
            if (Object.keys(initialPlayingStates).length > 0) {
                setVideoPlayingStates(prev => ({ ...prev, ...initialPlayingStates }));
            }
        }
    }, [videos]);

    // Intersection Observer to auto-play videos when they come into view
    useEffect(() => {
        if (!containerRef.current || videos.length === 0 || !isLayoutReady) return;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    const slideElement = entry.target as HTMLDivElement;
                    const videoIndex = slideRefs.current.findIndex(ref => ref === slideElement);
                    const video = videos[videoIndex];
                    if (!video) return;

                    const videoElement = videoRefs.current[videoIndex];

                    if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
                        console.log('🎯 Slide intersecting:', videoIndex, 'videoId:', video.id, 'isAd:', video.isAd);

                        // Update currentIndex always for both ads and videos
                        if (!isProgrammaticScroll) {
                            setCurrentIndex(videoIndex);
                        }

                        if (video.isAd) {
                            // Pause all videos if landing on an ad
                            videoRefs.current.forEach(v => v?.pause());
                            return;
                        }

                        if (!videoElement) return; // Ensure videoElement exists for non-ad videos

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
                            if (video) {
                                startViewTimer(video.id);
                            }
                        }).catch(console.error);

                        // Pause all other videos, reset them to beginning, and stop their view timers
                        videoRefs.current.forEach((otherVideo, index) => {
                            if (otherVideo && index !== videoIndex && !otherVideo.paused) {
                                otherVideo.pause();
                                const otherVideoData = videos[index];
                                if (otherVideoData) {
                                    // Update playing state for other videos
                                    setVideoPlayingStates(prev => ({
                                        ...prev,
                                        [otherVideoData.id]: false
                                    }));
                                }
                                // Only reset to beginning if not during programmatic scroll
                                if (!isProgrammaticScroll) {
                                    otherVideo.currentTime = 0; // Reset to beginning
                                }
                                if (otherVideoData) {
                                    // Reset progress only if not programmatic scroll
                                    if (!isProgrammaticScroll) {
                                        setVideoProgress(prev => ({
                                            ...prev,
                                            [otherVideoData.id]: 0
                                        }));
                                    }
                                    stopViewTimer(otherVideoData.id);
                                }
                            }
                        });
                    } else if (!entry.isIntersecting) {
                        // Video is not visible - pause it and reset to beginning (but not during programmatic scroll)
                        if (videoElement) {
                            videoElement.pause();
                        }

                        // Update playing state when video goes out of view
                        setVideoPlayingStates(prev => ({
                            ...prev,
                            [video.id]: false
                        }));

                        // Only reset to beginning when not doing programmatic scroll
                        if (!isProgrammaticScroll && videoElement) {
                            videoElement.currentTime = 0; // Reset to beginning when leaving
                            if (video) {
                                // Reset progress
                                setVideoProgress(prev => ({
                                    ...prev,
                                    [video.id]: 0
                                }));
                            }
                        }

                        if (video) {
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

        // Observe all slide elements
        slideRefs.current.forEach((slide) => {
            if (slide) observer.observe(slide);
        });

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
    }, [videos.length, isProgrammaticScroll, isLayoutReady]); // Add isLayoutReady dependency

    // Handle mute/unmute for all videos
    useEffect(() => {
        videoRefs.current.forEach((video, index) => {
            if (video) {
                video.muted = muted;
                // Force update for the current video to ensure it's properly synced
                if (index === currentIndex) {
                    // Small delay to ensure video element is ready
                    setTimeout(() => {
                        if (video && !video.paused) {
                            video.muted = muted;
                        }
                    }, 100);
                }
            }
        });
    }, [muted, currentIndex]); // Add currentIndex dependency

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
        const videoData = videos[videoIndex];
        if (video && videoData) {
            if (video.paused) {
                video.play().catch(console.error);
                // State will be updated by onPlay listener
            } else {
                video.pause();
                // State will be updated by onPause listener
            }
        }
    };

    const handleHoldStart = (videoIndex: number) => {
        // Wait 200ms before pausing to ensure it's a "hold" and not a "tap"
        if (holdTimeoutRef.current) clearTimeout(holdTimeoutRef.current);

        holdTimeoutRef.current = setTimeout(() => {
            const video = videoRefs.current[videoIndex];
            if (video && !video.paused) {
                video.pause();
                setIsHeld(true);
            }
        }, 200);
    };

    const handleHoldEnd = (videoIndex: number) => {
        // Clear the timer so it doesn't pause if the user already let go (it was a tap)
        if (holdTimeoutRef.current) {
            clearTimeout(holdTimeoutRef.current);
            holdTimeoutRef.current = null;
        }

        if (isHeld) {
            const video = videoRefs.current[videoIndex];
            if (video) {
                video.play().catch(console.error);
            }
            setIsHeld(false);
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

        // Apply to current video immediately
        const currentVideo = videoRefs.current[currentIndex];
        if (currentVideo) {
            currentVideo.muted = newMutedState;
        }
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
                // Skip fetching interactions for ads as they are not in the database
                if (!video.isAd && !userInteractions[video.id]) {
                    fetchUserInteractions(video.id);
                }
            });
        }
    }, [currentUserId, videos, userInteractions]);

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

    if (videos.length === 0) {
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

    const currentVideo = videos[currentIndex];

    return (
        <div className="fixed inset-0 bg-black flex items-center justify-center overflow-hidden" style={{ paddingTop: '56px', paddingBottom: '60px' }}>
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
                        ref={(el) => {
                            slideRefs.current[index] = el;
                        }}
                        className="relative w-full h-full flex-shrink-0 snap-start"
                        style={{ aspectRatio: '9/16' }}
                    >
                        {/* Video Player or Ad Image */}
                        {video.isAd ? (
                            <div className="w-full h-full bg-[#1a1a1a] flex items-center justify-center">
                                <img
                                    src={video.url}
                                    alt="Sales Message"
                                    className="w-full h-full object-cover shadow-2xl"
                                    style={{ objectPosition: 'center center' }}
                                />
                                {/* Ad Ribbon */}
                                <div className="absolute top-4 right-4 bg-yellow-500 text-black text-[10px] font-bold px-2 py-0.5 rounded shadow-lg z-50">
                                    SPONSORED
                                </div>
                            </div>
                        ) : (
                            <video
                                ref={(el) => {
                                    videoRefs.current[index] = el;
                                }}
                                src={getOptimizedVideoUrl(video.url)}
                                poster={getThumbnailUrl(video.url, video.thumbnailUrl)}
                                className="w-full h-full object-cover"
                                style={{ objectPosition: 'center 20%' }}
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
                        )}

                        {/* Serial Number Overlay */}
                        {!video.isAd && video.serialNumber && (
                            <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded-md text-xs font-bold text-yellow-500 border border-yellow-500/40 z-[60] shadow-lg pointer-events-none">
                                #{video.serialNumber}
                            </div>
                        )}

                        {/* Progress Bar - positioned at the very bottom (Hide for ads) */}
                        {!video.isAd && (
                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/50 z-50">
                                <div
                                    className="h-full bg-white transition-all duration-100 ease-linear"
                                    style={{
                                        width: `${videoProgress[video.id] || 0}%`
                                    }}
                                />
                            </div>
                        )}

                        {/* Overlay Controls */}
                        {!video.isAd && (
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
                                                            </div>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Center Play/Pause - only show for current video (not ad) when not just being held */}
                                {!video.isAd && index === currentIndex && videoPlayingStates[video.id] === false && !isHeld && (
                                    <div
                                        className="absolute inset-0 flex items-center justify-center pointer-events-auto z-10 cursor-pointer"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            togglePlayPause(index);
                                        }}
                                    >
                                        <div className="p-4 bg-black/50 rounded-full backdrop-blur-sm">
                                            <MdPlayArrow className="text-white text-4xl" />
                                        </div>
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
                                            <div className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-bold mb-2 ${video.isActive === false
                                                ? 'bg-red-600/20 text-red-400 border border-red-600/40'
                                                : 'bg-green-600/20 text-green-400 border border-green-600/40'
                                                }`}>
                                                <div className={`w-2 h-2 rounded-full ${video.isActive === false ? 'bg-red-400' : 'bg-green-400'
                                                    }`}></div>
                                                {video.isActive === false ? 'Video Inactive' : 'Video Active'}
                                            </div>
                                        )}

                                        {!video.isAd && (
                                            <div className="text-white/80 text-xs flex items-center gap-4">
                                                <span>{formatCount(video.views)} views</span>
                                                {video.secUser?.store && (
                                                    <span>{video.secUser.store.storeName}</span>
                                                )}
                                            </div>
                                        )}
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
                        )}


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