import React, { useState, useEffect } from 'react';
import {
    MdHome, MdHomeFilled,
    MdOutlineSlowMotionVideo, MdSlowMotionVideo,
    MdAddCircleOutline, MdAddCircle,
    MdLeaderboard,
    MdPerson, MdPersonOutline,
    MdSearch, MdNotificationsNone, MdCast,
    MdThumbUp, MdThumbDown,
    MdComment, MdShare, MdMoreVert,
    MdClose, MdUpload, MdRemoveRedEye,
    MdHelpOutline, MdHelp, MdEmail, MdPhone, MdQuestionAnswer, MdKeyboardArrowDown
} from 'react-icons/md';
import { BiLike, BiDislike, BiCommentDetail, BiShare } from "react-icons/bi";
import { VideoUploadModal } from '../components/VideoUploadModal';
import contestRulesImg from '../assets/contest-rules.jpg';


// --- Mock Data (REMOVED - Now using database) ---

const HELP_TOPICS = [
    { id: 1, icon: MdQuestionAnswer, title: "How to Upload a Video", description: "Learn how to share your pitch with the community" },
    { id: 2, icon: MdQuestionAnswer, title: "Creating Shorts", description: "Quick tips on making engaging short videos" },
    { id: 3, icon: MdQuestionAnswer, title: "Contest Rules", description: "Understand the Pitch Sultan competition guidelines" },
    { id: 4, icon: MdQuestionAnswer, title: "Scoring System", description: "How your pitches are evaluated and ranked" },
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

// --- Components ---

const Navbar = ({ currentUser }: { currentUser: { name: string; handle: string; avatar: string; subscribers: string; role: string; store: string; region: string } }) => (
    <div className="fixed top-0 left-0 right-0 h-14 bg-[#0f0f0f] flex items-center justify-between px-4 z-50 border-b border-gray-800">
        <div className="flex items-center gap-1">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center">
                <span className="text-black font-black text-xs">PS</span>
            </div>
            <span className="text-white font-bold tracking-tighter text-lg ml-1 font-sans">PitchSultan</span>
        </div>

        <div className="flex items-center gap-4 text-white">
            <MdNotificationsNone className="text-xl cursor-pointer hover:text-gray-300" />
            <MdSearch className="text-xl cursor-pointer hover:text-gray-300" />
            <img src={currentUser.avatar} alt="Profile" className="w-6 h-6 rounded-full cursor-pointer" />
        </div>
    </div>
);

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

const VideoCard = ({ video }: { video: any }) => {
    const videoSource = video.url;
    const uploaderName = video.user?.name || video.uploader || 'Unknown';
    const uploaderAvatar = video.user?.name 
        ? `https://ui-avatars.com/api/?name=${encodeURIComponent(video.user.name)}&background=ffd700&color=000`
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

    return (
        <div className="flex flex-col mb-6 cursor-pointer group">
            <div className="relative w-full aspect-video bg-gray-800 overflow-hidden">
                <video 
                    src={videoSource} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    preload="metadata"
                />
            </div>
            <div className="flex gap-3 mt-3 px-3 md:px-0">
                <img src={uploaderAvatar} alt="" className="w-9 h-9 rounded-full mt-1 flex-shrink-0" />
                <div className="flex flex-col">
                    <h3 className="text-white text-sm md:text-base font-semibold line-clamp-2 leading-tight">
                        {video.title || video.fileName || 'Untitled Video'}
                    </h3>
                    <div className="text-gray-400 text-xs mt-1">
                        {uploaderName} • {formatViews(video.views || 0)} views • {formatTimeAgo(video.uploadedAt)}
                    </div>
                </div>
                <MdMoreVert className="text-white ml-auto flex-shrink-0 mt-1" />
            </div>
        </div>
    );
};

const ShortsPlayer = () => {
    const [currentShortIndex, setCurrentShortIndex] = useState(0);

    const nextShort = () => setCurrentShortIndex(prev => (prev + 1) % SHORTS_FEED.length);
    const short = SHORTS_FEED[currentShortIndex];

    return (
        <div className="h-[calc(100vh-100px)] w-full flex items-center justify-center relative bg-black" onClick={nextShort}>
            <div className={`w-full h-full md:w-[350px] md:h-full relative ${short.color} flex items-center justify-center`}>
                <h2 className="text-4xl font-bold text-white opacity-20 rotate-[-15deg]">PITCH SULTAN SHORTS</h2>

                {/* Overlay UI */}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/80 flex flex-col justify-end p-4">
                    <div className="flex items-end justify-between w-full mb-12">
                        <div className="flex-1 pr-4">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                                <span className="text-white font-semibold text-sm">@{short.uploader.replace(' ', '').toLowerCase()}</span>
                                <button className="bg-white text-black text-xs font-bold px-3 py-1 rounded-full">Subscribe</button>
                            </div>
                            <p className="text-white text-sm line-clamp-2">{short.title} #Sales #PitchSultan</p>
                            <div className="text-white mt-2 text-sm flex items-center gap-1">
                                <MdRemoveRedEye className="inline" /> {short.views} views
                            </div>
                        </div>

                        {/* Right Actions */}
                        <div className="flex flex-col items-center gap-6" onClick={(e) => e.stopPropagation()}>
                            <div className="flex flex-col items-center">
                                <div className="p-3 bg-gray-800/40 rounded-full hover:bg-gray-700/50 backdrop-blur-sm cursor-pointer transition">
                                    <MdThumbUp className="text-2xl text-white" />
                                </div>
                                <span className="text-white text-xs font-semibold mt-1">{short.likes}</span>
                            </div>
                            <div className="flex flex-col items-center">
                                <div className="p-3 bg-gray-800/40 rounded-full hover:bg-gray-700/50 backdrop-blur-sm cursor-pointer transition">
                                    <MdThumbDown className="text-2xl text-white" />
                                </div>
                                <span className="text-white text-xs font-semibold mt-1">Dislike</span>
                            </div>
                            <div className="flex flex-col items-center">
                                <div className="p-3 bg-gray-800/40 rounded-full hover:bg-gray-700/50 backdrop-blur-sm cursor-pointer transition">
                                    <MdRemoveRedEye className="text-2xl text-white" />
                                </div>
                                <span className="text-white text-xs font-semibold mt-1">{short.views}</span>
                            </div>
                            <div className="flex flex-col items-center">
                                <div className="p-3 bg-gray-800/40 rounded-full hover:bg-gray-700/50 backdrop-blur-sm cursor-pointer transition">
                                    <MdComment className="text-2xl text-white" />
                                </div>
                                <span className="text-white text-xs font-semibold mt-1">{short.comments}</span>
                            </div>
                            <div className="flex flex-col items-center">
                                <div className="p-3 bg-gray-800/40 rounded-full hover:bg-gray-700/50 backdrop-blur-sm cursor-pointer transition">
                                    <MdShare className="text-2xl text-white" />
                                </div>
                                <span className="text-white text-xs font-semibold mt-1">Share</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const CreateView = ({ onUploadClick }: { onUploadClick: () => void }) => (
    <div className="flex flex-col items-center justify-center h-[80vh] text-white p-6">
        <div className="w-24 h-24 bg-gray-800 rounded-full flex items-center justify-center mb-6 animate-bounce">
            <MdUpload className="text-5xl text-gray-400" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Create Content</h2>
        <p className="text-gray-400 text-center mb-8 max-w-xs">Share your sales pitch with the Sultan community. Upload a video or create a Short.</p>

        <div className="flex flex-col gap-4 w-full max-w-sm">
            <button 
                onClick={onUploadClick}
                className="bg-[#3ea6ff] hover:bg-[#3095ef] text-black font-semibold py-3 px-6 rounded-full w-full flex items-center justify-center gap-2"
            >
                <MdUpload className="text-xl" /> Upload Video
            </button>
            <button className="bg-white hover:bg-gray-200 text-black font-semibold py-3 px-6 rounded-full w-full flex items-center justify-center gap-2">
                <MdOutlineSlowMotionVideo className="text-xl" /> Create a Short
            </button>
        </div>
    </div>
);

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
                                                {topic.id === 3 ? (
                                                    <div className="mt-2 rounded-lg overflow-hidden border border-gray-700">
                                                        <img
                                                            src={contestRulesImg}
                                                            alt="Contest Rules"
                                                            className="w-full h-auto object-contain bg-[#1a1a1a]"
                                                        />
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
                            <div>
                                <p className="text-sm text-gray-400">Email Support</p>
                                <p className="font-medium">support@pitchsultan.com</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 text-gray-300">
                            <div className="w-10 h-10 bg-green-600/20 rounded-full flex items-center justify-center">
                                <MdPhone className="text-xl text-green-400" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-400">Phone Support</p>
                                <p className="font-medium">1800-123-4567</p>
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

const ProfileView = ({ currentUser }: { currentUser: { name: string; handle: string; avatar: string; subscribers: string; role: string; store: string; region: string } }) => (
    <div className="min-h-screen pb-20 pt-4">

        {/* Info */}
        <div className="px-4 flex flex-col mb-4">
            <img src={currentUser.avatar} className="w-20 h-20 rounded-full border-4 border-[#0f0f0f]" alt="Profile" />
            <div className="mt-3 text-white">
                <h1 className="text-2xl font-bold">{currentUser.name}</h1>
                <div className="text-gray-400 text-sm flex items-center gap-2">
                    {currentUser.handle} • {currentUser.role} {currentUser.region ? `• ${currentUser.region}` : ''}
                </div>
                <p className="text-gray-300 text-sm mt-3">
                    Sharing my best sales tips for Godrej appliances! Aspiring Pitch Sultan 👑
                </p>
                <div className="flex gap-2 mt-4">
                    <button className="bg-gray-800 text-white text-sm font-semibold px-4 py-2 rounded-full flex-1">Analytics</button>
                    <button className="bg-gray-800 text-white text-sm font-semibold px-4 py-2 rounded-full flex-1">Manage Videos</button>
                </div>
            </div>
        </div>

        {/* Content Tabs mock */}
        <div className="flex border-b border-gray-800 text-white text-sm font-medium sticky top-14 bg-[#0f0f0f]">
            <div className="flex-1 py-3 text-center border-b-2 border-white">Videos</div>
            <div className="flex-1 py-3 text-center text-gray-500">Shorts</div>
        </div>

        {/* User Videos */}
        <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Mock user content */}
            <div className="text-center text-gray-500 py-10 col-span-full">
                <p>No videos uploaded yet. Tap Create to get started!</p>
            </div>
        </div>
    </div>
);

// --- Main Page Component ---

export const PitchSultanBattle = () => {
    const [activeTab, setActiveTab] = useState('home');
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [videos, setVideos] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [currentUser, setCurrentUser] = useState({
        name: "Zopper Champion",
        handle: "@zopper_champ",
        avatar: "https://ui-avatars.com/api/?name=Zopper+Champion&background=ffd700&color=000",
        subscribers: "1.2K",
        role: "SEC Master",
        store: "",
        region: ""
    });

    // Load user info and fetch videos from database
    useEffect(() => {
        const loadUserAndVideos = async () => {
            // Load user from localStorage
            const userDataStr = localStorage.getItem('pitchSultanUser');
            if (userDataStr) {
                try {
                    const userData = JSON.parse(userDataStr);
                    console.log('📦 Loaded user data:', userData);
                    setCurrentUserId(userData.id);
                    setCurrentUser({
                        name: userData.name || "Zopper Champion",
                        handle: `@${userData.name?.toLowerCase().replace(/\s+/g, '_') || 'zopper_champ'}`,
                        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.name || 'Zopper Champion')}&background=ffd700&color=000`,
                        subscribers: "1.2K",
                        role: userData.store?.name || "SEC Master",
                        store: userData.store?.name || "",
                        region: userData.region || ""
                    });
                } catch (e) {
                    console.error('Failed to parse user data:', e);
                }
            } else {
                console.log('⚠️ No user data found in localStorage - using default user');
                // Keep default user for demo purposes
            }

            // Fetch videos from database
            await fetchVideos();
        };

        loadUserAndVideos();
    }, []);

    const fetchVideos = async () => {
        try {
            setLoading(true);
            const API_URL = window.location.hostname === 'localhost' 
                ? 'http://localhost:3001' 
                : `${window.location.protocol}//${window.location.hostname}:3001`;

            console.log('📡 Fetching videos from:', `${API_URL}/api/pitch-sultan/videos`);
            const response = await fetch(`${API_URL}/api/pitch-sultan/videos?limit=50`);
            const data = await response.json();

            if (data.success) {
                console.log('✅ Fetched videos:', data.data.length);
                setVideos(data.data);
            } else {
                console.error('❌ Failed to fetch videos:', data.error);
            }
        } catch (error) {
            console.error('❌ Error fetching videos:', error);
        } finally {
            setLoading(false);
        }
    };

    // Scroll to top on tab change
    useEffect(() => {
        window.scrollTo(0, 0);
    }, [activeTab]);

    const handleUploadSuccess = (videoData: any) => {
        console.log('✅ Video uploaded successfully:', videoData);
        
        // Refresh videos from database
        fetchVideos();

        // Show success message
        alert('Video uploaded successfully! 🎉');
    };

    const handleUploadClick = () => {
        setIsUploadModalOpen(true);
    };

    return (
        <div className="min-h-screen bg-[#0f0f0f] text-white">
            {currentUser && <Navbar currentUser={currentUser} />}

            <div className="pt-14 pb-16 md:pl-0">
                {activeTab === 'home' && (
                    <div className="max-w-4xl mx-auto md:p-4">
                        {/* Chips */}
                        <div className="flex gap-2 overflow-x-auto p-4 md:px-0 no-scrollbar">
                            {['All', 'Sales Tips', 'Godrej', 'ACs', 'Refrigerators', 'Recently Uploaded'].map((chip, i) => (
                                <span key={i} className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-sm font-medium cursor-pointer ${i === 0 ? 'bg-white text-black' : 'bg-gray-800 text-white hover:bg-gray-700'}`}>
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
                        {!loading && videos.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                                <MdOutlineSlowMotionVideo className="text-6xl mb-4" />
                                <p className="text-lg">No videos yet</p>
                                <p className="text-sm">Be the first to upload a pitch!</p>
                            </div>
                        )}

                        {/* Video Feed */}
                        {!loading && videos.length > 0 && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-4 gap-x-4">
                                {videos.map(video => (
                                    <VideoCard key={video.id} video={video} />
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'shorts' && (
                    <div className="bg-black">
                        <ShortsPlayer />
                    </div>
                )}

                {activeTab === 'create' && <CreateView onUploadClick={handleUploadClick} />}

                {activeTab === 'help' && <HelpSupportView />}

                {activeTab === 'profile' && currentUser && <ProfileView currentUser={currentUser} />}
            </div>

            <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />

            {/* Video Upload Modal */}
            <VideoUploadModal
                isOpen={isUploadModalOpen}
                onClose={() => setIsUploadModalOpen(false)}
                onUploadSuccess={handleUploadSuccess}
                currentUserId={currentUserId || undefined}
            />
        </div>
    );
};
