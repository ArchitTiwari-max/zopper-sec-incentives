import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
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
    MdPlayArrow, MdVideocam
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

const Navbar = ({ currentUser, onSearch, onNotificationClick, onLogoClick, onAdUpload }: {
    currentUser: { name: string; handle: string; avatar: string; subscribers: string; role: string; store: string; region: string, isSultanAdmin?: boolean },
    onSearch?: (query: string) => void,
    onNotificationClick?: () => void,
    onLogoClick?: () => void,
    onAdUpload?: (files: FileList) => void
}) => {
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const [isSearchActive, setIsSearchActive] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const { logout } = useAuth();
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
        <div className="fixed top-0 left-0 right-0 h-14 bg-[#0f0f0f] flex items-center justify-between px-4 z-50 border-b border-gray-800">
            {!isSearchActive ? (
                <>
                    {/* Logo */}
                    <div
                        className="flex items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={onLogoClick}
                    >
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center">
                            <span className="text-black font-black text-xs">PS</span>
                        </div>
                        <span className="text-white font-bold tracking-tighter text-lg ml-1 font-sans">PitchSultan</span>
                    </div>

                    {/* Right Icons */}
                    <div className="flex items-center gap-4 text-white">
                        <button
                            onClick={() => navigate('/welcome')}
                            className="hidden md:flex items-center gap-1 text-xs font-bold text-white hover:bg-red-700 transition-colors bg-red-600 px-3 py-1.5 rounded-full shadow-sm mr-2"
                        >
                            <MdArrowBack className="text-sm" />
                            Back
                        </button>
                        {/* Mobile Back Icon only */}
                        <MdArrowBack
                            className="md:hidden text-xl cursor-pointer text-red-500 hover:text-red-400"
                            onClick={() => navigate('/welcome')}
                        />
                        <MdNotificationsNone
                            className="text-xl cursor-pointer hover:text-gray-300"
                            onClick={onNotificationClick}
                        />
                        <MdSearch
                            className="text-xl cursor-pointer hover:text-gray-300"
                            onClick={() => setIsSearchActive(true)}
                        />

                        {/* Profile Menu */}
                        <div className="relative">
                            <img
                                src={currentUser.avatar}
                                alt="Profile"
                                className="w-6 h-6 rounded-full cursor-pointer hover:ring-2 hover:ring-gray-600 transition-all"
                                onClick={() => setShowProfileMenu(!showProfileMenu)}
                            />

                            {/* Dropdown Menu */}
                            {showProfileMenu && (
                                <>
                                    {/* Backdrop to close menu */}
                                    <div
                                        className="fixed inset-0 z-10"
                                        onClick={() => setShowProfileMenu(false)}
                                    />

                                    {/* Menu */}
                                    <div className="absolute right-0 top-8 mt-2 w-48 bg-[#282828] rounded-lg shadow-lg border border-gray-700 z-20 animate-in fade-in duration-200">
                                        <div className="py-2">
                                            {/* User Info */}
                                            <div className="px-4 py-2 border-b border-gray-700">
                                                <p className="text-white font-medium text-sm">{currentUser.name}</p>
                                                <p className="text-gray-400 text-xs">{currentUser.handle}</p>
                                                <p className="text-gray-500 text-xs">{currentUser.role}</p>
                                            </div>

                                            {/* Ad Upload for Sultan Admin */}
                                            {currentUser.isSultanAdmin && (
                                                <button
                                                    onClick={() => adInputRef.current?.click()}
                                                    className="w-full px-4 py-2 text-left text-blue-400 hover:bg-blue-900/20 transition-colors flex items-center gap-2 text-sm"
                                                >
                                                    <MdUpload className="text-lg" />
                                                    <span>Upload Ad Images</span>
                                                </button>
                                            )}

                                            {/* Logout Button */}
                                            <button
                                                onClick={handleLogout}
                                                className="w-full px-4 py-2 text-left text-red-400 hover:bg-red-900/20 transition-colors flex items-center gap-2 text-sm"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                                </svg>
                                                Logout
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </>
            ) : (
                /* Search Mode - Expanded */
                <form onSubmit={handleSearchSubmit} className="flex items-center w-full gap-3">
                    <MdSearch className="text-white text-xl flex-shrink-0" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search videos by title..."
                        className="flex-1 bg-transparent text-white placeholder-gray-400 outline-none text-sm"
                        autoFocus
                    />
                    <button
                        type="button"
                        onClick={handleSearchClose}
                        className="text-gray-400 hover:text-white transition-colors flex-shrink-0"
                    >
                        <MdClose className="text-xl" />
                    </button>
                </form>
            )}
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
        <div className="fixed bottom-0 left-0 right-0 h-[60px] bg-[#0f0f0f] border-t border-gray-800 flex items-center justify-around z-50 px-2 pb-1">
            {navItems.map((item) => {
                const isActive = activeTab === item.id;
                const Icon = isActive ? item.activeIcon : item.icon;

                if (item.isAction) {
                    return (
                        <div key={item.id} className="flex flex-col items-center justify-center cursor-pointer" onClick={() => setActiveTab(item.id)}>
                            <Icon className="text-4xl text-gray-200 font-light" />
                        </div>
                    );
                }

                return (
                    <div
                        key={item.id}
                        className="flex flex-col items-center justify-center w-full h-full cursor-pointer"
                        onClick={() => setActiveTab(item.id)}
                    >
                        <Icon className={`text-2xl mb-1 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                        <span className={`text-[10px] ${isActive ? 'text-white' : 'text-gray-400'}`}>{item.label}</span>
                    </div>
                );
            })}
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
        <div className="flex flex-col mb-6 cursor-pointer group" onClick={handleVideoClick}>
            <div className="relative w-full aspect-video bg-gray-800 overflow-hidden">
                <img
                    src={getThumbnailUrl(videoSource)}
                    alt={video.title || video.fileName || 'Video thumbnail'}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    style={{ objectPosition: 'center 20%' }}
                />

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
                <div className="flex flex-col">
                    <h3 className="text-white text-sm md:text-base font-semibold line-clamp-2 leading-tight">
                        {video.title || video.fileName || 'Untitled Video'}
                    </h3>
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
        <div className="flex flex-col items-center justify-center h-[80vh] text-white p-6">
            <div className="w-24 h-24 bg-gray-800 rounded-full flex items-center justify-center mb-6 animate-bounce">
                <MdUpload className="text-5xl text-gray-400" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Create Content</h2>
            <p className="text-gray-400 text-center mb-8 max-w-xs">Share your sales pitch with the Sultan community. Upload a video to get started.</p>

            <div className="flex flex-col gap-4 w-full max-w-sm">
                <div className="bg-gray-800/80 p-4 rounded-lg border border-gray-700 mb-2 backdrop-blur-sm">
                    <label className="flex items-start gap-3 cursor-pointer group select-none">
                        <div className="relative flex items-center pt-0.5">
                            <input
                                type="checkbox"
                                checked={accepted}
                                onChange={(e) => setAccepted(e.target.checked)}
                                className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-gray-900 border-2"
                            />
                        </div>
                        <p className="text-xs text-gray-400 leading-relaxed group-hover:text-gray-300 transition-colors">
                            I agree that by uploading this video, I grant <strong>Zopper</strong> full and exclusive rights to use, reproduce, modify, and distribute this content anywhere, in perpetuity, for any purpose.
                        </p>
                    </label>
                </div>

                <button
                    onClick={onUploadClick}
                    disabled={!accepted}
                    className={`font-semibold py-3 px-6 rounded-full w-full flex items-center justify-center gap-2 transition-all ${accepted
                        ? 'bg-[#3ea6ff] hover:bg-[#3095ef] text-black active:scale-95 shadow-[0_0_15px_rgba(62,166,255,0.4)]'
                        : 'bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700'
                        }`}
                >
                    <MdUpload className="text-xl" /> Upload Video
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
        <div className="min-h-screen text-white md:p-4 max-w-4xl mx-auto pb-20">
            <div className="p-4">
                <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
                    <MdHelp className="text-3xl text-blue-400" /> Help & Support
                </h2>
                <p className="text-gray-400 text-sm mb-6">Get answers to your questions and reach out for support</p>

                {/* FAQ Section */}
                <div className="mb-8">
                    <h3 className="text-lg font-semibold mb-4 text-gray-200">Frequently Asked Questions</h3>
                    <div className="space-y-3">
                        {HELP_TOPICS.map((topic) => {
                            const Icon = topic.icon;
                            const isExpanded = expandedId === topic.id;
                            return (
                                <div
                                    key={topic.id}
                                    className={`bg-gray-900 overflow-hidden rounded-xl transition-all duration-300 ${isExpanded ? 'ring-1 ring-blue-500/50' : 'hover:bg-gray-800 cursor-pointer'}`}
                                    onClick={() => toggleExpand(topic.id)}
                                >
                                    <div className="p-4 flex items-start gap-3">
                                        <Icon className="text-2xl text-blue-400 mt-1 flex-shrink-0" />
                                        <div className="flex-1">
                                            <h4 className="font-semibold text-white mb-1">{topic.title}</h4>
                                            <p className="text-sm text-gray-400">{topic.description}</p>
                                        </div>
                                        <MdKeyboardArrowDown className={`text-2xl text-gray-500 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                                    </div>

                                    {/* Expanded Content */}
                                    <div className={`grid transition-all duration-300 ease-in-out ${isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                                        <div className="overflow-hidden">
                                            <div className="px-4 pb-4 pt-0">
                                                {topic.id === 1 ? (
                                                    <div className="pl-9 text-sm text-gray-400 space-y-2">
                                                        <p className="font-semibold text-white">Required Format:</p>
                                                        <ul className="list-disc pl-4 space-y-1">
                                                            <li>Hold phone vertically (9:16 ratio)</li>
                                                            <li>Portrait mode only</li>
                                                            <li className="text-red-400">Landscape videos rejected</li>
                                                        </ul>
                                                    </div>
                                                ) : topic.id === 3 ? (
                                                    <div className="pl-9 text-sm text-gray-400 space-y-2">
                                                        <ul className="list-disc pl-4 space-y-2">
                                                            <li>Record your <strong>40secs to 2mins</strong> video pitching any one PROTECMAX plan.</li>
                                                            <li>You are supposed to explain the plan in the same way you explain it to the customers. (Basically we want to see your dealing skills with your customers)</li>
                                                            <li>Language can be of your choice.</li>
                                                            <li>Your phone camera is enough to record yourself and make you a star! We don't need high quality videos, we just want to see your pitching talent.</li>
                                                        </ul>
                                                    </div>
                                                ) : topic.id === 6 ? (
                                                    <div className="pl-9 text-sm text-gray-400 space-y-3">
                                                        <div className="bg-gradient-to-r from-amber-500/10 to-yellow-500/10 p-3 rounded-lg border border-amber-500/20">
                                                            <h5 className="text-amber-400 font-bold mb-1 flex items-center gap-2">
                                                                🚀 Early Bird Reward
                                                            </h5>
                                                            <p className="text-gray-300">The first 5 competitors who will submit their videos are going to get <span className="text-white font-bold">500/- Rs</span> Amazon vouchers!</p>
                                                        </div>

                                                        <div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 p-3 rounded-lg border border-blue-500/20">
                                                            <h5 className="text-blue-400 font-bold mb-1 flex items-center gap-2">
                                                                🏆 Top Performers
                                                            </h5>
                                                            <p className="text-gray-300">Top 9 winners will get <span className="text-white font-bold">1000/- Rs</span> Amazon vouchers!</p>
                                                        </div>

                                                        <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 p-3 rounded-lg border border-purple-500/20">
                                                            <h5 className="text-purple-400 font-bold mb-1 flex items-center gap-2">
                                                                👑 The ULTIMATE SULTAN
                                                            </h5>
                                                            <p className="text-gray-300">The ULTIMATE SULTAN will receive <span className="text-white font-bold">5000/- Rs</span> Amazon voucher!</p>
                                                        </div>

                                                        <div className="mt-4 p-3 bg-gray-800 rounded-lg">
                                                            <p className="text-gray-400 text-xs italic">
                                                                Note: The best videos will be used for training purposes all over India along with credits.
                                                            </p>
                                                        </div>
                                                    </div>
                                                ) : topic.id === 5 ? (
                                                    <div className="pl-9 text-sm text-gray-400 space-y-3">
                                                        <p className="mb-2">For any technical issues, feel free to contact:</p>
                                                        <div className="grid gap-2 sm:grid-cols-2">
                                                            <div className="bg-gray-800 p-3 rounded-lg border border-gray-700">
                                                                <p className="font-semibold text-white">Archit Tiwari</p>
                                                                <a href="mailto:archit.tiwari@zopper.com" className="text-blue-400 text-xs hover:underline">archit.tiwari@zopper.com</a>
                                                            </div>
                                                            <div className="bg-gray-800 p-3 rounded-lg border border-gray-700">
                                                                <p className="font-semibold text-white">Vishal Shukla</p>
                                                                <a href="mailto:vishal.shukla@zopper.com" className="text-blue-400 text-xs hover:underline">vishal.shukla@zopper.com</a>
                                                            </div>
                                                            <div className="bg-gray-800 p-3 rounded-lg border border-gray-700 sm:col-span-2">
                                                                <p className="font-semibold text-white">Harshdeep Singh</p>
                                                                <a href="mailto:harshdeep.singh@zopper.com" className="text-blue-400 text-xs hover:underline">harshdeep.singh@zopper.com</a>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <p className="text-sm text-gray-400 pl-9">
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

                {/* Contact Support */}
                <div className="bg-gradient-to-br from-blue-900/30 to-purple-900/30 p-6 rounded-xl border border-blue-800/30">
                    <h3 className="text-lg font-semibold mb-4 text-gray-200">Contact Support</h3>
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 text-gray-300">
                            <div className="w-10 h-10 bg-blue-600/20 rounded-full flex items-center justify-center">
                                <MdEmail className="text-xl text-blue-400" />
                            </div>
                            <div className="flex-1">
                                <p className="text-sm text-gray-400">Email Support</p>
                                <div className="flex flex-col gap-0.5 text-sm font-medium mt-0.5">
                                    <a href="mailto:archit.tiwari@zopper.com" className="hover:text-blue-400 text-xs sm:text-sm transition-colors">archit.tiwari@zopper.com</a>
                                    <a href="mailto:vishal.shukla@zopper.com" className="hover:text-blue-400 text-xs sm:text-sm transition-colors">vishal.shukla@zopper.com</a>
                                    <a href="mailto:harshdeep.singh@zopper.com" className="hover:text-blue-400 text-xs sm:text-sm transition-colors">harshdeep.singh@zopper.com</a>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-start gap-3 text-gray-300">
                            <div className="w-10 h-10 bg-green-600/20 rounded-full flex items-center justify-center flex-shrink-0">
                                <MdPhone className="text-xl text-green-400" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-400">Phone Support</p>
                                <div className="flex flex-col gap-0.5 text-sm font-medium mt-0.5">
                                    <a href="tel:9569310917" className="hover:text-green-400 transition-colors">9569310917</a>
                                    <a href="tel:7408108617" className="hover:text-green-400 transition-colors">7408108617</a>
                                </div>
                            </div>
                        </div>
                    </div>
                    <button className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-full transition-colors">
                        Send us a message
                    </button>
                </div>
            </div>
        </div>
    );
};

const ProfileView = ({ currentUser, videos, onVideoClick, onVideoUpdate, onVideoDelete }: {
    currentUser: { name: string; handle: string; avatar: string; subscribers: string; role: string; store: string; region: string; isSultanAdmin: boolean },
    videos: any[],
    onVideoClick?: (video: any) => void,
    onVideoUpdate?: (videoId: string, updates: { title?: string, description?: string }) => void,
    onVideoDelete?: (videoId: string) => void
}) => {
    const [profileTab, setProfileTab] = useState<'analytics' | 'manage'>('analytics');
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
            <div className="flex border-b border-gray-800 text-white text-sm font-medium sticky top-14 bg-[#0f0f0f]">
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
                                                <img
                                                    src={getThumbnailUrl(video.thumbnailUrl || video.url)}
                                                    alt={video.title}
                                                    className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded flex-shrink-0 bg-gray-700 cursor-pointer hover:opacity-80 transition-opacity"
                                                    loading="lazy"
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
                                        <img
                                            src={getThumbnailUrl(video.thumbnailUrl || video.url)}
                                            alt={video.title}
                                            className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded flex-shrink-0 bg-gray-700 cursor-pointer hover:opacity-80 transition-opacity"
                                            loading="lazy"
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
        </div>
    );
};

// --- Main Page Component ---

export const PitchSultanBattle = () => {
    const navigate = useNavigate();
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

    // Check authentication and load Pitch Sultan user
    useEffect(() => {
        const loadPitchSultanUser = async () => {
            // 1. Check if user is authenticated as SEC
            if (!isAuthenticated || !isSEC || !user || !('phone' in user)) {
                navigate('/');
                return;
            }

            // 2. Check if user has completed Pitch Sultan profile
            // All three fields are required: name, storeId, region
            console.log('✅ Using authenticated SEC user:', user);
            console.log('🔍 Checking profile completion:', {
                name: user.name,
                storeId: 'storeId' in user ? user.storeId : null,
                region: 'region' in user ? user.region : null
            });

            if (!user.name || !('storeId' in user) || !user.storeId || !('region' in user) || !user.region) {
                // User needs to complete profile setup
                console.log('⚠️ User profile incomplete, redirecting to setup');
                navigate('/pitchsultan/setup');
                return;
            }

            // 3. Set current user for display
            const currentUserData = {
                name: user.name || "SEC User",
                handle: `@${(user.name || 'sec_user').toLowerCase().replace(/\s+/g, '_')}`,
                avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'SEC User')}&background=ffd700&color=000`,
                subscribers: "1.2K",
                role: (user as any).store?.storeName || "SEC",
                store: (user as any).store?.storeName || "",
                region: user.region || "",
                phone: user.phone, // Add phone property
                isSultanAdmin: user.isSultanAdmin || false
            };
            setCurrentUser(currentUserData);

            // 4. Fetch videos
            await fetchVideos();
        };

        loadPitchSultanUser();
    }, [isAuthenticated, isSEC, user, navigate]);

    const fetchVideos = async () => {
        try {
            setLoading(true);
            console.log('📡 Fetching videos from:', `${API_BASE_URL}/pitch-sultan/videos`);

            // Include authorization header for sultan admin
            const token = localStorage.getItem('token');
            const headers: any = {};
            if (token) {
                headers.Authorization = `Bearer ${token}`;
            }

            const response = await fetch(`${API_BASE_URL}/pitch-sultan/videos?limit=50&_t=${new Date().getTime()}`, {
                headers
            });
            const data = await response.json();
            if (data.success) {
                setVideos(data.data);
                setFilteredVideos(data.data); // Initialize filtered videos
            } else {
                console.error('❌ Failed to fetch videos:', data.error);
            }
        } catch (error) {
            console.error('❌ Error fetching videos:', error);
        } finally {
            setLoading(false);
        }
    };

    // Reset selected video when switching away from shorts
    useEffect(() => {
        // Reset selected video when switching away from shorts
        if (activeTab !== 'shorts') {
            setSelectedVideoId(null);
        }
    }, [activeTab]);

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
        console.log('🎬 Current selectedVideoId:', selectedVideoId);
        setSelectedVideoId(video.id);
        setActiveTab('shorts');
        console.log('🎬 Set selectedVideoId to:', video.id, 'and switched to shorts tab');
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
        let filtered = [...videosToFilter];

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

    // Apply filter when videos change
    useEffect(() => {
        if (videos.length > 0) {
            applyFilter(activeFilter, videos, searchQuery);
        }
    }, [videos, activeFilter, searchQuery]);

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
            {currentUser && <Navbar currentUser={currentUser} onSearch={handleSearch} onNotificationClick={handleNotificationClick} onLogoClick={handleLogoClick} onAdUpload={handleAdUpload} />}

            <div className="pt-14 pb-16 md:pl-0">
                <div className={`${activeTab === 'home' ? 'block' : 'hidden'}`}>
                    <div className="max-w-4xl mx-auto md:p-4">
                        {/* Back Button */}

                        {/* Chips */}
                        <div className="flex gap-2 overflow-x-auto p-4 md:px-0 no-scrollbar">
                            {/* Search indicator */}
                            {searchQuery && (
                                <span className="whitespace-nowrap px-3 py-1.5 rounded-lg text-sm font-medium bg-blue-600 text-white flex items-center gap-2">
                                    <MdSearch className="text-sm" />
                                    "{searchQuery}"
                                    <button
                                        onClick={() => handleSearch('')}
                                        className="hover:bg-blue-700 rounded-full p-0.5"
                                    >
                                        <MdClose className="text-sm" />
                                    </button>
                                </span>
                            )}

                            {/* Filter chips */}
                            {['All', 'Recently Uploaded', 'Trending'].map((chip, i) => (
                                <span
                                    key={i}
                                    onClick={() => handleFilterChange(chip)}
                                    className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-sm font-medium cursor-pointer transition-colors ${activeFilter === chip
                                        ? 'bg-white text-black'
                                        : 'bg-gray-800 text-white hover:bg-gray-700'
                                        }`}
                                >
                                    {chip}
                                </span>
                            ))}
                        </div>

                        {/* Loading State */}
                        {loading && (
                            <div className="flex justify-center items-center py-20">
                                <div className="w-12 h-12 border-4 border-gray-700 border-t-white rounded-full animate-spin"></div>
                            </div>
                        )}

                        {/* Empty State */}
                        {!loading && filteredVideos.length === 0 && videos.length > 0 && (
                            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                                <MdOutlineSlowMotionVideo className="text-6xl mb-4" />
                                <p className="text-lg">
                                    {searchQuery ? 'No videos found' : 'No videos found'}
                                </p>
                                <p className="text-sm">
                                    {searchQuery
                                        ? `No videos match "${searchQuery}". Try a different search term.`
                                        : 'Try a different filter or upload new content'
                                    }
                                </p>
                            </div>
                        )}

                        {/* Empty State - No videos at all */}
                        {!loading && videos.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                                <MdOutlineSlowMotionVideo className="text-6xl mb-4" />
                                <p className="text-lg">No videos yet</p>
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
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                <div className={`${activeTab === 'shorts' ? 'block' : 'hidden'} fixed inset-0 bg-black z-40`}>
                    <ShortsView videos={videos} startingVideoId={selectedVideoId} onVideoStatsUpdate={handleVideoStatsUpdate} currentUserId={secUser?.id} currentUser={currentUser} />
                </div>

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
