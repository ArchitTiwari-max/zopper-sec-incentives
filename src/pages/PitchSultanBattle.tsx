import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
    MdHelpOutline, MdHelp, MdEmail, MdPhone, MdQuestionAnswer, MdKeyboardArrowDown,
    MdPlayArrow, MdVideocam
} from 'react-icons/md';
import { BiLike, BiDislike, BiCommentDetail, BiShare } from "react-icons/bi";
import { VideoUploadModal } from '../components/VideoUploadModal';
import { VideoRecorder } from '../components/VideoRecorder';
import { ShortsPlayer } from '../components/ShortsPlayer';
import contestRulesImg from '../assets/contest-rules.jpg';
import { useAuth } from '@/contexts/AuthContext';
import { API_BASE_URL } from '@/lib/config';


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

const VideoCard = ({ video, onVideoClick }: { video: any, onVideoClick?: (video: any) => void }) => {
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
                <video
                    src={videoSource}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    preload="metadata"
                />
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
                        {uploaderName} • {formatViews(video.views || 0)} views • {formatTimeAgo(video.uploadedAt)}
                    </div>
                </div>
                <MdMoreVert className="text-white ml-auto flex-shrink-0 mt-1" />
            </div>
        </div>
    );
};

const ShortsView = ({ videos, startingVideoId }: { videos: any[], startingVideoId?: string | null }) => {
    return <ShortsPlayer videos={videos} startingVideoId={startingVideoId || undefined} />;
};

const CreateView = ({ onUploadClick, onRecordClick }: { onUploadClick: () => void, onRecordClick: () => void }) => (
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
            <button
                onClick={onRecordClick}
                className="bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-full w-full flex items-center justify-center gap-2"
            >
                <MdVideocam className="text-xl" /> Create a Short
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
    const navigate = useNavigate();
    const { user, isAuthenticated, isSEC } = useAuth();

    // Cast user to SECAuthData since we know it's SEC (isSEC is true)
    const secUser = isSEC && user && 'phone' in user ? user : null;
    const [activeTab, setActiveTab] = useState('home');
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [isRecorderOpen, setIsRecorderOpen] = useState(false); // Add recorder state
    const [videos, setVideos] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null); // Add this state
    const [currentUser, setCurrentUser] = useState({
        name: "Loading...",
        handle: "@loading",
        avatar: "https://ui-avatars.com/api/?name=Loading&background=ffd700&color=000",
        subscribers: "0",
        role: "SEC",
        store: "",
        region: ""
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
            setCurrentUser({
                name: user.name || "SEC User",
                handle: `@${(user.name || 'sec_user').toLowerCase().replace(/\s+/g, '_')}`,
                avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'SEC User')}&background=ffd700&color=000`,
                subscribers: "1.2K",
                role: user.store?.storeName || "SEC",
                store: user.store?.storeName || "",
                region: user.region || ""
            });

            // 4. Fetch videos
            await fetchVideos();
        };

        loadPitchSultanUser();
    }, [isAuthenticated, isSEC, user, navigate]);

    const fetchVideos = async () => {
        try {
            setLoading(true);
            console.log('📡 Fetching videos from:', `${API_BASE_URL}/pitch-sultan/videos`);
            const response = await fetch(`${API_BASE_URL}/pitch-sultan/videos?status=APPROVED&limit=50`);
            const data = await response.json();

            if (data.success) {
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

    // Scroll to top on tab change and reset selected video
    useEffect(() => {
        window.scrollTo(0, 0);
        // Reset selected video when switching away from shorts
        if (activeTab !== 'shorts') {
            setSelectedVideoId(null);
        }
    }, [activeTab]);

    const handleVideoClick = (video: any) => {
        console.log('🎬 Video clicked:', video.id);
        setSelectedVideoId(video.id);
        setActiveTab('shorts');
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

        // Show success message
        alert('Video uploaded successfully! 🎉');
    };

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
                                    <VideoCard
                                        key={video.id}
                                        video={video}
                                        onVideoClick={handleVideoClick}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Shorts Tab - Keep mock for now or fetch similarly */}
                {activeTab === 'shorts' && (
                    <div className="bg-black">
                        <ShortsView videos={videos} startingVideoId={selectedVideoId} />
                    </div>
                )}

                {activeTab === 'create' && <CreateView onUploadClick={handleUploadClick} onRecordClick={handleRecordClick} />}

                {activeTab === 'help' && <HelpSupportView />}

                {activeTab === 'profile' && currentUser && <ProfileView currentUser={currentUser} />}
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
