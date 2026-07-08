import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    MdHome, MdHomeFilled,
    MdOutlineSlowMotionVideo, MdSlowMotionVideo,
    MdAddCircleOutline, MdAddCircle,
    MdLeaderboard,
    MdPerson, MdPersonOutline,
    MdSearch, MdNotificationsNone, MdCast,
    MdThumbUp, MdThumbDown,
    MdComment, MdShare,
    MdClose, MdUpload, MdRemoveRedEye, MdArrowBack,
    MdHelpOutline, MdHelp, MdEmail, MdPhone, MdQuestionAnswer, MdKeyboardArrowDown,
    MdPlayArrow, MdVideocam, MdHistory
} from 'react-icons/md';
import { BiLike, BiDislike, BiCommentDetail, BiShare } from "react-icons/bi";
import { VideoUploadModal } from '../components/VideoUploadModal';
import { VideoRecorder } from '../components/VideoRecorder';
import { ShortsPlayer } from '../components/ShortsPlayer';
import { VideoStats } from '../components/VideoStats';
import { VideoPreview } from '../components/VideoPreview';
import contestRulesImg from '../assets/contest-rules.jpg';
import { useAuth } from '@/contexts/AuthContext';
import { API_BASE_URL } from '@/lib/config';
import { useUploadManager } from '../components/UploadManager';
import { getSignedVideoUrl } from '@/utils/videoUtils';


// --- Mock Data (REMOVED - Now using database) ---

const HELP_TOPICS = [
    { id: 1, icon: MdQuestionAnswer, title: "How to Upload a Video", description: "Learn how to share your pitch with the community" },
    { id: 3, icon: MdQuestionAnswer, title: "Contest Rules", description: "Understand the Pitch Sultan competition guidelines" },
    { id: 6, icon: MdLeaderboard, title: "Rewards & Prizes", description: "See what you can win!" },
    { id: 5, icon: MdQuestionAnswer, title: "Technical Issues", description: "Troubleshooting common problems" },
];

const SHORTS_FEED = [
    {
        id: 1,
        title: "Quick Tip: Extended Warranty ⚡",
        uploader: "Tech Guru",
        likes: "12K",
        comments: "450",
        views: "45K",
        color: "bg-blue-600"
    },
    {
        id: 2,
        title: "Behind the Scenes @ Store 🏪",
        uploader: "Daily Vlog",
        likes: "5.6K",
        comments: "120",
        views: "18K",
        color: "bg-purple-600"
    },
    {
        id: 3,
        title: "Customer Reaction! 😂",
        uploader: "Sales Fun",
        likes: "25K",
        comments: "1.2K",
        views: "92K",
        color: "bg-red-600"
    }
];

// Asynchronously resolves signed S3 URL for thumbnails
const SafeThumbnailImage = ({ video, onClick, className }: { video: any; onClick?: () => void; className?: string }) => {
    const [src, setSrc] = useState('');

    useEffect(() => {
        let active = true;
        const load = async () => {
            const raw = getThumbnailUrl(video.thumbnailUrl || video.url);
            try {
                const signed = await getSignedVideoUrl(raw);
                if (active) setSrc(signed);
            } catch (e) {
                if (active) setSrc(raw);
            }
        };
        load();
        return () => { active = false; };
    }, [video.thumbnailUrl, video.url]);

    const isVideo = src ? (src.toLowerCase().includes('.mp4') || src.toLowerCase().includes('.mov') || src.toLowerCase().includes('.webm')) : false;

    if (isVideo) {
        return (
            <video
                src={src}
                preload="metadata"
                muted
                playsInline
                className={className}
                onClick={onClick}
            />
        );
    }

    return (
        <img
            src={src || getThumbnailUrl(video.thumbnailUrl || video.url)}
            alt={video.title || 'Video thumbnail'}
            className={className}
            loading="lazy"
            onClick={onClick}
        />
    );
};

// --- Helper Functions ---

// Helper for video thumbnails (Shared)
const getThumbnailUrl = (url: string, thumbnailUrl?: string) => {
    if (!url) return '';

    // If we have a specific thumbnail URL, use it
    if (thumbnailUrl && thumbnailUrl !== url) {
        // Handle both S3 and ImageKit thumbnail URLs
        if (thumbnailUrl.includes('ik.imagekit.io')) {
            // ImageKit thumbnail - use as is during migration
            return `${thumbnailUrl}/ik-thumbnail.jpg`;
        }
        // S3 thumbnail URL - use directly
        return thumbnailUrl;
    }

    // Handle ImageKit URLs (for backward compatibility during migration)
    if (url.includes('ik.imagekit.io')) {
        return `${url}/ik-thumbnail.jpg`;
    }

    // For S3 URLs, use the video itself as poster
    return url;
};

// --- Components ---

const Navbar = ({ currentUser, onSearch, onNotificationClick, onLogoClick, onAdUpload, onHistoryClick }: {
    currentUser: { name: string; handle: string; avatar: string; subscribers: string; role: string; store: string; region: string, isSultanAdmin?: boolean },
    onSearch?: (query: string) => void,
    onNotificationClick?: () => void,
    onLogoClick?: () => void,
    onAdUpload?: (files: FileList) => void,
    onHistoryClick?: () => void
}) => {
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const [isSearchActive, setIsSearchActive] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const { logout, isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const adInputRef = useRef<HTMLInputElement>(null);

    const handleLogout = () => {
        logout();
        navigate('/', { replace: true });
    };

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (onSearch) {
            onSearch(searchQuery);
        }
    };

    const handleSearchClose = () => {
        setIsSearchActive(false);
        setSearchQuery('');
        if (onSearch) {
            onSearch(''); // Clear search
        }
    };

    const handleAdSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0 && onAdUpload) {
            onAdUpload(e.target.files);
            setShowProfileMenu(false);
        }
    };

    return (
        <div className="fixed top-0 left-0 right-0 z-50">
            {/* Glassmorphism header */}
            <div className="h-14 flex items-center justify-between px-4"
                style={{
                    background: 'rgba(10,10,10,0.92)',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    borderBottom: '1px solid rgba(255,255,255,0.07)',
                    boxShadow: '0 2px 24px 0 rgba(0,0,0,0.45)'
                }}
            >
            {!isSearchActive ? (
                <>
                    {/* Logo */}
                    <div
                        className="flex items-center gap-2 cursor-pointer select-none"
                        onClick={onLogoClick}
                    >
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-lg"
                            style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 60%, #92400e 100%)' }}
                        >
                            <span className="text-black font-black text-sm tracking-tight">CA</span>
                        </div>
                        <div className="flex flex-col leading-none">
                            <span className="text-white font-extrabold text-base tracking-tight" style={{ letterSpacing: '-0.02em' }}>Customer ki Awaz</span>
                            <span className="text-amber-400 text-[9px] font-semibold tracking-widest uppercase" style={{ letterSpacing: '0.15em' }}>Sales Platform</span>
                        </div>
                    </div>

                    {/* Right Icons */}
                    <div className="flex items-center gap-1 text-white">
                        {/* Bell */}
                        <button
                            onClick={onNotificationClick}
                            className="w-9 h-9 flex items-center justify-center rounded-full transition-all duration-200"
                            style={{ background: 'rgba(255,255,255,0.06)' }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.12)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                        >
                            <MdNotificationsNone className="text-xl" />
                        </button>

                        {/* Search */}
                        <button
                            onClick={() => setIsSearchActive(true)}
                            className="w-9 h-9 flex items-center justify-center rounded-full transition-all duration-200"
                            style={{ background: 'rgba(255,255,255,0.06)' }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.12)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                        >
                            <MdSearch className="text-xl" />
                        </button>

                        {/* Profile Avatar + Menu */}
                        <div className="relative ml-1">
                            <button
                                onClick={() => setShowProfileMenu(!showProfileMenu)}
                                className="w-9 h-9 flex items-center justify-center rounded-full overflow-hidden border-2 transition-all duration-200"
                                style={{ borderColor: showProfileMenu ? '#f59e0b' : 'rgba(255,255,255,0.18)' }}
                            >
                                <img
                                    src={currentUser.avatar}
                                    alt="Profile"
                                    className="w-full h-full object-cover"
                                />
                            </button>

                            {/* Dropdown Menu */}
                            {showProfileMenu && (
                                <>
                                    <div className="fixed inset-0 z-10" onClick={() => setShowProfileMenu(false)} />
                                    <div
                                        className="absolute right-0 mt-2 w-56 rounded-2xl z-20 overflow-hidden"
                                        style={{
                                            background: 'rgba(22,22,24,0.97)',
                                            border: '1px solid rgba(255,255,255,0.10)',
                                            boxShadow: '0 8px 40px rgba(0,0,0,0.7)',
                                            backdropFilter: 'blur(20px)',
                                            top: '42px'
                                        }}
                                    >
                                        {/* User Info Header */}
                                        <div className="px-4 pt-4 pb-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                                            <div className="flex items-center gap-3">
                                                <img src={currentUser.avatar} alt="avatar" className="w-10 h-10 rounded-full object-cover border-2 border-amber-400/40" />
                                                <div>
                                                    <p className="text-white font-semibold text-sm leading-tight">{currentUser.name}</p>
                                                    <p className="text-amber-400 text-xs font-medium">{currentUser.handle}</p>
                                                    <p className="text-gray-500 text-xs">{currentUser.role}</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Admin Upload */}
                                        {currentUser.isSultanAdmin && (
                                            <button
                                                onClick={() => adInputRef.current?.click()}
                                                className="w-full px-4 py-3 text-left flex items-center gap-3 text-sm transition-colors duration-150"
                                                style={{ color: '#60a5fa' }}
                                                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(96,165,250,0.08)')}
                                                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                            >
                                                <MdUpload className="text-lg flex-shrink-0" />
                                                <span>Upload Ad Images</span>
                                            </button>
                                        )}

                                        {/* Divider */}
                                        <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '0 12px' }} />

                                        {/* PS Winner */}
                                        <button
                                            onClick={() => navigate('/pitchsultan/rewards')}
                                            className="w-full px-4 py-3 text-left flex items-center gap-3 text-sm transition-colors duration-150"
                                            style={{ color: '#f59e0b' }}
                                            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(245,158,11,0.08)')}
                                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                        >
                                            <MdLeaderboard className="text-lg flex-shrink-0 text-amber-400" />
                                            <span>PS Winner</span>
                                        </button>

                                        {/* Divider */}
                                        <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '0 12px' }} />

                                        {/* Logout */}
                                        <button
                                            onClick={handleLogout}
                                            className="w-full px-4 py-3 text-left flex items-center gap-3 text-sm transition-colors duration-150 rounded-b-2xl"
                                            style={{ color: '#f87171' }}
                                            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(248,113,113,0.08)')}
                                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                        >
                                            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                            </svg>
                                            Sign Out
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </>
            ) : (
                /* Search Mode */
                <form onSubmit={handleSearchSubmit} className="flex items-center w-full gap-3">
                    <button type="button" onClick={handleSearchClose} className="text-amber-400 flex-shrink-0">
                        <MdArrowBack className="text-xl" />
                    </button>
                    <div className="flex-1 flex items-center rounded-full px-4 py-1.5" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
                        <MdSearch className="text-gray-400 text-lg mr-2 flex-shrink-0" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search videos..."
                            className="flex-1 bg-transparent text-white placeholder-gray-500 outline-none text-sm"
                            autoFocus
                        />
                        {searchQuery && (
                            <button type="button" onClick={() => setSearchQuery('')}>
                                <MdClose className="text-gray-400 text-base" />
                            </button>
                        )}
                    </div>
                    <button type="submit" className="text-amber-400 font-semibold text-sm flex-shrink-0">Go</button>
                </form>
            )}
            </div>
            {/* Thin gradient accent line below header */}
            <div style={{ height: '2px', background: 'linear-gradient(90deg, transparent 0%, #f59e0b 30%, #d97706 70%, transparent 100%)', opacity: 0.5 }} />

            {/* Hidden Ad Input */}
            <input
                type="file"
                ref={adInputRef}
                className="hidden"
                accept="image/*"
                multiple
                onChange={handleAdSelect}
            />
        </div>
    );
};

const BottomNav = ({ activeTab, setActiveTab }: { activeTab: string, setActiveTab: (tab: string) => void }) => {
    const navItems = [
        { id: 'home', icon: MdHome, activeIcon: MdHomeFilled, label: 'Home' },
        { id: 'shorts', icon: MdOutlineSlowMotionVideo, activeIcon: MdSlowMotionVideo, label: 'Shorts' },
        { id: 'create', icon: MdAddCircleOutline, activeIcon: MdAddCircle, label: '', isAction: true },
        { id: 'help', icon: MdHelpOutline, activeIcon: MdHelp, label: 'Help' },
        { id: 'profile', icon: MdPersonOutline, activeIcon: MdPerson, label: 'You' },
    ];

    return (
        <div
            className="fixed bottom-0 left-0 right-0 z-50"
            style={{
                background: 'rgba(8,8,10,0.97)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                borderTop: '1px solid rgba(255,255,255,0.07)',
                boxShadow: '0 -4px 32px rgba(0,0,0,0.6)',
                height: '62px',
            }}
        >
            <div className="flex items-center justify-around h-full px-1">
                {navItems.map((item) => {
                    const isActive = activeTab === item.id;
                    const Icon = isActive ? item.activeIcon : item.icon;

                    if (item.isAction) {
                        return (
                            <div key={item.id} className="flex flex-col items-center justify-center" onClick={() => setActiveTab(item.id)}>
                                <div
                                    className="w-12 h-12 rounded-full flex items-center justify-center cursor-pointer transition-all duration-200 active:scale-95"
                                    style={{
                                        background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                                        boxShadow: '0 0 20px rgba(245,158,11,0.35)',
                                    }}
                                >
                                    <MdAddCircle className="text-2xl text-black" />
                                </div>
                            </div>
                        );
                    }

                    return (
                        <div
                            key={item.id}
                            className="flex flex-col items-center justify-center w-14 h-full cursor-pointer relative transition-all duration-200 active:scale-95"
                            onClick={() => setActiveTab(item.id)}
                        >
                            {/* Active pill indicator */}
                            {isActive && (
                                <div
                                    className="absolute top-0 w-8"
                                    style={{
                                        height: '2px',
                                        background: 'linear-gradient(90deg, #f59e0b, #d97706)',
                                        borderRadius: '0 0 4px 4px',
                                        boxShadow: '0 0 8px rgba(245,158,11,0.6)'
                                    }}
                                />
                            )}
                            <Icon
                                className="text-2xl mb-0.5 transition-all duration-200"
                                style={{ color: isActive ? '#f59e0b' : 'rgba(255,255,255,0.45)' }}
                            />
                            {item.label && (
                                <span
                                    className="text-[10px] font-medium transition-all duration-200"
                                    style={{ color: isActive ? '#f59e0b' : 'rgba(255,255,255,0.4)' }}
                                >
                                    {item.label}
                                </span>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const VideoCard = ({ video, onVideoClick, currentUser }: { video: any, onVideoClick?: (video: any) => void, currentUser?: any }) => {
    const videoSource = video.url;
    const uploaderName = video.secUser?.name || video.uploader || 'Unknown';
    const uploaderAvatar = video.secUser?.name
        ? `https://ui-avatars.com/api/?name=${encodeURIComponent(video.secUser.name)}&background=ffd700&color=000`
        : 'https://ui-avatars.com/api/?name=Unknown&background=random';

    // Format views
    const formatViews = (views: number) => {
        if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`;
        if (views >= 1000) return `${(views / 1000).toFixed(1)}K`;
        return views.toString();
    };

    // Format time ago
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

    return (
        <div
            className="flex flex-col mb-4 cursor-pointer group rounded-xl overflow-hidden transition-all duration-200"
            onClick={handleVideoClick}
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.border = '1px solid rgba(245,158,11,0.25)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.border = '1px solid rgba(255,255,255,0.07)'; }}
        >
            <div className="relative w-full aspect-video bg-gray-900 overflow-hidden">
                <img
                    src={getThumbnailUrl(videoSource)}
                    alt={video.title || video.fileName || 'Video thumbnail'}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    style={{ objectPosition: 'center 20%' }}
                />
                {/* Play button overlay */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                    style={{ background: 'rgba(0,0,0,0.3)' }}
                >
                    <div className="w-12 h-12 rounded-full flex items-center justify-center"
                        style={{ background: 'rgba(245,158,11,0.85)' }}
                    >
                        <MdPlayArrow className="text-2xl text-black ml-0.5" />
                    </div>
                </div>

                {/* Sultan Admin Status Banner */}
                {currentUser && currentUser.isSultanAdmin === true && (
                    <div className={`absolute top-2 left-2 px-2 py-0.5 rounded-full text-xs font-bold shadow-lg ${
                        video.isActive === false
                            ? 'bg-red-600 text-white'
                            : 'bg-emerald-500 text-white'
                    }`}>
                        {video.isActive === false ? '● INACTIVE' : '● ACTIVE'}
                    </div>
                )}
            </div>

            <div className="flex gap-3 p-3">
                <img src={uploaderAvatar} alt="" className="w-9 h-9 rounded-full mt-0.5 flex-shrink-0 border border-amber-400/20" />
                <div className="flex flex-col flex-1 min-w-0">
                    <h3 className="text-white text-sm font-semibold line-clamp-2 leading-tight">
                        {video.title || video.fileName || 'Untitled Video'}
                    </h3>
                    <div className="text-gray-500 text-xs mt-1 flex items-center gap-1">
                        <span className="text-amber-400/80 font-medium">{uploaderName}</span>
                        <span>•</span>
                        <span>{formatTimeAgo(video.uploadedAt)}</span>
                    </div>
                    <VideoStats
                        views={video.views || 0}
                        likes={video.likes || 0}
                        comments={video.commentsCount || 0}
                        rating={video.rating}
                        ratingCount={video.ratingCount}
                        className="mt-1.5"
                    />
                </div>
            </div>
        </div>
    );
};

const ShortsView = ({ videos, startingVideoId, onVideoStatsUpdate, currentUserId, currentUser }: {
    videos: any[],
    startingVideoId?: string | null,
    onVideoStatsUpdate?: (videoId: string, updates: { views?: number, likes?: number, commentsCount?: number, rating?: number, ratingCount?: number }) => void,
    currentUserId?: string,
    currentUser?: any
}) => {
    return <ShortsPlayer videos={videos} startingVideoId={startingVideoId || undefined} onVideoStatsUpdate={onVideoStatsUpdate} currentUserId={currentUserId} currentUser={currentUser} />;
};

const CreateView = ({ onUploadClick, onRecordClick }: { onUploadClick: () => void, onRecordClick: () => void }) => {
    const [accepted, setAccepted] = useState(false);

    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] text-white p-6">
            {/* Icon */}
            <div
                className="w-24 h-24 rounded-3xl flex items-center justify-center mb-6 shadow-xl"
                style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.2) 0%, rgba(217,119,6,0.1) 100%)', border: '1px solid rgba(245,158,11,0.3)' }}
            >
                <MdUpload className="text-5xl" style={{ color: '#f59e0b' }} />
            </div>

            <h2 className="text-2xl font-bold mb-2">Share Your Pitch</h2>
            <p className="text-gray-400 text-center mb-8 max-w-xs text-sm leading-relaxed">
                Showcase your sales talent with the Sultan community. Upload a portrait video to get started.
            </p>

            <div className="flex flex-col gap-4 w-full max-w-sm">
                {/* Consent card */}
                <div
                    className="p-4 rounded-2xl"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)' }}
                >
                    <label className="flex items-start gap-3 cursor-pointer select-none">
                        <div className="relative flex items-center pt-0.5 flex-shrink-0">
                            <input
                                type="checkbox"
                                checked={accepted}
                                onChange={(e) => setAccepted(e.target.checked)}
                                className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-amber-500 focus:ring-amber-500 focus:ring-offset-gray-900 border-2"
                            />
                        </div>
                        <p className="text-xs text-gray-400 leading-relaxed">
                            I agree that by uploading this video, I grant <strong className="text-white">Zopper</strong> full and exclusive rights to use, reproduce, modify, and distribute this content anywhere, in perpetuity, for any purpose.
                        </p>
                    </label>
                </div>

                <button
                    onClick={accepted ? onUploadClick : undefined}
                    disabled={!accepted}
                    className={`font-bold py-3.5 px-6 rounded-2xl w-full flex items-center justify-center gap-2 transition-all duration-200 text-sm ${
                        accepted
                            ? 'text-black cursor-pointer active:scale-95'
                            : 'text-gray-600 cursor-not-allowed opacity-40'
                    }`}
                    style={accepted ? {
                        background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                        boxShadow: '0 4px 20px rgba(245,158,11,0.35)'
                    } : { background: 'rgba(255,255,255,0.06)' }}
                >
                    <MdUpload className="text-xl" />
                    Upload Video
                </button>
            </div>
        </div>
    );
};

const NotificationsView = () => {
    return (
        <div className="min-h-screen text-white flex items-center justify-center pb-20">
            {/* Simple Empty State */}
            <div className="flex flex-col items-center justify-center text-gray-400">
                <div className="w-24 h-24 bg-gray-800 rounded-full flex items-center justify-center mb-6">
                    <MdNotificationsNone className="text-5xl text-gray-500" />
                </div>
                <h3 className="text-xl font-semibold text-white">No notifications yet</h3>
            </div>
        </div>
    );
};

const HelpSupportView = () => {
    const [expandedId, setExpandedId] = useState<number | null>(null);

    const toggleExpand = (id: number) => {
        setExpandedId(expandedId === id ? null : id);
    };

    return (
        <div className="min-h-screen text-white md:p-6 max-w-4xl mx-auto pb-24">
            <div className="p-4">
                {/* Header Section */}
                <div className="mb-8">
                    <h2 className="text-2xl font-bold flex items-center gap-3" style={{ letterSpacing: '-0.02em' }}>
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.2) 0%, rgba(217,119,6,0.1) 100%)', border: '1px solid rgba(245,158,11,0.3)' }}>
                            <MdHelp className="text-2xl text-amber-400" />
                        </div>
                        <span>Help & Support</span>
                    </h2>
                    <p className="text-gray-400 text-sm mt-2 ml-13">Get answers to your questions and reach out to the team</p>
                </div>

                {/* FAQ Section */}
                <div className="mb-10">
                    <h3 className="text-base font-semibold mb-4 text-gray-300 uppercase tracking-wider ml-1" style={{ fontSize: '12px', letterSpacing: '0.05em' }}>Frequently Asked Questions</h3>
                    <div className="space-y-3">
                        {HELP_TOPICS.map((topic) => {
                            const Icon = topic.icon;
                            const isExpanded = expandedId === topic.id;
                            return (
                                <div
                                    key={topic.id}
                                    className="overflow-hidden rounded-2xl transition-all duration-300 cursor-pointer"
                                    style={{
                                        background: isExpanded ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.02)',
                                        border: isExpanded ? '1px solid rgba(245,158,11,0.3)' : '1px solid rgba(255,255,255,0.06)',
                                    }}
                                    onClick={() => toggleExpand(topic.id)}
                                >
                                    <div className="p-4 flex items-center gap-4">
                                        <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                                             style={{ background: isExpanded ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.04)' }}>
                                            <Icon className={`text-lg transition-colors ${isExpanded ? 'text-amber-400' : 'text-gray-400'}`} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-semibold text-white text-sm leading-tight">{topic.title}</h4>
                                            <p className="text-xs text-gray-400 mt-0.5 truncate">{topic.description}</p>
                                        </div>
                                        <div className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/5 transition-colors">
                                            <MdKeyboardArrowDown className={`text-xl text-gray-400 transition-transform duration-300 ${isExpanded ? 'rotate-180 text-amber-400' : ''}`} />
                                        </div>
                                    </div>

                                    {/* Expanded Content */}
                                    <div className={`grid transition-all duration-300 ease-in-out ${isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                                        <div className="overflow-hidden">
                                            <div className="px-4 pb-5 pt-1 pl-17">
                                                {topic.id === 1 ? (
                                                    <div className="text-sm text-gray-400 space-y-3">
                                                        <p className="font-bold text-white text-xs uppercase tracking-wider text-amber-400/80">Required Format:</p>
                                                        <ul className="space-y-2">
                                                            <li className="flex items-center gap-2">
                                                                <span className="text-emerald-400">📱</span>
                                                                <span>Hold phone vertically (<strong className="text-white">9:16 ratio</strong>)</span>
                                                            </li>
                                                            <li className="flex items-center gap-2">
                                                                <span className="text-emerald-400">👤</span>
                                                                <span>Portrait mode only</span>
                                                            </li>
                                                            <li className="flex items-center gap-2">
                                                                <span className="text-red-400">⚠️</span>
                                                                <span className="text-red-300 font-medium">Landscape videos will be rejected</span>
                                                            </li>
                                                        </ul>
                                                    </div>
                                                ) : topic.id === 3 ? (
                                                    <div className="text-sm text-gray-400 space-y-3">
                                                        <ul className="space-y-3">
                                                            <li className="flex items-start gap-2.5">
                                                                <span className="text-amber-400 mt-0.5 flex-shrink-0">⏱</span>
                                                                <span>Video duration should be <strong className="text-white">minimum 35 seconds</strong> and <strong className="text-white">maximum 2 minutes</strong>.</span>
                                                            </li>
                                                            <li className="flex items-start gap-2.5">
                                                                <span className="text-amber-400 mt-0.5 flex-shrink-0">✅</span>
                                                                <span>Make sure the customers whose videos are submitted have <strong className="text-white">raised a claim</strong>.</span>
                                                            </li>
                                                            <li className="flex items-start gap-2.5">
                                                                <span className="text-amber-400 mt-0.5 flex-shrink-0">🏆</span>
                                                                <span>Only <strong className="text-white">verified entries</strong> will be eligible for rewards.</span>
                                                            </li>
                                                            <li className="flex items-start gap-2.5">
                                                                <span className="text-red-400 mt-0.5 flex-shrink-0">❌</span>
                                                                <span><strong className="text-white">Fake entries</strong> will be <strong className="text-red-400">disqualified</strong>.</span>
                                                            </li>
                                                            <li className="flex items-start gap-2.5">
                                                                <span className="text-amber-400 mt-0.5 flex-shrink-0">🎬</span>
                                                                <span>An individual SEC can upload <strong className="text-white">as many videos as they want</strong> — each <strong className="text-white">verified video</strong> will be rewarded.</span>
                                                            </li>
                                                        </ul>
                                                    </div>
                                                ) : topic.id === 6 ? (
                                                    <div className="text-sm text-gray-400 space-y-4">
                                                        {/* Top 10 */}
                                                        <div className="bg-gradient-to-r from-amber-500/10 to-yellow-500/10 p-4 rounded-2xl border border-amber-500/20">
                                                            <h5 className="text-amber-400 font-bold mb-1.5 flex items-center gap-2 text-xs uppercase tracking-wider">
                                                                🏆 Top 10 Verified Entries
                                                            </h5>
                                                            <p className="text-gray-300 leading-relaxed text-xs sm:text-sm">Each of the <span className="text-white font-bold">Top 10 verified entries</span> will receive an Amazon voucher worth <span className="text-amber-400 font-bold text-base">₹500/-</span></p>
                                                        </div>

                                                        {/* Rest */}
                                                        <div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 p-4 rounded-2xl border border-blue-500/20">
                                                            <h5 className="text-blue-400 font-bold mb-1.5 flex items-center gap-2 text-xs uppercase tracking-wider">
                                                                🎁 All Other Verified Entries
                                                            </h5>
                                                            <p className="text-gray-300 leading-relaxed text-xs sm:text-sm">Every remaining verified entry will receive an Amazon voucher worth <span className="text-blue-300 font-bold text-base">₹300/-</span></p>
                                                        </div>

                                                        {/* Note */}
                                                        <div className="p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                                            <p className="text-gray-400 text-xs italic leading-relaxed">
                                                                ⚠️ Only <span className="text-white font-semibold">verified entries</span> qualify for rewards. Fake or unverified entries will be disqualified. Best videos may be used for training purposes across India (with credits).
                                                            </p>
                                                        </div>
                                                    </div>
                                                ) : topic.id === 5 ? (
                                                    <div className="text-sm text-gray-400 space-y-4">
                                                        <p className="mb-2 text-xs uppercase tracking-wider text-gray-400 font-bold">For any technical issues, feel free to contact:</p>
                                                        <div className="grid gap-3 sm:grid-cols-2">
                                                            <div className="p-4 rounded-2xl transition-all duration-200 hover:bg-white/[0.04]" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                                                <p className="font-semibold text-white text-sm">Archit Tiwari</p>
                                                                <a href="mailto:archit.tiwari@zopper.com" className="text-amber-400 text-xs hover:underline mt-1 block">archit.tiwari@zopper.com</a>
                                                            </div>
                                                            <div className="p-4 rounded-2xl transition-all duration-200 hover:bg-white/[0.04]" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                                                <p className="font-semibold text-white text-sm">Vishal Shukla</p>
                                                                <a href="mailto:vishal.shukla@zopper.com" className="text-amber-400 text-xs hover:underline mt-1 block">vishal.shukla@zopper.com</a>
                                                            </div>
                                                            <div className="p-4 rounded-2xl transition-all duration-200 hover:bg-white/[0.04] sm:col-span-2" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                                                <p className="font-semibold text-white text-sm">Harshdeep Singh</p>
                                                                <a href="mailto:harshdeep.singh@zopper.com" className="text-amber-400 text-xs hover:underline mt-1 block">harshdeep.singh@zopper.com</a>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <p className="text-sm text-gray-400">
                                                        Detailed information about {topic.title.toLowerCase()} will be available here.
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Contact Support Container */}
                <div
                    className="p-6 rounded-2xl overflow-hidden shadow-2xl relative"
                    style={{
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid rgba(255,255,255,0.07)',
                        backdropFilter: 'blur(10px)'
                    }}
                >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full filter blur-3xl pointer-events-none" />
                    <h3 className="text-base font-semibold mb-5 text-gray-200 uppercase tracking-wider" style={{ fontSize: '12px', letterSpacing: '0.05em' }}>Contact Support</h3>
                    <div className="grid gap-6 sm:grid-cols-2">
                        {/* Email */}
                        <div className="flex items-start gap-4">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(245,158,11,0.1)' }}>
                                <MdEmail className="text-xl text-amber-400" />
                            </div>
                            <div className="flex-1">
                                <p className="text-xs text-gray-400 font-medium">Email Support</p>
                                <div className="flex flex-col gap-1.5 mt-1.5">
                                    <a href="mailto:archit.tiwari@zopper.com" className="text-white hover:text-amber-400 text-sm transition-colors break-all leading-none font-medium">archit.tiwari@zopper.com</a>
                                    <a href="mailto:vishal.shukla@zopper.com" className="text-white hover:text-amber-400 text-sm transition-colors break-all leading-none font-medium">vishal.shukla@zopper.com</a>
                                    <a href="mailto:harshdeep.singh@zopper.com" className="text-white hover:text-amber-400 text-sm transition-colors break-all leading-none font-medium">harshdeep.singh@zopper.com</a>
                                </div>
                            </div>
                        </div>

                        {/* Phone */}
                        <div className="flex items-start gap-4">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(245,158,11,0.1)' }}>
                                <MdPhone className="text-xl text-amber-400" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-400 font-medium">Phone Support</p>
                                <div className="flex flex-col gap-2 mt-2">
                                    <a href="tel:9569310917" className="text-white hover:text-amber-400 text-sm font-semibold transition-colors flex items-center gap-1.5">
                                        <span>9569310917</span>
                                    </a>
                                    <a href="tel:7408108617" className="text-white hover:text-amber-400 text-sm font-semibold transition-colors flex items-center gap-1.5">
                                        <span>7408108617</span>
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const OLD_VIDEO_CUTOFF = new Date('2026-07-08T12:30:00.000Z');

const ProfileView = ({ currentUser, videos, onVideoClick, onVideoUpdate, onVideoDelete }: {
    currentUser: { name: string; handle: string; avatar: string; subscribers: string; role: string; store: string; region: string; isSultanAdmin: boolean },
    videos: any[],
    onVideoClick?: (video: any) => void,
    onVideoUpdate?: (videoId: string, updates: { title?: string, description?: string }) => void,
    onVideoDelete?: (videoId: string) => void
}) => {
    const [profileTab, setProfileTab] = useState<'analytics' | 'manage' | 'history'>('analytics');
    const [editingVideo, setEditingVideo] = useState<any>(null);
    const [newTitle, setNewTitle] = useState('');
    const [newDescription, setNewDescription] = useState('');

    // Filter videos by current user (if we have user ID)
    // For Sultan Admin, show all videos; for regular users, show only their videos
    const userVideos = currentUser?.isSultanAdmin
        ? videos
        : videos.filter(video =>
            video.secUser?.name === currentUser.name ||
            video.secUser?.phone === currentUser.handle.replace('@', '')
        );

    const handleDeleteVideo = async (videoId: string) => {
        if (!confirm('Are you sure you want to delete this video?')) return;

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/pitch-sultan/videos/${videoId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                // Update parent component's state
                if (onVideoDelete) {
                    onVideoDelete(videoId);
                }
                alert('Video deleted successfully!');
                console.log('✅ Video deleted successfully');
            } else {
                const error = await response.json();
                alert(`Failed to delete video: ${error.error || 'Unknown error'}`);
                console.error('Delete failed:', error);
            }
        } catch (error) {
            console.error('Error deleting video:', error);
            alert('Failed to delete video');
        }
    };

    const handleUpdateDescription = async (videoId: string, title: string, description: string) => {
        try {
            console.log('🔄 Updating video:', { videoId, title, description });

            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/pitch-sultan/videos/${videoId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ title, description })
            });

            const data = await response.json();
            console.log('📝 Update response:', data);

            if (response.ok && data.success) {
                // Update parent component's state
                if (onVideoUpdate) {
                    onVideoUpdate(videoId, { title, description });
                }

                setEditingVideo(null);
                setNewTitle('');
                setNewDescription('');
                alert('Video updated successfully!');
                console.log('✅ Video updated successfully');
            } else {
                console.error('❌ Update failed:', data);
                alert(`Failed to update video: ${data.error || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('❌ Error updating video:', error);
            alert('Failed to update video. Please check your connection.');
        }
    };

    return (
        <div className="min-h-screen pb-20 pt-4">
            {/* Info */}
            <div className="px-4 flex flex-col mb-4">
                <img src={currentUser.avatar} className="w-20 h-20 rounded-full border-4 border-[#0f0f0f]" alt="Profile" />
                <div className="mt-3 text-white">
                    <h1 className="text-2xl font-bold">{currentUser.name}</h1>
                    <div className="text-gray-400 text-sm flex items-center gap-2">
                        {currentUser.handle} • {currentUser.role}
                    </div>
                    <p className="text-gray-300 text-sm mt-3">
                        Sharing my best sales tips for Samsung appliances! Aspiring Pitch Sultan 👑
                    </p>
                </div>
            </div>

            {/* Content Tabs */}
            <div className="flex border-b border-gray-800 text-white text-sm font-medium sticky top-14 bg-[#0f0f0f] z-10">
                <div
                    className={`flex-1 py-3 text-center cursor-pointer ${profileTab === 'analytics' ? 'border-b-2 border-white' : 'text-gray-500'}`}
                    onClick={() => setProfileTab('analytics')}
                >
                    Analytics
                </div>
                <div
                    className={`flex-1 py-3 text-center cursor-pointer ${profileTab === 'manage' ? 'border-b-2 border-white' : 'text-gray-500'}`}
                    onClick={() => setProfileTab('manage')}
                >
                    Manage
                </div>
                <div
                    className={`flex-1 py-3 text-center cursor-pointer ${profileTab === 'history' ? 'border-b-2 border-white' : 'text-gray-500'}`}
                    onClick={() => setProfileTab('history')}
                >
                    History
                </div>
            </div>

            {/* Content */}
            {profileTab === 'analytics' && (
                <div className="p-4 text-white">
                    <h3 className="text-xl font-bold mb-6">Video Analytics</h3>

                    {userVideos.length > 0 ? (
                        <div className="space-y-6">
                            {/* Overview Stats */}
                            <div className="grid grid-cols-2 gap-3 sm:gap-4">
                                <div className="bg-gray-800 p-3 sm:p-4 rounded-lg text-center">
                                    <div className="text-xl sm:text-2xl font-bold text-blue-400">
                                        {userVideos.length}
                                    </div>
                                    <div className="text-xs sm:text-sm text-gray-400">Total Videos</div>
                                </div>
                                <div className="bg-gray-800 p-3 sm:p-4 rounded-lg text-center">
                                    <div className="text-xl sm:text-2xl font-bold text-green-400">
                                        {userVideos.reduce((sum, video) => sum + (video.views || 0), 0)}
                                    </div>
                                    <div className="text-xs sm:text-sm text-gray-400">Total Views</div>
                                </div>
                                <div className="bg-gray-800 p-3 sm:p-4 rounded-lg text-center">
                                    <div className="text-xl sm:text-2xl font-bold text-red-400">
                                        {userVideos.reduce((sum, video) => sum + (video.likes || 0), 0)}
                                    </div>
                                    <div className="text-xs sm:text-sm text-gray-400">Total Likes</div>
                                </div>
                                <div className="bg-gray-800 p-3 sm:p-4 rounded-lg text-center">
                                    <div className="text-xl sm:text-2xl font-bold text-purple-400">
                                        {userVideos.length > 0 ? Math.round(userVideos.reduce((sum, video) => sum + (video.views || 0), 0) / userVideos.length) : 0}
                                    </div>
                                    <div className="text-xs sm:text-sm text-gray-400">Avg Views</div>
                                </div>
                            </div>

                            {/* Individual Video Stats */}
                            <div>
                                <h4 className="text-lg font-semibold mb-4">Video Performance</h4>
                                <div className="space-y-3">
                                    {userVideos.map(video => (
                                        <div key={video.id} className="bg-gray-800 p-3 rounded-lg">
                                            <div className="flex items-start gap-3">
                                                <SafeThumbnailImage
                                                    video={video}
                                                    className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded flex-shrink-0 bg-gray-700 cursor-pointer hover:opacity-80 transition-opacity"
                                                    onClick={() => onVideoClick && onVideoClick(video)}
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <h5 className="font-medium text-white text-sm sm:text-base leading-tight mb-2 break-words">
                                                        {video.title || video.fileName}
                                                    </h5>
                                                    <VideoStats
                                                        views={video.views || 0}
                                                        likes={video.likes || 0}
                                                        comments={video.commentsCount || 0}
                                                        rating={video.rating}
                                                        ratingCount={video.ratingCount}
                                                        className="mb-2"
                                                    />
                                                    {/* Video Status */}
                                                    <div className="mb-2">
                                                        {video.isActive ? (
                                                            <span className="text-green-400 text-xs">✅ Live</span>
                                                        ) : (
                                                            <span className="text-yellow-400 text-xs">⏳ Waiting for admin approval</span>
                                                        )}
                                                    </div>
                                                    <div className="text-gray-500 text-xs">
                                                        {new Date(video.uploadedAt).toLocaleDateString()}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center text-gray-400 py-10">
                            <div className="text-6xl mb-4">📊</div>
                            <p className="text-lg">No analytics yet</p>
                            <p className="text-sm">Upload videos to see analytics</p>
                        </div>
                    )}
                </div>
            )}

            {profileTab === 'manage' && (
                <div className="p-4 text-white">
                    <h3 className="text-xl font-bold mb-6">Manage Videos</h3>

                    {userVideos.length > 0 ? (
                        <div className="space-y-4">
                            {userVideos.map(video => (
                                <div key={video.id} className="bg-gray-800 p-3 sm:p-4 rounded-lg">
                                    <div className="flex items-start gap-3 sm:gap-4">
                                        <SafeThumbnailImage
                                            video={video}
                                            className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded flex-shrink-0 bg-gray-700 cursor-pointer hover:opacity-80 transition-opacity"
                                            onClick={() => onVideoClick && onVideoClick(video)}
                                        />
                                        <div className="flex-1 min-w-0">
                                            <h5 className="font-medium text-white mb-2 text-sm sm:text-base break-words">
                                                {video.title || video.fileName}
                                            </h5>

                                            {editingVideo?.id === video.id ? (
                                                <div className="space-y-3">
                                                    <div>
                                                        <label className="block text-xs text-gray-400 mb-1">Title</label>
                                                        <input
                                                            type="text"
                                                            value={newTitle}
                                                            onChange={(e) => setNewTitle(e.target.value)}
                                                            placeholder="Enter video title..."
                                                            className="w-full p-2 bg-gray-700 text-white rounded text-sm"
                                                            maxLength={100}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs text-gray-400 mb-1">Description</label>
                                                        <textarea
                                                            value={newDescription}
                                                            onChange={(e) => setNewDescription(e.target.value)}
                                                            placeholder="Add a description..."
                                                            className="w-full p-2 bg-gray-700 text-white rounded text-sm resize-none"
                                                            rows={3}
                                                            maxLength={500}
                                                        />
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => handleUpdateDescription(video.id, newTitle, newDescription)}
                                                            disabled={!newTitle.trim() || !newDescription.trim()}
                                                            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed px-3 py-1 rounded text-sm"
                                                        >
                                                            Save
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setEditingVideo(null);
                                                                setNewTitle('');
                                                                setNewDescription('');
                                                            }}
                                                            className="bg-gray-600 hover:bg-gray-700 px-3 py-1 rounded text-sm"
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div>
                                                    <p className="text-gray-400 text-sm mb-3">
                                                        {video.description || 'No description'}
                                                    </p>
                                                    <div className="text-xs text-gray-500 mb-3">
                                                        {video.views || 0} views • {video.likes || 0} likes • {new Date(video.uploadedAt).toLocaleDateString()}
                                                    </div>
                                                    {/* Video Status */}
                                                    <div className="mb-3">
                                                        {video.isActive ? (
                                                            <span className="text-green-400 text-xs">✅ Live</span>
                                                        ) : (
                                                            <span className="text-yellow-400 text-xs">⏳ Waiting for admin approval</span>
                                                        )}
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => {
                                                                setEditingVideo(video);
                                                                setNewTitle(video.title || video.fileName || '');
                                                                setNewDescription(video.description || '');
                                                            }}
                                                            className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-sm"
                                                        >
                                                            Edit Video
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteVideo(video.id)}
                                                            className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-sm"
                                                        >
                                                            Delete
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center text-gray-400 py-10">
                            <div className="text-6xl mb-4">🎬</div>
                            <p className="text-lg">No videos to manage</p>
                            <p className="text-sm">Upload videos to manage them</p>
                        </div>
                    )}
                </div>
            )}

            {profileTab === 'history' && (
                <div className="p-4 text-white">
                    <h3 className="text-xl font-bold mb-6">All Uploaded Videos (History)</h3>
                    
                    {videos.filter(v => new Date(v.uploadedAt) < OLD_VIDEO_CUTOFF).length > 0 ? (
                        <div className="space-y-4">
                            {videos.filter(v => new Date(v.uploadedAt) < OLD_VIDEO_CUTOFF).map(video => (
                                <div key={video.id} className="bg-gray-800 p-3 sm:p-4 rounded-lg">
                                    <div className="flex items-start gap-3 sm:gap-4">
                                        <SafeThumbnailImage
                                            video={video}
                                            className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded flex-shrink-0 bg-gray-700 cursor-pointer hover:opacity-80 transition-opacity"
                                            onClick={() => onVideoClick && onVideoClick(video)}
                                        />
                                        <div className="flex-1 min-w-0">
                                            <h5 className="font-medium text-white mb-2 text-sm sm:text-base break-words">
                                                {video.title || video.fileName}
                                            </h5>
                                            <div className="text-gray-400 text-xs sm:text-sm mb-2">
                                                {video.description || "No description provided"}
                                            </div>
                                            <div className="text-gray-500 text-xs">
                                                {video.views || 0} views • {video.likes || 0} likes • {new Date(video.uploadedAt).toLocaleDateString()}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center text-gray-400 py-10">
                            <div className="text-6xl mb-4">📜</div>
                            <p className="text-lg">No history found</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// --- Main Page Component ---

export const PitchSultanBattle = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, isAuthenticated, isSEC } = useAuth();

    // Cast user to SECAuthData since we know it's SEC (isSEC is true)
    const secUser = isSEC && user && 'phone' in user ? user : null;
    const [activeTab, setActiveTab] = useState('home');
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [isRecorderOpen, setIsRecorderOpen] = useState(false); // Add recorder state
    const [videos, setVideos] = useState<any[]>([]);
    const [filteredVideos, setFilteredVideos] = useState<any[]>([]); // Add filtered videos state
    const [activeFilter, setActiveFilter] = useState('All'); // Add active filter state
    const [searchQuery, setSearchQuery] = useState(''); // Add search query state
    const [loading, setLoading] = useState(true);
    const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null); // Add this state
    const [adImageUrl, setAdImageUrl] = useState<string | null>(null); // Ad Image URL for upload functionality
    const { uploadWithRetry } = useUploadManager(); // Upload hook
    const [currentUser, setCurrentUser] = useState<{
        name: string;
        handle: string;
        avatar: string;
        subscribers: string;
        role: string;
        store: string;
        region: string;
        isSultanAdmin: boolean;
    }>({
        name: "Loading...",
        handle: "@loading",
        avatar: "https://ui-avatars.com/api/?name=Loading&background=ffd700&color=000",
        subscribers: "0",
        role: "SEC",
        store: "",
        region: "",
        isSultanAdmin: false
    });

    // Define fetchVideos BEFORE useEffect
    const fetchVideos = useCallback(async () => {
        try {
            setLoading(true);
            console.log('📡 Fetching videos from:', `${API_BASE_URL}/pitch-sultan/videos`);

            const token = localStorage.getItem('token');
            const headers: any = {};
            if (token) {
                headers.Authorization = `Bearer ${token}`;
            }

            const queryParams = new URLSearchParams();
            queryParams.append('limit', '10000');
            queryParams.append('_t', new Date().getTime().toString());

            const response = await fetch(`${API_BASE_URL}/pitch-sultan/videos?${queryParams.toString()}`, {
                headers
            });
            const data = await response.json();
            if (data.success) {
                console.log('✅ Videos fetched:', data.data.length);
                const newVideos: any[] = data.data;
                setVideos(newVideos);
                // Apply cutoff filter immediately so old videos never flash on screen
                const initialFiltered = newVideos.filter((v: any) => new Date(v.uploadedAt) >= OLD_VIDEO_CUTOFF);
                setFilteredVideos(initialFiltered);
            } else {
                console.error('❌ Failed to fetch videos:', data.error);
            }
        } catch (error) {
            console.error('❌ Error fetching videos:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    // Check authentication and load Pitch Sultan user
    useEffect(() => {
        const loadPitchSultanUser = async () => {
            // Allow both authenticated and unauthenticated users
            if (isAuthenticated && isSEC && user && 'phone' in user) {
                // Authenticated SEC user
                console.log('✅ Using authenticated SEC user:', user);
                
                // Set current user for display
                const currentUserData = {
                    name: user.name || "SEC User",
                    handle: `@${(user.name || 'sec_user').toLowerCase().replace(/\s+/g, '_')}`,
                    avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'SEC User')}&background=ffd700&color=000`,
                    subscribers: "1.2K",
                    role: (user as any).store?.storeName || "SEC",
                    store: (user as any).store?.storeName || "",
                    region: user.region || "",
                    phone: user.phone,
                    isSultanAdmin: user.isSultanAdmin || false
                };
                setCurrentUser(currentUserData);
            } else {
                // Unauthenticated user - set guest user
                console.log('👤 Guest user accessing PitchSultan');
                const guestUserData = {
                    name: "Guest",
                    handle: "@guest",
                    avatar: `https://ui-avatars.com/api/?name=Guest&background=gray&color=fff`,
                    subscribers: "0",
                    role: "Guest",
                    store: "",
                    region: "",
                    phone: null,
                    isSultanAdmin: false
                };
                setCurrentUser(guestUserData);
            }

            // Fetch videos
            await fetchVideos();
        };

        loadPitchSultanUser();
    }, [isAuthenticated, isSEC, user, navigate]);


    // Reset selected video when switching away from shorts
    useEffect(() => {
        // Reset selected video when switching away from shorts
        if (activeTab !== 'shorts') {
            setSelectedVideoId(null);
        }
    }, [activeTab]);

    // Handle deep link to specific video from location state
    useEffect(() => {
        if (location.state?.videoId) {
            console.log('🔗 Deep link videoId detected:', location.state.videoId);
            setSelectedVideoId(location.state.videoId);
            setActiveTab('shorts');

            // Clear location state to prevent re-opening on refresh
            window.history.replaceState({}, document.title);
        }
    }, [location.state]);

    const handleAdUpload = async (files: FileList) => {
        if (!files || files.length === 0) return;

        let successCount = 0;
        let failCount = 0;

        try {
            const token = localStorage.getItem('token');

            // Loop through all selected files
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                try {
                    console.log(`Processing ad ${i + 1}/${files.length}: ${file.name}`);

                    // Upload to S3/Cloud
                    const filename = `ad-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '')}`;
                    const url = await uploadWithRetry(file, filename, file.type, (p) => {
                        console.log(`Uploading ad ${file.name}: ${p.percentage}%`);
                    });

                    // Save to backend
                    const res = await fetch(`${API_BASE_URL}/pitch-sultan/ad`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({ url, uploaderName: currentUser.name }),
                    });

                    const data = await res.json();
                    if (data.success) {
                        successCount++;
                        // Update ad image url state to the last successful one (for immediate feedback if used elsewhere)
                        setAdImageUrl(url);
                    } else {
                        failCount++;
                        console.error(`Failed to save ad record for ${file.name}:`, data.message);
                    }
                } catch (innerErr) {
                    failCount++;
                    console.error(`Failed to handle file ${file.name}`, innerErr);
                }
            }

            if (successCount > 0) {
                alert(`Successfully uploaded ${successCount} ad image${successCount > 1 ? 's' : ''}! ${failCount > 0 ? `(${failCount} failed)` : ''} They will appear in Shorts randomly.`);
            } else {
                alert("Failed to upload ad images.");
            }

        } catch (e) {
            console.error("Ad upload process failed", e);
            alert("Failed to upload ad images: " + (e instanceof Error ? e.message : "Unknown error"));
        }
    };

    const handleVideoClick = (video: any) => {
        console.log('🎬 Video clicked:', video.id);
        setSelectedVideoId(video.id);
        setActiveTab('shorts');
        console.log('🎬 Set selectedVideoId to:', video.id);
    };

    const handleRecordClick = () => {
        // Same user validation as upload
        const authData = localStorage.getItem('spot_incentive_auth');
        let userId = secUser?.id;

        if (!userId && authData) {
            const parsed = JSON.parse(authData);
            userId = parsed.user?.id;
        }

        if (!userId) {
            console.error('❌ No user ID found');
            alert('Please log in to record videos');
            return;
        }

        console.log('🎬 Opening video recorder for user:', userId);
        setIsRecorderOpen(true);
    };

    const handleVideoRecorded = (videoBlob: Blob) => {
        // Convert blob to file and open upload modal
        const videoFile = new File([videoBlob], `recorded-short-${Date.now()}.webm`, {
            type: 'video/webm'
        });

        // You can either:
        // 1. Auto-upload the recorded video
        // 2. Or pass it to the upload modal for review

        // For now, let's auto-upload it
        uploadRecordedVideo(videoFile);
    };

    const uploadRecordedVideo = async (videoFile: File) => {
        // This is a simplified version - you might want to show progress
        try {
            console.log('🚀 Auto-uploading recorded video:', videoFile.name);

            // You can implement the upload logic here
            // or open the upload modal with the pre-selected file
            setIsUploadModalOpen(true);
            // Note: You'd need to modify VideoUploadModal to accept a pre-selected file

        } catch (error) {
            console.error('❌ Error uploading recorded video:', error);
            alert('Failed to upload recorded video');
        }
    };

    const handleUploadSuccess = (videoData: any) => {
        // Refresh videos from database
        fetchVideos();
    };

    const handleVideoUpdate = (videoId: string, updates: { title?: string, description?: string }) => {
        // Update local videos state immediately
        setVideos(prevVideos => {
            const updatedVideos = prevVideos.map(video =>
                video.id === videoId
                    ? { ...video, ...updates }
                    : video
            );
            // Also update filtered videos
            applyFilter(activeFilter, updatedVideos, searchQuery);
            return updatedVideos;
        });
    };

    const handleVideoDelete = (videoId: string) => {
        // Remove video from local state immediately
        setVideos(prevVideos => {
            const updatedVideos = prevVideos.filter(video => video.id !== videoId);
            // Also update filtered videos
            applyFilter(activeFilter, updatedVideos, searchQuery);
            return updatedVideos;
        });
    };

    const applyFilter = (filter: string, videosToFilter: any[] = videos, searchTerm: string = searchQuery) => {
        // Filter out old videos for the main feed
        let filtered = videosToFilter.filter(v => new Date(v.uploadedAt) >= OLD_VIDEO_CUTOFF);

        // Apply search filter first if there's a search term
        if (searchTerm.trim()) {
            filtered = filtered.filter(video => {
                const title = (video.title || video.fileName || '').toLowerCase();
                return title.includes(searchTerm.toLowerCase());
            });
        }

        // Then apply category filter
        switch (filter) {
            case 'All':
                // Already filtered by search if applicable
                break;
            case 'Recently Uploaded':
                // Sort by upload date, most recent first
                filtered = filtered.sort((a, b) =>
                    new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
                );
                break;
            case 'Trending':
                // Sort by views, highest first
                filtered = filtered.sort((a, b) =>
                    (b.views || 0) - (a.views || 0)
                );
                break;
            default:
                // Already filtered by search if applicable
                break;
        }

        setFilteredVideos(filtered);
    };

    const handleFilterChange = (filter: string) => {
        setActiveFilter(filter);
        applyFilter(filter, videos, searchQuery);
    };

    const handleSearch = (query: string) => {
        setSearchQuery(query);
        applyFilter(activeFilter, videos, query);
    };

    const handleNotificationClick = () => {
        setActiveTab('notifications');
    };

    const handleLogoClick = () => {
        setActiveTab('home');
    };

    const handleVideoStatsUpdate = (videoId: string, updates: { views?: number, likes?: number, commentsCount?: number }) => {
        // Update local videos state with new stats
        setVideos(prevVideos =>
            prevVideos.map(video =>
                video.id === videoId
                    ? { ...video, ...updates }
                    : video
            )
        );

        // Also update filtered videos to keep UI consistent
        setFilteredVideos(prevFiltered =>
            prevFiltered.map(video =>
                video.id === videoId
                    ? { ...video, ...updates }
                    : video
            )
        );
    };

    // Re-apply filter when filter or search changes (NOT on initial videos load — that's handled in fetchVideos)
    useEffect(() => {
        if (videos.length > 0 && (activeFilter !== 'All' || searchQuery.trim())) {
            applyFilter(activeFilter, videos, searchQuery);
        }
    }, [activeFilter, searchQuery]);

    const handleUploadClick = () => {
        // Direct check from localStorage
        const authData = localStorage.getItem('spot_incentive_auth');
        console.log('🔍 Raw localStorage:', authData);

        let userId = secUser?.id;

        if (!userId && authData) {
            const parsed = JSON.parse(authData);
            userId = parsed.user?.id;
            console.log('🔍 Got ID from localStorage:', userId);
        }

        console.log('🔍 Final userId:', userId);
        console.log('🔍 secUser:', secUser);

        if (!userId) {
            console.error('❌ No user ID found');
            alert('Please log in to upload videos');
            return;
        }

        console.log('✅ Opening modal with ID:', userId);
        setIsUploadModalOpen(true);
    };

    return (
        <div className="min-h-screen bg-[#0f0f0f] text-white">
            {currentUser && <Navbar currentUser={currentUser} onSearch={handleSearch} onNotificationClick={handleNotificationClick} onLogoClick={handleLogoClick} onAdUpload={handleAdUpload} onHistoryClick={() => { setActiveTab('profile'); window.scrollTo(0, 0); }} />}

            <div className="pt-14 pb-16 md:pl-0">
                <div className={`${activeTab === 'home' ? 'block' : 'hidden'}`}>
                    <div className="max-w-4xl mx-auto md:p-4">
                        {/* Filter chips */}
                        <div className="flex gap-2 overflow-x-auto px-4 py-3 md:px-0 no-scrollbar">
                            {/* Search indicator */}
                            {searchQuery && (
                                <span
                                    className="whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 flex-shrink-0"
                                    style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)' }}
                                >
                                    <MdSearch className="text-sm" />
                                    "{searchQuery}"
                                    <button
                                        onClick={() => handleSearch('')}
                                        className="ml-1 rounded-full"
                                    >
                                        <MdClose className="text-xs" />
                                    </button>
                                </span>
                            )}

                            {/* Filter chips */}
                            {['All', 'Recently Uploaded', 'Trending'].map((chip, i) => (
                                <span
                                    key={i}
                                    onClick={() => handleFilterChange(chip)}
                                    className="whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-all duration-200 flex-shrink-0 active:scale-95"
                                    style={activeFilter === chip ? {
                                        background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                                        color: '#000',
                                        boxShadow: '0 2px 12px rgba(245,158,11,0.3)'
                                    } : {
                                        background: 'rgba(255,255,255,0.07)',
                                        color: 'rgba(255,255,255,0.7)',
                                        border: '1px solid rgba(255,255,255,0.1)'
                                    }}
                                >
                                    {chip === 'Trending' ? '🔥 ' : chip === 'Recently Uploaded' ? '🆕 ' : ''}{chip}
                                </span>
                            ))}
                        </div>

                        {/* Loading State */}
                        {loading && (
                            <div className="flex flex-col items-center justify-center py-24 gap-4">
                                <div
                                    className="w-12 h-12 rounded-full border-4 animate-spin"
                                    style={{ borderColor: 'rgba(245,158,11,0.2)', borderTopColor: '#f59e0b' }}
                                />
                                <p className="text-gray-500 text-sm">Loading videos...</p>
                            </div>
                        )}

                        {/* Empty State - filter mismatch */}
                        {!loading && filteredVideos.length === 0 && videos.length > 0 && (
                            <div className="flex flex-col items-center justify-center py-24 text-gray-400">
                                <div
                                    className="w-20 h-20 rounded-2xl flex items-center justify-center mb-5"
                                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                                >
                                    <MdOutlineSlowMotionVideo className="text-4xl text-gray-600" />
                                </div>
                                <p className="text-base font-semibold text-gray-300 mb-1">No videos found</p>
                                <p className="text-sm text-center max-w-xs">
                                    {searchQuery
                                        ? `No videos match "${searchQuery}". Try a different search term.`
                                        : 'Try a different filter or upload new content'
                                    }
                                </p>
                            </div>
                        )}

                        {/* Empty State - No videos at all */}
                        {!loading && videos.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-24 text-gray-400">
                                <div
                                    className="w-20 h-20 rounded-2xl flex items-center justify-center mb-5"
                                    style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.12) 0%, rgba(217,119,6,0.06) 100%)', border: '1px solid rgba(245,158,11,0.2)' }}
                                >
                                    <MdPlayArrow className="text-4xl" style={{ color: '#f59e0b' }} />
                                </div>
                                <p className="text-base font-semibold text-white mb-1">No videos yet</p>
                                <p className="text-sm">Be the first to upload a pitch!</p>
                            </div>
                        )}

                        {/* Video Feed */}
                        {!loading && filteredVideos.length > 0 && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-4 gap-x-4">
                                {filteredVideos.map((video, index) => {
                                    let borderStyle = "";
                                    let rankBadge = null;

                                    if (activeFilter === 'Trending') {
                                        if (index === 0) {
                                            borderStyle = "ring-4 ring-yellow-400 rounded-lg p-1 relative";
                                            rankBadge = (
                                                <div className="absolute -top-3 -right-3 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center z-10 shadow-lg font-bold text-black border-2 border-black">
                                                    1
                                                </div>
                                            );
                                        } else if (index === 1) {
                                            borderStyle = "ring-4 ring-gray-300 rounded-lg p-1 relative";
                                            rankBadge = (
                                                <div className="absolute -top-3 -right-3 w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center z-10 shadow-lg font-bold text-black border-2 border-black">
                                                    2
                                                </div>
                                            );
                                        } else if (index === 2) {
                                            borderStyle = "ring-4 ring-amber-700 rounded-lg p-1 relative";
                                            rankBadge = (
                                                <div className="absolute -top-3 -right-3 w-8 h-8 bg-amber-700 rounded-full flex items-center justify-center z-10 shadow-lg font-bold text-white border-2 border-black">
                                                    3
                                                </div>
                                            );
                                        }
                                    }

                                    return (
                                        <div key={video.id} className={borderStyle}>
                                            {rankBadge}
                                            <VideoPreview
                                                video={video}
                                                onVideoClick={handleVideoClick}
                                                showMenu={true}
                                                currentUser={currentUser}
                                                onVideoStatsUpdate={handleVideoStatsUpdate}
                                                onVideoDelete={(id) => {
                                                    setVideos(prev => prev.filter(v => v.id !== id));
                                                    setFilteredVideos(prev => prev.filter(v => v.id !== id));
                                                }}
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Shorts View - Only mount when active */}
                {activeTab === 'shorts' && (
                    <div className="fixed inset-0 bg-black z-40">
                        <ShortsView 
                            videos={(() => {
                                const activeVideos = videos.filter(v => new Date(v.uploadedAt) >= OLD_VIDEO_CUTOFF);
                                if (selectedVideoId && !activeVideos.some(v => v.id === selectedVideoId)) {
                                    const historyVideo = videos.find(v => v.id === selectedVideoId);
                                    if (historyVideo) {
                                        return [historyVideo, ...activeVideos];
                                    }
                                }
                                return activeVideos;
                            })()} 
                            startingVideoId={selectedVideoId} 
                            onVideoStatsUpdate={handleVideoStatsUpdate} 
                            currentUserId={secUser?.id} 
                            currentUser={currentUser} 
                        />
                    </div>
                )}

                <div className={`${activeTab === 'create' ? 'block' : 'hidden'}`}>
                    <CreateView onUploadClick={handleUploadClick} onRecordClick={handleRecordClick} />
                </div>

                <div className={`${activeTab === 'help' ? 'block' : 'hidden'}`}>
                    <HelpSupportView />
                </div>

                <div className={`${activeTab === 'notifications' ? 'block' : 'hidden'}`}>
                    <NotificationsView />
                </div>

                <div className={`${activeTab === 'profile' ? 'block' : 'hidden'}`}>
                    {currentUser && <ProfileView currentUser={currentUser} videos={videos} onVideoClick={handleVideoClick} onVideoUpdate={handleVideoUpdate} onVideoDelete={handleVideoDelete} />}
                </div>
            </div>

            <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />

            {/* Video Upload Modal */}
            <VideoUploadModal
                isOpen={isUploadModalOpen}
                onClose={() => setIsUploadModalOpen(false)}
                onUploadSuccess={handleUploadSuccess}
                currentUserId={secUser?.id}
            />

            {/* Video Recorder */}
            <VideoRecorder
                isOpen={isRecorderOpen}
                onClose={() => setIsRecorderOpen(false)}
                onVideoRecorded={handleVideoRecorded}
            />
        </div>
    );
};
